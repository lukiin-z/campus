import type { TokenIngresso } from '../types/domain';
import { numericCheckInCode, ticketCode } from './checkin';

/**
 * Token do ingresso — o conteúdo do QR Code (RF-033, RN-017).
 *
 * O formato é `campus.v1.<payload base64url>.<assinatura>`, o mesmo shape de um
 * JWS compacto. A assinatura aqui é um HMAC pobre calculado no cliente: o CP5
 * não tem servidor, e um segredo embutido no bundle não é segredo. O que este
 * módulo garante de verdade é que **a decisão de aceitar** já opera sobre um
 * token estruturado e verificável — no CP6 troca-se `assinar()` por HMAC-SHA256
 * com chave no servidor e nada acima muda (ADR-0007, RNF-020).
 */

const PREFIXO = 'campus.v1';

/** Rótulo, não segredo — está no bundle de propósito e o CP6 o descarta. */
const SEGREDO_DEMO = 'campus-cp5-demo';

export interface PayloadIngresso {
  participacaoId: string;
  eventoId: string;
  usuarioId: string;
  emitidoEm: string;
}

export function emitirToken(payload: PayloadIngresso): string {
  const corpo = base64UrlEncode(JSON.stringify(payload));
  return `${PREFIXO}.${corpo}.${assinar(corpo)}`;
}

/** Devolve `null` para qualquer token que não seja íntegro — nunca lança. */
export function lerToken(token: string): PayloadIngresso | null {
  const partes = token.trim().split('.');
  if (partes.length !== 4) return null;

  const [ns, versao, corpo, assinatura] = partes;
  if (`${ns}.${versao}` !== PREFIXO || !corpo || !assinatura) return null;
  if (assinar(corpo) !== assinatura) return null;

  try {
    const dados = JSON.parse(base64UrlDecode(corpo)) as Partial<PayloadIngresso>;
    if (!dados.participacaoId || !dados.eventoId || !dados.usuarioId || !dados.emitidoEm) {
      return null;
    }
    return dados as PayloadIngresso;
  } catch {
    return null;
  }
}

export function assinaturaValida(token: string): boolean {
  return lerToken(token) !== null;
}

/** Monta o que o ingresso mostra: QR, código numérico e código legível. */
export function montarIngresso(payload: PayloadIngresso, siglaTurma: string): TokenIngresso {
  return {
    valor: emitirToken(payload),
    codigoNumerico: numericCheckInCode(payload.participacaoId),
    codigoLegivel: ticketCode(siglaTurma, payload.participacaoId),
    emitidoEm: payload.emitidoEm,
  };
}

/**
 * O leitor de QR aceita três formas do mesmo ingresso, porque na porta do evento
 * as três aparecem: o token completo (câmera), o código numérico de 8 dígitos
 * (digitado) e o código legível impresso (`CMP-3ESPX-0184`).
 */
export type EntradaLeitor =
  | { tipo: 'TOKEN'; token: string }
  | { tipo: 'CODIGO_NUMERICO'; codigo: string }
  | { tipo: 'CODIGO_LEGIVEL'; codigo: string }
  | { tipo: 'INDECIFRAVEL' };

export function classificarLeitura(bruto: string): EntradaLeitor {
  const texto = bruto.trim();
  if (!texto) return { tipo: 'INDECIFRAVEL' };
  if (texto.startsWith(`${PREFIXO}.`)) return { tipo: 'TOKEN', token: texto };
  if (/^\d{8}$/.test(texto)) return { tipo: 'CODIGO_NUMERICO', codigo: texto };
  if (/^CMP-[A-Z0-9]+-\d{4}$/i.test(texto)) {
    return { tipo: 'CODIGO_LEGIVEL', codigo: texto.toUpperCase() };
  }
  return { tipo: 'INDECIFRAVEL' };
}

// --------------------------------------------------------------------------
// Primitivas
//
// base64url à mão em vez de `btoa`: `btoa` quebra em caractere fora de Latin-1
// (nome com acento entra no payload no CP6) e não existe em ambiente Node puro,
// onde os testes de domínio rodam.
// --------------------------------------------------------------------------

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64UrlEncode(texto: string): string {
  const bytes = utf8Bytes(texto);
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const trio = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    saida += ALFABETO[(trio >> 18) & 63];
    saida += ALFABETO[(trio >> 12) & 63];
    saida += b1 === undefined ? '' : ALFABETO[(trio >> 6) & 63];
    saida += b2 === undefined ? '' : ALFABETO[trio & 63];
  }
  return saida;
}

function base64UrlDecode(texto: string): string {
  const bytes: number[] = [];
  let acumulador = 0;
  let bits = 0;
  for (const caractere of texto) {
    const indice = ALFABETO.indexOf(caractere);
    if (indice < 0) throw new Error('caractere inválido em base64url');
    acumulador = (acumulador << 6) | indice;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulador >> bits) & 255);
    }
  }
  return utf8Texto(bytes);
}

function utf8Bytes(texto: string): number[] {
  const bytes: number[] = [];
  for (const caractere of texto) {
    const ponto = caractere.codePointAt(0) ?? 0;
    if (ponto < 0x80) {
      bytes.push(ponto);
    } else if (ponto < 0x800) {
      bytes.push(0xc0 | (ponto >> 6), 0x80 | (ponto & 63));
    } else if (ponto < 0x10000) {
      bytes.push(0xe0 | (ponto >> 12), 0x80 | ((ponto >> 6) & 63), 0x80 | (ponto & 63));
    } else {
      bytes.push(
        0xf0 | (ponto >> 18),
        0x80 | ((ponto >> 12) & 63),
        0x80 | ((ponto >> 6) & 63),
        0x80 | (ponto & 63),
      );
    }
  }
  return bytes;
}

function utf8Texto(bytes: readonly number[]): string {
  let saida = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    let ponto = b0;
    let extras = 0;
    if (b0 >= 0xf0) {
      ponto = b0 & 7;
      extras = 3;
    } else if (b0 >= 0xe0) {
      ponto = b0 & 15;
      extras = 2;
    } else if (b0 >= 0xc0) {
      ponto = b0 & 31;
      extras = 1;
    }
    for (let k = 1; k <= extras; k += 1) ponto = (ponto << 6) | ((bytes[i + k] ?? 0) & 63);
    saida += String.fromCodePoint(ponto);
    i += extras + 1;
  }
  return saida;
}

/**
 * FNV-1a de 32 bits sobre corpo + segredo, em hex. Não é criptografia — é
 * detecção de adulteração casual, que é o que a demo precisa provar.
 */
function assinar(corpo: string): string {
  let hash = 0x811c9dc5;
  const entrada = `${corpo}.${SEGREDO_DEMO}`;
  for (let i = 0; i < entrada.length; i += 1) {
    hash ^= entrada.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
