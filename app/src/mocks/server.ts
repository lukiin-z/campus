import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Mesmos handlers, em Node, para os testes de componente e de integração. */
export const server = setupServer(...handlers);
