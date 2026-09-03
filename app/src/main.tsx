import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AvisoMockIndisponivel } from './components/layout/AvisoMockIndisponivel';
import { LimiteDeErro } from './components/layout/LimiteDeErro';
import { queryClient } from './lib/queryClient';
import { usandoApiReal } from './services';
import './styles/index.css';

/**
 * Entrada do app.
 *
 * O MSW é iniciado ANTES de renderizar, e SÓ no modo mock: se o app subisse
 * primeiro, a primeira requisição escaparia do interceptador; e com
 * `VITE_DATA_SOURCE=api` o worker interceptaria as chamadas antes de elas
 * chegarem à API real.
 *
 * No CP5 o comentário aqui dizia que "apagar `iniciarMock` é literalmente o que
 * trocar o mock pela API real significa". Deixou de ser verdade no CP6: não se
 * apaga mais nada, escolhe-se por variável de ambiente (RNF-016, ADR-0003), e as
 * duas implementações convivem atrás da mesma interface. É o que faz o ambiente
 * de teste do CP5 continuar funcionando sem servidor.
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
  /*
   * O teste é escrito com `import.meta.env` inline de propósito, e não com a
   * constante `usandoApiReal`: assim o Vite dobra a condição em tempo de build e
   * o Rollup DESCARTA o chunk do MSW (~110 KB gzip) na build `api`. Com a
   * constante importada, o bundler não consegue provar que o ramo é morto e
   * carrega o worker inteiro num pacote que nunca vai usá-lo.
   *
   * `usandoApiReal` continua importado porque é ele que o resto do app consulta
   * — a duplicação aqui é deliberada e tem uma razão medível.
   */
  const falhaDoMock =
    import.meta.env.VITE_DATA_SOURCE === 'api' || usandoApiReal ? null : await iniciarMock();

  const raiz = document.getElementById('root');
  if (!raiz) throw new Error('elemento #root não encontrado');

  createRoot(raiz).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {falhaDoMock && <AvisoMockIndisponivel motivo={falhaDoMock} />}
          {/*
            A fronteira fica DENTRO do router e DEPOIS do aviso, de propósito:
            assim um erro de renderização não leva embora nem a navegação nem a
            explicação de por que os dados não vieram — que foi exatamente o que
            aconteceu na medição que motivou o componente.
          */}
          <LimiteDeErro>
            <App />
          </LimiteDeErro>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void iniciar();
