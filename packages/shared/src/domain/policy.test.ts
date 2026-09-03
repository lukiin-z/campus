import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS, MINUTE_MS, POLICY, addHours, addMinutes, toMs } from './policy';

/**
 * Os parâmetros e as duas funções de tempo.
 *
 * ## Por que existe
 *
 * `policy.ts` estava com **33,33% de cobertura de funções**: `toMs` era
 * exercitada de esguelha por todo mundo, e `addMinutes` e `addHours` — as duas
 * que **produzem** os prazos gravados no banco — nunca haviam sido chamadas por
 * um teste.
 *
 * ## Por que testar constante
 *
 * Os casos de invariante abaixo não medem código, medem COERÊNCIA entre
 * números. `MIN_OFFER_WINDOW_MINUTES` maior que `WAITLIST_OFFER_WINDOW_HOURS`
 * seria um estado impossível que compila, passa no lint e só aparece como
 * "a oferta expirou antes de eu ver" em produção. Este arquivo é o único lugar
 * do projeto onde essas relações são afirmadas.
 */

const REFERENCIA = '2026-10-15T19:00:00.000Z';

describe('toMs', () => {
  it('aceita ISO 8601', () => {
    expect(toMs(REFERENCIA)).toBe(new Date(REFERENCIA).getTime());
  });

  it('aceita Date e devolve o mesmo número', () => {
    const d = new Date(REFERENCIA);
    expect(toMs(d)).toBe(toMs(REFERENCIA));
  });
});

describe('addMinutes e addHours', () => {
  it('somam e devolvem ISO 8601 com milissegundos', () => {
    expect(addMinutes(REFERENCIA, 60)).toBe('2026-10-15T20:00:00.000Z');
    expect(addHours(REFERENCIA, 1)).toBe('2026-10-15T20:00:00.000Z');
  });

  it('60 minutos e 1 hora dão o mesmo instante', () => {
    expect(addMinutes(REFERENCIA, 60)).toBe(addHours(REFERENCIA, 1));
  });

  it('aceitam valor negativo — é como os prazos padrão são calculados', () => {
    expect(addHours(REFERENCIA, -2)).toBe('2026-10-15T17:00:00.000Z');
    expect(addMinutes(REFERENCIA, -30)).toBe('2026-10-15T18:30:00.000Z');
  });

  it('aceitam Date na entrada', () => {
    expect(addHours(new Date(REFERENCIA), 3)).toBe('2026-10-15T22:00:00.000Z');
  });

  it('atravessam a virada do dia sem perder o fuso UTC', () => {
    /*
     * O `Z` no fim é o que importa: um prazo gravado em horário local e lido em
     * outro fuso desloca a janela de pagamento em horas inteiras.
     */
    const resultado = addHours('2026-10-15T23:00:00.000Z', 2);
    expect(resultado).toBe('2026-10-16T01:00:00.000Z');
    expect(resultado.endsWith('Z')).toBe(true);
  });

  it('somar zero devolve o mesmo instante, normalizado', () => {
    expect(addMinutes(REFERENCIA, 0)).toBe(REFERENCIA);
  });
});

describe('as unidades são coerentes entre si', () => {
  it('minuto, hora e dia', () => {
    expect(HOUR_MS).toBe(60 * MINUTE_MS);
    expect(DAY_MS).toBe(24 * HOUR_MS);
  });
});

describe('invariantes entre os parâmetros', () => {
  it('a janela mínima de oferta cabe dentro da janela padrão', () => {
    expect(POLICY.MIN_OFFER_WINDOW_MINUTES).toBeLessThan(POLICY.WAITLIST_OFFER_WINDOW_HOURS * 60);
  });

  it('o reembolso integral exige mais antecedência que o parcial', () => {
    /*
     * Se o parcial exigisse mais antecedência que o integral, haveria uma faixa
     * de tempo em que cancelar devolveria MENOS por desistir mais cedo — o
     * incentivo invertido (RN-013).
     */
    expect(POLICY.FULL_REFUND_DAYS_BEFORE * 24).toBeGreaterThan(POLICY.PARTIAL_REFUND_HOURS_BEFORE);
  });

  it('o reembolso parcial devolve algo, e menos que tudo', () => {
    expect(POLICY.PARTIAL_REFUND_RATE).toBeGreaterThan(0);
    expect(POLICY.PARTIAL_REFUND_RATE).toBeLessThan(1);
  });

  it('a capacidade mínima permite pelo menos duas pessoas', () => {
    // Um evento de capacidade 1 não tem lista de espera com sentido.
    expect(POLICY.MIN_CAPACITY).toBeGreaterThanOrEqual(2);
    expect(POLICY.MIN_CAPACITY).toBeLessThan(POLICY.MAX_CAPACITY);
  });

  it('a janela de check-in abre antes do início e fecha depois do fim', () => {
    expect(POLICY.CHECKIN_OPENS_HOURS_BEFORE).toBeGreaterThan(0);
    expect(POLICY.CHECKIN_CLOSES_HOURS_AFTER).toBeGreaterThan(0);
  });

  it('a janela de pagamento é menor que a duração máxima do evento', () => {
    /*
     * Uma janela de pagamento maior que o evento inteiro permitiria a vaga ficar
     * reservada e não paga até depois de o evento acabar (RN-012).
     */
    expect(POLICY.PAYMENT_WINDOW_MINUTES).toBeLessThan(POLICY.MAX_EVENT_DURATION_DAYS * 24 * 60);
  });

  it('o prazo padrão de cancelamento é mais antecipado que o de inscrição', () => {
    expect(POLICY.DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE).toBeGreaterThan(
      POLICY.DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE,
    );
  });

  it('todo parâmetro numérico é positivo', () => {
    for (const [nome, valor] of Object.entries(POLICY)) {
      if (typeof valor === 'number') {
        expect(valor, `${nome} deveria ser positivo`).toBeGreaterThan(0);
      }
    }
  });
});
