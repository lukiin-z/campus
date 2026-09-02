import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

/**
 * Entrada do app.
 *
 * O MSW é iniciado ANTES de renderizar: se o app subisse primeiro, a primeira
 * requisição escaparia do interceptador e falharia. No CP6, apagar este bloco é
 * literalmente o que "trocar o mock pela API real" significa (RNF-016, ADR-0003).
 */
async function iniciarMock(): Promise<void> {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    // O base do Vite muda no GitHub Pages: o worker precisa do caminho certo.
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}

async function iniciar(): Promise<void> {
  await iniciarMock();

  const raiz = document.getElementById('root');
  if (!raiz) throw new Error('elemento #root não encontrado');

  createRoot(raiz).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void iniciar();
