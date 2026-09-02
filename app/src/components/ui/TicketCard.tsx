import { Link } from 'react-router-dom';
import type { EventoView } from '../../types/domain';
import { formatEventDateTime } from '../../domain/format';
import { formatPrice } from '../../domain/payment';
import { ScopeBadge } from './Badge';
import { cn } from '../../lib/cn';

/**
 * TicketCard — o **elemento de assinatura da marca**.
 *
 * É o cartão-ingresso picotado: borda tracejada com dois recortes circulares
 * laterais (classe `.ticket-divider` em src/styles/index.css), imitando o
 * ingresso destacável. Ele existia no protótipo estático original e é a
 * continuidade visual que liga protótipo, Figma, styleguide e app.
 *
 * Variantes: por alcance (turma / curso / faculdade, via `ScopeBadge`) e por
 * preço (pago / gratuito). O estado do evento — lotado, cancelado, encerrado —
 * aparece como texto na linha inferior, nunca só como cor (WCAG 1.4.1).
 */
export function TicketCard({ evento, className }: { evento: EventoView; className?: string }) {
  const lotado = evento.vagasDisponiveis === 0;
  const cancelado = evento.status === 'CANCELADO';

  return (
    <Link
      to={`/eventos/${evento.id}`}
      data-testid={`ticket-${evento.id}`}
      aria-label={`${evento.titulo}, ${formatEventDateTime(evento.inicio)}, ${formatPrice(evento.preco)}`}
      className={cn(
        'block w-ticket flex-shrink-0 rounded-lg border border-border bg-surface p-4 transition hover:border-neutral-300',
        cancelado && 'opacity-70',
        className,
      )}
    >
      <ScopeBadge alcance={evento.alcance} rotulo={rotuloCurto(evento)} />

      <h3 className="mt-3 font-display text-display-sm font-bold leading-tight text-text">
        {evento.titulo}
      </h3>

      <p className="mt-2 font-mono text-mono-sm text-text-muted">
        {formatEventDateTime(evento.inicio)}
      </p>
      <p className="font-mono text-mono-sm text-text-muted">{evento.local}</p>

      {/* Aqui está o picote: a divisória tracejada com os dois recortes. */}
      <div className="ticket-divider" />

      <div className="flex items-baseline justify-between">
        <span className="font-mono text-body-sm font-medium text-accent-strong">
          {formatPrice(evento.preco)}
        </span>
        <span className="font-mono text-mono-sm text-text-muted">
          {cancelado
            ? 'cancelado'
            : lotado
              ? evento.totalListaEspera > 0
                ? `fila: ${evento.totalListaEspera}`
                : 'lista de espera'
              : `${evento.ocupadas}/${evento.capacidade} vagas`}
        </span>
      </div>
    </Link>
  );
}

function rotuloCurto(evento: EventoView): string {
  if (evento.alcance === 'TURMA') return evento.alcanceRotulo;
  if (evento.alcance === 'CURSO') return evento.alcanceRotulo.split(' ')[0] ?? 'curso';
  return 'faculdade';
}
