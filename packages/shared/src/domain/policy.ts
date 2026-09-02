/**
 * Parâmetros do domínio — o ÚNICO lugar do código com estes números.
 *
 * Nenhum módulo de domínio e nenhum componente carrega `60`, `24` ou `0.5`
 * literalmente. Mudar uma política é editar este arquivo, e os testes que
 * dependem dela apontam para a mesma fonte.
 *
 * Ver docs/04-regras-de-negocio.md, seção "Parâmetros do domínio".
 */

export const POLICY = {
  /** RN-012 — janela para pagar após reservar a vaga. */
  PAYMENT_WINDOW_MINUTES: 60,
  /** RN-007 — janela para confirmar uma vaga oferecida pela lista de espera. */
  WAITLIST_OFFER_WINDOW_HOURS: 24,
  /** RN-007 — oferta mais curta que isto não é emitida; a vaga volta ao pool. */
  MIN_OFFER_WINDOW_MINUTES: 15,
  /** RN-013 — antecedência para reembolso integral. */
  FULL_REFUND_DAYS_BEFORE: 7,
  /** RN-013 — antecedência para reembolso parcial. */
  PARTIAL_REFUND_HOURS_BEFORE: 48,
  /** RN-013 — percentual devolvido na faixa parcial. */
  PARTIAL_REFUND_RATE: 0.5,
  /** RN-017 — check-in abre esta quantidade de horas antes do início. */
  CHECKIN_OPENS_HOURS_BEFORE: 4,
  /** RN-017 — check-in encerra esta quantidade de horas após o fim. */
  CHECKIN_CLOSES_HOURS_AFTER: 2,
  /** RN-025 — perguntas customizadas por evento. */
  MAX_CUSTOM_QUESTIONS: 5,
  /** RN-004 / RN-011 — faixa de capacidade. */
  MIN_CAPACITY: 2,
  MAX_CAPACITY: 2000,
  /**
   * Teto do preço de inscrição.
   *
   * Entrou na política no CP6 porque o número estava escrito à mão em DOIS
   * schemas — o do formulário (`app/src/domain/eventSchema.ts`) e o do corpo da
   * API (`schemas.ts`). Dois literais iguais hoje são dois literais diferentes
   * depois da primeira mudança feita só de um lado.
   */
  MAX_PRICE: 5000,
  /** RN-011 — duração máxima de um evento. */
  MAX_EVENT_DURATION_DAYS: 7,
  /** RN-009 — padrão do prazo de inscrição, se o organizador não informar. */
  DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE: 2,
  /** RN-010 — padrão do prazo de cancelamento. */
  DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE: 24,
} as const;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Converte para epoch em ms. Aceita `Date` ou ISO 8601. */
export function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Soma minutos a um instante e devolve ISO 8601. */
export function addMinutes(value: string | Date, minutes: number): string {
  return new Date(toMs(value) + minutes * MINUTE_MS).toISOString();
}

/** Soma horas a um instante e devolve ISO 8601. */
export function addHours(value: string | Date, hours: number): string {
  return new Date(toMs(value) + hours * HOUR_MS).toISOString();
}
