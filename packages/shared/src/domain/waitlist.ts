import type { Evento, Participacao } from '../types';
import { HOUR_MS, MINUTE_MS, POLICY, toMs } from './policy';

/**
 * Lista de espera — RN-006, RN-007 e RN-008.
 *
 * É o coração do produto: a "vaga que evapora" descrita em
 * docs/01-problema-e-personas.md só deixa de evaporar por causa daqui.
 */

type FilaItem = Pick<Participacao, 'id' | 'usuarioId' | 'status' | 'posicaoFila' | 'criadoEm'>;

/** Fila em ordem FIFO. Empate de posição cai no instante de entrada. */
export function orderedWaitlist<T extends FilaItem>(participacoes: T[]): T[] {
  return participacoes
    .filter((p) => p.status === 'LISTA_ESPERA')
    .sort((a, b) => {
      const posA = a.posicaoFila ?? Number.MAX_SAFE_INTEGER;
      const posB = b.posicaoFila ?? Number.MAX_SAFE_INTEGER;
      if (posA !== posB) return posA - posB;
      return toMs(a.criadoEm) - toMs(b.criadoEm);
    });
}

export function waitlistSize(participacoes: FilaItem[]): number {
  return participacoes.filter((p) => p.status === 'LISTA_ESPERA').length;
}

/** RN-006 — quem entra agora vai para o fim da fila. */
export function nextWaitlistPosition(participacoes: FilaItem[]): number {
  const positions = participacoes
    .filter((p) => p.status === 'LISTA_ESPERA')
    .map((p) => p.posicaoFila ?? 0);
  return positions.length === 0 ? 1 : Math.max(...positions) + 1;
}

/**
 * RN-007, item 5 — a janela da oferta é truncada para `inicio - 1h`. Oferta que
 * expira depois do evento não serve para nada, e oferta curta demais não é
 * emitida: a vaga volta ao pool por ordem de chegada.
 */
export function offerDeadline(
  event: Pick<Evento, 'inicio'>,
  now: Date | string,
): { expiresAt: string; viable: boolean } {
  const nowMs = toMs(now);
  const natural = nowMs + POLICY.WAITLIST_OFFER_WINDOW_HOURS * HOUR_MS;
  const hardLimit = toMs(event.inicio) - HOUR_MS;
  const expiresAtMs = Math.min(natural, hardLimit);
  return {
    expiresAt: new Date(expiresAtMs).toISOString(),
    viable: expiresAtMs - nowMs >= POLICY.MIN_OFFER_WINDOW_MINUTES * MINUTE_MS,
  };
}

export type PromotionOutcome =
  | { tipo: 'FILA_VAZIA' }
  | { tipo: 'JANELA_INVIAVEL'; motivo: string }
  | { tipo: 'PROMOVER'; participacaoId: string; usuarioId: string; ofertaExpiraEm: string };

/**
 * RN-007 — decide o que fazer quando uma vaga é liberada.
 *
 * Função pura de decisão: não escreve nada. Quem aplica é o repositório (ou o
 * serviço de aplicação, no CP6), na mesma transação da liberação da vaga.
 * Apenas UMA oferta por vaga liberada — oferecer a mesma vaga a duas pessoas
 * recria o overbooking que RN-004 proíbe.
 */
export function planPromotion(
  event: Pick<Evento, 'inicio' | 'status'>,
  participacoes: FilaItem[],
  now: Date | string,
): PromotionOutcome {
  if (event.status !== 'PUBLICADO') return { tipo: 'FILA_VAZIA' };

  const fila = orderedWaitlist(participacoes);
  const primeiro = fila[0];
  if (!primeiro) return { tipo: 'FILA_VAZIA' };

  const { expiresAt, viable } = offerDeadline(event, now);
  if (!viable) {
    return {
      tipo: 'JANELA_INVIAVEL',
      motivo:
        'Falta pouco para o evento: a vaga volta a ficar disponível por ordem de chegada em vez de ser oferecida.',
    };
  }

  return {
    tipo: 'PROMOVER',
    participacaoId: primeiro.id,
    usuarioId: primeiro.usuarioId,
    ofertaExpiraEm: expiresAt,
  };
}

/**
 * RN-007, item 4 e RN-008 — recalcula as posições da fila depois de alguém sair
 * dela (por promoção, cancelamento ou expiração). Devolve só quem muda.
 */
export function recomputePositions(participacoes: FilaItem[]): Array<{
  id: string;
  posicaoFila: number;
}> {
  const fila = orderedWaitlist(participacoes);
  const mudancas: Array<{ id: string; posicaoFila: number }> = [];
  fila.forEach((item, index) => {
    const posicaoFila = index + 1;
    if (item.posicaoFila !== posicaoFila) mudancas.push({ id: item.id, posicaoFila });
  });
  return mudancas;
}

/** RN-008 — a oferta venceu e a vez passa ao próximo, sem punição. */
export function offerExpired(
  participacao: Pick<Participacao, 'status' | 'ofertaExpiraEm'>,
  now: Date | string,
): boolean {
  if (participacao.status !== 'OFERTA_PENDENTE' || !participacao.ofertaExpiraEm) return false;
  return toMs(now) > toMs(participacao.ofertaExpiraEm);
}

/** Texto da posição, no tom de voz da marca: número, não adjetivo. */
export function waitlistPositionLabel(posicao: number): string {
  return `Você é o ${posicao}º da fila`;
}
