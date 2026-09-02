import type { AlcanceEvento, StatusEvento, StatusParticipacao } from '../../types/domain';
import { STATUS_PARTICIPACAO_ROTULO } from '../../domain/participation';
import { cn } from '../../lib/cn';

/**
 * Badge de alcance — o rótulo TEM texto, não só cor: é o que faz a interface
 * funcionar para quem não distingue coral de verde-azulado (WCAG 1.4.1) e em
 * impressão em preto e branco.
 */
const ALCANCE_CLASSES: Record<AlcanceEvento, string> = {
  TURMA: 'bg-accent-soft text-coral-700',
  CURSO: 'bg-accent-2-soft text-teal-600',
  FACULDADE: 'bg-neutral-200 text-neutral-700',
};

export function ScopeBadge({
  alcance,
  rotulo,
  className,
}: {
  alcance: AlcanceEvento;
  rotulo: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 font-mono text-mono-xs uppercase',
        ALCANCE_CLASSES[alcance],
        className,
      )}
    >
      {rotulo}
    </span>
  );
}

/** Estado da participação. Também sempre com texto. */
const STATUS_CLASSES: Record<StatusParticipacao, string> = {
  CONFIRMADA: 'bg-accent-2-soft text-teal-600',
  PRESENTE: 'bg-accent-2-soft text-teal-600',
  PENDENTE_PAGAMENTO: 'bg-accent-soft text-coral-700',
  OFERTA_PENDENTE: 'bg-accent-soft text-coral-700',
  LISTA_ESPERA: 'bg-neutral-200 text-neutral-700',
  AUSENTE: 'bg-neutral-200 text-neutral-700',
  CANCELADA: 'bg-neutral-100 text-text-muted',
  EXPIRADA: 'bg-neutral-100 text-text-muted',
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusParticipacao;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 font-mono text-mono-xs',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_PARTICIPACAO_ROTULO[status]}
    </span>
  );
}

/**
 * Estado do evento. Entrou no CP5 com a aba de organizados no perfil: até então
 * o único estado que a interface mostrava era o da participação, e o organizador
 * precisa distinguir rascunho de publicado de cancelado antes de abrir a porta.
 */
const STATUS_EVENTO_CLASSES: Record<StatusEvento, string> = {
  PUBLICADO: 'bg-accent-2-soft text-teal-600',
  REALIZADO: 'bg-neutral-200 text-neutral-700',
  EM_APROVACAO: 'bg-accent-soft text-coral-700',
  RASCUNHO: 'bg-neutral-100 text-text-muted',
  CANCELADO: 'bg-neutral-100 text-text-muted',
};

const STATUS_EVENTO_ROTULO: Record<StatusEvento, string> = {
  PUBLICADO: 'publicado',
  REALIZADO: 'realizado',
  EM_APROVACAO: 'em aprovação',
  RASCUNHO: 'rascunho',
  CANCELADO: 'cancelado',
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: StatusEvento;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 font-mono text-mono-xs',
        STATUS_EVENTO_CLASSES[status],
        className,
      )}
    >
      {STATUS_EVENTO_ROTULO[status]}
    </span>
  );
}
