import { HttpResponse, http } from 'msw';
import type {
  Comentario,
  DesfechoSimulado,
  Pagamento,
  PagamentoView,
  PainelCheckin,
  Participacao,
  PresencaView,
  PublicacaoView,
  ResultadoCheckin,
  ResultadoLogin,
  SessaoUsuario,
  TokenIngresso,
} from '../types/domain';
import { decideLogin, decideOnboarding } from '../domain/auth';
import { decideCheckIn, numericCheckInCode, ticketCode } from '../domain/checkin';
import { checkInWindow } from '../domain/deadlines';
import { canPostToEvent, canValidateCheckIn } from '../domain/permissions';
import { gerarCobrancaPix } from '../domain/pix';
import { idempotencyKey, minutesLeftToPay, paymentDeadline, planWebhook } from '../domain/payment';
import { classificarLeitura, emitirToken, lerToken } from '../domain/ticketToken';
import {
  findEvento,
  findParticipacao,
  findUsuario,
  getDb,
  nextId,
  pagamentoDaParticipacao,
  participacoesDoEvento,
  participacoesDoUsuario,
  presencaDaParticipacao,
  transaction,
} from './db';
import {
  BASE,
  SENHA_DEMO,
  erro,
  eventosVisiveis,
  abrirRequisicao,
  tokenDeSessao,
  usuarioAtual,
} from './support';

/**
 * Endpoints que o CP5 acrescentou: autenticação, onboarding, pagamento simulado,
 * check-in e escrita no feed.
 *
 * A regra é a mesma dos handlers do CP4 — toda decisão sai de `src/domain/`,
 * nenhuma é reimplementada aqui. Quando o backend do CP6 assumir estas rotas, o
 * que muda é a persistência, não a regra (ADR-0003).
 */

// --------------------------------------------------------------------------
// Projeções
// --------------------------------------------------------------------------

function toPagamentoView(pagamento: Pagamento): PagamentoView {
  const db = getDb();
  const participacao = findParticipacao(pagamento.participacaoId);
  const cartao = db.resumosCartao.find((r) => r.pagamentoId === pagamento.id) ?? null;

  /*
   * O payload Pix não é armazenado: `gerarCobrancaPix` é determinístico sobre
   * (valor, referência, expiração), então recalcular devolve sempre o mesmo
   * BR Code. Guardar o QR seria guardar dado derivado — e desalinhá-lo do valor
   * na primeira alteração de preço.
   */
  const pix =
    pagamento.metodo === 'PIX' && pagamento.status === 'AGUARDANDO'
      ? gerarCobrancaPix({
          valor: pagamento.valor,
          referencia: pagamento.participacaoId,
          expiraEm: participacao?.pagamentoExpiraEm ?? pagamento.criadoEm,
        })
      : null;

  return {
    ...pagamento,
    pix,
    cartao: cartao ? { ...cartao } : null,
    minutosRestantes: participacao ? minutesLeftToPay(participacao, new Date()) : null,
  };
}

function toPresencaView(participacaoId: string): PresencaView | null {
  const presenca = presencaDaParticipacao(participacaoId);
  if (!presenca) return null;
  const participacao = findParticipacao(participacaoId);
  const usuario = participacao ? findUsuario(participacao.usuarioId) : undefined;
  return {
    ...presenca,
    participante: {
      id: usuario?.id ?? 'desconhecido',
      nome: usuario?.nome ?? 'Aluno',
      avatarSeed: usuario?.avatarSeed ?? 1,
    },
  };
}

function toPublicacaoView(publicacaoId: string): PublicacaoView | null {
  const db = getDb();
  const publicacao = db.publicacoes.find((p) => p.id === publicacaoId);
  if (!publicacao) return null;
  const autor = findUsuario(publicacao.autorId);
  const evento = findEvento(publicacao.eventoId);

  return {
    ...publicacao,
    autor: {
      id: autor?.id ?? 'desconhecido',
      nome: autor?.nome ?? 'Aluno',
      avatarSeed: autor?.avatarSeed ?? 1,
    },
    evento: {
      id: evento?.id ?? publicacao.eventoId,
      titulo: evento?.titulo ?? 'Evento',
      alcance: evento?.alcance ?? 'FACULDADE',
    },
    comentarios: db.comentarios
      .filter((c) => c.publicacaoId === publicacao.id && !c.removido)
      .map((comentario) => {
        const autorComentario = findUsuario(comentario.autorId);
        return {
          ...comentario,
          autor: {
            id: autorComentario?.id ?? 'desconhecido',
            nome: autorComentario?.nome ?? 'Aluno',
            avatarSeed: autorComentario?.avatarSeed ?? 1,
          },
        };
      }),
  };
}

function montarSessao(usuarioId: string): SessaoUsuario {
  const db = getDb();
  const usuario = findUsuario(usuarioId);
  if (!usuario) throw new Error(`usuário ${usuarioId} não encontrado`);
  return {
    usuario,
    faculdade: db.faculdade,
    curso: db.cursos.find((c) => c.id === usuario.cursoId) ?? null,
    turma: db.turmas.find((t) => t.id === usuario.turmaId) ?? null,
  };
}

function siglaDaTurma(usuarioId: string): string {
  const db = getDb();
  const usuario = findUsuario(usuarioId);
  const turma = db.turmas.find((t) => t.id === usuario?.turmaId);
  return turma?.nome ?? db.faculdade.sigla;
}

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

export const handlersCp5 = [
  // ------------------------------------------------------------------ auth

  /** RF-002 — dados públicos da tela de login: nome e domínios aceitos. */
  http.get(`${BASE}/faculdade`, async () => {
    await abrirRequisicao();
    return HttpResponse.json(getDb().faculdade);
  }),

  http.get(`${BASE}/cursos`, async () => {
    await abrirRequisicao();
    return HttpResponse.json(getDb().cursos);
  }),

  http.get(`${BASE}/cursos/:id/turmas`, async ({ params }) => {
    await abrirRequisicao();
    const cursoId = String(params.id);
    const turmas = getDb().turmas.filter((t) => t.cursoId === cursoId);
    return HttpResponse.json(turmas);
  }),

  /**
   * RF-003 — login com e-mail institucional.
   *
   * A decisão é de `domain/auth.ts#decideLogin`, incluindo a ordem das recusas.
   * O status é `401` para credencial e `422` para domínio: um é "tente de novo",
   * o outro é "esta conta nunca vai servir" — e a tela reage diferente.
   */
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await abrirRequisicao();
    const db = getDb();
    const corpo = (await request.json()) as { email?: string; senha?: string };
    const email = (corpo.email ?? '').trim().toLowerCase();
    const senha = corpo.senha ?? '';

    const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email) ?? null;
    const decisao = decideLogin({
      email,
      senhaConfere: senha === SENHA_DEMO,
      usuario,
      dominios: db.faculdade.dominiosEmail,
    });

    if (!decisao.aceito) {
      const status = decisao.motivo === 'CREDENCIAL_INVALIDA' ? 401 : 422;
      return erro(status, decisao.motivo, decisao.mensagem);
    }
    if (!usuario) return erro(401, 'CREDENCIAL_INVALIDA', 'E-mail ou senha não conferem.');

    const resultado: ResultadoLogin = {
      token: tokenDeSessao(usuario.id),
      sessao: montarSessao(usuario.id),
    };
    return HttpResponse.json(resultado);
  }),

  http.post(`${BASE}/auth/logout`, async () => {
    await abrirRequisicao();
    return new HttpResponse(null, { status: 204 });
  }),

  /** RF-005 — vincula curso e turma pelo código de convite (RN-002). */
  http.post(`${BASE}/auth/onboarding`, async ({ request }) => {
    await abrirRequisicao();
    const db = getDb();
    const atual = usuarioAtual(request);
    const corpo = (await request.json()) as { cursoId?: string; codigoConvite?: string };

    const decisao = decideOnboarding({
      cursoId: corpo.cursoId ?? '',
      codigoConvite: corpo.codigoConvite ?? '',
      cursos: db.cursos,
      turmas: db.turmas,
    });

    if (!decisao.aceito) {
      return erro(422, decisao.motivo, decisao.mensagem);
    }

    const turmaId = decisao.turma.id;
    const cursoId = decisao.turma.cursoId;
    await transaction((banco) => {
      const usuario = banco.usuarios.find((u) => u.id === atual.id);
      if (usuario) {
        usuario.cursoId = cursoId;
        usuario.turmaId = turmaId;
      }
    });

    return HttpResponse.json(montarSessao(atual.id));
  }),

  // -------------------------------------------------------------- pagamento

  /**
   * RF-028 — abre a cobrança de uma participação pendente.
   *
   * Idempotente por participação: chamar duas vezes devolve a mesma cobrança em
   * vez de criar duas. Sem isso, um duplo toque no botão geraria dois Pix para a
   * mesma vaga — e o aluno pagaria o errado.
   */
  http.post(`${BASE}/participacoes/:id/pagamento`, async ({ params, request }) => {
    await abrirRequisicao();
    const participacaoId = String(params.id);
    const atual = usuarioAtual(request);
    const corpo = (await request.json()) as {
      metodo?: Pagamento['metodo'];
      cartao?: { ultimosQuatro: string; bandeira: string; titular: string };
    };

    const participacao = findParticipacao(participacaoId);
    if (!participacao) return erro(404, 'NAO_ENCONTRADA', 'Inscrição não encontrada.');
    if (participacao.usuarioId !== atual.id) {
      return erro(403, 'SEM_PERMISSAO', 'Esta inscrição não é sua.');
    }
    if (participacao.status !== 'PENDENTE_PAGAMENTO') {
      return erro(
        409,
        'NAO_AGUARDA_PAGAMENTO',
        participacao.status === 'CONFIRMADA'
          ? 'Esta inscrição já está confirmada.'
          : 'Esta inscrição não está aguardando pagamento.',
      );
    }

    const metodo = corpo.metodo ?? 'PIX';
    const existente = pagamentoDaParticipacao(participacaoId);
    if (existente && existente.status === 'AGUARDANDO' && existente.metodo === metodo) {
      return HttpResponse.json(toPagamentoView(existente));
    }

    const evento = findEvento(participacao.eventoId);
    if (!evento) return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');

    const agora = new Date().toISOString();
    const pagamentoId = existente?.id ?? nextId('pag');
    const transacaoExternaId = `sim-${pagamentoId}`;

    await transaction((banco) => {
      const registro: Pagamento = {
        id: pagamentoId,
        participacaoId,
        metodo,
        valor: evento.preco,
        valorReembolsado: 0,
        status: 'AGUARDANDO',
        transacaoExternaId,
        chaveIdempotencia: idempotencyKey(participacaoId, transacaoExternaId),
        criadoEm: agora,
        confirmadoEm: null,
      };

      const indice = banco.pagamentos.findIndex((p) => p.id === pagamentoId);
      if (indice >= 0) banco.pagamentos[indice] = registro;
      else banco.pagamentos.push(registro);

      banco.resumosCartao = banco.resumosCartao.filter((r) => r.pagamentoId !== pagamentoId);
      if (corpo.cartao) banco.resumosCartao.push({ pagamentoId, ...corpo.cartao });

      // A janela de RN-012 é recontada aqui: o relógio da vaga começa quando a
      // cobrança abre, não quando a inscrição foi criada.
      const alvo = banco.participacoes.find((p) => p.id === participacaoId);
      if (alvo) {
        alvo.pagamentoExpiraEm = paymentDeadline(evento, agora);
        alvo.atualizadoEm = agora;
      }
    });

    const salvo = pagamentoDaParticipacao(participacaoId);
    if (!salvo) return erro(500, 'ERRO_INTERNO', 'Não conseguimos abrir a cobrança.');
    return HttpResponse.json(toPagamentoView(salvo), { status: 201 });
  }),

  http.get(`${BASE}/participacoes/:id/pagamento`, async ({ params, request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const participacao = findParticipacao(String(params.id));
    if (!participacao || participacao.usuarioId !== atual.id) {
      return erro(404, 'NAO_ENCONTRADO', 'Cobrança não encontrada.');
    }
    const pagamento = pagamentoDaParticipacao(participacao.id);
    if (!pagamento) return erro(404, 'NAO_ENCONTRADO', 'Cobrança não encontrada.');
    return HttpResponse.json(toPagamentoView(pagamento));
  }),

  /**
   * Webhook do gateway, disparado pela demo (ADR-0007).
   *
   * A decisão é toda de `domain/payment.ts#planWebhook` — incluindo ignorar
   * notificação duplicada (RN-014) e estornar quando a vaga já expirou. `DUPLICAR`
   * existe para a demo poder demonstrar a idempotência, que é invisível quando
   * tudo dá certo na primeira tentativa.
   */
  http.post(`${BASE}/pagamentos/:id/simular`, async ({ params, request }) => {
    await abrirRequisicao();
    const pagamentoId = String(params.id);
    const corpo = (await request.json()) as { desfecho?: DesfechoSimulado };
    const desfecho = corpo.desfecho ?? 'CONFIRMAR';

    const db = getDb();
    const pagamento = db.pagamentos.find((p) => p.id === pagamentoId);
    if (!pagamento) return erro(404, 'NAO_ENCONTRADO', 'Cobrança não encontrada.');

    const participacao = findParticipacao(pagamento.participacaoId);
    if (!participacao) return erro(404, 'NAO_ENCONTRADA', 'Inscrição não encontrada.');

    if (desfecho === 'RECUSAR') {
      await transaction((banco) => {
        const alvo = banco.pagamentos.find((p) => p.id === pagamentoId);
        if (alvo) alvo.status = 'RECUSADO';
      });
      const atualizado = getDb().pagamentos.find((p) => p.id === pagamentoId);
      return HttpResponse.json(toPagamentoView(atualizado as Pagamento));
    }

    const plano = planWebhook(pagamento, participacao, {
      transacaoExternaId: pagamento.transacaoExternaId ?? `sim-${pagamentoId}`,
      valorPago: pagamento.valor,
      pago: true,
    });

    if (plano.tipo === 'CONFIRMAR') {
      const agora = new Date().toISOString();
      await transaction((banco) => {
        const alvo = banco.pagamentos.find((p) => p.id === pagamentoId);
        if (alvo) {
          alvo.status = 'CONFIRMADO';
          alvo.confirmadoEm = agora;
        }
        const inscricao = banco.participacoes.find((p) => p.id === pagamento.participacaoId);
        if (inscricao) {
          inscricao.status = 'CONFIRMADA';
          inscricao.pagamentoExpiraEm = null;
          inscricao.atualizadoEm = agora;
        }
        banco.notificacoes.push({
          id: nextId('not'),
          destinatarioId: participacao.usuarioId,
          tipo: 'PAGAMENTO_CONFIRMADO',
          titulo: 'Pagamento confirmado',
          mensagem: 'Sua vaga está garantida. O ingresso já está no seu perfil.',
          referenciaId: participacao.id,
          lida: false,
          criadoEm: agora,
        });
      });
    } else if (plano.tipo === 'ESTORNAR') {
      await transaction((banco) => {
        const alvo = banco.pagamentos.find((p) => p.id === pagamentoId);
        if (alvo) {
          alvo.status = 'ESTORNADO';
          alvo.valorReembolsado = alvo.valor;
        }
      });
    }
    // `IGNORAR_DUPLICADA` e `DIVERGENCIA_DE_VALOR` não escrevem nada — é
    // exatamente o comportamento que RN-014 exige.

    const atualizado = getDb().pagamentos.find((p) => p.id === pagamentoId);
    return HttpResponse.json({
      ...toPagamentoView(atualizado as Pagamento),
      desfecho: plano.tipo,
    });
  }),

  // --------------------------------------------------------------- check-in

  /** RF-033 — token do ingresso. Só o dono da participação obtém o seu. */
  http.get(`${BASE}/participacoes/:id/token`, async ({ params, request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const participacao = findParticipacao(String(params.id));

    if (!participacao || participacao.usuarioId !== atual.id) {
      return erro(404, 'NAO_ENCONTRADO', 'Ingresso não encontrado.');
    }
    if (participacao.status !== 'CONFIRMADA' && participacao.status !== 'PRESENTE') {
      return erro(409, 'NAO_CONFIRMADA', 'O ingresso só é emitido depois da inscrição confirmada.');
    }

    const emitidoEm = new Date().toISOString();
    const token: TokenIngresso = {
      valor: emitirToken({
        participacaoId: participacao.id,
        eventoId: participacao.eventoId,
        usuarioId: participacao.usuarioId,
        emitidoEm,
      }),
      codigoNumerico: numericCheckInCode(participacao.id),
      // `ticketCode` do domínio, não a mesma interpolação escrita de novo: o
      // formato do código impresso vive em um lugar só.
      codigoLegivel: ticketCode(siglaDaTurma(participacao.usuarioId), participacao.id),
      emitidoEm,
    };
    return HttpResponse.json(token);
  }),

  /** RF-035 — painel do organizador: quantos confirmados, quantos já entraram. */
  http.get(`${BASE}/eventos/:id/checkin`, async ({ params, request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const evento = findEvento(String(params.id));
    if (!evento) return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');
    if (!canValidateCheckIn(atual, evento)) {
      return erro(403, 'SEM_PERMISSAO', 'Só o organizador valida check-in deste evento.');
    }

    const participacoes = participacoesDoEvento(evento.id);
    const janela = checkInWindow(evento);
    const agora = Date.now();

    const painel: PainelCheckin = {
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        inicio: evento.inicio,
        fim: evento.fim,
        status: evento.status,
      },
      abertoAgora: agora >= janela.opensAt && agora <= janela.closesAt,
      abreEm: new Date(janela.opensAt).toISOString(),
      fechaEm: new Date(janela.closesAt).toISOString(),
      confirmados: participacoes.filter((p) => p.status === 'CONFIRMADA' || p.status === 'PRESENTE')
        .length,
      presentes: participacoes.filter((p) => p.status === 'PRESENTE').length,
      presencas: participacoes
        .map((p) => toPresencaView(p.id))
        .filter((p): p is PresencaView => p !== null)
        .sort((a, b) => new Date(b.checkinEm).getTime() - new Date(a.checkinEm).getTime()),
      aguardando: participacoes
        .filter((p) => p.status === 'CONFIRMADA')
        .map((p) => {
          const dono = findUsuario(p.usuarioId);
          return {
            participacaoId: p.id,
            nome: dono?.nome ?? 'Aluno',
            turma: dono ? siglaDaTurma(dono.id) : null,
            codigoNumerico: numericCheckInCode(p.id),
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    };
    return HttpResponse.json(painel);
  }),

  /**
   * RF-034 — valida uma leitura.
   *
   * Devolve `200` mesmo recusando: na porta do evento, "ingresso já usado" é
   * resposta do sistema, não falha dele. O motivo específico vem de
   * `domain/checkin.ts#decideCheckIn`, que verifica as 6 condições de RN-017.
   */
  http.post(`${BASE}/eventos/:id/checkin`, async ({ params, request }) => {
    await abrirRequisicao();
    const eventoId = String(params.id);
    const atual = usuarioAtual(request);
    const corpo = (await request.json()) as { leitura?: string };

    const evento = findEvento(eventoId);
    if (!evento) return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');

    const leitura = classificarLeitura(corpo.leitura ?? '');
    const participacoes = participacoesDoEvento(eventoId);

    /*
     * As três formas de leitura convergem para a MESMA decisão. O código numérico
     * e o legível são derivados do id da participação, então a busca é por
     * derivação, não por armazenamento de código — não há tabela de códigos para
     * ficar dessincronizada.
     */
    let participacao: Participacao | null = null;
    let token = '';
    if (leitura.tipo === 'TOKEN') {
      token = leitura.token;
      const payload = lerToken(leitura.token);
      participacao = payload ? (findParticipacao(payload.participacaoId) ?? null) : null;
    } else if (leitura.tipo === 'CODIGO_NUMERICO' || leitura.tipo === 'CODIGO_LEGIVEL') {
      const sufixo =
        leitura.tipo === 'CODIGO_NUMERICO'
          ? leitura.codigo
          : (leitura.codigo.split('-').pop() ?? '');
      participacao =
        participacoes.find((p) =>
          leitura.tipo === 'CODIGO_NUMERICO'
            ? numericCheckInCode(p.id) === sufixo
            : numericCheckInCode(p.id).slice(-4) === sufixo,
        ) ?? null;
      if (participacao) {
        token = emitirToken({
          participacaoId: participacao.id,
          eventoId: participacao.eventoId,
          usuarioId: participacao.usuarioId,
          emitidoEm: new Date().toISOString(),
        });
      }
    }

    const payload = token
      ? lerToken(token)
      : { participacaoId: '', eventoId: '', usuarioId: '', emitidoEm: '' };

    const decisao = decideCheckIn({
      token: {
        participacaoId: payload?.participacaoId ?? '',
        eventoId: payload?.eventoId ?? '',
        usuarioId: payload?.usuarioId ?? '',
        emitidoEm: payload?.emitidoEm ?? '',
        assinatura: '',
      },
      assinaturaValida: payload !== null && leitura.tipo !== 'INDECIFRAVEL',
      evento,
      participacao: participacao ? { id: participacao.id, status: participacao.status } : null,
      presencaExistente: participacao ? (presencaDaParticipacao(participacao.id) ?? null) : null,
      operadorTemPermissao: canValidateCheckIn(atual, evento),
      now: new Date(),
    });

    if (!decisao.aceito || !participacao) {
      const resposta: ResultadoCheckin = {
        aceito: false,
        motivo: decisao.motivo ?? 'TOKEN_INVALIDO',
        mensagem: decisao.mensagem,
        participante: null,
        registradoEm: null,
      };
      return HttpResponse.json(resposta);
    }

    const agora = new Date().toISOString();
    const alvoId = participacao.id;
    await transaction((banco) => {
      banco.presencas.push({
        id: nextId('pre'),
        participacaoId: alvoId,
        registradoPorId: atual.id,
        metodo: leitura.tipo === 'TOKEN' ? 'QR_CODE' : 'CODIGO_NUMERICO',
        checkinEm: agora,
        motivoCorrecao: null,
        sincronizado: true,
      });
      const inscricao = banco.participacoes.find((p) => p.id === alvoId);
      if (inscricao) {
        inscricao.status = 'PRESENTE';
        inscricao.atualizadoEm = agora;
      }
    });

    const dono = findUsuario(participacao.usuarioId);
    const resposta: ResultadoCheckin = {
      aceito: true,
      motivo: null,
      mensagem: decisao.mensagem,
      participante: {
        nome: dono?.nome ?? 'Aluno',
        turma: dono ? siglaDaTurma(dono.id) : null,
      },
      registradoEm: agora,
    };
    return HttpResponse.json(resposta, { status: 201 });
  }),

  // ------------------------------------------------------------------- feed

  /**
   * Eventos em que o usuário pode publicar (RN-019).
   *
   * A decisão é de `canPostToEvent`, a mesma função que o `POST /publicacoes`
   * usa. Antes eram DOIS critérios diferentes — aqui "confirmada ou presente",
   * lá "qualquer participação ativa" — e nenhum dos dois era o documentado. O
   * resultado prático era um seletor que oferecia eventos em que a escrita
   * podia ser recusada, e uma escrita que aceitava quem nunca teve vaga.
   */
  http.get(`${BASE}/feed/eventos-publicaveis`, async ({ request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const agora = new Date();
    const minhas = participacoesDoUsuario(atual.id);

    const publicaveis = eventosVisiveis(atual.id)
      .filter((evento) => {
        const minha = minhas.find((p) => p.eventoId === evento.id) ?? null;
        return canPostToEvent(atual, evento, minha?.status ?? null, agora);
      })
      .map((evento) => ({ id: evento.id, titulo: evento.titulo }));

    return HttpResponse.json(publicaveis);
  }),

  /**
   * RF-037 — publica no feed.
   *
   * RN-019: não existe publicação sem evento, e o autor precisa ter participado.
   * A verificação de alcance é a mesma de leitura (`eventosVisiveis`): sem ela,
   * um POST direto publicaria em evento invisível — o defeito que a verificação
   * do CP4 expôs nos handlers de inscrição.
   */
  http.post(`${BASE}/publicacoes`, async ({ request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const corpo = (await request.json()) as {
      eventoId?: string;
      legenda?: string;
      imagemSeed?: number;
    };

    const eventoId = corpo.eventoId ?? '';
    const legenda = (corpo.legenda ?? '').trim();

    if (legenda.length < 2) {
      return erro(422, 'LEGENDA_CURTA', 'Escreva pelo menos duas letras na legenda.');
    }
    if (legenda.length > 500) {
      return erro(422, 'LEGENDA_LONGA', 'A legenda cabe em 500 caracteres.');
    }

    const visiveis = eventosVisiveis(atual.id);
    const evento = visiveis.find((e) => e.id === eventoId);
    if (!evento) return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');

    /*
     * A autoridade é `canPostToEvent`, não um `if` local.
     *
     * O `if` anterior usava `isActive`, que inclui `LISTA_ESPERA`: alguém que
     * nunca teve vaga publicava no feed por requisição direta. E
     * `canPostToEvent` — a função que codifica RN-019 — não tinha consumidor
     * nenhum no app, ou seja, a regra existia escrita e não valia em lugar
     * algum. Foi um achado da revisão de documentação do CP5.
     */
    const minha = participacoesDoUsuario(atual.id).find((p) => p.eventoId === eventoId) ?? null;
    if (!canPostToEvent(atual, evento, minha?.status ?? null, new Date())) {
      const antesDeComecar = new Date() < new Date(evento.inicio);
      return erro(
        403,
        'SEM_PARTICIPACAO',
        antesDeComecar
          ? 'O feed guarda o que aconteceu: só o organizador publica antes do evento começar.'
          : 'Só quem esteve no evento publica no feed dele (RN-019).',
      );
    }

    const id = nextId('pub');
    const agora = new Date().toISOString();
    await transaction((banco) => {
      banco.publicacoes.push({
        id,
        eventoId,
        autorId: atual.id,
        legenda,
        // 1..24: as imagens são geradas localmente a partir da semente, sem upload.
        imagemSeed: corpo.imagemSeed ?? (Date.now() % 24) + 1,
        removida: false,
        motivoRemocao: null,
        removidaPorId: null,
        criadoEm: agora,
      });
    });

    const view = toPublicacaoView(id);
    if (!view) return erro(500, 'ERRO_INTERNO', 'Não conseguimos publicar agora.');
    return HttpResponse.json(view, { status: 201 });
  }),

  /** RF-038 — comenta em uma publicação visível. */
  http.post(`${BASE}/publicacoes/:id/comentarios`, async ({ params, request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    const publicacaoId = String(params.id);
    const corpo = (await request.json()) as { texto?: string };
    const texto = (corpo.texto ?? '').trim();

    if (texto.length < 2) {
      return erro(422, 'TEXTO_CURTO', 'Escreva pelo menos duas letras.');
    }
    if (texto.length > 280) {
      return erro(422, 'TEXTO_LONGO', 'O comentário cabe em 280 caracteres.');
    }

    const db = getDb();
    const publicacao = db.publicacoes.find((p) => p.id === publicacaoId && !p.removida);
    if (!publicacao) return erro(404, 'NAO_ENCONTRADA', 'Publicação não encontrada.');

    const visiveis = new Set(eventosVisiveis(atual.id).map((e) => e.id));
    if (!visiveis.has(publicacao.eventoId)) {
      return erro(404, 'NAO_ENCONTRADA', 'Publicação não encontrada.');
    }

    const comentario: Comentario = {
      id: nextId('com'),
      publicacaoId,
      autorId: atual.id,
      texto,
      removido: false,
      criadoEm: new Date().toISOString(),
    };
    await transaction((banco) => {
      banco.comentarios.push(comentario);
    });
    return HttpResponse.json(comentario, { status: 201 });
  }),

  // ---------------------------------------------------------- notificações

  http.post(`${BASE}/notificacoes/lidas`, async ({ request }) => {
    await abrirRequisicao();
    const atual = usuarioAtual(request);
    await transaction((banco) => {
      for (const notificacao of banco.notificacoes) {
        if (notificacao.destinatarioId === atual.id) notificacao.lida = true;
      }
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
