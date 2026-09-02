import { create } from 'zustand';
import type { SessaoUsuario } from '../types/domain';

/**
 * Sessão do usuário autenticado.
 *
 * No CP5 a sessão vem do mock (`GET /api/sessao`) — o login real é RF-003, da
 * Sprint 2. A store existe desde já para que nenhuma tela leia o usuário atual de
 * outro lugar: quando o login entrar, muda só quem preenche isto.
 */

interface SessionState {
  sessao: SessaoUsuario | null;
  definirSessao: (sessao: SessaoUsuario) => void;
  encerrarSessao: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessao: null,
  definirSessao: (sessao) => set({ sessao }),
  encerrarSessao: () => set({ sessao: null }),
}));
