import { defineConfig } from 'vitest/config';

/**
 * Os testes do domínio rodam aqui, junto com as funções — e em ambiente `node`,
 * sem jsdom: o pacote não conhece navegador, e o teste não deve dar a ele um.
 * São ~1s contra ~9s da mesma suíte em jsdom.
 *
 * **A cobertura de RNF-015 é medida AQUI**, e não no app, porque é aqui que o
 * domínio vive desde o CP6. Medi-la no app com um `include` apontando para
 * `../packages/` não funciona — o provider v8 resolve o glob a partir da raiz do
 * projeto e ignora o `..`, então o número saía calculado sobre os três arquivos
 * de apresentação que sobraram em `app/src/domain/`. A cobertura caiu de 83%
 * para 63% e o limite reprovou; foi assim que o problema apareceu.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/domain/**/*.ts', 'src/schemas.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // RNF-015: o limite que era do app passou a ser daqui, com o domínio.
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 55 },
    },
  },
});
