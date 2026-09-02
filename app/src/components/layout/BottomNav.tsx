import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';

/**
 * Navegação inferior. O app é mobile: o destino principal fica ao alcance do
 * polegar. `aria-current="page"` marca o destino ativo — não é só a cor que
 * indica onde a pessoa está.
 */
const DESTINOS = [
  { para: '/', rotulo: 'Início', icone: 'inicio' },
  { para: '/eventos', rotulo: 'Eventos', icone: 'eventos' },
  { para: '/criar', rotulo: 'Criar', icone: 'criar' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur"
    >
      <ul className="mx-auto flex h-bottomnav max-w-content items-stretch">
        {DESTINOS.map((destino) => (
          <li key={destino.para} className="flex-1">
            <NavLink
              to={destino.para}
              end={destino.para === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-mono-xs font-mono transition',
                  isActive ? 'text-accent-strong' : 'text-text-muted hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icone nome={destino.icone} ativo={isActive} />
                  <span>{destino.rotulo}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Ícones desenhados à mão em SVG: sem biblioteca de ícones para 4 formas, e o
 * `aria-hidden` evita que o leitor de tela leia duas vezes (o rótulo textual já
 * está ao lado — RNF-004).
 */
function Icone({ nome, ativo }: { nome: string; ativo: boolean }) {
  const traco = ativo ? 2.2 : 1.8;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      {nome === 'inicio' && (
        <path
          d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"
          stroke="currentColor"
          strokeWidth={traco}
          strokeLinejoin="round"
        />
      )}
      {nome === 'eventos' && (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth={traco}
          />
          <path
            d="M3 10h18M8 3v4M16 3v4"
            stroke="currentColor"
            strokeWidth={traco}
            strokeLinecap="round"
          />
        </>
      )}
      {nome === 'criar' && (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={traco} />
          <path
            d="M12 8v8M8 12h8"
            stroke="currentColor"
            strokeWidth={traco}
            strokeLinecap="round"
          />
        </>
      )}
      {nome === 'perfil' && (
        <>
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth={traco} />
          <path
            d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
            stroke="currentColor"
            strokeWidth={traco}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
