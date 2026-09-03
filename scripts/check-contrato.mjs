#!/usr/bin/env node
/**
 * Verificador da fronteira do pacote compartilhado.
 *
 * `packages/shared` é consumido pelo app (navegador) e pela API (Node). Uma
 * dependência de runtime de um dos dois lados quebra o outro — e quebra tarde,
 * no build ou em produção, com uma mensagem que não menciona o pacote. Este
 * script transforma a regra escrita no cabeçalho de `packages/shared/src/index.ts`
 * em verificação executável.
 *
 * Sem dependência: só a stdlib do Node, como os outros verificadores do projeto
 * (`validate-docs.mjs`, `check-tailwind-scale.mjs`). Documentação e contrato não
 * devem depender de `npm install` para serem verificados.
 *
 * Rode com:  node scripts/check-contrato.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const COMPARTILHADO = join(RAIZ, 'packages', 'shared', 'src');

/**
 * O pacote pode importar isto, e nada mais.
 *
 * `zod` é a única dependência de runtime declarada, e é isomórfica. Import
 * relativo (`./`, `../`) é sempre interno ao pacote. Qualquer outra coisa é uma
 * dependência que um dos dois consumidores não tem.
 */
const PERMITIDOS = new Set(['zod']);

/**
 * Só em arquivo de teste. `vitest` é dependência de desenvolvimento e não entra
 * em nenhum dos dois bundles — mas permiti-lo em arquivo de produção abriria a
 * porta para `vi.mock` dentro do domínio, que é o começo de regra dependente de
 * infraestrutura.
 */
const PERMITIDOS_EM_TESTE = new Set(['vitest']);

/**
 * Proibições nomeadas, para a mensagem de erro dizer o **motivo** em vez de
 * "import não permitido".
 */
const PROIBIDOS = [
  { padrao: /^react(-dom|-router-dom)?$/, motivo: 'a API não roda React' },
  { padrao: /^@tanstack\//, motivo: 'cache de cliente não é regra de negócio' },
  { padrao: /^zustand$/, motivo: 'store de UI não pertence ao domínio' },
  { padrao: /^msw/, motivo: 'o mock é do app; o pacote não conhece transporte' },
  { padrao: /^@prisma\/|^prisma$/, motivo: 'o app não tem banco' },
  { padrao: /^@nestjs\//, motivo: 'o app não tem servidor' },
  { padrao: /^express$/, motivo: 'idem' },
  { padrao: /^argon2$|^bcrypt/, motivo: 'hash de senha é do servidor, não do domínio puro' },
  { padrao: /^node:/, motivo: 'API de Node não existe no navegador' },
  { padrao: /^fs$|^path$|^crypto$|^os$/, motivo: 'API de Node sem o prefixo node:' },
];

const IMPORT = /^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
const IMPORT_DINAMICO = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function arquivosTs(diretorio) {
  const encontrados = [];
  for (const entrada of readdirSync(diretorio)) {
    const caminho = join(diretorio, entrada);
    if (statSync(caminho).isDirectory()) {
      encontrados.push(...arquivosTs(caminho));
    } else if (entrada.endsWith('.ts') && !entrada.endsWith('.d.ts')) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

const falhas = [];
let importsVerificados = 0;

// ---------------------------------------------------------------------------
// 1. Nenhum import fora da lista, em nenhum arquivo do pacote
// ---------------------------------------------------------------------------

const arquivos = arquivosTs(COMPARTILHADO);

for (const caminho of arquivos) {
  const conteudo = readFileSync(caminho, 'utf8');
  const relativo = relative(RAIZ, caminho).split(sep).join('/');
  const linhas = conteudo.split('\n');
  const ehTeste = caminho.endsWith('.test.ts');

  for (const padrao of [IMPORT, IMPORT_DINAMICO]) {
    padrao.lastIndex = 0;
    let achado;
    while ((achado = padrao.exec(conteudo)) !== null) {
      const especificador = achado[1];
      importsVerificados += 1;

      if (especificador.startsWith('.')) continue;
      if (PERMITIDOS.has(especificador)) continue;
      if (ehTeste && PERMITIDOS_EM_TESTE.has(especificador)) continue;

      // Número da linha, para a mensagem ser clicável.
      const antes = conteudo.slice(0, achado.index);
      const linha = antes.split('\n').length;
      const trecho = (linhas[linha - 1] ?? '').trim();

      const proibido = PROIBIDOS.find((p) => p.padrao.test(especificador));
      const motivo = proibido
        ? proibido.motivo
        : 'só `zod` e imports relativos são permitidos no pacote compartilhado';

      falhas.push(`${relativo}:${linha}\n      import de '${especificador}' — ${motivo}\n      ${trecho}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Testes do pacote não podem depender de jsdom
//
// O domínio é puro; um teste que precise de `document` é sinal de que uma
// função de apresentação entrou no pacote por engano.
// ---------------------------------------------------------------------------

const configVitest = join(RAIZ, 'packages', 'shared', 'vitest.config.ts');
try {
  const conteudo = readFileSync(configVitest, 'utf8');
  if (!/environment:\s*'node'/.test(conteudo)) {
    falhas.push(
      `packages/shared/vitest.config.ts\n      o ambiente de teste do pacote tem de ser 'node': o domínio não conhece navegador`,
    );
  }
} catch {
  falhas.push('packages/shared/vitest.config.ts\n      arquivo ausente');
}

// ---------------------------------------------------------------------------
// 3. O alias do Vite e o `paths` do TypeScript apontam para o mesmo lugar
//
// São duas configurações que resolvem `@campus/shared`, em dois arquivos
// distintos. Divergir entre elas produz o pior sintoma possível: o `tsc` passa
// e o app serve código velho, ou o contrário.
// ---------------------------------------------------------------------------

const ALVO_ESPERADO = 'packages/shared/src/index.ts';

function leituraSegura(caminho) {
  try {
    return readFileSync(join(RAIZ, caminho), 'utf8');
  } catch {
    falhas.push(`${caminho}\n      arquivo ausente`);
    return '';
  }
}

const viteConfig = leituraSegura('app/vite.config.ts');
const tsconfigApp = leituraSegura('app/tsconfig.app.json');

if (viteConfig && !viteConfig.includes(ALVO_ESPERADO)) {
  falhas.push(
    `app/vite.config.ts\n      o alias de '@campus/shared' tem de apontar para '${ALVO_ESPERADO}'`,
  );
}
if (tsconfigApp && !tsconfigApp.includes(ALVO_ESPERADO)) {
  falhas.push(
    `app/tsconfig.app.json\n      o 'paths' de '@campus/shared' tem de apontar para '${ALVO_ESPERADO}'`,
  );
}

// ---------------------------------------------------------------------------
// 4. Nenhum arquivo do app redefine um tipo que o pacote já exporta
//
// `app/src/types/domain.ts` é reexportação. Se voltar a declarar tipo próprio,
// o app e a API passam a ter duas verdades sobre a mesma entidade.
// ---------------------------------------------------------------------------

const reexport = leituraSegura('app/src/types/domain.ts');
if (reexport) {
  const declaracoes = reexport.match(/^export (?:interface|type|const|enum) /gm) ?? [];
  if (declaracoes.length > 0) {
    falhas.push(
      `app/src/types/domain.ts\n      ${declaracoes.length} declaração(ões) própria(s): o arquivo é reexportação de @campus/shared.\n      Tipo que atravessa a rede pertence ao pacote (ver o cabeçalho do arquivo)`,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. O pacote é consumível por `require` E por `import`
//
// A API é CommonJS; o app é ESM e resolve o pacote pela fonte. A primeira
// versão do `package.json` tinha `"type": "module"` e `exports` só com a
// condição `import` — e QUALQUER módulo CJS da API que importasse o pacote
// batia em `ERR_PACKAGE_PATH_NOT_EXPORTED`.
//
// O `tsc` não avisa: o erro é de resolução em tempo de execução do Node. Só um
// `require` de verdade prova. Por isso esta verificação existe, e por isso ela
// é executada e não inferida do `package.json`.
// ---------------------------------------------------------------------------

const pacoteJson = join(RAIZ, 'packages', 'shared', 'package.json');
const distIndex = join(RAIZ, 'packages', 'shared', 'dist', 'index.js');

if (!existsSync(distIndex)) {
  console.log('');
  console.log('  aviso: `packages/shared/dist` não existe — a verificação de');
  console.log('         require/import foi pulada. Rode `npm run build -w @campus/shared`.');
} else {
  const { execFileSync } = await import('node:child_process');

  const provas = [
    {
      rotulo: 'require (a API é CommonJS)',
      args: ['-e', "const s=require('@campus/shared'); if (typeof s.planPromotion !== 'function') process.exit(2);"],
    },
    {
      rotulo: 'import (o app é ESM)',
      args: ['--input-type=module', '-e', "import { planPromotion } from '@campus/shared'; if (typeof planPromotion !== 'function') process.exit(2);"],
    },
  ];

  for (const prova of provas) {
    try {
      execFileSync(process.execPath, prova.args, { cwd: RAIZ, stdio: 'pipe' });
    } catch (erro) {
      const saida = String(erro.stderr ?? erro.message).split('\n')[0];
      falhas.push(
        `packages/shared/package.json\n      o pacote não é consumível por ${prova.rotulo}\n      ${saida}`,
      );
    }
  }

  // O `exports` tem de declarar as duas condições explicitamente.
  const declarado = JSON.parse(readFileSync(pacoteJson, 'utf8'));
  const condicoes = declarado.exports?.['.'] ?? {};
  for (const condicao of ['require', 'import', 'types']) {
    if (!condicoes[condicao]) {
      falhas.push(
        `packages/shared/package.json\n      falta a condição '${condicao}' em exports['.']`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

console.log('');
console.log(`  ${arquivos.length} arquivos do pacote compartilhado verificados`);
console.log(`  ${importsVerificados} imports analisados`);

if (falhas.length > 0) {
  console.error(`  ${falhas.length} FALHA(S):\n`);
  for (const falha of falhas) console.error(`    ${falha}\n`);
  process.exit(1);
}

console.log('  fronteira do contrato preservada');
console.log('');
