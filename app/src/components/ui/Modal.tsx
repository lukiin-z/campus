import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Modal. Fecha por `Esc` e por clique fora, devolve o foco a quem o abriu, e o
 * conteúdo é rotulado por `aria-labelledby` — RNF-003.
 */
export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  acoes,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  acoes?: ReactNode;
}) {
  const conteudoRef = useRef<HTMLDivElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return undefined;

    focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    conteudoRef.current?.focus();

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoPressionar);

    return () => {
      document.removeEventListener('keydown', aoPressionar);
      focoAnteriorRef.current?.focus();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-neutral-900/40"
      />
      <div
        ref={conteudoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        className="relative z-10 w-full max-w-content rounded-t-xl bg-surface p-6 shadow-lg sm:rounded-xl"
      >
        <h2 id="modal-titulo" className="font-display text-display-md font-bold text-text">
          {titulo}
        </h2>
        <div className="mt-4 text-body-md text-text-muted">{children}</div>
        {acoes && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">{acoes}</div>
        )}
      </div>
    </div>
  );
}
