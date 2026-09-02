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
import { ApiError, type Repositories } from '../index';

/**
 * Implementação HTTP dos repositórios.
 *
 * Hoje as requisições são interceptadas pelo MSW (src/mocks/browser.ts) e
 * respondidas pelo mock em memória; no CP6 elas saem para a API real sem
 * mudar uma linha daqui além de `BASE_URL`. Ver ADR-0003.
 */

const BASE_URL = '/api';

const CHAVE_TOKEN = 'campus.token';

/**
 * Token da sessão.
 *
 * Guardado em `sessionStorage` (não em `localStorage`): fechar a aba encerra a
 * sessão, que é o comportamento certo para app usado em computador de laboratório
 * compartilhado — o cenário real das personas (RNF-020).
 */
let tokenAtual: string | null = lerTokenGuardado();

function lerTokenGuardado(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(CHAVE_TOKEN) ?? null;
  } catch {
    // Modo privado e iframe bloqueiam storage. Sessão em memória ainda funciona.
    return null;
  }
}

export function definirToken(token: string | null): void {
  tokenAtual = token;
  try {
    if (token) globalThis.sessionStorage?.setItem(CHAVE_TOKEN, token);
    else globalThis.sessionStorage?.removeItem(CHAVE_TOKEN);
  } catch {
    // Ignora: o token em memória basta até a aba fechar.
  }
}

export function obterToken(): string | null {
  return tokenAtual;
}

interface ErroApi {
  erro?: string;
  mensagem?: string;
  [chave: string]: unknown;
}

async function request<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenAtual ? { Authorization: `Bearer ${tokenAtual}` } : {}),
      ...init?.headers,
    },
  });

  if (resposta.status === 204) return undefined as T;

  const corpo = (await resposta.json().catch(() => ({}))) as unknown;

  if (!resposta.ok) {
    const dados = corpo as ErroApi;
    const { erro, mensagem, ...extra } = dados;
    throw new ApiError(
      resposta.status,
      erro ?? 'ERRO_DESCONHECIDO',
      mensagem ?? 'Não foi possível concluir a operação. Tente de novo.',
      extra,
    );
  }

  return corpo as T;
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
     */
    entrar: async (credenciais: Credenciais) => {
      const resultado = await request<ResultadoLogin>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciais),
      });
      definirToken(resultado.token);
      return resultado;
    },

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
  },

  notifications: {
    listar: () => request<Notificacao[]>('/notificacoes'),
    marcarComoLida: (id) => request<void>(`/notificacoes/${id}/lida`, { method: 'POST' }),
    marcarTodasComoLidas: () => request<void>('/notificacoes/lidas', { method: 'POST' }),
  },
};
