import { MOTIVO_RECUSA_INSCRICAO } from '../../types/domain';
import type {
  Comentario,
  Credenciais,
  Curso,
  DesfechoSimulado,
  EntradaOnboarding,
  EventoView,
  Faculdade,
  FiltroEventos,
  MotivoRecusaInscricao,
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
  ResultadoLogin,
  SessaoUsuario,
  TokenIngresso,
  Turma,
} from '../../types/domain';
import { ApiError, criarClienteHttp, type OpcoesRequisicao, type ParDeTokens } from '../../lib/api';
import { guardarSessao, obterRefreshToken, portaDeSessao, encerrarSessao } from '../sessao';
import type {
  AceitePagamento,
  AdminRepository,
  AuthRepository,
  CheckinRepository,
  EdicaoEvento,
  EntradaCadastro,
  EventsRepository,
  FeedRepository,
  HealthRepository,
  NotificationsRepository,
  ParticipanteConfirmado,
  ParticipationsRepository,
  PaymentsRepository,
  Repositories,
  Saude,
  WebhookPagamento,
} from '../index';

/**
 * Implementação dos repositórios contra a **API real** (`api/openapi.yaml`).
 *
 * ## O que este arquivo é, e o que ele não é
 *
 * É a segunda implementação da MESMA interface de `services/index.ts`. Nenhuma
 * tela, hook ou componente muda por causa dela — é literalmente o motivo pelo
 * qual a interface existe (RNF-016, ADR-0003). A primeira implementação,
 * `services/http`, continua falando com o mock do CP5 e sustenta a demonstração
 * sem backend.
 *
 * ## Onde o contrato mudou, quem adapta é aqui
 *
 * O `openapi.yaml` do CP6 não é o conjunto de rotas que o mock do CP5 respondia.
 * As diferenças que exigem tradução estão comentadas caso a caso abaixo; a mais
 * visível é o login, que passou de `{ token, sessao }` para
 * `{ accessToken, refreshToken, expiraEm, sessao }`. A tela de login continua
 * recebendo `ResultadoLogin` com um `token` — a tradução acontece nesta camada,
 * e é isso que impede a mudança de contrato de virar um diff de 40 arquivos.
 *
 * ## Métodos declarados e ainda sem tela
 *
 * Vários endpoints do contrato não têm interface no app ainda (cancelamento e
 * aprovação de evento, reembolso, presença manual, remoção de publicação,
 * pendências de admin). Eles estão implementados: um método sem chamador é uma
 * assinatura verificada esperando a tela; um endpoint sem cliente é trabalho que
 * alguém vai refazer.
 */

/**
 * Endereço da API.
 *
 * O padrão é o `servers[0]` do contrato — o docker compose de desenvolvimento.
 * Assim `VITE_DATA_SOURCE=api npm run dev` funciona com `npm run dev:api` ao
 * lado, sem configuração. Em produção `VITE_API_URL` aponta para o serviço
 * publicado (ver `.env.example`).
 */
export const BASE_URL_API: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function timeoutConfigurado(): number | undefined {
  const bruto = Number(import.meta.env.VITE_API_TIMEOUT_MS);
  // Valor inválido no `.env` não deve virar `NaN` no `setTimeout` — que aborta
  // imediatamente e faz toda requisição "expirar" sem sair do lugar.
  return Number.isFinite(bruto) && bruto > 0 ? bruto : undefined;
}

const cliente = criarClienteHttp({
  baseUrl: BASE_URL_API,
  sessao: portaDeSessao,
  renovarEm401: true,
  timeoutMs: timeoutConfigurado(),
});

const request = <T>(caminho: string, init?: OpcoesRequisicao): Promise<T> =>
  cliente.request<T>(caminho, init);

/** Corpo de `POST` com JSON — reduz o ruído de `JSON.stringify` em 20 chamadas. */
function comCorpo(metodo: 'POST' | 'PATCH', corpo?: unknown) {
  return { method: metodo, ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }) };
}

/**
 * `404` como resposta legítima.
 *
 * O contrato usa `404` para "não existe **ou** está fora do seu alcance"
 * (RN-001, RNF-012) e para "esta participação não tem cobrança". Nos dois casos
 * a tela mostra um estado vazio, não um erro — e `null` é o que a interface
 * promete. Quatro métodos precisam disso, então vale a função.
 */
async function nuloEm404<T>(promessa: Promise<T>): Promise<T | null> {
  try {
    return await promessa;
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 404) return null;
    throw erro;
  }
}

function queryDeFiltros(filtros?: FiltroEventos): string {
  if (!filtros) return '';
  const params = new URLSearchParams();
  if (filtros.alcance && filtros.alcance !== 'TODOS') params.set('alcance', filtros.alcance);
  if (filtros.preco && filtros.preco !== 'TODOS') params.set('preco', filtros.preco);
  if (filtros.periodo && filtros.periodo !== 'TODOS') params.set('periodo', filtros.periodo);
  if (filtros.busca) params.set('busca', filtros.busca);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** O que `/auth/login`, `/auth/cadastro` e `/auth/refresh` devolvem. */
interface RespostaLogin extends ParDeTokens {
  sessao: SessaoUsuario;
}

/**
 * Traduz a resposta de autenticação do contrato para o `ResultadoLogin` do
 * domínio.
 *
 * O par de tokens fica na camada de sessão e não sobe: a tela de login recebe
 * `{ token, sessao }` como no CP5 e nunca soube que existe um refresh. Se este
 * `guardarSessao` subisse para o hook, cada tela de autenticação passaria a
 * conhecer o transporte — exatamente o vazamento que a interface evita.
 */
async function autenticar(caminho: string, corpo: unknown): Promise<ResultadoLogin> {
  const resposta = await request<RespostaLogin>(caminho, comCorpo('POST', corpo));
  guardarSessao(resposta);
  return { token: resposta.accessToken, sessao: resposta.sessao };
}

const auth: AuthRepository = {
  obterSessao: () => request<SessaoUsuario>('/sessao'),

  entrar: (credenciais: Credenciais) => autenticar('/auth/login', credenciais),

  /** RF-001 — não existia no mock do CP5, que já nascia com contas semeadas. */
  cadastrar: (entrada: EntradaCadastro) => autenticar('/auth/cadastro', entrada),

  /**
   * `POST /auth/logout` exige o refresh token **no corpo** — o CP5 mandava a
   * requisição vazia. É o refresh que identifica a sessão a revogar: o access
   * token vale 15 minutos e revogá-lo não significaria nada.
   */
  sair: async () => {
    const refreshToken = obterRefreshToken();
    try {
      if (refreshToken) {
        await request<void>('/auth/logout', comCorpo('POST', { refreshToken }));
      }
    } finally {
      // Sai da sessão local mesmo se o servidor não responder: manter o token
      // depois de um "sair" é pior do que uma sessão órfã no servidor.
      encerrarSessao();
    }
  },

  concluirOnboarding: (entrada: EntradaOnboarding) =>
    request<SessaoUsuario>('/auth/onboarding', comCorpo('POST', entrada)),

  obterFaculdade: () => request<Faculdade>('/faculdade'),

  listarCursos: () => request<Curso[]>('/cursos'),

  listarTurmas: (cursoId: string) => request<Turma[]>(`/cursos/${cursoId}/turmas`),
};

const events: EventsRepository = {
  listar: (filtros) => request<EventoView[]>(`/eventos${queryDeFiltros(filtros)}`),

  destaques: () => request<EventoView[]>('/eventos/destaque'),

  /**
   * `404` aqui não é falha do app: é a resposta correta para evento fora do
   * alcance (RN-001) — a API não revela nem a existência dele.
   */
  obter: (id) => nuloEm404(request<EventoView>(`/eventos/${id}`)),

  criar: (entrada: NovoEvento) => request<EventoView>('/eventos', comCorpo('POST', entrada)),

  /** RN-023 — `PATCH`, não `PUT`: o contrato aceita subconjunto editável. */
  editar: (id, entrada: EdicaoEvento) =>
    request<EventoView>(`/eventos/${id}`, comCorpo('PATCH', entrada)),

  /**
   * Cancelamento é `POST /eventos/{id}/cancelamento`, não `DELETE /eventos/{id}`.
   * O evento não desaparece: ele muda de estado, guarda o motivo e cancela as
   * participações em cascata (RN-021, RN-022). `DELETE` prometeria o contrário.
   */
  cancelar: (id, motivo) =>
    request<EventoView>(`/eventos/${id}/cancelamento`, comCorpo('POST', { motivo })),

  aprovar: (id) => request<EventoView>(`/eventos/${id}/aprovacao`, comCorpo('POST')),

  listarParticipantes: (id) => request<ParticipanteConfirmado[]>(`/eventos/${id}/participantes`),
};

const participations: ParticipationsRepository = {
  /**
   * Inscrição — o método com a maior diferença de forma entre o mock e o
   * contrato.
   *
   * O mock do CP5 devolvia o próprio `ResultadoInscricao` no corpo do `201`. O
   * contrato devolve a `Participacao` crua e deixa o desvio para os códigos de
   * status: `409 SEM_VAGA` com `acao: LISTA_ESPERA` (RN-006) e `409/422` com o
   * motivo da recusa (RN-009, RN-015). Montar a união é trabalho desta camada.
   *
   * Recusa por regra de negócio NÃO é exceção: é resultado previsto do domínio.
   * Exceção fica reservada ao que a tela não sabe tratar — falha de rede, `500`,
   * `401`. É essa separação que permite mostrar "as inscrições encerraram" em
   * vez de "algo deu errado".
   */
  inscrever: async (eventoId) => {
    try {
      const participacao = await request<Participacao>(
        `/eventos/${eventoId}/participacoes`,
        comCorpo('POST'),
      );

      if (participacao.status === 'PENDENTE_PAGAMENTO') {
        return { tipo: 'PENDENTE_PAGAMENTO', participacao };
      }
      if (participacao.status === 'CONFIRMADA') {
        return { tipo: 'CONFIRMADA', participacao };
      }

      /*
       * Qualquer outro status em um `201` de inscrição é defeito do servidor, e
       * tratá-lo como "confirmada" seria pior do que falhar: a tela diria ao
       * aluno que ele tem vaga em um evento em que ele está na fila.
       */
      throw new ApiError(
        502,
        'RESPOSTA_INESPERADA',
        'A inscrição foi criada em um estado que o app não reconhece. Recarregue e confira.',
        { status: participacao.status },
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.codigo === 'SEM_VAGA') {
        /*
         * `totalFila` vem em `extra` — e o schema `Erro` do contrato **não o
         * declara**, só declara `acao`. O mock do CP5 mandava, a tela usa ("você
         * seria o 4º da fila") e a API precisa manter. Sem ele o número vira 0 e
         * o convite para a fila fica sem informação; está no relatório da lane
         * como divergência a corrigir no contrato.
         */
        return {
          tipo: 'SEM_VAGA',
          acao: 'LISTA_ESPERA',
          totalFila: Number(error.extra.totalFila ?? 0),
        };
      }

      const recusas = MOTIVO_RECUSA_INSCRICAO as readonly string[];
      if (recusas.includes(error.codigo)) {
        return {
          tipo: 'RECUSADA',
          motivo: error.codigo as MotivoRecusaInscricao,
          mensagem: error.message,
        };
      }

      /*
       * `FORA_DO_ALCANCE` **nunca chega como código de recusa** — e por decisão
       * de projeto, não por esquecimento: a API responde `404 NAO_ENCONTRADO`
       * para evento fora do alcance justamente para não revelar que ele existe
       * (RN-001, RNF-021). Sem esta tradução o ramo do laço acima ficaria morto
       * no modo `api`, e as duas implementações da MESMA interface passariam a
       * divergir no observável: no mock, uma recusa tratada com a mensagem da
       * regra; na API, uma exceção caindo no `onError` genérico.
       *
       * A mensagem exibida continua sendo a do servidor. Este mapeamento traduz
       * a FORMA da resposta, não o conteúdo — o app não passa a afirmar que o
       * evento existe, porque ele de fato não sabe.
       */
      if (error.status === 404) {
        return {
          tipo: 'RECUSADA',
          motivo: 'FORA_DO_ALCANCE',
          mensagem: error.message,
        };
      }

      throw error;
    }
  },

  entrarNaListaEspera: (eventoId) =>
    request<Participacao>(`/eventos/${eventoId}/lista-espera`, comCorpo('POST')),

  confirmarOferta: (participacaoId) =>
    request<Participacao>(`/participacoes/${participacaoId}/confirmar`, comCorpo('POST')),

  /**
   * O contrato devolve `ResultadoCancelamento` com um campo `reembolso` a mais
   * (RN-013). O tipo da interface ignora o extra — campo adicional não quebra
   * leitura estrutural, e inventar um método novo para exibir algo que nenhuma
   * tela mostra ainda seria adiantar trabalho.
   */
  cancelar: (participacaoId) =>
    request<{ cancelada: boolean; promovido: string | null }>(`/participacoes/${participacaoId}`, {
      method: 'DELETE',
    }),

  listarMinhas: () => request<ParticipacaoView[]>('/participacoes'),

  obter: (participacaoId) =>
    nuloEm404(request<ParticipacaoView>(`/participacoes/${participacaoId}`)),
};

const payments: PaymentsRepository = {
  iniciar: (participacaoId: string, entrada: NovoPagamento) =>
    request<PagamentoView>(`/participacoes/${participacaoId}/pagamento`, comCorpo('POST', entrada)),

  obter: (participacaoId: string) =>
    nuloEm404(request<PagamentoView>(`/participacoes/${participacaoId}/pagamento`)),

  simularDesfecho: (pagamentoId: string, desfecho: DesfechoSimulado) =>
    request<PagamentoView>(`/pagamentos/${pagamentoId}/simular`, comCorpo('POST', { desfecho })),

  /** RN-013 — a política congelada no pagamento é quem decide o valor. */
  solicitarReembolso: (participacaoId: string) =>
    request<PagamentoView>(`/participacoes/${participacaoId}/reembolso`, comCorpo('POST')),

  /**
   * Webhook do gateway (RN-014).
   *
   * Em produção quem chama isto é o gateway, não o app — e o contrato exige a
   * assinatura HMAC em `X-Assinatura`. O segredo dessa assinatura **não pode
   * viver no front-end**: qualquer um leria o bundle. Por isso a assinatura é
   * parâmetro, fornecida por quem opera a ferramenta (script de demonstração,
   * teste de ponta a ponta contra a API de desenvolvimento).
   *
   * Para a demonstração normal existe `simularDesfecho`, que é autenticado como
   * usuário e não precisa de segredo nenhum.
   */
  notificarWebhook: (entrada: WebhookPagamento, assinatura: string) =>
    request<AceitePagamento>('/pagamentos/webhook', {
      method: 'POST',
      body: JSON.stringify(entrada),
      headers: { 'X-Assinatura': assinatura },
    }),
};

const checkin: CheckinRepository = {
  obterTokenDoIngresso: (participacaoId: string) =>
    request<TokenIngresso>(`/participacoes/${participacaoId}/token`),

  /**
   * Recusa de check-in vem no corpo, com `aceito: false` — não como erro HTTP.
   * Na porta do evento, "ingresso já usado" é resposta legítima do sistema e o
   * operador precisa lê-la para saber se chama o próximo ou o segurança
   * (RN-017).
   */
  validar: (eventoId: string, leitura: string) =>
    request<ResultadoCheckin>(`/eventos/${eventoId}/checkin`, comCorpo('POST', { leitura })),

  /**
   * `404` vira `null` (evento inexistente ou fora do alcance), mas `403`
   * propaga: quem vê o evento e não pode operar a porta precisa ler "só o
   * organizador valida check-in", e não "evento não encontrado".
   */
  obterPainel: (eventoId: string) =>
    nuloEm404(request<PainelCheckin>(`/eventos/${eventoId}/checkin`)),

  /** RN-018 — presença sem leitura exige motivo registrado e autor. */
  registrarPresencaManual: (participacaoId: string, motivo: string) =>
    request<ResultadoCheckin>(
      `/participacoes/${participacaoId}/presenca-manual`,
      comCorpo('POST', { motivo }),
    ),
};

const feed: FeedRepository = {
  listar: () => request<PublicacaoView[]>('/feed'),

  publicar: (entrada: NovaPublicacao) =>
    request<PublicacaoView>('/publicacoes', comCorpo('POST', entrada)),

  comentar: (publicacaoId: string, entrada: NovoComentario) =>
    request<Comentario>(`/publicacoes/${publicacaoId}/comentarios`, comCorpo('POST', entrada)),

  eventosPublicaveis: () =>
    request<Array<{ id: string; titulo: string }>>('/feed/eventos-publicaveis'),

  /**
   * Remoção é `POST /publicacoes/{id}/remocao`, não `DELETE`: a publicação
   * continua existindo com `removida`, motivo e autor da remoção (RF-042,
   * RN-020). Moderação sem rastro é moderação que ninguém audita.
   */
  remover: (publicacaoId: string, motivo: string) =>
    request<PublicacaoView>(`/publicacoes/${publicacaoId}/remocao`, comCorpo('POST', { motivo })),
};

const notifications: NotificationsRepository = {
  listar: () => request<Notificacao[]>('/notificacoes'),
  marcarComoLida: (id) => request<void>(`/notificacoes/${id}/lida`, comCorpo('POST')),
  marcarTodasComoLidas: () => request<void>('/notificacoes/lidas', comCorpo('POST')),
};

const admin: AdminRepository = {
  /** RF-041 — a fila de aprovação do admin de faculdade (RN-003). */
  eventosPendentes: () => request<EventoView[]>('/admin/eventos-pendentes'),

  /**
   * RF-043 — regera o código de convite da turma.
   *
   * `POST`, porque a operação **muda estado**: desativa o código anterior. Um
   * `GET` que muda estado é vulnerável a prefetch de navegador e a repetição
   * automática — qualquer um dos dois invalidaria o código que a turma já
   * recebeu.
   *
   * Este método mandava `GET`, e o comentário aqui culpava o contrato. O
   * contrato foi corrigido para `POST`, a API sempre serviu `@Post`, e o cliente
   * ficou sozinho no verbo errado: regerar o convite respondia erro em modo
   * `api` e nada acusava.
   *
   * O que acusou foi `index.test.ts`, conferindo **verbo e caminho** contra o
   * `openapi.yaml`. Conferir só o caminho teria dado verde — o caminho existe.
   */
  regerarCodigoConvite: (turmaId: string) =>
    request<Turma>(`/admin/turmas/${turmaId}/codigo`, comCorpo('POST')),
};

const health: HealthRepository = {
  /**
   * `/health` é a única rota sem autenticação útil para a demonstração: ela
   * responde se a API está de pé e se o banco respondeu, antes de qualquer tela
   * tentar carregar dado e falhar de um jeito mais confuso.
   */
  verificar: () => request<Saude>('/health'),
};

export const apiRepositories: Repositories = {
  auth,
  events,
  participations,
  payments,
  checkin,
  feed,
  notifications,
  admin,
  health,
};
