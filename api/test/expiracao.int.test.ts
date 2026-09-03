import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';
import { assinarNotificacao } from './suporte/webhook';

/**
 * Expiração de prazos — RN-012, RN-008 e CT-007.
 *
 * ## O defeito que isto protege
 *
 * No CP5, `paymentExpired`, `offerExpired` e `planPromotion` existiam e tinham
 * teste de unidade. **Nenhum handler as chamava.** O cronômetro da cobrança
 * chegava a zero na tela e o pagamento continuava sendo aceito, porque nada
 * nunca mudava a participação para `EXPIRADA`. A regra existia no papel e não
 * acontecia no software — e um teste de unidade sobre a função não teria como
 * apontar isso, porque a função estava certa.
 *
 * O que se verifica aqui é a LIGAÇÃO: que `ExpiracaoInterceptor` roda na borda
 * de toda requisição, que a expiração libera a vaga e promove a fila na mesma
 * transação, e que a cobrança deixa de ser aceitável depois disso.
 *
 * ## O relógio é movido no DADO, não esperado
 *
 * Nenhum caso aqui dorme. A data vence porque a linha é reescrita com uma data
 * no passado, e a requisição seguinte a encontra vencida. É o mesmo método de
 * `app/src/services/expiracao.test.ts`, e é o que permite exercitar uma janela
 * de 60 minutos em 300 ms.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_CAIO = 'caio.ferreira@fiap.com.br';

const UMA_HORA_ATRAS = (): Date => new Date(Date.now() - 3_600_000);

let app: Aplicacao;
let marina: string;

beforeAll(async () => {
  app = await criarAplicacao({
    RATE_LIMIT_TENTATIVAS: '10000',
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

/**
 * Faz uma requisição qualquer, só para o interceptor rodar.
 *
 * `GET /sessao` de propósito: é a rota mais barata e a que não tem efeito
 * nenhum sobre o que está sob teste. Se a expiração dependesse de bater na rota
 * "certa", o comportamento voltaria a depender de sorte.
 */
async function requisicaoQualquer(): Promise<void> {
  await app
    .http()
    .get('/api/sessao')
    .set(...comToken(marina))
    .expect(200);
}

describe('janela de pagamento (RN-012)', () => {
  it('expira a inscrição na requisição seguinte e devolve a vaga ao evento', async () => {
    // Marina tem `par-052` PENDENTE_PAGAMENTO na Festa Junina (287/300).
    const antes = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    expect(antes.ocupadas).toBe(287);

    await app.prisma.participacao.update({
      where: { id: ID.parPagamentoMarina },
      data: { pagamentoExpiraEm: UMA_HORA_ATRAS() },
    });

    await requisicaoQualquer();

    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: ID.parPagamentoMarina },
    });
    expect(participacao.status).toBe('EXPIRADA');
    // Prazo zerado: uma participação encerrada com prazo vivo seria reprocessada
    // a cada requisição.
    expect(participacao.pagamentoExpiraEm).toBeNull();

    // A vaga volta para o evento — `PENDENTE_PAGAMENTO` ocupava (RN-004).
    const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    expect(depois.ocupadas).toBe(286);

    // E a pessoa é avisada: perder a vaga em silêncio é o pior desfecho.
    expect(
      await app.prisma.notificacao.count({
        where: { destinatarioId: ID.marina, tipo: 'PAGAMENTO_EXPIRADO' },
      }),
    ).toBe(1);
  });

  it('recusa abrir cobrança depois de o prazo vencer', async () => {
    await app.prisma.participacao.update({
      where: { id: ID.parPagamentoMarina },
      data: { pagamentoExpiraEm: UMA_HORA_ATRAS() },
    });

    /*
     * A MESMA requisição que tentaria pagar é a que aplica a expiração — o
     * interceptor roda antes do handler. É o desenho que faz a regra valer
     * mesmo se o job agendado estiver morto.
     */
    const resposta = await app
      .http()
      .post(`/api/participacoes/${ID.parPagamentoMarina}/pagamento`)
      .set(...comToken(marina))
      .send({ metodo: 'PIX' })
      .expect(409);

    expect(resposta.body).toMatchObject({ erro: 'NAO_AGUARDA_PAGAMENTO' });
  });

  it('estorna o dinheiro que chega depois de a vaga ter sido liberada', async () => {
    // Inscrição nova no futsal, com cobrança aberta.
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
    const pagamento = await app.prisma.pagamento.findFirstOrThrow({ where: { participacaoId } });

    // O prazo vence e a vaga é liberada.
    await app.prisma.participacao.update({
      where: { id: participacaoId },
      data: { pagamentoExpiraEm: UMA_HORA_ATRAS() },
    });
    await requisicaoQualquer();
    expect(
      (await app.prisma.participacao.findUniqueOrThrow({ where: { id: participacaoId } })).status,
    ).toBe('EXPIRADA');

    // E SÓ ENTÃO o dinheiro é identificado pelo gateway.
    const notificacao = assinarNotificacao({
      transacaoExternaId: pagamento.transacaoExternaId ?? pagamento.id,
      chaveIdempotencia: pagamento.chaveIdempotencia,
      valorPago: 15,
      pago: true,
    });
    const resposta = await app
      .http()
      .post('/api/pagamentos/webhook')
      .set('X-Assinatura', notificacao.assinatura)
      .set('Content-Type', 'application/json')
      .send(notificacao.corpo)
      .expect(200);

    /*
     * `ESTORNAR`, não `CONFIRMAR`. A vaga já pode ser de outra pessoa — confirmar
     * agora produziria duas pessoas na mesma vaga, e é exatamente o que a
     * expiração existe para evitar. Devolver o dinheiro é a única saída
     * coerente, e é RN-014.
     */
    expect(resposta.body).toEqual({ desfecho: 'ESTORNAR' });

    const estornado = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } });
    expect(estornado.status).toBe('ESTORNADO');
    expect(estornado.valorReembolsado?.toNumber()).toBe(15);
    // A participação NÃO volta a valer.
    expect(
      (await app.prisma.participacao.findUniqueOrThrow({ where: { id: participacaoId } })).status,
    ).toBe('EXPIRADA');
  });
});

describe('janela da oferta (RN-008)', () => {
  it('passa a vez ao próximo da fila quando a oferta vence, sem punir quem não respondeu', async () => {
    // `evt-012` (visita técnica) está 25/25: Marina com `OFERTA_PENDENTE`
    // (`par-122`) e Caio na posição 1 da fila (`par-123`).
    const antes = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.visita } });
    expect(antes.ocupadas).toBe(25);

    await app.prisma.participacao.update({
      where: { id: ID.parOfertaMarina },
      data: { ofertaExpiraEm: UMA_HORA_ATRAS() },
    });

    await requisicaoQualquer();

    const dela = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: ID.parOfertaMarina },
    });
    expect(dela.status).toBe('EXPIRADA');
    /*
     * `OFERTA_RECUSADA` e não `ALUNO_DESISTIU`: o organizador precisa
     * distinguir quem desistiu de quem não respondeu. É a mesma informação que
     * decide se vale insistir com a pessoa no evento seguinte.
     */
    expect(dela.motivoCancelamento).toBe('OFERTA_RECUSADA');
    expect(dela.ofertaExpiraEm).toBeNull();

    // A vaga é REOFERECIDA na mesma transação, ao próximo da fila.
    const doCaio = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: ID.parFilaVisitaCaio },
    });
    expect(doCaio.status).toBe('OFERTA_PENDENTE');
    expect(doCaio.ofertaExpiraEm).not.toBeNull();
    expect(doCaio.posicaoFila).toBeNull();

    /*
     * `ocupadas` continua 25: a vaga saiu de uma oferta e entrou em outra, e
     * `OFERTA_PENDENTE` ocupa. Se o número tivesse caído para 24, uma inscrição
     * nova entraria por fora da fila — que é o furo que a reserva da oferta
     * fecha.
     */
    const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.visita } });
    expect(depois.ocupadas).toBe(25);

    // E o novo ofertado é avisado.
    expect(
      await app.prisma.notificacao.count({
        where: { destinatarioId: ID.caio, tipo: 'VAGA_LIBERADA' },
      }),
    ).toBe(1);
  });

  it('recusa confirmar uma oferta cujo prazo já passou', async () => {
    await app.prisma.participacao.update({
      where: { id: ID.parOfertaMarina },
      data: { ofertaExpiraEm: UMA_HORA_ATRAS() },
    });

    const resposta = await app
      .http()
      .post(`/api/participacoes/${ID.parOfertaMarina}/confirmar`)
      .set(...comToken(marina))
      .expect(409);

    /*
     * `SEM_OFERTA`, e não `OFERTA_EXPIRADA`: o interceptor já transformou a
     * participação em `EXPIRADA` antes de o handler rodar, então o handler não
     * vê mais uma oferta. `OFERTA_EXPIRADA` (`422`) é a segunda linha de
     * defesa, para a oferta que vence ENTRE a varredura e a trava — e é por
     * isso que ela continua no código mesmo sem caso que a alcance por HTTP.
     */
    expect(resposta.body).toMatchObject({ erro: 'SEM_OFERTA' });
  });

  it('deixa o promovido confirmar a vaga herdada', async () => {
    await app.prisma.participacao.update({
      where: { id: ID.parOfertaMarina },
      data: { ofertaExpiraEm: UMA_HORA_ATRAS() },
    });
    await requisicaoQualquer();

    const caio = await entrar(app, EMAIL_CAIO);
    const resposta = await app
      .http()
      .post(`/api/participacoes/${ID.parFilaVisitaCaio}/confirmar`)
      .set(...comToken(caio.accessToken))
      .expect(201);

    // A visita técnica é gratuita: confirma direto, sem passar por cobrança.
    expect(resposta.body).toMatchObject({ status: 'CONFIRMADA' });
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.visita } });
    expect(evento.ocupadas).toBe(25);
  });
});

describe('idempotência da varredura', () => {
  it('aplicar duas vezes não muda nada na segunda', async () => {
    await app.prisma.participacao.update({
      where: { id: ID.parPagamentoMarina },
      data: { pagamentoExpiraEm: UMA_HORA_ATRAS() },
    });

    await requisicaoQualquer();
    const primeira = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    const avisos = await app.prisma.notificacao.count({ where: { destinatarioId: ID.marina } });

    /*
     * Três requisições a mais. O interceptor roda em todas, e o atalho de
     * leitura (`existePrazoVencido`, um `COUNT` com índice parcial) tem de
     * devolver "nada vencido" — senão cada requisição abriria uma transação
     * vazia e o custo apareceria no caso de concorrência.
     */
    await requisicaoQualquer();
    await requisicaoQualquer();
    await requisicaoQualquer();

    const segunda = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    expect(segunda.ocupadas).toBe(primeira.ocupadas);
    expect(await app.prisma.notificacao.count({ where: { destinatarioId: ID.marina } })).toBe(
      avisos,
    );
  });
});
