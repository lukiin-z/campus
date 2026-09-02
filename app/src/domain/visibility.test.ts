import { describe, expect, it } from 'vitest';
import { alcanceBadge, ancoraCoerente, ancoraDoEvento, canChangeScope, canSee } from './visibility';
import type { Evento, PapelUsuario, Usuario } from '../types/domain';

/**
 * Alcance e visibilidade — RN-001 e RN-002.
 * Casos de teste CT-011, CT-012 e CT-013 (docs/11-plano-de-testes.md).
 *
 * Esta é a regra central do produto: se ela falhar, o Campus perde a razão de
 * existir. Por isso é o arquivo de teste com mais casos de recusa.
 */

const marina: Pick<Usuario, 'id' | 'turmaId' | 'cursoId' | 'faculdadeId' | 'papeis'> = {
  id: 'usr-001',
  turmaId: 'tur-001', // 3ESPX
  cursoId: 'cur-001', // Engenharia de Computação
  faculdadeId: 'fac-001',
  papeis: ['ALUNO'],
};

const felipe = { ...marina, id: 'usr-007', turmaId: 'tur-004', cursoId: 'cur-003' };
const adminFaculdade = {
  ...marina,
  id: 'usr-010',
  papeis: ['ALUNO', 'ADMIN_FACULDADE'] as PapelUsuario[],
};

function evento(
  parcial: Partial<
    Pick<Evento, 'alcance' | 'turmaId' | 'cursoId' | 'faculdadeId' | 'organizadorId' | 'status'>
  >,
) {
  return {
    alcance: 'TURMA' as const,
    turmaId: 'tur-001',
    cursoId: null,
    faculdadeId: null,
    organizadorId: 'usr-002',
    status: 'PUBLICADO' as const,
    ...parcial,
  };
}

describe('ancoraCoerente — exatamente uma âncora (RN-001)', () => {
  it('evento de turma com turmaId é coerente', () => {
    expect(ancoraCoerente(evento({}))).toBe(true);
  });

  it('evento de curso com cursoId é coerente', () => {
    expect(ancoraCoerente(evento({ alcance: 'CURSO', turmaId: null, cursoId: 'cur-001' }))).toBe(
      true,
    );
  });

  it('duas âncoras preenchidas é incoerente', () => {
    expect(ancoraCoerente(evento({ cursoId: 'cur-001' }))).toBe(false);
  });

  it('nenhuma âncora preenchida é incoerente', () => {
    expect(ancoraCoerente(evento({ turmaId: null }))).toBe(false);
  });

  it('âncora que não corresponde ao alcance é incoerente', () => {
    expect(ancoraCoerente(evento({ alcance: 'FACULDADE', turmaId: 'tur-001' }))).toBe(false);
  });

  it('ancoraDoEvento devolve a âncora do nível certo', () => {
    expect(ancoraDoEvento(evento({}))).toBe('tur-001');
    expect(ancoraDoEvento(evento({ alcance: 'CURSO', turmaId: null, cursoId: 'cur-001' }))).toBe(
      'cur-001',
    );
  });
});

describe('canSee — alcance TURMA (RN-001)', () => {
  it('CT-011: quem é da turma vê o churrasco da 3ESPX', () => {
    expect(canSee(marina, evento({}))).toBe(true);
  });

  it('CT-011: quem é de OUTRA turma não vê — nem sabe que existe', () => {
    expect(canSee(felipe, evento({}))).toBe(false);
  });

  it('CT-012: nem por acesso direto ao ID: a função não tem exceção para isso', () => {
    // Não há parâmetro "veio por link direto". A única exceção é participação
    // ativa, o que é deliberado (ver abaixo).
    expect(canSee(felipe, evento({}), {})).toBe(false);
  });
});

describe('canSee — alcance CURSO e FACULDADE', () => {
  const eventoCurso = evento({ alcance: 'CURSO', turmaId: null, cursoId: 'cur-001' });
  const eventoFaculdade = evento({ alcance: 'FACULDADE', turmaId: null, faculdadeId: 'fac-001' });

  it('CT-011: aluno do curso vê o evento de curso, mesmo sendo de outra turma', () => {
    const gabriela = { ...marina, id: 'usr-008', turmaId: 'tur-002' };
    expect(canSee(gabriela, eventoCurso)).toBe(true);
  });

  it('CT-011: aluno de outro curso não vê o evento de curso', () => {
    expect(canSee(felipe, eventoCurso)).toBe(false);
  });

  it('CT-011: todo aluno verificado da faculdade vê o evento de faculdade', () => {
    expect(canSee(marina, eventoFaculdade)).toBe(true);
    expect(canSee(felipe, eventoFaculdade)).toBe(true);
  });
});

describe('canSee — exceções deliberadas', () => {
  it('CT-011: o organizador sempre vê o próprio evento, inclusive rascunho', () => {
    const rascunho = evento({ status: 'RASCUNHO', organizadorId: 'usr-001' });
    expect(canSee(marina, rascunho)).toBe(true);
  });

  it('CT-011: rascunho de outra pessoa não aparece para ninguém', () => {
    const rascunho = evento({ status: 'RASCUNHO' });
    expect(canSee(marina, rascunho)).toBe(false);
  });

  it('CT-011: quem tem participação ativa continua vendo, mesmo perdendo o vínculo', () => {
    // Cenário real: o aluno trocou de turma. Perder o acesso ao próprio ingresso
    // seria pior que a inconsistência.
    expect(canSee(felipe, evento({}), { temParticipacaoAtiva: true })).toBe(true);
  });

  it('CT-014: evento em aprovação só é visto por Admin de Faculdade', () => {
    const emAprovacao = evento({
      alcance: 'FACULDADE',
      turmaId: null,
      faculdadeId: 'fac-001',
      status: 'EM_APROVACAO',
    });
    expect(canSee(marina, emAprovacao)).toBe(false);
    expect(canSee(adminFaculdade, emAprovacao)).toBe(true);
  });

  it('Admin de Faculdade vê qualquer evento publicado da sua faculdade', () => {
    const eventoDeTurmaAlheia = evento({ turmaId: 'tur-004', faculdadeId: null });
    expect(canSee({ ...adminFaculdade, turmaId: 'tur-003' }, eventoDeTurmaAlheia)).toBe(false);
  });
});

describe('canChangeScope — RN-002', () => {
  it('CT-013: em rascunho o alcance é livre', () => {
    expect(
      canChangeScope({ alcance: 'TURMA', status: 'RASCUNHO' }, 'FACULDADE', false).allowed,
    ).toBe(true);
  });

  it('CT-013: publicado, o alcance NÃO pode ser ampliado', () => {
    const resultado = canChangeScope({ alcance: 'TURMA', status: 'PUBLICADO' }, 'CURSO', false);
    expect(resultado.allowed).toBe(false);
    expect(resultado.reason).toContain('ampliado');
  });

  it('CT-013: reduzir é permitido se ninguém com vaga ficaria de fora', () => {
    expect(
      canChangeScope({ alcance: 'FACULDADE', status: 'PUBLICADO' }, 'CURSO', false).allowed,
    ).toBe(true);
  });

  it('CT-013: reduzir é recusado se há participação ativa incompatível', () => {
    const resultado = canChangeScope({ alcance: 'FACULDADE', status: 'PUBLICADO' }, 'TURMA', true);
    expect(resultado.allowed).toBe(false);
    expect(resultado.reason).toContain('já têm vaga');
  });

  it('CT-013: manter o mesmo alcance é sempre permitido', () => {
    expect(canChangeScope({ alcance: 'TURMA', status: 'PUBLICADO' }, 'TURMA', true).allowed).toBe(
      true,
    );
  });
});

describe('alcanceBadge — o rótulo é relativo a quem olha', () => {
  it('para quem é da turma, o badge diz "minha turma"', () => {
    expect(alcanceBadge(marina, { alcance: 'TURMA', turmaId: 'tur-001', cursoId: null })).toBe(
      'minha turma',
    );
  });

  it('para quem é do curso, diz "meu curso"', () => {
    expect(alcanceBadge(marina, { alcance: 'CURSO', turmaId: null, cursoId: 'cur-001' })).toBe(
      'meu curso',
    );
  });

  it('evento de faculdade é sempre "faculdade"', () => {
    expect(alcanceBadge(marina, { alcance: 'FACULDADE', turmaId: null, cursoId: null })).toBe(
      'faculdade',
    );
  });
});
