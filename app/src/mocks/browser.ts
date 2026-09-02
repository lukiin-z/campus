import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Service worker do MSW no navegador.
 *
 * O app fala HTTP de verdade desde o CP4: `fetch('/api/eventos')` sai da camada
 * de repositório, é interceptado aqui e respondido pelo mock em memória. No CP6
 * este worker é desligado e a mesma requisição sai para a API real — nenhuma
 * tela é tocada (RNF-016, ADR-0003).
 */
export const worker = setupWorker(...handlers);
