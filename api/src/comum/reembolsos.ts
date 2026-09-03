import type { Participacao as ParticipacaoLinha } from '@prisma/client';
import {
  computeRefund,
  currentPolicy,
  type Evento,
  type RefundReason,
  type RefundResult,
} from '@campus/shared';
import { paraCentavos, type PaymentGateway } from '../pagamentos/gateway/pagamento.gateway';
import { paraDecimal, paraPolitica } from './mapeadores';
import type { ClienteBanco } from './travas';

/**
 * Reembolso de uma participação — RN-013.
 *
 * ## Por que é função livre e não método de um serviço
 *
 * Dois caminhos reembolsam: o aluno pede (`POST /participacoes/:id/reembolso`) e
 * o organizador cancela o evento (`POST /eventos/:id/cancelamento`, em cascata).
 * O segundo acontece dentro da transação que cancela o evento inteiro — se o
 * reembolso fosse chamada de serviço separada, existiria um estado em que o
 * evento está cancelado e o dinheiro não voltou.
 *
 * ## A política é a CONGELADA, não a vigente
 *
 * `participacao.politicaVigente` é o retrato dos parâmetros no momento do
 * pagamento. Aplicar a política de hoje a um pagamento de mês passado seria
 * mudar o que a pessoa aceitou — exatamente o que RN-013 proíbe. Só quando a
 * coluna está nula (pagamento anterior ao congelamento) cai-se na política
 * atual, e isso está registrado no retorno.
 *
 * ## Quem decide é `computeRefund`
 *
 * Faixa, taxa, valor e explicação vêm dela. Aqui só se busca o pagamento, se
 * chama o gateway e se persiste o resultado. Nenhuma comparação de data e
 * nenhuma multiplicação por 0,5 acontece neste arquivo.
 */
export interface ReembolsoAplicado {
  resultado: RefundResult;
  pagamentoId: string;
  /** `true` quando a política congelada não existia e a atual foi usada. */
  politicaSubstituida: boolean;
}

export async function reembolsarSeHouver(
  cliente: ClienteBanco,
  gateway: PaymentGateway,
  participacao: Pick<ParticipacaoLinha, 'id' | 'politicaVigente'>,
  evento: Pick<Evento, 'inicio'>,
  motivo: RefundReason,
  agora: Date,
): Promise<ReembolsoAplicado | null> {
  const pagamento = await cliente.pagamento.findFirst({
    where: { participacaoId: participacao.id, status: 'CONFIRMADO' },
    orderBy: { criadoEm: 'desc' },
  });

  // Sem pagamento confirmado não há o que devolver — evento gratuito, inscrição
  // que expirou antes de pagar, ou cobrança recusada.
  if (!pagamento) return null;

  const congelada = paraPolitica(participacao.politicaVigente);
  const politica = congelada ?? currentPolicy(agora);

  const resultado = computeRefund(evento, pagamento.valor.toNumber(), motivo, agora, politica);

  if (resultado.valor <= 0) {
    // `SEM_REEMBOLSO` é desfecho legítimo e não escreve nada: o pagamento
    // continua `CONFIRMADO`, porque o dinheiro continua sendo do evento.
    return { resultado, pagamentoId: pagamento.id, politicaSubstituida: congelada === null };
  }

  await gateway.reembolsar({
    transacaoId: pagamento.transacaoExternaId ?? pagamento.id,
    valorCentavos: paraCentavos(resultado.valor),
    // Estável por pagamento: reprocessar o mesmo reembolso não devolve duas
    // vezes (RN-014 aplicada ao caminho de saída do dinheiro).
    chaveIdempotencia: `refund:${pagamento.id}`,
    motivo: resultado.explicacao,
  });

  await cliente.pagamento.update({
    where: { id: pagamento.id },
    data: {
      // A faixa vem de `computeRefund`; aqui só se traduz em status.
      status: resultado.faixa === 'INTEGRAL' ? 'REEMBOLSADO' : 'REEMBOLSADO_PARCIAL',
      valorReembolsado: paraDecimal(resultado.valor),
    },
  });

  return { resultado, pagamentoId: pagamento.id, politicaSubstituida: congelada === null };
}
