import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DesfechoSimulado, NovoPagamento } from '../types/domain';
import { queryKeys } from '../lib/queryClient';
import { mensagemDeErro } from './useCampusData';
import { repositories } from '../services';
import { useUiStore } from '../store/ui';

/**
 * Pagamento simulado — RF-026 a RF-030.
 *
 * Toda mutação daqui invalida a participação e as minhas participações: o
 * pagamento confirmado muda o status da inscrição, e um ingresso que continua
 * dizendo "pagamento pendente" depois de pago é o pior defeito possível nesta
 * tela.
 */

function useInvalidarPagamento(participacaoId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.pagamento(participacaoId) });
    void client.invalidateQueries({ queryKey: queryKeys.participacao(participacaoId) });
    void client.invalidateQueries({ queryKey: queryKeys.minhasParticipacoes });
    void client.invalidateQueries({ queryKey: queryKeys.notificacoes });
    void client.invalidateQueries({ queryKey: ['eventos'] });
  };
}

export function usePagamento(participacaoId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pagamento(participacaoId ?? ''),
    queryFn: () => repositories.payments.obter(participacaoId as string),
    enabled: Boolean(participacaoId),
    // A janela de RN-012 corre em minutos: o valor precisa envelhecer rápido.
    staleTime: 10_000,
  });
}

export function useIniciarPagamento(participacaoId: string) {
  const invalidar = useInvalidarPagamento(participacaoId);
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: NovoPagamento) => repositories.payments.iniciar(participacaoId, entrada),
    onSuccess: () => invalidar(),
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

/**
 * Dispara o webhook simulado. No CP6 quem chama é o gateway — o nome do hook
 * carrega isso de propósito, para ninguém confundir simulação com fluxo real.
 */
export function useSimularDesfecho(participacaoId: string) {
  const invalidar = useInvalidarPagamento(participacaoId);
  const mostrarToast = useUiStore((s) => s.mostrarToast);

  return useMutation({
    mutationFn: (entrada: { pagamentoId: string; desfecho: DesfechoSimulado }) =>
      repositories.payments.simularDesfecho(entrada.pagamentoId, entrada.desfecho),
    onSuccess: (pagamento) => {
      invalidar();
      if (pagamento.status === 'CONFIRMADO') {
        mostrarToast('Pagamento confirmado. Sua vaga está garantida.', 'sucesso');
      } else if (pagamento.status === 'RECUSADO') {
        mostrarToast('O pagamento foi recusado. Tente outro método.', 'erro');
      } else if (pagamento.status === 'ESTORNADO') {
        mostrarToast('A vaga expirou antes do pagamento: o valor será estornado.', 'erro');
      } else {
        mostrarToast('Nada mudou: essa notificação já havia sido processada.', 'info');
      }
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}
