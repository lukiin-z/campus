import type {
  EventoView,
  FiltroEventos,
  Notificacao,
  NovoEvento,
  Participacao,
  ParticipacaoView,
  PublicacaoView,
  ResultadoInscricao,
  SessaoUsuario,
} from '../types/domain';

/**
 * Contratos da camada de dados.
 *
 * A apresentação e o estado dependem APENAS destas interfaces. Quem sabe se os
 * dados vêm do mock ou da API é o container no fim deste arquivo — e é só isso
 * que muda no CP6 (RNF-016, ADR-0003).
 *
 * Nenhuma tela importa `fetch`, `axios`, `msw` ou `mocks/`. A regra
 * `no-restricted-imports` do ESLint reprova.
 */

export interface AuthRepository {
  /** Sessão do usuário autenticado, com o vínculo acadêmico resolvido. */
  obterSessao(): Promise<SessaoUsuario>;
}

export interface EventsRepository {
  listar(filtros?: FiltroEventos): Promise<EventoView[]>;
  /** Os próximos eventos com inscrição aberta, para a faixa do feed. */
  destaques(): Promise<EventoView[]>;
  /** Devolve `null` quando o evento não existe OU está fora do alcance (RN-001). */
  obter(id: string): Promise<EventoView | null>;
  criar(entrada: NovoEvento): Promise<EventoView>;
}

export interface ParticipationsRepository {
  /** RF-019 — pode devolver `SEM_VAGA`, que não é erro: é o desvio de RN-006. */
  inscrever(eventoId: string): Promise<ResultadoInscricao>;
  entrarNaListaEspera(eventoId: string): Promise<Participacao>;
  confirmarOferta(participacaoId: string): Promise<Participacao>;
  cancelar(participacaoId: string): Promise<{ cancelada: boolean; promovido: string | null }>;
  listarMinhas(): Promise<ParticipacaoView[]>;
  obter(participacaoId: string): Promise<ParticipacaoView | null>;
}

export interface FeedRepository {
  listar(): Promise<PublicacaoView[]>;
}

export interface NotificationsRepository {
  listar(): Promise<Notificacao[]>;
  marcarComoLida(id: string): Promise<void>;
}

export interface Repositories {
  auth: AuthRepository;
  events: EventsRepository;
  participations: ParticipationsRepository;
  feed: FeedRepository;
  notifications: NotificationsRepository;
}

/** Erro de API com código, para a tela decidir a mensagem certa. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(mensagem);
    this.name = 'ApiError';
  }
}

// --------------------------------------------------------------------------
// Container
//
// Único ponto do app que conhece a implementação concreta. No CP6, trocar o mock
// pela API real é trocar as linhas abaixo — e desligar o MSW em main.tsx.
// --------------------------------------------------------------------------

import { httpRepositories } from './http';

export const repositories: Repositories = httpRepositories;

export { httpRepositories };
