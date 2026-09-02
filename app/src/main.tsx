import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AvisoMockIndisponivel } from './components/layout/AvisoMockIndisponivel';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

/**
 * Entrada do app.
 *
 * O MSW é iniciado ANTES de renderizar: se o app subisse primeiro, a primeira
 * requisição escaparia do interceptador e falharia. No CP6, apagar `iniciarMock`
 * é literalmente o que "trocar o mock pela API real" significa (RNF-016,
 * ADR-0003).
 */
async function iniciarMock(): Promise<string | null> {
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      // O base do Vite muda no GitHub Pages: o worker precisa do caminho certo.
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledRequest: 'bypass',
      quiet: true,
    });
    return null;
  } catch (erro) {
    /*
     * Aqui existe por causa de um defeito real: antes, uma falha de registro do
     * service worker rejeitava esta promessa, `iniciar()` morria antes do
     * `createRoot` e o resultado era **tela branca sem nenhuma mensagem** —
     * indistinguível de um erro de build.
     *
     * E a falha não é hipotética: registro de service worker é bloqueado em
     * contexto não seguro, em janela privada de alguns navegadores, quando o
     * usuário desliga armazenamento do site e dentro de iframe com sandbox
     * restritivo. Nenhum desses casos é culpa do app, e em todos eles é melhor
     * mostrar a interface com um aviso do que não mostrar nada.
     */
    return erro instanceof Error ? erro.message : String(erro);
  }
}

async function iniciar(): Promise<void> {
  const falhaDoMock = await iniciarMock();

  const raiz = document.getElementById('root');
  if (!raiz) throw new Error('elemento #root não encontrado');

  createRoot(raiz).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {falhaDoMock && <AvisoMockIndisponivel motivo={falhaDoMock} />}
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void iniciar();
