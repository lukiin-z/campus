import { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Conflito, RegraViolada, type ErroDeNegocio } from '../src/comum/erros';
import { traduzirErroDoPrisma } from '../src/comum/prisma-erros';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';

/**
 * A última defesa do banco chegando como erro de NEGÓCIO.
 *
 * ## O que este arquivo NÃO é
 *
 * Não é a prova de que as restrições funcionam: isso é
 * `api/prisma/verificar-restricoes.sql`, que exercita 22 delas recusando dado
 * impossível. Duplicar aqui mediria o PostgreSQL duas vezes.
 *
 * O que se verifica é a TRADUÇÃO — que o erro que o PostgreSQL produz **de
 * verdade** casa com o nome que `comum/prisma-erros.ts` procura, e vira
 * `409 JA_INSCRITO` em vez de `500`/`409 CONFLITO`. É acoplamento a nome de
 * restrição, declarado como tal no cabeçalho daquele arquivo, e um teste com
 * erro FABRICADO não o verifica: ele confirmaria que a tabela de tradução tem a
 * chave que o próprio teste inventou. Só o erro vindo do banco fecha o
 * circuito.
 *
 * ## O cliente de controle, e por que ele é indispensável
 *
 * Os casos abaixo usam um `PrismaClient` próprio com `errorFormat: 'minimal'`,
 * e **não** o `PrismaService` da aplicação. A razão foi descoberta com um teste
 * que passou pelo motivo errado.
 *
 * No formato padrão, a mensagem de erro do Prisma embute um TRECHO DO
 * CÓDIGO-FONTE em volta da chamada que falhou. `traduzirErroDoPrisma` procura
 * `ux_*`/`ck_*` no texto do erro — então, quando o nome da restrição aparecia
 * num comentário do próprio teste, ele entrava na mensagem pelo trecho de
 * código e a tradução "acertava" lendo o teste em vez do banco. O caso
 * `ux_participacao_ativa` passou assim na primeira execução.
 *
 * `errorFormat: 'minimal'` remove o trecho de fonte. Sobra o que o banco disse —
 * que é exatamente a informação que a API tem em produção.
 *
 * ## Por que nenhum caso de restrição é uma requisição HTTP
 *
 * Porque quase nenhuma requisição as alcança: cada handler verifica antes de
 * escrever, e as travas de linha serializam as concorrentes. Esse é o desenho —
 * as restrições são a rede embaixo do trapézio, e a rede não deve ser tocada. O
 * que precisa ser garantido é que, SE ela for tocada, o cliente receba a
 * resposta que sabe tratar. A exceção é o cadastro simultâneo, que alcança o
 * único de verdade por HTTP — e está aqui.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_RAFAEL = 'rafael.souza@fiap.com.br';

let app: Aplicacao;
let controle: PrismaClient;

beforeAll(async () => {
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
  // Lê a mesma `DATABASE_URL` que a API leu no boot.
  controle = new PrismaClient({ errorFormat: 'minimal' });
  await controle.$connect();
});

afterAll(async () => {
  await controle.$disconnect();
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

/** Roda a escrita no cliente de controle e devolve o erro de negócio traduzido. */
async function traduzir(escrita: (cliente: PrismaClient) => Promise<unknown>): Promise<{
  erro: ErroDeNegocio | null;
  bruto: string;
}> {
  try {
    await escrita(controle);
  } catch (falha) {
    return {
      erro: traduzirErroDoPrisma(falha),
      bruto: falha instanceof Error ? falha.message : String(falha),
    };
  }
  throw new Error('a escrita foi aceita: a restrição não existe ou não foi alcançada');
}

describe('CHECK — o nome vem na mensagem do PostgreSQL, e a tradução funciona', () => {
  it('ocupadas acima da capacidade vira 409 SEM_VAGA com ação de fila', async () => {
    const evento = await controle.evento.findUniqueOrThrow({ where: { id: ID.futsal } });

    const { erro } = await traduzir((cliente) =>
      cliente.evento.update({
        where: { id: ID.futsal },
        data: { ocupadas: evento.capacidade + 1 },
      }),
    );

    /*
     * A tradução mais importante do projeto. Se duas requisições concorrentes
     * furarem o `SELECT ... FOR UPDATE`, é este `CHECK` que impede o
     * overbooking — e é esta tradução que faz a recusa chegar como
     * `409 SEM_VAGA` com `acao: LISTA_ESPERA`, e não como `500`. Mesmo no
     * caminho de exceção, o cliente recebe a resposta que sabe tratar.
     */
    expect(erro).toBeInstanceOf(Conflito);
    expect(erro?.getStatus()).toBe(409);
    expect(erro?.corpo()).toMatchObject({ erro: 'SEM_VAGA', acao: 'LISTA_ESPERA' });
  });

  it('cancelamento sem motivo vira 422 MOTIVO_OBRIGATORIO', async () => {
    const { erro } = await traduzir((cliente) =>
      cliente.evento.update({
        where: { id: ID.futsal },
        data: { status: 'CANCELADO', motivoCancelamento: null },
      }),
    );

    // RN-021 — cancelar sem motivo deixa o inscrito sem saber o que houve, e o
    // banco não deixa nem por escrita direta.
    expect(erro).toBeInstanceOf(RegraViolada);
    expect(erro?.corpo()).toMatchObject({ erro: 'MOTIVO_OBRIGATORIO' });
  });

  it('fila sem posição vira 422 FILA_INCOERENTE', async () => {
    const { erro } = await traduzir((cliente) =>
      cliente.participacao.update({
        where: { id: ID.parFilaVisitaCaio },
        data: { posicaoFila: null },
      }),
    );

    expect(erro?.corpo()).toMatchObject({ erro: 'FILA_INCOERENTE' });
  });

  it('Pix com resumo de cartão vira 422 PIX_SEM_CARTAO', async () => {
    const existente = await controle.pagamento.findFirstOrThrow();

    const { erro } = await traduzir((cliente) =>
      cliente.pagamento.update({
        where: { id: existente.id },
        // RNF-022 pela porta do banco: Pix não leva resumo de cartão.
        data: { metodo: 'PIX', ultimosQuatro: '4242', bandeiraCartao: 'VISA' },
      }),
    );

    expect(erro?.corpo()).toMatchObject({ erro: 'PIX_SEM_CARTAO' });
  });
});

describe('UNIQUE — DEFEITO ABERTO: a tradução por nome nunca é alcançada', () => {
  /*
   * ⚠️ OS QUATRO CASOS DESTE BLOCO ESTÃO VERMELHOS DE PROPÓSITO.
   *
   * O achado: para violação de único, o Prisma **não informa o nome da
   * restrição**. `P2002` chega com `meta.target` contendo NOMES DE COLUNA, e a
   * mensagem diz "Unique constraint failed on the fields: (`email`)". Vale para
   * os únicos declarados no `schema.prisma` E para os índices parciais escritos
   * à mão na migration — verificado nos quatro casos abaixo, com
   * `errorFormat: 'minimal'` para eliminar o trecho de fonte.
   *
   * Consequência: as nove entradas de único em `POR_RESTRICAO`
   * (`ux_participacao_ativa`, `ux_pagamento_aguardando_por_participacao`,
   * `usuario_email_key`, `presenca_participacao_id_key`,
   * `pagamento_chave_idempotencia_key`, `turma_codigo_convite_key`,
   * `sessao_refresh_hash_key`, `resposta_pergunta_*_key`,
   * `pergunta_customizada_evento_id_ordem_key`) são **código morto**. Toda
   * violação de único cai em `POR_CODIGO.P2002` e sai como
   * `409 CONFLITO / "Esse registro já existe."`.
   *
   * O status continua `409`, então nada explode — o que se perde é o CÓDIGO, que
   * é o que o cliente usa para escolher a tela (o contrato diz explicitamente
   * que cliente não compara `mensagem`). E `SEM_VAGA` perde o `acao:
   * LISTA_ESPERA`, que é a saída que a tela oferece.
   *
   * O `CHECK` não tem esse problema: o PostgreSQL põe o nome na própria
   * mensagem (`violates check constraint "ck_..."`), e o bloco acima passa.
   *
   * ONDE CORRIGIR: `api/src/comum/prisma-erros.ts`. O caminho é acrescentar,
   * para `P2002`, uma tabela por (modelo, conjunto de colunas) — que é a única
   * informação que o Prisma entrega —, mantendo a busca por nome para os
   * `CHECK`. Ex.: `Participacao` + `['evento_id','usuario_id']` → `JA_INSCRITO`;
   * `Pagamento` + `['participacao_id']` → `COBRANCA_JA_ABERTA`; `Usuario` +
   * `['email']` → `EMAIL_JA_CADASTRADO`.
   */

  it('participação ativa duplicada deveria virar 409 JA_INSCRITO', async () => {
    // Marina já tem uma participação CONFIRMADA no churrasco.
    const { erro, bruto } = await traduzir((cliente) =>
      cliente.participacao.create({
        data: { eventoId: ID.churrasco, usuarioId: ID.marina, status: 'CONFIRMADA' },
      }),
    );

    // O que o banco entrega — parte da evidência do defeito.
    expect(bruto).toContain('Unique constraint failed on the fields');
    expect(erro?.getStatus()).toBe(409);
    expect(erro?.corpo()).toMatchObject({ erro: 'JA_INSCRITO' });
  });

  it('segunda cobrança aguardando deveria virar 409 COBRANCA_JA_ABERTA', async () => {
    const marina = await entrar(app, EMAIL_MARINA);
    const inscricao = await app
      .http()
      .post(`/api/eventos/${ID.futsal}/participacoes`)
      .set(...comToken(marina.accessToken))
      .expect(201);
    const participacaoId = (inscricao.body as { id: string }).id;
    await app
      .http()
      .post(`/api/participacoes/${participacaoId}/pagamento`)
      .set(...comToken(marina.accessToken))
      .send({ metodo: 'PIX' })
      .expect(201);

    // RN-027 — segunda cobrança AGUARDANDO para a mesma participação.
    const { erro } = await traduzir((cliente) =>
      cliente.pagamento.create({
        data: {
          participacaoId,
          metodo: 'PIX',
          valor: new Prisma.Decimal(15),
          status: 'AGUARDANDO',
          chaveIdempotencia: 'chave-propria-da-segunda-tentativa',
        },
      }),
    );

    expect(erro?.corpo()).toMatchObject({ erro: 'COBRANCA_JA_ABERTA' });
  });

  it('notificação com chave repetida deveria virar 409 NOTIFICACAO_DUPLICADA', async () => {
    const existente = await controle.pagamento.findFirstOrThrow();

    const { erro } = await traduzir((cliente) =>
      cliente.pagamento.create({
        data: {
          participacaoId: existente.participacaoId,
          metodo: 'PIX',
          valor: new Prisma.Decimal(10),
          status: 'CONFIRMADO',
          // A MESMA chave de outra cobrança — é o que distingue reenvio de
          // cobrança nova (RN-014).
          chaveIdempotencia: existente.chaveIdempotencia,
        },
      }),
    );

    expect(erro?.corpo()).toMatchObject({ erro: 'NOTIFICACAO_DUPLICADA' });
  });

  it('cadastro simultâneo com o mesmo e-mail deveria responder 409 EMAIL_JA_CADASTRADO', async () => {
    /*
     * O único caso do bloco que é uma requisição HTTP de verdade, e o mais
     * grave por isso. `AuthService.cadastrar` conta antes de inserir, então o
     * caminho comum não alcança o único; quem alcança são dois cadastros
     * simultâneos — e o comentário do próprio `auth.service.ts` afirma que essa
     * corrida "cai no único do banco, traduzido em comum/prisma-erros.ts como
     * 409 EMAIL_JA_CADASTRADO". A afirmação é falsa hoje: sai `409 CONFLITO`.
     */
    const corpo = {
      nome: 'Gêmea Simultânea',
      email: 'gemea.simultanea@fiap.com.br',
      senha: 'campus123',
    };

    const [a, b] = await Promise.all([
      app.http().post('/api/auth/cadastro').send(corpo),
      app.http().post('/api/auth/cadastro').send(corpo),
    ]);

    // Isto funciona: o banco impede a segunda conta, e o status é 409.
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect(await app.prisma.usuario.count({ where: { email: corpo.email } })).toBe(1);

    // Isto é o defeito: o código do erro.
    const conflito = a.status === 409 ? a : b;
    expect(conflito.body).toMatchObject({ erro: 'EMAIL_JA_CADASTRADO' });
  });
});

describe('transação reverte inteira', () => {
  it('uma edição que falha no prazo não deixa a capacidade alterada', async () => {
    /*
     * O caso de rollback mais fiel que existe por HTTP, e ele é fiel porque a
     * ORDEM do handler o produz: `EventosService.editar` escreve a capacidade
     * (`ajustarCapacidade`) e SÓ DEPOIS valida os prazos. Uma edição com
     * capacidade legítima e datas incoerentes escreve a primeira e lança na
     * segunda — se a transação não revertesse, a capacidade ficaria alterada por
     * uma requisição que respondeu `422`.
     *
     * `evt-012` está 25/25 com fila: aumentar para 27 abriria duas vagas e
     * geraria duas ofertas. Nenhuma das duas coisas pode sobreviver ao erro.
     */
    const rafael = await entrar(app, EMAIL_RAFAEL);
    const antes = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.visita } });

    const resposta = await app
      .http()
      .patch(`/api/eventos/${ID.visita}`)
      .set(...comToken(rafael.accessToken))
      .send({
        capacidade: 27,
        // Início DEPOIS do fim: `validateDeadlines` reprova.
        inicio: new Date(antes.fim.getTime() + 86_400_000).toISOString(),
      })
      .expect(422);

    expect(resposta.body).toMatchObject({ erro: 'PRAZOS_INCOERENTES' });

    const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.visita } });
    expect(depois.capacidade).toBe(antes.capacidade);
    expect(depois.inicio.toISOString()).toBe(antes.inicio.toISOString());

    // E a fila não andou: a promoção de RN-005 não aconteceu.
    const fila = await app.prisma.participacao.count({
      where: { eventoId: ID.visita, status: 'LISTA_ESPERA' },
    });
    const ofertas = await app.prisma.participacao.count({
      where: { eventoId: ID.visita, status: 'OFERTA_PENDENTE' },
    });
    expect(fila).toBeGreaterThan(0);
    // A única oferta viva continua sendo a do seed (`par-122`).
    expect(ofertas).toBe(1);
  });

  it('uma inscrição que falha depois de contar não deixa ocupadas incrementada', async () => {
    /*
     * A propriedade que TODO service da API pressupõe: `$transaction`
     * interativa reverte de verdade nesta conexão. A sequência é a mesma de
     * `ParticipacoesService.inscrever` — criar a participação, incrementar
     * `ocupadas` — com uma falha injetada depois das duas escritas, no ponto em
     * que a rotina real pode falhar (gravar a resposta de uma pergunta
     * customizada, escrever a notificação, um `CHECK` disparar).
     *
     * Não há como injetar essa falha por HTTP sem mexer em `api/src`, e mexer em
     * `api/src` para servir ao teste seria trocar a garantia pelo teste dela.
     */
    const antes = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.futsal } });

    await expect(
      app.prisma.$transaction(async (tx) => {
        await tx.participacao.create({
          data: { eventoId: ID.futsal, usuarioId: ID.karen, status: 'CONFIRMADA' },
        });
        await tx.evento.update({
          where: { id: ID.futsal },
          data: { ocupadas: { increment: 1 } },
        });
        throw new Error('falha depois das duas escritas');
      }),
    ).rejects.toThrow('falha depois das duas escritas');

    const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.futsal } });
    expect(depois.ocupadas).toBe(antes.ocupadas);
    expect(
      await app.prisma.participacao.count({
        where: { eventoId: ID.futsal, usuarioId: ID.karen },
      }),
    ).toBe(0);
  });
});
