#!/usr/bin/env node
/**
 * Extrai todo bloco ```mermaid da documentação, valida a sintaxe e exporta cada
 * diagrama como SVG em docs/05-modelagem/exports/.
 *
 * Uso:
 *   node scripts/render-diagrams.mjs            # valida e exporta
 *   node scripts/render-diagrams.mjs --check    # só valida, não escreve SVG
 *
 * O renderizador é o @mermaid-js/mermaid-cli, invocado por npx (nada é adicionado
 * às dependências do app, porque ele arrasta o Chromium do Puppeteer e pesaria no CI).
 * Para usar um binário já instalado, aponte MMDC_BIN para ele.
 *
 * Saída: um SVG por bloco, nomeado <arquivo-de-origem>-<n>-<tipo>.svg
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative, basename, extname, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const OUT = join(DOCS, '05-modelagem', 'exports');
const CHECK_ONLY = process.argv.includes('--check');

/** Percorre docs/ recursivamente e devolve os .md. */
function listMarkdown(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'exports' || entry === 'figma' || entry === 'assets') continue;
      found.push(...listMarkdown(full));
    } else if (extname(entry) === '.md') {
      found.push(full);
    }
  }
  return found;
}

/** Extrai os blocos ```mermaid de um markdown, com a linha em que começam. */
function extractBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let current = null;
  lines.forEach((line, index) => {
    if (current === null && /^```mermaid\s*$/.test(line.trim())) {
      current = { startLine: index + 1, code: [] };
      return;
    }
    if (current !== null) {
      if (/^```\s*$/.test(line.trim())) {
        blocks.push({ startLine: current.startLine, code: current.code.join('\n') });
        current = null;
      } else {
        current.code.push(line);
      }
    }
  });
  if (current !== null) {
    throw new Error(`bloco mermaid aberto na linha ${current.startLine} nunca é fechado`);
  }
  return blocks;
}

/** Primeira palavra significativa do bloco: flowchart, classDiagram, erDiagram... */
function diagramKind(code) {
  const firstMeaningful = code
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('%%'));
  if (!firstMeaningful) return 'vazio';
  const token = firstMeaningful.split(/[\s:]/)[0];
  return token.replace(/[^A-Za-z0-9-]/g, '') || 'desconhecido';
}

function resolveMmdc() {
  // No Windows, tanto npx.cmd quanto mmdc.cmd só são executáveis via shell (Node >= 20).
  const shell = process.platform === 'win32';
  if (process.env.MMDC_BIN) return { cmd: process.env.MMDC_BIN, prefix: [], shell };
  const npx = shell ? 'npx.cmd' : 'npx';
  return { cmd: npx, prefix: ['--yes', '@mermaid-js/mermaid-cli'], shell };
}

const CONFIG = {
  theme: 'base',
  themeVariables: {
    background: '#FBFBFA',
    primaryColor: '#FFFFFF',
    primaryTextColor: '#14181C',
    primaryBorderColor: '#E7E5E0',
    lineColor: '#767D85',
    secondaryColor: '#F2F1EE',
    tertiaryColor: '#FBFBFA',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '14px',
  },
  flowchart: { htmlLabels: true, curve: 'basis' },
  sequence: { useMaxWidth: true },
  er: { useMaxWidth: true },
};

function main() {
  const files = listMarkdown(DOCS).sort();
  const tmp = join(tmpdir(), `campus-mermaid-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  if (!CHECK_ONLY) mkdirSync(OUT, { recursive: true });

  const configPath = join(tmp, 'mermaid-config.json');
  writeFileSync(configPath, JSON.stringify(CONFIG, null, 2), 'utf8');

  const { cmd, prefix, shell } = resolveMmdc();
  const failures = [];
  let total = 0;
  let written = 0;

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    let blocks;
    try {
      blocks = extractBlocks(readFileSync(file, 'utf8'));
    } catch (error) {
      failures.push(`${rel}: ${error.message}`);
      continue;
    }
    if (blocks.length === 0) continue;

    blocks.forEach((block, index) => {
      total += 1;
      const kind = diagramKind(block.code);
      const slug = `${basename(file, '.md')}-${String(index + 1).padStart(2, '0')}-${kind}`;
      const mmdPath = join(tmp, `${slug}.mmd`);
      writeFileSync(mmdPath, `${block.code}\n`, 'utf8');
      const svgPath = CHECK_ONLY ? join(tmp, `${slug}.svg`) : join(OUT, `${slug}.svg`);

      const result = spawnSync(
        cmd,
        [...prefix, '--input', mmdPath, '--output', svgPath, '--configFile', configPath,
          '--backgroundColor', 'transparent', '--quiet'],
        { encoding: 'utf8', shell },
      );

      const stderr = (result.stderr || '').trim();
      if (result.status !== 0) {
        failures.push(`${rel}:${block.startLine} (${kind})\n    ${stderr.split('\n').slice(-6).join('\n    ')}`);
      } else {
        written += 1;
        process.stdout.write(`  ok  ${rel}:${block.startLine}  ${kind} -> ${basename(svgPath)}\n`);
      }
    });
  }

  rmSync(tmp, { recursive: true, force: true });

  process.stdout.write(`\n${written}/${total} blocos Mermaid renderizados`);
  process.stdout.write(CHECK_ONLY ? ' (modo --check, nada gravado)\n' : ` em docs/05-modelagem/exports/\n`);

  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} bloco(s) com erro de sintaxe:\n\n`);
    for (const failure of failures) process.stderr.write(`  - ${failure}\n\n`);
    process.exit(1);
  }
}

main();
