#!/usr/bin/env node
/**
 * Guarda contra classe utilitária FORA da escala do projeto.
 *
 * Por que existe: `app/tailwind.config.ts` SUBSTITUI a escala de espaçamento do
 * Tailwind por uma fechada, de base 4px. Uma classe fora dessa escala — `h-56`,
 * `w-64` — não gera CSS nenhum e **não produz erro**: o elemento simplesmente
 * colapsa para altura zero, silenciosamente. Foi exatamente assim que o cartão
 * de evento e as capas ficaram invisíveis na primeira execução do app; este
 * script nasceu daquele defeito.
 *
 * Uso (de dentro de app/, como o CI faz):
 *   node ../scripts/check-tailwind-scale.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const SRC = existsSync(join(process.cwd(), 'src'))
  ? join(process.cwd(), 'src')
  : join(ROOT, 'app', 'src');

/**
 * Espelha `theme.spacing` de app/tailwind.config.ts. Alterar a escala lá exige
 * alterar aqui — e o teste de que os dois estão em sincronia é o próprio uso:
 * uma classe legítima que este script reprovar aparece no CI na hora.
 */
const ESCALA = new Set([
  '0',
  'px',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '10',
  '11',
  '12',
  '14',
  '16',
  '20',
  '24',
  'full',
]);

/** Utilitários cujo valor numérico vem de `theme.spacing`. */
const PREFIXOS = [
  'h',
  'w',
  'min-h',
  'min-w',
  'max-h',
  'max-w',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'gap',
  'gap-x',
  'gap-y',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-x',
  'inset-y',
  'space-x',
  'space-y',
  'translate-x',
  'translate-y',
  'size',
];

/** Escalas próprias do Tailwind, que não vêm de `spacing`. */
const EXCECOES = new Set([
  // fração (w-1/2, h-3/4) e utilitários de grade têm escala própria
  'grid-cols',
  'grid-rows',
  'col-span',
  'row-span',
  'order',
  'z',
  'opacity',
  'basis',
  'flex',
  'border',
  'rounded',
]);

const padrao = new RegExp(`\\b(${PREFIXOS.join('|')})-([0-9]+|px|full)\\b`, 'g');

function listar(dir) {
  const encontrados = [];
  for (const entrada of readdirSync(dir)) {
    const completo = join(dir, entrada);
    if (statSync(completo).isDirectory()) encontrados.push(...listar(completo));
    else if (['.ts', '.tsx'].includes(extname(entrada))) encontrados.push(completo);
  }
  return encontrados;
}

const problemas = [];
let total = 0;

for (const arquivo of listar(SRC)) {
  const rel = relative(ROOT, arquivo).replace(/\\/g, '/');
  readFileSync(arquivo, 'utf8')
    .split(/\r?\n/)
    .forEach((linha, indice) => {
      // Fração (w-1/2) tem escala própria: descarta antes de casar.
      const semFracao = linha.replace(/\b[a-z-]+-[0-9]+\/[0-9]+\b/g, '');
      let achado;
      padrao.lastIndex = 0;
      while ((achado = padrao.exec(semFracao)) !== null) {
        const [classe, prefixo, valor] = achado;
        if (!prefixo || !valor) continue;
        if (EXCECOES.has(prefixo)) continue;
        total += 1;
        if (!ESCALA.has(valor)) {
          problemas.push({ arquivo: rel, linha: indice + 1, classe });
        }
      }
    });
}

process.stdout.write(`\n  ${total} utilitários de espaçamento verificados\n`);

if (problemas.length > 0) {
  process.stderr.write(`\n  ${problemas.length} classe(s) fora da escala do projeto:\n\n`);
  for (const problema of problemas) {
    process.stderr.write(`    ${problema.arquivo}:${problema.linha}  ${problema.classe}\n`);
  }
  process.stderr.write(
    '\n  Classe fora da escala não gera CSS: o elemento colapsa sem erro.\n' +
      '  Use um passo da escala de 4px, ou nomeie um token em\n' +
      '  app/tailwind.config.ts (ex.: height["cover-lg"]) e use o nome.\n\n',
  );
  process.exit(1);
}

process.stdout.write('  todos dentro da escala de 4px do projeto\n\n');
