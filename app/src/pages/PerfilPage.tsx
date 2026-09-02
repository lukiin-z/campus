import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EventoView, ParticipacaoView } from '../types/domain';
import { formatDayMonth, formatEventDateTime, formatTime } from '../domain/format';
import {
  mensagemDeErro,
  useEventos,
  useMarcarNotificacaoLida,
  useMinhasParticipacoes,
  useNotificacoes,
} from '../hooks/useCampusData';
import { useSair } from '../hooks/useAuth';
import { useSessionStore } from '../store/session';
import { Avatar } from '../components/ui/Avatar';
import { EventStatusBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, SkeletonLista } from '../components/ui/Feedback';
import { Tabs } from '../components/ui/Tabs';
import { formatPrice } from '@campus/shared';

/**
 * Perfil (RF-006, RF-007) — onde o aluno encontra o próprio ingresso.
 *
 * As três abas espelham as três perguntas que a pessoa faz sobre si mesma:
 * "onde eu vou?", "o que eu organizei?" e "onde eu estive?".
 */

type AbaPerfil = 'participando' | 'criados' | 'anteriores';

export function PerfilPage() {
  const sessao = useSessionStore((s) => s.sessao);
  const [aba, setAba] = useState<AbaPerfil>('participando');
  const sair = useSair();
  const eventos = useEventos();
  const participacoes = useMinhasParticipacoes();
  const notificacoes = useNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();

  const todas = participacoes.data ?? [];
  const agora = Date.now();

  const participando = todas.filter(
    (p) =>
      ['PENDENTE_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA', 'OFERTA_PENDENTE'].includes(p.status) &&
      new Date(p.evento.fim).getTime() >= agora,
  );
  const anteriores = todas.filter(
    (p) => ['PRESENTE', 'AUSENTE'].includes(p.status) || new Date(p.evento.fim).getTime() < agora,
  );

  const naoLidas = (notificacoes.data ?? []).filter((n) => !n.lida);

  /*
   * Rascunho aparece aqui e em nenhum outro lugar: `GET /api/eventos` devolve
   * o rascunho ao próprio autor (é o que `canSee` permite), mas a lista de
   * eventos filtra por status publicado. O perfil é onde o organizador
   * reencontra o que começou e não publicou.
   */
  const organizados = (eventos.data ?? []).filter(
    (evento) => evento.organizadorId === sessao?.usuario.id,
  );

  return (
    <div>
      <header className="mb-6 flex items-center gap-4">
        <Avatar
          nome={sessao?.usuario.nome ?? 'Você'}
          seed={sessao?.usuario.avatarSeed ?? 1}
          tamanho="lg"
        />
        <div className="min-w-0">
          <h1 className="font-display text-display-md font-bold text-text">
            {sessao?.usuario.nome ?? 'Carregando…'}
          </h1>
          <p className="mt-1 font-mono text-mono-sm uppercase text-text-muted">
            {sessao?.curso?.nome ?? '—'}
            {sessao?.turma ? ` · turma ${sessao.turma.nome}` : ''}
          </p>
          <p className="font-mono text-mono-xs text-text-subtle">{sessao?.usuario.email ?? ''}</p>
        </div>
      </header>

      <dl className="mb-6 flex overflow-hidden rounded-lg border border-border bg-surface">
        <Estatistica rotulo="participando" valor={participando.length} />
        <Estatistica rotulo="anteriores" valor={anteriores.length} />
        <Estatistica rotulo="avisos" valor={naoLidas.length} ultimo />
      </dl>

      {naoLidas.length > 0 && (
        <section aria-labelledby="avisos-titulo" className="mb-6">
          <h2 id="avisos-titulo" className="mb-3 font-display text-display-sm font-bold text-text">
            Avisos
          </h2>
          <ul className="space-y-2">
            {naoLidas.map((notificacao) => (
              <li key={notificacao.id}>
                <button
                  type="button"
                  onClick={() => marcarLida.mutate(notificacao.id)}
                  className="w-full rounded-md border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-2"
                >
                  <span className="block text-body-sm font-semibold text-text">
                    {notificacao.titulo}
                  </span>
                  <span className="mt-1 block text-body-xs text-text-muted">
                    {notificacao.mensagem}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs<AbaPerfil>
        rotuloAcessivel="Minhas participações"
        ativa={aba}
        onSelecionar={setAba}
        abas={[
          { valor: 'participando', rotulo: 'Participando', quantidade: participando.length },
          { valor: 'criados', rotulo: 'Criados' },
          { valor: 'anteriores', rotulo: 'Anteriores', quantidade: anteriores.length },
        ]}
      />

      <div id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`}>
        {participacoes.isPending && <SkeletonLista itens={2} />}

        {participacoes.isError && (
          <ErrorState
            mensagem={mensagemDeErro(participacoes.error)}
            onTentarDeNovo={() => void participacoes.refetch()}
          />
        )}

        {participacoes.data && aba === 'participando' && (
          <ListaParticipacoes
            itens={participando}
            vazio={{
              titulo: 'Você não está inscrito em nada',
              descricao: 'Veja o que está acontecendo no seu campus e garanta sua vaga.',
            }}
          />
        )}

        {aba === 'criados' && (
          <ListaOrganizados
            eventos={organizados}
            carregando={eventos.isPending}
            erro={eventos.isError ? mensagemDeErro(eventos.error) : null}
            onTentarDeNovo={() => void eventos.refetch()}
          />
        )}

        {participacoes.data && aba === 'anteriores' && (
          <ListaParticipacoes
            itens={anteriores}
            vazio={{
              titulo: 'Nenhum evento no seu histórico',
              descricao: 'Depois do primeiro check-in, o evento aparece aqui com as fotos do feed.',
            }}
          />
        )}
      </div>

      <section aria-labelledby="sessao-titulo" className="mt-10 border-t border-border pt-6">
        <h2 id="sessao-titulo" className="font-display text-display-sm font-bold text-text">
          Sessão
        </h2>
        <p className="mt-1 text-body-sm text-text-muted">
          Entrou como {sessao?.usuario.email ?? 'você'}. A sessão termina quando você fecha a aba —
          é o comportamento certo em computador compartilhado.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          disabled={sair.isPending}
          onClick={() => sair.mutate()}
        >
          {sair.isPending ? 'Saindo…' : 'Sair da conta'}
        </Button>
      </section>
    </div>
  );
}

/**
 * Eventos que a pessoa organiza (RF-007).
 *
 * A lista sai de `useEventos()` filtrada por organizador, não de um endpoint
 * próprio: o que o organizador vê é o mesmo evento que todos veem, com dois
 * caminhos a mais — o detalhe e a porta (check-in). Um endpoint separado
 * duplicaria a projeção e a verificação de alcance.
 */
function ListaOrganizados({
  eventos,
  carregando,
  erro,
  onTentarDeNovo,
}: {
  eventos: EventoView[];
  carregando: boolean;
  erro: string | null;
  onTentarDeNovo: () => void;
}) {
  if (carregando) return <SkeletonLista itens={2} />;
  if (erro) return <ErrorState mensagem={erro} onTentarDeNovo={onTentarDeNovo} />;

  if (eventos.length === 0) {
    return (
      <EmptyState
        titulo="Você ainda não organizou nada"
        descricao="Quem organiza define alcance, capacidade e prazo — e valida o check-in na porta."
        acao={
          <Link to="/criar">
            <Button variant="ghost">Criar evento</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  to={`/eventos/${evento.id}`}
                  className="font-display text-display-sm font-bold text-text hover:text-accent-strong"
                >
                  {evento.titulo}
                </Link>
                <p className="mt-1 text-body-sm text-text-muted">
                  {formatEventDateTime(evento.inicio)} · {evento.alcanceRotulo}
                </p>
              </div>
              <EventStatusBadge status={evento.status} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="font-mono text-mono-xs text-text-muted">
                {evento.ocupadas}/{evento.capacidade} vagas
                {evento.totalListaEspera > 0 && ` · ${evento.totalListaEspera} na fila`}
              </p>
              <Link
                to={`/eventos/${evento.id}/checkin`}
                className="font-display text-body-sm font-bold text-accent-strong hover:underline"
              >
                Abrir check-in
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListaParticipacoes({
  itens,
  vazio,
}: {
  itens: ParticipacaoView[];
  vazio: { titulo: string; descricao: string };
}) {
  if (itens.length === 0) {
    return (
      <EmptyState
        titulo={vazio.titulo}
        descricao={vazio.descricao}
        acao={
          <Link to="/eventos">
            <Button variant="ghost">Ver eventos</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {itens.map((participacao) => {
        const { dia, mes } = formatDayMonth(participacao.evento.inicio);
        const podeVerIngresso =
          participacao.status === 'CONFIRMADA' || participacao.status === 'PRESENTE';

        return (
          <li key={participacao.id}>
            <Link
              to={
                podeVerIngresso
                  ? `/ingresso/${participacao.id}`
                  : `/eventos/${participacao.evento.id}`
              }
              className="flex overflow-hidden rounded-lg border border-border bg-surface transition hover:border-neutral-300"
            >
              <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center bg-surface-2 font-mono">
                <span className="text-display-md font-bold leading-none text-accent-strong">
                  {dia}
                </span>
                <span className="mt-1 text-mono-xs uppercase text-text-muted">{mes}</span>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="font-display text-body-md font-bold text-text">
                  {participacao.evento.titulo}
                </p>
                <p className="mt-1 font-mono text-mono-sm text-text-muted">
                  {formatTime(participacao.evento.inicio)} · {participacao.evento.local} ·{' '}
                  {formatPrice(participacao.evento.preco)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={participacao.status} />
                  {participacao.status === 'LISTA_ESPERA' && participacao.posicaoFila && (
                    <span className="font-mono text-mono-xs text-text-muted">
                      {participacao.posicaoFila}º da fila
                    </span>
                  )}
                  {participacao.pagamento?.status === 'CONFIRMADO' && (
                    <span className="font-mono text-mono-xs text-text-muted">pago</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Estatistica({
  rotulo,
  valor,
  ultimo = false,
}: {
  rotulo: string;
  valor: number;
  ultimo?: boolean;
}) {
  return (
    <div
      className={`flex-1 px-2 py-4 text-center ${ultimo ? '' : 'border-r border-dashed border-border'}`}
    >
      <dt className="order-2 mt-1 text-mono-xs text-text-muted">{rotulo}</dt>
      <dd className="font-display text-display-md font-bold text-accent-strong">{valor}</dd>
    </div>
  );
}
