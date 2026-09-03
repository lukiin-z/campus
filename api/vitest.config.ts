import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/*
 * Testes de unidade da API — ambiente `node`, sem banco.
 *
 * O que se testa aqui é o que ESTA lane escreveu: tradução de erro do Prisma,
 * pipe de validação, mapeadores de linha para tipo de domínio, gateway fake e
 * leitura de ambiente. A regra de negócio já tem 243 casos em
 * `packages/shared` e não é duplicada aqui — repetir o teste da regra dá a
 * sensação de cobertura e mede a mesma coisa duas vezes.
 *
 * O que precisa de PostgreSQL (transação, `FOR UPDATE`, `CHECK`, índice único
 * parcial) é teste de integração e roda em `vitest.int.config.ts`, com banco
 * de verdade — o `SELECT ... FOR UPDATE` não tem como ser exercitado sem ele.
 *
 * `@campus/shared` é apontado para a FONTE aqui, e não para o `dist`, pelo
 * mesmo motivo do `app/vite.config.ts`: o teste não deve depender de alguém ter
 * rodado o build do pacote antes. O `tsc` e o `nest build` continuam usando o
 * `dist`, que é a convenção da API.
 */
const compartilhado = fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@campus/shared': compartilhado },
  },
  test: {
    environment: 'node',
    /*
     * Relativo ao `dir`, e não à raiz: `npm run test -w campus-api` chama
     * `vitest run --dir src`, e um padrão começando com `src/` viraria
     * `src/src/**` — nenhum arquivo casaria, e a suíte passaria por estar
     * vazia. Que é a pior forma de um teste passar.
     */
    include: ['**/*.test.ts'],
  },
});
