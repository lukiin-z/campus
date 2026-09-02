import { describe, expect, it } from 'vitest';
import { POLICY } from '@campus/shared';
import { combinarDataHora, eventFormSchema } from './eventSchema';

/**
 * Schema do formulário de criação de evento (RF-010, RN-011).
 *
 * Estava a **0% de cobertura**. Não é um arquivo qualquer: é o único caminho por
 * onde um evento entra no sistema, e o `superRefine` dele decide se a data e o
 * horário digitados formam um evento possível.
 *
 * A distinção que estes casos protegem é a razão de o arquivo existir apesar de
 * `novoEventoSchema` estar em `@campus/shared`: **são fronteiras diferentes**.
 * Aqui a forma é a do formulário (`data`, `horaInicio`, `horaFim`, `gratuito`);
 * lá é a do corpo da requisição (`inicio`, `fim` em ISO, `preco`). O que NÃO se
 * repete é o limite: capacidade e preço vêm de `POLICY`, uma vez.
 */

const AMANHA = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();

function formulario(sobrescreve: Record<string, unknown> = {}) {
  return {
    titulo: 'Churrasco da 3ESPX',
    descricao: 'Rateio de R$ 25, carne e caixa de som por conta do grupo.',
    alcance: 'TURMA' as const,
    data: AMANHA,
    horaInicio: '13:00',
    horaFim: '19:00',
    local: 'Quadra do Campus 2',
    capacidade: 40,
    gratuito: false,
    preco: 25,
    ...sobrescreve,
  };
}

/** Junta as mensagens por campo, que é o que a tela mostra. */
function errosPorCampo(entrada: Record<string, unknown>): Record<string, string[]> {
  const resultado = eventFormSchema.safeParse(entrada);
  if (resultado.success) return {};
  const mapa: Record<string, string[]> = {};
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? '_');
    mapa[campo] = [...(mapa[campo] ?? []), issue.message];
  }
  return mapa;
}

describe('caminho válido', () => {
  it('aceita um evento coerente', () => {
    expect(eventFormSchema.safeParse(formulario()).success).toBe(true);
  });

  it('aceita evento gratuito com preço zero', () => {
    expect(eventFormSchema.safeParse(formulario({ gratuito: true, preco: 0 })).success).toBe(true);
  });

  it('aceita descrição ausente, porque o campo tem valor padrão vazio', () => {
    // Descrição não é obrigatória: o organizador que só tem a data ainda
    // consegue salvar o rascunho.
    const sem = formulario();
    delete (sem as Record<string, unknown>).descricao;
    expect(eventFormSchema.safeParse(sem).success).toBe(true);
  });
});

describe('título e local', () => {
  it('recusa título curto e local curto, cada um com sua mensagem', () => {
    const erros = errosPorCampo(formulario({ titulo: 'oi', local: 'ab' }));
    expect(erros.titulo?.[0]).toContain('3 caracteres');
    expect(erros.local?.[0]).toContain('onde o evento acontece');
  });

  it('apara espaço antes de medir o tamanho', () => {
    // "   " passaria por um `min(3)` sem `trim`.
    expect(errosPorCampo(formulario({ titulo: '     ' })).titulo).toBeDefined();
  });
});

describe('capacidade e preço vêm da política, não de literais', () => {
  it('recusa abaixo do mínimo e acima do máximo da POLICY', () => {
    const abaixo = errosPorCampo(formulario({ capacidade: POLICY.MIN_CAPACITY - 1 }));
    const acima = errosPorCampo(formulario({ capacidade: POLICY.MAX_CAPACITY + 1 }));
    expect(abaixo.capacidade?.[0]).toContain(String(POLICY.MIN_CAPACITY));
    expect(acima.capacidade?.[0]).toContain(String(POLICY.MAX_CAPACITY));
  });

  it('recusa preço acima do teto da POLICY', () => {
    expect(errosPorCampo(formulario({ preco: POLICY.MAX_PRICE + 1 })).preco).toBeDefined();
  });

  it('recusa capacidade fracionária', () => {
    expect(errosPorCampo(formulario({ capacidade: 12.5 })).capacidade?.[0]).toContain('inteiro');
  });

  it('aceita capacidade e preço como texto — o campo do formulário é texto', () => {
    // `z.coerce`: sem ele, um input HTML sempre reprovaria por "esperava number".
    const resultado = eventFormSchema.safeParse(formulario({ capacidade: '40', preco: '25' }));
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.capacidade).toBe(40);
      expect(resultado.data.preco).toBe(25);
    }
  });
});

describe('evento pago tem de ter valor', () => {
  it('recusa "não gratuito" com preço zero', () => {
    // A combinação existe de verdade: a pessoa desmarca "gratuito" e esquece o
    // valor. Sem esta regra, o evento nasceria pago em R$ 0,00.
    const erros = errosPorCampo(formulario({ gratuito: false, preco: 0 }));
    expect(erros.preco?.[0]).toContain('maior que zero');
  });

  it('não reclama de preço zero quando o evento é gratuito', () => {
    expect(errosPorCampo(formulario({ gratuito: true, preco: 0 })).preco).toBeUndefined();
  });
});

describe('horário', () => {
  it('exige o formato HH:MM', () => {
    const erros = errosPorCampo(formulario({ horaInicio: '13h', horaFim: '25:00' }));
    expect(erros.horaInicio?.[0]).toContain('19:30');
    expect(erros.horaFim?.[0]).toContain('22:00');
  });

  it('recusa fim antes do início — a violação vem do domínio', () => {
    // A desigualdade é de `validateDeadlines`, em `@campus/shared`. O schema a
    // CHAMA; se ela mudar, esta mensagem muda com ela.
    const erros = errosPorCampo(formulario({ horaInicio: '19:00', horaFim: '13:00' }));
    expect(Object.keys(erros).length).toBeGreaterThan(0);
  });

  it('recusa data no passado', () => {
    const erros = errosPorCampo(formulario({ data: '2020-01-01' }));
    expect(Object.keys(erros).length).toBeGreaterThan(0);
  });
});

describe('combinarDataHora', () => {
  it('junta data e hora em ISO 8601', () => {
    const iso = combinarDataHora('2026-09-12', '13:00');
    expect(iso).toBeTruthy();
    expect(new Date(iso as string).getHours()).toBe(13);
  });

  it('devolve null para entrada incompleta ou inválida, sem lançar', () => {
    // O `superRefine` depende deste `null` para emitir "Data ou horário
    // inválidos" em vez de estourar durante a digitação.
    for (const [data, hora] of [
      ['', '13:00'],
      ['2026-09-12', ''],
      ['2026-09-12', '13h00'],
      ['2026-09-12', '99:99'],
      ['nao-e-data', '13:00'],
    ]) {
      expect(() => combinarDataHora(data as string, hora as string)).not.toThrow();
      expect(combinarDataHora(data as string, hora as string)).toBeNull();
    }
  });

  it('interpreta a hora no fuso local, não em UTC', () => {
    /*
     * `new Date('2026-09-12T13:00:00')` sem `Z` é hora LOCAL — e é o que se
     * quer: o organizador digita "13:00" pensando no relógio dele. Trocar por
     * UTC deslocaria todo evento em três horas no Brasil.
     */
    const iso = combinarDataHora('2026-09-12', '13:00') as string;
    expect(new Date(iso).getHours()).toBe(13);
  });
});
