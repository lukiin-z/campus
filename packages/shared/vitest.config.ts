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
      /*
       * RNF-015 pede **>= 60%** como piso. Os limites aqui são mais altos
       * porque um limite de 60 com medição em 99,32% de linhas e 97,97% de funções não protege nada: ele
       * deixa passar uma regressão que apaga metade da cobertura sem que
       * ninguém veja.
       *
       * Os números são o medido menos uma folga de cerca de dez pontos —
       * apertados o bastante para acusar perda real, largos o bastante para
       * não reprovar por um ramo a mais num arquivo novo. Quando a medição
       * subir, subir isto junto é trabalho de quem sobe a medição.
       */
      thresholds: { lines: 90, functions: 88, statements: 90, branches: 85 },
    },
  },
});
