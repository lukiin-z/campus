// `defineConfig` do vitest/config aceita o bloco `test` sem plugin extra.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/*
 * `@campus/shared` resolvido pela FONTE, não pelo `dist`.
 *
 * O pacote é do mesmo repositório, e apontar para o build faria `npm run dev`
 * servir uma versão velha do domínio até alguém rodar o build do pacote — o tipo
 * de erro que consome uma tarde. O alias equivalente do TypeScript está em
 * `tsconfig.app.json`; os dois têm de andar juntos, e é o que
 * `scripts/check-contrato.mjs` verifica.
 */
const compartilhado = fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url));

// A base precisa casar com o caminho do GitHub Pages (https://lukiin-z.github.io/campus/).
// Em dev e em teste a base é '/', senão o roteador e os assets quebram localmente.
const base = process.env.GITHUB_PAGES === 'true' ? '/campus/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { '@campus/shared': compartilhado },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separa o vendor para o pacote inicial caber no orçamento do RNF-007.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Os testes do domínio moraram em `app/src/domain/` até o CP5 e agora vivem
    // com as funções, no pacote. A suíte do app roda os dois: a fronteira do
    // pacote não deve custar um segundo comando para ver tudo verde.
    include: ['src/**/*.{test,spec}.{ts,tsx}', '../packages/shared/src/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      /*
       * Só `app/src`. O domínio migrou para `packages/shared/` no CP6 e é medido
       * lá, pelo `vitest.config.ts` do pacote — um `include` com `..` aqui NÃO
       * funciona: o provider v8 resolve o glob a partir da raiz do projeto e
       * descarta o caminho de fora, então o limite passaria a valer sobre os
       * três arquivos de apresentação que sobraram. O número caiu de 83% para
       * 63% e o limite reprovou; foi assim que isso apareceu.
       */
      include: ['src/domain/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // RNF-015: cobertura mínima nos módulos de domínio.
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 55 },
    },
  },
});
