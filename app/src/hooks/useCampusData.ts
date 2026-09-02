import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { FiltroEventos, NovoEvento } from '../types/domain';
import { ApiError, repositories } from '../services';
import { queryKeys } from '../lib/queryClient';
import { useSessionStore } from '../store/session';
import { useUiStore } from '../store/ui';

/**
 * Ponte entre as telas e a camada de dados.
 *
 * Nenhuma tela chama `repositories` diretamente: assim a política de cache e de
 * invalidação fica em um lugar só, e a troca do mock pela API real no CP6 não
 * exige revisar cada página (RNF-016).
 */

export function useSessao() {
  const definirSessao = useSessionStore((s) => s.definirSessao);
  const query = useQuery({
    queryKey: queryKeys.sessao,
    queryFn: () => repositories.auth.obterSessao(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) definirSessao(query.data);
  }, [query.data, definirSessao]);

  return query;
}

export function useEventos(filtros?: FiltroEventos) {
  return useQuery({
    queryKey: queryKeys.eventos(filtros),
    queryFn: () => repositories.events.listar(filtros),
  });
}

export function useDestaques() {
  return useQuery({
    queryKey: queryKeys.destaques,
    queryFn: () => repositories.events.destaques(),
  });
}

export function useEvento(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.evento(id ?? ''),
    queryFn: () => repositories.events.obter(id as string),
    enabled: Boolean(id),
  });
}

export function useFeed() {
  return useQuery({
    queryKey: queryKeys.feed,
    queryFn: () => repositories.feed.listar(),
  });
}

export function useMinhasParticipacoes() {
  return useQuery({
    queryKey: queryKeys.minhasParticipacoes,
    queryFn: () => repositories.participations.listarMinhas(),
  });
}

export function useParticipacao(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.participacao(id ?? ''),
    queryFn: () => repositories.participations.obter(id as string),
    enabled: Boolean(id),
  });
}

export function useNotificacoes() {
  return useQuery({
    queryKey: queryKeys.notificacoes,
    queryFn: () => repositories.notifications.listar(),
  });
}

/**
 * Toda mutação que muda vaga invalida: o evento em questão, a lista, os
 * destaques e as minhas participações. Contador de vagas desatualizado na tela é
 * exatamente o problema que o produto promete resolver — então aqui não se
 * economiza invalidação.
 */
function useInvalidarVagas() {
  const client = useQueryClient();
  return (eventoId?: string) => {
    if (eventoId) void client.invalidateQueries({ queryKey: queryKeys.evento(eventoId) });
    void client.invalidateQueries({ queryKey: ['eventos'] });
    void client.invalidateQueries({ queryKey: queryKeys.minhasParticipacoes });
    void client.invalidateQueries({ queryKey: queryKeys.notificacoes });
  };
}

export function useInscrever(eventoId: string) {
  const invalidar = useInvalidarVagas();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: () => repositories.participations.inscrever(eventoId),
    onSuccess: (resultado) => {
      invalidar(eventoId);
      switch (resultado.tipo) {
        case 'CONFIRMADA':
          mostrarToast('Inscrição confirmada.', 'sucesso');
          break;
        case 'PENDENTE_PAGAMENTO':
          mostrarToast('Vaga reservada. Você tem 60 min para pagar.', 'info');
          break;
        case 'SEM_VAGA':
          mostrarToast(
            resultado.totalFila > 0
              ? `Evento lotado: ${resultado.totalFila} na fila. Entre na lista de espera.`
              : 'Evento lotado. Entre na lista de espera.',
            'info',
          );
          break;
        case 'RECUSADA':
          mostrarToast(resultado.mensagem, 'erro');
          break;
      }
    },
    onError: (erro) => {
      mostrarToast(mensagemDeErro(erro), 'erro');
    },
  });
}

export function useEntrarNaListaEspera(eventoId: string) {
  const invalidar = useInvalidarVagas();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: () => repositories.participations.entrarNaListaEspera(eventoId),
    onSuccess: (participacao) => {
      invalidar(eventoId);
      mostrarToast(`Você é o ${participacao.posicaoFila}º da fila.`, 'sucesso');
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useCancelarParticipacao() {
  const invalidar = useInvalidarVagas();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: { participacaoId: string; eventoId?: string }) =>
      repositories.participations.cancelar(entrada.participacaoId),
    onSuccess: (resultado, entrada) => {
      invalidar(entrada.eventoId);
      mostrarToast(
        resultado.promovido
          ? 'Inscrição cancelada. A vaga foi oferecida ao primeiro da fila.'
          : 'Inscrição cancelada.',
        'sucesso',
      );
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useConfirmarOferta() {
  const invalidar = useInvalidarVagas();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: { participacaoId: string; eventoId?: string }) =>
      repositories.participations.confirmarOferta(entrada.participacaoId),
    onSuccess: (_, entrada) => {
      invalidar(entrada.eventoId);
      mostrarToast('Vaga confirmada.', 'sucesso');
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useCriarEvento() {
  const client = useQueryClient();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: NovoEvento) => repositories.events.criar(entrada),
    onSuccess: (evento) => {
      void client.invalidateQueries({ queryKey: ['eventos'] });
      mostrarToast(
        evento.status === 'RASCUNHO'
          ? 'Rascunho salvo. Só você vê este evento.'
          : evento.status === 'EM_APROVACAO'
            ? 'Evento enviado para aprovação da faculdade.'
            : 'Evento publicado.',
        'sucesso',
      );
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useMarcarNotificacaoLida() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.notifications.marcarComoLida(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notificacoes });
    },
  });
}

/** Mensagem de erro no tom de voz da marca: diz o que aconteceu, sem jargão. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  if (erro instanceof Error && erro.message) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.';
  }
  return 'Algo não funcionou. Tente de novo.';
}
