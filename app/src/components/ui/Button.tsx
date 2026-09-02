import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  carregando?: boolean;
  larguraTotal?: boolean;
  children: ReactNode;
}

/**
 * Ação. Uma ação primária por tela — é princípio do design system, não estilo.
 *
 * O preenchimento primário usa `accent-strong` (#C83A16), não o coral da marca:
 * branco sobre #E8542E dá 3,66:1 e reprova AA. Ver a auditoria em
 * docs/06-marca/identidade-visual.md, seção 4.
 */
const VARIANTES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-strong text-white hover:bg-accent-hover active:bg-accent-hover disabled:bg-neutral-300 disabled:text-text-disabled',
  secondary:
    'bg-accent-2 text-white hover:bg-accent-2-hover active:bg-accent-2-hover disabled:bg-neutral-300 disabled:text-text-disabled',
  ghost:
    'bg-surface text-text border border-border hover:bg-surface-2 disabled:text-text-disabled disabled:bg-surface',
  danger:
    'bg-danger text-white hover:bg-coral-900 disabled:bg-neutral-300 disabled:text-text-disabled',
};

const TAMANHOS: Record<ButtonSize, string> = {
  md: 'min-h-touch px-5 py-3 text-display-sm rounded-md',
  lg: 'min-h-touch px-6 py-4 text-display-sm rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  carregando = false,
  larguraTotal = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display font-bold transition',
        'disabled:cursor-not-allowed',
        VARIANTES[variant],
        TAMANHOS[size],
        larguraTotal && 'w-full',
        className,
      )}
      {...props}
    >
      {carregando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-skeleton rounded-full border-2 border-white border-t-transparent"
        />
      )}
      <span>{carregando ? 'Aguarde…' : children}</span>
    </button>
  );
}
