import { useState } from 'react';
import type { CobrancaPix } from '../../types/domain';
import { formatTime } from '../../domain/format';
import { Button } from '../../components/ui/Button';
import { QrCode } from '../../components/ui/QrCode';

/**
 * Cobrança Pix simulada (RF-027).
 *
 * O aviso de que a cobrança é simulada vem ANTES do QR, e não em nota de pé de
 * página: um QR de Pix na tela é um convite a pagar, e ninguém pode pagar isto.
 * O `brCode` tem formato EMV real (com CRC16 válido) e chave fictícia — ver
 * `domain/pix.ts`.
 */
export function PixPanel({ cobranca }: { cobranca: CobrancaPix }) {
  const [copia, setCopia] = useState<'inicial' | 'copiado' | 'falhou'>('inicial');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cobranca.brCode);
      setCopia('copiado');
    } catch {
      // Área de transferência bloqueada (permissão negada, contexto não seguro):
      // o código continua na tela para seleção manual, então não é beco sem saída.
      setCopia('falhou');
    }
  }

  return (
    <div>
      <div className="rounded-md border-2 border-accent-strong bg-accent-soft px-4 py-3">
        <p className="font-display text-display-sm font-bold text-coral-800">
          Cobrança simulada — não pague este código
        </p>
        <p className="mt-1 text-body-sm text-coral-800">
          O QR abaixo é gerado no seu navegador, com chave fictícia, e não chega a banco nenhum.
          Nenhum centavo sai de nenhuma conta. Confirme o pagamento pelo painel de simulação no fim
          da tela.
        </p>
      </div>

      <div className="mx-auto mt-5 w-ticket max-w-full">
        <QrCode codigo={cobranca.brCode} />
      </div>

      <dl className="mt-5 space-y-2 font-mono text-mono-sm text-text-muted">
        <div className="flex justify-between gap-4">
          <dt>Chave</dt>
          <dd className="text-right text-text">{cobranca.chave}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Válido até</dt>
          <dd className="text-right text-text">{formatTime(cobranca.expiraEm)}</dd>
        </div>
      </dl>

      <p className="mt-5 font-mono text-mono-xs uppercase text-text-muted">Pix copia e cola</p>
      <code className="mt-2 block break-all rounded-md border border-border bg-surface-2 p-3 font-mono text-mono-sm text-text">
        {cobranca.brCode}
      </code>

      <div className="mt-3">
        <Button variant="ghost" larguraTotal onClick={() => void copiar()}>
          {copia === 'copiado' ? 'Copiado' : 'Copiar código'}
        </Button>
      </div>

      <p aria-live="polite" className="mt-2 text-body-xs text-text-muted">
        {copia === 'copiado'
          ? 'Código copiado para a área de transferência.'
          : copia === 'falhou'
            ? 'Não conseguimos copiar por você. Selecione o código acima e copie à mão.'
            : 'O código também pode ser selecionado à mão, se preferir.'}
      </p>
    </div>
  );
}
