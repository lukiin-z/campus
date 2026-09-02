import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resolvePrimaryAction } from '../domain/eventAction';
import { formatEventRange, formatFullDate, formatRelative } from '../domain/format';
import { formatPrice } from '../domain/payment';
import { policySummary } from '../domain/refund';
import {
  mensagemDeErro,
  useCancelarParticipacao,
  useConfirmarOferta,
  useEntrarNaListaEspera,
  useEvento,
  useInscrever,
} from '../hooks/useCampusData';
import { Avatar } from '../components/ui/Avatar';
import { ScopeBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EventCover } from '../components/ui/EventCover';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';

/**
 * Detalhe do evento (RF-016) — a tela onde a decisão acontece.
 *
 * O botão principal não é "Inscrever-se": é o que `resolvePrimaryAction` decidir
 * entre nove estados possíveis (src/domain/eventAction.ts, especificado no
 * segundo diagrama de atividades). O aluno nunca toca em um botão para descobrir
 * que não podia.
 */
export function EventoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { data: evento, isPending, isError, error, refetch } = useEvento(id);

  const inscrever = useInscrever(id ?? '');
  const entrarNaFila = useEntrarNaListaEspera(id ?? '');
  const cancelar = useCancelarParticipacao();
  const confirmarOferta = useConfirmarOferta();

  const [modalCancelar, setModalCancelar] = useState(false);

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando evento" className="space-y-4">
        <Skeleton className="h-cover-lg w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState mensagem={mensagemDeErro(error)} onTentarDeNovo={() => void refetch()} />;
  }

  // RN-001: fora do alcance a API devolve 404 e o repositório traduz em `null` —
  // não revelamos nem que o evento existe.
  if (!evento) {
    return (
      <EmptyState
        titulo="Evento não encontrado"
        descricao="Ou ele não existe, ou não está no seu alcance — eventos de turma e de curso só aparecem para quem faz parte."
        acao={
          <Link to="/eventos">
            <Button variant="ghost">Ver eventos</Button>
          </Link>
        }
      />
    );
  }

  // Cópia local depois da verificação de nulidade: o TypeScript não propaga o
  // estreitamento para dentro de `executarAcao`, e mentir com `!` esconderia um
  // erro real se a guarda acima mudasse.
  const eventoAtual = evento;
  const acao = resolvePrimaryAction(eventoAtual, new Date());
  const minha = eventoAtual.minhaParticipacao;
  const emAndamento =
    inscrever.isPending ||
    entrarNaFila.isPending ||
    cancelar.isPending ||
    confirmarOferta.isPending;

  function executarAcao() {
    switch (acao.kind) {
      case 'INSCREVER':
      case 'INSCREVER_PAGO':
        inscrever.mutate(undefined, {
          onSuccess: (resultado) => {
            if (resultado.tipo === 'CONFIRMADA') navegar(`/ingresso/${resultado.participacao.id}`);
          },
        });
        break;
      case 'LISTA_ESPERA':
        entrarNaFila.mutate();
        break;
      case 'CONFIRMAR_OFERTA':
        if (minha) confirmarOferta.mutate({ participacaoId: minha.id, eventoId: eventoAtual.id });
        break;
      case 'VER_INGRESSO':
        if (minha) navegar(`/ingresso/${minha.id}`);
        break;
      case 'VER_FILA':
      case 'PAGAR':
      case 'PUBLICAR_FOTO':
        // Pagamento (RF-028) e publicação (RF-037) são da Sprint 3. Até lá a ação
        // apenas informa, em vez de fingir que funcionou.
        break;
      default:
        break;
    }
  }

  return (
    <article>
      <button
        type="button"
        onClick={() => navegar(-1)}
        className="mb-4 inline-flex min-h-touch items-center gap-2 text-body-sm text-text-muted hover:text-text"
      >
        <span aria-hidden="true">←</span> Voltar
      </button>

      <EventCover seed={evento.capaSeed} titulo={evento.titulo} altura="lg" />

      <header className="mt-5">
        <ScopeBadge alcance={evento.alcance} rotulo={evento.alcanceRotulo} />
        <h1
          className="mt-3 font-display text-display-lg font-bold text-text"
          data-testid="titulo-evento"
        >
          {evento.titulo}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <Avatar
            nome={evento.organizador.nome}
            seed={evento.organizador.avatarSeed}
            tamanho="sm"
          />
          <p className="text-body-sm text-text-muted">Organizado por {evento.organizador.nome}</p>
        </div>
      </header>

      {evento.status === 'CANCELADO' && evento.motivoCancelamento && (
        <div
          role="alert"
          className="mt-5 rounded-md border border-danger bg-accent-soft px-4 py-3 text-body-sm text-coral-800"
        >
          <strong className="font-semibold">Evento cancelado pelo organizador.</strong>{' '}
          {evento.motivoCancelamento}
        </div>
      )}

      {minha && (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
          <StatusBadge status={minha.status} />
          <span className="text-body-sm text-text-muted">
            {minha.status === 'LISTA_ESPERA' && minha.posicaoFila
              ? `Você é o ${minha.posicaoFila}º da fila.`
              : `Atualizado ${formatRelative(minha.atualizadoEm)}.`}
          </span>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Dado rotulo="Data" valor={formatFullDate(evento.inicio)} />
        <Dado rotulo="Horário" valor={formatEventRange(evento.inicio, evento.fim)} />
        <Dado rotulo="Local" valor={evento.local} />
        <Dado rotulo="Valor" valor={formatPrice(evento.preco)} />
      </dl>

      <div className="mt-6">
        <ProgressBar
          ocupadas={evento.ocupadas}
          capacidade={evento.capacidade}
          rotuloDireita={
            evento.vagasDisponiveis === 0
              ? evento.totalListaEspera > 0
                ? `${evento.totalListaEspera} na fila`
                : 'lista de espera ativa'
              : `inscrições até ${formatFullDate(evento.prazoInscricao)}`
          }
        />
      </div>

      {evento.descricao && (
        <p className="mt-6 whitespace-pre-line text-body-md leading-relaxed text-text">
          {evento.descricao}
        </p>
      )}

      {evento.preco > 0 && minha?.politicaVigente && (
        <section aria-labelledby="politica-titulo" className="mt-6 rounded-md bg-surface-2 p-4">
          <h2 id="politica-titulo" className="font-display text-body-md font-bold text-text">
            Política de reembolso
          </h2>
          <ul className="mt-2 space-y-1 text-body-sm text-text-muted">
            {policySummary(minha.politicaVigente).map((linha) => (
              <li key={linha}>· {linha}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <Button
          larguraTotal
          size="lg"
          variant={acao.variant === 'ghost' ? 'ghost' : acao.variant}
          disabled={acao.disabled}
          carregando={emAndamento}
          onClick={executarAcao}
          data-testid="acao-principal"
        >
          {acao.label}
        </Button>

        {acao.hint && <p className="mt-2 text-center text-body-xs text-text-muted">{acao.hint}</p>}

        {minha &&
          (minha.status === 'CONFIRMADA' ||
            minha.status === 'LISTA_ESPERA' ||
            minha.status === 'PENDENTE_PAGAMENTO') && (
            <button
              type="button"
              onClick={() => setModalCancelar(true)}
              className="mt-4 block w-full text-center text-body-sm text-text-muted underline hover:text-text"
            >
              {minha.status === 'LISTA_ESPERA' ? 'Sair da lista de espera' : 'Cancelar inscrição'}
            </button>
          )}
      </div>

      <Modal
        aberto={modalCancelar}
        titulo={
          minha?.status === 'LISTA_ESPERA' ? 'Sair da lista de espera?' : 'Cancelar sua inscrição?'
        }
        onFechar={() => setModalCancelar(false)}
        acoes={
          <>
            <Button variant="ghost" onClick={() => setModalCancelar(false)}>
              Continuar inscrito
            </Button>
            <Button
              variant="danger"
              carregando={cancelar.isPending}
              onClick={() => {
                if (!minha) return;
                cancelar.mutate(
                  { participacaoId: minha.id, eventoId: evento.id },
                  { onSuccess: () => setModalCancelar(false) },
                );
              }}
            >
              Sim, cancelar
            </Button>
          </>
        }
      >
        {minha?.status === 'LISTA_ESPERA' ? (
          <p>
            Você perde a {minha.posicaoFila}ª posição. Se entrar de novo, volta para o fim da fila.
          </p>
        ) : (
          <p>
            Sua vaga é liberada na hora e oferecida ao primeiro da lista de espera.
            {evento.preco > 0
              ? ' O reembolso segue a política vigente no momento do seu pagamento.'
              : ''}
          </p>
        )}
      </Modal>
    </article>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <dt className="font-mono text-mono-xs uppercase text-text-muted">{rotulo}</dt>
      <dd className="mt-1 font-display text-body-md font-bold text-text">{valor}</dd>
    </div>
  );
}
