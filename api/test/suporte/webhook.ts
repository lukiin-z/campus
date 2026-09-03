import { createHmac } from 'node:crypto';

/**
 * Notificação assinada do gateway — o outro lado de RN-014.
 *
 * A assinatura é um HMAC-SHA256 sobre os BYTES enviados, e é por isso que este
 * helper devolve a string do corpo junto com a assinatura: assinar um objeto e
 * deixar o cliente HTTP reserializá-lo quebra na primeira diferença de ordem de
 * chave ou de espaçamento. O `rawBody: true` de `src/main.ts` existe pelo mesmo
 * motivo, do lado do servidor.
 *
 * O segredo vem de `process.env.WEBHOOK_SECRET` — o mesmo valor que
 * `test/suporte/ambiente.ts` sorteou e que a API leu no boot. Nenhum segredo
 * literal aparece em teste.
 */

export interface NotificacaoAssinada {
  /** O corpo exatamente como vai no `send()`. */
  readonly corpo: string;
  /** O valor do cabeçalho `X-Assinatura`. */
  readonly assinatura: string;
}

export interface DadosDaNotificacao {
  readonly transacaoExternaId: string;
  readonly chaveIdempotencia: string;
  readonly valorPago: number;
  readonly pago: boolean;
}

export function assinarNotificacao(dados: DadosDaNotificacao): NotificacaoAssinada {
  const segredo = process.env.WEBHOOK_SECRET;
  if (segredo === undefined || segredo.length === 0) {
    throw new Error('WEBHOOK_SECRET ausente: test/suporte/ambiente.ts não rodou.');
  }

  const corpo = JSON.stringify(dados);
  return {
    corpo,
    assinatura: createHmac('sha256', segredo).update(corpo, 'utf8').digest('hex'),
  };
}
