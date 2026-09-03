import { availableSpots, planPromotion, recomputePositions } from '@campus/shared';
import { avisar, avisoDeVagaLiberada } from './avisos';
import { paraEvento, paraParticipacao } from './mapeadores';
import type { ClienteBanco } from './travas';

/**
 * Oferecer a vaga liberada ao primeiro da fila — RN-007.
 *
 * ## Por que é uma função só, e por que ela mora aqui
 *
 * Três caminhos liberam vaga: o aluno cancela (`DELETE /participacoes/:id`), o
 * prazo de pagamento vence (RN-012) e a oferta anterior expira (RN-008). No CP5
 * a sequência estava escrita duas vezes — no handler de cancelamento e no
 * módulo de expiração — e as duas cópias já divergiam em um detalhe: uma
 * recompunha as posições da fila depois de promover, a outra não.
 *
 * A sequência é: recompor posições → consultar `planPromotion` → aplicar →
 * recompor de novo. O segundo recálculo não é redundância: promover tira alguém
 * da fila, e quem ficou atrás anda uma posição.
 *
 * **Quem decide é `planPromotion`.** Esta função não escolhe ninguém, não
 * calcula janela e não sabe o que é FIFO: ela busca o estado, chama a decisão e
 * persiste. Uma segunda cópia de `planPromotion` no servidor divergiria da do
 * front na primeira correção feita só de um lado.
 *
 * O chamador tem de estar em transação **com a linha do evento travada**: esta
 * função incrementa `ocupadas`, e incrementar sem trava é o overbooking de
 * RN-004 por outra porta.
 *
 * @returns o `usuarioId` de quem recebeu a oferta, ou `null` se ninguém recebeu.
 */
export async function reoferecerVaga(
  cliente: ClienteBanco,
  eventoId: string,
  agora: Date,
): Promise<string | null> {
  const linha = await cliente.evento.findUnique({ where: { id: eventoId } });
  if (!linha) return null;
  const evento = paraEvento(linha);

  /*
   * Sem vaga livre não há o que oferecer. A verificação existe porque promover
   * volta a ocupar a vaga: chamada duas vezes para a mesma vaga liberada, a
   * segunda passaria `ocupadas` de `capacidade` e o `CHECK` do banco
   * derrubaria a transação inteira — inclusive o cancelamento que a originou.
   */
  if (availableSpots(evento) === 0) return null;

  await recomporFila(cliente, eventoId);

  const participacoes = await carregarFila(cliente, eventoId);
  const plano = planPromotion(evento, participacoes, agora);
  if (plano.tipo !== 'PROMOVER') return null;

  await cliente.participacao.update({
    where: { id: plano.participacaoId },
    data: {
      status: 'OFERTA_PENDENTE',
      ofertaExpiraEm: new Date(plano.ofertaExpiraEm),
      // Quem tem oferta não está mais na fila: `posicao_fila` só existe em
      // `LISTA_ESPERA` (`ck_participacao_fila_tem_posicao`).
      posicaoFila: null,
    },
  });

  // A vaga fica reservada para quem recebeu a oferta enquanto a janela corre.
  await cliente.evento.update({
    where: { id: eventoId },
    data: { ocupadas: { increment: 1 } },
  });

  await recomporFila(cliente, eventoId);
  await avisar(cliente, avisoDeVagaLiberada(plano.usuarioId, evento));

  return plano.usuarioId;
}

/** RN-007, item 4 e RN-008 — a fila anda quando alguém sai dela. */
export async function recomporFila(cliente: ClienteBanco, eventoId: string): Promise<void> {
  const participacoes = await carregarFila(cliente, eventoId);

  // `recomputePositions` devolve só quem muda — então o número de `UPDATE` é o
  // número de pessoas que realmente andaram, não o tamanho da fila.
  for (const mudanca of recomputePositions(participacoes)) {
    await cliente.participacao.update({
      where: { id: mudanca.id },
      data: { posicaoFila: mudanca.posicaoFila },
    });
  }
}

/**
 * A fila do evento no formato que o domínio consome.
 *
 * Traz todas as participações, não só as `LISTA_ESPERA`: `orderedWaitlist` e
 * `waitlistSize` filtram por status por conta própria, e passar a lista
 * completa é o que permite `planPromotion` decidir sem uma segunda consulta.
 */
async function carregarFila(cliente: ClienteBanco, eventoId: string) {
  const linhas = await cliente.participacao.findMany({
    where: { eventoId },
    orderBy: { criadoEm: 'asc' },
  });
  return linhas.map(paraParticipacao);
}
