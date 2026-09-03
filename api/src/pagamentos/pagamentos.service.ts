import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  Pagamento as PagamentoLinha,
  Participacao as ParticipacaoLinha,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  canTransition,
  idempotencyKey,
  paymentDeadline,
  planWebhook,
  type DesfechoSimulado,
  type NovoPagamentoEntrada,
  type PagamentoView,
  type WebhookOutcome,
} from '@campus/shared';
import { avisar, avisoDePagamentoConfirmado } from '../comum/avisos';
import {
  Conflito,
  NaoAutenticado,
  NaoEncontrado,
  RegraViolada,
  SemPermissao,
} from '../comum/erros';
import { paraDecimal, paraEvento } from '../comum/mapeadores';
import { reembolsarSeHouver } from '../comum/reembolsos';
import type { Titular } from '../comum/titular';
import { travarEvento, travarParticipacao, type ClienteBanco } from '../comum/travas';
import { AMBIENTE, type Ambiente } from '../config/ambiente';
import { PrismaService } from '../prisma/prisma.service';
import {
  GATEWAY_DE_PAGAMENTO,
  paraCentavos,
  type NotificacaoRecebida,
  type PaymentGateway,
} from './gateway/pagamento.gateway';
import { paraPagamentoView } from './projecao';

/** Resposta do webhook. Sempre sucesso, inclusive no reprocessamento (RN-014). */
export interface AceitePagamento {
  desfecho: WebhookOutcome['tipo'];
}

/**
 * Pagamento — RN-012, RN-013, RN-014 e RN-027.
 *
 * ## Um caminho só confirma pagamento
 *
 * `planWebhook` decide, e `aplicarDesfecho` persiste. Vale para as três
 * entradas: a notificação do gateway, a captura síncrona do cartão e o botão de
 * simulação da demo. Três caminhos de confirmação seriam três lugares onde
 * esquecer de zerar `pagamentoExpiraEm` — e a vaga confirmada expiraria dez
 * minutos depois.
 *
 * ## Idempotência é garantia do banco
 *
 * `pagamento.chave_idempotencia` é `UNIQUE`, e
 * `ux_pagamento_aguardando_por_participacao` permite no máximo uma cobrança
 * `AGUARDANDO` por participação (RN-027). Sem o segundo, um duplo toque no
 * botão de pagar geraria dois Pix para a mesma vaga e o aluno pagaria o errado.
 * Os dois são traduzidos em `comum/prisma-erros.ts`.
 */
@Injectable()
export class PagamentosService {
  private readonly log = new Logger(PagamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: PaymentGateway,
    @Inject(AMBIENTE) private readonly ambiente: Ambiente,
  ) {}

  // -------------------------------------------------------------- cobrança

  /**
   * RF-028, RN-012 e RN-027 — abre a cobrança de uma participação pendente.
   *
   * **Idempotente por participação.** Chamar duas vezes com o mesmo método
   * devolve a mesma cobrança em vez de criar duas. Trocar o método (Pix →
   * cartão) atualiza a cobrança existente, e não cria uma segunda: a
   * alternativa seria recusar com `409`, e obrigar quem mudou de ideia a
   * cancelar a inscrição para poder pagar de outro jeito.
   *
   * A janela de RN-012 é **recontada aqui**: o relógio da vaga começa quando a
   * cobrança abre, não quando a inscrição foi criada.
   */
  async abrirCobranca(
    participacaoId: string,
    titular: Titular,
    entrada: NovoPagamentoEntrada,
  ): Promise<PagamentoView> {
    return this.prisma.$transaction(async (tx) => {
      const participacao = await this.exigirParticipacaoDoTitular(tx, participacaoId, titular);
      await travarEvento(tx, participacao.eventoId);
      await travarParticipacao(tx, participacaoId);

      const atual = await tx.participacao.findUniqueOrThrow({ where: { id: participacaoId } });
      if (atual.status !== 'PENDENTE_PAGAMENTO') {
        throw new Conflito(
          'NAO_AGUARDA_PAGAMENTO',
          atual.status === 'CONFIRMADA'
            ? 'Esta inscrição já está confirmada.'
            : 'Esta inscrição não está aguardando pagamento.',
        );
      }

      const evento = paraEvento(
        await tx.evento.findUniqueOrThrow({ where: { id: atual.eventoId } }),
      );
      const agora = new Date();
      const expiraEm = paymentDeadline(evento, agora);

      const aberta = await tx.pagamento.findFirst({
        where: { participacaoId, status: 'AGUARDANDO' },
      });

      // Mesmo método: nada muda além do prazo, que é recontado.
      if (aberta && aberta.metodo === entrada.metodo) {
        const comPrazo = await tx.participacao.update({
          where: { id: participacaoId },
          data: { pagamentoExpiraEm: new Date(expiraEm) },
        });
        return paraPagamentoView(aberta, comPrazo, agora);
      }

      /*
       * `chaveIdempotencia` é gerada por NÓS e estável por tentativa
       * (ADR-0006). O identificador da tentativa é um UUID: a chave precisa ser
       * única no banco, e derivá-la só de `participacaoId` colidiria na segunda
       * tentativa legítima (cobrança recusada seguida de nova).
       */
      const chave = idempotencyKey(participacaoId, randomUUID());

      const cobranca = await this.gateway.criarCobranca({
        participacaoId,
        valorCentavos: paraCentavos(evento.preco),
        metodo: entrada.metodo,
        descricao: evento.titulo,
        expiraEm,
        chaveIdempotencia: chave,
        ...(entrada.cartao ? { cartao: entrada.cartao } : {}),
      });

      const dadosDoCartao = entrada.cartao
        ? {
            ultimosQuatro: entrada.cartao.ultimosQuatro,
            bandeiraCartao: entrada.cartao.bandeira,
            titularCartao: entrada.cartao.titular,
          }
        : { ultimosQuatro: null, bandeiraCartao: null, titularCartao: null };

      const salvo = aberta
        ? await tx.pagamento.update({
            where: { id: aberta.id },
            data: {
              metodo: entrada.metodo,
              valor: paraDecimal(evento.preco),
              status: cobranca.status,
              transacaoExternaId: cobranca.transacaoId,
              chaveIdempotencia: chave,
              ...dadosDoCartao,
            },
          })
        : await tx.pagamento.create({
            data: {
              participacaoId,
              metodo: entrada.metodo,
              valor: paraDecimal(evento.preco),
              status: cobranca.status,
              transacaoExternaId: cobranca.transacaoId,
              chaveIdempotencia: chave,
              ...dadosDoCartao,
            },
          });

      const comPrazo = await tx.participacao.update({
        where: { id: participacaoId },
        data: { pagamentoExpiraEm: new Date(expiraEm) },
      });

      /*
       * Cartão aprovado tem captura síncrona: o gateway já devolveu
       * `CONFIRMADO`. Em vez de confirmar aqui, a notificação equivalente é
       * montada e passa pelo MESMO `planWebhook` do webhook — é o que mantém
       * uma única porta de confirmação (RN-014).
       */
      if (cobranca.status === 'CONFIRMADO') {
        await this.aplicarDesfecho(tx, salvo, comPrazo, {
          transacaoExternaId: cobranca.transacaoId,
          valorPago: evento.preco,
          pago: true,
        });
      }

      const final = await tx.pagamento.findUniqueOrThrow({ where: { id: salvo.id } });
      const participacaoFinal = await tx.participacao.findUniqueOrThrow({
        where: { id: participacaoId },
      });
      return paraPagamentoView(final, participacaoFinal, agora);
    });
  }

  /** A cobrança corrente da participação. */
  async obterCobranca(participacaoId: string, titular: Titular): Promise<PagamentoView> {
    const participacao = await this.exigirParticipacaoDoTitular(
      this.prisma,
      participacaoId,
      titular,
    );

    const pagamento = await this.prisma.pagamento.findFirst({
      where: { participacaoId },
      orderBy: { criadoEm: 'desc' },
    });
    if (!pagamento) throw new NaoEncontrado('Cobrança não encontrada.');

    return paraPagamentoView(pagamento, participacao);
  }

  // --------------------------------------------------------------- webhook

  /**
   * RN-014 — notificação do gateway.
   *
   * ## Por que a resposta é sempre sucesso
   *
   * Responder erro faria o gateway reenviar indefinidamente. Idempotência é
   * resposta de sucesso **sem efeito**, não recusa: uma notificação já
   * processada devolve `IGNORAR_DUPLICADA` com `201`, e a fila do provedor
   * segue em frente.
   *
   * As duas exceções são as que não podem ser aceitas em silêncio: assinatura
   * inválida (`401`) e corpo malformado (`422`). Nas duas, aceitar seria pior —
   * uma notificação forjada confirmaria inscrição sem dinheiro.
   */
  async processarWebhook(notificacao: NotificacaoRecebida): Promise<AceitePagamento> {
    const verificada = this.gateway.verificarNotificacao(notificacao);

    if (!verificada.valida) {
      if (verificada.motivo === 'ASSINATURA_INVALIDA') {
        // Registrado sem o corpo: corpo bruto de notificação forjada é dado
        // não confiável e não deve entrar no log (RNF-009).
        this.log.warn('notificação de pagamento recusada: assinatura inválida');
        throw new NaoAutenticado(
          'ASSINATURA_INVALIDA',
          'Notificação sem assinatura válida do gateway.',
        );
      }
      if (verificada.motivo === 'CORPO_MALFORMADO') {
        throw new RegraViolada('CORPO_INVALIDO', 'A notificação não tem a forma esperada.');
      }
      return { desfecho: 'DESCONHECIDO' };
    }

    return this.prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.findUnique({
        where: { chaveIdempotencia: verificada.chaveIdempotencia },
      });

      /*
       * Chave que não conhecemos: pode ser notificação de outro ambiente
       * apontando para a mesma URL. `DESCONHECIDO` com `201` — o gateway para
       * de reenviar e nada é escrito.
       */
      if (!pagamento) return { desfecho: 'DESCONHECIDO' as const };

      await travarParticipacao(tx, pagamento.participacaoId);
      const participacao = await tx.participacao.findUniqueOrThrow({
        where: { id: pagamento.participacaoId },
      });

      return {
        desfecho: await this.aplicarDesfecho(tx, pagamento, participacao, {
          transacaoExternaId: verificada.transacaoId,
          valorPago: verificada.valorCentavos / 100,
          pago: verificada.tipo === 'PAGAMENTO_CONFIRMADO',
        }),
      };
    });
  }

  // -------------------------------------------------------------- simulação

  /**
   * Gatilho da demo (ADR-0006). **Só fora de produção.**
   *
   * Em produção a rota responde `404`, e não `403`: um endpoint que confirma
   * pagamento sem passar pelo gateway não deve nem existir para quem estiver
   * procurando. Responder `403` confirmaria que ele está lá.
   *
   * `DUPLICAR` aplica o MESMO desfecho duas vezes. É o único jeito de
   * demonstrar a idempotência de RN-014 — que é invisível quando tudo dá certo
   * na primeira tentativa: a segunda passada devolve `IGNORAR_DUPLICADA` e não
   * escreve nada.
   */
  async simularDesfecho(
    pagamentoId: string,
    titular: Titular,
    desfecho: DesfechoSimulado,
  ): Promise<PagamentoView & { desfecho: WebhookOutcome['tipo'] | 'RECUSADO' }> {
    /*
     * `404` e não `403`: em produção este endpoint não existe, e dizer
     * "proibido" confirmaria a existência de um gatilho de confirmação de
     * pagamento — informação que não interessa a quem estiver procurando.
     *
     * A guarda é a flag e não `NODE_ENV`, porque a stack de demonstração roda
     * `production` de propósito. Ver `PERMITIR_SIMULACAO_PAGAMENTO` em
     * `config/ambiente.ts`.
     */
    if (!this.ambiente.PERMITIR_SIMULACAO_PAGAMENTO) {
      throw new NaoEncontrado('Não encontramos o que você pediu.');
    }

    return this.prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.findUnique({ where: { id: pagamentoId } });
      if (!pagamento) throw new NaoEncontrado('Cobrança não encontrada.');

      const participacao = await this.exigirParticipacaoDoTitular(
        tx,
        pagamento.participacaoId,
        titular,
      );

      await travarParticipacao(tx, participacao.id);

      if (desfecho === 'RECUSAR') {
        const recusado = await tx.pagamento.update({
          where: { id: pagamentoId },
          data: { status: 'RECUSADO' },
        });
        return { ...paraPagamentoView(recusado, participacao), desfecho: 'RECUSADO' as const };
      }

      const notificacao = {
        transacaoExternaId: pagamento.transacaoExternaId ?? pagamento.id,
        valorPago: pagamento.valor.toNumber(),
        pago: true,
      };

      let ultimo = await this.aplicarDesfecho(tx, pagamento, participacao, notificacao);

      if (desfecho === 'DUPLICAR') {
        const relido = await tx.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
        const participacaoRelida = await tx.participacao.findUniqueOrThrow({
          where: { id: participacao.id },
        });
        ultimo = await this.aplicarDesfecho(tx, relido, participacaoRelida, notificacao);
      }

      const final = await tx.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
      const participacaoFinal = await tx.participacao.findUniqueOrThrow({
        where: { id: participacao.id },
      });
      return { ...paraPagamentoView(final, participacaoFinal), desfecho: ultimo };
    });
  }

  // -------------------------------------------------------------- reembolso

  /**
   * RN-013 — reembolso pela política **congelada** no pagamento.
   *
   * O motivo é derivado do estado, e não aceito do cliente: quem informasse o
   * motivo escolheria a própria faixa de reembolso.
   *
   * - evento cancelado → `EVENTO_CANCELADO`, 100%;
   * - participação cancelada pelo aluno → `ALUNO_CANCELOU`, pela faixa de
   *   antecedência.
   *
   * Participação ainda ativa é recusada: devolver o dinheiro de quem continua
   * com a vaga deixaria a pessoa no evento de graça.
   */
  async solicitarReembolso(participacaoId: string, titular: Titular): Promise<PagamentoView> {
    return this.prisma.$transaction(async (tx) => {
      // Confere a titularidade ANTES de travar: travar linha de outra pessoa
      // seria bloqueio induzido por quem não tem acesso ao recurso.
      await this.exigirParticipacaoDoTitular(tx, participacaoId, titular);
      await travarParticipacao(tx, participacaoId);

      const atual = await tx.participacao.findUniqueOrThrow({ where: { id: participacaoId } });
      const linhaEvento = await tx.evento.findUniqueOrThrow({ where: { id: atual.eventoId } });
      const evento = paraEvento(linhaEvento);

      const jaReembolsado = await tx.pagamento.findFirst({
        where: {
          participacaoId,
          status: { in: ['REEMBOLSADO', 'REEMBOLSADO_PARCIAL', 'ESTORNADO'] },
        },
      });
      if (jaReembolsado) {
        throw new Conflito('REEMBOLSO_JA_FEITO', 'Este pagamento já foi devolvido.');
      }

      const motivo =
        evento.status === 'CANCELADO'
          ? ('EVENTO_CANCELADO' as const)
          : atual.status === 'CANCELADA'
            ? ('ALUNO_CANCELOU' as const)
            : null;

      if (motivo === null) {
        throw new RegraViolada(
          'PARTICIPACAO_ATIVA',
          'Cancele a inscrição para pedir o reembolso: com a vaga garantida, não há o que devolver.',
        );
      }

      const aplicado = await reembolsarSeHouver(
        tx,
        this.gateway,
        atual,
        evento,
        motivo,
        new Date(),
      );

      if (!aplicado) {
        throw new Conflito(
          'SEM_PAGAMENTO_CONFIRMADO',
          'Não há pagamento confirmado nesta inscrição.',
        );
      }

      const pagamento = await tx.pagamento.findUniqueOrThrow({
        where: { id: aplicado.pagamentoId },
      });
      return paraPagamentoView(pagamento, atual);
    });
  }

  // -------------------------------------------------------------- internos

  /**
   * A única escrita que confirma, estorna ou marca divergência.
   *
   * `planWebhook` decide, na ordem que RN-014 exige: duplicada antes de valor
   * divergente antes de participação encerrada. As quatro saídas:
   *
   * | Desfecho | O que escreve | Por quê |
   * |---|---|---|
   * | `CONFIRMAR` | pagamento `CONFIRMADO`, participação `CONFIRMADA`, prazo zerado, aviso | é o caminho feliz |
   * | `IGNORAR_DUPLICADA` | nada | reprocessar não repete transição nem notificação |
   * | `ESTORNAR` | pagamento `ESTORNADO`, reembolso no gateway | a vaga expirou antes de o dinheiro ser identificado e já pode ser de outro |
   * | `DIVERGENCIA_DE_VALOR` | pagamento `EM_ANALISE` | dinheiro chegou com valor errado; **nunca** confirma |
   *
   * A última linha diverge do mock do CP5, que não escrevia nada em
   * divergência. Não escrever deixa a cobrança `AGUARDANDO` com dinheiro em
   * trânsito e ninguém olhando — `EM_ANALISE` é o status que existe exatamente
   * para esse estado, e é a recomendação registrada na ADR-0006 ("valor
   * desconhecido é mapeado para `EM_ANALISE`, nunca para `CONFIRMADO`").
   */
  private async aplicarDesfecho(
    tx: ClienteBanco,
    pagamento: PagamentoLinha,
    participacao: ParticipacaoLinha,
    notificacao: { transacaoExternaId: string; valorPago: number; pago: boolean },
  ): Promise<WebhookOutcome['tipo']> {
    const plano = planWebhook(
      { id: pagamento.id, status: pagamento.status, valor: pagamento.valor.toNumber() },
      { status: participacao.status },
      notificacao,
    );

    switch (plano.tipo) {
      case 'CONFIRMAR': {
        const agora = new Date();
        await tx.pagamento.update({
          where: { id: pagamento.id },
          data: {
            status: 'CONFIRMADO',
            confirmadoEm: agora,
            transacaoExternaId: notificacao.transacaoExternaId,
          },
        });

        /*
         * `canTransition` antes de escrever: `planWebhook` já garantiu que a
         * participação está em `PENDENTE_PAGAMENTO`, e esta verificação é a que
         * sobreviveria a uma mudança na tabela de transições.
         */
        if (canTransition(participacao.status, 'CONFIRMADA')) {
          await tx.participacao.update({
            where: { id: participacao.id },
            data: { status: 'CONFIRMADA', pagamentoExpiraEm: null },
          });
        }

        await avisar(tx, avisoDePagamentoConfirmado(participacao.usuarioId, participacao.id));
        return plano.tipo;
      }

      case 'ESTORNAR': {
        await this.gateway.reembolsar({
          transacaoId: pagamento.transacaoExternaId ?? pagamento.id,
          valorCentavos: paraCentavos(pagamento.valor.toNumber()),
          chaveIdempotencia: `estorno:${pagamento.id}`,
          motivo: plano.motivo,
        });
        await tx.pagamento.update({
          where: { id: pagamento.id },
          data: { status: 'ESTORNADO', valorReembolsado: pagamento.valor },
        });
        this.log.warn(`pagamento ${pagamento.id} estornado: ${plano.motivo}`);
        return plano.tipo;
      }

      case 'DIVERGENCIA_DE_VALOR': {
        await tx.pagamento.update({
          where: { id: pagamento.id },
          data: { status: 'EM_ANALISE' },
        });
        this.log.warn(
          `divergência de valor no pagamento ${pagamento.id}: esperado ${plano.esperado}, recebido ${plano.recebido}`,
        );
        return plano.tipo;
      }

      case 'IGNORAR_DUPLICADA':
      case 'DESCONHECIDO':
        // Nada a escrever — é exatamente o que RN-014 exige.
        return plano.tipo;
    }
  }

  /**
   * Participação do titular, ou recusa.
   *
   * `404` para inexistente e `403` para "não é sua" — é o que o contrato lista
   * nas rotas de pagamento. Diferente de `GET /participacoes/:id`, onde as duas
   * são `404`: ali o id É o ingresso, e confirmar que ele existe já diria a um
   * estranho que alguém tem vaga naquele evento.
   */
  private async exigirParticipacaoDoTitular(
    cliente: ClienteBanco,
    participacaoId: string,
    titular: Titular,
  ): Promise<ParticipacaoLinha> {
    const participacao = await cliente.participacao.findUnique({ where: { id: participacaoId } });
    if (!participacao) throw new NaoEncontrado('Inscrição não encontrada.');
    if (participacao.usuarioId !== titular.id) {
      throw new SemPermissao('Esta inscrição não é sua.');
    }
    return participacao;
  }
}
