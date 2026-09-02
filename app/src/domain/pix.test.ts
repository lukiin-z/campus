import { describe, expect, it } from 'vitest';
import {
  bandeiraDoCartao,
  crc16,
  cvvValido,
  desfechoDeterministico,
  gerarCobrancaPix,
  luhnValido,
  resumirCartao,
  validadeNoFuturo,
} from './pix';

/**
 * CT-034 e CT-035 — cobrança simulada (RF-027, RF-028, RNF-022).
 *
 * Dois tipos de garantia aqui. A primeira é de formato: o BR Code precisa ser
 * estruturalmente um payload Pix, senão a demo mostra um QR que nenhum app de
 * banco reconheceria como tal. A segunda é de privacidade: `resumirCartao` é a
 * porta por onde o número do cartão NÃO passa — se ela vazar, vaza tudo.
 */

describe('CRC16 do BR Code', () => {
  it('bate com o valor de referência do padrão EMV', () => {
    // Cadeia canônica da documentação do BC: CRC16/CCITT-FALSE de "123456789"
    // é 0x29B1. Sem uma referência externa, o teste só confirmaria a própria
    // implementação.
    expect(crc16('123456789')).toBe('29B1');
  });

  it('sempre devolve 4 dígitos hexadecimais maiúsculos', () => {
    for (const entrada of ['', 'a', 'campus', '000']) {
      expect(crc16(entrada)).toMatch(/^[0-9A-F]{4}$/);
    }
  });
});

describe('gerarCobrancaPix', () => {
  const cobranca = gerarCobrancaPix({
    valor: 45.5,
    referencia: 'par-001',
    expiraEm: '2026-09-12T20:00:00.000Z',
  });

  it('começa com a versão do payload e traz o GUI do Pix', () => {
    expect(cobranca.brCode.startsWith('000201')).toBe(true);
    expect(cobranca.brCode).toContain('br.gov.bcb.pix');
  });

  it('fecha com o campo 6304 seguido do CRC dos bytes anteriores', () => {
    const brCode = cobranca.brCode;
    const semCrc = brCode.slice(0, -4);
    expect(semCrc.endsWith('6304')).toBe(true);
    expect(brCode.slice(-4)).toBe(crc16(semCrc));
  });

  it('carrega o valor com duas casas, como o campo 54 exige', () => {
    expect(cobranca.brCode).toContain('540545.50');
  });

  it('é determinístico: a mesma entrada devolve o mesmo BR Code', () => {
    // É isso que permite não armazenar o payload e recalculá-lo na leitura.
    const outra = gerarCobrancaPix({
      valor: 45.5,
      referencia: 'par-001',
      expiraEm: '2026-09-12T20:00:00.000Z',
    });
    expect(outra.brCode).toBe(cobranca.brCode);
  });

  it('sanitiza a referência para o limite alfanumérico do txid', () => {
    const { brCode } = gerarCobrancaPix({
      valor: 10,
      referencia: 'par-001/abc def-ghi-jkl-mno-pqr-stu-vwx',
      expiraEm: '2026-09-12T20:00:00.000Z',
    });

    /*
     * O campo EMV é lido pelo PREFIXO DE TAMANHO, não por casamento guloso: um
     * `[A-Z0-9]+` depois do 05 engole o `6304` e o CRC, porque são dígitos
     * também. Este teste falhou exatamente assim na primeira escrita.
     */
    const inicio = brCode.indexOf('62');
    const tamanho62 = Number(brCode.slice(inicio + 2, inicio + 4));
    const conteudo62 = brCode.slice(inicio + 4, inicio + 4 + tamanho62);
    expect(conteudo62.startsWith('05')).toBe(true);

    const tamanhoTxid = Number(conteudo62.slice(2, 4));
    const txid = conteudo62.slice(4, 4 + tamanhoTxid);
    expect(txid).toMatch(/^[A-Z0-9]+$/);
    expect(txid.length).toBe(tamanhoTxid);
    expect(txid.length).toBeLessThanOrEqual(25);
  });
});

describe('validação de cartão', () => {
  it('aprova números válidos por Luhn e reprova o dígito trocado', () => {
    expect(luhnValido('4539578763621486')).toBe(true);
    expect(luhnValido('4539578763621487')).toBe(false);
  });

  it('reprova tamanho fora de 13..19 dígitos', () => {
    expect(luhnValido('4539')).toBe(false);
    expect(luhnValido('45395787636214861234')).toBe(false);
  });

  it('ignora espaço e traço na digitação', () => {
    expect(luhnValido('4539 5787 6362 1486')).toBe(true);
    expect(luhnValido('4539-5787-6362-1486')).toBe(true);
  });

  it('identifica a bandeira pelo prefixo', () => {
    expect(bandeiraDoCartao('4539578763621486')).toBe('Visa');
    expect(bandeiraDoCartao('5555555555554444')).toBe('Mastercard');
    expect(bandeiraDoCartao('378282246310005')).toBe('Amex');
    expect(bandeiraDoCartao('9999999999999999')).toBe('Cartão');
  });

  it('aceita validade até o último dia do mês impresso', () => {
    // Cartão com validade 09/26 vale durante todo setembro de 2026: reprovar
    // no dia 1º cortaria um mês legítimo de uso.
    const meio = '2026-09-15T12:00:00.000Z';
    expect(validadeNoFuturo('09/26', meio)).toBe(true);
    expect(validadeNoFuturo('08/26', meio)).toBe(false);
    expect(validadeNoFuturo('10/26', meio)).toBe(true);
  });

  it('reprova mês impossível e formato errado', () => {
    const agora = '2026-09-02T12:00:00.000Z';
    expect(validadeNoFuturo('13/27', agora)).toBe(false);
    expect(validadeNoFuturo('00/27', agora)).toBe(false);
    expect(validadeNoFuturo('9/27', agora)).toBe(false);
    expect(validadeNoFuturo('092027', agora)).toBe(false);
  });

  it('exige 4 dígitos de CVV na Amex e 3 nas outras', () => {
    expect(cvvValido('1234', 'Amex')).toBe(true);
    expect(cvvValido('123', 'Amex')).toBe(false);
    expect(cvvValido('123', 'Visa')).toBe(true);
    expect(cvvValido('1234', 'Visa')).toBe(false);
  });
});

describe('resumirCartao (RNF-022)', () => {
  it('guarda só os quatro últimos dígitos, a bandeira e o titular', () => {
    const resumo = resumirCartao({ numero: '4539 5787 6362 1486', titular: 'Marina Alves' });
    expect(resumo).toEqual({
      ultimosQuatro: '1486',
      bandeira: 'Visa',
      titular: 'MARINA ALVES',
    });
  });

  it('não deixa nenhum outro dígito do cartão sobrar no resultado', () => {
    // Verificação direta da promessa: o número inteiro não pode ser
    // reconstruído a partir do que sai da tela.
    const numero = '4539578763621486';
    const serializado = JSON.stringify(resumirCartao({ numero, titular: 'X' }));
    expect(serializado).not.toContain(numero);
    expect(serializado).not.toContain(numero.slice(0, 6));
  });
});

describe('desfechoDeterministico', () => {
  it('decide pelo último dígito, para a demo poder mostrar recusa', () => {
    expect(desfechoDeterministico('4539578763621486')).toBe('APROVADO');
    expect(desfechoDeterministico('4000000000000101')).toBe('RECUSADO');
    expect(desfechoDeterministico('4000000000000102')).toBe('EM_ANALISE');
  });
});
