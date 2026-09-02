import type { CobrancaPix, ResumoCartao } from '../types/domain';

/**
 * Cobrança simulada — RF-027, RF-028 e ADR-0007.
 *
 * O `brCode` segue a estrutura EMV® QRCPS do Pix (campos `id`+`tamanho`+`valor`,
 * com CRC16 no fim). Ele é sintaticamente válido e falha na conferência de conta,
 * porque a chave é fictícia — é isso que se quer: a demo mostra um QR real de
 * formato, e nenhum centavo pode ser transferido para ninguém.
 *
 * Nenhum dado de cartão é armazenado nem trafega além do formulário (RNF-022):
 * o que sai da tela é `ResumoCartao`, com quatro dígitos e bandeira.
 */

const CHAVE_DEMO = 'pix@campus.demo';
const NOME_RECEBEDOR = 'CAMPUS DEMO';
const CIDADE = 'SAO PAULO';

export function gerarCobrancaPix(input: {
  valor: number;
  referencia: string;
  expiraEm: string;
}): CobrancaPix {
  return {
    chave: CHAVE_DEMO,
    brCode: montarBrCode(input.valor, input.referencia),
    expiraEm: input.expiraEm,
  };
}

/** Campo EMV: identificador de 2 dígitos, tamanho de 2 dígitos, valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

function montarBrCode(valor: number, referencia: string): string {
  const merchant =
    campo('00', 'br.gov.bcb.pix') + campo('01', CHAVE_DEMO) + campo('02', 'Campus (simulado)');

  const payload =
    campo('00', '01') +
    campo('26', merchant) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', NOME_RECEBEDOR) +
    campo('60', CIDADE) +
    campo('62', campo('05', referenciaCurta(referencia)));

  const semCrc = `${payload}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}

/** O campo 05 (txid) aceita até 25 caracteres alfanuméricos. */
function referenciaCurta(referencia: string): string {
  return (
    referencia
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 25)
      .toUpperCase() || 'CAMPUS'
  );
}

/** CRC16/CCITT-FALSE, polinômio 0x1021, inicial 0xFFFF — como o BR Code exige. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i += 1) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// --------------------------------------------------------------------------
// Cartão
// --------------------------------------------------------------------------

/** Luhn. Reprovar número impossível no formulário é o mínimo honesto. */
export function luhnValido(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return false;

  let soma = 0;
  let dobra = false;
  for (let i = digitos.length - 1; i >= 0; i -= 1) {
    let valor = Number(digitos[i]);
    if (dobra) {
      valor *= 2;
      if (valor > 9) valor -= 9;
    }
    soma += valor;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}

export function bandeiraDoCartao(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  if (/^4/.test(digitos)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digitos)) return 'Mastercard';
  if (/^3[47]/.test(digitos)) return 'Amex';
  if (/^(4011|4312|4389|5041|5067|6277|6362|6363|650|651|655)/.test(digitos)) return 'Elo';
  if (/^(38|60)/.test(digitos)) return 'Hipercard';
  return 'Cartão';
}

/** `MM/AA` no futuro. Mês 13 e ano passado reprovam antes de qualquer request. */
export function validadeNoFuturo(validade: string, agora: Date | string): boolean {
  const casamento = /^(\d{2})\s*\/\s*(\d{2})$/.exec(validade.trim());
  if (!casamento) return false;

  const mes = Number(casamento[1]);
  const ano = 2000 + Number(casamento[2]);
  if (mes < 1 || mes > 12) return false;

  const referencia = new Date(agora);
  // Cartão vale até o ÚLTIMO dia do mês impresso.
  const fimDoMes = new Date(Date.UTC(ano, mes, 1) - 1);
  return fimDoMes.getTime() >= referencia.getTime();
}

export function cvvValido(cvv: string, bandeira: string): boolean {
  const digitos = cvv.replace(/\D/g, '');
  return bandeira === 'Amex' ? digitos.length === 4 : digitos.length === 3;
}

/**
 * Reduz o formulário ao que pode sair da tela. Chamada no cliente, de propósito:
 * o número completo nunca entra no corpo da requisição.
 */
export function resumirCartao(input: { numero: string; titular: string }): ResumoCartao {
  const digitos = input.numero.replace(/\D/g, '');
  return {
    ultimosQuatro: digitos.slice(-4),
    bandeira: bandeiraDoCartao(digitos),
    titular: input.titular.trim().toUpperCase(),
  };
}

/**
 * Desfecho determinístico do gateway simulado: o último dígito decide. Isso
 * permite demonstrar recusa sem depender de sorte — e é o mesmo contrato que a
 * implementação fake do `PaymentGateway` do CP6 vai honrar.
 *
 * Terminado em 1 → recusado. Terminado em 2 → em análise. Resto → aprovado.
 */
export function desfechoDeterministico(numero: string): 'APROVADO' | 'RECUSADO' | 'EM_ANALISE' {
  const digitos = numero.replace(/\D/g, '');
  const ultimo = digitos.slice(-1);
  if (ultimo === '1') return 'RECUSADO';
  if (ultimo === '2') return 'EM_ANALISE';
  return 'APROVADO';
}
