import { describe, expect, it } from 'vitest';
import {
  alcanceBadge,
  alcanceRotulo,
  ancoraCoerente,
  ancoraDoEvento,
  ancoraPermitida,
  canChangeScope,
  canSee,
} from './visibility';
import type { Evento, PapelUsuario, Usuario } from '../types';

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

/*
 * `alcanceRotulo` e `ancoraPermitida` fecham o buraco que a medição do CP6
 * apontou: `visibility.ts` estava com 71,42% de cobertura de funções, e as duas
 * eram as que faltavam. `alcanceRotulo` é o texto que aparece no cartão de todo
 * evento da lista — errar nele é errar em toda a tela inicial.
 */
const REFS = {
  turmas: [
    { id: 'tur-001', nome: '3ESPX', cursoId: 'cur-001', codigoConvite: '3ESPX-26' },
    { id: 'tur-004', nome: '2ADSY', cursoId: 'cur-003', codigoConvite: '2ADSY-26' },
  ] as never,
  cursos: [
    { id: 'cur-001', nome: 'Engenharia de Computação', faculdadeId: 'fac-001' },
    { id: 'cur-003', nome: 'Análise e Desenvolvimento de Sistemas', faculdadeId: 'fac-001' },
  ] as never,
  faculdade: { id: 'fac-001', nome: 'FIAP', sigla: 'FIAP', dominioEmail: 'fiap.com.br' } as never,
};

describe('alcanceRotulo', () => {
  it('evento de turma mostra o nome da turma', () => {
    expect(alcanceRotulo({ alcance: 'TURMA', turmaId: 'tur-001', cursoId: null }, REFS)).toBe(
      '3ESPX',
    );
  });

  it('evento de curso mostra o nome do curso', () => {
    expect(alcanceRotulo({ alcance: 'CURSO', turmaId: null, cursoId: 'cur-001' }, REFS)).toBe(
      'Engenharia de Computação',
    );
  });

  it('evento de faculdade mostra a sigla, não o nome inteiro', () => {
    expect(alcanceRotulo({ alcance: 'FACULDADE', turmaId: null, cursoId: null }, REFS)).toBe(
      'FIAP',
    );
  });

  it('âncora que não está nas referências cai num rótulo genérico, sem quebrar', () => {
    /*
     * O caso acontece de verdade: a lista de turmas vem de outra requisição, e
     * ela pode não ter chegado. Melhor "Turma" do que `undefined` no cartão — e
     * melhor ainda do que uma exceção que apaga a tela.
     */
    expect(alcanceRotulo({ alcance: 'TURMA', turmaId: 'tur-999', cursoId: null }, REFS)).toBe(
      'Turma',
    );
    expect(alcanceRotulo({ alcance: 'CURSO', turmaId: null, cursoId: 'cur-999' }, REFS)).toBe(
      'Curso',
    );
  });

  it('âncora nula com alcance que a exige também não quebra', () => {
    expect(alcanceRotulo({ alcance: 'TURMA', turmaId: null, cursoId: null }, REFS)).toBe('Turma');
  });
});

describe('ancoraPermitida', () => {
  it('devolve a turma do usuário para alcance de turma', () => {
    expect(ancoraPermitida(marina, 'TURMA')).toBe(marina.turmaId);
  });

  it('devolve o curso do usuário para alcance de curso', () => {
    expect(ancoraPermitida(marina, 'CURSO')).toBe(marina.cursoId);
  });

  it('devolve a faculdade do usuário para alcance de faculdade', () => {
    /*
     * Evento de faculdade TEM âncora — `faculdadeId` —, e este caso está aqui
     * porque a primeira versão dele afirmou o contrário e reprovou. RN-001 pede
     * exatamente UMA âncora preenchida, coerente com o alcance, e `FACULDADE`
     * não é exceção: `ancoraCoerente` exige `faculdadeId != null`, e o
     * `CHECK ck_evento_ancora_coerente` do banco recusa a linha sem ela.
     *
     * Quem confunde os dois é `alcanceRotulo`, que para faculdade lê a sigla das
     * referências e não a âncora — mas isso é a apresentação, não a regra.
     */
    expect(ancoraPermitida(marina, 'FACULDADE')).toBe(marina.faculdadeId);
  });

  it('nunca devolve âncora de nível diferente do alcance pedido', () => {
    const permitida = ancoraPermitida(marina, 'TURMA');
    expect(permitida).not.toBe(marina.cursoId);
    expect(permitida).not.toBe(marina.faculdadeId);
  });
});
