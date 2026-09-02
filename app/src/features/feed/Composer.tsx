import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../hooks/useCampusData';
import { useEventosPublicaveis, usePublicar } from '../../hooks/useFeedSocial';
import { Button } from '../../components/ui/Button';
import { Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { LIMITES_FEED, estadoDaLegenda } from './limites';

/**
 * Publicação no feed (RF-036).
 *
 * O seletor de evento vem primeiro porque não existe publicação sem evento
 * (RN-019): a foto do churrasco pertence ao churrasco, e é isso que faz o alcance
 * da publicação ser herdado do alcance do evento (RN-001).
 *
 * Quando não há evento publicável, o composer é substituído por uma explicação —
 * não desaparece. Campo que some sem motivo é lido como bug; a pessoa procura o
 * botão de publicar e conclui que o app está quebrado.
 */
export function Composer({ eventoInicial }: { eventoInicial?: string | null }) {
  const eventos = useEventosPublicaveis();
  const publicar = usePublicar();
  const [escolhido, setEscolhido] = useState('');
  const [legenda, setLegenda] = useState('');

  const publicaveis = eventos.data ?? [];

  // Pré-seleção de `/?evento=<id>`: é por onde chega quem tocou em "Publicar
  // foto" no detalhe do evento. Derivada em vez de guardada em estado, para a
  // escolha manual do aluno sempre vencer o parâmetro da URL.
  const doLink =
    eventoInicial && publicaveis.some((evento) => evento.id === eventoInicial) ? eventoInicial : '';
  const eventoId = escolhido || doLink;

  const estado = estadoDaLegenda(legenda);
  const pronto = eventoId !== '' && estado.valido;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!pronto) return;
    publicar.mutate(
      { eventoId, legenda: legenda.trim() },
      {
        onSuccess: () => {
          setLegenda('');
          setEscolhido('');
        },
      },
    );
  }

  return (
    <section aria-labelledby="publicar-titulo" className="mb-8">
      <h2 id="publicar-titulo" className="mb-4 font-display text-display-sm font-bold text-text">
        Publicar no feed
      </h2>

      {eventos.isPending && <Skeleton className="h-24 w-full" />}

      {eventos.isError && (
        <ErrorState
          mensagem={mensagemDeErro(eventos.error)}
          onTentarDeNovo={() => void eventos.refetch()}
        />
      )}

      {eventos.data && publicaveis.length === 0 && (
        <EmptyState
          titulo="Nenhum evento seu para publicar"
          descricao="Só quem participou de um evento publica no feed dele — e quem organiza, no que organizou. Garanta sua vaga, faça o check-in na porta, e o evento aparece aqui."
          acao={
            <Link to="/eventos">
              <Button variant="ghost">Ver eventos</Button>
            </Link>
          }
        />
      )}

      {publicaveis.length > 0 && (
        <form onSubmit={enviar} className="rounded-lg border border-border bg-surface p-4">
          <Select
            rotulo="Evento"
            value={eventoId}
            onChange={(campo) => setEscolhido(campo.target.value)}
            opcoes={[
              { valor: '', texto: 'Escolha o evento' },
              ...publicaveis.map((evento) => ({ valor: evento.id, texto: evento.titulo })),
            ]}
          />

          <Textarea
            rotulo="Legenda"
            value={legenda}
            onChange={(campo) => setLegenda(campo.target.value)}
            maxLength={LIMITES_FEED.LEGENDA_MAX}
            placeholder="Como foi o evento?"
            dica={estado.dica}
            erro={estado.erro ?? undefined}
          />

          <Button type="submit" larguraTotal disabled={!pronto} carregando={publicar.isPending}>
            Publicar
          </Button>
        </form>
      )}
    </section>
  );
}
