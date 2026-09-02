import { useEffect, useState } from 'react';
import { minutesLeftToPay } from '../../domain/payment';

/**
 * Contagem regressiva da janela de pagamento (RN-012).
 *
 * A tela mostra um cronômetro que anda de segundo em segundo, mas a autoridade
 * sobre o prazo é o servidor: `minutosRestantes` vem na `PagamentoView`. Este
 * hook reconcilia as duas leituras e nunca escolhe a mais otimista — um
 * cronômetro que promete um minuto que a API já considera vencido faria a pessoa
 * perder a vaga confiando na tela.
 */

export interface PaymentCountdown {
  /** Minutos restantes, já reconciliados. `null` quando não há janela aberta. */
  minutos: number | null;
  /** `mm:ss` para o mostrador. `null` quando não há janela. */
  relogio: string | null;
  expirada: boolean;
}

export function usePaymentCountdown(
  expiraEm: string | null | undefined,
  minutosDoServidor: number | null | undefined,
): PaymentCountdown {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    // Sem prazo, ou com prazo que o servidor já declarou vencido, não há o que
    // contar: o intervalo nem é criado.
    if (!expiraEm || minutosDoServidor === 0) return undefined;

    const limite = new Date(expiraEm).getTime();
    if (Date.now() >= limite) {
      // O prazo mudou para um instante já vencido: sem isto a contagem
      // congelaria no valor calculado antes da troca.
      setAgora(Date.now());
      return undefined;
    }

    const intervalo = window.setInterval(() => {
      const agoraMs = Date.now();
      setAgora(agoraMs);
      // Vencido, o intervalo se encerra: redesenhar "00:00" a cada segundo em
      // uma tela esquecida aberta é bateria gasta por nada.
      if (agoraMs >= limite) window.clearInterval(intervalo);
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [expiraEm, minutosDoServidor]);

  if (!expiraEm) {
    return {
      minutos: minutosDoServidor ?? null,
      relogio: null,
      expirada: minutosDoServidor === 0,
    };
  }

  const local = minutesLeftToPay({ pagamentoExpiraEm: expiraEm }, new Date(agora));

  /*
   * `min` das duas fontes: o valor do servidor envelhece entre dois refetches
   * (por isso o local existe), e o relógio do cliente pode estar adiantado (por
   * isso o do servidor manda). Se qualquer uma das duas diz zero, é zero.
   */
  const minutos =
    local == null
      ? (minutosDoServidor ?? null)
      : minutosDoServidor == null
        ? local
        : Math.min(local, minutosDoServidor);

  const restanteMs = minutos === 0 ? 0 : Math.max(0, new Date(expiraEm).getTime() - agora);
  const segundos = Math.floor(restanteMs / 1000);
  const relogio = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(
    segundos % 60,
  ).padStart(2, '0')}`;

  return { minutos, relogio, expirada: minutos === 0 };
}
