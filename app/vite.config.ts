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
      /*
       * `src/lib/` entrou no CP6: é onde vive o cliente HTTP com a renovação de
       * sessão, e ele estava **fora da medição** — o arquivo mais delicado da
       * camada de dados não aparecia em nenhum número.
       */
      include: ['src/domain/**/*.ts', 'src/services/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // RNF-015: cobertura mínima nos módulos de domínio.
      /*
       * RNF-015 pede **>= 60%** como piso. Os limites aqui são mais altos
       * porque um limite de 60 com medição em 96,68% de linhas e 90,97% de funções não protege nada: ele
       * deixa passar uma regressão que apaga metade da cobertura sem que
       * ninguém veja.
       *
       * Os números são o medido menos uma folga de cerca de dez pontos —
       * apertados o bastante para acusar perda real, largos o bastante para
       * não reprovar por um ramo a mais num arquivo novo. Quando a medição
       * subir, subir isto junto é trabalho de quem sobe a medição.
       */
      thresholds: { lines: 88, functions: 82, statements: 88, branches: 78 },
    },
  },
});
