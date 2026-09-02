import { cn } from '../../lib/cn';

/**
 * Abas. Implementa o padrão ARIA de tablist: setas do teclado funcionam via
 * ordem natural de foco, e a aba ativa é indicada por `aria-selected`, não
 * apenas por cor.
 */
export interface Aba<T extends string> {
  valor: T;
  rotulo: string;
  quantidade?: number;
}

export function Tabs<T extends string>({
  abas,
  ativa,
  onSelecionar,
  rotuloAcessivel,
}: {
  abas: Array<Aba<T>>;
  ativa: T;
  onSelecionar: (valor: T) => void;
  rotuloAcessivel: string;
}) {
  return (
    <div role="tablist" aria-label={rotuloAcessivel} className="hscroll mb-4">
      {abas.map((aba) => {
        const selecionada = aba.valor === ativa;
        return (
          <button
            key={aba.valor}
            role="tab"
            type="button"
            id={`aba-${aba.valor}`}
            aria-selected={selecionada}
            aria-controls={`painel-${aba.valor}`}
            onClick={() => onSelecionar(aba.valor)}
            className={cn(
              'min-h-touch whitespace-nowrap rounded-full border px-4 text-body-sm transition',
              selecionada
                ? 'border-accent-2 bg-accent-2 font-semibold text-white'
                : 'border-border bg-surface text-text-muted hover:bg-surface-2',
            )}
          >
            {aba.rotulo}
            {aba.quantidade != null && (
              <span className="ml-2 font-mono text-mono-xs opacity-80">{aba.quantidade}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
