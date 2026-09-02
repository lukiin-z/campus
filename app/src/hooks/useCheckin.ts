import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { mensagemDeErro } from './useCampusData';
import { repositories } from '../services';
import { useUiStore } from '../store/ui';

/**
 * Check-in — RF-033 a RF-035.
 *
 * O token do ingresso não é cacheado por muito tempo: ele carrega o instante de
 * emissão, e um token velho na tela é um token que o CP6 vai recusar por
 * expiração. 60 segundos é o meio entre não piscar e não envelhecer.
 */

export function useTokenIngresso(participacaoId: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: queryKeys.tokenIngresso(participacaoId ?? ''),
    queryFn: () => repositories.checkin.obterTokenDoIngresso(participacaoId as string),
    enabled: Boolean(participacaoId) && habilitado,
    staleTime: 60_000,
  });
}

export function usePainelCheckin(eventoId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.painelCheckin(eventoId ?? ''),
    queryFn: () => repositories.checkin.obterPainel(eventoId as string),
    enabled: Boolean(eventoId),
    // O painel é usado na porta do evento, com fila andando.
    refetchInterval: 15_000,
  });
}

/**
 * Validar uma leitura. Recusa NÃO é erro: `aceito: false` chega em `onSuccess`
 * com o motivo específico, e é a tela que decide a cor do retorno. Erro de rede
 * é que cai em `onError`.
 */
export function useValidarCheckin(eventoId: string) {
  const client = useQueryClient();
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (leitura: string) => repositories.checkin.validar(eventoId, leitura),
    onSuccess: (resultado) => {
      if (resultado.aceito) {
        void client.invalidateQueries({ queryKey: queryKeys.painelCheckin(eventoId) });
        void client.invalidateQueries({ queryKey: queryKeys.evento(eventoId) });
      }
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}
