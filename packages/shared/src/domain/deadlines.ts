import type { Evento } from '../types';
import { HOUR_MS, POLICY, toMs } from './policy';

/**
 * Prazos — RN-009, RN-010 e RN-011.
 *
 * Todas as funções recebem `now` explicitamente. Nenhuma lê o relógio por conta
 * própria: é o que torna o comportamento testável sem falsear o tempo global.
 */

/** RN-009 — o prazo de inscrição limita entrada, inclusive na fila de espera. */
export function enrollmentOpen(
  event: Pick<Evento, 'prazoInscricao' | 'status'>,
  now: Date | string,
): boolean {
  if (event.status !== 'PUBLICADO') return false;
  return toMs(now) <= toMs(event.prazoInscricao);
}

/** RN-010 — antes do prazo, cancelar é livre e pode gerar reembolso. */
export function withinCancellationWindow(
  event: Pick<Evento, 'prazoCancelamento'>,
  now: Date | string,
): boolean {
  return toMs(now) <= toMs(event.prazoCancelamento);
}

/** RN-017 — janela em que o check-in é aceito. */
export function checkInWindow(event: Pick<Evento, 'inicio' | 'fim'>): {
  opensAt: number;
  closesAt: number;
} {
  return {
    opensAt: toMs(event.inicio) - POLICY.CHECKIN_OPENS_HOURS_BEFORE * HOUR_MS,
    closesAt: toMs(event.fim) + POLICY.CHECKIN_CLOSES_HOURS_AFTER * HOUR_MS,
  };
}

export function checkInOpen(event: Pick<Evento, 'inicio' | 'fim'>, now: Date | string): boolean {
  const { opensAt, closesAt } = checkInWindow(event);
  const t = toMs(now);
  return t >= opensAt && t <= closesAt;
}

/** Um evento passa a `REALIZADO` sozinho quando a janela de check-in fecha. */
export function shouldBeConcluded(
  event: Pick<Evento, 'inicio' | 'fim' | 'status'>,
  now: Date | string,
): boolean {
  if (event.status !== 'PUBLICADO') return false;
  return toMs(now) > checkInWindow(event).closesAt;
}

export interface DeadlineViolation {
  field: 'inicio' | 'fim' | 'prazoInscricao' | 'prazoCancelamento';
  message: string;
}

/**
 * RN-011 — coerência entre os prazos. Devolve a lista de violações em vez de um
 * booleano, porque o formulário precisa dizer *qual* regra falhou (UC-001, E2).
 */
export function validateDeadlines(
  input: Pick<Evento, 'inicio' | 'fim' | 'prazoInscricao' | 'prazoCancelamento'>,
  now: Date | string,
  options: { allowPast?: boolean } = {},
): DeadlineViolation[] {
  const violations: DeadlineViolation[] = [];
  const start = toMs(input.inicio);
  const end = toMs(input.fim);
  const enrollment = toMs(input.prazoInscricao);
  const cancellation = toMs(input.prazoCancelamento);

  if (!options.allowPast && start <= toMs(now)) {
    violations.push({ field: 'inicio', message: 'Escolha uma data e hora futuras.' });
  }
  if (end <= start) {
    violations.push({ field: 'fim', message: 'O fim do evento tem de ser depois do início.' });
  }
  if (end - start > POLICY.MAX_EVENT_DURATION_DAYS * 24 * HOUR_MS) {
    violations.push({
      field: 'fim',
      message: `Um evento não pode durar mais de ${POLICY.MAX_EVENT_DURATION_DAYS} dias.`,
    });
  }
  if (enrollment > start) {
    violations.push({
      field: 'prazoInscricao',
      message: 'O prazo de inscrição não pode ser depois do início do evento.',
    });
  }
  if (cancellation > start) {
    violations.push({
      field: 'prazoCancelamento',
      message: 'O prazo de cancelamento não pode ser depois do início do evento.',
    });
  }
  return violations;
}

/** Prazos sugeridos pelo formulário quando o organizador não informa. */
export function defaultDeadlines(inicio: string): {
  prazoInscricao: string;
  prazoCancelamento: string;
} {
  const start = toMs(inicio);
  return {
    prazoInscricao: new Date(
      start - POLICY.DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE * HOUR_MS,
    ).toISOString(),
    prazoCancelamento: new Date(
      start - POLICY.DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE * HOUR_MS,
    ).toISOString(),
  };
}
