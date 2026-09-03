import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { urlDoBancoDeTeste } from './conexao';

/**
 * `globalSetup` da suíte de integração: garante banco de pé e schema aplicado.
 *
 * ## Por que isto existe
 *
 * Sem este arquivo, `npm run test:int -w campus-api` só funciona para quem
 * lembrou de rodar três comandos antes — subir o container, aplicar a migration
 * e apontar a `DATABASE_URL`. Quem esquece recebe "table does not exist" em 95
 * casos ao mesmo tempo, que é a pior forma de descobrir que faltou um passo de
 * ambiente. O comando do `package.json` é o contrato; ele tem de bastar.
 *
 * ## O que NÃO é feito aqui, de propósito
 *
 * **O seed.** Cada caso o reaplica no `beforeEach` (`test/suporte/banco.ts`), e
 * fazê-lo aqui também seria trabalho jogado fora — o primeiro `TRUNCATE`
 * apagaria o resultado. O que só pode ser feito uma vez, e por isso mora aqui, é
 * a migration: ela cria as 14 tabelas, os `CHECK` e os índices parciais que os
 * casos exercitam.
 *
 * ## Duplicação declarada com `app/e2e/preparar-stack.mjs`
 *
 * O E2E tem um script parecido, e a semelhança é só de aparência: ele roda no
 * meio de um comando de shell (antes de `node dist/main.js`), precisa do seed
 * aplicado porque o navegador não tem como reaplicá-lo, e vive no workspace do
 * app. Compartilhar código entre `api/test` e `app/e2e` criaria dependência
 * entre dois workspaces que não se conhecem — mais caro do que quarenta linhas
 * repetidas em dois lugares que mudam por razões diferentes.
 */

const TENTATIVAS_DE_PORTA = 24;
const INTERVALO_MS = 2_500;

function log(mensagem: string): void {
  process.stdout.write(`[preparar-banco] ${mensagem}\n`);
}

function esperarPorta(host: string, porta: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: porta });
    const encerrar = (aberto: boolean): void => {
      socket.destroy();
      resolve(aberto);
    };
    socket.setTimeout(1_500);
    socket.once('connect', () => encerrar(true));
    socket.once('timeout', () => encerrar(false));
    socket.once('error', () => encerrar(false));
  });
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function preparar(): Promise<void> {
  /*
   * `test/suporte/ambiente.ts` é `setupFiles` e roda nos WORKERS, depois daqui.
   * Então a URL é montada pela mesma função (`conexao.ts`) e escrita no
   * ambiente do processo principal — que é o que o `npx prisma migrate deploy`
   * abaixo herda, e o que os workers herdam por serem filhos dele.
   */
  const url = urlDoBancoDeTeste();
  process.env.DATABASE_URL = url;

  const endereco = new URL(url);
  const host = endereco.hostname;
  const porta = Number(endereco.port || '5432');

  /*
   * `docker compose up -d` é idempotente: com o serviço já de pé, ele não faz
   * nada. Falha de docker não aborta — quem aponta `DATABASE_URL` para um
   * PostgreSQL próprio não precisa do container, e a espera abaixo é quem
   * decide se existe banco.
   */
  if (process.env.INT_SEM_DOCKER !== 'true') {
    const subida = spawnSync('docker', ['compose', '--profile', 'teste', 'up', '-d', 'db-teste'], {
      cwd: '..',
      stdio: 'ignore',
      shell: true,
    });
    if (subida.status !== 0) {
      log('docker compose não subiu db-teste; usando o que estiver em DATABASE_URL');
    }
  }

  let pronto = false;
  for (let i = 0; i < TENTATIVAS_DE_PORTA && !pronto; i += 1) {
    pronto = await esperarPorta(host, porta);
    if (!pronto) await dormir(INTERVALO_MS);
  }
  if (!pronto) {
    throw new Error(
      `nada escutando em ${host}:${porta}. Suba o banco de teste com:\n` +
        '  docker compose --profile teste up -d db-teste',
    );
  }

  /*
   * `migrate deploy`, e não `migrate dev`: `dev` compara o schema com o banco e
   * pode propor uma migration nova ou pedir um reset interativo. Num banco de
   * teste isso é ruído; `deploy` aplica o que existe em `prisma/migrations` e
   * nada mais. É idempotente — migration já aplicada é registrada em
   * `_prisma_migrations` e ignorada.
   */
  let aplicada = 1;
  for (let tentativa = 1; tentativa <= 5 && aplicada !== 0; tentativa += 1) {
    const resultado = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'ignore',
      shell: true,
    });
    aplicada = resultado.status ?? 1;
    if (aplicada !== 0) await dormir(INTERVALO_MS);
  }
  if (aplicada !== 0) {
    throw new Error(
      '`prisma migrate deploy` falhou. Rode à mão em api/ para ver a mensagem:\n' +
        '  npx prisma migrate deploy',
    );
  }

  log(`schema aplicado em ${host}:${porta}${endereco.pathname}`);
}
