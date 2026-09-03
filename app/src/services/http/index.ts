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
  Notificacao,
  NovoComentario,
  NovoEvento,
  NovoPagamento,
  NovaPublicacao,
  MotivoRecusaInscricao,
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
} from '../../types/domain';
import { ApiError, criarClienteHttp, type OpcoesRequisicao } from '../../lib/api';
import { definirToken, portaDeSessao } from '../sessao';
import type { Repositories } from '../index';

/**
 * Implementação dos repositórios contra o **mock do CP5**.
 *
 * ## Por que ela continua existindo no CP6
 *
 * O CP5 escreveu esta camada acreditando que "trocar o mock pela API real" seria
 * mudar `BASE_URL` aqui. Não é — e o motivo é o achado desta lane: o
 * `openapi.yaml` do CP6 tem 43 operações em 38 caminhos, e as rotas que o mock
 * responde são as do CP4, com forma diferente em pontos que importam (o login
 * devolvia um token, agora devolve dois; a inscrição devolvia a união
 * `ResultadoInscricao`, agora devolve a `Participacao` crua). Uma implementação
 * não serve para os dois contratos sem mentir para um deles.
 *
 * Então há duas, e o container escolhe (`VITE_DATA_SOURCE`):
 *
 * - **esta**, que fala as rotas do CP5 e é interceptada pelo MSW. Ela sustenta
 *   os 377 testes e a demonstração no GitHub Pages, onde não há servidor nenhum
 *   para subir;
 * - **`services/api`**, que fala o `openapi.yaml`.
 *
 * As duas implementam a MESMA interface e compartilham o mesmo cliente HTTP e a
 * mesma sessão. Nenhuma tela sabe qual está ativa (RNF-016, ADR-0003).
 */

/**
 * O MSW registra os handlers em `/api` (`mocks/support.ts`). Este endereço é
 * relativo de propósito: o worker intercepta a requisição antes de ela sair, e
 * em `vitest` o `msw/node` faz o mesmo no processo.
 */
const BASE_URL = '/api';

const cliente = criarClienteHttp({
  baseUrl: BASE_URL,
  sessao: portaDeSessao,
  /*
   * Sem renovação automática.
   *
   * O mock do CP5 não tem `/auth/refresh` — e não pode ganhar um agora: os
   * handlers são de outra lane neste checkpoint. Com a renovação ligada, cada
   * `401` legítimo do mock (credencial errada, requisição sem token) dispararia
   * uma chamada a uma rota inexistente, que o `onUnhandledRequest: 'error'` da
   * suíte transformaria em falha de teste sem relação nenhuma com o caso.
   */
  renovarEm401: false,
});

const request = <T>(caminho: string, init?: OpcoesRequisicao): Promise<T> =>
  cliente.request<T>(caminho, init);

/**
 * Endpoint que só existe contra a API real.
 *
 * O `openapi.yaml` tem 43 operações; o cliente do CP5 cobria 30. Das 13 novas,
 * 12 têm método de repositório e caem aqui (cadastro, edição, cancelamento e
 * aprovação de evento, participantes, webhook, reembolso, presença manual,
 * remoção de publicação, `/health` e as duas de admin) — a 13ª, `/auth/refresh`,
 * vive dentro do cliente HTTP e não é chamada por tela nenhuma. Elas fazem parte
 * da interface porque a API as tem; aqui elas falham com um código explícito.
 *
 * Falhar dizendo o motivo é melhor do que as duas alternativas: chamar a rota e
 * deixar o MSW responder o que der (em teste, erro sem explicação; no
 * navegador, um `404` do servidor de arquivos estáticos), ou devolver dado
 * inventado, que mentiria sobre o estado do sistema na demonstração.
 */
function foraDoMock<T>(operacao: string): Promise<T> {
  return Promise.reject(
    new ApiError(
      501,
      'NAO_IMPLEMENTADO_NO_MOCK',
      `"${operacao}" só existe contra a API real. Suba a API e use VITE_DATA_SOURCE=api.`,
      { operacao },
    ),
  );
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

export const httpRepositories: Repositories = {
  auth: {
    obterSessao: () => request<SessaoUsuario>('/sessao'),

    /**
     * Guardar o token é responsabilidade desta camada, não da tela: quem chama
     * `entrar` recebe a sessão pronta e não precisa saber que existe cabeçalho
     * `Authorization`.
     *
     * O mock devolve `{ token, sessao }` — um token só, sem refresh. É a forma
     * do CP5, e é por isso que aqui se usa `definirToken` e não
     * `guardarSessao`: não há par de tokens para guardar.
     */
    entrar: async (credenciais: Credenciais) => {
      const resultado = await request<ResultadoLogin>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciais),
      });
      definirToken(resultado.token);
      return resultado;
    },

    cadastrar: () => foraDoMock('cadastro (POST /auth/cadastro)'),

    sair: async () => {
      try {
        await request<void>('/auth/logout', { method: 'POST' });
      } finally {
        // Sai da sessão local mesmo se o servidor não responder: manter o token
        // depois de um "sair" é pior do que uma sessão órfã no servidor.
        definirToken(null);
      }
    },

    concluirOnboarding: (entrada: EntradaOnboarding) =>
      request<SessaoUsuario>('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    obterFaculdade: () => request<Faculdade>('/faculdade'),

    listarCursos: () => request<Curso[]>('/cursos'),

    listarTurmas: (cursoId: string) => request<Turma[]>(`/cursos/${cursoId}/turmas`),
  },

  payments: {
    iniciar: (participacaoId: string, entrada: NovoPagamento) =>
      request<PagamentoView>(`/participacoes/${participacaoId}/pagamento`, {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    obter: async (participacaoId: string) => {
      try {
        return await request<PagamentoView>(`/participacoes/${participacaoId}/pagamento`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    simularDesfecho: (pagamentoId: string, desfecho: DesfechoSimulado) =>
      request<PagamentoView>(`/pagamentos/${pagamentoId}/simular`, {
        method: 'POST',
        body: JSON.stringify({ desfecho }),
      }),

    solicitarReembolso: () => foraDoMock('reembolso (POST /participacoes/{id}/reembolso)'),

    notificarWebhook: () => foraDoMock('webhook do gateway (POST /pagamentos/webhook)'),
  },

  checkin: {
    obterTokenDoIngresso: (participacaoId: string) =>
      request<TokenIngresso>(`/participacoes/${participacaoId}/token`),

    /**
     * Recusa de check-in vem como `200` com `aceito: false`, não como erro HTTP.
     * Na porta do evento, "ingresso já usado" é uma resposta legítima do sistema
     * e o operador precisa lê-la — não um erro para o console.
     */
    validar: (eventoId: string, leitura: string) =>
      request<ResultadoCheckin>(`/eventos/${eventoId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ leitura }),
      }),

    obterPainel: async (eventoId: string) => {
      try {
        return await request<PainelCheckin>(`/eventos/${eventoId}/checkin`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    registrarPresencaManual: () =>
      foraDoMock('presença manual (POST /participacoes/{id}/presenca-manual)'),
  },

  events: {
    listar: (filtros) => request<EventoView[]>(`/eventos${queryDeFiltros(filtros)}`),

    destaques: () => request<EventoView[]>('/eventos/destaque'),

    /**
     * `404` aqui não é falha do app: é a resposta correta para evento fora do
     * alcance (RN-001) — a API não revela nem a existência dele. A tela mostra
     * "não encontrado" em vez de um erro técnico.
     */
    obter: async (id) => {
      try {
        return await request<EventoView>(`/eventos/${id}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    criar: (entrada: NovoEvento) =>
      request<EventoView>('/eventos', {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    editar: () => foraDoMock('edição de evento (PATCH /eventos/{id})'),

    cancelar: () => foraDoMock('cancelamento de evento (POST /eventos/{id}/cancelamento)'),

    aprovar: () => foraDoMock('aprovação de evento (POST /eventos/{id}/aprovacao)'),

    listarParticipantes: () => foraDoMock('participantes (GET /eventos/{id}/participantes)'),
  },

  participations: {
    /**
     * Recusa por regra de negócio NÃO é exceção: é um resultado previsto do
     * domínio (`ResultadoInscricao`). Evento lotado é o desvio de RN-006, e
     * "você já está inscrito" é RN-015 — os dois têm resposta de UI própria.
     *
     * Exceção fica reservada ao que a tela não sabe tratar: falha de rede,
     * `500`, `401`. Essa separação é o que permite a tela mostrar a mensagem
     * certa em vez de "algo deu errado".
     *
     * O mock devolve a própria união no corpo do `201`; a API real devolve a
     * `Participacao` e deixa o desvio nos códigos de status. A tradução dessa
     * diferença está em `services/api`, não aqui.
     */
    inscrever: async (eventoId) => {
      try {
        return await request<ResultadoInscricao>(`/eventos/${eventoId}/participacoes`, {
          method: 'POST',
        });
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;

        if (error.codigo === 'SEM_VAGA') {
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

        throw error;
      }
    },

    entrarNaListaEspera: (eventoId) =>
      request<Participacao>(`/eventos/${eventoId}/lista-espera`, { method: 'POST' }),

    confirmarOferta: (participacaoId) =>
      request<Participacao>(`/participacoes/${participacaoId}/confirmar`, { method: 'POST' }),

    cancelar: (participacaoId) =>
      request<{ cancelada: boolean; promovido: string | null }>(
        `/participacoes/${participacaoId}`,
        { method: 'DELETE' },
      ),

    listarMinhas: () => request<ParticipacaoView[]>('/participacoes'),

    obter: async (participacaoId) => {
      try {
        return await request<ParticipacaoView>(`/participacoes/${participacaoId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  },

  feed: {
    listar: () => request<PublicacaoView[]>('/feed'),

    publicar: (entrada: NovaPublicacao) =>
      request<PublicacaoView>('/publicacoes', {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    comentar: (publicacaoId: string, entrada: NovoComentario) =>
      request<Comentario>(`/publicacoes/${publicacaoId}/comentarios`, {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    eventosPublicaveis: () =>
      request<Array<{ id: string; titulo: string }>>('/feed/eventos-publicaveis'),

    remover: () => foraDoMock('remoção de publicação (POST /publicacoes/{id}/remocao)'),
  },

  notifications: {
    listar: () => request<Notificacao[]>('/notificacoes'),
    marcarComoLida: (id) => request<void>(`/notificacoes/${id}/lida`, { method: 'POST' }),
    marcarTodasComoLidas: () => request<void>('/notificacoes/lidas', { method: 'POST' }),
  },

  admin: {
    eventosPendentes: () => foraDoMock('eventos pendentes (GET /admin/eventos-pendentes)'),
    regerarCodigoConvite: () =>
      foraDoMock('novo código de convite (GET /admin/turmas/{id}/codigo)'),
  },

  health: {
    /**
     * O mock não tem `/health`, e a resposta honesta é a mesma que a API daria
     * se estivesse degradada — com a diferença de que aqui nunca há banco.
     */
    verificar: () => foraDoMock('saúde da API (GET /health)'),
  },
};
