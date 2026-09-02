import type { Evento, Publicacao, Usuario } from '../types';

/**
 * Papéis e permissões — RN-023 e RN-024.
 *
 * "Organizador" é papel POR EVENTO, não tipo de usuário: é a relação entre um
 * usuário e o evento que ele criou. Papéis administrativos, ao contrário, são
 * atributo do usuário porque valem sobre um escopo inteiro.
 */

type Ator = Pick<Usuario, 'id' | 'papeis' | 'cursoId' | 'faculdadeId'>;

export function isOrganizer(usuario: Pick<Usuario, 'id'>, event: Pick<Evento, 'organizadorId'>) {
  return event.organizadorId === usuario.id;
}

export function isCourseAdmin(usuario: Ator): boolean {
  return usuario.papeis.includes('ADMIN_CURSO');
}

export function isCollegeAdmin(usuario: Ator): boolean {
  return usuario.papeis.includes('ADMIN_FACULDADE');
}

/** Admin com competência sobre o escopo do evento. */
export function isAdminOfScope(usuario: Ator, event: Pick<Evento, 'cursoId' | 'faculdadeId'>) {
  if (isCollegeAdmin(usuario) && event.faculdadeId === usuario.faculdadeId) return true;
  return isCourseAdmin(usuario) && event.cursoId != null && event.cursoId === usuario.cursoId;
}

export function canEditEvent(
  usuario: Ator,
  event: Pick<Evento, 'organizadorId' | 'cursoId' | 'faculdadeId' | 'status'>,
): boolean {
  if (event.status === 'CANCELADO' || event.status === 'REALIZADO') return false;
  return isOrganizer(usuario, event) || isAdminOfScope(usuario, event);
}

export function canCancelEvent(
  usuario: Ator,
  event: Pick<Evento, 'organizadorId' | 'cursoId' | 'faculdadeId' | 'status'>,
): boolean {
  if (event.status !== 'PUBLICADO' && event.status !== 'EM_APROVACAO') return false;
  return isOrganizer(usuario, event) || isAdminOfScope(usuario, event);
}

/** RN-003 — só Admin de Faculdade aprova evento de alcance FACULDADE. */
export function canApproveCollegeEvent(usuario: Ator, event: Pick<Evento, 'faculdadeId'>): boolean {
  return isCollegeAdmin(usuario) && event.faculdadeId === usuario.faculdadeId;
}

export function canValidateCheckIn(
  usuario: Ator,
  event: Pick<Evento, 'organizadorId' | 'cursoId' | 'faculdadeId'>,
): boolean {
  return isOrganizer(usuario, event) || isAdminOfScope(usuario, event);
}

export function canViewAttendanceList(
  usuario: Ator,
  event: Pick<Evento, 'organizadorId' | 'cursoId' | 'faculdadeId'>,
): boolean {
  return canValidateCheckIn(usuario, event);
}

/**
 * RN-003 — evento de alcance FACULDADE criado por aluno comum nasce em
 * `EM_APROVACAO`. Quem já é Admin de Faculdade publica direto.
 */
export function requiresApproval(usuario: Ator, alcance: Evento['alcance']): boolean {
  return alcance === 'FACULDADE' && !isCollegeAdmin(usuario);
}

/** RN-020 — quem pode remover uma publicação, e com qual competência. */
export function canRemovePost(
  usuario: Ator,
  post: Pick<Publicacao, 'autorId'>,
  event: Pick<Evento, 'organizadorId' | 'cursoId' | 'faculdadeId'>,
): boolean {
  if (post.autorId === usuario.id) return true;
  if (isOrganizer(usuario, event)) return true;
  return isAdminOfScope(usuario, event);
}

/** RN-019 — publica no feed do evento quem esteve nele, e o organizador. */
export function canPostToEvent(
  usuario: Ator,
  event: Pick<Evento, 'organizadorId' | 'status' | 'inicio'>,
  minhaParticipacaoStatus: string | null,
  now: Date | string,
): boolean {
  if (event.status === 'CANCELADO') return false;
  if (isOrganizer(usuario, event)) return true;

  const eventoComecou = new Date(now).getTime() >= new Date(event.inicio).getTime();
  if (!eventoComecou) return false;
  return minhaParticipacaoStatus === 'PRESENTE';
}
