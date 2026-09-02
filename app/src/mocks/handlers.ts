import { HttpResponse, http } from 'msw';
import type {
  Evento,
  FiltroAlcance,
  FiltroPeriodo,
  FiltroPreco,
  Notificacao,
  Participacao,
  ParticipacaoView,
  PublicacaoView,
  ResultadoInscricao,
  SessaoUsuario,
} from '../types/domain';
import { isFull, occupiesSpot } from '../domain/capacity';
import { enrollmentOpen, withinCancellationWindow } from '../domain/deadlines';
import { paymentDeadline } from '../domain/payment';
import { currentPolicy } from '../domain/refund';
import { findActiveParticipation, isActive } from '../domain/participation';
import {
  nextWaitlistPosition,
  planPromotion,
  recomputePositions,
  waitlistSize,
} from '../domain/waitlist';
import { canSee } from '../domain/visibility';
import { requiresApproval } from '../domain/permissions';
import { POLICY } from '../domain/policy';
import {
  findEvento,
  findParticipacao,
  findUsuario,
  getDb,
  nextId,
  participacoesDoUsuario,
  transaction,
} from './db';
import {
  BASE,
  aplicarFiltros,
  erro,
  eventosVisiveis,
  abrirRequisicao,
  toEventoView,
  toParticipacaoView,
  usuarioAtual,
} from './support';
import { handlersCp5 } from './handlersCp5';

/**
 * "API" do CP5.
 *
 * Estes handlers NÃO são um atalho: eles aplicam as mesmas funções de
 * `src/domain/` que a API real vai aplicar no CP6, devolvem os mesmos códigos de
 * status e as mesmas formas de erro descritas no contrato de
 * docs/08-arquitetura.md. É isso que faz o app já exercitar carregamento, erro e
 * conflito desde agora (ADR-0003, RNF-016).
 *
 * Os endpoints de autenticação, pagamento, check-in e escrita no feed ficam em
 * `handlersCp5.ts` — o arquivo passou de 750 linhas e a fronteira natural é a
 * que separa o que existia no CP4 do que o CP5 acrescentou.
 */

const handlersBase = [
  /** Sessão do usuário autenticado, com o vínculo acadêmico resolvido. */
  http.get(`${BASE}/sessao`, async ({ request }) => {
    await abrirRequisicao();
    const db = getDb();
    const usuario = usuarioAtual(request);
    const sessao: SessaoUsuario = {
      usuario,
      faculdade: db.faculdade,
      curso: db.cursos.find((c) => c.id === usuario.cursoId) ?? null,
      turma: db.turmas.find((t) => t.id === usuario.turmaId) ?? null,
    };
    return HttpResponse.json(sessao);
  }),

  /** RF-015 — lista de eventos visíveis, filtrada e ordenada por data. */
  http.get(`${BASE}/eventos`, async ({ request }) => {
    await abrirRequisicao();
    const url = new URL(request.url);
    const usuario = usuarioAtual(request);
    const visiveis = eventosVisiveis(usuario.id);
    const filtrados = aplicarFiltros(visiveis, usuario.id, {
      alcance: (url.searchParams.get('alcance') as FiltroAlcance) ?? 'TODOS',
      preco: (url.searchParams.get('preco') as FiltroPreco) ?? 'TODOS',
      periodo: (url.searchParams.get('periodo') as FiltroPeriodo) ?? 'TODOS',
      busca: url.searchParams.get('busca') ?? '',
    });
    return HttpResponse.json(filtrados.map((e) => toEventoView(e, usuario.id)));
  }),

  /** Eventos em destaque no feed: os 4 mais próximos com inscrição aberta. */
  http.get(`${BASE}/eventos/destaque`, async ({ request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const agora = new Date();
    const destaque = eventosVisiveis(usuario.id)
      .filter((e) => e.status === 'PUBLICADO' && new Date(e.inicio) > agora)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 4);
    return HttpResponse.json(destaque.map((e) => toEventoView(e, usuario.id)));
  }),

  /**
   * RF-016 — detalhe do evento. RN-001: fora do alcance devolve 404 e não
   * revela a existência do evento, mesmo por ID direto (RNF-012).
   */
  http.get(`${BASE}/eventos/:id`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const id = String(params.id);
    const evento = findEvento(id);
    if (!evento) {
      return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');
    }
    const minhas = participacoesDoUsuario(usuario.id);
    const visivel = canSee(usuario, evento, {
      temParticipacaoAtiva: minhas.some((p) => p.eventoId === evento.id && isActive(p.status)),
    });
    if (!visivel) {
      return erro(404, 'NAO_ENCONTRADO', 'Evento não encontrado.');
    }
    return HttpResponse.json(toEventoView(evento, usuario.id));
  }),

  /** RF-010 a RF-012 — criação de evento. */
  http.post(`${BASE}/eventos`, async ({ request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const body = (await request.json()) as {
      titulo: string;
      descricao: string;
      alcance: Evento['alcance'];
      inicio: string;
      fim: string;
      local: string;
      capacidade: number;
      preco: number;
      prazoInscricao: string;
      prazoCancelamento: string;
      publicar: boolean;
    };

    // RN-001, invariante 2 — a âncora vem do vínculo do organizador, nunca do
    // corpo da requisição.
    const ancora =
      body.alcance === 'TURMA'
        ? usuario.turmaId
        : body.alcance === 'CURSO'
          ? usuario.cursoId
          : usuario.faculdadeId;
    if (!ancora) {
      return erro(
        422,
        'ALCANCE_FORA_DO_VINCULO',
        'Você não tem vínculo com esse nível de alcance. Conclua o onboarding.',
      );
    }

    const criado = await transaction((db): Evento => {
      const status: Evento['status'] = !body.publicar
        ? 'RASCUNHO'
        : requiresApproval(usuario, body.alcance)
          ? 'EM_APROVACAO'
          : 'PUBLICADO';

      const evento: Evento = {
        id: nextId('evt'),
        organizadorId: usuario.id,
        titulo: body.titulo,
        descricao: body.descricao,
        alcance: body.alcance,
        turmaId: body.alcance === 'TURMA' ? ancora : null,
        cursoId: body.alcance === 'CURSO' ? ancora : null,
        faculdadeId: body.alcance === 'FACULDADE' ? ancora : null,
        inicio: body.inicio,
        fim: body.fim,
        local: body.local,
        capacidade: body.capacidade,
        // RN-016 — criar evento não inscreve o organizador.
        ocupadas: 0,
        preco: body.preco,
        status,
        motivoCancelamento: null,
        prazoInscricao: body.prazoInscricao,
        prazoCancelamento: body.prazoCancelamento,
        capaSeed: (db.eventos.length % 12) + 1,
        criadoEm: new Date().toISOString(),
      };
      db.eventos.push(evento);
      return evento;
    });

    return HttpResponse.json(toEventoView(criado, usuario.id), { status: 201 });
  }),

  /**
   * RF-019 — inscrição. É a operação mais frequente e a mais sensível: toda a
   * verificação acontece dentro de `transaction`, que serializa as escritas
   * (RN-004, RNF-013).
   */
  http.post(`${BASE}/eventos/:id/participacoes`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const eventoId = String(params.id);

    const resultado = await transaction((db): ResultadoInscricao => {
      const evento = db.eventos.find((e) => e.id === eventoId);
      if (!evento) {
        return {
          tipo: 'RECUSADA',
          motivo: 'FORA_DO_ALCANCE',
          mensagem: 'Evento não encontrado.',
        };
      }
      if (evento.status === 'CANCELADO') {
        return {
          tipo: 'RECUSADA',
          motivo: 'EVENTO_CANCELADO',
          mensagem: 'Este evento foi cancelado pelo organizador.',
        };
      }
      if (evento.status !== 'PUBLICADO') {
        return {
          tipo: 'RECUSADA',
          motivo: 'EVENTO_NAO_PUBLICADO',
          mensagem: 'Este evento ainda não está aberto para inscrição.',
        };
      }

      const participacoes = db.participacoes.filter((p) => p.eventoId === eventoId);

      // RN-001 / RNF-012 — a autorização de alcance é verificada aqui, no
      // "servidor", e não só na tela: sem isso, uma requisição direta
      // inscreveria alguém em evento que ele nem pode ver.
      const temParticipacaoAtiva = participacoes.some(
        (p) => p.usuarioId === usuario.id && isActive(p.status),
      );
      if (!canSee(usuario, evento, { temParticipacaoAtiva })) {
        return {
          tipo: 'RECUSADA',
          motivo: 'FORA_DO_ALCANCE',
          mensagem: 'Este evento não está no seu alcance.',
        };
      }

      // RN-015 — uma participação ativa por aluno/evento.
      if (findActiveParticipation(participacoes, usuario.id)) {
        return {
          tipo: 'RECUSADA',
          motivo: 'JA_INSCRITO',
          mensagem: 'Você já tem uma inscrição ativa neste evento.',
        };
      }

      // RN-009 — o prazo limita entrada, inclusive na fila.
      if (!enrollmentOpen(evento, new Date())) {
        return {
          tipo: 'RECUSADA',
          motivo: 'PRAZO_ENCERRADO',
          mensagem: 'As inscrições deste evento já encerraram.',
        };
      }

      // RN-006 — lotado não é erro: é o desvio para a lista de espera.
      if (isFull(evento)) {
        return {
          tipo: 'SEM_VAGA',
          acao: 'LISTA_ESPERA',
          totalFila: waitlistSize(participacoes),
        };
      }

      const agora = new Date();
      const pago = evento.preco > 0;
      const participacao: Participacao = {
        id: nextId('par'),
        eventoId,
        usuarioId: usuario.id,
        status: pago ? 'PENDENTE_PAGAMENTO' : 'CONFIRMADA',
        posicaoFila: null,
        pagamentoExpiraEm: pago ? paymentDeadline(evento, agora) : null,
        ofertaExpiraEm: null,
        motivoCancelamento: null,
        canceladaAposPrazo: false,
        politicaVigente: pago ? currentPolicy(agora) : null,
        criadoEm: agora.toISOString(),
        atualizadoEm: agora.toISOString(),
      };
      db.participacoes.push(participacao);
      evento.ocupadas += 1;

      return pago
        ? { tipo: 'PENDENTE_PAGAMENTO', participacao }
        : { tipo: 'CONFIRMADA', participacao };
    });

    if (resultado.tipo === 'SEM_VAGA') {
      // 409 com ação sugerida: é o contrato de docs/08-arquitetura.md.
      return HttpResponse.json(
        { erro: 'SEM_VAGA', acao: 'LISTA_ESPERA', totalFila: resultado.totalFila },
        { status: 409 },
      );
    }
    if (resultado.tipo === 'RECUSADA') {
      const status = resultado.motivo === 'JA_INSCRITO' ? 409 : 422;
      return erro(status, resultado.motivo, resultado.mensagem);
    }
    return HttpResponse.json(resultado, { status: 201 });
  }),

  /** RF-024 — entrar na lista de espera (RN-006). */
  http.post(`${BASE}/eventos/:id/lista-espera`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const eventoId = String(params.id);

    const resultado = await transaction((db) => {
      const evento = db.eventos.find((e) => e.id === eventoId);
      if (!evento || evento.status !== 'PUBLICADO') {
        return { ok: false as const, codigo: 'EVENTO_NAO_PUBLICADO' };
      }
      const participacoes = db.participacoes.filter((p) => p.eventoId === eventoId);
      if (!canSee(usuario, evento, { temParticipacaoAtiva: false })) {
        return { ok: false as const, codigo: 'FORA_DO_ALCANCE' };
      }
      if (findActiveParticipation(participacoes, usuario.id)) {
        return { ok: false as const, codigo: 'JA_INSCRITO' };
      }
      if (!enrollmentOpen(evento, new Date())) {
        return { ok: false as const, codigo: 'PRAZO_ENCERRADO' };
      }
      if (!isFull(evento)) {
        return { ok: false as const, codigo: 'AINDA_TEM_VAGA' };
      }

      const agora = new Date().toISOString();
      const participacao: Participacao = {
        id: nextId('par'),
        eventoId,
        usuarioId: usuario.id,
        status: 'LISTA_ESPERA',
        posicaoFila: nextWaitlistPosition(participacoes),
        pagamentoExpiraEm: null,
        ofertaExpiraEm: null,
        motivoCancelamento: null,
        canceladaAposPrazo: false,
        politicaVigente: null,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      db.participacoes.push(participacao);
      // RN-004 — a fila NÃO ocupa vaga: `ocupadas` não muda.
      return { ok: true as const, participacao };
    });

    if (!resultado.ok) {
      const mensagens: Record<string, string> = {
        EVENTO_NAO_PUBLICADO: 'Este evento não está aberto.',
        JA_INSCRITO: 'Você já tem uma inscrição ativa neste evento.',
        PRAZO_ENCERRADO: 'As inscrições deste evento já encerraram.',
        AINDA_TEM_VAGA: 'Ainda há vaga: inscreva-se normalmente.',
        FORA_DO_ALCANCE: 'Este evento não está no seu alcance.',
      };
      const status = resultado.codigo === 'JA_INSCRITO' ? 409 : 422;
      return erro(status, resultado.codigo, mensagens[resultado.codigo] ?? 'Não foi possível.');
    }
    return HttpResponse.json(resultado.participacao, { status: 201 });
  }),

  /**
   * RF-021 e RF-027 — cancelar a própria participação. Libera a vaga e aciona a
   * promoção da fila na MESMA transação (RN-007): se fosse assíncrono, existiria
   * uma janela em que a vaga está livre e ninguém foi avisado.
   */
  http.delete(`${BASE}/participacoes/:id`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const participacaoId = String(params.id);

    const resultado = await transaction((db) => {
      const participacao = db.participacoes.find((p) => p.id === participacaoId);
      if (!participacao) return { ok: false as const, codigo: 'NAO_ENCONTRADO' };
      if (participacao.usuarioId !== usuario.id) {
        return { ok: false as const, codigo: 'SEM_PERMISSAO' };
      }
      if (!isActive(participacao.status)) {
        return { ok: false as const, codigo: 'JA_ENCERRADA' };
      }
      if (participacao.status === 'PRESENTE') {
        return { ok: false as const, codigo: 'JA_PRESENTE' };
      }

      const evento = db.eventos.find((e) => e.id === participacao.eventoId);
      if (!evento) return { ok: false as const, codigo: 'NAO_ENCONTRADO' };

      const liberouVaga = occupiesSpot(participacao.status);
      const agora = new Date();

      participacao.status = 'CANCELADA';
      participacao.motivoCancelamento = 'ALUNO_DESISTIU';
      // RN-010 — cancelar depois do prazo é permitido, mas fica registrado.
      participacao.canceladaAposPrazo = !withinCancellationWindow(evento, agora);
      participacao.posicaoFila = null;
      participacao.atualizadoEm = agora.toISOString();

      if (liberouVaga) evento.ocupadas = Math.max(0, evento.ocupadas - 1);

      // Fila anda em qualquer caso (quem saiu pode ter estado na fila).
      const restantes = db.participacoes.filter((p) => p.eventoId === evento.id);
      for (const mudanca of recomputePositions(restantes)) {
        const alvo = db.participacoes.find((p) => p.id === mudanca.id);
        if (alvo) alvo.posicaoFila = mudanca.posicaoFila;
      }

      // RN-007 — a vaga liberada é oferecida ao primeiro da fila.
      let promovido: string | null = null;
      if (liberouVaga) {
        const plano = planPromotion(evento, restantes, agora);
        if (plano.tipo === 'PROMOVER') {
          const alvo = db.participacoes.find((p) => p.id === plano.participacaoId);
          if (alvo) {
            alvo.status = 'OFERTA_PENDENTE';
            alvo.ofertaExpiraEm = plano.ofertaExpiraEm;
            alvo.posicaoFila = null;
            alvo.atualizadoEm = agora.toISOString();
            // A vaga fica reservada para a oferta: volta a ocupar.
            evento.ocupadas += 1;
            promovido = alvo.usuarioId;

            const posterior = db.participacoes.filter((p) => p.eventoId === evento.id);
            for (const mudanca of recomputePositions(posterior)) {
              const item = db.participacoes.find((p) => p.id === mudanca.id);
              if (item) item.posicaoFila = mudanca.posicaoFila;
            }

            db.notificacoes.push({
              id: nextId('not'),
              destinatarioId: alvo.usuarioId,
              tipo: 'VAGA_LIBERADA',
              titulo: 'Abriu uma vaga para você',
              mensagem: `Confirme sua vaga em ${evento.titulo} dentro de ${POLICY.WAITLIST_OFFER_WINDOW_HOURS} h.`,
              referenciaId: evento.id,
              lida: false,
              criadoEm: agora.toISOString(),
            });
          }
        }
      }

      return { ok: true as const, promovido };
    });

    if (!resultado.ok) {
      const mensagens: Record<string, string> = {
        NAO_ENCONTRADO: 'Inscrição não encontrada.',
        SEM_PERMISSAO: 'Você só pode cancelar a sua própria inscrição.',
        JA_ENCERRADA: 'Esta inscrição já estava encerrada.',
        JA_PRESENTE: 'Você já fez check-in neste evento.',
      };
      const status = resultado.codigo === 'NAO_ENCONTRADO' ? 404 : 422;
      return erro(status, resultado.codigo, mensagens[resultado.codigo] ?? 'Não foi possível.');
    }
    return HttpResponse.json({ cancelada: true, promovido: resultado.promovido });
  }),

  /** RF-025 — confirmar a vaga oferecida pela lista de espera (RN-007). */
  http.post(`${BASE}/participacoes/:id/confirmar`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const participacaoId = String(params.id);

    const resultado = await transaction((db) => {
      const participacao = db.participacoes.find((p) => p.id === participacaoId);
      if (!participacao || participacao.usuarioId !== usuario.id) {
        return { ok: false as const, codigo: 'NAO_ENCONTRADO' };
      }
      if (participacao.status !== 'OFERTA_PENDENTE') {
        return { ok: false as const, codigo: 'SEM_OFERTA' };
      }
      const agora = new Date();
      if (participacao.ofertaExpiraEm && agora > new Date(participacao.ofertaExpiraEm)) {
        return { ok: false as const, codigo: 'OFERTA_EXPIRADA' };
      }
      const evento = db.eventos.find((e) => e.id === participacao.eventoId);
      if (!evento) return { ok: false as const, codigo: 'NAO_ENCONTRADO' };

      const pago = evento.preco > 0;
      participacao.status = pago ? 'PENDENTE_PAGAMENTO' : 'CONFIRMADA';
      participacao.ofertaExpiraEm = null;
      participacao.pagamentoExpiraEm = pago ? paymentDeadline(evento, agora) : null;
      participacao.politicaVigente = pago ? currentPolicy(agora) : null;
      participacao.atualizadoEm = agora.toISOString();
      // A vaga já estava reservada para a oferta: `ocupadas` não muda.
      return { ok: true as const, participacao };
    });

    if (!resultado.ok) {
      const mensagens: Record<string, string> = {
        NAO_ENCONTRADO: 'Inscrição não encontrada.',
        SEM_OFERTA: 'Não há vaga oferecida para esta inscrição.',
        OFERTA_EXPIRADA: 'O prazo para confirmar esta vaga já passou.',
      };
      const status = resultado.codigo === 'NAO_ENCONTRADO' ? 404 : 422;
      return erro(status, resultado.codigo, mensagens[resultado.codigo] ?? 'Não foi possível.');
    }
    return HttpResponse.json(resultado.participacao);
  }),

  /** RF-007 — minhas participações, para as abas do perfil. */
  http.get(`${BASE}/participacoes`, async ({ request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const views = participacoesDoUsuario(usuario.id)
      .map(toParticipacaoView)
      .filter((v): v is ParticipacaoView => v !== null)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    return HttpResponse.json(views);
  }),

  /** RF-033 — ingresso com QR Code. */
  http.get(`${BASE}/participacoes/:id`, async ({ params, request }) => {
    await abrirRequisicao();
    const usuario = usuarioAtual(request);
    const participacao = findParticipacao(String(params.id));
    if (!participacao || participacao.usuarioId !== usuario.id) {
      return erro(404, 'NAO_ENCONTRADO', 'Ingresso não encontrado.');
    }
    const view = toParticipacaoView(participacao);
    if (!view) return erro(404, 'NAO_ENCONTRADO', 'Ingresso não encontrado.');
    return HttpResponse.json(view);
  }),

  /** RF-036 — feed segmentado pelo alcance dos eventos (RN-001, RN-019). */
  http.get(`${BASE}/feed`, async ({ request }) => {
    await abrirRequisicao();
    const db = getDb();
    const usuario = usuarioAtual(request);
    const idsVisiveis = new Set(eventosVisiveis(usuario.id).map((e) => e.id));

    const views: PublicacaoView[] = db.publicacoes
      .filter((p) => !p.removida && idsVisiveis.has(p.eventoId))
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
      .map((publicacao) => {
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
      });

    return HttpResponse.json(views);
  }),

  /** RF-040 — central de notificações. */
  http.get(`${BASE}/notificacoes`, async ({ request }) => {
    await abrirRequisicao();
    const db = getDb();
    const usuario = usuarioAtual(request);
    const lista: Notificacao[] = db.notificacoes
      .filter((n) => n.destinatarioId === usuario.id)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    return HttpResponse.json(lista);
  }),

  http.post(`${BASE}/notificacoes/:id/lida`, async ({ params }) => {
    await abrirRequisicao();
    const id = String(params.id);
    await transaction((db) => {
      const notificacao = db.notificacoes.find((n) => n.id === id);
      if (notificacao) notificacao.lida = true;
    });
    return new HttpResponse(null, { status: 204 });
  }),
];

export const handlers = [...handlersBase, ...handlersCp5];
