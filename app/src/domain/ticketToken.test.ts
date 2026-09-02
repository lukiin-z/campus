import { describe, expect, it } from 'vitest';
import {
  assinaturaValida,
  classificarLeitura,
  emitirToken,
  lerToken,
  montarIngresso,
} from './ticketToken';

/**
 * CT-036 e CT-037 — token do ingresso (RF-033, RN-017).
 *
 * O ponto destes testes é o que acontece com entrada ADULTERADA e com entrada
 * lixo. Na porta de um evento, um leitor que estoura com exceção para um QR de
 * outro sistema para a fila; um leitor que aceita token remendado deixa entrar
 * quem não pagou.
 */

const PAYLOAD = {
  participacaoId: 'par-001',
  eventoId: 'evt-007',
  usuarioId: 'usr-001',
  emitidoEm: '2026-09-12T18:00:00.000Z',
};

describe('emitirToken e lerToken', () => {
  it('faz o ciclo completo sem perder nada', () => {
    expect(lerToken(emitirToken(PAYLOAD))).toEqual(PAYLOAD);
  });

  it('sobrevive a acento e caractere fora de Latin-1 no payload', () => {
    // `btoa` quebraria aqui. É por isso que o base64url é escrito à mão.
    const comAcento = { ...PAYLOAD, usuarioId: 'usr-ção-ẽ-😀' };
    expect(lerToken(emitirToken(comAcento))).toEqual(comAcento);
  });

  it('recusa token com o corpo adulterado', () => {
    const token = emitirToken(PAYLOAD);
    const partes = token.split('.');
    const corpo = partes[2] ?? '';
    // Troca um caractere do corpo mantendo a assinatura: é o ataque óbvio.
    const alterado = `${partes[0]}.${partes[1]}.${corpo.slice(0, -1)}A.${partes[3]}`;
    expect(lerToken(alterado)).toBeNull();
    expect(assinaturaValida(alterado)).toBe(false);
  });

  it('recusa token com a assinatura trocada', () => {
    const token = emitirToken(PAYLOAD);
    expect(lerToken(`${token.slice(0, -1)}0`.replace(/.$/, 'f'))).toBeNull();
  });

  it('recusa token de outro emissor ou de outra versão', () => {
    const token = emitirToken(PAYLOAD);
    const partes = token.split('.');
    expect(lerToken(`outro.v1.${partes[2]}.${partes[3]}`)).toBeNull();
    expect(lerToken(`campus.v2.${partes[2]}.${partes[3]}`)).toBeNull();
  });

  it('devolve null — nunca lança — para entrada lixo', () => {
    for (const lixo of ['', '   ', 'abc', 'a.b.c', 'a.b.c.d.e', 'campus.v1..x', '{}']) {
      expect(() => lerToken(lixo)).not.toThrow();
      expect(lerToken(lixo)).toBeNull();
    }
  });

  it('recusa payload íntegro mas incompleto', () => {
    // Assinatura válida sobre um corpo que não tem os campos obrigatórios: o
    // leitor não pode confiar só na assinatura.
    const parcial = emitirToken({ ...PAYLOAD, participacaoId: '' });
    expect(lerToken(parcial)).toBeNull();
  });
});

describe('montarIngresso', () => {
  const ingresso = montarIngresso(PAYLOAD, '3ESPX');

  it('devolve as três formas do mesmo ingresso', () => {
    expect(lerToken(ingresso.valor)).toEqual(PAYLOAD);
    expect(ingresso.codigoNumerico).toMatch(/^\d{8}$/);
    expect(ingresso.codigoLegivel).toBe(`CMP-3ESPX-${ingresso.codigoNumerico.slice(-4)}`);
    expect(ingresso.emitidoEm).toBe(PAYLOAD.emitidoEm);
  });

  it('é estável: o mesmo ingresso não muda de código entre emissões', () => {
    const outro = montarIngresso(PAYLOAD, '3ESPX');
    expect(outro.codigoNumerico).toBe(ingresso.codigoNumerico);
    expect(outro.codigoLegivel).toBe(ingresso.codigoLegivel);
  });
});

describe('classificarLeitura', () => {
  it('reconhece o token completo', () => {
    const token = emitirToken(PAYLOAD);
    expect(classificarLeitura(token)).toEqual({ tipo: 'TOKEN', token });
  });

  it('reconhece o código numérico de 8 dígitos', () => {
    expect(classificarLeitura(' 01234567 ')).toEqual({
      tipo: 'CODIGO_NUMERICO',
      codigo: '01234567',
    });
  });

  it('reconhece o código legível e normaliza a caixa', () => {
    expect(classificarLeitura('cmp-3espx-0184')).toEqual({
      tipo: 'CODIGO_LEGIVEL',
      codigo: 'CMP-3ESPX-0184',
    });
  });

  it('marca como indecifrável o que não é nenhuma das três formas', () => {
    for (const entrada of ['', '   ', '1234', '123456789', 'CMP-3ESPX', 'https://outro.app/qr']) {
      expect(classificarLeitura(entrada).tipo).toBe('INDECIFRAVEL');
    }
  });
});
