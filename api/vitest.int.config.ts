import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

/*
 * Testes de INTEGRAÇÃO da API — Nest de verdade, PostgreSQL de verdade.
 *
 * O que roda aqui é o que só um banco prova: `SELECT ... FOR UPDATE` sob
 * concorrência, `CHECK` e índice único parcial chegando como erro de negócio,
 * transação que reverte inteira, e o alcance de RN-001 verificado por
 * requisição HTTP em handler de escrita. O que é decisão pura já tem 243 casos
 * em `packages/shared` e não é repetido — repetir mediria a mesma coisa duas
 * vezes e daria a sensação de cobertura.
 *
 * O banco é o serviço `db-teste` do compose (perfil `teste`, porta 5433):
 *
 *     docker compose --profile teste up -d db-teste
 *     DATABASE_URL=... npx prisma migrate deploy   # dentro de api/
 *     npm run test:int -w campus-api
 *
 * Testcontainers seria mais isolado, mas o pacote não está instalado e o CP6
 * não abre dependência nova; `db-teste` já existe com porta, volume e nome de
 * banco distintos do `db` de desenvolvimento, que é a propriedade que importa.
 */

/**
 * `emitDecoratorMetadata` — sem isto, o container do Nest não sobe.
 *
 * O Vitest transforma TypeScript com esbuild, e o esbuild **não** implementa
 * `emitDecoratorMetadata`. Sem esse metadado não existe `design:paramtypes`, e
 * a injeção por tipo de construtor (`constructor(private readonly prisma:
 * PrismaService)`) para de resolver: o Nest lança "Nest can't resolve
 * dependencies" em toda classe do projeto. Não é ajuste de conforto — é a
 * diferença entre o teste rodar e não rodar.
 *
 * As saídas eram: (a) plugin de SWC, que exigiria dependência nova; (b) pôr
 * `@Inject()` explícito em todo construtor de `api/src`, o que é mudança em
 * código de produção para servir ao teste; ou (c) transpilar `api/src` com o
 * próprio `typescript`, que já está no repositório. (c) é a única que não
 * cobra nada de ninguém.
 *
 * `module: ESNext` de propósito: o Vite precisa de `import`/`export` para
 * resolver o grafo. O `commonjs` do `api/tsconfig.json` vale para o
 * `nest build`, que é outro alvo.
 */
function transpilarComTypeScript(): Plugin {
  const raiz = fileURLToPath(new URL('./src/', import.meta.url)).replace(/\\/g, '/');

  return {
    name: 'campus:emit-decorator-metadata',
    enforce: 'pre',
    transform(codigo, id) {
      const caminho = id.replace(/\\/g, '/');
      if (!caminho.startsWith(raiz) || !caminho.endsWith('.ts')) return null;

      const saida = ts.transpileModule(codigo, {
        fileName: id,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          useDefineForClassFields: false,
          sourceMap: true,
          inlineSources: true,
        },
      });

      return { code: saida.outputText, map: saida.sourceMapText ?? null };
    },
  };
}

const compartilhado = fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [transpilarComTypeScript()],
  resolve: {
    // Mesma razão de `vitest.config.ts`: o teste não deve depender de alguém
    // ter rodado `npm run build -w @campus/shared` antes.
    alias: { '@campus/shared': compartilhado },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.int.test.ts'],

    /*
     * `globalSetup` roda UMA vez, no processo principal: sobe o `db-teste` se
     * ele não estiver de pé e aplica a migration. É o que faz
     * `npm run test:int -w campus-api` bastar por si — sem ele, quem esquecesse
     * um dos passos de ambiente receberia "table does not exist" em 95 casos ao
     * mesmo tempo.
     *
     * `setupFiles` roda em CADA worker, antes de coletar o arquivo: é onde as
     * variáveis que `carregarAmbiente()` exige são definidas.
     */
    globalSetup: ['./test/suporte/preparar-banco.ts'],
    setupFiles: ['./test/suporte/ambiente.ts'],

    /*
     * UM banco, UM arquivo por vez. Cada caso redefine o estado inteiro (ver
     * `test/suporte/banco.ts`); dois arquivos em paralelo truncariam a tabela
     * que o outro acabou de popular, e a suíte falharia de forma diferente a
     * cada execução — que é pior do que falhar sempre.
     */
    fileParallelism: false,
    sequence: { concurrent: false },

    // Boot do Nest + argon2 + reset do banco. O caso de concorrência dispara
    // dezenas de transações que se serializam na trava, e isso leva segundos.
    testTimeout: 60_000,
    hookTimeout: 120_000,

    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      /*
       * `seed/` fora: é script de dado de demonstração, não superfície da API —
       * está excluído do alvo de 70% de propósito. `main.ts` fora porque
       * `bootstrap()` só roda em processo de verdade; o que ele configura
       * (prefixo, filtro, guard) é exercitado por requisição nos testes.
       */
      exclude: ['src/seed/**', 'src/main.ts', 'src/**/*.test.ts'],
      reporter: ['text', 'json-summary'],
      /*
       * O padrão do Vitest é NÃO emitir relatório quando algum caso falha — e
       * isso esconde a cobertura exatamente quando ela é mais útil: com um
       * defeito aberto e um caso vermelho de propósito, ainda é preciso saber
       * quanto do domínio está exercitado.
       */
      reportOnFailure: true,
    },
  },
});
