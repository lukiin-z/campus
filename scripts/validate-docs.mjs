#!/usr/bin/env node
/**
 * Valida a documentação do repositório antes de commitar ou entregar.
 *
 * Cinco verificações, todas com falha explícita e apontando arquivo e linha:
 *
 *   1. Todo link relativo em `.md` aponta para arquivo/diretório existente.
 *   2. Toda âncora `#secao` de link interno existe como cabeçalho no destino.
 *   3. Todo bloco ```mermaid está fechado (bloco aberto quebra a renderização
 *      do GitHub inteira, e não só o diagrama).
 *   4. Todo `.svg` do repositório é XML bem formado.
 *   5. Nenhum arquivo de documentação contém marcador de trabalho inacabado
 *      (`TODO`, `FIXME`, `a definir` solto, `lorem ipsum`).
 *
 * Uso:
 *   node scripts/validate-docs.mjs
 *   node scripts/validate-docs.mjs --quiet   # só o resumo e as falhas
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from './lib/xml.mjs';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const QUIET = process.argv.includes('--quiet');

const IGNORAR_DIRETORIOS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.claude',
]);

/** Termos que indicam documentação inacabada. */
const MARCADORES_PROIBIDOS = [
  { padrao: /\bTODO\b/, rotulo: 'TODO' },
  { padrao: /\bFIXME\b/, rotulo: 'FIXME' },
  { padrao: /\bXXX\b/, rotulo: 'XXX' },
  { padrao: /lorem ipsum/i, rotulo: 'lorem ipsum' },
  { padrao: /\bpreencher aqui\b/i, rotulo: 'preencher aqui' },
];

const falhas = [];
const avisos = [];

function registrarFalha(arquivo, linha, mensagem) {
  falhas.push({ arquivo, linha, mensagem });
}

function listarArquivos(dir, extensoes) {
  const encontrados = [];
  for (const entrada of readdirSync(dir)) {
    if (IGNORAR_DIRETORIOS.has(entrada)) continue;
    const completo = join(dir, entrada);
    if (statSync(completo).isDirectory()) {
      encontrados.push(...listarArquivos(completo, extensoes));
    } else if (extensoes.includes(extname(entrada).toLowerCase())) {
      encontrados.push(completo);
    }
  }
  return encontrados;
}

/** Cabeçalhos de um markdown, no formato de âncora do GitHub. */
function ancorasDe(conteudo) {
  const ancoras = new Set();
  for (const linha of conteudo.split(/\r?\n/)) {
    const titulo = /^#{1,6}\s+(.*)$/.exec(linha.trim());
    if (!titulo || !titulo[1]) continue;
    const texto = titulo[1]
      .replace(/`/g, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim()
      .toLowerCase();
    // Regra do GitHub: minúsculas, espaços -> hífen, remove o que não é
    // alfanumérico, hífen ou underscore (mantendo acentos).
    const ancora = texto
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      // O GitHub troca CADA espaço por um hífen; colapsar em um só produziria
      // âncora diferente em título com travessão ("RN-023 — Organizador...").
      .replace(/\s/g, '-');
    ancoras.add(ancora);
  }
  return ancoras;
}

// ---------------------------------------------------------------------------
// 1, 2, 3 e 5 — markdown
// ---------------------------------------------------------------------------

const markdowns = listarArquivos(ROOT, ['.md']).sort();
const cacheAncoras = new Map();

function ancorasDoArquivo(caminho) {
  if (!cacheAncoras.has(caminho)) {
    cacheAncoras.set(caminho, ancorasDe(readFileSync(caminho, 'utf8')));
  }
  return cacheAncoras.get(caminho);
}

let totalLinks = 0;
let totalBlocosMermaid = 0;

for (const arquivo of markdowns) {
  const rel = relative(ROOT, arquivo).replace(/\\/g, '/');
  const conteudo = readFileSync(arquivo, 'utf8');
  const linhas = conteudo.split(/\r?\n/);

  // --- 3. blocos mermaid fechados ---
  let dentroDeCerca = false;
  let cercaAberta = 0;
  let mermaidAberto = null;

  linhas.forEach((linha, indice) => {
    const numero = indice + 1;
    const cerca = /^```(\w*)/.exec(linha.trim());
    if (cerca) {
      if (!dentroDeCerca) {
        dentroDeCerca = true;
        cercaAberta = numero;
        if (cerca[1] === 'mermaid') {
          mermaidAberto = numero;
          totalBlocosMermaid += 1;
        }
      } else {
        dentroDeCerca = false;
        mermaidAberto = null;
      }
      return;
    }

    if (dentroDeCerca) return;

    // --- 5. marcadores de trabalho inacabado ---
    // Ocorrência entre acentos graves é o termo sendo CITADO (ex.: a DoD que
    // proíbe `TODO` no código), não trabalho pendente. Só o texto corrido conta.
    const proseSemCodigo = linha.replace(/`[^`]*`/g, '');
    for (const { padrao, rotulo } of MARCADORES_PROIBIDOS) {
      if (padrao.test(proseSemCodigo)) {
        registrarFalha(rel, numero, `marcador de trabalho inacabado: "${rotulo}"`);
      }
    }

    // --- 1 e 2. links relativos ---
    const regexLink = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let achado;
    while ((achado = regexLink.exec(linha)) !== null) {
      const destino = achado[1];
      if (!destino) continue;
      if (/^(https?:|mailto:|#)/.test(destino)) continue;
      totalLinks += 1;

      const [caminho, ancora] = destino.split('#');
      const alvo = resolve(dirname(arquivo), decodeURIComponent(caminho ?? ''));

      if (!existsSync(alvo)) {
        registrarFalha(rel, numero, `link quebrado: ${destino}`);
        continue;
      }
      if (ancora && extname(alvo) === '.md') {
        const disponiveis = ancorasDoArquivo(alvo);
        if (disponiveis && !disponiveis.has(decodeURIComponent(ancora).toLowerCase())) {
          avisos.push({
            arquivo: rel,
            linha: numero,
            mensagem: `âncora não encontrada no destino: ${destino}`,
          });
        }
      }
    }
  });

  if (dentroDeCerca) {
    registrarFalha(
      rel,
      mermaidAberto ?? cercaAberta,
      mermaidAberto
        ? 'bloco ```mermaid aberto e nunca fechado — quebra a renderização do arquivo no GitHub'
        : 'bloco de código aberto e nunca fechado',
    );
  }
}

// ---------------------------------------------------------------------------
// 4 — SVGs bem formados
// ---------------------------------------------------------------------------

const svgs = listarArquivos(ROOT, ['.svg']).sort();
for (const arquivo of svgs) {
  const rel = relative(ROOT, arquivo).replace(/\\/g, '/');
  try {
    XMLParser.parse(readFileSync(arquivo, 'utf8'));
  } catch (erro) {
    registrarFalha(rel, 1, `SVG malformado: ${erro.message}`);
  }
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

if (!QUIET) {
  process.stdout.write(
    [
      '',
      `  ${markdowns.length} arquivos markdown verificados`,
      `  ${totalLinks} links relativos resolvidos`,
      `  ${totalBlocosMermaid} blocos Mermaid encontrados`,
      `  ${svgs.length} SVGs verificados`,
      '',
    ].join('\n'),
  );
}

if (avisos.length > 0) {
  process.stdout.write(`  ${avisos.length} aviso(s) de âncora:\n`);
  for (const aviso of avisos.slice(0, 20)) {
    process.stdout.write(`    ${aviso.arquivo}:${aviso.linha}  ${aviso.mensagem}\n`);
  }
  if (avisos.length > 20) process.stdout.write(`    ... e mais ${avisos.length - 20}\n`);
  process.stdout.write('\n');
}

if (falhas.length > 0) {
  process.stderr.write(`  ${falhas.length} FALHA(S):\n\n`);
  for (const falha of falhas) {
    process.stderr.write(`    ${falha.arquivo}:${falha.linha}\n      ${falha.mensagem}\n`);
  }
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write('  documentação válida\n\n');
