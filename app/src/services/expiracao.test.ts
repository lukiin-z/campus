import { describe, expect, it } from 'vitest';
import { ApiError, repositories } from './index';
import { assertInvariants, getDb } from '../mocks/db';

/**
 * CT-038 — expiração de prazos pela API (RN-008, RN-012).
 *
 * Este arquivo existe por causa de um defeito de **omissão**: `paymentExpired`,
 * `offerExpired` e `planPromotion` estavam escritas, testadas em unidade e
 * **nunca chamadas por handler nenhum**. A consequência observável era a pior
 * possível para o produto: o cronômetro da cobrança chegava a zero na tela e o
 * pagamento continuava sendo aceito.
 *
 * O teste anda o relógio movendo a data no dado, não esperando — é o que a
 * expiração preguiçosa (aplicada na borda da requisição) torna possível.
 */

const PASSADO = new Date(Date.now() - 5 * 60_000).toISOString();

/** Move o prazo de uma participação para o passado, sem passar pela API. */
function vencerPrazo(participacaoId: string, campo: 'pagamentoExpiraEm' | 'ofertaExpiraEm') {
  const alvo = getDb().participacoes.find((p) => p.id === participacaoId);
  if (!alvo) throw new Error(`participação ${participacaoId} não existe no seed`);
  alvo[campo] = PASSADO;
  return alvo;
}

describe('janela de pagamento (RN-012)', () => {
  it('a vaga expira e a contagem do evento cai', async () => {
    // `par-052`: Marina aguardando pagamento na Festa Junina (R$ 45).
    const participacao = vencerPrazo('par-052', 'pagamentoExpiraEm');
    const eventoId = participacao.eventoId;
    const ocupadasAntes = getDb().eventos.find((e) => e.id === eventoId)?.ocupadas ?? 0;

    // Qualquer requisição aplica os prazos: aqui, uma leitura.
    await repositories.participations.listarMinhas();

    const depois = getDb().participacoes.find((p) => p.id === 'par-052');
    expect(depois?.status).toBe('EXPIRADA');
    expect(depois?.pagamentoExpiraEm).toBeNull();
    expect(getDb().eventos.find((e) => e.id === eventoId)?.ocupadas).toBe(ocupadasAntes - 1);
    expect(() => assertInvariants()).not.toThrow();
  });

  it('depois de expirar, abrir cobrança é recusado — não aceito em silêncio', async () => {
    vencerPrazo('par-052', 'pagamentoExpiraEm');

    /*
     * Este é exatamente o defeito que existia: com a expiração nunca aplicada,
     * a participação continuava `PENDENTE_PAGAMENTO` e este `POST` devolvia
     * `201` com uma cobrança nova, minutos depois do prazo ter acabado.
     */
    try {
      await repositories.payments.iniciar('par-052', { metodo: 'PIX' });
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(409);
        expect(erro.codigo).toBe('NAO_AGUARDA_PAGAMENTO');
      }
    }
  });

  it('o aluno recebe aviso de que o prazo acabou', async () => {
    const participacao = vencerPrazo('par-052', 'pagamentoExpiraEm');
    await repositories.notifications.listar();

    const avisos = getDb().notificacoes.filter(
      (n) => n.destinatarioId === participacao.usuarioId && n.tipo === 'PAGAMENTO_EXPIRADO',
    );
    expect(avisos.length).toBe(1);
    expect(avisos[0]?.lida).toBe(false);
  });

  it('é idempotente: duas requisições não expiram duas vezes', async () => {
    const participacao = vencerPrazo('par-052', 'pagamentoExpiraEm');
    const eventoId = participacao.eventoId;
    const ocupadasAntes = getDb().eventos.find((e) => e.id === eventoId)?.ocupadas ?? 0;

    await repositories.participations.listarMinhas();
    await repositories.participations.listarMinhas();
    await repositories.events.listar();

    // Uma vaga liberada, não três — e um aviso, não três.
    expect(getDb().eventos.find((e) => e.id === eventoId)?.ocupadas).toBe(ocupadasAntes - 1);
    expect(getDb().notificacoes.filter((n) => n.tipo === 'PAGAMENTO_EXPIRADO').length).toBe(1);
  });
});

describe('janela da oferta (RN-008)', () => {
  it('a oferta ignorada expira e a vaga vai para o próximo da fila', async () => {
    /*
     * `par-122`: Marina com oferta em `evt-012` (visita técnica, 25/25).
     * `par-123`: Caio, primeiro da fila. O encadeamento inteiro de RN-007 e
     * RN-008 acontece em uma requisição.
     */
    vencerPrazo('par-122', 'ofertaExpiraEm');
    const ocupadasAntes = getDb().eventos.find((e) => e.id === 'evt-012')?.ocupadas ?? 0;

    await repositories.events.obter('evt-012');

    const expirada = getDb().participacoes.find((p) => p.id === 'par-122');
    const promovida = getDb().participacoes.find((p) => p.id === 'par-123');

    expect(expirada?.status).toBe('EXPIRADA');
    // Oferta ignorada tem motivo próprio: não é a mesma coisa que desistir.
    expect(expirada?.motivoCancelamento).toBe('OFERTA_RECUSADA');

    expect(promovida?.status).toBe('OFERTA_PENDENTE');
    expect(promovida?.posicaoFila).toBeNull();
    expect(new Date(promovida?.ofertaExpiraEm ?? 0).getTime()).toBeGreaterThan(Date.now());

    // A vaga trocou de dono, não desapareceu: a contagem não se move.
    expect(getDb().eventos.find((e) => e.id === 'evt-012')?.ocupadas).toBe(ocupadasAntes);
    expect(() => assertInvariants()).not.toThrow();
  });

  it('o promovido é avisado, e quem perdeu a vaga também', async () => {
    vencerPrazo('par-122', 'ofertaExpiraEm');
    await repositories.events.obter('evt-012');

    const notificacoes = getDb().notificacoes;
    const perdeu = notificacoes.find(
      (n) => n.destinatarioId === 'usr-001' && n.tipo === 'PAGAMENTO_EXPIRADO',
    );
    const ganhou = notificacoes.find(
      (n) => n.destinatarioId === 'usr-004' && n.tipo === 'VAGA_LIBERADA',
    );

    expect(perdeu?.titulo).toContain('oferta');
    expect(ganhou?.titulo).toContain('vaga');
  });

  it('confirmar uma oferta vencida é recusado', async () => {
    vencerPrazo('par-122', 'ofertaExpiraEm');

    try {
      await repositories.participations.confirmarOferta('par-122');
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      // Já não é oferta: virou EXPIRADA antes do handler decidir.
      if (erro instanceof ApiError) expect(erro.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('oferta dentro do prazo continua confirmável', async () => {
    // Guarda contra o oposto do defeito: expirar o que ainda vale.
    const confirmada = await repositories.participations.confirmarOferta('par-122');
    expect(confirmada.status).toBe('CONFIRMADA');
    expect(confirmada.ofertaExpiraEm).toBeNull();
  });
});

describe('nada vencido, nada muda', () => {
  it('o seed intacto atravessa várias requisições sem transição nenhuma', async () => {
    const antes = getDb().participacoes.map((p) => `${p.id}:${p.status}`);
    const ocupadasAntes = getDb().eventos.map((e) => `${e.id}:${e.ocupadas}`);

    await repositories.events.listar();
    await repositories.participations.listarMinhas();
    await repositories.feed.listar();
    await repositories.notifications.listar();

    expect(getDb().participacoes.map((p) => `${p.id}:${p.status}`)).toEqual(antes);
    expect(getDb().eventos.map((e) => `${e.id}:${e.ocupadas}`)).toEqual(ocupadasAntes);
  });
});
