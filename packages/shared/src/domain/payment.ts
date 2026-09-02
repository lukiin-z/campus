import type { Evento, Pagamento, Participacao } from '../types';
import { HOUR_MS, MINUTE_MS, POLICY, toMs } from './policy';

/**
 * Pagamento — RN-012 e RN-014.
 *
 * Duas garantias vivem aqui: a vaga não fica presa para sempre esperando
 * pagamento, e a mesma notificação do gateway nunca é processada duas vezes.
 */

/**
 * RN-012 — `min(agora + 60min, prazoInscricao, inicio - 1h)`.
 * A janela nunca ultrapassa o prazo de inscrição nem invade o evento.
 */
export function paymentDeadline(
  event: Pick<Evento, 'inicio' | 'prazoInscricao'>,
  now: Date | string,
): string {
  const candidates = [
    toMs(now) + POLICY.PAYMENT_WINDOW_MINUTES * MINUTE_MS,
    toMs(event.prazoInscricao),
    toMs(event.inicio) - HOUR_MS,
  ];
  return new Date(Math.min(...candidates)).toISOString();
}

export function paymentExpired(
  participacao: Pick<Participacao, 'status' | 'pagamentoExpiraEm'>,
  now: Date | string,
): boolean {
  if (participacao.status !== 'PENDENTE_PAGAMENTO' || !participacao.pagamentoExpiraEm) return false;
  return toMs(now) > toMs(participacao.pagamentoExpiraEm);
}

/** Minutos restantes da janela — a tela mostra contagem explícita, não "aguarde". */
export function minutesLeftToPay(
  participacao: Pick<Participacao, 'pagamentoExpiraEm'>,
  now: Date | string,
): number | null {
  if (!participacao.pagamentoExpiraEm) return null;
  const diff = toMs(participacao.pagamentoExpiraEm) - toMs(now);
  return diff <= 0 ? 0 : Math.ceil(diff / MINUTE_MS);
}

/**
 * Chave de idempotência da notificação do gateway (RN-014).
 * Derivada de dados estáveis: o mesmo evento externo produz sempre a mesma chave.
 */
export function idempotencyKey(participacaoId: string, transacaoExternaId: string): string {
  return `pay:${participacaoId}:${transacaoExternaId}`;
}

export type WebhookOutcome =
  | { tipo: 'CONFIRMAR'; pagamentoId: string }
  | { tipo: 'IGNORAR_DUPLICADA'; pagamentoId: string }
  | { tipo: 'ESTORNAR'; pagamentoId: string; motivo: string }
  | { tipo: 'DIVERGENCIA_DE_VALOR'; pagamentoId: string; esperado: number; recebido: number }
  | { tipo: 'DESCONHECIDO' };

/**
 * RN-014 — decide o que fazer com uma notificação do gateway. Função pura:
 * a decisão é separada da escrita para poder ser testada exaustivamente (CT-010).
 *
 * Ordem das verificações não é acidental:
 * 1. duplicada  → não repete transição nem notificação;
 * 2. valor divergente → nunca confirma automaticamente;
 * 3. participação já encerrada → estorna, porque a vaga pode já ser de outro.
 */
export function planWebhook(
  pagamento: Pick<Pagamento, 'id' | 'status' | 'valor'>,
  participacao: Pick<Participacao, 'status'>,
  notificacao: { transacaoExternaId: string; valorPago: number; pago: boolean },
): WebhookOutcome {
  if (!notificacao.pago) return { tipo: 'DESCONHECIDO' };

  if (pagamento.status === 'CONFIRMADO') {
    return { tipo: 'IGNORAR_DUPLICADA', pagamentoId: pagamento.id };
  }

  if (Math.abs(notificacao.valorPago - pagamento.valor) > 0.001) {
    return {
      tipo: 'DIVERGENCIA_DE_VALOR',
      pagamentoId: pagamento.id,
      esperado: pagamento.valor,
      recebido: notificacao.valorPago,
    };
  }

  if (participacao.status !== 'PENDENTE_PAGAMENTO') {
    return {
      tipo: 'ESTORNAR',
      pagamentoId: pagamento.id,
      motivo:
        participacao.status === 'EXPIRADA'
          ? 'A vaga expirou antes do pagamento ser identificado e foi liberada para a fila.'
          : 'A inscrição não estava mais aguardando pagamento.',
    };
  }

  return { tipo: 'CONFIRMAR', pagamentoId: pagamento.id };
}

/** Formata em reais. `0` é "Gratuito" — a UI nunca mostra "R$ 0,00". */
export function formatPrice(valor: number): string {
  if (valor <= 0) return 'Gratuito';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
