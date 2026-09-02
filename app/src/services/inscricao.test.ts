import { describe, expect, it } from 'vitest';
import { repositories } from './index';
import { getDb, assertInvariants } from '../mocks/db';

/**
 * Teste de integração através da camada HTTP real do app (MSW + mock em memória).
 *
 * É o único nível em que a serialização de escritas pode ser verificada — e é
 * exatamente a garantia mais cara de errar: CT-020 / RNF-013, "zero casos de
 * participações acima da capacidade sob inscrições concorrentes".
 *
 * Como este teste passa pelos repositórios, ele também prova que a fronteira de
 * RNF-016 funciona: nada aqui conhece o mock além do reset entre casos.
 */

describe('inscrição pela API (CT-002, CT-020)', () => {
  it('CT-002: evento pago com vaga cria participação PENDENTE_PAGAMENTO e consome 1 vaga', async () => {
    // `evt-007` (Torneio de Futsal, R$ 15, 96/120) é de alcance FACULDADE e
    // Marina ainda não está inscrito nele — diferente do churrasco `evt-001`,
    // em que o seed já a coloca como CONFIRMADA.
    const antes = getDb().eventos.find((e) => e.id === 'evt-007');
    expect(antes?.ocupadas).toBe(96);

    const resultado = await repositories.participations.inscrever('evt-007');

    expect(resultado.tipo).toBe('PENDENTE_PAGAMENTO');
    if (resultado.tipo !== 'PENDENTE_PAGAMENTO') throw new Error('esperava pendente');
    // A vaga é reservada com prazo, e a política de reembolso é congelada agora.
    expect(resultado.participacao.pagamentoExpiraEm).toBeTruthy();
    expect(resultado.participacao.politicaVigente).toBeTruthy();

    expect(getDb().eventos.find((e) => e.id === 'evt-007')?.ocupadas).toBe(97);
  });

  it('CT-018: segunda tentativa no mesmo evento é recusada (RN-015)', async () => {
    await repositories.participations.inscrever('evt-007');
    const segunda = await repositories.participations.inscrever('evt-007');

    expect(segunda.tipo).toBe('RECUSADA');
    if (segunda.tipo !== 'RECUSADA') throw new Error('esperava recusa');
    expect(segunda.motivo).toBe('JA_INSCRITO');

    // A vaga não foi consumida duas vezes.
    expect(getDb().eventos.find((e) => e.id === 'evt-007')?.ocupadas).toBe(97);
  });

  it('CT-018: o seed já coloca Marina no churrasco, então reinscrever é recusado', async () => {
    const resultado = await repositories.participations.inscrever('evt-001');
    expect(resultado.tipo).toBe('RECUSADA');
    if (resultado.tipo !== 'RECUSADA') throw new Error('esperava recusa');
    expect(resultado.motivo).toBe('JA_INSCRITO');
    expect(getDb().eventos.find((e) => e.id === 'evt-001')?.ocupadas).toBe(18);
  });

  it('CT-003: evento lotado devolve SEM_VAGA com a ação de lista de espera (RN-006)', async () => {
    // `evt-002` (Hackathon) está 80/80 com 7 na fila, e Marina é a 7ª. Para
    // exercitar a PRIMEIRA entrada na fila, tiramos a participação dela: sem
    // isso a resposta seria JA_INSCRITO (RN-015), que é outro caso de teste.
    const db = getDb();
    db.participacoes = db.participacoes.filter(
      (p) => !(p.eventoId === 'evt-002' && p.usuarioId === 'usr-001'),
    );

    const resultado = await repositories.participations.inscrever('evt-002');

    expect(resultado.tipo).toBe('SEM_VAGA');
    if (resultado.tipo !== 'SEM_VAGA') throw new Error('esperava SEM_VAGA');
    expect(resultado.acao).toBe('LISTA_ESPERA');
    expect(resultado.totalFila).toBe(6);
  });

  it('CT-012: inscrição em evento fora do alcance é recusada no servidor (RNF-012)', async () => {
    // `evt-006` é evento de CURSO de Sistemas de Informação; Marina é de
    // Engenharia de Computação. A recusa acontece no handler, não na tela.
    const resultado = await repositories.participations.inscrever('evt-006');

    expect(resultado.tipo).toBe('RECUSADA');
    if (resultado.tipo !== 'RECUSADA') throw new Error('esperava recusa');
    expect(resultado.motivo).toBe('FORA_DO_ALCANCE');
  });

  it('CT-027: evento cancelado recusa inscrição com o motivo certo (RN-021)', async () => {
    const resultado = await repositories.participations.inscrever('evt-008');

    expect(resultado.tipo).toBe('RECUSADA');
    if (resultado.tipo !== 'RECUSADA') throw new Error('esperava recusa');
    expect(resultado.motivo).toBe('EVENTO_CANCELADO');
  });

  it('CT-012: evento fora do alcance devolve null por ID direto (RN-001, RNF-012)', async () => {
    // Rascunho de outra pessoa: invisível para todos, inclusive por link direto.
    expect(await repositories.events.obter('evt-011')).toBeNull();

    // Evento de CURSO de outro curso: Marina é de Engenharia de Computação,
    // `evt-006` é de Sistemas de Informação.
    expect(await repositories.events.obter('evt-006')).toBeNull();

    // Já `evt-009` — evento de TURMA da 1CCB — Marina ENXERGA, porque tem
    // participação (PRESENTE) nele. É a exceção deliberada de RN-001: perder
    // acesso ao próprio histórico seria pior que a inconsistência.
    expect(await repositories.events.obter('evt-009')).not.toBeNull();
  });

  it('CT-020: 50 inscrições concorrentes na última vaga confirmam EXATAMENTE uma (RNF-013)', async () => {
    // Enche o churrasco até faltar 1 vaga.
    const db = getDb();
    const evento = db.eventos.find((e) => e.id === 'evt-001');
    if (!evento) throw new Error('seed inconsistente');
    evento.ocupadas = evento.capacidade - 1;

    // A concorrência precisa de usuários DIFERENTES: com o mesmo usuário,
    // RN-015 curto-circuitaria antes da verificação de capacidade e o teste não
    // provaria nada sobre RN-004. Como não há login no CP5, o mock aceita
    // `x-usuario-id` — por isso este caso fala com a API direto, em vez de pelo
    // repositório (que, deliberadamente, não sabe personificar ninguém).
    const candidatos = db.usuarios
      .filter((u) => u.cursoId === 'cur-001')
      .filter(
        (u) => !db.participacoes.some((p) => p.eventoId === 'evt-001' && p.usuarioId === u.id),
      )
      .map((u) => u.id);

    expect(candidatos.length).toBeGreaterThan(1);

    // 50 tentativas distribuídas entre os candidatos, todas disparadas juntas.
    const tentativas = Array.from({ length: 50 }, (_, i) =>
      fetch('/api/eventos/evt-001/participacoes', {
        method: 'POST',
        headers: { 'x-usuario-id': candidatos[i % candidatos.length] as string },
      }),
    );
    const respostas = await Promise.all(tentativas);
    const status = respostas.map((r) => r.status);

    // Exatamente uma criação: a última vaga é de uma pessoa só.
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    // As 49 restantes são 409 — sem vaga (RN-006) ou já inscrito (RN-015).
    expect(status.filter((s) => s === 409)).toHaveLength(49);
    // Nenhum erro de servidor: a invariante foi respeitada, não socorrida.
    expect(status.filter((s) => s >= 500)).toHaveLength(0);

    const depois = getDb().eventos.find((e) => e.id === 'evt-001');
    expect(depois?.ocupadas).toBe(depois?.capacidade);
    expect(() => assertInvariants()).not.toThrow();
  });
});

describe('cancelamento e promoção da fila (CT-004, CT-005)', () => {
  it('CT-004: cancelar libera a vaga e promove o primeiro da fila na mesma operação', async () => {
    const db = getDb();
    const hackathon = db.eventos.find((e) => e.id === 'evt-002');
    const confirmada = db.participacoes.find(
      (p) => p.eventoId === 'evt-002' && p.status === 'CONFIRMADA',
    );
    if (!hackathon || !confirmada) throw new Error('seed inconsistente');

    // O cancelamento vem do próprio usuário: trocamos o dono no mock para poder
    // exercitar a promoção sem implementar o painel do organizador (Sprint 3).
    confirmada.usuarioId = 'usr-001';

    const primeiroDaFila = db.participacoes.find(
      (p) => p.eventoId === 'evt-002' && p.status === 'LISTA_ESPERA' && p.posicaoFila === 1,
    );
    expect(primeiroDaFila?.usuarioId).toBe('usr-006');

    const resultado = await repositories.participations.cancelar(confirmada.id);

    expect(resultado.cancelada).toBe(true);
    expect(resultado.promovido).toBe('usr-006');

    const depois = getDb();
    const promovida = depois.participacoes.find((p) => p.id === primeiroDaFila?.id);
    expect(promovida?.status).toBe('OFERTA_PENDENTE');
    expect(promovida?.ofertaExpiraEm).toBeTruthy();
    // A vaga fica reservada para a oferta: a ocupação volta ao mesmo número.
    expect(depois.eventos.find((e) => e.id === 'evt-002')?.ocupadas).toBe(hackathon.capacidade);
  });

  it('CT-005: as posições da fila avançam depois da promoção', async () => {
    const db = getDb();
    const confirmada = db.participacoes.find(
      (p) => p.eventoId === 'evt-002' && p.status === 'CONFIRMADA',
    );
    if (!confirmada) throw new Error('seed inconsistente');
    confirmada.usuarioId = 'usr-001';

    const marinaAntes = db.participacoes.find(
      (p) => p.eventoId === 'evt-002' && p.usuarioId === 'usr-001' && p.status === 'LISTA_ESPERA',
    );
    expect(marinaAntes?.posicaoFila).toBe(7);

    await repositories.participations.cancelar(confirmada.id);

    const marinaDepois = getDb().participacoes.find((p) => p.id === marinaAntes?.id);
    expect(marinaDepois?.posicaoFila).toBe(6);
    expect(() => assertInvariants()).not.toThrow();
  });

  it('a fila não ocupa vaga: entrar na lista de espera não muda o contador (RN-004)', async () => {
    const db = getDb();
    db.participacoes = db.participacoes.filter(
      (p) => !(p.eventoId === 'evt-002' && p.usuarioId === 'usr-001'),
    );
    const antes = db.eventos.find((e) => e.id === 'evt-002')?.ocupadas;

    const participacao = await repositories.participations.entrarNaListaEspera('evt-002');

    expect(participacao.status).toBe('LISTA_ESPERA');
    expect(participacao.posicaoFila).toBe(7);
    expect(getDb().eventos.find((e) => e.id === 'evt-002')?.ocupadas).toBe(antes);
  });
});

describe('listagem por alcance (CT-011)', () => {
  it('a lista devolve apenas eventos visíveis para o usuário autenticado', async () => {
    const eventos = await repositories.events.listar();
    const ids = eventos.map((e) => e.id);

    // Marina é da 3ESPX (Engenharia de Computação).
    expect(ids).toContain('evt-001'); // turma dela
    expect(ids).toContain('evt-003'); // curso dela
    expect(ids).toContain('evt-002'); // faculdade
    // Rascunho de outra pessoa nunca aparece.
    expect(ids).not.toContain('evt-011');
    // Evento de CURSO de outro curso não aparece.
    expect(ids).not.toContain('evt-006');
    // `evt-009` (turma 1CCB) aparece pela exceção de RN-001: Marina tem
    // participação histórica nele.
    expect(ids).toContain('evt-009');
  });

  it('o filtro "minha turma" devolve só os eventos da turma da pessoa', async () => {
    const eventos = await repositories.events.listar({ alcance: 'MINHA_TURMA' });
    expect(eventos.every((e) => e.alcance === 'TURMA' && e.turmaId === 'tur-001')).toBe(true);
    expect(eventos.map((e) => e.id)).toContain('evt-001');
  });

  it('o filtro "gratuitos" exclui os eventos pagos', async () => {
    const eventos = await repositories.events.listar({ preco: 'GRATUITOS' });
    expect(eventos.every((e) => e.preco === 0)).toBe(true);
    expect(eventos.map((e) => e.id)).not.toContain('evt-001');
  });
});
