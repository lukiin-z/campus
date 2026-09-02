import { describe, expect, it } from 'vitest';
import { computeRefund, currentPolicy, policySummary } from './refund';

/**
 * Política de reembolso — RN-013.
 * Casos de teste CT-008 e CT-009 (docs/11-plano-de-testes.md).
 *
 * Cenário: churrasco do seed (`evt-001`), R$ 25,00, começando em 12/09/2026 13h.
 */

const INICIO = '2026-09-12T16:00:00.000Z';
const EVENTO = { inicio: INICIO };
const VALOR = 25;
const POLITICA = currentPolicy('2026-09-01T10:00:00.000Z');

describe('computeRefund — faixas da escala (RN-013)', () => {
  it('CT-008: cancelamento com 11 dias de antecedência devolve 100%', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'ALUNO_CANCELOU',
      '2026-09-01T10:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('INTEGRAL');
    expect(resultado.taxa).toBe(1);
    expect(resultado.valor).toBe(25);
  });

  it('CT-008: exatamente 7 dias antes ainda é integral — o limite é inclusivo', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'ALUNO_CANCELOU',
      '2026-09-05T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('INTEGRAL');
  });

  it('CT-008: 3 dias antes cai na faixa parcial de 50%', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'ALUNO_CANCELOU',
      '2026-09-09T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('PARCIAL');
    expect(resultado.taxa).toBe(0.5);
    expect(resultado.valor).toBe(12.5);
  });

  it('CT-008: exatamente 48 h antes ainda é parcial', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'ALUNO_CANCELOU',
      '2026-09-10T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('PARCIAL');
  });

  it('CT-008: 24 h antes não devolve nada — mas a vaga é liberada para a fila', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'ALUNO_CANCELOU',
      '2026-09-11T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('SEM_REEMBOLSO');
    expect(resultado.valor).toBe(0);
    expect(resultado.explicacao).toContain('fila de espera');
  });
});

describe('computeRefund — quem muda as condições assume o custo (RN-013)', () => {
  it('CT-009: cancelamento pelo organizador devolve 100%, mesmo 1 h antes', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'EVENTO_CANCELADO',
      '2026-09-12T15:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('INTEGRAL');
    expect(resultado.valor).toBe(25);
    expect(resultado.explicacao).toContain('cancelado pelo organizador');
  });

  it('CT-009: alteração de data, local ou preço também devolve 100%', () => {
    const resultado = computeRefund(
      EVENTO,
      VALOR,
      'EVENTO_ALTERADO',
      '2026-09-12T15:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('INTEGRAL');
    expect(resultado.explicacao).toContain('alterou');
  });
});

describe('computeRefund — evento gratuito', () => {
  it('CT-009: não há valor a devolver, e a explicação diz isso', () => {
    const resultado = computeRefund(
      EVENTO,
      0,
      'ALUNO_CANCELOU',
      '2026-09-01T10:00:00.000Z',
      POLITICA,
    );
    expect(resultado.faixa).toBe('SEM_REEMBOLSO');
    expect(resultado.valor).toBe(0);
    expect(resultado.explicacao).toContain('gratuito');
  });
});

describe('arredondamento de centavos', () => {
  it('50% de R$ 45,00 é R$ 22,50', () => {
    const resultado = computeRefund(
      EVENTO,
      45,
      'ALUNO_CANCELOU',
      '2026-09-09T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.valor).toBe(22.5);
  });

  it('50% de R$ 15,00 é R$ 7,50, sem dízima', () => {
    const resultado = computeRefund(
      EVENTO,
      15,
      'ALUNO_CANCELOU',
      '2026-09-09T16:00:00.000Z',
      POLITICA,
    );
    expect(resultado.valor).toBe(7.5);
  });
});

describe('policySummary — a política é exibida ANTES da cobrança', () => {
  it('descreve as quatro situações, em linguagem de aluno', () => {
    const linhas = policySummary(POLITICA);
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toContain('100%');
    expect(linhas[1]).toContain('50%');
    expect(linhas[2]).toContain('sem devolução');
    expect(linhas[3]).toContain('organizador');
  });
});
