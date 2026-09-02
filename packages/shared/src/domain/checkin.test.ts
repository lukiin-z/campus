import { describe, expect, it } from 'vitest';
import type { Evento, Participacao, Presenca } from '../types';
import { decideCheckIn, numericCheckInCode, ticketCode } from './checkin';

/**
 * CT-022, CT-023 e CT-024 — decisão de check-in (RN-017, RN-018).
 *
 * Este arquivo **não existia** até o CP5, e a ausência custou um defeito: a
 * ordem das sete condições de RN-017 punha a verificação de status antes da de
 * unicidade, então a segunda leitura do mesmo ingresso devolvia
 * `NAO_CONFIRMADA` em vez de `JA_UTILIZADO` — porque o check-in aceito já havia
 * mudado a participação para `PRESENTE`. A mensagem saía certa por acaso; o
 * código de motivo, não. Foi visto na porta simulada, no navegador.
 *
 * Por isso os casos abaixo verificam **a ordem**, não só o resultado: em um
 * cenário com duas condições violadas ao mesmo tempo, qual delas responde é o
 * que decide se o operador da porta chama o próximo ou chama o segurança.
 */

const AGORA = new Date('2026-09-12T14:00:00.000Z');

const EVENTO: Pick<Evento, 'id' | 'inicio' | 'fim' | 'status'> = {
  id: 'evt-013',
  // Começou às 13h e termina às 17h: a janela de RN-017 (4 h antes até 2 h
  // depois) contém `AGORA` com folga nas duas pontas.
  inicio: '2026-09-12T13:00:00.000Z',
  fim: '2026-09-12T17:00:00.000Z',
  status: 'PUBLICADO',
};

const TOKEN = {
  participacaoId: 'par-130',
  eventoId: 'evt-013',
  usuarioId: 'usr-001',
  emitidoEm: '2026-09-12T13:30:00.000Z',
  assinatura: 'ok',
};

const CONFIRMADA: Pick<Participacao, 'id' | 'status'> = {
  id: 'par-130',
  status: 'CONFIRMADA',
};

const PRESENCA: Pick<Presenca, 'checkinEm'> = { checkinEm: '2026-09-12T13:35:00.000Z' };

function decidir(
  sobrescreve: Partial<Parameters<typeof decideCheckIn>[0]> = {},
): ReturnType<typeof decideCheckIn> {
  return decideCheckIn({
    token: TOKEN,
    assinaturaValida: true,
    evento: EVENTO,
    participacao: CONFIRMADA,
    presencaExistente: null,
    operadorTemPermissao: true,
    now: AGORA,
    ...sobrescreve,
  });
}

describe('caminho aceito', () => {
  it('aceita ingresso confirmado, dentro da janela, por operador com permissão', () => {
    const decisao = decidir();
    expect(decisao.aceito).toBe(true);
    expect(decisao.motivo).toBeUndefined();
    expect(decisao.mensagem).toBe('Check-in confirmado.');
  });
});

describe('as sete condições de RN-017, cada uma com seu motivo', () => {
  it('sem permissão do operador', () => {
    const decisao = decidir({ operadorTemPermissao: false });
    expect(decisao.motivo).toBe('SEM_PERMISSAO');
  });

  it('assinatura inválida', () => {
    expect(decidir({ assinaturaValida: false }).motivo).toBe('TOKEN_INVALIDO');
  });

  it('ingresso de outro evento', () => {
    const decisao = decidir({ token: { ...TOKEN, eventoId: 'evt-001' } });
    expect(decisao.motivo).toBe('OUTRO_EVENTO');
    expect(decisao.mensagem).toContain('outro evento');
  });

  it('evento cancelado', () => {
    expect(decidir({ evento: { ...EVENTO, status: 'CANCELADO' } }).motivo).toBe('EVENTO_CANCELADO');
  });

  it('antes da abertura da janela diz a que hora abre', () => {
    const decisao = decidir({ now: new Date('2026-09-12T05:00:00.000Z') });
    expect(decisao.motivo).toBe('AINDA_NAO_ABRIU');
    expect(decisao.mensagem).toMatch(/abre às \d{2}:\d{2}/);
  });

  it('depois do fechamento diz a que hora encerrou', () => {
    const decisao = decidir({ now: new Date('2026-09-13T02:00:00.000Z') });
    expect(decisao.motivo).toBe('JA_ENCERROU');
    expect(decisao.mensagem).toMatch(/encerrou às \d{2}:\d{2}/);
  });

  it('participação inexistente é tratada como ingresso inválido', () => {
    // Não revela que o token era bem formado mas não existe registro: para quem
    // está na porta, as duas coisas são "ingresso inválido".
    expect(decidir({ participacao: null }).motivo).toBe('TOKEN_INVALIDO');
  });

  it('ingresso já utilizado diz a que hora foi usado', () => {
    const decisao = decidir({ presencaExistente: PRESENCA });
    expect(decisao.motivo).toBe('JA_UTILIZADO');
    expect(decisao.mensagem).toMatch(/já utilizado às \d{2}:\d{2}/);
  });
});

describe('ordem das verificações', () => {
  it('unicidade responde ANTES do status — regressão do defeito de RN-018', () => {
    /*
     * O cenário exato que o defeito produzia: check-in aceito muda a
     * participação para `PRESENTE` E cria a presença. Na segunda leitura, as
     * duas condições estão violadas ao mesmo tempo.
     *
     * Antes: `NAO_CONFIRMADA`. Depois: `JA_UTILIZADO`, que é o que RN-018 diz.
     */
    const decisao = decidir({
      participacao: { id: 'par-130', status: 'PRESENTE' },
      presencaExistente: PRESENCA,
    });
    expect(decisao.motivo).toBe('JA_UTILIZADO');
  });

  it('status ainda responde quando não há presença registrada', () => {
    // `PRESENTE` sem linha de presença é estado que o banco do CP6 impede pela
    // relação 1:1, mas a função não pode assumir isso.
    expect(decidir({ participacao: { id: 'par-130', status: 'PRESENTE' } }).motivo).toBe(
      'NAO_CONFIRMADA',
    );
  });

  it('permissão responde antes de tudo, inclusive de token inválido', () => {
    // O operador errado não pode aprender nada sobre o ingresso alheio.
    const decisao = decidir({
      operadorTemPermissao: false,
      assinaturaValida: false,
      participacao: null,
      presencaExistente: PRESENCA,
    });
    expect(decisao.motivo).toBe('SEM_PERMISSAO');
  });

  it('assinatura responde antes da janela: token forjado não ganha "abre às"', () => {
    const decisao = decidir({
      assinaturaValida: false,
      now: new Date('2026-09-12T05:00:00.000Z'),
    });
    expect(decisao.motivo).toBe('TOKEN_INVALIDO');
  });

  it('evento cancelado responde antes da janela', () => {
    const decisao = decidir({
      evento: { ...EVENTO, status: 'CANCELADO' },
      now: new Date('2026-09-12T05:00:00.000Z'),
    });
    expect(decisao.motivo).toBe('EVENTO_CANCELADO');
  });
});

describe('mensagem por status da participação (RN-017, condição 7)', () => {
  const casos: Array<[Participacao['status'], string]> = [
    ['PENDENTE_PAGAMENTO', 'Pagamento pendente'],
    ['LISTA_ESPERA', 'lista de espera'],
    ['OFERTA_PENDENTE', 'ainda não confirmada'],
    ['CANCELADA', 'cancelada'],
    ['EXPIRADA', 'expirou'],
    ['AUSENTE', 'ausente'],
  ];

  for (const [status, trecho] of casos) {
    it(`${status} tem mensagem própria, não erro genérico`, () => {
      const decisao = decidir({ participacao: { id: 'par-130', status } });
      expect(decisao.motivo).toBe('NAO_CONFIRMADA');
      expect(decisao.mensagem.toLowerCase()).toContain(trecho.toLowerCase());
    });
  }
});

describe('códigos de contingência', () => {
  it('o código numérico tem 8 dígitos e é estável', () => {
    const codigo = numericCheckInCode('par-130');
    expect(codigo).toMatch(/^\d{8}$/);
    expect(numericCheckInCode('par-130')).toBe(codigo);
  });

  it('ids diferentes produzem códigos diferentes', () => {
    // Colisão aqui deixaria um ingresso validar outro. Não é prova de ausência
    // de colisão — é a verificação dos ids que o seed realmente usa.
    const ids = Array.from({ length: 200 }, (_, i) => `par-${String(i).padStart(3, '0')}`);
    const codigos = new Set(ids.map(numericCheckInCode));
    expect(codigos.size).toBe(ids.length);
  });

  it('o código impresso combina a sigla da turma com o sufixo do numérico', () => {
    expect(ticketCode('3espx', 'par-130')).toBe(
      `CMP-3ESPX-${numericCheckInCode('par-130').slice(-4)}`,
    );
  });
});
