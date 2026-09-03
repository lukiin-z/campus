import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Evento as EventoLinha } from '@prisma/client';
import {
  ancoraCoerente,
  ancoraPermitida,
  canCancelEvent,
  canChangeCapacity,
  canEditEvent,
  canApproveCollegeEvent,
  canViewAttendanceList,
  defaultDeadlines,
  isCollegeAdmin,
  requiresApproval,
  spotsOpenedByCapacityChange,
  validateDeadlines,
  type EventoView,
  type FiltroEventosEntrada,
  type NovoEventoEntrada,
  type ParticipanteConfirmado,
} from '@campus/shared';
import { AcessoAEventos } from '../comum/acesso-evento.service';
import {
  avisarMuitos,
  avisoDeEventoAlterado,
  avisoDeEventoAprovado,
  avisoDeEventoCancelado,
  type NovoAviso,
} from '../comum/avisos';
import { Conflito, RegraViolada, SemPermissao } from '../comum/erros';
import { paraDecimal, paraEvento } from '../comum/mapeadores';
import { reoferecerVaga } from '../comum/promocao';
import { reembolsarSeHouver } from '../comum/reembolsos';
import { listaAtivos } from '../comum/status';
import type { Titular } from '../comum/titular';
import { travarEvento } from '../comum/travas';
import { GATEWAY_DE_PAGAMENTO, type PaymentGateway } from '../pagamentos/gateway/pagamento.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ProjecaoDeEventos } from './projecao.service';
import type { CancelamentoEntrada, EdicaoEventoEntrada } from './schemas';

/*
 * `GET /eventos/:id/participantes` — a forma vem de `@campus/shared`.
 *
 * Havia uma declaração aqui e outra no app, e elas JÁ divergiam: o app dizia
 * `status: string`. É exatamente o tipo de duplicação que o pacote existe para
 * impedir, então a cópia local saiu e o alias permaneceu para não mexer nas
 * assinaturas que já a citam.
 */
export type ItemDaListaDeParticipantes = ParticipanteConfirmado;

/**
 * Eventos — RF-010 a RF-018, RF-020, RF-021, RF-041 e RN-001 a RN-005.
 *
 * Toda leitura passa por `AcessoAEventos` (alcance, RN-001) e toda escrita
 * passa por uma função de permissão de `@campus/shared` (`canEditEvent`,
 * `canCancelEvent`, `canApproveCollegeEvent`). Nenhuma das duas verificações é
 * de guard: a resposta depende da linha do evento, não do token.
 */
@Injectable()
export class EventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acesso: AcessoAEventos,
    private readonly projecao: ProjecaoDeEventos,
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: PaymentGateway,
  ) {}

  // --------------------------------------------------------------- leitura

  /** RF-015 — a lista visível, filtrada e ordenada. */
  async listar(titular: Titular, filtros: FiltroEventosEntrada): Promise<EventoView[]> {
    const visiveis = await this.acesso.eventosVisiveis(titular);
    return this.projecao.paraViews(aplicarFiltros(visiveis, titular, filtros), titular);
  }

  /**
   * Os quatro eventos mais próximos com inscrição aberta.
   *
   * Não usa `enrollmentOpen`: um evento cujo prazo de inscrição já fechou mas
   * que acontece amanhã continua sendo destaque legítimo — quem já tem vaga
   * quer vê-lo. O filtro é "publicado e ainda não começou".
   */
  async destaques(titular: Titular): Promise<EventoView[]> {
    const agora = Date.now();
    const proximos = (await this.acesso.eventosVisiveis(titular))
      .filter((linha) => linha.status === 'PUBLICADO' && linha.inicio.getTime() > agora)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .slice(0, 4);

    return this.projecao.paraViews(proximos, titular);
  }

  /** RF-016 — detalhe. Fora do alcance é `404`, mesmo por id direto (RNF-012). */
  async obter(eventoId: string, titular: Titular): Promise<EventoView> {
    const linha = await this.acesso.exigirVisivel(eventoId, titular);
    return this.projecao.paraView(linha, titular);
  }

  /** RF-041 — fila de aprovação do Admin de Faculdade (RN-003). */
  async pendentes(titular: Titular): Promise<EventoView[]> {
    if (!isCollegeAdmin(titular)) {
      throw new SemPermissao('Só Admin de Faculdade vê a fila de aprovação.');
    }

    const linhas = await this.prisma.evento.findMany({
      where: { status: 'EM_APROVACAO', faculdadeId: titular.faculdadeId },
      orderBy: { criadoEm: 'asc' },
    });
    return this.projecao.paraViews(linhas, titular);
  }

  /**
   * RN-024 e RF-009 — a lista de confirmados, para o organizador.
   *
   * Respeita o opt-out: quem marcou `visivelEntreConfirmados` como falso não
   * aparece **nem para o organizador**. É a escolha que o contrato registra, e
   * é a única coerente com o que a tela de perfil promete a quem desmarca.
   */
  async participantes(eventoId: string, titular: Titular): Promise<ItemDaListaDeParticipantes[]> {
    const evento = await this.acesso.exigirVisivel(eventoId, titular);
    this.exigirCompetenciaDeLeituraDeLista(titular, evento);

    const participacoes = await this.prisma.participacao.findMany({
      where: {
        eventoId,
        status: { in: ['CONFIRMADA', 'PRESENTE'] },
        usuario: { visivelEntreConfirmados: true },
      },
      include: { usuario: { select: { nome: true, turma: { select: { nome: true } } } } },
      orderBy: { criadoEm: 'asc' },
    });

    return participacoes
      .map((p) => ({
        participacaoId: p.id,
        nome: p.usuario.nome,
        turma: p.usuario.turma?.nome ?? null,
        status: p.status,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  // --------------------------------------------------------------- escrita

  /**
   * RF-010 a RF-012 — criação.
   *
   * Três decisões, e nenhuma é local:
   *
   * - **A âncora vem do vínculo de quem cria** (`ancoraPermitida`), nunca do
   *   corpo. É por isso que `NovoEvento` não tem campo `turmaId`: aceitá-lo
   *   permitiria publicar na turma de outra pessoa (RN-001, invariante 2).
   * - **Alcance FACULDADE por aluno comum nasce em aprovação**
   *   (`requiresApproval`, RN-003). Quem já é Admin de Faculdade publica direto.
   * - **Os prazos omitidos vêm de `defaultDeadlines`**, e a coerência entre eles
   *   é de `validateDeadlines` (RN-011) — que devolve a lista de violações, não
   *   um booleano, porque o formulário precisa dizer QUAL regra falhou.
   */
  async criar(titular: Titular, entrada: NovoEventoEntrada): Promise<EventoView> {
    const ancora = ancoraPermitida(titular, entrada.alcance);
    if (ancora === null) {
      throw new RegraViolada(
        'ALCANCE_FORA_DO_VINCULO',
        'Você não tem vínculo com esse nível de alcance. Conclua o onboarding.',
      );
    }

    const padroes = defaultDeadlines(entrada.inicio);
    const prazoInscricao = entrada.prazoInscricao ?? padroes.prazoInscricao;
    const prazoCancelamento = entrada.prazoCancelamento ?? padroes.prazoCancelamento;

    const violacoes = validateDeadlines(
      { inicio: entrada.inicio, fim: entrada.fim, prazoInscricao, prazoCancelamento },
      new Date(),
    );
    if (violacoes.length > 0) {
      throw new RegraViolada(
        'PRAZOS_INCOERENTES',
        'Confira as datas do evento.',
        violacoes.map((v) => ({ campo: v.field, mensagem: v.message })),
      );
    }

    const status = !entrada.publicar
      ? 'RASCUNHO'
      : requiresApproval(titular, entrada.alcance)
        ? 'EM_APROVACAO'
        : 'PUBLICADO';

    const dados: Prisma.EventoUncheckedCreateInput = {
      organizadorId: titular.id,
      titulo: entrada.titulo,
      descricao: entrada.descricao,
      alcance: entrada.alcance,
      turmaId: entrada.alcance === 'TURMA' ? ancora : null,
      cursoId: entrada.alcance === 'CURSO' ? ancora : null,
      faculdadeId: entrada.alcance === 'FACULDADE' ? ancora : null,
      inicio: new Date(entrada.inicio),
      fim: new Date(entrada.fim),
      local: entrada.local,
      capacidade: entrada.capacidade,
      // RN-016 — criar evento não inscreve o organizador.
      ocupadas: 0,
      preco: paraDecimal(entrada.preco),
      status,
      prazoInscricao: new Date(prazoInscricao),
      prazoCancelamento: new Date(prazoCancelamento),
      capaSeed: await this.proximaCapaSeed(),
      perguntas: entrada.perguntas
        ? {
            create: entrada.perguntas.map((pergunta, indice) => ({
              enunciado: pergunta.enunciado,
              tipo: pergunta.tipo,
              opcoes: pergunta.opcoes ?? [],
              obrigatoria: pergunta.obrigatoria,
              // 1..5, e o `CHECK` `ck_pergunta_ordem_faixa` confirma.
              ordem: indice + 1,
            })),
          }
        : undefined,
    };

    /*
     * `ancoraCoerente` antes de escrever: o `CHECK`
     * `ck_evento_ancora_coerente` recusaria de todo jeito, mas como `500`
     * traduzido — e a mensagem certa é esta. A verificação é a mesma função que
     * o app usa como invariante de `Evento`.
     */
    if (
      !ancoraCoerente({
        alcance: entrada.alcance,
        turmaId: dados.turmaId ?? null,
        cursoId: dados.cursoId ?? null,
        faculdadeId: dados.faculdadeId ?? null,
      })
    ) {
      throw new RegraViolada(
        'ALCANCE_INCOERENTE',
        'O alcance e o vínculo não combinam. Conclua o onboarding e tente de novo.',
      );
    }

    const criado = await this.prisma.evento.create({ data: dados });
    return this.projecao.paraView(criado, titular);
  }

  /**
   * RF-020 e RN-023 — edição.
   *
   * `canEditEvent` recusa evento cancelado ou realizado, então a distinção de
   * status vem **antes** dela: `409` para "o evento já encerrou" (conflito com
   * o estado, o cliente sabe que o evento existe) e `403` para "não é seu"
   * (competência). Sem essa ordem, o organizador de um evento realizado
   * receberia `403` e concluiria que perdeu o acesso.
   *
   * RN-005 — aumentar capacidade abre vagas, e **cada vaga aberta dispara uma
   * promoção da fila**. É o caso que mais dá errado quando esquecido: o
   * organizador aumenta de 40 para 45, cinco pessoas continuam na fila olhando
   * "lotado", e ninguém entende por quê.
   */
  async editar(
    eventoId: string,
    titular: Titular,
    entrada: EdicaoEventoEntrada,
  ): Promise<EventoView> {
    const atualizado = await this.prisma.$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      const linha = await this.acesso.exigirVisivel(eventoId, titular, tx);

      if (linha.status === 'CANCELADO' || linha.status === 'REALIZADO') {
        throw new Conflito(
          'EVENTO_ENCERRADO',
          linha.status === 'CANCELADO'
            ? 'Este evento foi cancelado e não pode mais ser editado.'
            : 'Este evento já aconteceu e não pode mais ser editado.',
        );
      }
      if (!canEditEvent(titular, linha)) {
        throw new SemPermissao('Só o organizador ou a coordenação edita este evento.');
      }

      const vagasAbertas = await this.ajustarCapacidade(tx, linha, entrada.capacidade);

      const inicio = entrada.inicio ? new Date(entrada.inicio) : linha.inicio;
      const fim = entrada.fim ? new Date(entrada.fim) : linha.fim;
      const prazoInscricao = entrada.prazoInscricao
        ? new Date(entrada.prazoInscricao)
        : linha.prazoInscricao;
      const prazoCancelamento = entrada.prazoCancelamento
        ? new Date(entrada.prazoCancelamento)
        : linha.prazoCancelamento;

      /*
       * `allowPast` só quando a data de início NÃO está sendo alterada: um
       * evento que já começou continua editável (corrigir a descrição, por
       * exemplo), e reprovar por "escolha uma data futura" impediria uma edição
       * legítima. Mas mover o início para o passado é erro de digitação.
       */
      const violacoes = validateDeadlines(
        {
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          prazoInscricao: prazoInscricao.toISOString(),
          prazoCancelamento: prazoCancelamento.toISOString(),
        },
        new Date(),
        { allowPast: entrada.inicio === undefined },
      );
      if (violacoes.length > 0) {
        throw new RegraViolada(
          'PRAZOS_INCOERENTES',
          'Confira as datas do evento.',
          violacoes.map((v) => ({ campo: v.field, mensagem: v.message })),
        );
      }

      const salvo = await tx.evento.update({
        where: { id: eventoId },
        data: {
          titulo: entrada.titulo,
          descricao: entrada.descricao,
          local: entrada.local,
          inicio,
          fim,
          prazoInscricao,
          prazoCancelamento,
        },
      });

      /*
       * RN-013 — mudar data, local ou preço dá direito a reembolso integral.
       * O aviso é o que torna esse direito exercível: quem não sabe que a data
       * mudou não pede reembolso. O cálculo só acontece se a pessoa pedir, com
       * motivo `EVENTO_ALTERADO`.
       */
      const mudouCondicao =
        entrada.inicio !== undefined || entrada.fim !== undefined || entrada.local !== undefined;
      if (mudouCondicao) {
        await this.avisarParticipantes(tx, salvo, (destinatarioId, evento) =>
          avisoDeEventoAlterado(
            destinatarioId,
            evento,
            'Data, horário ou local mudaram. Se não puder mais ir, o cancelamento dá reembolso integral.',
          ),
        );
      }

      // Cada vaga aberta pelo aumento de capacidade vira uma oferta (RN-005).
      for (let i = 0; i < vagasAbertas; i += 1) {
        const promovido = await reoferecerVaga(tx, eventoId, new Date());
        if (promovido === null) break;
      }

      return tx.evento.findUniqueOrThrow({ where: { id: eventoId } });
    });

    return this.projecao.paraView(atualizado, titular);
  }

  /**
   * RF-021, RN-021 e RN-022 — cancelamento com cascata.
   *
   * A ordem importa e é esta:
   *
   * 1. `PRESENTE` **não** é revertida. Quem entrou no evento entrou, e nem o
   *    cancelamento apaga isso (RN-022). É também por isso que `ocupadas` passa
   *    a ser a contagem de presentes, e não zero.
   * 2. Reembolso integral para quem pagou — `computeRefund` com
   *    `EVENTO_CANCELADO` devolve 100% independentemente da antecedência: quem
   *    muda as condições assume o custo (RN-013).
   * 3. Aviso com o motivo. `ck_evento_cancelado_tem_motivo` garante que a
   *    coluna não fique nula, e o schema garante que ela não fique inútil.
   *
   * Tudo numa transação: um cancelamento que gravasse o status e falhasse no
   * reembolso deixaria dinheiro de aluno preso num evento que não existe mais.
   */
  async cancelar(
    eventoId: string,
    titular: Titular,
    entrada: CancelamentoEntrada,
  ): Promise<EventoView> {
    const cancelado = await this.prisma.$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      const linha = await this.acesso.exigirVisivel(eventoId, titular, tx);

      if (linha.status !== 'PUBLICADO' && linha.status !== 'EM_APROVACAO') {
        throw new Conflito(
          'EVENTO_NAO_CANCELAVEL',
          linha.status === 'CANCELADO'
            ? 'Este evento já está cancelado.'
            : 'Só é possível cancelar evento publicado ou em aprovação.',
        );
      }
      if (!canCancelEvent(titular, linha)) {
        throw new SemPermissao('Só o organizador ou a coordenação cancela este evento.');
      }

      const evento = paraEvento(linha);
      const agora = new Date();

      const ativas = await tx.participacao.findMany({
        where: { eventoId, status: { in: listaAtivos() } },
      });

      const avisos: NovoAviso[] = [];
      let presentes = 0;

      for (const participacao of ativas) {
        // RN-022 — presença é terminal e blindada.
        if (participacao.status === 'PRESENTE') {
          presentes += 1;
          continue;
        }

        await reembolsarSeHouver(tx, this.gateway, participacao, evento, 'EVENTO_CANCELADO', agora);

        await tx.participacao.update({
          where: { id: participacao.id },
          data: {
            status: 'CANCELADA',
            motivoCancelamento: 'EVENTO_CANCELADO',
            posicaoFila: null,
            pagamentoExpiraEm: null,
            ofertaExpiraEm: null,
          },
        });

        avisos.push(avisoDeEventoCancelado(participacao.usuarioId, evento, entrada.motivo));
      }

      await avisarMuitos(tx, avisos);

      return tx.evento.update({
        where: { id: eventoId },
        data: {
          status: 'CANCELADO',
          motivoCancelamento: entrada.motivo,
          // Só os presentes continuam ocupando: as outras vagas deixaram de
          // existir junto com o evento.
          ocupadas: presentes,
        },
      });
    });

    return this.projecao.paraView(cancelado, titular);
  }

  /** RN-003 — aprovação de evento de alcance FACULDADE. */
  async aprovar(eventoId: string, titular: Titular): Promise<EventoView> {
    const linha = await this.acesso.exigirVisivel(eventoId, titular);

    if (!canApproveCollegeEvent(titular, linha)) {
      throw new SemPermissao('Só Admin de Faculdade aprova evento de alcance faculdade.');
    }
    if (linha.status !== 'EM_APROVACAO') {
      throw new Conflito(
        'EVENTO_NAO_PENDENTE',
        linha.status === 'PUBLICADO'
          ? 'Este evento já está publicado.'
          : 'Este evento não está aguardando aprovação.',
      );
    }

    const aprovado = await this.prisma.$transaction(async (tx) => {
      const salvo = await tx.evento.update({
        where: { id: eventoId },
        data: { status: 'PUBLICADO' },
      });
      await avisarMuitos(tx, [avisoDeEventoAprovado(salvo.organizadorId, paraEvento(salvo))]);
      return salvo;
    });

    return this.projecao.paraView(aprovado, titular);
  }

  // -------------------------------------------------------------- internos

  /**
   * RN-005 — capacidade sobe livremente e só desce até `ocupadas`.
   *
   * `canChangeCapacity` decide, e a mensagem de recusa é dela: ela sabe dizer
   * "já há 38 vagas ocupadas", que é a informação que o organizador precisa.
   * Nunca se remove participação aceita para caber na nova capacidade.
   *
   * @returns quantas vagas o aumento abriu (`spotsOpenedByCapacityChange`).
   */
  private async ajustarCapacidade(
    tx: Prisma.TransactionClient,
    linha: EventoLinha,
    nova: number | undefined,
  ): Promise<number> {
    if (nova === undefined || nova === linha.capacidade) return 0;

    const decisao = canChangeCapacity(linha, nova);
    if (!decisao.allowed) {
      throw new RegraViolada('CAPACIDADE_INVALIDA', decisao.reason ?? 'Capacidade inválida.', [
        { campo: 'capacidade', mensagem: decisao.reason ?? 'Capacidade inválida.' },
      ]);
    }

    await tx.evento.update({ where: { id: linha.id }, data: { capacidade: nova } });
    return spotsOpenedByCapacityChange(linha.capacidade, nova);
  }

  private exigirCompetenciaDeLeituraDeLista(titular: Titular, evento: EventoLinha): void {
    /*
     * `canViewAttendanceList` é definida como `canValidateCheckIn` no domínio, e
     * isso é proposital: quem opera a porta é quem vê a lista (RN-024). Chamar a
     * função em vez de repetir as três condições é o que garante que uma mudança
     * em RN-024 chegue aqui — a versão escrita à mão continuaria compilando e
     * decidindo pelo critério antigo.
     */
    if (!canViewAttendanceList(titular, evento)) {
      throw new SemPermissao('Só o organizador vê a lista de participantes deste evento.');
    }
  }

  /** Aviso para quem tem participação ativa. Usado por edição e cancelamento. */
  private async avisarParticipantes(
    tx: Prisma.TransactionClient,
    linha: EventoLinha,
    montar: (destinatarioId: string, evento: { id: string; titulo: string }) => NovoAviso,
  ): Promise<void> {
    const ativas = await tx.participacao.findMany({
      where: { eventoId: linha.id, status: { in: listaAtivos() } },
      select: { usuarioId: true },
    });
    await avisarMuitos(
      tx,
      ativas.map((p) => montar(p.usuarioId, { id: linha.id, titulo: linha.titulo })),
    );
  }

  /**
   * Semente 1..12 da capa gerada em SVG. Sem upload, sem storage.
   *
   * Distribui por contagem, e não por sorteio: dois eventos criados em
   * sequência ficam com capas diferentes, que é o que a lista precisa para não
   * parecer repetida.
   */
  private async proximaCapaSeed(): Promise<number> {
    const total = await this.prisma.evento.count();
    return (total % 12) + 1;
  }
}

/**
 * Filtro e ordenação da lista — RF-015.
 *
 * ## Por que isto NÃO está em `@campus/shared`
 *
 * Não é regra de negócio: é a consulta que uma tela específica faz. Alcance
 * (`canSee`) já decidiu quem vê o quê antes de chegar aqui; o que sobra é
 * recorte de exibição. Está aqui e não em SQL porque é a mesma função que o mock
 * do CP5 aplica, e as duas listas precisam concordar durante a transição.
 *
 * ## A ordenação, que parece detalhe e não é
 *
 * Futuros primeiro em ordem crescente (o mais próximo no topo), depois os
 * encerrados em ordem decrescente (o mais recente primeiro). Ordenar tudo por
 * data colocaria a Semana de Recepção de agosto acima do churrasco de setembro
 * — o contrário do que a tela serve para responder. Quem abre "Eventos" quer
 * saber o que vem, não o que passou.
 */
function aplicarFiltros(
  eventos: readonly EventoLinha[],
  titular: Titular,
  filtros: FiltroEventosEntrada,
): EventoLinha[] {
  const agora = Date.now();

  const fimDoMes = new Date();
  fimDoMes.setMonth(fimDoMes.getMonth() + 1, 0);
  fimDoMes.setHours(23, 59, 59, 999);
  const seteDias = agora + 7 * 24 * 3_600_000;

  const termo = (filtros.busca ?? '').trim().toLowerCase();

  return eventos
    .filter((e) => e.status === 'PUBLICADO' || e.status === 'CANCELADO' || e.status === 'REALIZADO')
    .filter((e) => {
      switch (filtros.alcance) {
        case 'MINHA_TURMA':
          return e.alcance === 'TURMA' && e.turmaId === titular.turmaId;
        case 'MEU_CURSO':
          return e.alcance === 'CURSO' && e.cursoId === titular.cursoId;
        case 'FACULDADE':
          return e.alcance === 'FACULDADE';
        default:
          return true;
      }
    })
    .filter((e) => {
      const gratuito = e.preco.isZero();
      if (filtros.preco === 'GRATUITOS') return gratuito;
      if (filtros.preco === 'PAGOS') return !gratuito;
      return true;
    })
    .filter((e) => {
      const inicio = e.inicio.getTime();
      if (filtros.periodo === 'ESTE_MES') return inicio <= fimDoMes.getTime();
      if (filtros.periodo === 'PROXIMOS_7_DIAS') return inicio <= seteDias;
      return true;
    })
    .filter((e) => {
      if (termo.length === 0) return true;
      return (
        e.titulo.toLowerCase().includes(termo) ||
        e.local.toLowerCase().includes(termo) ||
        e.descricao.toLowerCase().includes(termo)
      );
    })
    .sort((a, b) => {
      const futuroA = a.fim.getTime() >= agora;
      const futuroB = b.fim.getTime() >= agora;
      if (futuroA !== futuroB) return futuroA ? -1 : 1;
      return futuroA
        ? a.inicio.getTime() - b.inicio.getTime()
        : b.inicio.getTime() - a.inicio.getTime();
    });
}
