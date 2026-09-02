import { describe, expect, it } from 'vitest';
import {
  formatPrice,
  idempotencyKey,
  minutesLeftToPay,
  paymentDeadline,
  paymentExpired,
  planWebhook,
} from './payment';

/**
 * Pagamento — RN-012 e RN-014.
 * Casos de teste CT-007 e CT-010 (docs/11-plano-de-testes.md).
 */

const AGORA = '2026-09-01T10:00:00.000Z';
const CHURRASCO = {
  inicio: '2026-09-12T16:00:00.000Z',
  prazoInscricao: '2026-09-12T14:00:00.000Z',
};

describe('paymentDeadline — a janela é o MENOR dos três limites (RN-012)', () => {
  it('CT-007: com o evento distante, vale a janela de 60 min', () => {
    expect(paymentDeadline(CHURRASCO, AGORA)).toBe('2026-09-01T11:00:00.000Z');
  });

  it('CT-007: perto do prazo de inscrição, a janela é truncada pelo prazo', () => {
    const quaseNoPrazo = '2026-09-12T13:30:00.000Z';
    expect(paymentDeadline(CHURRASCO, quaseNoPrazo)).toBe('2026-09-12T14:00:00.000Z');
  });

  it('CT-007: a janela nunca invade o evento — no máximo 1 h antes do início', () => {
    const eventoSemPrazoCurto = {
      inicio: '2026-09-01T10:30:00.000Z',
      prazoInscricao: '2026-09-01T10:29:00.000Z',
    };
    expect(paymentDeadline(eventoSemPrazoCurto, AGORA)).toBe('2026-09-01T09:30:00.000Z');
  });
});

describe('paymentExpired e minutesLeftToPay', () => {
  it('CT-007: janela vencida é detectada e libera a vaga', () => {
    const participacao = {
      status: 'PENDENTE_PAGAMENTO' as const,
      pagamentoExpiraEm: '2026-09-01T09:00:00.000Z',
    };
    expect(paymentExpired(participacao, AGORA)).toBe(true);
  });

  it('CT-007: dentro da janela não expirou', () => {
    const participacao = {
      status: 'PENDENTE_PAGAMENTO' as const,
      pagamentoExpiraEm: '2026-09-01T10:42:00.000Z',
    };
    expect(paymentExpired(participacao, AGORA)).toBe(false);
    expect(minutesLeftToPay(participacao, AGORA)).toBe(42);
  });

  it('CT-007: participação confirmada não é candidata a expirar por pagamento', () => {
    expect(
      paymentExpired(
        { status: 'CONFIRMADA', pagamentoExpiraEm: '2026-01-01T00:00:00.000Z' },
        AGORA,
      ),
    ).toBe(false);
  });

  it('a contagem nunca fica negativa: zero significa "acabou"', () => {
    expect(minutesLeftToPay({ pagamentoExpiraEm: '2026-09-01T09:00:00.000Z' }, AGORA)).toBe(0);
    expect(minutesLeftToPay({ pagamentoExpiraEm: null }, AGORA)).toBeNull();
  });
});

describe('idempotencyKey — derivada de dado estável (RN-014)', () => {
  it('a mesma notificação produz sempre a mesma chave', () => {
    expect(idempotencyKey('par-001', 'gw-8842')).toBe('pay:par-001:gw-8842');
    expect(idempotencyKey('par-001', 'gw-8842')).toBe(idempotencyKey('par-001', 'gw-8842'));
  });

  it('transações diferentes produzem chaves diferentes', () => {
    expect(idempotencyKey('par-001', 'gw-8842')).not.toBe(idempotencyKey('par-001', 'gw-9013'));
  });
});

describe('planWebhook — decisão sobre a notificação do gateway (RN-014)', () => {
  const pagamento = { id: 'pag-001', status: 'AGUARDANDO' as const, valor: 25 };
  const participacao = { status: 'PENDENTE_PAGAMENTO' as const };
  const notificacao = { transacaoExternaId: 'gw-8842', valorPago: 25, pago: true };

  it('CT-010: notificação legítima confirma o pagamento', () => {
    expect(planWebhook(pagamento, participacao, notificacao)).toEqual({
      tipo: 'CONFIRMAR',
      pagamentoId: 'pag-001',
    });
  });

  it('CT-010: a MESMA notificação repetida é ignorada — nenhuma transição, nenhum aviso', () => {
    const jaConfirmado = { ...pagamento, status: 'CONFIRMADO' as const };
    expect(planWebhook(jaConfirmado, participacao, notificacao)).toEqual({
      tipo: 'IGNORAR_DUPLICADA',
      pagamentoId: 'pag-001',
    });
  });

  it('CT-010: valor divergente NUNCA confirma automaticamente', () => {
    const resultado = planWebhook(pagamento, participacao, { ...notificacao, valorPago: 20 });
    expect(resultado.tipo).toBe('DIVERGENCIA_DE_VALOR');
    if (resultado.tipo !== 'DIVERGENCIA_DE_VALOR') throw new Error('esperava divergência');
    expect(resultado.esperado).toBe(25);
    expect(resultado.recebido).toBe(20);
  });

  it('CT-010: pagamento que chega depois da expiração é estornado, não confirmado', () => {
    const resultado = planWebhook(pagamento, { status: 'EXPIRADA' }, notificacao);
    expect(resultado.tipo).toBe('ESTORNAR');
    if (resultado.tipo !== 'ESTORNAR') throw new Error('esperava estorno');
    expect(resultado.motivo).toContain('expirou');
  });

  it('CT-010: pagamento sobre participação cancelada também é estornado', () => {
    expect(planWebhook(pagamento, { status: 'CANCELADA' }, notificacao).tipo).toBe('ESTORNAR');
  });

  it('CT-010: notificação de "não pago" não muda nada', () => {
    expect(planWebhook(pagamento, participacao, { ...notificacao, pago: false }).tipo).toBe(
      'DESCONHECIDO',
    );
  });

  it('tolera diferença de arredondamento de centavo abaixo de um milésimo', () => {
    expect(planWebhook(pagamento, participacao, { ...notificacao, valorPago: 25.0001 }).tipo).toBe(
      'CONFIRMAR',
    );
  });
});

describe('formatPrice — a UI nunca mostra "R$ 0,00"', () => {
  it('zero vira "Gratuito"', () => {
    expect(formatPrice(0)).toBe('Gratuito');
  });

  it('valor positivo sai em reais', () => {
    // `toLocaleString` usa espaco estreito sem quebra entre simbolo e numero;
    // normalizamos para espaco comum antes de comparar.
    const espacosEstreitos = [String.fromCharCode(0x00a0), String.fromCharCode(0x202f)];
    const normalizar = (valor: string) =>
      espacosEstreitos.reduce((texto, espaco) => texto.split(espaco).join(' '), valor);
    expect(normalizar(formatPrice(25))).toBe('R$ 25,00');
    expect(normalizar(formatPrice(45.5))).toBe('R$ 45,50');
  });
});
