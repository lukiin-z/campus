import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/server';
import { resetDb } from '../mocks/db';
import { definirToken } from '../services';

/**
 * Cada teste começa com o banco no seed e com os handlers do MSW ativos: o teste
 * exercita a mesma camada HTTP que o app usa, não um atalho.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  resetDb();

  /*
   * O token também é estado global, e não estava sendo zerado.
   *
   * Ele vive em uma variável de módulo de `services/http` (mais o
   * `sessionStorage`), fora do alcance de `resetDb`. Um teste que chamasse
   * `auth.entrar` deixava a sessão de OUTRO usuário ativa para todos os
   * seguintes — e o sintoma era um "Você só pode cancelar a sua própria
   * inscrição" em um teste que não fala de cancelamento nenhum.
   *
   * Apareceu ao cobrir os métodos de autenticação, que até o CP6 nenhum teste
   * chamava.
   */
  definirToken(null);
});

afterAll(() => server.close());
