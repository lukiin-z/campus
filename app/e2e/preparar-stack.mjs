// @ts-check
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';

/**
 * Prepara o banco da stack real antes de a API subir.
 *
 * Roda no MEIO do comando do `webServer` da API (ver `playwright.config.ts`):
 * build → **este script** → `node dist/main.js`. Não é `globalSetup` porque o
 * Playwright inicia os `webServer` antes dele, e a API responde `/api/health`
 * com uma verificação de banco — se as 14 tabelas ainda não existissem, a
 * espera pela URL falharia antes de qualquer teste rodar.
 *
 * Três passos, todos idempotentes:
 *
 * 1. **Container.** `docker compose --profile teste up -d db-teste`. Se o
 *    serviço já estiver de pé, o compose não faz nada. Falha de docker não
 *    aborta: quem já tem um PostgreSQL próprio em `DATABASE_URL` não precisa
 *    dele, e o passo 2 é quem decide se há banco ou não.
 * 2. **Migration.** `prisma migrate deploy`, com espera: o Postgres aceita
 *    conexão TCP alguns segundos antes de estar pronto, e falhar na primeira
 *    tentativa é o comportamento normal de um container que acabou de subir.
 * 3. **Seed.** `npm run seed -w campus-api`, que APAGA as 14 tabelas e reinsere
 *    as 103 linhas. É o que dá ao E2E um estado conhecido: sem isso, a segunda
 *    execução encontraria Marina já inscrita no futsal e o fluxo de inscrição
 *    falharia por um motivo que não é defeito.
 *
 * `.mjs` e não `.ts` de propósito: é executado por `node` puro no meio de um
 * comando de shell. Um `.ts` exigiria um transformador no caminho crítico da
 * subida — e o `tsx` disponível não serve para código que importe `api/src`
 * (esbuild não emite metadado de decorator).
 */

const AGUARDAR_TENTATIVAS = 24;
const AGUARDAR_INTERVALO_MS = 2_500;

/** `console` é a interface deste script: a saída em `stdout` é o produto. */
const log = (mensagem) => process.stdout.write(`[preparar-stack] ${mensagem}\n`);

function executar(comando, argumentos, opcoes = {}) {
  return spawnSync(comando, argumentos, {
    stdio: 'inherit',
    shell: true,
    ...opcoes,
  });
}

/** Espera o Postgres aceitar conexão TCP, para não gastar tentativas do Prisma. */
function esperarPorta(host, porta) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: porta });
    const encerrar = (aberto) => {
      socket.destroy();
      resolve(aberto);
    };
    socket.setTimeout(1_500);
    socket.once('connect', () => encerrar(true));
    socket.once('timeout', () => encerrar(false));
    socket.once('error', () => encerrar(false));
  });
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enderecoDoBanco() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL ausente. O playwright.config.ts a define para o serviço db-teste; ' +
        'rodando este script à mão, exporte-a.',
    );
  }
  const analisada = new URL(url);
  return { host: analisada.hostname, porta: Number(analisada.port || '5432') };
}

async function main() {
  const { host, porta } = enderecoDoBanco();

  // --- 1. container ---------------------------------------------------------
  if (process.env.E2E_SEM_DOCKER !== 'true') {
    log('garantindo o serviço db-teste (perfil `teste`)');
    const subida = executar('docker', ['compose', '--profile', 'teste', 'up', '-d', 'db-teste']);
    if (subida.status !== 0) {
      log('docker compose não subiu o serviço; seguindo com o que estiver em DATABASE_URL');
    }
  }

  // --- 2. espera + migration ------------------------------------------------
  let pronto = false;
  for (let tentativa = 1; tentativa <= AGUARDAR_TENTATIVAS && !pronto; tentativa += 1) {
    pronto = await esperarPorta(host, porta);
    if (!pronto) await dormir(AGUARDAR_INTERVALO_MS);
  }
  if (!pronto) {
    throw new Error(
      `nada escutando em ${host}:${porta} depois de ` +
        `${(AGUARDAR_TENTATIVAS * AGUARDAR_INTERVALO_MS) / 1000}s. ` +
        'Suba o banco com: docker compose --profile teste up -d db-teste',
    );
  }
  log(`banco aceitando conexão em ${host}:${porta}`);

  let migrada = { status: 1 };
  for (let tentativa = 1; tentativa <= 6; tentativa += 1) {
    log(`aplicando migration (tentativa ${tentativa})`);
    migrada = executar('npx', ['prisma', 'migrate', 'deploy'], { cwd: 'api' });
    if (migrada.status === 0) break;
    await dormir(AGUARDAR_INTERVALO_MS);
  }
  if (migrada.status !== 0) {
    throw new Error('`prisma migrate deploy` falhou. Veja a saída acima.');
  }

  // --- 3. seed --------------------------------------------------------------
  log('reaplicando o seed (apaga e reinsere as 14 tabelas)');
  const semeada = executar('npm', ['run', 'seed', '-w', 'campus-api']);
  if (semeada.status !== 0) {
    throw new Error('o seed falhou. Veja a saída acima.');
  }

  log('stack pronta: migration aplicada e seed reaplicado');
}

main().catch((erro) => {
  process.stderr.write(`[preparar-stack] ${erro instanceof Error ? erro.message : erro}\n`);
  process.exit(1);
});
