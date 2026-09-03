import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

/**
 * Dois modos, dois projetos — RNF-016 em forma executável.
 *
 * | Projeto | Fonte de dados | Front | O que prova |
 * |---|---|---|---|
 * | `mock-mobile-chromium` | MSW em memória (`VITE_DATA_SOURCE` padrão) | `dist`, porta 4174 | o artefato do GitHub Pages funciona sem servidor nenhum |
 * | `api-mobile-chromium` | API + PostgreSQL de verdade | `dist-api.local`, porta 4175 | o MESMO front, com a fonte trocada, funciona contra a stack |
 *
 * Os dois coexistem de propósito. O mock sustenta a demonstração publicada e os
 * 6 casos que já existiam; a stack real prova que a troca de fonte é só o
 * container de repositórios (`app/src/services/index.ts`), e não uma reescrita.
 * Se um dia só um dos dois passar, o que quebrou é a fronteira.
 *
 * ## As quatro armadilhas deste arquivo, e como cada uma foi fechada
 *
 * 1. **`reuseExistingServer` adotando o servidor errado.** Já aconteceu neste
 *    projeto e reprovou 6 de 6: um `vite preview` esquecido serve um `dist`
 *    antigo, e o Playwright o adota em silêncio. Contra a stack real isso é
 *    fatal — `VITE_DATA_SOURCE` e `VITE_API_URL` são embutidos em TEMPO DE
 *    BUILD, então um servidor adotado pode estar servindo o build do mock com o
 *    endereço da API ausente. Por isso `reuseExistingServer: false` nos três
 *    servidores, sem exceção para local: subir de novo custa segundos, e
 *    depurar um build errado custa uma tarde.
 * 2. **Um `dist` para dois builds.** `vite build` escreve em `dist` e
 *    `vite preview` serve `dist`. Dois builds com env diferente no mesmo
 *    diretório fazem o segundo apagar o primeiro, e os dois servidores passam a
 *    servir o mesmo bundle. O modo API tem diretório próprio,
 *    `dist-api.local` — o sufixo `.local` cai no `*.local` que o `.gitignore`
 *    já tem, então a saída não aparece como arquivo novo no repositório.
 * 3. **Portas colidindo.** 4174 (front mock), 4175 (front API) e 3100 (API) são
 *    distintas e todas com `--strictPort`: porta ocupada falha alto em vez de
 *    escorregar para a seguinte.
 * 4. **Segredo em arquivo versionado.** `JWT_SECRET` e `WEBHOOK_SECRET` são
 *    sorteados a cada execução, salvo se já vierem do ambiente. Nenhum valor
 *    literal aqui.
 */

const PORTA_FRONT_MOCK = 4174;
const PORTA_FRONT_API = 4175;
const PORTA_API = 3100;

/**
 * Saída do build em modo API. O caminho é escolhido, não decorativo:
 *
 * - o pai termina em `.local`, que o `.gitignore` da raiz já cobre (`*.local`),
 *   então o build não aparece como arquivo novo no repositório;
 * - a folha se chama `dist`, que o `ignorePatterns` de `app/.eslintrc.cjs` já
 *   cobre. Sem isso, `npm run lint -w campus-app` passa a lintar o bundle
 *   minificado e devolve milhares de erros — foi o que aconteceu com o nome
 *   `dist-api.local`, que nenhuma das duas listas alcançava.
 *
 * Ou seja: os dois ignores que já existem bastam, e nenhum arquivo fora desta
 * lane precisa mudar.
 */
const SAIDA_FRONT_API = 'stack-real.local/dist';

const BASE_DA_API = `http://localhost:${PORTA_API}/api`;
const ORIGEM_FRONT_API = `http://localhost:${PORTA_FRONT_API}`;

/** `${NOME:-padrão}` do compose: valor vazio conta como ausente. */
function ler(nome: string, padrao: string): string {
  const valor = process.env[nome];
  return valor === undefined || valor.trim().length === 0 ? padrao : valor;
}

/**
 * Banco da stack de teste: o serviço `db-teste` do compose (perfil `teste`),
 * porta 5433. Os padrões são os documentados em `.env.example`
 * (`POSTGRES_TESTE_*`, `DB_TESTE_PORT`) — credenciais de container descartável em
 * `localhost`, não segredo. `e2e/preparar-stack.mjs` sobe o container, aplica a
 * migration e reaplica o seed antes de a API atender a primeira requisição.
 */
const DATABASE_URL = ler(
  'DATABASE_URL',
  `postgresql://${ler('POSTGRES_TESTE_USER', 'campus')}:${ler(
    'POSTGRES_TESTE_PASSWORD',
    'campus_dev_local',
  )}@localhost:${ler('DB_TESTE_PORT', '5433')}/${ler('POSTGRES_TESTE_DB', 'campus_teste')}?schema=public`,
);

const ambienteDaApi: Record<string, string> = {
  DATABASE_URL,
  JWT_SECRET: ler('JWT_SECRET', randomBytes(48).toString('base64url')),
  WEBHOOK_SECRET: ler('WEBHOOK_SECRET', randomBytes(32).toString('base64url')),
  PORT: String(PORTA_API),
  NODE_ENV: 'test',
  /*
   * Sem esta flag, `POST /pagamentos/:id/simular` responde 404 (ADR-0006) e o
   * fluxo de pagamento do E2E morre no passo do gateway. É o mesmo motivo de a
   * stack de demonstração ligá-la: não há gateway de verdade para notificar.
   */
  PERMITIR_SIMULACAO_PAGAMENTO: 'true',
  // O seed APAGA as 14 tabelas antes de inserir. O consentimento é explícito
  // porque o banco é descartável — é a função dele.
  SEED_PERMITIR_RESET: 'true',
  // O navegador fala com `localhost:3100` a partir de `localhost:4175`: origem
  // cruzada. Sem esta linha, toda requisição do front morre no preflight.
  CORS_ORIGINS: ORIGEM_FRONT_API,
  TZ: ler('TZ', 'America/Sao_Paulo'),
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      /*
       * O alvo é mobile: 390x844 é o viewport de referência do projeto.
       * `testMatch` explícito nos dois projetos — sem ele, cada spec rodaria nas
       * duas fontes de dados, e o spec da stack real falharia contra o mock por
       * um motivo que não é defeito de ninguém.
       */
      name: 'mock-mobile-chromium',
      testMatch: /inscricao\.spec\.ts$/,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PORTA_FRONT_MOCK}` },
    },
    {
      name: 'api-mobile-chromium',
      testMatch: /stack-real\.spec\.ts$/,
      use: { ...devices['Pixel 7'], baseURL: ORIGEM_FRONT_API },
      /*
       * Serial, e sem retry. As duas coisas pela mesma razão: aqui o estado é um
       * PostgreSQL, não um objeto em memória que o recarregamento reconstrói.
       * Casos em paralelo disputariam a mesma vaga do mesmo evento; um retry
       * rodaria de novo sobre o banco JÁ alterado pela tentativa anterior — e
       * mediria outra coisa, provavelmente passando quando devia falhar.
       * Reproduzir uma falha aqui é subir a suíte de novo, que reaplica o seed.
       */
      fullyParallel: false,
      retries: 0,
    },
  ],

  webServer: [
    {
      /*
       * A API de verdade, do artefato compilado — `nest build` e `node dist/main.js`.
       *
       * Não é `tsx src/main.ts`: o `tsx` transforma com esbuild, que não emite
       * `emitDecoratorMetadata`, e sem esse metadado a injeção de dependência do
       * Nest não resolve nenhuma classe. O `nest build` usa o `tsc` com o
       * `api/tsconfig.json`, que a emite. É o mesmo motivo do plugin de
       * TypeScript em `api/vitest.int.config.ts`.
       *
       * `preparar-stack.mjs` roda ENTRE o build e a subida: ele garante o
       * container do banco, aplica a migration e reaplica o seed. Fica no
       * comando, e não em `globalSetup`, porque o Playwright inicia os
       * `webServer` ANTES do `globalSetup` — e a API não pode atender
       * `/api/health` antes de as 14 tabelas existirem.
       */
      command: [
        'npm run build -w @campus/shared',
        'npm run build -w campus-api',
        'node app/e2e/preparar-stack.mjs',
        'npm run start -w campus-api',
      ].join(' && '),
      cwd: '..',
      url: `${BASE_DA_API}/health`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: ambienteDaApi,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      /*
       * O front em modo API. `npx vite build` direto, e não `npm run build`: o
       * script do app é `tsc -b && vite build`, e dois `tsc -b` concorrentes no
       * mesmo diretório disputam o mesmo `.tsbuildinfo`. A verificação de tipo
       * acontece no outro servidor (o do mock, que roda o script completo) e em
       * `npm run build` do pipeline — rodá-la duas vezes em paralelo não
       * acrescenta garantia, só corrida.
       */
      command: [
        `npx vite build --outDir ${SAIDA_FRONT_API}`,
        `npx vite preview --outDir ${SAIDA_FRONT_API} --port ${PORTA_FRONT_API} --strictPort`,
      ].join(' && '),
      url: ORIGEM_FRONT_API,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        // Embutidos em tempo de build. Mudá-los exige reconstruir — é o erro
        // mais comum ao subir Vite atrás de container, e o motivo de o build
        // morar no mesmo comando do servidor.
        VITE_DATA_SOURCE: 'api',
        VITE_API_URL: BASE_DA_API,
      },
    },
    {
      // O front em modo mock, como no CP5: o artefato que vai para o GitHub
      // Pages. Nenhum servidor por trás — o MSW responde no próprio navegador.
      command: `npm run build && npx vite preview --port ${PORTA_FRONT_MOCK} --strictPort`,
      url: `http://localhost:${PORTA_FRONT_MOCK}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
