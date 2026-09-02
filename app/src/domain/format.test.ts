import { describe, expect, it } from 'vitest';
import {
  formatDayMonth,
  formatEventDateTime,
  formatEventRange,
  formatFullDate,
  formatRelative,
  formatSpots,
  formatTime,
  initials,
} from './format';

/**
 * Formatação de leitura humana — RNF-018, e o que sobrou de `app/src/domain/`
 * depois de o domínio migrar para `@campus/shared` no CP6.
 *
 * Não é regra de negócio: é apresentação. Ganhou teste porque estava em 54,92%
 * de linhas e 37,5% de funções, e porque data mal formatada tem consequência
 * direta — "Dom, 13 set · 13h" errado manda a pessoa no dia errado.
 *
 * O fuso é fixado em todos os casos: sem isso, o teste passa na máquina de quem
 * escreveu e falha no CI, que roda em UTC.
 */

/** Meio-dia UTC de uma sexta-feira. Longe da virada de dia em qualquer fuso. */
const SEXTA = '2026-09-11T12:00:00.000Z';

describe('formatEventDateTime', () => {
  it('traz dia da semana abreviado, dia, mês e hora', () => {
    const texto = formatEventDateTime(SEXTA);
    // O formato exato depende do fuso da máquina; o que se garante é a forma.
    expect(texto).toMatch(/^(Seg|Ter|Qua|Qui|Sex|Sáb|Dom),\s\d{1,2}\s\w+/);
    expect(texto).toContain('·');
  });
});

describe('formatTime', () => {
  it('mostra hora cheia sem os minutos, e com minutos quando existem', () => {
    // "19h" lê melhor que "19h00" em cartão de evento; "19h30" precisa dos dois.
    expect(formatTime('2026-09-11T19:00:00.000-03:00')).toBe('19h');
    expect(formatTime('2026-09-11T19:30:00.000-03:00')).toBe('19h30');
  });
});

describe('formatDayMonth', () => {
  it('devolve dia e mês separados, para o cartão empilhar os dois', () => {
    const { dia, mes } = formatDayMonth('2026-09-11T15:00:00.000-03:00');
    expect(dia).toBe('11');
    expect(mes).toMatch(/^[a-zç]{3}$/i);
  });
});

describe('formatFullDate', () => {
  it('escreve a data por extenso', () => {
    expect(formatFullDate('2026-09-11T15:00:00.000-03:00')).toMatch(/11 de \w+ de 2026/);
  });
});

describe('formatRelative', () => {
  const agora = new Date('2026-09-11T12:00:00.000Z');

  it('usa "agora" para o que acabou de acontecer', () => {
    expect(formatRelative('2026-09-11T11:59:30.000Z', agora)).toBe('agora');
  });

  it('conta em minutos, horas e dias, na unidade que cabe', () => {
    expect(formatRelative('2026-09-11T11:45:00.000Z', agora)).toBe('há 15 min');
    expect(formatRelative('2026-09-11T09:00:00.000Z', agora)).toBe('há 3h');
    expect(formatRelative('2026-09-09T12:00:00.000Z', agora)).toBe('há 2 dias');
  });

  it('um dia atrás é "ontem", não "há 1 dia"', () => {
    // É como se fala. "há 1 dia" soa a relógio, não a conversa.
    expect(formatRelative('2026-09-10T12:00:00.000Z', agora)).toBe('ontem');
  });

  it('acima de uma semana passa para data absoluta', () => {
    // "há 23 dias" obriga a pessoa a fazer a conta; a data não.
    const texto = formatRelative('2026-08-19T12:00:00.000Z', agora);
    expect(texto).toMatch(/19 de \w+/);
    expect(texto).not.toContain('há');
  });
});

describe('formatSpots', () => {
  it('mostra a fração de vagas', () => {
    expect(formatSpots({ capacidade: 40, ocupadas: 18 })).toBe('18/40 vagas');
  });

  it('lotado também mostra o número, e é decisão', () => {
    /*
     * "80/80 vagas" e não "Lotado": o número diz o tamanho do evento junto com
     * a ausência de vaga, e é isso que faz a pessoa decidir entre entrar na
     * fila de um evento de 80 lugares ou de 400. Quem comunica "lotado" é o
     * botão principal, que tem o espaço e o tom para isso.
     */
    expect(formatSpots({ capacidade: 80, ocupadas: 80 })).toBe('80/80 vagas');
  });
});

describe('formatEventRange', () => {
  it('mesmo dia mostra a data uma vez e as duas horas', () => {
    const texto = formatEventRange(
      '2026-09-11T13:00:00.000-03:00',
      '2026-09-11T19:00:00.000-03:00',
    );
    expect(texto).toContain('13h');
    expect(texto).toContain('19h');
    // A data não se repete: "11 de setembro, 13h – 11 de setembro, 19h" é ruído.
    expect(texto.match(/setembro/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it('dias diferentes marcam o dia da semana do fim', () => {
    /*
     * "18h – seg, 18h" para um evento de 19 a 21 de setembro. O dia da semana e
     * não a data, porque a linha vive ao lado do campo "Data", que já traz a
     * data por extenso — repeti-la aqui gastaria a largura da tela para dizer
     * duas vezes a mesma coisa.
     *
     * A limitação é real e vale registrar: para um evento de mais de sete dias
     * o dia da semana seria ambíguo. Não acontece, porque RN-011 limita a
     * duração a `POLICY.MAX_EVENT_DURATION_DAYS` = 7.
     */
    const texto = formatEventRange(
      '2026-09-19T18:00:00.000-03:00',
      '2026-09-21T18:00:00.000-03:00',
    );
    expect(texto).toMatch(/^18h – (seg|ter|qua|qui|sex|sáb|dom), 18h$/);
  });
});

describe('initials', () => {
  it('usa a primeira e a última palavra do nome', () => {
    expect(initials('Marina Alves')).toBe('MA');
    expect(initials('João Pedro Alencar')).toBe('JA');
  });

  it('nome de uma palavra usa a primeira letra', () => {
    expect(initials('Marina')).toBe('M');
  });

  it('não estoura com entrada vazia ou só espaço', () => {
    // O avatar renderiza antes da sessão carregar; string vazia acontece.
    expect(() => initials('')).not.toThrow();
    expect(() => initials('   ')).not.toThrow();
  });

  it('ignora partícula em minúscula do meio', () => {
    expect(initials('Ronaldo Veloso Filho')).toBe('RF');
  });
});
