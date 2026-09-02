import type { Evento, StatusParticipacao } from '../types';
import { POLICY } from './policy';

/**
 * Capacidade e vagas — RN-004 e RN-005.
 * A regra que este módulo protege: `ocupadas <= capacidade`, sempre.
 */

/**
 * Estados que ocupam vaga. `PENDENTE_PAGAMENTO` ocupa de propósito: reservar sem
 * segurar a vaga permitiria vender a mesma vaga duas vezes. `OFERTA_PENDENTE`
 * também ocupa, porque a vaga fica reservada para quem recebeu a oferta (RN-007).
 */
const OCCUPYING: readonly StatusParticipacao[] = [
  'PENDENTE_PAGAMENTO',
  'CONFIRMADA',
  'OFERTA_PENDENTE',
  'PRESENTE',
];

export function occupiesSpot(status: StatusParticipacao): boolean {
  return OCCUPYING.includes(status);
}

export function availableSpots(event: Pick<Evento, 'capacidade' | 'ocupadas'>): number {
  return Math.max(0, event.capacidade - event.ocupadas);
}

export function isFull(event: Pick<Evento, 'capacidade' | 'ocupadas'>): boolean {
  return availableSpots(event) === 0;
}

/** Fração de 0 a 1. Usada pela barra de vagas. */
export function occupancyRate(event: Pick<Evento, 'capacidade' | 'ocupadas'>): number {
  if (event.capacidade <= 0) return 0;
  return Math.min(1, event.ocupadas / event.capacidade);
}

/** Capacidade válida na criação e na edição (RN-011). */
export function isValidCapacity(capacity: number): boolean {
  return (
    Number.isInteger(capacity) && capacity >= POLICY.MIN_CAPACITY && capacity <= POLICY.MAX_CAPACITY
  );
}

/**
 * RN-005 — capacidade aumenta livremente, mas só diminui até `ocupadas`.
 * Nunca se remove participação já aceita para caber na nova capacidade.
 */
export function canChangeCapacity(
  event: Pick<Evento, 'capacidade' | 'ocupadas'>,
  newCapacity: number,
): { allowed: boolean; reason?: string } {
  if (!isValidCapacity(newCapacity)) {
    return {
      allowed: false,
      reason: `A capacidade precisa ser um número inteiro entre ${POLICY.MIN_CAPACITY} e ${POLICY.MAX_CAPACITY}.`,
    };
  }
  if (newCapacity < event.ocupadas) {
    return {
      allowed: false,
      reason: `Já há ${event.ocupadas} vagas ocupadas. A capacidade não pode ficar abaixo disso.`,
    };
  }
  return { allowed: true };
}

/** Quantas vagas o aumento de capacidade abriu — cada uma dispara uma promoção. */
export function spotsOpenedByCapacityChange(previous: number, next: number): number {
  return Math.max(0, next - previous);
}
