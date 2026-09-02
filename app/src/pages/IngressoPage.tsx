import { Link, useParams } from 'react-router-dom';
import {
  formatEventDateTime,
  formatEventRange,
  formatFullDate,
  formatTime,
} from '../domain/format';
import { mensagemDeErro, useParticipacao } from '../hooks/useCampusData';
import { useTokenIngresso } from '../hooks/useCheckin';
import { useSessionStore } from '../store/session';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { QrCode } from '../components/ui/QrCode';
import { cn } from '../lib/cn';
import {
  checkInOpen,
  checkInWindow,
  formatPrice,
  minutesLeftToPay,
  numericCheckInCode,
  ticketCode,
} from '@campus/shared';

/**
 * Ingresso com QR Code (RF-031 a RF-033).
 *
 * Esta é a tela que o aluno abre na porta do evento, então ela é deliberadamente
 * densa em uma coisa só: o código. Nada de menu, nada de rolagem para achar o QR.
 *
 * O conteúdo do QR é o token assinado emitido pelo servidor
 * (`useTokenIngresso`), e não um identificador montado no cliente: é ele que o
 * leitor de RF-034 verifica. Abaixo dele ficam as duas contingências de UC-005
 * A1 — o código de 8 dígitos e o código impresso —, ambas deriváveis do id da
 * participação e, por isso, legíveis mesmo quando o token não chega.
 */
export function IngressoPage() {
  const { id } = useParams<{ id: string }>();
  const sessao = useSessionStore((s) => s.sessao);
  const { data: participacao, isPending, isError, error, refetch } = useParticipacao(id);

  // O token só é emitido para inscrição confirmada: pedir antes disso ganharia um
  // 409 do servidor e um erro na tela que não diz nada de útil ao aluno.
  const emitido = participacao?.status === 'CONFIRMADA' || participacao?.status === 'PRESENTE';
  const token = useTokenIngresso(id, emitido);

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando ingresso" className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-qr w-full" />
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

  const turmaOuSigla = sessao?.turma?.nome ?? sessao?.faculdade.sigla ?? 'CMP';
  const codigoLegivel = token.data?.codigoLegivel ?? ticketCode(turmaOuSigla, participacao.id);
  const codigoNumerico = token.data?.codigoNumerico ?? numericCheckInCode(participacao.id);
  const { opensAt, closesAt } = checkInWindow(participacao.evento);
  const abreIso = new Date(opensAt).toISOString();
  const fechaIso = new Date(closesAt).toISOString();
  const janelaAberta = checkInOpen(participacao.evento, new Date());
  const presenca = participacao.presenca;
  const minutosParaPagar = minutesLeftToPay(participacao, new Date());

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
            {presenca && (
              <p
                role="status"
                className="mb-4 rounded-md border border-accent-2 bg-accent-2-soft px-4 py-3 text-center text-body-sm font-medium text-teal-700"
              >
                Ingresso utilizado às {formatTime(presenca.checkinEm)}. Cada ingresso vale uma
                entrada: este QR não abre a porta de novo.
              </p>
            )}

            {/*
              Utilizado, o QR fica esmaecido em vez de sumir: o aluno ainda pode
              precisar mostrar o código para conferência do organizador, e
              esconder informação já registrada não desfaz o check-in.
            */}
            <div className={cn(presenca ? 'opacity-60' : null)}>
              {token.isPending ? (
                <Skeleton className="h-qr w-full" />
              ) : (
                <div className="mx-auto w-ticket max-w-full">
                  <QrCode codigo={token.data?.valor ?? codigoLegivel} />
                </div>
              )}
            </div>

            {token.isError && (
              <p className="mt-3 text-center text-body-xs text-text-muted">
                Não conseguimos emitir o token assinado agora. Use os códigos abaixo na portaria: os
                dois identificam este ingresso do mesmo jeito.
              </p>
            )}

            <p className="mt-4 text-center font-display text-display-sm font-bold tracking-tight text-text">
              {codigoLegivel}
            </p>
            <p className="mt-1 text-center font-mono text-mono-sm text-text-muted">
              código numérico: {codigoNumerico}
            </p>

            <p className="mt-4 text-center text-body-xs text-text-muted">
              {janelaAberta
                ? `O check-in está aberto e encerra em ${formatEventDateTime(fechaIso)}. Cada ingresso vale uma entrada.`
                : Date.now() < opensAt
                  ? `O check-in abre às ${formatTime(abreIso)} de ${formatFullDate(abreIso)}. Cada ingresso vale uma entrada.`
                  : `O check-in encerrou em ${formatEventDateTime(fechaIso)}.`}
            </p>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="font-display text-display-sm font-bold text-text">
              Ingresso ainda não emitido
            </p>
            <p className="mx-auto mt-2 max-w-content text-body-sm text-text-muted">
              {participacao.status === 'PENDENTE_PAGAMENTO'
                ? minutosParaPagar == null || minutosParaPagar === 0
                  ? 'O prazo para pagar terminou e a vaga voltou para a fila.'
                  : `O QR Code é liberado quando o pagamento é confirmado. Faltam ${minutosParaPagar} min para o fim do prazo.`
                : participacao.status === 'LISTA_ESPERA'
                  ? `Você está na lista de espera${participacao.posicaoFila ? ` (${participacao.posicaoFila}º)` : ''}. O ingresso é emitido se uma vaga abrir e você confirmar.`
                  : 'Só participação confirmada gera ingresso.'}
            </p>

            {participacao.status === 'PENDENTE_PAGAMENTO' && (
              <div className="mt-5">
                <Link to={`/pagamento/${participacao.id}`}>
                  <Button larguraTotal size="lg">
                    {minutosParaPagar == null || minutosParaPagar === 0
                      ? 'Ver a cobrança'
                      : `Pagar agora · ${minutosParaPagar} min`}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

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
