import type { DesfechoSimulado, PagamentoView } from '../../types/domain';
import type { ButtonVariant } from '../../components/ui/Button';
import { Button } from '../../components/ui/Button';

/**
 * Painel de simulação do gateway (ADR-0007).
 *
 * No CP6 quem chama estes desfechos é o provedor de pagamento, por webhook. Aqui
 * os botões existem porque a alternativa seria esperar um gateway que não existe
 * — e porque a idempotência de RN-014 é invisível quando tudo dá certo na
 * primeira tentativa: `DUPLICAR` é o único jeito de mostrá-la funcionando.
 */

const ACOES: Array<{
  desfecho: DesfechoSimulado;
  rotulo: string;
  variante: ButtonVariant;
  explicacao: string;
}> = [
  {
    desfecho: 'CONFIRMAR',
    rotulo: 'Confirmar',
    variante: 'secondary',
    explicacao: 'Pagamento identificado: a inscrição passa a CONFIRMADA e o ingresso é emitido.',
  },
  {
    desfecho: 'RECUSAR',
    rotulo: 'Recusar',
    variante: 'danger',
    explicacao: 'Pagamento negado pelo emissor. A vaga segue reservada até o fim da janela.',
  },
  {
    desfecho: 'DUPLICAR',
    rotulo: 'Duplicar',
    variante: 'ghost',
    explicacao:
      'Reenvia a mesma notificação: por RN-014 a segunda não muda nada — nada é cobrado nem contado duas vezes.',
  },
];

export function GatewaySimulator({
  pagamento,
  onSimular,
  simulando,
}: {
  pagamento: PagamentoView;
  onSimular: (desfecho: DesfechoSimulado) => void;
  simulando: boolean;
}) {
  return (
    <section className="mt-8 rounded-lg border-2 border-dashed border-border-strong bg-surface-2 p-5">
      <h2 className="font-display text-display-sm font-bold text-text">
        Simulação do gateway — ferramenta de demonstração
      </h2>
      <p className="mt-2 text-body-sm text-text-muted">
        Não existe provedor de pagamento no CP5. Estes botões disparam a notificação que, no CP6, o
        gateway envia sozinho. Eles ficam visíveis de propósito: esconder a simulação seria fingir
        que há uma cobrança de verdade.
      </p>

      <dl className="mt-4 space-y-2 font-mono text-mono-sm text-text-muted">
        <div className="flex justify-between gap-4">
          <dt>Status</dt>
          <dd className="text-right text-text">{pagamento.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Chave de idempotência</dt>
          <dd className="break-all text-right text-text">{pagamento.chaveIdempotencia}</dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-3">
        {ACOES.map((acao) => (
          <li key={acao.desfecho}>
            <Button
              variant={acao.variante}
              larguraTotal
              disabled={simulando}
              onClick={() => onSimular(acao.desfecho)}
            >
              {acao.rotulo}
            </Button>
            <p className="mt-2 text-body-xs text-text-muted">{acao.explicacao}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
