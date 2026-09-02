import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { EventoView, Participacao } from '../types/domain';
import { resolvePrimaryAction } from '../domain/eventAction';
import { formatEventRange, formatFullDate, formatRelative } from '../domain/format';
import {
  mensagemDeErro,
  useCancelarParticipacao,
  useConfirmarOferta,
  useEntrarNaListaEspera,
  useEvento,
  useInscrever,
} from '../hooks/useCampusData';
import { useSessionStore } from '../store/session';
import { BlocoPrazo } from '../features/participacao/BlocoPrazo';
import { PosicaoNaFila } from '../features/participacao/PosicaoNaFila';
import { Avatar } from '../components/ui/Avatar';
import { ScopeBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EventCover } from '../components/ui/EventCover';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  POLICY,
  canValidateCheckIn,
  computeRefund,
  formatPrice,
  policySummary,
  withinCancellationWindow,
} from '@campus/shared';

/**
 * Detalhe do evento (RF-016 a RF-025) — a tela onde a decisão acontece.
 *
 * O botão principal não é "Inscrever-se": é o que `resolvePrimaryAction` decidir
 * (src/domain/eventAction.ts, especificado no segundo diagrama de atividades).
 * Nenhum `if` de status decide rótulo, tom ou habilitação aqui — a tela só
 * executa o `kind` que recebeu. O aluno nunca toca em um botão para descobrir
 * que não podia.
 */

/** As três saídas que liberam a vaga. Mesma mutação, consequências diferentes. */
type IntencaoDeSaida = 'CANCELAR_INSCRICAO' | 'SAIR_DA_FILA' | 'RECUSAR_OFERTA';

export function EventoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const sessao = useSessionStore((s) => s.sessao);
  const { data: evento, isPending, isError, error, refetch } = useEvento(id);

  const inscrever = useInscrever(id ?? '');
  const entrarNaFila = useEntrarNaListaEspera(id ?? '');
  const cancelar = useCancelarParticipacao();
  const confirmarOferta = useConfirmarOferta();

  const [intencao, setIntencao] = useState<IntencaoDeSaida | null>(null);
  const filaRef = useRef<HTMLElement>(null);

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

  // RN-001 e RNF-012: fora do alcance a API devolve 404 e o repositório traduz em
  // `null`. Esta é também a resposta para "sem permissão" — não revelamos nem que
  // o evento existe, porque "você não pode ver este evento" já é informação sobre
  // ele.
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
  const agora = new Date();
  const acao = resolvePrimaryAction(eventoAtual, agora);
  const minha = eventoAtual.minhaParticipacao;
  const podeValidarCheckin = sessao ? canValidateCheckIn(sessao.usuario, eventoAtual) : false;
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
            // O destino depende do desfecho, e o desfecho é do servidor: vaga
            // gratuita confirma na hora, vaga paga abre a janela de pagamento
            // (RN-012). `SEM_VAGA` e `RECUSADA` só avisam — o hook já mostra o
            // toast, e a invalidação redesenha o botão no estado certo.
            if (resultado.tipo === 'CONFIRMADA') navegar(`/ingresso/${resultado.participacao.id}`);
            if (resultado.tipo === 'PENDENTE_PAGAMENTO') {
              navegar(`/pagamento/${resultado.participacao.id}`);
            }
          },
        });
        break;

      case 'LISTA_ESPERA':
        entrarNaFila.mutate();
        break;

      case 'PAGAR':
        if (minha) navegar(`/pagamento/${minha.id}`);
        break;

      case 'CONFIRMAR_OFERTA':
        if (minha) confirmarOferta.mutate({ participacaoId: minha.id, eventoId: eventoAtual.id });
        break;

      case 'VER_INGRESSO':
        if (minha) navegar(`/ingresso/${minha.id}`);
        break;

      case 'VER_FILA':
        // O rótulo do botão É a informação (a posição). Tocá-lo leva ao bloco
        // que explica a fila, em vez de fingir uma ação que não existe.
        filaRef.current?.scrollIntoView({ block: 'center' });
        filaRef.current?.focus({ preventScroll: true });
        break;

      case 'PUBLICAR_FOTO':
        // O composer mora no feed; o parâmetro chega lá com o evento escolhido.
        navegar(`/?evento=${eventoAtual.id}`);
        break;

      case 'ENCERRADO':
      case 'CANCELADO':
      case 'REALIZADO':
        // Estados terminais: `resolvePrimaryAction` devolve `disabled`, e não há
        // ação a executar. O caminho para as fotos fica ao lado do botão.
        break;

      default: {
        // Estado novo em `PrimaryActionKind` quebra a compilação aqui, em vez de
        // virar um botão silenciosamente inerte.
        const naoTratado: never = acao.kind;
        throw new Error(`Ação principal não tratada: ${String(naoTratado)}`);
      }
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

      <EventCover seed={eventoAtual.capaSeed} titulo={eventoAtual.titulo} altura="lg" />

      <header className="mt-5">
        <ScopeBadge alcance={eventoAtual.alcance} rotulo={eventoAtual.alcanceRotulo} />
        <h1
          className="mt-3 font-display text-display-lg font-bold text-text"
          data-testid="titulo-evento"
        >
          {eventoAtual.titulo}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <Avatar
            nome={eventoAtual.organizador.nome}
            seed={eventoAtual.organizador.avatarSeed}
            tamanho="sm"
          />
          <p className="text-body-sm text-text-muted">
            Organizado por {eventoAtual.organizador.nome}
          </p>
        </div>
      </header>

      {eventoAtual.status === 'CANCELADO' && eventoAtual.motivoCancelamento && (
        <div
          role="alert"
          className="mt-5 rounded-md border border-danger bg-accent-soft px-4 py-3 text-body-sm text-coral-800"
        >
          <strong className="font-semibold">Evento cancelado pelo organizador.</strong>{' '}
          {eventoAtual.motivoCancelamento}
        </div>
      )}

      {minha && (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
          <StatusBadge status={minha.status} />
          <span className="text-body-sm text-text-muted">
            Atualizado {formatRelative(minha.atualizadoEm)}.
          </span>
        </div>
      )}

      {/* Oferta da lista de espera (RF-022 a RF-024). O prazo é o assunto do
          bloco: é ele que decide se a vaga é sua ou da próxima pessoa. */}
      {minha?.status === 'OFERTA_PENDENTE' && minha.ofertaExpiraEm && (
        <BlocoPrazo
          titulo="Abriu uma vaga para você"
          expiraEm={minha.ofertaExpiraEm}
          explicacao={`Confirme no botão principal para garantir a vaga${
            eventoAtual.preco > 0
              ? `, e depois você tem ${POLICY.PAYMENT_WINDOW_MINUTES} min para pagar`
              : ''
          }. Se o prazo terminar antes, a oferta expira sozinha e a vaga vai para a próxima pessoa da fila — sem punição, e você pode entrar na fila de novo.`}
          aoExpirar={() => void refetch()}
        >
          <Button variant="ghost" onClick={() => setIntencao('RECUSAR_OFERTA')}>
            Recusar a vaga
          </Button>
        </BlocoPrazo>
      )}

      {/* Janela de pagamento (RN-012). Sem ação própria: pagar é o botão
          principal desta tela, e duas ações primárias competem entre si. */}
      {minha?.status === 'PENDENTE_PAGAMENTO' && minha.pagamentoExpiraEm && (
        <BlocoPrazo
          titulo="Sua vaga está reservada"
          expiraEm={minha.pagamentoExpiraEm}
          explicacao="Se o prazo terminar sem pagamento, a reserva expira e a vaga é oferecida à primeira pessoa da lista de espera. Você pode tentar de novo, se ainda houver vaga."
          aoExpirar={() => void refetch()}
        />
      )}

      {minha?.status === 'LISTA_ESPERA' && (
        <PosicaoNaFila
          ref={filaRef}
          posicao={minha.posicaoFila ?? 1}
          totalNaFila={eventoAtual.totalListaEspera}
          precisaPagar={eventoAtual.preco > 0}
        />
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Dado rotulo="Data" valor={formatFullDate(eventoAtual.inicio)} />
        <Dado rotulo="Horário" valor={formatEventRange(eventoAtual.inicio, eventoAtual.fim)} />
        <Dado rotulo="Local" valor={eventoAtual.local} />
        <Dado rotulo="Valor" valor={formatPrice(eventoAtual.preco)} />
      </dl>

      <div className="mt-6">
        <ProgressBar
          ocupadas={eventoAtual.ocupadas}
          capacidade={eventoAtual.capacidade}
          rotuloDireita={
            eventoAtual.vagasDisponiveis === 0
              ? eventoAtual.totalListaEspera > 0
                ? `${eventoAtual.totalListaEspera} na fila`
                : 'lista de espera ativa'
              : `inscrições até ${formatFullDate(eventoAtual.prazoInscricao)}`
          }
        />
      </div>

      {eventoAtual.descricao && (
        <p className="mt-6 whitespace-pre-line text-body-md leading-relaxed text-text">
          {eventoAtual.descricao}
        </p>
      )}

      {eventoAtual.preco > 0 && minha?.politicaVigente && (
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

      {podeValidarCheckin && (
        <section
          aria-labelledby="organizador-titulo"
          className="mt-6 rounded-md border border-accent-2 bg-accent-2-soft p-4"
        >
          <h2 id="organizador-titulo" className="font-display text-body-md font-bold text-teal-700">
            Você cuida deste evento
          </h2>
          <p className="mt-1 text-body-sm text-teal-700">
            O painel da porta valida ingresso por QR Code e mostra quem já entrou.
          </p>
          <Link to={`/eventos/${eventoAtual.id}/checkin`} className="mt-3 inline-flex">
            <Button variant="secondary">Abrir o check-in</Button>
          </Link>
        </section>
      )}

      <div className="mt-8">
        <Button
          larguraTotal
          size="lg"
          variant={acao.variant}
          disabled={acao.disabled}
          carregando={emAndamento}
          onClick={executarAcao}
          data-testid="acao-principal"
        >
          {acao.label}
        </Button>

        {acao.hint && <p className="mt-2 text-center text-body-xs text-text-muted">{acao.hint}</p>}

        {/* Evento realizado: a ação principal está desabilitada, então o caminho
            para as fotos precisa existir em outro lugar. */}
        {acao.kind === 'REALIZADO' && (
          <Link
            to="/"
            className="mt-4 block text-center text-body-sm text-accent-strong underline hover:text-accent-hover"
          >
            Ver as fotos no feed
          </Link>
        )}

        {minha?.status === 'LISTA_ESPERA' && (
          <SaidaSecundaria
            rotulo="Sair da lista de espera"
            onClick={() => setIntencao('SAIR_DA_FILA')}
          />
        )}

        {(minha?.status === 'CONFIRMADA' || minha?.status === 'PENDENTE_PAGAMENTO') && (
          <SaidaSecundaria
            rotulo="Cancelar inscrição"
            onClick={() => setIntencao('CANCELAR_INSCRICAO')}
          />
        )}
      </div>

      <Modal
        aberto={intencao != null}
        titulo={intencao ? TITULO_DA_SAIDA[intencao] : ''}
        onFechar={() => setIntencao(null)}
        acoes={
          <>
            <Button variant="ghost" onClick={() => setIntencao(null)}>
              {intencao === 'SAIR_DA_FILA' ? 'Continuar na fila' : 'Voltar'}
            </Button>
            <Button
              variant="danger"
              carregando={cancelar.isPending}
              onClick={() => {
                if (!minha) return;
                cancelar.mutate(
                  { participacaoId: minha.id, eventoId: eventoAtual.id },
                  { onSuccess: () => setIntencao(null) },
                );
              }}
            >
              {intencao === 'RECUSAR_OFERTA' ? 'Sim, recusar' : 'Sim, quero sair'}
            </Button>
          </>
        }
      >
        {intencao && minha && (
          <ConsequenciasDaSaida
            intencao={intencao}
            evento={eventoAtual}
            participacao={minha}
            agora={agora}
          />
        )}
      </Modal>
    </article>
  );
}

const TITULO_DA_SAIDA: Readonly<Record<IntencaoDeSaida, string>> = {
  CANCELAR_INSCRICAO: 'Cancelar sua inscrição?',
  SAIR_DA_FILA: 'Sair da lista de espera?',
  RECUSAR_OFERTA: 'Recusar a vaga?',
};

/**
 * O que a pessoa perde ao sair — dito antes, com número.
 *
 * O percentual e o valor do reembolso vêm de `computeRefund` (RN-013): a política
 * aplicada é a congelada no pagamento, e recalcular a faixa aqui seria uma
 * segunda fonte de verdade que um dia discorda da primeira.
 */
function ConsequenciasDaSaida({
  intencao,
  evento,
  participacao,
  agora,
}: {
  intencao: IntencaoDeSaida;
  evento: EventoView;
  participacao: Participacao;
  agora: Date;
}) {
  if (intencao === 'SAIR_DA_FILA') {
    return (
      <p>
        Você perde a {participacao.posicaoFila ?? 1}ª posição. Para voltar, precisa entrar de novo —
        e a fila é por ordem de chegada, então você entraria no fim dela.
      </p>
    );
  }

  if (intencao === 'RECUSAR_OFERTA') {
    return (
      <p>
        A vaga vai para a próxima pessoa da fila, na hora. Você sai da lista de espera; para
        concorrer de novo, precisa entrar no fim dela.
      </p>
    );
  }

  const foraDoPrazo = !withinCancellationWindow(evento, agora);
  // `EventoView` não traz o valor pago; o preço do evento é a melhor
  // aproximação disponível na tela, e o servidor recalcula sobre o pagamento
  // real. A explicação da faixa não muda com o valor.
  const reembolso = participacao.politicaVigente
    ? computeRefund(evento, evento.preco, 'ALUNO_CANCELOU', agora, participacao.politicaVigente)
    : null;

  return (
    <div className="space-y-3">
      <p>Sua vaga é liberada na hora e oferecida à primeira pessoa da lista de espera.</p>

      {reembolso && (
        <p>
          {reembolso.explicacao}
          {reembolso.valor > 0 ? ` Você recebe ${formatPrice(reembolso.valor)} de volta.` : ''}
        </p>
      )}

      {!reembolso && evento.preco > 0 && (
        <p>
          Você ainda não pagou este evento, então não há valor a devolver — a reserva simplesmente
          deixa de existir.
        </p>
      )}

      {foraDoPrazo && (
        <p>
          O prazo de cancelamento era {formatFullDate(evento.prazoCancelamento)}. Cancelar depois
          dele fica registrado para o organizador.
        </p>
      )}
    </div>
  );
}

/** Saída sempre secundária: nunca compete visualmente com a ação principal. */
function SaidaSecundaria({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 block w-full min-h-touch text-center text-body-sm text-text-muted underline hover:text-text"
    >
      {rotulo}
    </button>
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
