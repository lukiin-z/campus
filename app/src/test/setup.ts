import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';
import { resetDb } from '../mocks/db';

/**
 * Cada teste começa com o banco no seed e com os handlers do MSW ativos: o teste
 * exercita a mesma camada HTTP que o app usa, não um atalho.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  resetDb();
});

afterAll(() => server.close());
