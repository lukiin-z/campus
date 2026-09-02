import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Credenciais, EntradaOnboarding } from '../types/domain';
import { queryKeys } from '../lib/queryClient';
import { mensagemDeErro } from './useCampusData';
import { repositories } from '../services';
import { useSessionStore } from '../store/session';
import { useUiStore } from '../store/ui';
import { onboardingPendente } from '@campus/shared';

/**
 * Autenticação e onboarding — RF-002 a RF-005 (o cadastro, RF-001, é do CP6).
 *
 * Separado de `useCampusData` porque a política de cache é oposta: dado de
 * sessão nunca envelhece sozinho (`staleTime: Infinity`) e, ao sair, o cache
 * inteiro tem de ser descartado — não invalidado. Invalidar recarregaria os
 * dados do usuário que acabou de sair.
 */

export function useFaculdade() {
  return useQuery({
    queryKey: queryKeys.faculdade,
    queryFn: () => repositories.auth.obterFaculdade(),
    staleTime: Infinity,
  });
}

export function useCursos() {
  return useQuery({
    queryKey: queryKeys.cursos,
    queryFn: () => repositories.auth.listarCursos(),
    staleTime: Infinity,
  });
}

export function useTurmas(cursoId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.turmas(cursoId ?? ''),
    queryFn: () => repositories.auth.listarTurmas(cursoId as string),
    enabled: Boolean(cursoId),
    staleTime: Infinity,
  });
}

/**
 * Login. O destino depois de entrar depende do vínculo: quem ainda não tem
 * curso e turma vai para o onboarding, não para o feed — um feed sem vínculo
 * seria uma tela vazia sem explicação (RF-004).
 */
export function useEntrar() {
  const definirSessao = useSessionStore((s) => s.definirSessao);
  const mostrarToast = useUiStore((s) => s.mostrarToast);
  const navegar = useNavigate();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (credenciais: Credenciais) => repositories.auth.entrar(credenciais),
    onSuccess: (resultado) => {
      definirSessao(resultado.sessao);
      client.setQueryData(queryKeys.sessao, resultado.sessao);
      // O cache pode ter dados de outra sessão (demo trocando de perfil).
      void client.invalidateQueries();
      const destino = onboardingPendente(resultado.sessao.usuario) ? '/onboarding' : '/';
      navegar(destino, { replace: true });
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}

export function useSair() {
  const encerrarSessao = useSessionStore((s) => s.encerrarSessao);
  const navegar = useNavigate();
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => repositories.auth.sair(),
    onSettled: () => {
      encerrarSessao();
      // `clear`, não `invalidate`: os dados do usuário que saiu não podem
      // reaparecer em uma refetch de fundo.
      client.clear();
      navegar('/login', { replace: true });
    },
  });
}

export function useConcluirOnboarding() {
  const definirSessao = useSessionStore((s) => s.definirSessao);
  const mostrarToast = useUiStore((s) => s.mostrarToast);
  const navegar = useNavigate();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (entrada: EntradaOnboarding) => repositories.auth.concluirOnboarding(entrada),
    onSuccess: (sessao) => {
      definirSessao(sessao);
      client.setQueryData(queryKeys.sessao, sessao);
      void client.invalidateQueries({ queryKey: ['eventos'] });
      void client.invalidateQueries({ queryKey: queryKeys.feed });
      mostrarToast(`Pronto. Você entrou na turma ${sessao.turma?.nome ?? ''}.`, 'sucesso');
      navegar('/', { replace: true });
    },
    onError: (erro) => mostrarToast(mensagemDeErro(erro), 'erro'),
  });
}
