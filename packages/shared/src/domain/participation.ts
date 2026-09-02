import type { Participacao, StatusParticipacao } from '../types';

/**
 * Ciclo de vida de `Participacao` — a tabela de transições permitidas do
 * diagrama de estados (docs/05-modelagem/06-diagrama-estados.md).
 *
 * O que este módulo garante é sobretudo o que ele PROIBE: as 8 transições
 * inexistentes documentadas naquele diagrama. O teste CT-029 tenta cada uma e
 * espera recusa.
 */

const ACTIVE: readonly StatusParticipacao[] = [
  'PENDENTE_PAGAMENTO',
  'CONFIRMADA',
  'LISTA_ESPERA',
  'OFERTA_PENDENTE',
  'PRESENTE',
];

const TERMINAL: readonly StatusParticipacao[] = ['CANCELADA', 'EXPIRADA', 'AUSENTE'];

/** RN-015 — só um estado ativo por (aluno, evento) ao mesmo tempo. */
export function isActive(status: StatusParticipacao): boolean {
  return ACTIVE.includes(status);
}

export function isTerminal(status: StatusParticipacao): boolean {
  return TERMINAL.includes(status);
}

/**
 * Transições permitidas. Ausência aqui é proibição explícita — ver a seção
 * "Transições proibidas (e por quê)" do diagrama de estados.
 *
 * `PRESENTE` não aparece como origem porque é terminal e blindado: nem o
 * cancelamento do evento reverte presença (RN-022).
 */
const ALLOWED: Readonly<Record<StatusParticipacao, readonly StatusParticipacao[]>> = {
  PENDENTE_PAGAMENTO: ['CONFIRMADA', 'EXPIRADA', 'CANCELADA'],
  LISTA_ESPERA: ['OFERTA_PENDENTE', 'CANCELADA'],
  OFERTA_PENDENTE: ['CONFIRMADA', 'PENDENTE_PAGAMENTO', 'EXPIRADA', 'CANCELADA'],
  CONFIRMADA: ['PRESENTE', 'AUSENTE', 'CANCELADA'],
  PRESENTE: [],
  AUSENTE: [],
  CANCELADA: [],
  EXPIRADA: [],
};

export function canTransition(from: StatusParticipacao, to: StatusParticipacao): boolean {
  return ALLOWED[from].includes(to);
}

export function allowedTransitions(from: StatusParticipacao): readonly StatusParticipacao[] {
  return ALLOWED[from];
}

/** Rótulo em português para a UI. Ver tom de voz em docs/06-marca. */
export const STATUS_PARTICIPACAO_ROTULO: Readonly<Record<StatusParticipacao, string>> = {
  PENDENTE_PAGAMENTO: 'aguardando pagamento',
  CONFIRMADA: 'confirmado',
  LISTA_ESPERA: 'lista de espera',
  OFERTA_PENDENTE: 'vaga liberada',
  PRESENTE: 'presente',
  AUSENTE: 'ausente',
  CANCELADA: 'cancelado',
  EXPIRADA: 'expirado',
};

/** RN-016 — criar evento não inscreve o organizador. */
export function organizerIsParticipant(
  organizadorId: string,
  participacoes: Pick<Participacao, 'usuarioId' | 'status'>[],
): boolean {
  return participacoes.some((p) => p.usuarioId === organizadorId && isActive(p.status));
}

/** RN-015 — encontra a participação ativa de um aluno em um evento, se existir. */
export function findActiveParticipation<T extends Pick<Participacao, 'usuarioId' | 'status'>>(
  participacoes: T[],
  usuarioId: string,
): T | null {
  return participacoes.find((p) => p.usuarioId === usuarioId && isActive(p.status)) ?? null;
}
