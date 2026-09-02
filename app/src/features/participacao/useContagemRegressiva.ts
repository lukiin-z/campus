import { useEffect, useState } from 'react';
import { toMs } from '../../domain/policy';

/**
 * Contagem regressiva até um instante.
 *
 * O intervalo se auto-encerra ao vencer o prazo: um `setInterval` de 1 s que
 * roda para sempre em uma tela aberta na mesa é bateria gasta para redesenhar
 * "0 s".
 */
export interface ContagemRegressiva {
  restanteMs: number;
  expirado: boolean;
}

export function useContagemRegressiva(expiraEm: string): ContagemRegressiva {
  const limiteMs = toMs(expiraEm);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= limiteMs) {
      // O prazo trocou para um instante já vencido: sem isto a contagem
      // congelaria no valor calculado antes da troca.
      setAgoraMs(Date.now());
      return undefined;
    }

    const timer = window.setInterval(() => {
      const agora = Date.now();
      setAgoraMs(agora);
      if (agora >= limiteMs) window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [limiteMs]);

  const restanteMs = Math.max(0, limiteMs - agoraMs);
  return { restanteMs, expirado: restanteMs === 0 };
}
