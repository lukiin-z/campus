import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Logo } from './Logo';
import { useNotificacoes } from '../../hooks/useCampusData';
import { useSessionStore } from '../../store/session';

/**
 * Barra superior fixa. Fundo translúcido com desfoque, como no protótipo
 * original, mas com `shadow-sm` só quando há conteúdo rolado sob ela.
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
            to="/perfil"
            aria-label={
              naoLidas > 0
                ? `Perfil de ${sessao?.usuario.nome ?? 'você'}, ${naoLidas} avisos não lidos`
                : `Perfil de ${sessao?.usuario.nome ?? 'você'}`
            }
            className="relative flex min-h-touch min-w-touch items-center justify-center"
          >
            <Avatar
              nome={sessao?.usuario.nome ?? 'Você'}
              seed={sessao?.usuario.avatarSeed ?? 1}
              tamanho="sm"
            />
            {naoLidas > 0 && (
              <span className="absolute right-0 top-1 h-2 w-2 rounded-full bg-accent-strong" />
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
