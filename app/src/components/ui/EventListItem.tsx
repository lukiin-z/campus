import { Link } from 'react-router-dom';
import type { EventoView } from '../../types/domain';
import { formatDayMonth, formatTime } from '../../domain/format';
import { cn } from '../../lib/cn';
import { formatPrice } from '@campus/shared';

/**
 * Linha compacta da lista de eventos. Diferente do `TicketCard`, é otimizada
 * para varredura vertical: a coluna de data à esquerda alinha os dias em coluna,
 * o que só funciona porque a fonte de dados é monoespaçada.
 */
export function EventListItem({ evento, className }: { evento: EventoView; className?: string }) {
  const { dia, mes } = formatDayMonth(evento.inicio);
  const lotado = evento.vagasDisponiveis === 0;

  return (
    <Link
      to={`/eventos/${evento.id}`}
      data-testid={`evento-item-${evento.id}`}
      className={cn(
        'flex overflow-hidden rounded-lg border border-border bg-surface transition hover:border-neutral-300',
        evento.status === 'CANCELADO' && 'opacity-70',
        className,
      )}
    >
      <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center bg-surface-2 font-mono">
        <span className="text-display-md font-bold leading-none text-accent-strong">{dia}</span>
        <span className="mt-1 text-mono-xs uppercase text-text-muted">{mes}</span>
      </div>

      <div className="flex-1 px-4 py-3">
        <h3 className="font-display text-body-md font-bold text-text">{evento.titulo}</h3>
        <p className="mt-1 font-mono text-mono-sm text-text-muted">
          {formatTime(evento.inicio)} · {evento.local} · {formatPrice(evento.preco)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block rounded-full border border-border px-2 py-px font-mono text-mono-xs text-text-muted">
            {evento.alcanceRotulo}
          </span>
          <span className="font-mono text-mono-xs text-text-muted">
            {evento.status === 'CANCELADO'
              ? 'cancelado'
              : evento.status === 'REALIZADO'
                ? `realizado · ${evento.ocupadas} inscritos`
                : lotado
                  ? 'lista de espera'
                  : `${evento.vagasDisponiveis} vagas livres`}
          </span>
        </div>
      </div>
    </Link>
  );
}
