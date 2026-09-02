import { MOTIVO_RECUSA_INSCRICAO } from '../../types/domain';
import type {
  EventoView,
  FiltroEventos,
  Notificacao,
  NovoEvento,
  MotivoRecusaInscricao,
  Participacao,
  ParticipacaoView,
  PublicacaoView,
  ResultadoInscricao,
  SessaoUsuario,
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

interface ErroApi {
  erro?: string;
  mensagem?: string;
  [chave: string]: unknown;
}

async function request<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
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
  },

  notifications: {
    listar: () => request<Notificacao[]>('/notificacoes'),
    marcarComoLida: (id) => request<void>(`/notificacoes/${id}/lida`, { method: 'POST' }),
  },
};
