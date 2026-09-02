import { Link } from 'react-router-dom';
import type { PublicacaoView } from '../../types/domain';
import { formatRelative } from '../../domain/format';
import { Avatar } from './Avatar';
import { EventCover } from './EventCover';

/**
 * Publicação do feed. Toda publicação pertence a um evento (RN-019) — o link
 * para o evento não é decoração: é o que dá contexto e o que sustenta a regra de
 * visibilidade herdada do alcance (RN-001).
 */
export function PostCard({ publicacao }: { publicacao: PublicacaoView }) {
  return (
    <article className="mb-4 overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-3 p-4">
        <Avatar nome={publicacao.autor.nome} seed={publicacao.autor.avatarSeed} tamanho="md" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-text">{publicacao.autor.nome}</p>
          <p className="font-mono text-mono-xs text-text-muted">
            {formatRelative(publicacao.criadoEm)}
          </p>
        </div>
      </header>

      <EventCover
        seed={publicacao.imagemSeed}
        titulo={publicacao.evento.titulo}
        altura="lg"
        className="rounded-none"
      />

      <div className="p-4">
        <p className="text-body-md text-text">{publicacao.legenda}</p>

        <Link
          to={`/eventos/${publicacao.evento.id}`}
          className="mt-3 inline-flex font-mono text-mono-sm text-accent-strong hover:text-accent-hover"
        >
          {publicacao.evento.titulo} →
        </Link>

        {publicacao.comentarios.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {publicacao.comentarios.map((comentario) => (
              <li key={comentario.id} className="flex gap-2 text-body-sm">
                <span className="font-semibold text-text">{comentario.autor.nome}</span>
                <span className="text-text-muted">{comentario.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
