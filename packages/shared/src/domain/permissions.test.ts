import { describe, expect, it } from 'vitest';
import type { Evento, Usuario } from '../types';
import {
  canApproveCollegeEvent,
  canCancelEvent,
  canEditEvent,
  canPostToEvent,
  canRemovePost,
  canValidateCheckIn,
  canViewAttendanceList,
  isAdminOfScope,
  isCollegeAdmin,
  isCourseAdmin,
  isOrganizer,
  requiresApproval,
} from './permissions';

/**
 * CT-030 — papéis e permissões (RN-003, RN-019, RN-020, RN-023, RN-024).
 *
 * Este arquivo não existia até o CP5, e a revisão de documentação achou o
 * número que explica por quê: **12 funções exportadas, 0% de cobertura de
 * funções**. É a regra com mais superfície do projeto e era a com menos prova —
 * e permissão errada não falha em teste de tela, falha em vazamento.
 *
 * O foco é o **negativo**: para cada função, quem NÃO pode. Autorização que só
 * é testada pelo caminho de quem pode é autorização não testada.
 */

const FACULDADE = 'fac-001';

function ator(
  id: string,
  papeis: Usuario['papeis'],
  cursoId: string | null = 'cur-001',
): Pick<Usuario, 'id' | 'papeis' | 'cursoId' | 'faculdadeId'> {
  return { id, papeis, cursoId, faculdadeId: FACULDADE };
}

const ALUNO = ator('usr-001', ['ALUNO']);
const ORGANIZADOR = ator('usr-002', ['ALUNO']);
const ADMIN_CURSO = ator('usr-009', ['ALUNO', 'ADMIN_CURSO']);
const ADMIN_CURSO_ALHEIO = ator('usr-020', ['ALUNO', 'ADMIN_CURSO'], 'cur-002');
const ADMIN_FACULDADE = ator('usr-010', ['ALUNO', 'ADMIN_FACULDADE'], 'cur-002');
const ADMIN_OUTRA_FACULDADE = {
  ...ator('usr-030', ['ALUNO', 'ADMIN_FACULDADE']),
  faculdadeId: 'fac-999',
};

function evento(
  sobrescreve: Partial<Evento> = {},
): Pick<
  Evento,
  'organizadorId' | 'cursoId' | 'faculdadeId' | 'status' | 'inicio' | 'alcance' | 'turmaId'
> {
  return {
    organizadorId: 'usr-002',
    alcance: 'CURSO',
    turmaId: null,
    cursoId: 'cur-001',
    faculdadeId: null,
    status: 'PUBLICADO',
    inicio: '2026-09-12T13:00:00.000Z',
    ...sobrescreve,
  };
}

describe('isOrganizer — papel por evento, não tipo de usuário', () => {
  it('é verdadeiro só para quem criou aquele evento', () => {
    expect(isOrganizer(ORGANIZADOR, evento())).toBe(true);
    expect(isOrganizer(ALUNO, evento())).toBe(false);
    // Admin de faculdade NÃO é organizador de tudo: são coisas diferentes.
    expect(isOrganizer(ADMIN_FACULDADE, evento())).toBe(false);
  });
});

describe('papéis administrativos', () => {
  it('lê o papel do usuário, não do evento', () => {
    expect(isCourseAdmin(ADMIN_CURSO)).toBe(true);
    expect(isCourseAdmin(ADMIN_FACULDADE)).toBe(false);
    expect(isCollegeAdmin(ADMIN_FACULDADE)).toBe(true);
    expect(isCollegeAdmin(ADMIN_CURSO)).toBe(false);
    expect(isCourseAdmin(ALUNO)).toBe(false);
    expect(isCollegeAdmin(ALUNO)).toBe(false);
  });
});

describe('isAdminOfScope — competência é por escopo, não por cargo', () => {
  it('admin de curso governa o próprio curso', () => {
    expect(isAdminOfScope(ADMIN_CURSO, evento({ cursoId: 'cur-001' }))).toBe(true);
  });

  it('admin de curso NÃO governa o curso alheio', () => {
    // O caso que mais importa: o cargo existe, o escopo não bate.
    expect(isAdminOfScope(ADMIN_CURSO_ALHEIO, evento({ cursoId: 'cur-001' }))).toBe(false);
  });

  it('admin de curso não governa evento de faculdade', () => {
    const facultativo = evento({ alcance: 'FACULDADE', cursoId: null, faculdadeId: FACULDADE });
    expect(isAdminOfScope(ADMIN_CURSO, facultativo)).toBe(false);
  });

  it('admin de faculdade governa evento da própria faculdade', () => {
    const facultativo = evento({ alcance: 'FACULDADE', cursoId: null, faculdadeId: FACULDADE });
    expect(isAdminOfScope(ADMIN_FACULDADE, facultativo)).toBe(true);
  });

  it('admin de OUTRA faculdade não governa nada aqui', () => {
    const facultativo = evento({ alcance: 'FACULDADE', cursoId: null, faculdadeId: FACULDADE });
    expect(isAdminOfScope(ADMIN_OUTRA_FACULDADE, facultativo)).toBe(false);
  });

  it('evento de turma não tem admin de escopo: só o organizador', () => {
    // `cursoId` e `faculdadeId` nulos em evento de TURMA (RN-001, âncora única).
    const daTurma = evento({ alcance: 'TURMA', turmaId: 'tur-001', cursoId: null });
    expect(isAdminOfScope(ADMIN_CURSO, daTurma)).toBe(false);
    expect(isAdminOfScope(ADMIN_FACULDADE, daTurma)).toBe(false);
    expect(isOrganizer(ORGANIZADOR, daTurma)).toBe(true);
  });
});

describe('canEditEvent', () => {
  it('organizador e admin do escopo editam', () => {
    expect(canEditEvent(ORGANIZADOR, evento())).toBe(true);
    expect(canEditEvent(ADMIN_CURSO, evento())).toBe(true);
  });

  it('aluno comum não edita evento alheio', () => {
    expect(canEditEvent(ALUNO, evento())).toBe(false);
  });

  it('ninguém edita evento cancelado ou realizado — nem o organizador', () => {
    // O estado do evento vence a permissão. É o que impede reescrever história.
    expect(canEditEvent(ORGANIZADOR, evento({ status: 'CANCELADO' }))).toBe(false);
    expect(canEditEvent(ORGANIZADOR, evento({ status: 'REALIZADO' }))).toBe(false);
    expect(canEditEvent(ADMIN_FACULDADE, evento({ status: 'REALIZADO' }))).toBe(false);
  });

  it('rascunho e em aprovação continuam editáveis', () => {
    expect(canEditEvent(ORGANIZADOR, evento({ status: 'RASCUNHO' }))).toBe(true);
    expect(canEditEvent(ORGANIZADOR, evento({ status: 'EM_APROVACAO' }))).toBe(true);
  });
});

describe('canCancelEvent', () => {
  it('cancela só o que está publicado ou em aprovação', () => {
    expect(canCancelEvent(ORGANIZADOR, evento({ status: 'PUBLICADO' }))).toBe(true);
    expect(canCancelEvent(ORGANIZADOR, evento({ status: 'EM_APROVACAO' }))).toBe(true);
    // Rascunho não se cancela: se apaga. Cancelar dispara aviso a inscritos.
    expect(canCancelEvent(ORGANIZADOR, evento({ status: 'RASCUNHO' }))).toBe(false);
    expect(canCancelEvent(ORGANIZADOR, evento({ status: 'CANCELADO' }))).toBe(false);
    expect(canCancelEvent(ORGANIZADOR, evento({ status: 'REALIZADO' }))).toBe(false);
  });

  it('aluno comum não cancela evento alheio', () => {
    expect(canCancelEvent(ALUNO, evento())).toBe(false);
  });
});

describe('canApproveCollegeEvent (RN-003)', () => {
  const paraAprovar = evento({
    alcance: 'FACULDADE',
    cursoId: null,
    faculdadeId: FACULDADE,
    status: 'EM_APROVACAO',
  });

  it('só admin de faculdade da MESMA faculdade aprova', () => {
    expect(canApproveCollegeEvent(ADMIN_FACULDADE, paraAprovar)).toBe(true);
    expect(canApproveCollegeEvent(ADMIN_OUTRA_FACULDADE, paraAprovar)).toBe(false);
  });

  it('admin de curso não aprova evento de faculdade, nem o organizador', () => {
    // Se o organizador pudesse aprovar o próprio evento, a aprovação não existiria.
    expect(canApproveCollegeEvent(ADMIN_CURSO, paraAprovar)).toBe(false);
    expect(canApproveCollegeEvent(ORGANIZADOR, paraAprovar)).toBe(false);
  });
});

describe('requiresApproval (RN-003)', () => {
  it('evento de faculdade criado por aluno comum nasce em aprovação', () => {
    expect(requiresApproval(ALUNO, 'FACULDADE')).toBe(true);
    expect(requiresApproval(ADMIN_CURSO, 'FACULDADE')).toBe(true);
  });

  it('admin de faculdade publica direto', () => {
    expect(requiresApproval(ADMIN_FACULDADE, 'FACULDADE')).toBe(false);
  });

  it('turma e curso nunca precisam de aprovação', () => {
    expect(requiresApproval(ALUNO, 'TURMA')).toBe(false);
    expect(requiresApproval(ALUNO, 'CURSO')).toBe(false);
  });
});

describe('canValidateCheckIn e canViewAttendanceList', () => {
  it('organizador e admin do escopo validam; aluno comum não', () => {
    expect(canValidateCheckIn(ORGANIZADOR, evento())).toBe(true);
    expect(canValidateCheckIn(ADMIN_CURSO, evento())).toBe(true);
    expect(canValidateCheckIn(ALUNO, evento())).toBe(false);
    expect(canValidateCheckIn(ADMIN_CURSO_ALHEIO, evento())).toBe(false);
  });

  it('em evento de turma, só o organizador valida', () => {
    // É o caso do evento em andamento do seed: nem admin de curso nem de
    // faculdade abrem o painel, porque a âncora é a turma.
    const daTurma = evento({ alcance: 'TURMA', turmaId: 'tur-001', cursoId: null });
    expect(canValidateCheckIn(ORGANIZADOR, daTurma)).toBe(true);
    expect(canValidateCheckIn(ADMIN_FACULDADE, daTurma)).toBe(false);
  });

  it('ver a lista de presença exige a mesma competência de validar', () => {
    // Ler quem esteve no evento é dado pessoal (RNF-021): não é mais frouxo.
    for (const pessoa of [ORGANIZADOR, ADMIN_CURSO, ALUNO, ADMIN_CURSO_ALHEIO]) {
      expect(canViewAttendanceList(pessoa, evento())).toBe(canValidateCheckIn(pessoa, evento()));
    }
  });
});

describe('canRemovePost (RN-020)', () => {
  const publicacao = { autorId: 'usr-001' };

  it('o próprio autor remove a própria publicação', () => {
    expect(canRemovePost(ALUNO, publicacao, evento())).toBe(true);
  });

  it('o organizador do evento remove publicação de terceiro', () => {
    expect(canRemovePost(ORGANIZADOR, publicacao, evento())).toBe(true);
  });

  it('admin do escopo remove; admin de escopo alheio não', () => {
    expect(canRemovePost(ADMIN_CURSO, publicacao, evento())).toBe(true);
    expect(canRemovePost(ADMIN_CURSO_ALHEIO, publicacao, evento())).toBe(false);
  });

  it('outro aluno não remove publicação alheia', () => {
    const terceiro = ator('usr-008', ['ALUNO']);
    expect(canRemovePost(terceiro, publicacao, evento())).toBe(false);
  });
});

describe('canPostToEvent (RN-019)', () => {
  const depoisDoInicio = new Date('2026-09-12T18:00:00.000Z');
  const antesDoInicio = new Date('2026-09-10T10:00:00.000Z');

  it('quem esteve no evento publica depois do início', () => {
    expect(canPostToEvent(ALUNO, evento(), 'PRESENTE', depoisDoInicio)).toBe(true);
  });

  it('estar inscrito NÃO basta: o feed é memória do que aconteceu', () => {
    // Este é o critério que o handler não aplicava. `CONFIRMADA` e, pior,
    // `LISTA_ESPERA` publicavam por requisição direta.
    expect(canPostToEvent(ALUNO, evento(), 'CONFIRMADA', depoisDoInicio)).toBe(false);
    expect(canPostToEvent(ALUNO, evento(), 'LISTA_ESPERA', depoisDoInicio)).toBe(false);
    expect(canPostToEvent(ALUNO, evento(), 'OFERTA_PENDENTE', depoisDoInicio)).toBe(false);
    expect(canPostToEvent(ALUNO, evento(), null, depoisDoInicio)).toBe(false);
  });

  it('antes do início, só o organizador publica', () => {
    expect(canPostToEvent(ORGANIZADOR, evento(), null, antesDoInicio)).toBe(true);
    expect(canPostToEvent(ALUNO, evento(), 'PRESENTE', antesDoInicio)).toBe(false);
  });

  it('evento cancelado não recebe publicação nem do organizador', () => {
    const cancelado = evento({ status: 'CANCELADO' });
    expect(canPostToEvent(ORGANIZADOR, cancelado, null, depoisDoInicio)).toBe(false);
    expect(canPostToEvent(ALUNO, cancelado, 'PRESENTE', depoisDoInicio)).toBe(false);
  });

  it('o instante do início conta como já começado', () => {
    const noInicio = new Date('2026-09-12T13:00:00.000Z');
    expect(canPostToEvent(ALUNO, evento(), 'PRESENTE', noInicio)).toBe(true);
  });
});
