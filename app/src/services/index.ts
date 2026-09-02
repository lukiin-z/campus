import type {
  Comentario,
  Credenciais,
  Curso,
  DesfechoSimulado,
  EntradaOnboarding,
  EventoView,
  Faculdade,
  FiltroEventos,
  Notificacao,
  NovoComentario,
  NovoEvento,
  NovoPagamento,
  NovaPublicacao,
  PagamentoView,
  PainelCheckin,
  Participacao,
  ParticipacaoView,
  PublicacaoView,
  ResultadoCheckin,
  ResultadoInscricao,
  ResultadoLogin,
  SessaoUsuario,
  TokenIngresso,
  Turma,
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
  /** RF-003. Recusa por regra vira `ApiError` com código de `MotivoRecusaLogin`. */
  entrar(credenciais: Credenciais): Promise<ResultadoLogin>;
  sair(): Promise<void>;
  /** RF-005 — vincula curso e turma e devolve a sessão já completa. */
  concluirOnboarding(entrada: EntradaOnboarding): Promise<SessaoUsuario>;
  /** Dados públicos da tela de login: domínios aceitos e nome da instituição. */
  obterFaculdade(): Promise<Faculdade>;
  listarCursos(): Promise<Curso[]>;
  /** Turmas de um curso — usado só para exibir a turma resolvida no onboarding. */
  listarTurmas(cursoId: string): Promise<Turma[]>;
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

export interface PaymentsRepository {
  /** RF-028 — abre a cobrança da participação pendente e devolve Pix ou cartão. */
  iniciar(participacaoId: string, entrada: NovoPagamento): Promise<PagamentoView>;
  obter(participacaoId: string): Promise<PagamentoView | null>;
  /**
   * Dispara o webhook simulado (ADR-0007). No CP6 quem chama isto é o gateway,
   * não a tela — por isso o método é explícito e nomeado como simulação.
   */
  simularDesfecho(pagamentoId: string, desfecho: DesfechoSimulado): Promise<PagamentoView>;
}

export interface CheckinRepository {
  /** RF-033 — token do ingresso do aluno autenticado. */
  obterTokenDoIngresso(participacaoId: string): Promise<TokenIngresso>;
  /** RF-034 — o que o leitor do organizador chama. */
  validar(eventoId: string, leitura: string): Promise<ResultadoCheckin>;
  /** RF-035 — painel do organizador na porta do evento. */
  obterPainel(eventoId: string): Promise<PainelCheckin | null>;
}

export interface FeedRepository {
  listar(): Promise<PublicacaoView[]>;
  /** RF-037 — publicação só existe vinculada a um evento (RN-019). */
  publicar(entrada: NovaPublicacao): Promise<PublicacaoView>;
  comentar(publicacaoId: string, entrada: NovoComentario): Promise<Comentario>;
  /** Eventos em que o usuário pode publicar: aqueles de que ele participou. */
  eventosPublicaveis(): Promise<Array<{ id: string; titulo: string }>>;
}

export interface NotificationsRepository {
  listar(): Promise<Notificacao[]>;
  marcarComoLida(id: string): Promise<void>;
  marcarTodasComoLidas(): Promise<void>;
}

export interface Repositories {
  auth: AuthRepository;
  events: EventsRepository;
  participations: ParticipationsRepository;
  payments: PaymentsRepository;
  checkin: CheckinRepository;
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

/**
 * Token da sessão. Exportado daqui — e não de `./http` — porque a guarda de
 * rota precisa saber se há sessão sem importar a implementação de transporte.
 */
export { definirToken, obterToken } from './http';
