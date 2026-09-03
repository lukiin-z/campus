import { createHmac } from 'node:crypto';
import { crc16 } from '@campus/shared';
import { describe, expect, it } from 'vitest';
import { carregarAmbiente, type Ambiente } from '../../config/ambiente';
import { GatewayFake } from './fake.gateway';
import { paraCentavos } from './pagamento.gateway';

/**
 * O que estes testes protegem.
 *
 * A ADR-0006 registra explicitamente o risco de o simulador ser "bom demais":
 * um gateway que sempre confirma ensina o app a assumir sucesso. Estes testes
 * amarram o oposto — cartão terminado em 1 recusa **sempre**, terminado em 2 vai
 * para análise **sempre** — e é isso que permite testar a tela de recusa sem
 * mock e sem sorte.
 *
 * A verificação de assinatura ganha o teste mais importante: sem ela, RN-014
 * ("a confirmação vem SOMENTE do gateway") não tem como ser verdade, porque
 * qualquer pessoa com a URL confirmaria a própria inscrição com um `curl`.
 */

const SEGREDO = 'segredo-de-webhook-para-teste';

function ambiente(): Ambiente {
  return carregarAmbiente({
    DATABASE_URL: 'postgresql://u:p@localhost:5432/campus?schema=public',
    JWT_SECRET: 'a'.repeat(48),
    WEBHOOK_SECRET: SEGREDO,
  });
}

function gateway(): GatewayFake {
  return new GatewayFake(ambiente());
}

function assinar(corpo: string): string {
  return createHmac('sha256', SEGREDO).update(corpo, 'utf8').digest('hex');
}

const COBRANCA_BASE = {
  participacaoId: '44444444-4444-4444-8444-444444444444',
  valorCentavos: 2500,
  descricao: 'Churrasco da turma',
  expiraEm: '2026-09-02T13:00:00.000Z',
  chaveIdempotencia: 'pay:44444444-4444-4444-8444-444444444444:tentativa-1',
};

describe('criarCobranca — Pix', () => {
  it('nasce AGUARDANDO: quem paga é a pessoa, e o desfecho vem pelo webhook', async () => {
    const cobranca = await gateway().criarCobranca({ ...COBRANCA_BASE, metodo: 'PIX' });

    expect(cobranca.status).toBe('AGUARDANDO');
    expect(cobranca.expiraEm).toBe(COBRANCA_BASE.expiraEm);
    expect(cobranca.pix).toBeDefined();
  });

  it('o BR Code tem CRC16 válido — é QR real de formato, com chave fictícia', async () => {
    const cobranca = await gateway().criarCobranca({ ...COBRANCA_BASE, metodo: 'PIX' });
    const brCode = cobranca.pix?.brCode ?? '';

    // O payload termina em `6304` + 4 dígitos hex de CRC sobre tudo o que veio
    // antes, inclusive o `6304`.
    const semCrc = brCode.slice(0, -4);
    expect(brCode.slice(-4)).toBe(crc16(semCrc));
    expect(semCrc.endsWith('6304')).toBe(true);
  });

  it('é determinístico: a mesma cobrança produz o mesmo BR Code', async () => {
    const primeira = await gateway().criarCobranca({ ...COBRANCA_BASE, metodo: 'PIX' });
    const segunda = await gateway().criarCobranca({ ...COBRANCA_BASE, metodo: 'PIX' });

    // É o que permite NÃO armazenar o payload: recalcular devolve o mesmo.
    expect(segunda.pix?.brCode).toBe(primeira.pix?.brCode);
  });
});

describe('criarCobranca — cartão, desfecho determinístico', () => {
  const cartao = { bandeira: 'Visa', titular: 'MARINA ALVES' };

  it('terminado em 1 recusa SEMPRE', async () => {
    for (let i = 0; i < 5; i += 1) {
      const cobranca = await gateway().criarCobranca({
        ...COBRANCA_BASE,
        metodo: 'CARTAO_CREDITO',
        cartao: { ...cartao, ultimosQuatro: '4241' },
      });
      expect(cobranca.status).toBe('RECUSADO');
    }
  });

  it('terminado em 2 vai para análise', async () => {
    const cobranca = await gateway().criarCobranca({
      ...COBRANCA_BASE,
      metodo: 'CARTAO_DEBITO',
      cartao: { ...cartao, ultimosQuatro: '4242' },
    });
    expect(cobranca.status).toBe('EM_ANALISE');
  });

  it('qualquer outro dígito aprova, com captura síncrona', async () => {
    const cobranca = await gateway().criarCobranca({
      ...COBRANCA_BASE,
      metodo: 'CARTAO_CREDITO',
      cartao: { ...cartao, ultimosQuatro: '4244' },
    });
    expect(cobranca.status).toBe('CONFIRMADO');
  });

  it('cartão não devolve payload Pix', async () => {
    const cobranca = await gateway().criarCobranca({
      ...COBRANCA_BASE,
      metodo: 'CARTAO_CREDITO',
      cartao: { ...cartao, ultimosQuatro: '4244' },
    });
    expect(cobranca.pix).toBeUndefined();
  });
});

describe('verificarNotificacao — RN-014', () => {
  const corpo = JSON.stringify({
    transacaoExternaId: 'sim-pay-0001',
    chaveIdempotencia: 'pay:par-001:tentativa-1',
    valorPago: 25,
    pago: true,
  });

  it('aceita notificação com assinatura correta e traduz o tipo', () => {
    const verificada = gateway().verificarNotificacao({
      corpoBruto: corpo,
      cabecalhos: { 'x-assinatura': assinar(corpo) },
    });

    expect(verificada.valida).toBe(true);
    if (!verificada.valida) return;
    expect(verificada.tipo).toBe('PAGAMENTO_CONFIRMADO');
    expect(verificada.transacaoId).toBe('sim-pay-0001');
    expect(verificada.chaveIdempotencia).toBe('pay:par-001:tentativa-1');
    expect(verificada.valorCentavos).toBe(paraCentavos(25));
  });

  it('`pago: false` vira PAGAMENTO_RECUSADO, não erro', () => {
    const recusado = JSON.stringify({
      transacaoExternaId: 'sim-pay-0002',
      chaveIdempotencia: 'pay:par-002:tentativa-1',
      valorPago: 25,
      pago: false,
    });

    const verificada = gateway().verificarNotificacao({
      corpoBruto: recusado,
      cabecalhos: { 'x-assinatura': assinar(recusado) },
    });

    expect(verificada.valida).toBe(true);
    if (!verificada.valida) return;
    expect(verificada.tipo).toBe('PAGAMENTO_RECUSADO');
  });

  it('RECUSA corpo adulterado, mesmo com assinatura bem formada do corpo original', () => {
    const adulterado = corpo.replace('"valorPago":25', '"valorPago":1');

    const verificada = gateway().verificarNotificacao({
      corpoBruto: adulterado,
      cabecalhos: { 'x-assinatura': assinar(corpo) },
    });

    expect(verificada).toEqual({ valida: false, motivo: 'ASSINATURA_INVALIDA' });
  });

  it('recusa sem cabeçalho de assinatura', () => {
    expect(gateway().verificarNotificacao({ corpoBruto: corpo, cabecalhos: {} })).toEqual({
      valida: false,
      motivo: 'ASSINATURA_INVALIDA',
    });
  });

  it('recusa com corpo bruto vazio — falha FECHADA quando o rawBody não chega', () => {
    expect(
      gateway().verificarNotificacao({
        corpoBruto: '',
        cabecalhos: { 'x-assinatura': assinar('') },
      }),
    ).toEqual({ valida: false, motivo: 'ASSINATURA_INVALIDA' });
  });

  it('assinatura de tamanho diferente recusa sem lançar', () => {
    expect(
      gateway().verificarNotificacao({
        corpoBruto: corpo,
        cabecalhos: { 'x-assinatura': 'curta' },
      }),
    ).toEqual({ valida: false, motivo: 'ASSINATURA_INVALIDA' });
  });

  it('assinatura válida com JSON malformado é CORPO_MALFORMADO, não erro de assinatura', () => {
    const invalido = '{ isto não é json';

    expect(
      gateway().verificarNotificacao({
        corpoBruto: invalido,
        cabecalhos: { 'x-assinatura': assinar(invalido) },
      }),
    ).toEqual({ valida: false, motivo: 'CORPO_MALFORMADO' });
  });

  it('assinatura válida com campo faltando é CORPO_MALFORMADO', () => {
    const incompleto = JSON.stringify({ transacaoExternaId: 'sim-1', pago: true });

    expect(
      gateway().verificarNotificacao({
        corpoBruto: incompleto,
        cabecalhos: { 'x-assinatura': assinar(incompleto) },
      }),
    ).toEqual({ valida: false, motivo: 'CORPO_MALFORMADO' });
  });

  it('é pura: chamar duas vezes com a mesma entrada dá o mesmo resultado', () => {
    const alvo = { corpoBruto: corpo, cabecalhos: { 'x-assinatura': assinar(corpo) } };
    expect(gateway().verificarNotificacao(alvo)).toEqual(gateway().verificarNotificacao(alvo));
  });
});

describe('reembolsar', () => {
  it('devolve o valor pedido e não decide faixa — quem decide é computeRefund', async () => {
    const reembolso = await gateway().reembolsar({
      transacaoId: 'sim-pay-0001',
      valorCentavos: 1250,
      chaveIdempotencia: 'refund:pay-0001',
      motivo: 'Cancelamento com mais de 7 dias de antecedência.',
    });

    expect(reembolso.status).toBe('REEMBOLSADO');
    expect(reembolso.valorCentavos).toBe(1250);
    // O id do reembolso é derivado da chave de idempotência, então reprocessar
    // o mesmo reembolso é reconhecível pelo provedor.
    expect(reembolso.reembolsoId).toBe('ref-refund:pay-0001');
  });
});

describe('consultarCobranca', () => {
  it('é determinística e nunca inventa CONFIRMADO para id desconhecido terminado em 1', async () => {
    const consulta = await gateway().consultarCobranca('sim-pay-0001');
    expect(consulta.status).toBe('RECUSADO');
    expect(consulta.motivoRecusa).toBeDefined();
  });

  it('a mesma transação consultada duas vezes devolve o mesmo status', async () => {
    const primeira = await gateway().consultarCobranca('sim-pay-0009');
    const segunda = await gateway().consultarCobranca('sim-pay-0009');
    expect(segunda.status).toBe(primeira.status);
  });
});
