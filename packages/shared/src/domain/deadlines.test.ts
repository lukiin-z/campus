import { describe, expect, it } from 'vitest';
import {
  checkInOpen,
  checkInWindow,
  defaultDeadlines,
  enrollmentOpen,
  shouldBeConcluded,
  validateDeadlines,
  withinCancellationWindow,
} from './deadlines';
import { HOUR_MS, POLICY } from './policy';

/**
 * Prazos — RN-009, RN-010, RN-011 e RN-017.
 *
 * ## Por que este arquivo apareceu no CP6
 *
 * Porque a medição o pediu: `deadlines.ts` estava com **22,22% de linhas e
 * 28,57% de funções**, e não tinha arquivo de teste nenhum. Os 22% vinham de
 * ser importado pelos testes de outros módulos — o efeito colateral que faz um
 * módulo *parecer* exercitado.
 *
 * E ele não é periférico: `enrollmentOpen` decide o botão de inscrever em
 * `eventAction.ts`, `validateDeadlines` valida o formulário de criação,
 * `withinCancellationWindow` decide se um cancelamento gera reembolso e
 * `defaultDeadlines` é chamado pela API ao criar evento.
 *
 * ## Onde estão os defeitos de prazo
 *
 * Na borda, sempre. `<=` versus `<` num prazo é a diferença entre aceitar e
 * recusar a inscrição de quem clicou no último segundo — então quase todo caso
 * aqui mede o instante EXATO do limite, não um ponto confortavelmente dentro ou
 * fora dele.
 */

const INICIO = '2026-10-15T19:00:00.000Z';
const FIM = '2026-10-15T22:00:00.000Z';
const PRAZO_INSCRICAO = '2026-10-15T17:00:00.000Z';
const PRAZO_CANCELAMENTO = '2026-10-14T19:00:00.000Z';

const evento = {
  inicio: INICIO,
  fim: FIM,
  prazoInscricao: PRAZO_INSCRICAO,
  prazoCancelamento: PRAZO_CANCELAMENTO,
  status: 'PUBLICADO' as const,
};

/** Um instante deslocado de `ms` em relação a uma referência ISO. */
function em(referencia: string, ms: number): string {
  return new Date(new Date(referencia).getTime() + ms).toISOString();
}

describe('enrollmentOpen — RN-009', () => {
  it('aberta antes do prazo', () => {
    expect(enrollmentOpen(evento, em(PRAZO_INSCRICAO, -HOUR_MS))).toBe(true);
  });

  it('aberta NO instante do prazo: o limite é inclusivo', () => {
    expect(enrollmentOpen(evento, PRAZO_INSCRICAO)).toBe(true);
  });

  it('fechada um milissegundo depois', () => {
    expect(enrollmentOpen(evento, em(PRAZO_INSCRICAO, 1))).toBe(false);
  });

  it.each(['RASCUNHO', 'EM_APROVACAO', 'CANCELADO', 'REALIZADO'] as const)(
    'fechada em evento %s, mesmo dentro do prazo',
    (status) => {
      /*
       * O status vem ANTES do prazo na função, e a ordem importa: sem ela, um
       * evento cancelado com prazo no futuro aceitaria inscrição.
       */
      expect(enrollmentOpen({ ...evento, status }, em(PRAZO_INSCRICAO, -HOUR_MS))).toBe(false);
    },
  );
});

describe('withinCancellationWindow — RN-010', () => {
  it('dentro antes do prazo', () => {
    expect(withinCancellationWindow(evento, em(PRAZO_CANCELAMENTO, -1))).toBe(true);
  });

  it('dentro NO instante do prazo', () => {
    expect(withinCancellationWindow(evento, PRAZO_CANCELAMENTO)).toBe(true);
  });

  it('fora um milissegundo depois — é aqui que o reembolso deixa de existir', () => {
    expect(withinCancellationWindow(evento, em(PRAZO_CANCELAMENTO, 1))).toBe(false);
  });

  it('não olha o status: cancelar evento cancelado é decisão de outra regra', () => {
    expect(withinCancellationWindow({ prazoCancelamento: PRAZO_CANCELAMENTO }, INICIO)).toBe(false);
  });
});

describe('checkInWindow e checkInOpen — RN-017', () => {
  it('abre 4 h antes do início e fecha 2 h depois do fim', () => {
    const { opensAt, closesAt } = checkInWindow(evento);

    expect(opensAt).toBe(new Date(INICIO).getTime() - POLICY.CHECKIN_OPENS_HOURS_BEFORE * HOUR_MS);
    expect(closesAt).toBe(new Date(FIM).getTime() + POLICY.CHECKIN_CLOSES_HOURS_AFTER * HOUR_MS);
  });

  it('fechado um milissegundo antes de abrir', () => {
    const { opensAt } = checkInWindow(evento);
    expect(checkInOpen(evento, new Date(opensAt - 1).toISOString())).toBe(false);
  });

  it('aberto no instante de abertura e no de fechamento: as duas bordas contam', () => {
    const { opensAt, closesAt } = checkInWindow(evento);

    expect(checkInOpen(evento, new Date(opensAt).toISOString())).toBe(true);
    expect(checkInOpen(evento, new Date(closesAt).toISOString())).toBe(true);
  });

  it('fechado um milissegundo depois de fechar', () => {
    const { closesAt } = checkInWindow(evento);
    expect(checkInOpen(evento, new Date(closesAt + 1).toISOString())).toBe(false);
  });

  it('aberto durante o evento', () => {
    expect(checkInOpen(evento, em(INICIO, HOUR_MS))).toBe(true);
  });
});

describe('shouldBeConcluded', () => {
  it('não conclui enquanto a janela de check-in está aberta', () => {
    const { closesAt } = checkInWindow(evento);
    expect(shouldBeConcluded(evento, new Date(closesAt).toISOString())).toBe(false);
  });

  it('conclui depois de a janela fechar', () => {
    const { closesAt } = checkInWindow(evento);
    expect(shouldBeConcluded(evento, new Date(closesAt + 1).toISOString())).toBe(true);
  });

  it.each(['RASCUNHO', 'EM_APROVACAO', 'CANCELADO', 'REALIZADO'] as const)(
    'não mexe em evento %s',
    (status) => {
      /*
       * `REALIZADO` na lista importa: sem o teste de status, a função diria
       * "conclua" para um evento já concluído, e quem a chamasse em laço
       * reescreveria a mesma linha para sempre.
       */
      expect(shouldBeConcluded({ ...evento, status }, '2027-01-01T00:00:00.000Z')).toBe(false);
    },
  );
});

describe('validateDeadlines — RN-011', () => {
  const agora = '2026-10-01T12:00:00.000Z';

  it('não acusa nada num conjunto coerente', () => {
    expect(validateDeadlines(evento, agora)).toEqual([]);
  });

  it('recusa início no passado', () => {
    const violacoes = validateDeadlines({ ...evento, inicio: '2026-09-01T19:00:00.000Z' }, agora);
    expect(violacoes.map((v) => v.field)).toContain('inicio');
  });

  it('aceita início no passado com allowPast — é o caso do seed e da edição', () => {
    const passado = {
      inicio: '2026-09-01T19:00:00.000Z',
      fim: '2026-09-01T22:00:00.000Z',
      prazoInscricao: '2026-09-01T17:00:00.000Z',
      prazoCancelamento: '2026-08-31T19:00:00.000Z',
    };
    expect(validateDeadlines(passado, agora, { allowPast: true })).toEqual([]);
  });

  it('recusa fim antes do início', () => {
    const violacoes = validateDeadlines({ ...evento, fim: em(INICIO, -HOUR_MS) }, agora);
    expect(violacoes.map((v) => v.field)).toContain('fim');
  });

  it('recusa fim igual ao início: evento de duração zero não é evento', () => {
    const violacoes = validateDeadlines({ ...evento, fim: INICIO }, agora);
    expect(violacoes.map((v) => v.field)).toContain('fim');
  });

  it(`recusa duração acima de ${POLICY.MAX_EVENT_DURATION_DAYS} dias`, () => {
    const limite = POLICY.MAX_EVENT_DURATION_DAYS * 24 * HOUR_MS;
    const violacoes = validateDeadlines({ ...evento, fim: em(INICIO, limite + 1) }, agora);

    expect(violacoes.some((v) => v.message.includes('dias'))).toBe(true);
  });

  it('aceita duração exatamente no limite', () => {
    const limite = POLICY.MAX_EVENT_DURATION_DAYS * 24 * HOUR_MS;
    const violacoes = validateDeadlines({ ...evento, fim: em(INICIO, limite) }, agora);

    expect(violacoes.some((v) => v.message.includes('dias'))).toBe(false);
  });

  it('recusa prazo de inscrição depois do início', () => {
    const violacoes = validateDeadlines({ ...evento, prazoInscricao: em(INICIO, 1) }, agora);
    expect(violacoes.map((v) => v.field)).toContain('prazoInscricao');
  });

  it('aceita prazo de inscrição exatamente no início', () => {
    const violacoes = validateDeadlines({ ...evento, prazoInscricao: INICIO }, agora);
    expect(violacoes.map((v) => v.field)).not.toContain('prazoInscricao');
  });

  it('recusa prazo de cancelamento depois do início', () => {
    const violacoes = validateDeadlines({ ...evento, prazoCancelamento: em(INICIO, 1) }, agora);
    expect(violacoes.map((v) => v.field)).toContain('prazoCancelamento');
  });

  it('devolve TODAS as violações, não a primeira', () => {
    /*
     * É a razão de a função devolver lista e não booleano (UC-001, E2): o
     * formulário mostra o erro em cada campo. Parar na primeira faria a pessoa
     * corrigir uma coisa por vez, submetendo quatro vezes.
     */
    const tudoErrado = {
      inicio: '2026-09-01T19:00:00.000Z',
      fim: '2026-09-01T18:00:00.000Z',
      prazoInscricao: '2026-09-02T00:00:00.000Z',
      prazoCancelamento: '2026-09-02T00:00:00.000Z',
    };

    const campos = validateDeadlines(tudoErrado, agora).map((v) => v.field);

    expect(campos).toContain('inicio');
    expect(campos).toContain('fim');
    expect(campos).toContain('prazoInscricao');
    expect(campos).toContain('prazoCancelamento');
  });

  it('toda mensagem é frase legível, não nome de campo', () => {
    const violacoes = validateDeadlines(
      { ...evento, inicio: '2026-09-01T19:00:00.000Z', fim: '2026-09-01T18:00:00.000Z' },
      agora,
    );

    for (const v of violacoes) {
      expect(v.message.length).toBeGreaterThan(15);
      expect(v.message.endsWith('.')).toBe(true);
    }
  });
});

describe('defaultDeadlines', () => {
  it('sugere inscrição 2 h e cancelamento 24 h antes do início', () => {
    const { prazoInscricao, prazoCancelamento } = defaultDeadlines(INICIO);

    expect(prazoInscricao).toBe(
      em(INICIO, -POLICY.DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE * HOUR_MS),
    );
    expect(prazoCancelamento).toBe(
      em(INICIO, -POLICY.DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE * HOUR_MS),
    );
  });

  it('os prazos sugeridos passam pela própria validação', () => {
    /*
     * Parece obvio e não é: um padrão que a validação recusa faria o formulário
     * nascer inválido, e a pessoa veria erro em campo que ela não preencheu.
     */
    const sugeridos = defaultDeadlines(INICIO);
    const violacoes = validateDeadlines(
      { inicio: INICIO, fim: FIM, ...sugeridos },
      '2026-10-01T00:00:00.000Z',
    );

    expect(violacoes).toEqual([]);
  });

  it('o cancelamento padrão é ANTES do prazo de inscrição, e a consequência é real', () => {
    /*
     * 24 h contra 2 h: quem se inscreve nas últimas 24 horas já entra fora da
     * janela de cancelamento. Não é defeito — é a política escolhida, e o efeito
     * é `canceladaAposPrazo: true`, sem reembolso (RN-010, RN-013). Está
     * afirmado aqui para que mexer nas duas constantes exija ler isto.
     */
    const { prazoInscricao, prazoCancelamento } = defaultDeadlines(INICIO);

    expect(new Date(prazoCancelamento).getTime()).toBeLessThan(new Date(prazoInscricao).getTime());
  });
});
