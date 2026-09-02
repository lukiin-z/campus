import type { AlcanceEvento, Curso, Evento, Faculdade, Turma, Usuario } from '../types/domain';

/**
 * Alcance e visibilidade — RN-001 e RN-002.
 *
 * ATENÇÃO: no CP5 estas funções rodam no cliente (dentro do mock), e no CP6
 * rodarão no servidor. A autoridade é o servidor (RNF-012): esconder na UI não é
 * cumprir a regra. O mock aplica as mesmas funções justamente para que a tela
 * nunca receba dado que a API real também não devolveria.
 */

/** RN-001 — exatamente uma âncora preenchida, coerente com o alcance. */
export function ancoraCoerente(
  event: Pick<Evento, 'alcance' | 'turmaId' | 'cursoId' | 'faculdadeId'>,
): boolean {
  const preenchidas = [event.turmaId, event.cursoId, event.faculdadeId].filter(Boolean).length;
  if (preenchidas !== 1) return false;
  if (event.alcance === 'TURMA') return event.turmaId != null;
  if (event.alcance === 'CURSO') return event.cursoId != null;
  return event.faculdadeId != null;
}

export function ancoraDoEvento(
  event: Pick<Evento, 'alcance' | 'turmaId' | 'cursoId' | 'faculdadeId'>,
): string | null {
  if (event.alcance === 'TURMA') return event.turmaId;
  if (event.alcance === 'CURSO') return event.cursoId;
  return event.faculdadeId;
}

type UsuarioVinculo = Pick<Usuario, 'id' | 'turmaId' | 'cursoId' | 'faculdadeId' | 'papeis'>;

/**
 * RN-001 — o alcance determina, sozinho, quem enxerga o evento.
 *
 * `temParticipacaoAtiva` é a exceção deliberada da regra: quem já tem vaga
 * continua vendo o evento mesmo se perder o vínculo (trocou de turma). Perder
 * acesso ao próprio ingresso seria pior que a inconsistência.
 */
export function canSee(
  usuario: UsuarioVinculo,
  event: Pick<
    Evento,
    'alcance' | 'turmaId' | 'cursoId' | 'faculdadeId' | 'organizadorId' | 'status'
  >,
  options: { temParticipacaoAtiva?: boolean } = {},
): boolean {
  if (event.organizadorId === usuario.id) return true;
  if (options.temParticipacaoAtiva) return true;

  const isAdminFaculdade = usuario.papeis.includes('ADMIN_FACULDADE');
  const isAdminCurso = usuario.papeis.includes('ADMIN_CURSO');

  // Rascunho e evento em aprovação só aparecem para o organizador e para os
  // administradores do escopo.
  if (event.status === 'RASCUNHO') return false;
  if (event.status === 'EM_APROVACAO') return isAdminFaculdade;

  if (isAdminFaculdade && event.faculdadeId === usuario.faculdadeId) return true;

  switch (event.alcance) {
    case 'TURMA':
      if (isAdminCurso && event.turmaId != null) return true;
      return usuario.turmaId != null && usuario.turmaId === event.turmaId;
    case 'CURSO':
      return usuario.cursoId != null && usuario.cursoId === event.cursoId;
    case 'FACULDADE':
      return usuario.faculdadeId === event.faculdadeId;
    default:
      return false;
  }
}

/** RN-001, invariante 2 — a âncora tem de pertencer à hierarquia do organizador. */
export function ancoraPermitida(usuario: UsuarioVinculo, alcance: AlcanceEvento): string | null {
  if (alcance === 'TURMA') return usuario.turmaId;
  if (alcance === 'CURSO') return usuario.cursoId;
  return usuario.faculdadeId;
}

/**
 * RN-002 — o alcance não aumenta depois de publicado, e só diminui se ninguém
 * com participação ativa ficaria de fora.
 */
const ORDEM_ALCANCE: Record<AlcanceEvento, number> = { TURMA: 1, CURSO: 2, FACULDADE: 3 };

export function canChangeScope(
  event: Pick<Evento, 'alcance' | 'status'>,
  novoAlcance: AlcanceEvento,
  temParticipacaoIncompativel: boolean,
): { allowed: boolean; reason?: string } {
  if (event.status === 'RASCUNHO') return { allowed: true };
  if (novoAlcance === event.alcance) return { allowed: true };

  if (ORDEM_ALCANCE[novoAlcance] > ORDEM_ALCANCE[event.alcance]) {
    return {
      allowed: false,
      reason:
        'O alcance não pode ser ampliado depois da publicação: quem já se inscreveu concordou com outro público. Cancele o evento e crie outro.',
    };
  }
  if (temParticipacaoIncompativel) {
    return {
      allowed: false,
      reason:
        'Reduzir o alcance agora deixaria de fora pessoas que já têm vaga. Cancele o evento e crie outro.',
    };
  }
  return { allowed: true };
}

/** Rótulo do alcance na UI: "3ESPX", "Engenharia de Computação", "FIAP". */
export function alcanceRotulo(
  event: Pick<Evento, 'alcance' | 'turmaId' | 'cursoId'>,
  refs: { turmas: Turma[]; cursos: Curso[]; faculdade: Faculdade },
): string {
  if (event.alcance === 'TURMA') {
    return refs.turmas.find((t) => t.id === event.turmaId)?.nome ?? 'Turma';
  }
  if (event.alcance === 'CURSO') {
    return refs.cursos.find((c) => c.id === event.cursoId)?.nome ?? 'Curso';
  }
  return refs.faculdade.sigla;
}

/** Rótulo curto do badge de alcance, relativo ao usuário que está vendo. */
export function alcanceBadge(
  usuario: UsuarioVinculo,
  event: Pick<Evento, 'alcance' | 'turmaId' | 'cursoId'>,
): string {
  if (event.alcance === 'TURMA') {
    return usuario.turmaId === event.turmaId ? 'minha turma' : 'turma';
  }
  if (event.alcance === 'CURSO') {
    return usuario.cursoId === event.cursoId ? 'meu curso' : 'curso';
  }
  return 'faculdade';
}
