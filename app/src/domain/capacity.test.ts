import { describe, expect, it } from 'vitest';
import {
  availableSpots,
  canChangeCapacity,
  isFull,
  isValidCapacity,
  occupancyRate,
  occupiesSpot,
  spotsOpenedByCapacityChange,
} from './capacity';

/**
 * Capacidade e vagas — RN-004 e RN-005.
 * Casos de teste CT-001, CT-002 e CT-021 (docs/11-plano-de-testes.md).
 */

const churrasco = { capacidade: 40, ocupadas: 18 };
const hackathon = { capacidade: 80, ocupadas: 80 };

describe('occupiesSpot — quais estados consomem vaga (RN-004)', () => {
  it('CT-001: pendente de pagamento OCUPA vaga, para não vender a mesma vaga duas vezes', () => {
    expect(occupiesSpot('PENDENTE_PAGAMENTO')).toBe(true);
  });

  it('CT-001: oferta pendente OCUPA vaga, porque a vaga fica reservada durante a janela', () => {
    expect(occupiesSpot('OFERTA_PENDENTE')).toBe(true);
  });

  it('CT-001: confirmada e presente ocupam vaga', () => {
    expect(occupiesSpot('CONFIRMADA')).toBe(true);
    expect(occupiesSpot('PRESENTE')).toBe(true);
  });

  it('CT-001: lista de espera NÃO ocupa vaga', () => {
    expect(occupiesSpot('LISTA_ESPERA')).toBe(false);
  });

  it('CT-001: estados terminais liberam a vaga', () => {
    expect(occupiesSpot('CANCELADA')).toBe(false);
    expect(occupiesSpot('EXPIRADA')).toBe(false);
    expect(occupiesSpot('AUSENTE')).toBe(false);
  });
});

describe('availableSpots e isFull', () => {
  it('CT-002: o churrasco do seed (18/40) tem 22 vagas livres e não está lotado', () => {
    expect(availableSpots(churrasco)).toBe(22);
    expect(isFull(churrasco)).toBe(false);
  });

  it('CT-002: o hackathon do seed (80/80) está lotado, com zero vagas', () => {
    expect(availableSpots(hackathon)).toBe(0);
    expect(isFull(hackathon)).toBe(true);
  });

  it('nunca devolve vaga negativa, mesmo com dado inconsistente vindo do servidor', () => {
    expect(availableSpots({ capacidade: 10, ocupadas: 13 })).toBe(0);
  });

  it('taxa de ocupação satura em 1', () => {
    expect(occupancyRate(churrasco)).toBeCloseTo(0.45);
    expect(occupancyRate({ capacidade: 10, ocupadas: 13 })).toBe(1);
    expect(occupancyRate({ capacidade: 0, ocupadas: 0 })).toBe(0);
  });
});

describe('isValidCapacity — faixa permitida (RN-011)', () => {
  it('aceita a faixa de 2 a 2000', () => {
    expect(isValidCapacity(2)).toBe(true);
    expect(isValidCapacity(40)).toBe(true);
    expect(isValidCapacity(2000)).toBe(true);
  });

  it('recusa fora da faixa e valor não inteiro', () => {
    expect(isValidCapacity(1)).toBe(false);
    expect(isValidCapacity(2001)).toBe(false);
    expect(isValidCapacity(40.5)).toBe(false);
  });
});

describe('canChangeCapacity — RN-005', () => {
  it('CT-021: aumentar a capacidade é sempre permitido', () => {
    expect(canChangeCapacity(churrasco, 60).allowed).toBe(true);
  });

  it('CT-021: diminuir até o número de ocupadas é permitido', () => {
    expect(canChangeCapacity(churrasco, 18).allowed).toBe(true);
  });

  it('CT-021: diminuir abaixo das ocupadas é recusado — ninguém perde vaga já aceita', () => {
    const resultado = canChangeCapacity(churrasco, 17);
    expect(resultado.allowed).toBe(false);
    expect(resultado.reason).toContain('18');
  });

  it('CT-021: capacidade inválida é recusada com a faixa na mensagem', () => {
    const resultado = canChangeCapacity(churrasco, 1);
    expect(resultado.allowed).toBe(false);
    expect(resultado.reason).toContain('2');
    expect(resultado.reason).toContain('2000');
  });

  it('conta quantas vagas o aumento abriu — cada uma dispara uma promoção da fila', () => {
    expect(spotsOpenedByCapacityChange(80, 83)).toBe(3);
    expect(spotsOpenedByCapacityChange(80, 80)).toBe(0);
    expect(spotsOpenedByCapacityChange(80, 70)).toBe(0);
  });
});
