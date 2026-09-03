import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  canTransition,
  currentPolicy,
  enrollmentOpen,
  findActiveParticipation,
  isActive,
  isFull,
  nextWaitlistPosition,
  occupiesSpot,
  offerExpired,
  paymentDeadline,
  STATUS_PARTICIPACAO_ROTULO,
  waitlistSize,
  withinCancellationWindow,
  type Participacao,
  type ParticipacaoView,
  type RefundResult,
} from '@campus/shared';
import { AcessoAEventos } from '../comum/acesso-evento.service';
import { Conflito, NaoEncontrado, RegraViolada } from '../comum/erros';
import { paraEvento, paraParticipacao, paraPresenca, politicaParaJson } from '../comum/mapeadores';
import { recomporFila, reoferecerVaga } from '../comum/promocao';
import { reembolsarSeHouver } from '../comum/reembolsos';
import type { Titular } from '../comum/titular';
import { travarEvento, travarParticipacao } from '../comum/travas';
import { GATEWAY_DE_PAGAMENTO, type PaymentGateway } from '../pagamentos/gateway/pagamento.gateway';
import { paraPagamentoView } from '../pagamentos/projecao';
import { PrismaService } from '../prisma/prisma.service';

/** Resposta de `DELETE /participacoes/:id`. */
export interface ResultadoCancelamento {
  cancelada: boolean;
  /** Id de quem recebeu a oferta da vaga liberada (RN-007). */
  promovido: string | null;
  /** Faixa aplicada e valor, quando havia pagamento (RN-013). */
  reembolso: RefundResult | null;
}

/**
 * Participações — RF-019, RF-021, RF-024, RF-025 e RN-004 a RN-010, RN-015.
 *
 * É o módulo mais sensível da API: aqui se decide quem tem vaga. Duas
 * propriedades sustentam isso, e as duas estão em `comum/travas.ts` e no banco:
 *
 * - `SELECT ... FOR UPDATE` na linha do evento, **antes** de ler a contagem
 *   (RNF-013). Sem isso, duas requisições simultâneas leem `ocupadas = 39` e
 *   ambas inserem.
 * - `ck_evento_ocupadas_le_capacidade` e `ux_participacao_ativa`, que são a
 *   última defesa. `comum/prisma-erros.ts` traduz as duas para `409 SEM_VAGA` e
 *   `409 JA_INSCRITO`, para que mesmo o caminho de exceção devolva a resposta
 *   que o cliente sabe tratar em vez de `500`.
 *
 * Nenhuma regra é decidida aqui. `isFull`, `enrollmentOpen`,
 * `findActiveParticipation`, `paymentDeadline`, `nextWaitlistPosition`,
 * `canTransition`, `withinCancellationWindow`, `offerExpired` e `planPromotion`
 * decidem; este serviço busca o estado, chama a decisão e persiste.
 */
@Injectable()
export class ParticipacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acesso: AcessoAEventos,
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: PaymentGateway,
  ) {}

  // ------------------------------------------------------------- inscrição

  /**
   * RF-019 — reserva de vaga.
   *
   * A ordem das verificações é a ordem do que o cliente precisa saber, e cada
   * uma tem um código estável próprio (os cinco de `MOTIVO_RECUSA_INSCRICAO`):
   *
   * 1. evento invisível → `404`, indistinguível de inexistente (RNF-012);
   * 2. cancelado → `422 EVENTO_CANCELADO`;
   * 3. não publicado → `422 EVENTO_NAO_PUBLICADO`;
   * 4. já inscrito → `409 JA_INSCRITO` (RN-015);
   * 5. prazo fechado → `422 PRAZO_ENCERRADO` (RN-009);
   * 6. lotado → `409 SEM_VAGA` com `acao: LISTA_ESPERA` e `totalFila` (RN-006).
   *
   * O item 6 não é erro: é o desvio para a fila, e por isso a resposta traz a
   * ação e o tamanho da fila — a tela diz "você seria o 4º", não "falhou".
   */
  async inscrever(eventoId: string, titular: Titular): Promise<Participacao> {
    return this.prisma.$transaction(async (tx) => {
      // A TRAVA VEM PRIMEIRO. Ver `comum/travas.ts`: travar depois de contar é
      // contar o valor velho.
      await travarEvento(tx, eventoId);

      const linha = await this.acesso.exigirVisivel(eventoId, titular, tx);
      const evento = paraEvento(linha);

      if (evento.status === 'CANCELADO') {
        throw new RegraViolada('EVENTO_CANCELADO', 'Este evento foi cancelado pelo organizador.');
      }
      if (evento.status !== 'PUBLICADO') {
        throw new RegraViolada(
          'EVENTO_NAO_PUBLICADO',
          'Este evento ainda não está aberto para inscrição.',
        );
      }

      const participacoes = (
        await tx.participacao.findMany({ where: { eventoId }, orderBy: { criadoEm: 'asc' } })
      ).map(paraParticipacao);

      // RN-015 — uma participação ativa por aluno/evento.
      if (findActiveParticipation(participacoes, titular.id)) {
        throw new Conflito('JA_INSCRITO', 'Você já tem uma inscrição ativa neste evento.');
      }

      // RN-009 — o prazo limita entrada, inclusive na fila.
      if (!enrollmentOpen(evento, new Date())) {
        throw new RegraViolada('PRAZO_ENCERRADO', 'As inscrições deste evento já encerraram.');
      }

      // RN-006 — lotado não é erro: é o desvio para a lista de espera.
      if (isFull(evento)) {
        throw new Conflito('SEM_VAGA', 'As vagas acabaram. Você pode entrar na lista de espera.', {
          acao: 'LISTA_ESPERA',
          totalFila: waitlistSize(participacoes),
        });
      }

      const agora = new Date();
      const pago = evento.preco > 0;

      const criada = await tx.participacao.create({
        data: {
          eventoId,
          usuarioId: titular.id,
          // Evento pago reserva a vaga e abre a janela de pagamento (RN-012);
          // gratuito confirma na hora.
          status: pago ? 'PENDENTE_PAGAMENTO' : 'CONFIRMADA',
          pagamentoExpiraEm: pago ? new Date(paymentDeadline(evento, agora)) : null,
          // RN-013 — a política é congelada AGORA, não na hora do reembolso.
          politicaVigente: pago ? politicaParaJson(currentPolicy(agora)) : Prisma.DbNull,
        },
      });

      await tx.evento.update({ where: { id: eventoId }, data: { ocupadas: { increment: 1 } } });

      return paraParticipacao(criada);
    });
  }

  /**
   * RF-024 e RN-006 — entrar na fila FIFO.
   *
   * A fila **não** ocupa vaga: `ocupadas` não muda. A trava do evento continua
   * necessária porque `nextWaitlistPosition` lê a fila inteira, e duas entradas
   * simultâneas sem trava receberiam a mesma posição.
   */
  async entrarNaListaEspera(eventoId: string, titular: Titular): Promise<Participacao> {
    return this.prisma.$transaction(async (tx) => {
      await travarEvento(tx, eventoId);

      const linha = await this.acesso.exigirVisivel(eventoId, titular, tx);
      const evento = paraEvento(linha);

      if (evento.status !== 'PUBLICADO') {
        throw new RegraViolada(
          'EVENTO_NAO_PUBLICADO',
          'Este evento não está aberto para inscrição.',
        );
      }

      const participacoes = (
        await tx.participacao.findMany({ where: { eventoId }, orderBy: { criadoEm: 'asc' } })
      ).map(paraParticipacao);

      if (findActiveParticipation(participacoes, titular.id)) {
        throw new Conflito('JA_INSCRITO', 'Você já tem uma inscrição ativa neste evento.');
      }
      if (!enrollmentOpen(evento, new Date())) {
        throw new RegraViolada('PRAZO_ENCERRADO', 'As inscrições deste evento já encerraram.');
      }
      // Entrar na fila de um evento com vaga é sempre engano do cliente: a
      // pessoa perderia a vaga que está livre agora.
      if (!isFull(evento)) {
        throw new RegraViolada('AINDA_TEM_VAGA', 'Ainda há vaga: inscreva-se normalmente.');
      }

      const criada = await tx.participacao.create({
        data: {
          eventoId,
          usuarioId: titular.id,
          status: 'LISTA_ESPERA',
          posicaoFila: nextWaitlistPosition(participacoes),
        },
      });

      return paraParticipacao(criada);
    });
  }

  // ---------------------------------------------------------------- minhas

  /** RF-007 — as participações do titular, para as abas do perfil. */
  async listarMinhas(titular: Titular): Promise<ParticipacaoView[]> {
    const linhas = await this.prisma.participacao.findMany({
      where: { usuarioId: titular.id },
      include: { evento: true, presenca: true, pagamentos: { orderBy: { criadoEm: 'desc' } } },
      orderBy: { criadoEm: 'desc' },
    });

    return linhas.map((linha) => this.paraView(linha));
  }

  /**
   * Detalhe da participação.
   *
   * Participação de outra pessoa é `404`, não `403`: o id da participação é o id
   * do ingresso, e confirmar que ele existe já diria a um estranho que alguém
   * tem vaga naquele evento.
   */
  async obter(participacaoId: string, titular: Titular): Promise<ParticipacaoView> {
    const linha = await this.prisma.participacao.findUnique({
      where: { id: participacaoId },
      include: { evento: true, presenca: true, pagamentos: { orderBy: { criadoEm: 'desc' } } },
    });

    if (!linha || linha.usuarioId !== titular.id) {
      throw new NaoEncontrado('Inscrição não encontrada.');
    }
    return this.paraView(linha);
  }

  // ----------------------------------------------------------- cancelamento

  /**
   * RF-021, RN-007 e RN-010 — cancelar a própria participação.
   *
   * A vaga é liberada e a promoção da fila acontece na MESMA transação. Se
   * fosse assíncrono, existiria uma janela em que a vaga está livre e ninguém
   * foi avisado — e é justamente nessa janela que outra pessoa entraria por
   * fora da fila.
   *
   * RN-010: cancelar depois do prazo é **permitido**, e fica registrado em
   * `canceladaAposPrazo` — o organizador precisa distinguir quem desistiu com
   * antecedência de quem desistiu na véspera. Sem reembolso, o que
   * `computeRefund` já decide pela faixa.
   */
  async cancelar(participacaoId: string, titular: Titular): Promise<ResultadoCancelamento> {
    return this.prisma.$transaction(async (tx) => {
      const inicial = await tx.participacao.findUnique({ where: { id: participacaoId } });
      if (!inicial || inicial.usuarioId !== titular.id) {
        throw new NaoEncontrado('Inscrição não encontrada.');
      }

      /*
       * Ordem de trava: evento e depois participação, sempre. É a mesma ordem
       * de `ExpiracaoService` e de `PagamentosService` — duas rotinas que
       * travassem os mesmos dois registros em ordens opostas se bloqueariam
       * mutuamente.
       */
      await travarEvento(tx, inicial.eventoId);
      await travarParticipacao(tx, participacaoId);

      const linha = await tx.participacao.findUniqueOrThrow({ where: { id: participacaoId } });
      const participacao = paraParticipacao(linha);

      if (!isActive(participacao.status)) {
        throw new RegraViolada('JA_ENCERRADA', 'Esta inscrição já estava encerrada.');
      }
      /*
       * `canTransition` é a autoridade sobre o que pode virar o quê — e é ela
       * que proíbe `PRESENTE → CANCELADA` (RN-022: presença é terminal e
       * blindada). Escrever `if (status === 'PRESENTE')` funcionaria hoje e
       * deixaria de refletir a tabela de transições na primeira mudança dela.
       */
      if (!canTransition(participacao.status, 'CANCELADA')) {
        throw new RegraViolada(
          'TRANSICAO_INVALIDA',
          `Uma inscrição com status "${STATUS_PARTICIPACAO_ROTULO[participacao.status]}" não pode ser cancelada.`,
        );
      }

      const linhaEvento = await tx.evento.findUniqueOrThrow({ where: { id: linha.eventoId } });
      const evento = paraEvento(linhaEvento);
      const agora = new Date();

      const liberouVaga = occupiesSpot(participacao.status);

      const reembolso = await reembolsarSeHouver(
        tx,
        this.gateway,
        linha,
        evento,
        'ALUNO_CANCELOU',
        agora,
      );

      await tx.participacao.update({
        where: { id: participacaoId },
        data: {
          status: 'CANCELADA',
          motivoCancelamento: 'ALUNO_DESISTIU',
          canceladaAposPrazo: !withinCancellationWindow(evento, agora),
          posicaoFila: null,
          pagamentoExpiraEm: null,
          ofertaExpiraEm: null,
        },
      });

      if (liberouVaga) {
        await tx.evento.update({
          where: { id: linha.eventoId },
          data: { ocupadas: Math.max(0, linhaEvento.ocupadas - 1) },
        });
      }

      // A fila anda em qualquer caso: quem saiu pode ter estado nela.
      await recomporFila(tx, linha.eventoId);

      const promovido = liberouVaga ? await reoferecerVaga(tx, linha.eventoId, agora) : null;

      return { cancelada: true, promovido, reembolso: reembolso?.resultado ?? null };
    });
  }

  /**
   * RF-025, RN-007 e RN-008 — confirmar a vaga oferecida.
   *
   * A vaga já estava reservada para a oferta, então `ocupadas` **não** muda.
   * Essa é a assimetria que o desenho da fila exige: `OFERTA_PENDENTE` ocupa
   * vaga (`occupiesSpot`) justamente para que confirmar não precise disputar
   * nada — a vaga era da pessoa desde a oferta.
   */
  async confirmarOferta(participacaoId: string, titular: Titular): Promise<Participacao> {
    return this.prisma.$transaction(async (tx) => {
      const inicial = await tx.participacao.findUnique({ where: { id: participacaoId } });
      if (!inicial || inicial.usuarioId !== titular.id) {
        throw new NaoEncontrado('Inscrição não encontrada.');
      }

      await travarEvento(tx, inicial.eventoId);
      await travarParticipacao(tx, participacaoId);

      const linha = await tx.participacao.findUniqueOrThrow({ where: { id: participacaoId } });
      const participacao = paraParticipacao(linha);

      /*
       * `409` e não `422`: não estar com oferta é conflito com o estado atual e
       * pode deixar de ser verdade — a pessoa pode receber uma oferta em
       * seguida. É a convenção do contrato (`409` muda por espera, `422` não).
       */
      if (participacao.status !== 'OFERTA_PENDENTE') {
        throw new Conflito('SEM_OFERTA', 'Não há vaga oferecida para esta inscrição.');
      }

      const agora = new Date();
      /*
       * `offerExpired` como segunda linha: o interceptor de expiração já deveria
       * ter transformado esta participação em `EXPIRADA` antes do handler rodar.
       * A verificação existe porque o interceptor pode ter falhado (ele engole
       * o próprio erro de propósito) e porque a oferta pode vencer entre a
       * varredura e a trava.
       */
      if (offerExpired(participacao, agora)) {
        throw new RegraViolada('OFERTA_EXPIRADA', 'O prazo para confirmar esta vaga já passou.');
      }

      const evento = paraEvento(
        await tx.evento.findUniqueOrThrow({ where: { id: linha.eventoId } }),
      );
      const pago = evento.preco > 0;
      const destino = pago ? 'PENDENTE_PAGAMENTO' : 'CONFIRMADA';

      if (!canTransition(participacao.status, destino)) {
        throw new Conflito('TRANSICAO_INVALIDA', 'Esta inscrição não pode ser confirmada agora.');
      }

      const atualizada = await tx.participacao.update({
        where: { id: participacaoId },
        data: {
          status: destino,
          ofertaExpiraEm: null,
          pagamentoExpiraEm: pago ? new Date(paymentDeadline(evento, agora)) : null,
          politicaVigente: pago ? politicaParaJson(currentPolicy(agora)) : Prisma.DbNull,
        },
      });

      return paraParticipacao(atualizada);
    });
  }

  // -------------------------------------------------------------- internos

  /**
   * `ParticipacaoView` — participação com o evento resumido, o pagamento
   * corrente e a presença.
   *
   * Só o pagamento MAIS RECENTE entra. Uma participação pode ter vários
   * (cobrança recusada seguida de nova tentativa), e a tela mostra o que está
   * valendo; o histórico completo não tem consumidor no contrato.
   */
  private paraView(linha: LinhaComRelacoes): ParticipacaoView {
    const base = paraParticipacao(linha);
    const pagamento = linha.pagamentos[0] ?? null;

    return {
      ...base,
      evento: {
        id: linha.evento.id,
        titulo: linha.evento.titulo,
        inicio: linha.evento.inicio.toISOString(),
        fim: linha.evento.fim.toISOString(),
        local: linha.evento.local,
        preco: linha.evento.preco.toNumber(),
        alcance: linha.evento.alcance,
        status: linha.evento.status,
        capaSeed: linha.evento.capaSeed,
      },
      pagamento: pagamento ? paraPagamentoView(pagamento, linha) : null,
      presenca: linha.presenca ? paraPresenca(linha.presenca) : null,
    };
  }
}

/** A forma que `paraView` consome — o `include` e o tipo andam juntos. */
type LinhaComRelacoes = Prisma.ParticipacaoGetPayload<{
  include: { evento: true; presenca: true; pagamentos: true };
}>;
