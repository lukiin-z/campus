import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PublicacaoView } from '../../types/domain';
import { useComentar } from '../../hooks/useFeedSocial';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { PostCard } from '../../components/ui/PostCard';
import { LIMITES_FEED, estadoDoComentario } from './limites';

/**
 * Publicação com comentários (RF-037 e RF-038).
 *
 * `PostCard` continua responsável por desenhar a publicação; aqui ficam só as
 * duas coisas que ele não faz por ser apresentacional: recortar a lista de
 * comentários e escrever um novo.
 */

/** Comentários visíveis antes de "ver todos". Dois cabem sem empurrar o feed. */
const PREVIA = 2;

export function PublicacaoCard({ publicacao }: { publicacao: PublicacaoView }) {
  const comentar = useComentar();
  const [expandido, setExpandido] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const campoRef = useRef<HTMLInputElement>(null);

  // Abrir o campo sem levar o foco obrigaria quem navega por teclado a
  // reencontrar o campo que ele mesmo acabou de pedir. `autoFocus` não serve:
  // ele foca na montagem da página, não na abertura do formulário.
  useEffect(() => {
    if (formularioAberto) campoRef.current?.focus();
  }, [formularioAberto]);

  const total = publicacao.comentarios.length;
  const visiveis = expandido ? publicacao.comentarios : publicacao.comentarios.slice(0, PREVIA);
  const estado = estadoDoComentario(texto);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!estado.valido) return;
    comentar.mutate(
      { publicacaoId: publicacao.id, texto: texto.trim() },
      {
        onSuccess: () => {
          setTexto('');
          setFormularioAberto(false);
          // O comentário novo entra no fim da lista: sem expandir, a pessoa
          // publicaria e não veria o próprio texto.
          setExpandido(true);
        },
      },
    );
  }

  return (
    <div className="mb-6">
      {/* Cópia com a lista recortada: o recorte é decisão desta tela, e o
          componente de design system renderiza o que recebe. */}
      <PostCard publicacao={{ ...publicacao, comentarios: visiveis }} />

      <div className="flex flex-wrap items-center gap-4 px-4">
        {total > PREVIA && (
          <button
            type="button"
            onClick={() => setExpandido((atual) => !atual)}
            aria-expanded={expandido}
            className="min-h-touch font-mono text-mono-sm text-accent-strong hover:text-accent-hover"
          >
            {expandido ? 'ver menos' : `ver todos os ${total} comentários`}
          </button>
        )}

        {!formularioAberto && (
          <button
            type="button"
            onClick={() => setFormularioAberto(true)}
            className="min-h-touch font-mono text-mono-sm text-text-muted hover:text-text"
          >
            {total === 0 ? 'comentar' : 'comentar também'}
          </button>
        )}
      </div>

      {formularioAberto && (
        <form onSubmit={enviar} className="mt-3 px-4">
          <Input
            ref={campoRef}
            rotulo="Seu comentário"
            value={texto}
            onChange={(campo) => setTexto(campo.target.value)}
            maxLength={LIMITES_FEED.COMENTARIO_MAX}
            placeholder="Escreva algo sobre a foto"
            dica={estado.dica}
            erro={estado.erro ?? undefined}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={!estado.valido} carregando={comentar.isPending}>
              Comentar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFormularioAberto(false);
                setTexto('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
