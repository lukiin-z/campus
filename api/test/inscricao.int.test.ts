import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';

/**
 * Inscrição, fila e cancelamento contra o banco — CT-001, CT-003, CT-004,
 * CT-005, CT-015 e CT-018.
 *
 * As decisões (`isFull`, `enrollmentOpen`, `nextWaitlistPosition`,
 * `planPromotion`) já são exercitadas por 243 casos em `packages/shared`. O que
 * só aparece aqui é a PERSISTÊNCIA delas: que `ocupadas` é escrita na mesma
 * transação da participação, que a promoção da fila acontece antes de a resposta
 * do cancelamento voltar, e que as posições restantes são reescritas em vez de
 * ficarem com buraco.
 *
 * O estado inicial é sempre o seed. Quando um caso precisa de outro estado
 * (prazo vencido, evento cancelado), ele move a linha com o Prisma antes de
 * fazer a requisição — é mais rápido e mais preciso do que construir o estado
 * por uma sequência de requisições, e deixa visível no caso QUAL condição está
 * sob teste.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_CAIO = 'caio.ferreira@fiap.com.br';
const EMAIL_RAFAEL = 'rafael.souza@fiap.com.br';
const EMAIL_ELISA = 'elisa.prado@fiap.com.br';

let app: Aplicacao;

beforeAll(async () => {
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

describe('reserva de vaga', () => {
  it('confirma na hora em evento gratuito e incrementa ocupadas na mesma transação', async () => {
    // `evt-003` (roda de conversa) é do curso de Marina, gratuito, 41/60, e ela
    // não está inscrita.
    const marina = await entrar(app, EMAIL_MARINA);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.roda}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(201);

    expect(resposta.body).toMatchObject({
      eventoId: ID.roda,
      usuarioId: ID.marina,
      status: 'CONFIRMADA',
      // Gratuito não abre janela de pagamento.
      pagamentoExpiraEm: null,
    });

    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.roda } });
    expect(evento.ocupadas).toBe(42);
  });

  it('nasce PENDENTE_PAGAMENTO com prazo em evento pago, e a vaga já é ocupada', async () => {
    // `evt-007` (futsal, R$ 15, 96/120) — o mesmo evento do E2E.
    const marina = await entrar(app, EMAIL_MARINA);

    const antes = Date.now();
    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(201);

    const corpo = resposta.body as { status: string; pagamentoExpiraEm: string | null };
    expect(corpo.status).toBe('PENDENTE_PAGAMENTO');
    expect(corpo.pagamentoExpiraEm).not.toBeNull();

    // RN-012 — a janela é de 60 min, truncada pelo prazo de inscrição e pelo
    // início do evento. O futsal é em 26 dias, então vale o teto de 60 min.
    const prazo = new Date(String(corpo.pagamentoExpiraEm)).getTime();
    expect(prazo - antes).toBeGreaterThan(55 * 60_000);
    expect(prazo - antes).toBeLessThanOrEqual(60 * 60_000 + 5_000);

    /*
     * A vaga é consumida ANTES do pagamento (RN-004: `PENDENTE_PAGAMENTO` é um
     * dos três estados que ocupam). É a decisão que faz o cronômetro existir —
     * se não ocupasse, não haveria o que liberar quando o prazo vence.
     */
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.futsal } });
    expect(evento.ocupadas).toBe(97);

    // E a política de reembolso foi CONGELADA no instante da reserva (RN-013),
    // não deixada para a hora do cancelamento.
    const linha = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: (resposta.body as { id: string }).id },
    });
    expect(linha.politicaVigente).not.toBeNull();
  });

  it('recusa segunda inscrição ativa no mesmo evento com 409 JA_INSCRITO', async () => {
    // Marina já está CONFIRMADA no churrasco (par-001).
    const marina = await entrar(app, EMAIL_MARINA);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.churrasco}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(409);

    expect(resposta.body).toMatchObject({ erro: 'JA_INSCRITO' });

    // RN-015 — e nada foi escrito: uma linha ativa, `ocupadas` intacta.
    const ativas = await app.prisma.participacao.count({
      where: { eventoId: ID.churrasco, usuarioId: ID.marina, status: 'CONFIRMADA' },
    });
    expect(ativas).toBe(1);
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.churrasco } });
    expect(evento.ocupadas).toBe(18);
  });

  it('aceita nova inscrição depois de um cancelamento — o índice único é PARCIAL', async () => {
    /*
     * A razão de `ux_participacao_ativa` ser parcial (`WHERE status IN (…)`) e
     * não total. Desistir e voltar é comportamento legítimo; com único total, a
     * segunda inscrição colidiria com a linha cancelada e a pessoa ficaria de
     * fora para sempre. Só um banco de verdade prova isto — em memória, "índice
     * parcial" não tem significado.
     */
    const marina = await entrar(app, EMAIL_MARINA);

    await app
      .http()
      .delete(`/api/participacoes/${ID.parChurrascoMarina}`)
      .set(...comToken(marina.accessToken))
      .expect(200);

    await app
      .http()
      .post(`/api/eventos/${ID.churrasco}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(201);

    const linhas = await app.prisma.participacao.findMany({
      where: { eventoId: ID.churrasco, usuarioId: ID.marina },
    });
    // Duas linhas para o mesmo par (evento, aluno) — uma cancelada, uma ativa.
    expect(linhas).toHaveLength(2);
    expect(linhas.filter((p) => p.status === 'CANCELADA')).toHaveLength(1);
    expect(linhas.filter((p) => p.status === 'PENDENTE_PAGAMENTO')).toHaveLength(1);
  });

  it('recusa inscrição depois do prazo, sem mexer na contagem', async () => {
    const marina = await entrar(app, EMAIL_MARINA);

    // RN-009 — o prazo é movido para 1 h atrás; o `CHECK`
    // `ck_evento_prazo_inscricao` só exige prazo <= início, então o passado passa.
    await app.prisma.evento.update({
      where: { id: ID.futsal },
      data: { prazoInscricao: new Date(Date.now() - 3_600_000) },
    });

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(422);

    expect(resposta.body).toMatchObject({ erro: 'PRAZO_ENCERRADO' });
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.futsal } });
    expect(evento.ocupadas).toBe(96);
  });

  it('recusa inscrição em evento cancelado', async () => {
    const marina = await entrar(app, EMAIL_MARINA);

    await app.prisma.evento.update({
      where: { id: ID.futsal },
      data: {
        status: 'CANCELADO',
        // `ck_evento_cancelado_tem_motivo` recusa a linha sem isto — o banco
        // não deixa cancelar em silêncio (RN-021).
        motivoCancelamento: 'A quadra foi interditada pela manutenção.',
      },
    });

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(422);
    expect(resposta.body).toMatchObject({ erro: 'EVENTO_CANCELADO' });
  });

  it('recusa inscrição em rascunho, mesmo para quem o vê', async () => {
    // Rafael é o organizador do sarau (`evt-011`), então para ele o rascunho é
    // visível — e continua não sendo inscritível.
    const rafael = await entrar(app, EMAIL_RAFAEL);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.rascunho}/participacoes`)
      .set(...comToken(rafael.accessToken))
      .expect(422);
    expect(resposta.body).toMatchObject({ erro: 'EVENTO_NAO_PUBLICADO' });
  });
});

describe('lista de espera', () => {
  it('desvia para a fila com o tamanho dela, em vez de dar erro seco', async () => {
    // `evt-002` (hackathon) está 80/80 com 7 na fila. Caio não está nele.
    const caio = await entrar(app, EMAIL_CAIO);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.hackathon}/participacoes`)
      .set(...comToken(caio.accessToken))
      .expect(409);

    /*
     * RN-006: lotado NÃO é erro, é desvio. `acao` e `totalFila` no corpo são o
     * que permite a tela dizer "você seria o 8º" em vez de "falhou" — e são a
     * razão de o `409` deste projeto carregar contexto.
     */
    expect(resposta.body).toMatchObject({
      erro: 'SEM_VAGA',
      acao: 'LISTA_ESPERA',
      totalFila: 7,
    });

    // E nada foi criado: o desvio é uma resposta, não uma escrita.
    expect(
      await app.prisma.participacao.count({
        where: { eventoId: ID.hackathon, usuarioId: ID.caio },
      }),
    ).toBe(0);
  });

  it('entra na fila no fim dela, sem consumir vaga', async () => {
    const caio = await entrar(app, EMAIL_CAIO);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.hackathon}/lista-espera`)
      .set(...comToken(caio.accessToken))
      .expect(201);

    // CT-003 — FIFO por instante de entrada. Nenhuma prioridade por turma.
    expect(resposta.body).toMatchObject({ status: 'LISTA_ESPERA', posicaoFila: 8 });

    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.hackathon } });
    expect(evento.ocupadas).toBe(80);
    // A posição de quem já estava não mudou.
    const marinaNaFila = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.marina },
    });
    expect(marinaNaFila.posicaoFila).toBe(7);
  });

  it('recusa entrada na fila de evento que ainda tem vaga', async () => {
    const marina = await entrar(app, EMAIL_MARINA);

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/lista-espera`)
      .set(...comToken(marina.accessToken))
      .expect(422);
    // Entrar na fila com vaga livre é sempre engano do cliente: a pessoa
    // perderia a vaga que está aberta agora.
    expect(resposta.body).toMatchObject({ erro: 'AINDA_TEM_VAGA' });
  });
});

describe('cancelamento e promoção', () => {
  it('libera a vaga, oferece ao primeiro da fila e reescreve as posições', async () => {
    const rafael = await entrar(app, EMAIL_RAFAEL);
    const parRafael = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.rafael, status: 'CONFIRMADA' },
    });

    const resposta = await app
      .http()
      .delete(`/api/participacoes/${parRafael.id}`)
      .set(...comToken(rafael.accessToken))
      .expect(200);

    /*
     * CT-004 — a promoção acontece na MESMA transação do cancelamento, e é por
     * isso que o id de quem foi promovido volta na resposta. Se fosse
     * assíncrona, existiria uma janela em que a vaga está livre e ninguém foi
     * avisado — e é nela que alguém entraria por fora da fila.
     */
    expect(resposta.body).toMatchObject({ cancelada: true, promovido: ID.elisa });

    const promovida = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.elisa },
    });
    expect(promovida.status).toBe('OFERTA_PENDENTE');
    expect(promovida.ofertaExpiraEm).not.toBeNull();
    expect(promovida.posicaoFila).toBeNull();

    /*
     * `ocupadas` volta a 80: `OFERTA_PENDENTE` OCUPA vaga. É a assimetria que o
     * desenho da fila exige — a vaga fica reservada para quem recebeu a oferta,
     * senão outra pessoa se inscreveria por fora enquanto ela decide.
     */
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.hackathon } });
    expect(evento.ocupadas).toBe(80);

    // CT-005 — as demais avançam em 1, sem buraco na numeração.
    const fila = await app.prisma.participacao.findMany({
      where: { eventoId: ID.hackathon, status: 'LISTA_ESPERA' },
      orderBy: { posicaoFila: 'asc' },
    });
    expect(fila.map((p) => p.posicaoFila)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('a vaga oferecida não é oferecível a mais ninguém', async () => {
    const rafael = await entrar(app, EMAIL_RAFAEL);
    const parRafael = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.rafael, status: 'CONFIRMADA' },
    });
    await app
      .http()
      .delete(`/api/participacoes/${parRafael.id}`)
      .set(...comToken(rafael.accessToken))
      .expect(200);

    // Caio tenta se inscrever no instante em que "há uma vaga livre".
    const caio = await entrar(app, EMAIL_CAIO);
    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.hackathon}/participacoes`)
      .set(...comToken(caio.accessToken))
      .expect(409);
    expect(resposta.body).toMatchObject({ erro: 'SEM_VAGA' });

    // E só UMA oferta existe.
    expect(
      await app.prisma.participacao.count({
        where: { eventoId: ID.hackathon, status: 'OFERTA_PENDENTE' },
      }),
    ).toBe(1);
  });

  it('confirmar a oferta dentro da janela ocupa a vaga sem disputar nada', async () => {
    const rafael = await entrar(app, EMAIL_RAFAEL);
    const parRafael = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.rafael, status: 'CONFIRMADA' },
    });
    await app
      .http()
      .delete(`/api/participacoes/${parRafael.id}`)
      .set(...comToken(rafael.accessToken))
      .expect(200);

    const elisa = await entrar(app, EMAIL_ELISA);
    const oferta = await app.prisma.participacao.findFirstOrThrow({
      where: { eventoId: ID.hackathon, usuarioId: ID.elisa },
    });

    const resposta = await app
      .http()
      .post(`/api/participacoes/${oferta.id}/confirmar`)
      .set(...comToken(elisa.accessToken))
      .expect(201);

    // O hackathon é gratuito, então confirma direto.
    expect(resposta.body).toMatchObject({ status: 'CONFIRMADA', ofertaExpiraEm: null });
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.hackathon } });
    expect(evento.ocupadas).toBe(80);

    // Confirmar duas vezes é o toque duplo no botão: `409`, não segunda vaga.
    const segunda = await app
      .http()
      .post(`/api/participacoes/${oferta.id}/confirmar`)
      .set(...comToken(elisa.accessToken))
      .expect(409);
    expect(segunda.body).toMatchObject({ erro: 'SEM_OFERTA' });
  });

  it('cancelar participação de outra pessoa é 404, e nada muda', async () => {
    const caio = await entrar(app, EMAIL_CAIO);

    await app
      .http()
      .delete(`/api/participacoes/${ID.parChurrascoMarina}`)
      .set(...comToken(caio.accessToken))
      .expect(404);

    const dela = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: ID.parChurrascoMarina },
    });
    expect(dela.status).toBe('CONFIRMADA');
  });
});
