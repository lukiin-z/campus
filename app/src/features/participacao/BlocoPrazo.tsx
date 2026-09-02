import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { formatarRestante, formatarRestanteEmMinutos } from './tempo';
import { useContagemRegressiva } from './useContagemRegressiva';

/**
 * Prazo em destaque, com contagem regressiva e o que acontece quando ele passa.
 *
 * Duas versões do mesmo número, de propósito: a visível conta de segundo em
 * segundo, e a anunciada ao leitor de tela muda de minuto em minuto dentro de
 * uma região `aria-live="polite"`. Região viva que muda a cada segundo
 * transforma o leitor de tela em metrônomo e inutiliza a tela — o oposto do que
 * RNF-003 pede.
 *
 * A explicação do vencimento aparece ANTES de vencer. É a diferença entre
 * "perdi a vaga e não sei por quê" e "eu sabia o que ia acontecer".
 */
export function BlocoPrazo({
  titulo,
  expiraEm,
  explicacao,
  aoExpirar,
  children,
}: {
  titulo: string;
  expiraEm: string;
  explicacao: string;
  /** Disparado uma vez na virada do prazo — normalmente para recarregar o dado. */
  aoExpirar?: () => void;
  children?: ReactNode;
}) {
  const tituloId = useId();
  const { restanteMs, expirado } = useContagemRegressiva(expiraEm);

  // A função de callback muda de identidade a cada render do pai; guardá-la em
  // ref é o que impede o efeito de virar laço de recarregamento.
  const aoExpirarRef = useRef(aoExpirar);
  useEffect(() => {
    aoExpirarRef.current = aoExpirar;
  }, [aoExpirar]);

  useEffect(() => {
    if (expirado) aoExpirarRef.current?.();
  }, [expirado]);

  return (
    <section
      aria-labelledby={tituloId}
      className="mt-5 rounded-lg border-2 border-accent-strong bg-accent-soft p-4"
    >
      <h2 id={tituloId} className="font-display text-display-sm font-bold text-coral-800">
        {expirado ? 'O prazo terminou' : titulo}
      </h2>

      {!expirado && (
        <p aria-hidden="true" className="mt-2 font-mono text-display-lg font-bold text-coral-800">
          {formatarRestante(restanteMs)}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {expirado ? 'O prazo terminou.' : formatarRestanteEmMinutos(restanteMs)}
      </p>

      <p className="mt-2 text-body-sm text-coral-800">{explicacao}</p>

      {/* Ação escondida depois do vencimento: botão que o servidor vai recusar
          é pior do que botão ausente. */}
      {children && !expirado && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">{children}</div>
      )}
    </section>
  );
}
