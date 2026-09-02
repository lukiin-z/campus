import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ativo?: boolean;
  children: string;
}

/**
 * Filtro clicável. O estado ativo é indicado por cor **e** por `aria-pressed`:
 * estado nunca é só cor (WCAG 1.4.1).
 */
export function Chip({ ativo = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      className={cn(
        'min-h-touch whitespace-nowrap rounded-full border px-4 font-mono text-mono-sm transition',
        ativo
          ? 'border-neutral-900 bg-neutral-900 font-medium text-white'
          : 'border-border bg-surface text-text-muted hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
