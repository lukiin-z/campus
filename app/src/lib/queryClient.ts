import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services';

/**
 * Configuração do cache de dados.
 *
 * `retry` não repete erro de negócio: um `409 JA_INSCRITO` ou um `422` não vão
 * mudar de resposta na segunda tentativa, e repetir só atrasa a mensagem que o
 * usuário precisa ler. Falha de rede (sem status) ainda é repetida uma vez.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (tentativas, erro) => {
        if (erro instanceof ApiError) return false;
        return tentativas < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/** Chaves de cache centralizadas: evita invalidação por string solta. */
export const queryKeys = {
  sessao: ['sessao'] as const,
  eventos: (filtros?: unknown) => ['eventos', filtros ?? null] as const,
  destaques: ['eventos', 'destaque'] as const,
  evento: (id: string) => ['evento', id] as const,
  minhasParticipacoes: ['participacoes', 'minhas'] as const,
  participacao: (id: string) => ['participacao', id] as const,
  feed: ['feed'] as const,
  eventosPublicaveis: ['feed', 'eventos-publicaveis'] as const,
  notificacoes: ['notificacoes'] as const,
  faculdade: ['faculdade'] as const,
  cursos: ['cursos'] as const,
  turmas: (cursoId: string) => ['turmas', cursoId] as const,
  pagamento: (participacaoId: string) => ['pagamento', participacaoId] as const,
  tokenIngresso: (participacaoId: string) => ['token-ingresso', participacaoId] as const,
  painelCheckin: (eventoId: string) => ['painel-checkin', eventoId] as const,
};
