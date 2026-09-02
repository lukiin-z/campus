import { describe, expect, it } from 'vitest';
import {
  STATUS_PARTICIPACAO_ROTULO,
  allowedTransitions,
  canTransition,
  findActiveParticipation,
  isActive,
  isTerminal,
  organizerIsParticipant,
} from './participation';
import { STATUS_PARTICIPACAO, type StatusParticipacao } from '../types/domain';

/**
 * Ciclo de vida de `Participacao` — RN-015, RN-016 e RN-023.
 * Casos de teste CT-018, CT-019 e CT-029 (docs/11-plano-de-testes.md).
 *
 * A parte mais importante deste arquivo é a lista de transições PROIBIDAS: é o
 * que o diagrama de estados documenta e o que o código tem de impedir.
 */

describe('isActive e isTerminal (RN-015)', () => {
  it('CT-018: os cinco estados ativos', () => {
    expect(isActive('PENDENTE_PAGAMENTO')).toBe(true);
    expect(isActive('CONFIRMADA')).toBe(true);
    expect(isActive('LISTA_ESPERA')).toBe(true);
    expect(isActive('OFERTA_PENDENTE')).toBe(true);
    expect(isActive('PRESENTE')).toBe(true);
  });

  it('CT-018: os três estados terminais não bloqueiam nova participação', () => {
    expect(isTerminal('CANCELADA')).toBe(true);
    expect(isTerminal('EXPIRADA')).toBe(true);
    expect(isTerminal('AUSENTE')).toBe(true);
    expect(isActive('CANCELADA')).toBe(false);
  });

  it('todo estado é exatamente ativo OU terminal — não há terceira categoria', () => {
    for (const status of STATUS_PARTICIPACAO) {
      expect(isActive(status) !== isTerminal(status)).toBe(true);
    }
  });
});

describe('canTransition — transições permitidas', () => {
  it('CT-029: pendente de pagamento pode confirmar, expirar ou cancelar', () => {
    expect(canTransition('PENDENTE_PAGAMENTO', 'CONFIRMADA')).toBe(true);
    expect(canTransition('PENDENTE_PAGAMENTO', 'EXPIRADA')).toBe(true);
    expect(canTransition('PENDENTE_PAGAMENTO', 'CANCELADA')).toBe(true);
  });

  it('CT-029: da lista de espera só se sai por oferta ou por cancelamento', () => {
    expect(allowedTransitions('LISTA_ESPERA')).toEqual(['OFERTA_PENDENTE', 'CANCELADA']);
  });

  it('CT-029: aceitar oferta em evento pago vai para pendente de pagamento (RN-007)', () => {
    expect(canTransition('OFERTA_PENDENTE', 'PENDENTE_PAGAMENTO')).toBe(true);
    expect(canTransition('OFERTA_PENDENTE', 'CONFIRMADA')).toBe(true);
  });

  it('CT-029: confirmada vira presente, ausente ou cancelada', () => {
    expect(canTransition('CONFIRMADA', 'PRESENTE')).toBe(true);
    expect(canTransition('CONFIRMADA', 'AUSENTE')).toBe(true);
    expect(canTransition('CONFIRMADA', 'CANCELADA')).toBe(true);
  });
});

describe('canTransition — as oito transições PROIBIDAS do diagrama de estados', () => {
  const proibidas: Array<[StatusParticipacao, StatusParticipacao, string]> = [
    ['LISTA_ESPERA', 'CONFIRMADA', 'pularia a oferta com janela (RN-007)'],
    ['CONFIRMADA', 'PENDENTE_PAGAMENTO', 'não se descobra uma vaga já paga (RN-013)'],
    ['EXPIRADA', 'CONFIRMADA', 'estado terminal'],
    ['CANCELADA', 'CONFIRMADA', 'burlaria a fila'],
    ['AUSENTE', 'PRESENTE', 'correção cria nova presença (RN-018)'],
    ['PRESENTE', 'CANCELADA', 'presença é fato imutável (RN-022)'],
    ['PENDENTE_PAGAMENTO', 'PRESENTE', 'entrar sem pagar (RN-017, condição 4)'],
    ['LISTA_ESPERA', 'PRESENTE', 'check-in sem vaga confirmada'],
  ];

  it.each(proibidas)('CT-029: %s -> %s é recusada (%s)', (de, para) => {
    expect(canTransition(de, para)).toBe(false);
  });

  it('CT-029: nenhum estado terminal tem saída', () => {
    expect(allowedTransitions('CANCELADA')).toEqual([]);
    expect(allowedTransitions('EXPIRADA')).toEqual([]);
    expect(allowedTransitions('AUSENTE')).toEqual([]);
    expect(allowedTransitions('PRESENTE')).toEqual([]);
  });
});

describe('organizerIsParticipant — RN-016', () => {
  it('CT-019: criar evento não inscreve o organizador', () => {
    const participacoes = [{ usuarioId: 'usr-001', status: 'CONFIRMADA' as StatusParticipacao }];
    expect(organizerIsParticipant('usr-002', participacoes)).toBe(false);
  });

  it('CT-019: o organizador que se inscreve conta como participante e ocupa vaga', () => {
    const participacoes = [{ usuarioId: 'usr-002', status: 'CONFIRMADA' as StatusParticipacao }];
    expect(organizerIsParticipant('usr-002', participacoes)).toBe(true);
  });

  it('CT-019: participação cancelada do organizador não o torna participante', () => {
    const participacoes = [{ usuarioId: 'usr-002', status: 'CANCELADA' as StatusParticipacao }];
    expect(organizerIsParticipant('usr-002', participacoes)).toBe(false);
  });
});

describe('findActiveParticipation — RN-015', () => {
  const participacoes = [
    { id: 'par-antiga', usuarioId: 'usr-001', status: 'CANCELADA' as StatusParticipacao },
    { id: 'par-atual', usuarioId: 'usr-001', status: 'LISTA_ESPERA' as StatusParticipacao },
    { id: 'par-outro', usuarioId: 'usr-002', status: 'CONFIRMADA' as StatusParticipacao },
  ];

  it('CT-018: encontra a participação ativa, ignorando o histórico', () => {
    expect(findActiveParticipation(participacoes, 'usr-001')?.id).toBe('par-atual');
  });

  it('CT-018: devolve null quando só existe histórico', () => {
    const soHistorico = [participacoes[0]!];
    expect(findActiveParticipation(soHistorico, 'usr-001')).toBeNull();
  });

  it('CT-018: não confunde participação de outro aluno', () => {
    expect(findActiveParticipation(participacoes, 'usr-003')).toBeNull();
  });
});

describe('rótulos em português — tom de voz da marca', () => {
  it('todo estado tem rótulo, e nenhum é o próprio enum', () => {
    for (const status of STATUS_PARTICIPACAO) {
      const rotulo = STATUS_PARTICIPACAO_ROTULO[status];
      expect(rotulo).toBeTruthy();
      expect(rotulo).not.toBe(status);
      expect(rotulo).toBe(rotulo.toLowerCase());
    }
  });

  it('não usa jargão técnico nem anglicismo evitável', () => {
    expect(STATUS_PARTICIPACAO_ROTULO.AUSENTE).toBe('ausente');
    expect(STATUS_PARTICIPACAO_ROTULO.LISTA_ESPERA).toBe('lista de espera');
  });
});
