import { describe, expect, it } from 'vitest';
import { resolvePrimaryAction } from './eventAction';
import type { EventoView, Participacao } from '../types/domain';

/**
 * Ação principal do detalhe do evento.
 *
 * É a implementação do segundo diagrama de atividades: nove estados de botão.
 * Cada ramo do diagrama tem um teste aqui — o ganho é que o aluno nunca toca em
 * um botão para descobrir que não podia.
 */

const AGORA = new Date('2026-09-01T10:00:00.000Z');

function eventoBase(parcial: Partial<EventoView> = {}): EventoView {
  return {
    id: 'evt-001',
    organizadorId: 'usr-002',
    titulo: 'Churrasco de encerramento do semestre',
    descricao: '',
    alcance: 'TURMA',
    turmaId: 'tur-001',
    cursoId: null,
    faculdadeId: null,
    inicio: '2026-09-12T16:00:00.000Z',
    fim: '2026-09-12T22:00:00.000Z',
    local: 'Quadra do Campus 2',
    capacidade: 40,
    ocupadas: 18,
    preco: 25,
    status: 'PUBLICADO',
    motivoCancelamento: null,
    prazoInscricao: '2026-09-12T14:00:00.000Z',
    prazoCancelamento: '2026-09-11T16:00:00.000Z',
    capaSeed: 3,
    criadoEm: '2026-08-20T00:00:00.000Z',
    organizador: { id: 'usr-002', nome: 'Rafael Souza', avatarSeed: 2 },
    alcanceRotulo: '3ESPX',
    vagasDisponiveis: 22,
    taxaOcupacao: 0.45,
    inscricoesAbertas: true,
    totalListaEspera: 0,
    minhaParticipacao: null,
    ...parcial,
  };
}

function participacao(parcial: Partial<Participacao>): Participacao {
  return {
    id: 'par-001',
    eventoId: 'evt-001',
    usuarioId: 'usr-001',
    status: 'CONFIRMADA',
    posicaoFila: null,
    pagamentoExpiraEm: null,
    ofertaExpiraEm: null,
    motivoCancelamento: null,
    canceladaAposPrazo: false,
    politicaVigente: null,
    criadoEm: '2026-08-28T10:00:00.000Z',
    atualizadoEm: '2026-08-28T10:00:00.000Z',
    ...parcial,
  };
}

describe('sem participação, evento aberto', () => {
  it('evento pago mostra o valor no próprio botão', () => {
    const acao = resolvePrimaryAction(eventoBase(), AGORA);
    expect(acao.kind).toBe('INSCREVER_PAGO');
    expect(acao.label).toContain('Quero participar');
    expect(acao.label).toContain('25');
    expect(acao.disabled).toBe(false);
  });

  it('evento gratuito confirma na hora, e o botão diz isso', () => {
    const acao = resolvePrimaryAction(eventoBase({ preco: 0 }), AGORA);
    expect(acao.kind).toBe('INSCREVER');
    expect(acao.label).toBe('Quero participar');
    expect(acao.hint).toContain('Confirmação na hora');
  });

  it('CT-003: lotado vira lista de espera, e mostra o tamanho da fila', () => {
    const acao = resolvePrimaryAction(
      eventoBase({ ocupadas: 40, vagasDisponiveis: 0, totalListaEspera: 7 }),
      AGORA,
    );
    expect(acao.kind).toBe('LISTA_ESPERA');
    expect(acao.label).toBe('Entrar na lista de espera');
    expect(acao.hint).toContain('7');
    expect(acao.disabled).toBe(false);
  });

  it('lotado sem fila avisa que a pessoa seria a primeira', () => {
    const acao = resolvePrimaryAction(
      eventoBase({ ocupadas: 40, vagasDisponiveis: 0, totalListaEspera: 0 }),
      AGORA,
    );
    expect(acao.hint).toContain('primeiro');
  });

  it('CT-015: prazo vencido desabilita o botão e informa a data', () => {
    const depoisDoPrazo = new Date('2026-09-12T15:00:00.000Z');
    const acao = resolvePrimaryAction(eventoBase(), depoisDoPrazo);
    expect(acao.kind).toBe('ENCERRADO');
    expect(acao.disabled).toBe(true);
    expect(acao.label).toBe('Inscrições encerradas');
  });
});

describe('com participação — o botão reflete o estado real', () => {
  it('pendente de pagamento mostra a contagem da janela', () => {
    const acao = resolvePrimaryAction(
      eventoBase({
        minhaParticipacao: participacao({
          status: 'PENDENTE_PAGAMENTO',
          pagamentoExpiraEm: '2026-09-01T10:42:00.000Z',
        }),
      }),
      AGORA,
    );
    expect(acao.kind).toBe('PAGAR');
    expect(acao.hint).toContain('42 min');
  });

  it('confirmada leva ao ingresso', () => {
    const acao = resolvePrimaryAction(
      eventoBase({ minhaParticipacao: participacao({ status: 'CONFIRMADA' }) }),
      AGORA,
    );
    expect(acao.kind).toBe('VER_INGRESSO');
    expect(acao.label).toBe('Ver meu ingresso');
  });

  it('na fila, o botão É a informação: a posição', () => {
    const acao = resolvePrimaryAction(
      eventoBase({
        minhaParticipacao: participacao({ status: 'LISTA_ESPERA', posicaoFila: 7 }),
      }),
      AGORA,
    );
    expect(acao.kind).toBe('VER_FILA');
    expect(acao.label).toBe('Você é o 7º da fila');
    expect(acao.variant).toBe('secondary');
  });

  it('oferta pendente mostra o prazo para confirmar', () => {
    const acao = resolvePrimaryAction(
      eventoBase({
        minhaParticipacao: participacao({
          status: 'OFERTA_PENDENTE',
          ofertaExpiraEm: '2026-09-02T10:00:00.000Z',
        }),
      }),
      AGORA,
    );
    expect(acao.kind).toBe('CONFIRMAR_OFERTA');
    expect(acao.label).toBe('Confirmar vaga');
    expect(acao.hint).toContain('Confirme até');
  });

  it('quem fez check-in pode publicar foto (RN-019)', () => {
    const acao = resolvePrimaryAction(
      eventoBase({ minhaParticipacao: participacao({ status: 'PRESENTE' }) }),
      AGORA,
    );
    expect(acao.kind).toBe('PUBLICAR_FOTO');
  });

  it('participação cancelada volta ao fluxo de inscrição — estado terminal não bloqueia', () => {
    const acao = resolvePrimaryAction(
      eventoBase({ minhaParticipacao: participacao({ status: 'CANCELADA' }) }),
      AGORA,
    );
    expect(acao.kind).toBe('INSCREVER_PAGO');
  });
});

describe('estado do evento tem precedência sobre o da participação', () => {
  it('CT-027: evento cancelado mostra o motivo e desabilita a ação', () => {
    const acao = resolvePrimaryAction(
      eventoBase({
        status: 'CANCELADO',
        motivoCancelamento: 'Chuva prevista para o dia inteiro.',
        minhaParticipacao: participacao({ status: 'CONFIRMADA' }),
      }),
      AGORA,
    );
    expect(acao.kind).toBe('CANCELADO');
    expect(acao.disabled).toBe(true);
    expect(acao.hint).toContain('Chuva prevista');
  });

  it('evento realizado direciona para as fotos, não para inscrição', () => {
    const acao = resolvePrimaryAction(eventoBase({ status: 'REALIZADO' }), AGORA);
    expect(acao.kind).toBe('REALIZADO');
    expect(acao.disabled).toBe(true);
  });
});

describe('todo estado tem rótulo próprio', () => {
  it('nenhuma ação usa o rótulo genérico "Inscrever-se"', () => {
    const cenarios: EventoView[] = [
      eventoBase(),
      eventoBase({ preco: 0 }),
      eventoBase({ ocupadas: 40, vagasDisponiveis: 0 }),
      eventoBase({ status: 'CANCELADO', motivoCancelamento: 'x' }),
      eventoBase({ status: 'REALIZADO' }),
      eventoBase({ minhaParticipacao: participacao({ status: 'CONFIRMADA' }) }),
      eventoBase({ minhaParticipacao: participacao({ status: 'LISTA_ESPERA', posicaoFila: 1 }) }),
      eventoBase({ minhaParticipacao: participacao({ status: 'PRESENTE' }) }),
    ];

    const rotulos = cenarios.map((evento) => resolvePrimaryAction(evento, AGORA).label);
    expect(rotulos).not.toContain('Inscrever-se');
    // Nove estados possíveis, e nenhum rótulo repetido entre os oito cenários.
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });
});
