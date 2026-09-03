import { Prisma } from '@prisma/client';
import type { Evento as EventoLinha, Participacao as ParticipacaoLinha } from '@prisma/client';
import { currentPolicy } from '@campus/shared';
import { describe, expect, it } from 'vitest';
import {
  paraDecimal,
  paraEvento,
  paraNumero,
  paraParticipacao,
  paraPergunta,
  paraPolitica,
  paraResumoCartao,
  paraTurma,
  paraTurmaPublica,
  politicaParaJson,
} from './mapeadores';

/**
 * O que estes testes protegem.
 *
 * Os mapeadores são a fronteira entre a representação do banco (`Date`,
 * `Decimal`, `Json`, `senhaHash`) e a do contrato (ISO 8601, `number`, tipo
 * estruturado, sem hash). Três defeitos que só aparecem aqui:
 *
 * 1. `Decimal` vazando para o JSON — serializa como `{ s, e, d }` e o cliente
 *    mostra `NaN` no preço;
 * 2. `Date` vazando — o domínio declara `IsoDateTime`, e `toMs` sobre um
 *    objeto `Date` funcionaria, mas o cliente receberia formato diferente do
 *    contratado;
 * 3. `codigoConvite` numa projeção pública — entrega a credencial de vínculo de
 *    RN-003 de graça.
 */

const AGORA = new Date('2026-09-02T12:00:00.000Z');

function eventoLinha(sobrescrever: Partial<EventoLinha> = {}): EventoLinha {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organizadorId: '22222222-2222-4222-8222-222222222222',
    titulo: 'Churrasco da turma',
    descricao: 'Descrição com mais de vinte caracteres para satisfazer o piso.',
    alcance: 'TURMA',
    turmaId: '33333333-3333-4333-8333-333333333333',
    cursoId: null,
    faculdadeId: null,
    inicio: new Date('2026-09-12T16:00:00.000Z'),
    fim: new Date('2026-09-12T22:00:00.000Z'),
    local: 'Área de convivência',
    capacidade: 40,
    ocupadas: 38,
    preco: new Prisma.Decimal('25.00'),
    status: 'PUBLICADO',
    motivoCancelamento: null,
    prazoInscricao: new Date('2026-09-12T14:00:00.000Z'),
    prazoCancelamento: new Date('2026-09-11T16:00:00.000Z'),
    capaSeed: 3,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
    ...sobrescrever,
  };
}

function participacaoLinha(sobrescrever: Partial<ParticipacaoLinha> = {}): ParticipacaoLinha {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    eventoId: '11111111-1111-4111-8111-111111111111',
    usuarioId: '55555555-5555-4555-8555-555555555555',
    status: 'CONFIRMADA',
    posicaoFila: null,
    pagamentoExpiraEm: null,
    ofertaExpiraEm: null,
    motivoCancelamento: null,
    canceladaAposPrazo: false,
    politicaVigente: null,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
    ...sobrescrever,
  };
}

describe('dinheiro', () => {
  it('Decimal vira number, e não objeto serializado', () => {
    expect(paraNumero(new Prisma.Decimal('25.00'))).toBe(25);
    expect(paraNumero(new Prisma.Decimal('0'))).toBe(0);
    expect(paraNumero(new Prisma.Decimal('12.99'))).toBe(12.99);
  });

  it('number volta para Decimal arredondado a centavo, sem erro de ponto flutuante', () => {
    /*
     * `0.1 + 0.2` é `0.30000000000000004`. Sem o `toFixed(2)` de `paraDecimal`,
     * esse valor iria para uma coluna `numeric(10,2)` e o PostgreSQL
     * arredondaria em silêncio — o que funciona até o dia em que o valor cai
     * exatamente na metade e o arredondamento discorda do que a tela mostrou.
     *
     * `Decimal` normaliza a representação (`0.30` imprime `0.3`), então a
     * asserção é sobre o VALOR, não sobre o texto.
     */
    expect(paraDecimal(12.99).equals(new Prisma.Decimal('12.99'))).toBe(true);
    expect(paraDecimal(0.1 + 0.2).equals(new Prisma.Decimal('0.30'))).toBe(true);
    expect(paraDecimal(25).equals(new Prisma.Decimal('25'))).toBe(true);
    // Terceira casa é truncada no arredondamento, não guardada.
    expect(paraDecimal(12.994).toNumber()).toBe(12.99);
  });
});

describe('paraEvento', () => {
  it('converte todas as datas para ISO 8601 com fuso', () => {
    const evento = paraEvento(eventoLinha());

    expect(evento.inicio).toBe('2026-09-12T16:00:00.000Z');
    expect(evento.fim).toBe('2026-09-12T22:00:00.000Z');
    expect(evento.prazoInscricao).toBe('2026-09-12T14:00:00.000Z');
    expect(evento.prazoCancelamento).toBe('2026-09-11T16:00:00.000Z');
    expect(evento.criadoEm).toBe('2026-09-02T12:00:00.000Z');
  });

  it('preço sai como number', () => {
    expect(paraEvento(eventoLinha()).preco).toBe(25);
    expect(paraEvento(eventoLinha({ preco: new Prisma.Decimal('0') })).preco).toBe(0);
  });

  it('a âncora não preenchida sai como null, não como undefined', () => {
    const evento = paraEvento(eventoLinha());
    expect(evento.cursoId).toBeNull();
    expect(evento.faculdadeId).toBeNull();
  });
});

describe('paraParticipacao', () => {
  it('prazos nulos continuam nulos, e preenchidos saem em ISO', () => {
    const semPrazo = paraParticipacao(participacaoLinha());
    expect(semPrazo.pagamentoExpiraEm).toBeNull();
    expect(semPrazo.ofertaExpiraEm).toBeNull();

    const comPrazo = paraParticipacao(
      participacaoLinha({
        status: 'PENDENTE_PAGAMENTO',
        pagamentoExpiraEm: new Date('2026-09-02T13:00:00.000Z'),
      }),
    );
    expect(comPrazo.pagamentoExpiraEm).toBe('2026-09-02T13:00:00.000Z');
  });
});

describe('paraPolitica — RN-013', () => {
  it('faz ida e volta com a política congelada, sem perder campo', () => {
    const politica = currentPolicy(AGORA);

    /*
     * O `JSON.parse(JSON.stringify(...))` no meio não é enfeite: é o caminho
     * real. `politicaParaJson` produz o que vai para a coluna `jsonb`, e
     * `paraPolitica` lê o que volta dela — que passou por serialização. Testar
     * as duas funções diretamente uma na outra provaria menos: o tipo de
     * escrita do Prisma (`InputJsonObject`) não é o de leitura (`JsonValue`).
     */
    const comoVoltaDoBanco: Prisma.JsonValue = JSON.parse(
      JSON.stringify(politicaParaJson(politica)),
    );

    expect(paraPolitica(comoVoltaDoBanco)).toEqual(politica);
  });

  it('JSON com forma diferente volta null em vez de derrubar a requisição', () => {
    /*
     * Participação antiga com formato antigo é dado legítimo. Lançar aqui
     * tornaria a tela de perfil inacessível por causa de uma linha de um
     * semestre passado.
     */
    expect(paraPolitica(null)).toBeNull();
    expect(paraPolitica({ reembolsoIntegralDiasAntes: 7 })).toBeNull();
    expect(paraPolitica([1, 2, 3])).toBeNull();
    expect(paraPolitica('7 dias')).toBeNull();
    expect(
      paraPolitica({
        reembolsoIntegralDiasAntes: '7',
        reembolsoParcialHorasAntes: 48,
        reembolsoParcialTaxa: 0.5,
        congeladaEm: AGORA.toISOString(),
      }),
    ).toBeNull();
  });
});

describe('paraResumoCartao — RNF-022', () => {
  it('devolve o resumo quando as três colunas estão preenchidas', () => {
    expect(
      paraResumoCartao({
        ultimosQuatro: '4242',
        bandeiraCartao: 'Visa',
        titularCartao: 'MARINA ALVES',
      }),
    ).toEqual({ ultimosQuatro: '4242', bandeira: 'Visa', titular: 'MARINA ALVES' });
  });

  it('devolve null se qualquer uma faltar — meio cartão não é dado', () => {
    expect(
      paraResumoCartao({ ultimosQuatro: '4242', bandeiraCartao: null, titularCartao: 'X' }),
    ).toBeNull();
    expect(
      paraResumoCartao({ ultimosQuatro: null, bandeiraCartao: null, titularCartao: null }),
    ).toBeNull();
  });
});

describe('paraTurmaPublica — RN-003', () => {
  const turma = {
    id: '66666666-6666-4666-8666-666666666666',
    cursoId: '77777777-7777-4777-8777-777777777777',
    nome: '3ESPX',
    periodo: '2026.1',
    codigoConvite: '3ESPX-K7M2QB',
    codigoAtivo: true,
  };

  it('a projeção pública NÃO carrega o código de convite', () => {
    const publica = paraTurmaPublica(turma);
    expect(publica).not.toHaveProperty('codigoConvite');
    expect(publica.nome).toBe('3ESPX');
  });

  it('a projeção completa carrega, porque é a resposta da rota de admin', () => {
    expect(paraTurma(turma).codigoConvite).toBe('3ESPX-K7M2QB');
  });
});

describe('paraPergunta', () => {
  it('array vazio de opções vira null, porque o contrato usa null para "não se aplica"', () => {
    const pergunta = paraPergunta({
      id: '88888888-8888-4888-8888-888888888888',
      eventoId: '11111111-1111-4111-8111-111111111111',
      enunciado: 'Vai levar acompanhante?',
      tipo: 'TEXTO_CURTO',
      opcoes: [],
      obrigatoria: false,
      ordem: 1,
    });

    expect(pergunta.opcoes).toBeNull();
  });
});
