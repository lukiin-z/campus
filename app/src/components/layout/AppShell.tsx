import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { ToastViewport } from './ToastViewport';

/**
 * Moldura do app: barra superior, conteúdo em coluna de largura máxima e
 * navegação inferior.
 *
 * O link "pular para o conteúdo" é o primeiro elemento focável da página — sem
 * ele, quem navega por teclado atravessa a barra superior inteira em cada tela
 * (RNF-003).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-body-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <TopBar />

      <main id="conteudo" className="mx-auto max-w-content px-5 pb-24 pt-6">
        {children}
      </main>

      <BottomNav />
      <ToastViewport />
    </div>
  );
}
