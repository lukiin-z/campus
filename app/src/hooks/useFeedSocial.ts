import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NovaPublicacao } from '../types/domain';
import { queryKeys } from '../lib/queryClient';
import { mensagemDeErro } from './useCampusData';
import { repositories } from '../services';
import { useUiStore } from '../store/ui';

/**
 * Escrita no feed — RF-037 e RF-038.
 *
 * Nome com sufixo `Social` para não colidir com `useFeed` de `useCampusData`,
 * que é a leitura. Publicação e comentário invalidam o feed inteiro em vez de
 * costurar o item novo no cache: o feed é segmentado por alcance (RN-001) e
 * quem decide se a publicação aparece é o servidor, não a tela.
 */

export function useEventosPublicaveis() {
  return useQuery({
    queryKey: queryKeys.eventosPublicaveis,
    queryFn: () => repositories.feed.eventosPublicaveis(),
  });
}

export function usePublicar() {
  const client = useQueryClient();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: NovaPublicacao) => repositories.feed.publicar(entrada),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.feed });
      mostrarToast('Publicado no feed do evento.', 'sucesso');
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useComentar() {
  const client = useQueryClient();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: { publicacaoId: string; texto: string }) =>
      repositories.feed.comentar(entrada.publicacaoId, { texto: entrada.texto }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.feed });
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

/**
 * Sem toast, ao contrário das outras mutações deste arquivo: o retorno da ação
 * é a própria lista perdendo os marcadores de "novo", na mesma tela e no mesmo
 * instante. Um toast dizendo "marcadas como lidas" sobre uma lista que acabou
 * de mudar é ruído — e ainda cobre o conteúdo em tela pequena.
 */
export function useMarcarTodasLidas() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.notifications.marcarTodasComoLidas(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notificacoes });
    },
  });
}
