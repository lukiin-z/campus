import { describe, expect, it } from 'vitest';
import {
  nextWaitlistPosition,
  offerDeadline,
  offerExpired,
  orderedWaitlist,
  planPromotion,
  recomputePositions,
  waitlistPositionLabel,
  waitlistSize,
} from './waitlist';
import type { Participacao, StatusParticipacao } from '../types';

/**
 * Lista de espera — RN-006, RN-007 e RN-008.
 * Casos de teste CT-003 a CT-006 (docs/11-plano-de-testes.md).
 *
 * O cenário base é o hackathon do seed: evento lotado (80/80) com 7 pessoas na
 * fila. `evt-002`, começando em 17 dias.
 */

const AGORA = new Date('2026-09-01T10:00:00.000Z');
const EVENTO = {
  inicio: new Date('2026-09-18T21:00:00.000Z').toISOString(),
  status: 'PUBLICADO' as const,
};

type FilaItem = Pick<Participacao, 'id' | 'usuarioId' | 'status' | 'posicaoFila' | 'criadoEm'>;

function fila(...posicoes: number[]): FilaItem[] {
  return posicoes.map((posicao, indice) => ({
    id: `par-0${20 + indice}`,
    usuarioId: `usr-00${indice + 1}`,
    status: 'LISTA_ESPERA' as StatusParticipacao,
    posicaoFila: posicao,
    criadoEm: new Date(AGORA.getTime() - (10 - posicao) * 3_600_000).toISOString(),
  }));
}

describe('orderedWaitlist e waitlistSize (RN-006)', () => {
  it('CT-003: ordena por posição, ignorando quem não está na fila', () => {
    const participacoes: FilaItem[] = [
      ...fila(3, 1, 2),
      {
        id: 'par-010',
        usuarioId: 'usr-099',
        status: 'CONFIRMADA',
        posicaoFila: null,
        criadoEm: AGORA.toISOString(),
      },
    ];
    expect(orderedWaitlist(participacoes).map((p) => p.posicaoFila)).toEqual([1, 2, 3]);
    expect(waitlistSize(participacoes)).toBe(3);
  });

  it('CT-003: empate de posição cai no instante de entrada — a fila é FIFO', () => {
    const antigo: FilaItem = {
      id: 'par-antigo',
      usuarioId: 'usr-001',
      status: 'LISTA_ESPERA',
      posicaoFila: 1,
      criadoEm: '2026-08-30T10:00:00.000Z',
    };
    const recente: FilaItem = {
      ...antigo,
      id: 'par-recente',
      criadoEm: '2026-08-31T10:00:00.000Z',
    };
    expect(orderedWaitlist([recente, antigo])[0]?.id).toBe('par-antigo');
  });

  it('CT-003: quem entra agora vai para o fim da fila', () => {
    expect(nextWaitlistPosition(fila(1, 2, 3, 4, 5, 6, 7))).toBe(8);
  });

  it('CT-003: em fila vazia, a primeira posição é 1', () => {
    expect(nextWaitlistPosition([])).toBe(1);
  });
});

describe('offerDeadline — janela da oferta (RN-007, item 5)', () => {
  it('CT-004: com o evento distante, a janela é de 24 h', () => {
    const { expiresAt, viable } = offerDeadline(EVENTO, AGORA);
    expect(viable).toBe(true);
    expect(new Date(expiresAt).getTime() - AGORA.getTime()).toBe(24 * 3_600_000);
  });

  it('CT-004: perto do evento, a janela é truncada para 1 h antes do início', () => {
    const quaseNaHora = new Date('2026-09-18T15:00:00.000Z');
    const { expiresAt } = offerDeadline(EVENTO, quaseNaHora);
    expect(new Date(expiresAt).toISOString()).toBe('2026-09-18T20:00:00.000Z');
  });

  it('CT-004: janela menor que 15 min não é viável — a vaga volta ao pool', () => {
    const emCima = new Date('2026-09-18T19:55:00.000Z');
    expect(offerDeadline(EVENTO, emCima).viable).toBe(false);
  });
});

describe('planPromotion — a decisão de RN-007', () => {
  it('CT-004: promove o PRIMEIRO da fila, e só ele', () => {
    const resultado = planPromotion(EVENTO, fila(1, 2, 3), AGORA);
    expect(resultado.tipo).toBe('PROMOVER');
    if (resultado.tipo !== 'PROMOVER') throw new Error('esperava promoção');
    expect(resultado.participacaoId).toBe('par-020');
    expect(new Date(resultado.ofertaExpiraEm).getTime()).toBeGreaterThan(AGORA.getTime());
  });

  it('CT-004: fila vazia devolve a vaga para inscrição normal', () => {
    expect(planPromotion(EVENTO, [], AGORA).tipo).toBe('FILA_VAZIA');
  });

  it('CT-004: evento não publicado não promove ninguém', () => {
    const cancelado = { ...EVENTO, status: 'CANCELADO' as const };
    expect(planPromotion(cancelado, fila(1, 2), AGORA).tipo).toBe('FILA_VAZIA');
  });

  it('CT-004: janela inviável explica o motivo em vez de emitir oferta inútil', () => {
    const emCima = new Date('2026-09-18T19:55:00.000Z');
    const resultado = planPromotion(EVENTO, fila(1), emCima);
    expect(resultado.tipo).toBe('JANELA_INVIAVEL');
  });
});

describe('recomputePositions — as posições andam (RN-007, item 4)', () => {
  it('CT-005: com o 1º promovido, quem era 2º e 3º passa a 1º e 2º', () => {
    // O promovido saiu de LISTA_ESPERA, então já não está na fila.
    const restante = fila(2, 3);
    expect(recomputePositions(restante)).toEqual([
      { id: 'par-020', posicaoFila: 1 },
      { id: 'par-021', posicaoFila: 2 },
    ]);
  });

  it('CT-005: fila já correta não gera nenhuma mudança', () => {
    expect(recomputePositions(fila(1, 2, 3))).toEqual([]);
  });

  it('CT-005: Marina, 7ª de 7, passa a 6ª quando a 1ª é promovida', () => {
    const restante = fila(2, 3, 4, 5, 6, 7);
    const mudancas = recomputePositions(restante);
    expect(mudancas[mudancas.length - 1]).toEqual({ id: 'par-025', posicaoFila: 6 });
  });
});

describe('offerExpired — RN-008', () => {
  it('CT-006: oferta vencida é detectada', () => {
    const participacao = {
      status: 'OFERTA_PENDENTE' as StatusParticipacao,
      ofertaExpiraEm: '2026-09-01T09:00:00.000Z',
    };
    expect(offerExpired(participacao, AGORA)).toBe(true);
  });

  it('CT-006: oferta dentro da janela não expirou', () => {
    const participacao = {
      status: 'OFERTA_PENDENTE' as StatusParticipacao,
      ofertaExpiraEm: '2026-09-02T09:00:00.000Z',
    };
    expect(offerExpired(participacao, AGORA)).toBe(false);
  });

  it('CT-006: participação sem oferta nunca expira por esta regra', () => {
    expect(offerExpired({ status: 'LISTA_ESPERA', ofertaExpiraEm: null }, AGORA)).toBe(false);
  });
});

describe('waitlistPositionLabel — tom de voz: número, não adjetivo', () => {
  it('usa ordinal em português', () => {
    expect(waitlistPositionLabel(7)).toBe('Você é o 7º da fila');
  });
});
