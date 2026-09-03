import type {
  Pagamento as PagamentoLinha,
  Participacao as ParticipacaoLinha,
} from '@prisma/client';
import { gerarCobrancaPix, minutesLeftToPay, type PagamentoView } from '@campus/shared';
import { paraIsoOuNulo, paraPagamento, paraResumoCartao } from '../comum/mapeadores';

/**
 * `Pagamento` → `PagamentoView`.
 *
 * ## Por que o payload Pix NÃO é armazenado
 *
 * `gerarCobrancaPix` é determinística sobre (valor, referência, expiração):
 * recalcular devolve sempre o mesmo BR Code, com o mesmo CRC16. Guardar o QR
 * seria guardar dado derivado — e desalinhá-lo do valor na primeira alteração
 * de preço, produzindo um QR que cobra um valor que a tela não mostra.
 *
 * ## Por que o Pix aparece só em `AGUARDANDO`
 *
 * Mostrar o QR de uma cobrança já confirmada convida a pagar duas vezes. E numa
 * cobrança recusada, o QR seria um convite a pagar por uma vaga que já não é
 * mais da pessoa.
 *
 * Função livre, sem DI: é mapeamento puro sobre duas linhas que quem chama já
 * tem em mãos. Um serviço injetável aqui adicionaria um provider para não fazer
 * nada além disto.
 */
export function paraPagamentoView(
  pagamento: PagamentoLinha,
  participacao: Pick<ParticipacaoLinha, 'pagamentoExpiraEm'>,
  agora: Date = new Date(),
): PagamentoView {
  const base = paraPagamento(pagamento);

  const pix =
    pagamento.metodo === 'PIX' && pagamento.status === 'AGUARDANDO'
      ? gerarCobrancaPix({
          valor: base.valor,
          referencia: pagamento.participacaoId,
          expiraEm: paraIsoOuNulo(participacao.pagamentoExpiraEm) ?? base.criadoEm,
        })
      : null;

  return {
    ...base,
    pix,
    cartao: paraResumoCartao(pagamento),
    minutosRestantes: minutesLeftToPay(
      { pagamentoExpiraEm: paraIsoOuNulo(participacao.pagamentoExpiraEm) },
      agora,
    ),
  };
}
