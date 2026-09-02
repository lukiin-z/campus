import { create } from 'zustand';
import type { SessaoUsuario } from '../types/domain';

/**
 * Sessão do usuário autenticado.
 *
 * A store é a única fonte da sessão para as telas: nenhuma delas lê o usuário
 * atual de outro lugar. Quem a preenche é o hook de login (RF-003) ou, no
 * primeiro carregamento com token guardado, `useSessao`.
 *
 * O token NÃO vive aqui: ele fica na camada de serviço (`services/http`), que é
 * quem precisa dele para montar o cabeçalho. Guardá-lo também aqui criaria duas
 * verdades sobre "estou autenticado".
 */

interface SessionState {
  sessao: SessaoUsuario | null;
  /** Distingue "ainda não sei" de "sei que não há sessão" — a guarda de rota
   * precisa dessa diferença para não piscar a tela de login no F5. */
  resolvida: boolean;
  definirSessao: (sessao: SessaoUsuario) => void;
  marcarResolvida: () => void;
  encerrarSessao: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessao: null,
  resolvida: false,
  definirSessao: (sessao) => set({ sessao, resolvida: true }),
  marcarResolvida: () => set({ resolvida: true }),
  encerrarSessao: () => set({ sessao: null, resolvida: true }),
}));
