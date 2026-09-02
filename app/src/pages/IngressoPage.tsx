import { Link, useParams } from 'react-router-dom';
import { numericCheckInCode, ticketCode } from '../domain/checkin';
import { checkInWindow } from '../domain/deadlines';
import { formatEventDateTime, formatEventRange } from '../domain/format';
import { formatPrice } from '../domain/payment';
import { mensagemDeErro, useParticipacao } from '../hooks/useCampusData';
import { useSessionStore } from '../store/session';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { QrCode } from '../components/ui/QrCode';

/**
 * Ingresso com QR Code (RF-033).
 *
 * Esta é a tela que o aluno abre na porta do evento, então ela é deliberadamente
 * densa em uma coisa só: o código. Nada de menu, nada de rolagem para achar o QR.
 *
 * O QR é gerado a partir do identificador da participação; o token assinado por
 * HMAC (RN-017) é responsabilidade do servidor e entra no CP6 — até lá o código
 * alfanumérico impresso abaixo é o que identifica o ingresso.
 */
export function IngressoPage() {
  const { id } = useParams<{ id: string }>();
  const sessao = useSessionStore((s) => s.sessao);
  const { data: participacao, isPending, isError, error, refetch } = useParticipacao(id);

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando ingresso" className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState mensagem={mensagemDeErro(error)} onTentarDeNovo={() => void refetch()} />;
  }

  if (!participacao) {
    return (
      <EmptyState
        titulo="Ingresso não encontrado"
        descricao="Este ingresso não existe ou não é seu. Cada ingresso vale para uma pessoa e um evento."
        acao={
          <Link to="/perfil">
            <Button variant="ghost">Ver minhas inscrições</Button>
          </Link>
        }
      />
    );
  }

  const emitido = participacao.status === 'CONFIRMADA' || participacao.status === 'PRESENTE';
  const turmaOuSigla = sessao?.turma?.nome ?? sessao?.faculdade.sigla ?? 'CMP';
  const codigo = ticketCode(turmaOuSigla, participacao.id);
  const { opensAt, closesAt } = checkInWindow(participacao.evento);

  return (
    <article>
      <header className="mb-5">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">Meu ingresso</p>
        <h1 className="mt-1 font-display text-display-lg font-bold text-text">
          {participacao.evento.titulo}
        </h1>
      </header>

      {/* Cartão-ingresso picotado: o elemento de assinatura da marca. */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-display-sm font-bold text-text">
              {sessao?.usuario.nome ?? '—'}
            </p>
            <p className="mt-1 font-mono text-mono-sm text-text-muted">
              {sessao?.curso?.nome ?? ''}
              {sessao?.turma ? ` · ${sessao.turma.nome}` : ''}
            </p>
          </div>
          <StatusBadge status={participacao.status} />
        </div>

        <dl className="mt-5 space-y-2 font-mono text-mono-sm text-text-muted">
          <div className="flex justify-between gap-4">
            <dt>Quando</dt>
            <dd className="text-right text-text">
              {formatEventDateTime(participacao.evento.inicio)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Horário</dt>
            <dd className="text-right text-text">
              {formatEventRange(participacao.evento.inicio, participacao.evento.fim)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Local</dt>
            <dd className="text-right text-text">{participacao.evento.local}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Valor</dt>
            <dd className="text-right text-text">{formatPrice(participacao.evento.preco)}</dd>
          </div>
        </dl>

        <div className="ticket-divider" />

        {emitido ? (
          <div>
            <div className="mx-auto max-w-full">
              <QrCode codigo={codigo} />
            </div>
            <p className="mt-4 text-center font-display text-display-sm font-bold tracking-tight text-text">
              {codigo}
            </p>
            <p className="mt-1 text-center font-mono text-mono-sm text-text-muted">
              código numérico: {numericCheckInCode(participacao.id)}
            </p>
            <p className="mt-4 text-center text-body-xs text-text-muted">
              Check-in aceito entre{' '}
              {new Date(opensAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              e{' '}
              {new Date(closesAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Cada ingresso vale uma entrada.
            </p>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="font-display text-display-sm font-bold text-text">
              Ingresso ainda não emitido
            </p>
            <p className="mx-auto mt-2 max-w-content text-body-sm text-text-muted">
              {participacao.status === 'PENDENTE_PAGAMENTO'
                ? 'O QR Code é liberado quando o pagamento é confirmado.'
                : participacao.status === 'LISTA_ESPERA'
                  ? `Você está na lista de espera${participacao.posicaoFila ? ` (${participacao.posicaoFila}º)` : ''}. O ingresso é emitido se uma vaga abrir e você confirmar.`
                  : 'Só participação confirmada gera ingresso.'}
            </p>
          </div>
        )}
      </div>

      {participacao.presenca && (
        <p className="mt-4 text-center text-body-sm text-accent-2">
          Check-in registrado em{' '}
          {new Date(participacao.presenca.checkinEm).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link to={`/eventos/${participacao.evento.id}`}>
          <Button variant="ghost" larguraTotal>
            Ver o evento
          </Button>
        </Link>
      </div>
    </article>
  );
}
