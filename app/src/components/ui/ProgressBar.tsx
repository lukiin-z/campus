/* eslint-disable no-restricted-syntax -- Única exceção ao "sem estilo inline" do
   design system, e ela é deliberada: a largura do preenchimento é DADO (a
   proporção de vagas ocupadas), não decisão de estilo. Quantizar em classes
   utilitárias (w-1/4, w-1/2...) mentiria sobre a ocupação real: 39/40
   apareceria como 100%. */
import { cn } from '../../lib/cn';

/**
 * Barra de proporção. O número acompanha a barra sempre — "18/40 vagas", nunca
 * só a barra: informação não é transmitida apenas por representação visual
 * (WCAG 1.4.1). O preenchimento usa `accent-strong`, que dá 4,10:1 sobre a
 * trilha `neutral-200` (WCAG 1.4.11).
 *
 * `unidade` existe porque a barra deixou de medir só vaga: no painel de
 * check-in ela mede presentes sobre confirmados, e o rótulo cravado em "vagas"
 * dizia — inclusive no `aria-label` — algo que o número não significava.
 */
export function ProgressBar({
  ocupadas,
  capacidade,
  rotuloDireita,
  unidade = 'vagas',
  verboAcessivel = 'preenchidas',
  className,
}: {
  ocupadas: number;
  capacidade: number;
  rotuloDireita?: string;
  unidade?: string;
  verboAcessivel?: string;
  className?: string;
}) {
  const percentual = capacidade > 0 ? Math.min(100, Math.round((ocupadas / capacidade) * 100)) : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between font-mono text-mono-sm text-text-muted">
        <span>
          {ocupadas}/{capacidade} {unidade}
        </span>
        {rotuloDireita && <span>{rotuloDireita}</span>}
      </div>
      <div
        role="progressbar"
        aria-valuenow={ocupadas}
        aria-valuemin={0}
        aria-valuemax={capacidade}
        aria-label={`${ocupadas} de ${capacidade} ${unidade} ${verboAcessivel}`}
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className="h-full rounded-full bg-accent-strong transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
