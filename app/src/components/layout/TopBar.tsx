import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Logo } from './Logo';
import { useNotificacoes } from '../../hooks/useCampusData';
import { useSessionStore } from '../../store/session';

/**
 * Barra superior fixa. Fundo translúcido com desfoque, como no protótipo
 * original, mas com `shadow-sm` só quando há conteúdo rolado sob ela.
 *
 * O sino tem destino próprio (`/notificacoes`) desde o CP5. Antes o contador de
 * não lidas ficava sobre o avatar, o que obrigava a passar pelo perfil para ler
 * um aviso — e o aviso que importa aqui é "sua vaga foi liberada", com prazo
 * correndo (RN-008).
 */
export function TopBar() {
  const sessao = useSessionStore((s) => s.sessao);
  const { data: notificacoes } = useNotificacoes();
  const naoLidas = notificacoes?.filter((n) => !n.lida).length ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-topbar max-w-content items-center justify-between px-5">
        <Link to="/" aria-label="Campus — ir para o início">
          <Logo />
        </Link>

        <nav aria-label="Atalhos" className="flex items-center gap-3">
          <Link
            to="/criar"
            className="flex min-h-touch items-center rounded-full bg-accent-strong px-4 font-display text-body-sm font-bold text-white transition hover:bg-accent-hover"
          >
            + Criar evento
          </Link>

          <Link
            to="/notificacoes"
            aria-label={naoLidas > 0 ? `Avisos, ${naoLidas} não lidos` : 'Avisos, nenhum não lido'}
            className="relative flex min-h-touch min-w-touch items-center justify-center rounded-full text-text-muted transition hover:bg-surface-2 hover:text-text"
          >
            <Sino />
            {naoLidas > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-2 h-2 w-2 rounded-full bg-accent-strong"
              />
            )}
          </Link>

          <Link
            to="/perfil"
            aria-label={`Perfil de ${sessao?.usuario.nome ?? 'você'}`}
            className="flex min-h-touch min-w-touch items-center justify-center"
          >
            <Avatar
              nome={sessao?.usuario.nome ?? 'Você'}
              seed={sessao?.usuario.avatarSeed ?? 1}
              tamanho="sm"
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Desenhado inline: um ícone só não justifica uma dependência de ícones. */
function Sino() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4c-.3-.4-.5-.9-.5-1.4V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
