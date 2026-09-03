import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';
import { assinarNotificacao } from './suporte/webhook';

/**
 * Pagamento — CT-010, RN-012, RN-014 e RN-027.
 *
 * ## O que só aqui se prova
 *
 * `planWebhook` já decide certo em 243 casos de unidade. O que ela não pode
 * provar é o que acontece com o BANCO na segunda notificação: "não escreve
 * nada" é uma afirmação sobre linhas, e só se verifica comparando linhas antes e
 * depois. Este arquivo compara — pagamento, participação e notificação — em
 * vez de conferir o rótulo do desfecho e acreditar.
 *
 * ## A assinatura é a autenticação desta rota
 *
 * `POST /pagamentos/webhook` é `@Publico()`: quem chama é o gateway, que não tem
 * conta no Campus. O que distingue o gateway de uma requisição forjada é o HMAC
 * sobre o corpo bruto. Um teste que mandasse a notificação sem assinatura e
 * esperasse sucesso estaria testando um sistema em que qualquer pessoa confirma
 * a própria inscrição sem pagar.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';

let app: Aplicacao;
let marina: string;

beforeAll(async () => {
  app = await criarAplicacao({
    RATE_LIMIT_TENTATIVAS: '10000',
    // `POST /pagamentos/:id/simular` é o gatilho do gateway fake e nasce
    // desligado (padrão `false` em `config/ambiente.ts`). Ligar aqui é o que
    // permite exercitar `DUPLICAR`, que é o único jeito de DEMONSTRAR a
    // idempotência de RN-014. O `404` com a flag desligada tem arquivo próprio:
    // `test/simulacao-desligada.int.test.ts`.
    PERMITIR_SIMULACAO_PAGAMENTO: 'true',
  });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
  marina = (await entrar(app, EMAIL_MARINA)).accessToken;
});

/** Inscreve Marina no futsal (R$ 15) e abre a cobrança em Pix. */
async function cobrancaAberta(): Promise<{
  participacaoId: string;
  pagamentoId: string;
  chave: string;
  transacao: string;
}> {
  const inscricao = await app
    .http()
    .post(`/api/eventos/${ID.futsal}/participacoes`)
    .set(...comToken(marina))
    .expect(201);
  const participacaoId = (inscricao.body as { id: string }).id;

  await app
    .http()
    .post(`/api/participacoes/${participacaoId}/pagamento`)
    .set(...comToken(marina))
    .send({ metodo: 'PIX' })
    .expect(201);

  /*
   * A chave de idempotência é lida do BANCO, e não da resposta. Ela não está no
   * contrato de `PagamentoView` de propósito: é um identificador interno da
   * tentativa, e expô-lo permitiria a um cliente forjar a chave de uma
   * notificação. Que o teste tenha de ir ao banco buscá-la é a confirmação de
   * que ela não vaza.
   */
  const pagamento = await app.prisma.pagamento.findFirstOrThrow({ where: { participacaoId } });
  return {
    participacaoId,
    pagamentoId: pagamento.id,
    chave: pagamento.chaveIdempotencia,
    transacao: pagamento.transacaoExternaId ?? pagamento.id,
  };
}

describe('abertura de cobrança', () => {
  it('abre uma cobrança Pix e reconta a janela de RN-012', async () => {
    const inscricao = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/participacoes`)
      .set(...comToken(marina))
      .expect(201);
    const participacaoId = (inscricao.body as { id: string }).id;

    const resposta = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/pagamento`)
      .set(...comToken(marina))
      .send({ metodo: 'PIX' })
      .expect(201);

    const corpo = resposta.body as {
      status: string;
      metodo: string;
      valor: number;
      pix?: { brCode: string } | null;
    };
    expect(corpo.status).toBe('AGUARDANDO');
    expect(corpo.metodo).toBe('PIX');
    expect(corpo.valor).toBe(15);
    // O copia-e-cola é o que a tela mostra; a validade estrutural dele é
    // CT-034, unitário em `packages/shared`.
    expect(corpo.pix?.brCode.length ?? 0).toBeGreaterThan(20);
  });

  it('chamar duas vezes com o mesmo método devolve a MESMA cobrança', async () => {
    const { participacaoId, pagamentoId } = await cobrancaAberta();

    const segunda = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/pagamento`)
      .set(...comToken(marina))
      .send({ metodo: 'PIX' })
      .expect(201);

    /*
     * RN-027 — `ux_pagamento_aguardando_por_participacao` permite no máximo uma
     * cobrança `AGUARDANDO` por participação. Sem a idempotência aqui, o duplo
     * toque no botão "pagar" geraria dois Pix para a mesma vaga, o aluno pagaria
     * um deles e a outra cobrança ficaria aberta — e o índice do banco recusaria
     * a segunda com `409`, o que é a defesa certa dando a resposta errada.
     */
    expect((segunda.body as { id: string }).id).toBe(pagamentoId);
    expect(await app.prisma.pagamento.count({ where: { participacaoId } })).toBe(1);
  });

  it('recusa abrir cobrança de participação de outra pessoa com 403', async () => {
    const beatriz = await entrar(app, 'beatriz.nakamura@fiap.com.br');
    const { participacaoId } = await cobrancaAberta();

    /*
     * `403` aqui, e `404` em `GET /participacoes/:id`. A diferença é
     * deliberada e está no contrato: nas rotas de pagamento a existência da
     * cobrança já é pressuposta por quem tem o id, e o que se nega é a
     * competência.
     */
    const resposta = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/pagamento`)
      .set(...comToken(beatriz.accessToken))
      .send({ metodo: 'PIX' })
      .expect(403);
    expect(resposta.body).toMatchObject({ erro: 'SEM_PERMISSAO' });
  });

  it('recusa cobrança de inscrição que não aguarda pagamento', async () => {
    // Marina no churrasco já está CONFIRMADA e paga (par-001).
    const resposta = await app
      .http()
      .post(`/api/participacoes/${ID.parChurrascoMarina}/pagamento`)
      .set(...comToken(marina))
      .send({ metodo: 'PIX' })
      .expect(409);
    expect(resposta.body).toMatchObject({ erro: 'NAO_AGUARDA_PAGAMENTO' });
  });
});

describe('webhook do gateway (RN-014)', () => {
  it('confirma na primeira notificação e NÃO escreve nada na segunda', async () => {
    const { participacaoId, pagamentoId, chave, transacao } = await cobrancaAberta();

    const notificacao = assinarNotificacao({
      transacaoExternaId: transacao,
      chaveIdempotencia: chave,
      valorPago: 15,
      pago: true,
    });

    const primeira = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(notificacao.corpo)
      .expect(200);
    expect(primeira.body).toEqual({ desfecho: 'CONFIRMAR' });

    const pagoAgora = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    const confirmadaAgora = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    /*
     * Filtrado por `referenciaId`, e não só por tipo: o seed já traz uma
     * notificação de pagamento confirmado para Marina (a do churrasco). Contar
     * por tipo mediria o seed junto e o caso passaria com o número errado.
     */
    const avisos = await app.prisma.notificacao.count({
      where: {
        destinatarioId: ID.marina,
        tipo: 'PAGAMENTO_CONFIRMADO',
        referenciaId: participacaoId,
      },
    });

    expect(pagoAgora.status).toBe('CONFIRMADO');
    expect(pagoAgora.confirmadoEm).not.toBeNull();
    expect(confirmadaAgora.status).toBe('CONFIRMADA');
    // O cronômetro é zerado junto: uma vaga confirmada com prazo vivo expiraria
    // dez minutos depois. Foi um defeito real do CP5.
    expect(confirmadaAgora.pagamentoExpiraEm).toBeNull();
    expect(avisos).toBe(1);

    /*
     * A MESMA notificação, byte por byte — é o que um gateway faz quando não
     * recebe o `200` (ou o recebe e reenvia por garantia). Idempotência aqui é
     * resposta de SUCESSO SEM EFEITO, não recusa: recusar faria o gateway
     * reenviar indefinidamente.
     */
    const segunda = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(notificacao.corpo)
      .expect(200);
    expect(segunda.body).toEqual({ desfecho: 'IGNORAR_DUPLICADA' });

    const pagoDepois = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    const confirmadaDepois = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });

    /*
     * "Não escreve nada" comparado LINHA A LINHA, e não pelo rótulo do
     * desfecho. `confirmadoEm` é o campo que denunciaria uma segunda escrita —
     * ele mudaria de instante mesmo que status e participação ficassem iguais.
     * `atualizadoEm` denunciaria qualquer `update` no-op.
     */
    expect(pagoDepois).toEqual(pagoAgora);
    expect(confirmadaDepois).toEqual(confirmadaAgora);
    expect(
      await app.prisma.notificacao.count({
        where: {
          destinatarioId: ID.marina,
          tipo: 'PAGAMENTO_CONFIRMADO',
          referenciaId: participacaoId,
        },
      }),
    ).toBe(1);
  });

  it('recusa notificação sem assinatura válida e não escreve nada', async () => {
    const { participacaoId, pagamentoId, chave, transacao } = await cobrancaAberta();
    const antes = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });

    const notificacao = assinarNotificacao({
      transacaoExternaId: transacao,
      chaveIdempotencia: chave,
      valorPago: 15,
      pago: true,
    });

    /*
     * A terceira é a que importa: MESMO TAMANHO da assinatura real, um dígito
     * diferente. É o caso que exercita `timingSafeEqual` — as outras duas param
     * na verificação de comprimento, antes da comparação.
     *
     * A primeira versão desta linha era `assinatura.replace(/.$/, '0')`, e ela
     * falhava em 1 de cada 16 execuções: quando o último dígito hex do HMAC já
     * era `0`, a "assinatura adulterada" era a assinatura VÁLIDA e a resposta
     * era `200`. Um teste que reprova uma vez em dezesseis é pior do que não
     * existir — ninguém acredita nele na décima sétima.
     */
    const ultimoDigito = notificacao.assinatura.slice(-1);
    const adulterada = notificacao.assinatura.slice(0, -1) + (ultimoDigito === '0' ? '1' : '0');

    for (const assinatura of ['', 'nao-e-um-hmac', adulterada]) {
      const resposta = await app
        .http()
        .post('/api/pagamentos/webhook')
        .set('X-Assinatura', assinatura)
        .set('Content-Type', 'application/json')
        .send(notificacao.corpo)
        .expect(401);
      expect(resposta.body).toMatchObject({ erro: 'ASSINATURA_INVALIDA' });
    }

    // Nada mudou em nenhuma das três tentativas.
    expect(await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } })).toEqual(
      antes,
    );
    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    expect(participacao.status).toBe('PENDENTE_PAGAMENTO');
  });

  it('recusa notificação cujo corpo foi trocado depois de assinado', async () => {
    const { chave, transacao } = await cobrancaAberta();

    const original = assinarNotificacao({
      transacaoExternaId: transacao,
      chaveIdempotencia: chave,
      valorPago: 15,
      pago: true,
    });
    // Mesma assinatura, corpo adulterado para "pagou R$ 0,01".
    const adulterado = JSON.stringify({
      transacaoExternaId: transacao,
      chaveIdempotencia: chave,
      valorPago: 0.01,
      pago: true,
    });

    const resposta = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', original.assinatura)
      .set('Content-Type', 'application/json')
      .send(adulterado)
      .expect(401);
    expect(resposta.body).toMatchObject({ erro: 'ASSINATURA_INVALIDA' });
  });

  it('aceita e ignora notificação de chave desconhecida', async () => {
    const notificacao = assinarNotificacao({
      transacaoExternaId: 'tx-de-outro-ambiente',
      chaveIdempotencia: 'chave-que-nunca-emitimos',
      valorPago: 15,
      pago: true,
    });

    /*
     * Assinatura válida, chave que não é nossa: acontece quando dois ambientes
     * apontam para a mesma URL de notificação. `200 DESCONHECIDO` — o gateway
     * para de reenviar, e nada é escrito. Responder erro faria a fila do
     * provedor crescer para sempre.
     */
    const resposta = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(notificacao.corpo)
      .expect(200);
    expect(resposta.body).toEqual({ desfecho: 'DESCONHECIDO' });
  });

  it('nunca confirma com valor divergente: marca EM_ANALISE', async () => {
    const { participacaoId, pagamentoId, chave, transacao } = await cobrancaAberta();

    const notificacao = assinarNotificacao({
      transacaoExternaId: transacao,
      chaveIdempotencia: chave,
      // A cobrança é de R$ 15.
      valorPago: 1,
      pago: true,
    });

    const resposta = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(notificacao.corpo)
      .expect(200);
    expect(resposta.body).toEqual({ desfecho: 'DIVERGENCIA_DE_VALOR' });

    /*
     * `EM_ANALISE`, e não `AGUARDANDO`: o dinheiro chegou, com o valor errado.
     * Deixar `AGUARDANDO` — como o mock do CP5 fazia — é dinheiro em trânsito
     * sem ninguém olhando. E a participação NÃO é confirmada: é a linha que
     * separa "houve um problema" de "entrou de graça".
     */
    const pagamento = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    expect(pagamento.status).toBe('EM_ANALISE');
    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    expect(participacao.status).toBe('PENDENTE_PAGAMENTO');
  });

  it('recusa corpo que não tem a forma do contrato', async () => {
    const notificacao = assinarNotificacao({
      transacaoExternaId: 'tx-1234',
      chaveIdempotencia: 'chave-1234',
      valorPago: 15,
      pago: true,
    });
    // Assinatura calculada sobre outro corpo — mas o pipe de validação roda
    // ANTES da verificação, então o erro que sai é o de forma.
    const semCampos = JSON.stringify({ pago: true });

    const resposta = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(semCampos)
      .expect(422);
    expect((resposta.body as { erro: string }).erro).toBe('CORPO_INVALIDO');
  });
});

describe('simulação do gateway (ADR-0006)', () => {
  it('DUPLICAR aplica o mesmo desfecho duas vezes e a segunda não tem efeito', async () => {
    const { participacaoId, pagamentoId } = await cobrancaAberta();

    const resposta = await app
      .http()
      .post(`/api/pagamentos/${pagamentoId}/simular`)
      .set(...comToken(marina))
      .send({ desfecho: 'DUPLICAR' })
      .expect(201);

    // É o único jeito de DEMONSTRAR a idempotência: quando tudo dá certo na
    // primeira tentativa, ela é invisível.
    expect((resposta.body as { desfecho: string }).desfecho).toBe('IGNORAR_DUPLICADA');

    const pagamento = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    expect(pagamento.status).toBe('CONFIRMADO');
    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    expect(participacao.status).toBe('CONFIRMADA');
    // Uma confirmação, um aviso.
    expect(
      await app.prisma.notificacao.count({
        where: {
          destinatarioId: ID.marina,
          tipo: 'PAGAMENTO_CONFIRMADO',
          referenciaId: participacaoId,
        },
      }),
    ).toBe(1);
  });

  it('RECUSAR deixa a inscrição pendente, com a vaga ainda reservada', async () => {
    const { participacaoId, pagamentoId } = await cobrancaAberta();

    await app
      .http()
      .post(`/api/pagamentos/${pagamentoId}/simular`)
      .set(...comToken(marina))
      .send({ desfecho: 'RECUSAR' })
      .expect(201);

    const pagamento = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    expect(pagamento.status).toBe('RECUSADO');
    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    // A vaga continua da pessoa até o prazo vencer — tentar de novo é o caminho
    // esperado, e perder a vaga por um cartão recusado seria punição indevida.
    expect(participacao.status).toBe('PENDENTE_PAGAMENTO');
  });
});

describe('reembolso (RN-013)', () => {
  it('devolve pela política congelada quando o aluno cancela um evento pago', async () => {
    const { participacaoId, pagamentoId } = await cobrancaAberta();
    await app
      .http()
      .post(`/api/pagamentos/${pagamentoId}/simular`)
      .set(...comToken(marina))
      .send({ desfecho: 'CONFIRMAR' })
      .expect(201);

    const resposta = await app
      .http()
      .delete(`/api/participacoes/${participacaoId}`)
      .set(...comToken(marina))
      .expect(200);

    /*
     * O futsal é em 26 dias, então a faixa é a de 100% (acima de 7 dias). O
     * valor sai da política que foi GRAVADA na participação no instante da
     * reserva, não da política vigente hoje — é o que impede uma mudança de
     * política de alterar retroativamente o direito de quem já pagou.
     */
    const corpo = resposta.body as {
      reembolso: { taxa: number; valor: number; faixa: string } | null;
    };
    expect(corpo.reembolso).toMatchObject({ taxa: 1, valor: 15, faixa: 'INTEGRAL' });

    const pagamento = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
    expect(pagamento.status).toBe('REEMBOLSADO');
    expect(pagamento.valorReembolsado?.toNumber()).toBe(15);
  });

  it('recusa reembolso de quem continua com a vaga', async () => {
    const { participacaoId, pagamentoId } = await cobrancaAberta();
    await app
      .http()
      .post(`/api/pagamentos/${pagamentoId}/simular`)
      .set(...comToken(marina))
      .send({ desfecho: 'CONFIRMAR' })
      .expect(201);

    const resposta = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/reembolso`)
      .set(...comToken(marina))
      .expect(422);
    // Devolver o dinheiro de quem continua inscrito deixaria a pessoa no evento
    // de graça.
    expect(resposta.body).toMatchObject({ erro: 'PARTICIPACAO_ATIVA' });
  });
});
