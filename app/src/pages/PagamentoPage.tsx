import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  DesfechoSimulado,
  MetodoPagamento,
  ResumoCartao,
  StatusParticipacao,
} from '../types/domain';
import type { GatewayPrediction } from '../features/pagamento/cardSchema';
import { formatEventDateTime, formatTime } from '../domain/format';
import { mensagemDeErro, useParticipacao } from '../hooks/useCampusData';
import { useIniciarPagamento, usePagamento, useSimularDesfecho } from '../hooks/usePagamento';
import { usePaymentCountdown } from '../features/pagamento/usePaymentCountdown';
import { CardForm } from '../features/pagamento/CardForm';
import { GatewaySimulator } from '../features/pagamento/GatewaySimulator';
import { PixPanel } from '../features/pagamento/PixPanel';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Tabs } from '../components/ui/Tabs';
import { formatPrice } from '@campus/shared';

/**
 * Pagamento simulado (RF-026 a RF-030).
 *
 * A tela gira em torno de um número: quanto tempo resta. A vaga está reservada,
 * não comprada, e RN-012 dá 60 minutos — esconder isso atrás de "aguarde" seria
 * o pior defeito possível aqui, porque a pessoa perde a vaga sem saber que
 * estava perdendo.
 *
 * Nenhum centavo se move: a cobrança Pix é gerada no cliente com chave fictícia
 * e o desfecho vem do painel de simulação (ADR-0007). O número do cartão nunca
 * sai do formulário (RNF-022) — ver `features/pagamento/CardForm.tsx`.
 */

type AbaPagamento = 'PIX' | 'CARTAO';

export function PagamentoPage() {
  const { participacaoId } = useParams<{ participacaoId: string }>();
  const id = participacaoId ?? '';
  const participacao = useParticipacao(participacaoId);
  const pagamento = usePagamento(participacaoId);
  const iniciar = useIniciarPagamento(id);
  const simular = useSimularDesfecho(id);
  const [abaEscolhida, setAbaEscolhida] = useState<AbaPagamento | null>(null);

  const inscricao = participacao.data ?? null;
  const cobranca = pagamento.data ?? null;
  const contagem = usePaymentCountdown(inscricao?.pagamentoExpiraEm, cobranca?.minutosRestantes);

  if (participacao.isPending) {
    return (
      <div role="status" aria-label="Carregando pagamento" className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-qr w-full" />
      </div>
    );
  }

  if (participacao.isError) {
    return (
      <ErrorState
        mensagem={mensagemDeErro(participacao.error)}
        onTentarDeNovo={() => void participacao.refetch()}
      />
    );
  }

  if (!inscricao) {
    return (
      <EmptyState
        titulo="Inscrição não encontrada"
        descricao="Esta inscrição não existe ou não é sua. Cada cobrança pertence a uma pessoa e a um evento."
        acao={
          <Link to="/eventos">
            <Button variant="ghost">Ver eventos</Button>
          </Link>
        }
      />
    );
  }

  const evento = inscricao.evento;

  if (inscricao.status === 'CONFIRMADA' || inscricao.status === 'PRESENTE') {
    return (
      <article>
        <Cabecalho titulo={evento.titulo} inicio={evento.inicio} local={evento.local} />
        <div
          role="status"
          className="rounded-lg border-2 border-accent-2 bg-accent-2-soft p-6 text-center"
        >
          <p className="font-display text-display-lg font-bold text-teal-700">
            Pagamento confirmado
          </p>
          <p className="mx-auto mt-2 max-w-content text-body-sm text-teal-700">
            Sua vaga está garantida e o ingresso já foi emitido. Leve o QR Code na entrada.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Link to={`/ingresso/${inscricao.id}`}>
            <Button larguraTotal size="lg">
              Ver meu ingresso
            </Button>
          </Link>
          <Link to={`/eventos/${evento.id}`}>
            <Button variant="ghost" larguraTotal>
              Ver o evento
            </Button>
          </Link>
        </div>
      </article>
    );
  }

  // A janela pode ter vencido sem o servidor ter reclassificado a participação:
  // quem manda na tela é o prazo, não o rótulo do registro.
  const janelaVencida =
    inscricao.status === 'EXPIRADA' ||
    (inscricao.status === 'PENDENTE_PAGAMENTO' && contagem.expirada);

  if (janelaVencida) {
    return (
      <article>
        <Cabecalho titulo={evento.titulo} inicio={evento.inicio} local={evento.local} />
        <div role="alert" className="rounded-lg border-2 border-danger bg-accent-soft p-6">
          <p className="font-display text-display-md font-bold text-coral-800">Vaga expirada</p>
          <p className="mt-2 text-body-sm text-coral-800">
            O prazo para pagar terminou e a vaga voltou para a fila, para quem estava esperando. É a
            regra que impede uma vaga de ficar presa em pagamento que nunca chega.
          </p>
          <p className="mt-2 text-body-sm text-coral-800">
            Se ainda houver lugar, você pode se inscrever de novo pela tela do evento. Se estiver
            lotado, entre na lista de espera.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Link to={`/eventos/${evento.id}`}>
            <Button larguraTotal size="lg">
              Voltar ao evento
            </Button>
          </Link>
          <Link to="/perfil">
            <Button variant="ghost" larguraTotal>
              Minhas inscrições
            </Button>
          </Link>
        </div>
      </article>
    );
  }

  if (inscricao.status !== 'PENDENTE_PAGAMENTO') {
    return (
      <EmptyState
        titulo="Não há pagamento em aberto"
        descricao={mensagemSemPagamento(inscricao.status)}
        acao={
          <Link to={`/eventos/${evento.id}`}>
            <Button variant="ghost">Ver o evento</Button>
          </Link>
        }
      />
    );
  }

  const aba: AbaPagamento =
    abaEscolhida ?? (cobranca && cobranca.metodo !== 'PIX' ? 'CARTAO' : 'PIX');
  const cobrancaPix = cobranca?.pix ?? null;
  const emAndamento = iniciar.isPending || simular.isPending;

  function pagarComCartao(entrada: {
    metodo: MetodoPagamento;
    cartao: ResumoCartao;
    previsao: GatewayPrediction;
  }) {
    iniciar.mutate(
      { metodo: entrada.metodo, cartao: entrada.cartao },
      {
        onSuccess: (aberta) => {
          /*
           * RF-030 — o desfecho do gateway simulado é determinístico pelo último
           * dígito (`domain/pix.ts#desfechoDeterministico`). Encadear a
           * notificação aqui é o que faz o cartão "que recusa" realmente
           * recusar; `EM_ANALISE` não dispara nada e a cobrança fica aguardando,
           * que é exatamente o que "em análise" significa.
           */
          if (entrada.previsao === 'APROVADO') {
            simular.mutate({ pagamentoId: aberta.id, desfecho: 'CONFIRMAR' });
          } else if (entrada.previsao === 'RECUSADO') {
            simular.mutate({ pagamentoId: aberta.id, desfecho: 'RECUSAR' });
          }
        },
      },
    );
  }

  function simularDesfecho(desfecho: DesfechoSimulado) {
    if (!cobranca) return;
    simular.mutate({ pagamentoId: cobranca.id, desfecho });
  }

  return (
    <article>
      <Cabecalho titulo={evento.titulo} inicio={evento.inicio} local={evento.local} />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <p className="font-mono text-mono-xs uppercase text-text-muted">Valor da inscrição</p>
          <p className="mt-1 font-display text-display-md font-bold text-text">
            {formatPrice(evento.preco)}
          </p>
        </div>
        <StatusBadge status={inscricao.status} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-5 text-center">
        <p className="font-mono text-mono-xs uppercase text-text-muted">Tempo para pagar</p>
        <p
          aria-hidden="true"
          className="mt-2 font-mono text-display-2xl font-bold tabular-nums text-accent-strong"
        >
          {contagem.relogio ?? '--:--'}
        </p>
        <p className="sr-only">
          {contagem.minutos == null
            ? 'Prazo de pagamento não informado.'
            : `Faltam ${contagem.minutos} minutos para o fim do prazo de pagamento.`}
        </p>
        {inscricao.pagamentoExpiraEm && (
          <p className="mx-auto mt-2 max-w-content text-body-sm text-text-muted">
            A vaga fica reservada até {formatTime(inscricao.pagamentoExpiraEm)}. Passado o prazo,
            ela volta para a fila automaticamente.
          </p>
        )}
      </div>

      <div className="mt-6">
        <Tabs<AbaPagamento>
          rotuloAcessivel="Forma de pagamento"
          ativa={aba}
          onSelecionar={setAbaEscolhida}
          abas={[
            { valor: 'PIX', rotulo: 'Pix' },
            { valor: 'CARTAO', rotulo: 'Cartão' },
          ]}
        />
      </div>

      <div id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`}>
        {pagamento.isError && (
          <ErrorState
            mensagem={mensagemDeErro(pagamento.error)}
            onTentarDeNovo={() => void pagamento.refetch()}
          />
        )}

        {!pagamento.isError && aba === 'PIX' && (
          <div>
            {pagamento.isPending ? (
              <Skeleton className="h-qr w-full" />
            ) : cobrancaPix ? (
              <PixPanel cobranca={cobrancaPix} />
            ) : (
              <div className="rounded-lg border border-border bg-surface p-6 text-center">
                <p className="font-display text-display-sm font-bold text-text">
                  {cobranca?.status === 'RECUSADO'
                    ? 'A cobrança anterior foi recusada'
                    : 'Pagar com Pix'}
                </p>
                <p className="mx-auto mt-2 max-w-content text-body-sm text-text-muted">
                  {cobranca?.status === 'RECUSADO'
                    ? 'Gere uma nova cobrança para tentar de novo — a vaga continua sua até o fim do prazo.'
                    : 'Geramos um QR Code e um código copia e cola simulados, para a demonstração do fluxo.'}
                </p>
                <div className="mt-5">
                  <Button
                    size="lg"
                    larguraTotal
                    carregando={iniciar.isPending}
                    onClick={() => iniciar.mutate({ metodo: 'PIX' })}
                  >
                    Gerar cobrança Pix
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!pagamento.isError && aba === 'CARTAO' && (
          <div>
            {cobranca?.cartao && (
              <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3">
                <p className="font-mono text-mono-xs uppercase text-text-muted">Cartão enviado</p>
                <p className="mt-1 text-body-md text-text">
                  {cobranca.cartao.bandeira} ···· {cobranca.cartao.ultimosQuatro} ·{' '}
                  {cobranca.cartao.titular}
                </p>
                <p className="mt-1 text-body-xs text-text-muted">
                  Situação da cobrança: {cobranca.status}.
                </p>
              </div>
            )}
            <CardForm onEnviar={pagarComCartao} enviando={emAndamento} />
          </div>
        )}
      </div>

      {cobranca && (
        <GatewaySimulator
          pagamento={cobranca}
          onSimular={simularDesfecho}
          simulando={simular.isPending}
        />
      )}
    </article>
  );
}

function Cabecalho({ titulo, inicio, local }: { titulo: string; inicio: string; local: string }) {
  return (
    <header className="mb-5">
      <p className="font-mono text-mono-xs uppercase text-accent-strong">Pagamento</p>
      <h1 className="mt-1 font-display text-display-lg font-bold text-text">{titulo}</h1>
      <p className="mt-2 font-mono text-mono-sm text-text-muted">
        {formatEventDateTime(inicio)} · {local}
      </p>
    </header>
  );
}

/** Cada estado tem sua explicação: "não há pagamento" sozinho não ajuda ninguém. */
function mensagemSemPagamento(status: StatusParticipacao): string {
  switch (status) {
    case 'LISTA_ESPERA':
      return 'Você está na lista de espera. O pagamento só abre quando uma vaga é oferecida e você a confirma.';
    case 'OFERTA_PENDENTE':
      return 'Há uma vaga oferecida para você. Confirme-a na tela do evento e o pagamento abre em seguida.';
    case 'CANCELADA':
      return 'Esta inscrição foi cancelada, então não há cobrança em aberto.';
    case 'AUSENTE':
      return 'Esta inscrição foi marcada como ausente no evento.';
    default:
      return 'Esta inscrição não está aguardando pagamento.';
  }
}
