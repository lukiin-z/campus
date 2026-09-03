import type {
  AceitePagamento,
  Comentario,
  Credenciais,
  Curso,
  DesfechoSimulado,
  EdicaoEvento,
  EntradaCadastro,
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
  ParticipanteConfirmado,
  Participacao,
  ParticipacaoView,
  PublicacaoView,
  ResultadoCheckin,
  ResultadoInscricao,
  ResultadoLogin,
  Saude,
  SessaoUsuario,
  TokenIngresso,
  Turma,
  WebhookPagamento,
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
 *
 * ## O que o CP6 acrescentou aqui
 *
 * Nenhuma assinatura existente mudou — é essa estabilidade que fez a troca do
 * mock pela API real caber em duas linhas do container, com os 377 testes do CP5
 * intactos. O que existe de novo são **métodos adicionais**, um por endpoint do
 * `openapi.yaml` que ainda não tinha cliente. Vários não têm tela; a alternativa
 * era deixar 11 rotas da API sem consumidor, e essa dívida é pior porque é
 * invisível.
 */

/*
 * As formas que atravessam a rede moram em `@campus/shared` desde o CP6.
 *
 * Elas nasceram AQUI, e a razão de terem saído está escrita no pacote: cada uma
 * tinha uma segunda declaração na API, e uma das seis já havia divergido antes
 * de qualquer uso. O re-export existe para que este arquivo continue sendo o
 * único lugar que as telas e o cliente HTTP precisam conhecer.
 */
export type {
  AceitePagamento,
  DesfechoWebhook,
  EdicaoEvento,
  EntradaCadastro,
  ParticipanteConfirmado,
  Saude,
  WebhookPagamento,
} from '../types/domain';
/*
 * Elas aparecem DUAS vezes neste arquivo -- no `import type` acima e neste
 * `export type` -- e não é redundância: `export ... from` reexporta o nome sem
 * trazê-lo ao escopo do módulo, então as assinaturas daqui não o veriam.
 *
 * Foi assim que o defeito apareceu: `tsc -p app/tsconfig.json --noEmit` passou e
 * o `tsc -b` do build reprovou com cinco `TS2304`. Os dois comandos não são
 * equivalentes neste repositório, e é o do build que vale.
 */

export interface AuthRepository {
  /** Sessão do usuário autenticado, com o vínculo acadêmico resolvido. */
  obterSessao(): Promise<SessaoUsuario>;
  /** RF-003. Recusa por regra vira `ApiError` com código de `MotivoRecusaLogin`. */
  entrar(credenciais: Credenciais): Promise<ResultadoLogin>;
  /**
   * RF-001 — cria a conta e já devolve a sessão.
   *
   * Sem tela ainda: o CP5 nasceu com contas semeadas e a demonstração entra com
   * uma delas. O endpoint existe no contrato desde o CP4.
   */
  cadastrar(entrada: EntradaCadastro): Promise<ResultadoLogin>;
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
  /** RN-023 — edição de evento não encerrado. Sem tela ainda. */
  editar(id: string, entrada: EdicaoEvento): Promise<EventoView>;
  /** RN-021, RN-022 — cancela o evento e as participações em cascata. */
  cancelar(id: string, motivo: string): Promise<EventoView>;
  /** RN-003 — aprovação de evento de alcance FACULDADE, pelo admin. */
  aprovar(id: string): Promise<EventoView>;
  /** RN-024 — confirmados do evento, só para o organizador. */
  listarParticipantes(id: string): Promise<ParticipanteConfirmado[]>;
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
  /** RN-013 — reembolso pela política congelada no pagamento. Sem tela ainda. */
  solicitarReembolso(participacaoId: string): Promise<PagamentoView>;
  /**
   * RN-014 — o webhook do gateway.
   *
   * A assinatura HMAC é parâmetro porque o segredo dela não pode estar no
   * bundle do front-end. Serve a ferramenta de demonstração e ao teste de ponta
   * a ponta; a tela usa `simularDesfecho`.
   */
  notificarWebhook(entrada: WebhookPagamento, assinatura: string): Promise<AceitePagamento>;
}

export interface CheckinRepository {
  /** RF-033 — token do ingresso do aluno autenticado. */
  obterTokenDoIngresso(participacaoId: string): Promise<TokenIngresso>;
  /** RF-034 — o que o leitor do organizador chama. */
  validar(eventoId: string, leitura: string): Promise<ResultadoCheckin>;
  /** RF-035 — painel do organizador na porta do evento. */
  obterPainel(eventoId: string): Promise<PainelCheckin | null>;
  /** RN-018 — presença sem leitura, com motivo registrado. Sem tela ainda. */
  registrarPresencaManual(participacaoId: string, motivo: string): Promise<ResultadoCheckin>;
}

export interface FeedRepository {
  listar(): Promise<PublicacaoView[]>;
  /** RF-037 — publicação só existe vinculada a um evento (RN-019). */
  publicar(entrada: NovaPublicacao): Promise<PublicacaoView>;
  comentar(publicacaoId: string, entrada: NovoComentario): Promise<Comentario>;
  /** Eventos em que o usuário pode publicar: aqueles de que ele participou. */
  eventosPublicaveis(): Promise<Array<{ id: string; titulo: string }>>;
  /** RF-042, RN-020 — remoção com motivo e autor registrados. Sem tela ainda. */
  remover(publicacaoId: string, motivo: string): Promise<PublicacaoView>;
}

export interface NotificationsRepository {
  listar(): Promise<Notificacao[]>;
  marcarComoLida(id: string): Promise<void>;
  marcarTodasComoLidas(): Promise<void>;
}

/** RF-041 e RF-043 — o que o admin de curso e de faculdade operam. */
export interface AdminRepository {
  eventosPendentes(): Promise<EventoView[]>;
  regerarCodigoConvite(turmaId: string): Promise<Turma>;
}

export interface HealthRepository {
  verificar(): Promise<Saude>;
}

export interface Repositories {
  auth: AuthRepository;
  events: EventsRepository;
  participations: ParticipationsRepository;
  payments: PaymentsRepository;
  checkin: CheckinRepository;
  feed: FeedRepository;
  notifications: NotificationsRepository;
  admin: AdminRepository;
  health: HealthRepository;
}

/**
 * Erros do transporte.
 *
 * `ApiError` (o servidor respondeu e recusou) e `NetworkError` (não houve
 * resposta) são definidos em `lib/api.ts` e reexportados daqui: as telas
 * importam de `../services` desde o CP5 e continuam importando do mesmo lugar.
 */
export { ApiError, NetworkError } from '../lib/api';
export type { MotivoFalhaDeRede } from '../lib/api';

// --------------------------------------------------------------------------
// Container
//
// Único ponto do app que conhece a implementação concreta.
// --------------------------------------------------------------------------

import { apiRepositories } from './api';
import { httpRepositories } from './http';

export type FonteDeDados = 'mock' | 'api';

/**
 * Escolhe a implementação.
 *
 * ## Por que é função, e não um `if` solto
 *
 * Porque assim a escolha é testável sem manipular ambiente: o teste chama
 * `escolherRepositorios('api')` e compara a identidade do objeto devolvido.
 * `import.meta.env` é resolvido em tempo de build e congelado no módulo — um
 * teste que dependesse dele estaria testando o Vite, não esta decisão.
 *
 * ## Por que o padrão é `mock`
 *
 * Duas razões, e as duas são de risco:
 *
 * 1. **A demonstração não pode depender de o backend estar de pé.** O app é
 *    publicado no GitHub Pages, que serve arquivo estático e nada mais. Se o
 *    padrão fosse `api`, a página publicada tentaria falar com um servidor que
 *    não existe naquele endereço e mostraria erro em toda tela.
 * 2. **Os testes rodam sem a variável.** No Vitest `VITE_DATA_SOURCE` é
 *    `undefined`, e é o mock que os 377 casos do CP5 exercitam. Um padrão
 *    diferente faria a suíte inteira tentar sair para a rede.
 *
 * Só o valor exato `'api'` liga a API real. Qualquer outra coisa — vazio, erro
 * de digitação, `'API'` — cai no mock, que é o lado seguro de errar.
 */
export function escolherRepositorios(fonte: string | undefined): Repositories {
  return fonte === 'api' ? apiRepositories : httpRepositories;
}

/**
 * `true` quando as requisições saem para a API real.
 *
 * `main.tsx` precisa disto para NÃO iniciar o MSW: com o worker registrado, o
 * interceptador captura as chamadas antes de elas chegarem à API e o app
 * conversaria com o mock acreditando estar falando com o servidor.
 */
export const usandoApiReal: boolean = import.meta.env.VITE_DATA_SOURCE === 'api';

export const repositories: Repositories = escolherRepositorios(import.meta.env.VITE_DATA_SOURCE);

export { apiRepositories, httpRepositories };

/**
 * Token da sessão. Exportado daqui — e não de `./sessao` — porque a guarda de
 * rota precisa saber se há sessão sem importar a implementação de transporte.
 */
export { definirToken, obterToken } from './sessao';
