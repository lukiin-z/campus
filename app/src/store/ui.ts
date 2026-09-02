import { create } from 'zustand';

/**
 * Estado de UI que não é dado do servidor: toasts e o filtro corrente da lista.
 *
 * Dado do servidor vive no TanStack Query; aqui fica só o que é efêmero e local
 * (ADR-0003). Misturar os dois é a forma mais rápida de ter cache desatualizado.
 */

export type ToastVariant = 'info' | 'sucesso' | 'erro';

export interface Toast {
  id: number;
  mensagem: string;
  variante: ToastVariant;
}

interface UiState {
  toasts: Toast[];
  mostrarToast: (mensagem: string, variante?: ToastVariant) => void;
  removerToast: (id: number) => void;
}

let contador = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  mostrarToast: (mensagem, variante = 'info') => {
    contador += 1;
    const id = contador;
    set((estado) => ({ toasts: [...estado.toasts, { id, mensagem, variante }] }));
    // O toast some sozinho: 4s é o suficiente para ler duas linhas.
    setTimeout(() => {
      set((estado) => ({ toasts: estado.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removerToast: (id) => set((estado) => ({ toasts: estado.toasts.filter((t) => t.id !== id) })),
}));
