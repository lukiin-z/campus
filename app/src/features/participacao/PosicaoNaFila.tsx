import { forwardRef } from 'react';
import { POLICY, waitlistPositionLabel } from '@campus/shared';

/**
 * Posição na lista de espera (RF-021).
 *
 * A fila só deixa de ser espera cega se a posição for um número visível: é a
 * diferença entre "estou na lista" e "tem uma pessoa na minha frente, vale
 * esperar". A regra da janela de confirmação aparece aqui, antes de a oferta
 * chegar — quem descobre o prazo junto com a oferta descobre tarde.
 *
 * Recebe `ref` porque o botão principal do estado `VER_FILA` (cujo rótulo É a
 * posição) traz o foco para cá.
 */
export const PosicaoNaFila = forwardRef<
  HTMLElement,
  { posicao: number; totalNaFila: number; precisaPagar: boolean }
>(function PosicaoNaFila({ posicao, totalNaFila, precisaPagar }, ref) {
  const naFrente = Math.max(0, posicao - 1);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="fila-titulo"
      className="mt-5 rounded-lg border border-border bg-surface-2 p-4"
    >
      <h2 id="fila-titulo" className="font-display text-display-sm font-bold text-text">
        {waitlistPositionLabel(posicao)}
      </h2>

      <p className="mt-2 text-body-sm text-text-muted">
        {naFrente === 0
          ? 'Ninguém na sua frente: a próxima vaga que abrir é oferecida a você.'
          : `${naFrente} ${naFrente === 1 ? 'pessoa' : 'pessoas'} na sua frente.`}
        {totalNaFila > 1 && ` São ${totalNaFila} pessoas na fila.`}
      </p>

      <p className="mt-2 text-body-sm text-text-muted">
        Quando abrir vaga, você recebe um aviso e tem {POLICY.WAITLIST_OFFER_WINDOW_HOURS} h para
        confirmar. Se o prazo passar, a vez segue para a próxima pessoa — sem punição, e você pode
        entrar na fila de novo.
        {precisaPagar &&
          ` Como o evento é pago, depois de confirmar você tem ${POLICY.PAYMENT_WINDOW_MINUTES} min para pagar.`}
      </p>
    </section>
  );
});
