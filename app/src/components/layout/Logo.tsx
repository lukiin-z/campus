/**
 * Símbolo da marca, embutido como SVG inline — o mesmo path de
 * docs/06-marca/assets/logo-simbolo.svg.
 *
 * Inline, e não `<img>`, por dois motivos: não faz requisição, e `currentColor`
 * funciona (permite a versão monocromática sobre fundo escuro).
 */
export function LogoSimbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Campus">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 5.5 4 H 18.5 A 3.5 3.5 0 0 1 22 7.5 V 9.8 A 2.2 2.2 0 0 0 22 14.2 V 16.5 A 3.5 3.5 0 0 1 18.5 20 H 5.5 A 3.5 3.5 0 0 1 2 16.5 V 14.2 A 2.2 2.2 0 0 0 2 9.8 V 7.5 A 3.5 3.5 0 0 1 5.5 4 Z M 15.21 15.83 A 5 5 0 1 1 15.21 8.17 L 13.54 10.16 A 2.4 2.4 0 1 0 13.54 13.84 Z"
      />
    </svg>
  );
}

/** Lockup: símbolo + wordmark. */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoSimbolo className="h-6 w-6 text-accent-strong" />
      <span className="font-display text-display-sm font-bold tracking-tight text-text">
        Campus
      </span>
    </span>
  );
}
