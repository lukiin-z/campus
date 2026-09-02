import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Estado vazio. Diz o que aconteceu e o que fazer — nunca só "nada aqui".
 * Ver microcópia em docs/06-marca/identidade-visual.md, seção 7.
 */
export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <p className="font-display text-display-sm font-bold text-text">{titulo}</p>
      <p className="mx-auto mt-2 max-w-content text-body-sm text-text-muted">{descricao}</p>
      {acao && <div className="mt-6 flex justify-center">{acao}</div>}
    </div>
  );
}

/**
 * Esqueleto de carregamento. Existe porque a camada de dados fala HTTP de
 * verdade desde o CP4 (ADR-0003): há estado de carregamento para exercitar.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-skeleton rounded-md bg-surface-2', className)} />
  );
}

export function SkeletonLista({ itens = 3 }: { itens?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-3">
      {Array.from({ length: itens }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-14 w-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Erro de carregamento com ação de recuperação. */
export function ErrorState({
  mensagem,
  onTentarDeNovo,
}: {
  mensagem: string;
  onTentarDeNovo?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-surface p-6 text-center">
      <p className="font-display text-display-sm font-bold text-text">Não carregou</p>
      <p className="mt-2 text-body-sm text-text-muted">{mensagem}</p>
      {onTentarDeNovo && (
        <button
          type="button"
          onClick={onTentarDeNovo}
          className="mt-4 min-h-touch rounded-md border border-border px-5 font-display text-display-sm font-bold text-text hover:bg-surface-2"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
