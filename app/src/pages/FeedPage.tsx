import { Link } from 'react-router-dom';
import { useDestaques, useFeed, mensagemDeErro } from '../hooks/useCampusData';
import { useSessionStore } from '../store/session';
import { TicketCard } from '../components/ui/TicketCard';
import { PostCard } from '../components/ui/PostCard';
import { EmptyState, ErrorState, Skeleton, SkeletonLista } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';

/**
 * Feed — tela inicial (RF-036).
 *
 * Ordem deliberada: saudação, faixa de ingressos em destaque, e só então as
 * publicações. A persona Marina decide em menos de um minuto na fila do
 * bandejão: o que é acionável (evento com vaga) vem antes do que é memória
 * (foto de evento passado).
 */
export function FeedPage() {
  const sessao = useSessionStore((s) => s.sessao);
  const destaques = useDestaques();
  const feed = useFeed();

  const primeiroNome = sessao?.usuario.nome.split(' ')[0] ?? '';

  return (
    <div>
      <header className="mb-6">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">
          {sessao?.curso?.nome ?? 'Campus'}
          {sessao?.turma ? ` · turma ${sessao.turma.nome}` : ''}
        </p>
        <h1 className="mt-1 font-display text-display-xl font-bold text-text">
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </h1>
      </header>

      <section aria-labelledby="destaques-titulo" className="mb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="destaques-titulo" className="font-display text-display-sm font-bold text-text">
            Em destaque
          </h2>
          <Link
            to="/eventos"
            className="font-mono text-mono-sm text-accent-strong hover:text-accent-hover"
          >
            ver tudo
          </Link>
        </div>

        {destaques.isPending && (
          <div className="hscroll" role="status" aria-label="Carregando eventos">
            <Skeleton className="h-48 w-64 flex-shrink-0" />
            <Skeleton className="h-48 w-64 flex-shrink-0" />
          </div>
        )}

        {destaques.isError && (
          <ErrorState
            mensagem={mensagemDeErro(destaques.error)}
            onTentarDeNovo={() => void destaques.refetch()}
          />
        )}

        {destaques.data && destaques.data.length === 0 && (
          <EmptyState
            titulo="Nenhum evento no seu alcance"
            descricao="Quando alguém da sua turma, do seu curso ou da faculdade publicar um evento, ele aparece aqui. Que tal criar o primeiro?"
            acao={
              <Link to="/criar">
                <Button>Criar evento</Button>
              </Link>
            }
          />
        )}

        {destaques.data && destaques.data.length > 0 && (
          <div className="hscroll" data-testid="faixa-destaques">
            {destaques.data.map((evento) => (
              <TicketCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="feed-titulo">
        <h2 id="feed-titulo" className="mb-4 font-display text-display-sm font-bold text-text">
          Do seu campus
        </h2>

        {feed.isPending && <SkeletonLista itens={2} />}

        {feed.isError && (
          <ErrorState
            mensagem={mensagemDeErro(feed.error)}
            onTentarDeNovo={() => void feed.refetch()}
          />
        )}

        {feed.data && feed.data.length === 0 && (
          <EmptyState
            titulo="Nada por aqui ainda"
            descricao="Quando alguém da sua turma publicar a foto de um evento, aparece aqui."
          />
        )}

        {feed.data?.map((publicacao) => (
          <PostCard key={publicacao.id} publicacao={publicacao} />
        ))}
      </section>
    </div>
  );
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}
