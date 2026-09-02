#!/usr/bin/env node
/**
 * Orçamento de tamanho do pacote — RNF-007.
 *
 * "Bundle JS inicial ≤ 250 KB gzip" só é requisito se alguém medir. Este script
 * mede o `app/dist` depois do build e falha quando o orçamento estoura, para o
 * limite não virar frase bonita no documento de requisitos.
 *
 * Uso (de dentro de app/, como o CI faz):
 *   node ../scripts/check-bundle-size.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));

/** Orçamentos em KB gzip. Alterar aqui exige atualizar RNF-007. */
const ORCAMENTO = {
  jsInicialKb: 250,
  cssKb: 40,
  maiorChunkKb: 130,
};

const dist = existsSync(join(process.cwd(), 'dist'))
  ? join(process.cwd(), 'dist')
  : join(ROOT, 'app', 'dist');

if (!existsSync(dist)) {
  process.stderr.write(
    `\n  não encontrei ${dist}\n  rode "npm run build" em app/ antes desta verificação\n\n`,
  );
  process.exit(1);
}

function listar(dir) {
  const encontrados = [];
  for (const entrada of readdirSync(dir)) {
    const completo = join(dir, entrada);
    if (statSync(completo).isDirectory()) encontrados.push(...listar(completo));
    else encontrados.push(completo);
  }
  return encontrados;
}

const arquivos = listar(dist).map((caminho) => {
  const conteudo = readFileSync(caminho);
  return {
    nome: caminho.slice(dist.length + 1).replace(/\\/g, '/'),
    ext: extname(caminho).toLowerCase(),
    bruto: conteudo.length,
    gzip: gzipSync(conteudo, { level: 9 }).length,
  };
});

const kb = (bytes) => bytes / 1024;
const fmt = (bytes) => `${kb(bytes).toFixed(2)} KB`;

const js = arquivos.filter((a) => a.ext === '.js');
const css = arquivos.filter((a) => a.ext === '.css');

const jsGzipTotal = js.reduce((soma, a) => soma + a.gzip, 0);
const cssGzipTotal = css.reduce((soma, a) => soma + a.gzip, 0);
const maiorChunk = js.reduce((maior, a) => (a.gzip > (maior?.gzip ?? 0) ? a : maior), js[0]);

process.stdout.write('\n  Tamanho do pacote (gzip nível 9)\n\n');
for (const arquivo of [...js, ...css].sort((a, b) => b.gzip - a.gzip)) {
  process.stdout.write(
    `    ${arquivo.nome.padEnd(38)} ${fmt(arquivo.bruto).padStart(11)} → ${fmt(arquivo.gzip).padStart(10)} gzip\n`,
  );
}

const linhas = [
  ['JS total', jsGzipTotal, ORCAMENTO.jsInicialKb],
  ['CSS total', cssGzipTotal, ORCAMENTO.cssKb],
  [`maior chunk (${maiorChunk?.nome ?? '—'})`, maiorChunk?.gzip ?? 0, ORCAMENTO.maiorChunkKb],
];

process.stdout.write('\n');
const estouros = [];
for (const [rotulo, bytes, limite] of linhas) {
  const atual = kb(bytes);
  const ok = atual <= limite;
  if (!ok) estouros.push(`${rotulo}: ${atual.toFixed(2)} KB gzip acima do limite de ${limite} KB`);
  process.stdout.write(
    `    ${ok ? 'ok  ' : 'FALHA'} ${String(rotulo).padEnd(44)} ${atual.toFixed(2)} / ${limite} KB gzip\n`,
  );
}
process.stdout.write('\n');

if (estouros.length > 0) {
  process.stderr.write('  orçamento de RNF-007 estourado:\n');
  for (const estouro of estouros) process.stderr.write(`    - ${estouro}\n`);
  process.stderr.write(
    '\n  Opções: mover a rota para carregamento sob demanda, remover dependência,\n' +
      '  ou revisar RNF-007 com justificativa em docs/02-requisitos.md.\n\n',
  );
  process.exit(1);
}

process.stdout.write('  dentro do orçamento de RNF-007\n\n');
