/* eslint-disable no-console -- a tally é o produto deste arquivo; ver concorrencia.int.test.ts */
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { comToken, criarAplicacao, type Aplicacao } from './suporte/aplicacao';
import { ID, semente } from './suporte/banco';

/**
 * A MEDIÇÃO: o caso de CT-020 com a trava de linha REMOVIDA.
 *
 * ## Por que este arquivo existe
 *
 * "Teste que não pode falhar não é teste." O caso de `concorrencia.int.test.ts`
 * mede 1 confirmação em 50 requisições — mas um teste que passa não diz se ele
 * passaria de todo jeito. Este arquivo responde: ele desliga
 * `travarEvento` e roda o MESMO cenário contra a MESMA API.
 *
 * ## Como a garantia é removida, e por que assim
 *
 * `vi.mock` sobre `src/comum/travas`, substituindo **só** `travarEvento` por uma
 * função que não trava (e mantendo a recusa `404` para evento inexistente, que
 * é a outra responsabilidade dela). `travarParticipacao` fica intacta.
 *
 * As alternativas eram piores. Editar `api/src/comum/travas.ts` à mão, medir e
 * desfazer produz a mesma informação uma única vez e não deixa nada
 * verificável — quem lê o relatório teria de acreditar no número. Com o mock, a
 * medição é reprodutível por qualquer pessoa, num arquivo separado, sem tocar
 * em código de produção.
 *
 * ## O que se espera medir
 *
 * Sem a trava, as N transações leem `ocupadas = 299` ao mesmo tempo (é o que
 * `READ COMMITTED` permite) e todas concluem que há vaga. O que as segura passa
 * a ser só o `CHECK ck_evento_ocupadas_le_capacidade`, na escrita do
 * `increment`. As consequências observáveis, e é por elas que a trava existe:
 *
 * - **mais de um `201`** é possível, porque o `increment` de duas transações
 *   concorrentes pode ser serializado pelo próprio banco sem que nenhuma delas
 *   estoure a capacidade — e aí duas pessoas entram numa vaga;
 * - as recusadas **perdem `totalFila`**, porque não vêm de `isFull` e sim da
 *   tradução do `CHECK` (que devolve `acao: LISTA_ESPERA` sem o tamanho da
 *   fila). A tela não tem como dizer "você seria o 8º";
 * - a contagem materializada e o número de participações ativas podem
 *   **discordar**.
 *
 * O caso abaixo afirma exatamente a única coisa que interessa: o desfecho
 * DIFERE do desfecho com a trava. É isso que torna o teste de `CT-020` uma
 * medição em vez de uma afirmação.
 */

vi.mock('../src/comum/travas', async (original) => {
  const real = await original<typeof import('../src/comum/travas')>();
  const { PrismaClient } = await import('@prisma/client');
  void PrismaClient;

  return {
    ...real,
    /**
     * A trava sem o `FOR UPDATE`. Continua conferindo a existência do evento —
     * senão o cenário mudaria por outro motivo (`404` em vez de corrida) e a
     * comparação deixaria de ser sobre a trava.
     */
    travarEvento: async (cliente: Parameters<typeof real.travarEvento>[0], eventoId: string) => {
      const linhas = await cliente.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "evento" WHERE "id" = $1::uuid',
        eventoId,
      );
      if (linhas.length === 0) {
        const { NaoEncontrado } = await import('../src/comum/erros');
        throw new NaoEncontrado('Evento não encontrado.');
      }
    },
  };
});

const SIMULTANEAS = 50;

let app: Aplicacao;
let jwt: JwtService;

beforeAll(async () => {
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
  jwt = app.nest.get(JwtService, { strict: false });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

it(`sem a trava, ${SIMULTANEAS} simultâneas na última vaga NÃO produzem o desfecho de CT-020`, async () => {
  const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
  const capacidade = evento.capacidade;
  await app.prisma.evento.update({
    where: { id: ID.festa },
    data: { ocupadas: capacidade - 1 },
  });

  const dados = await semente();
  const modelo = dados.usuarios[0];
  if (!modelo) throw new Error('seed sem usuários');

  const usuarios = Array.from({ length: SIMULTANEAS }, (_, i) => ({
    id: `00000004-0000-4000-8000-${String(700 + i).padStart(12, '0')}`,
    nome: `Sem trava ${i}`,
    email: `sem.trava.${i}@fiap.com.br`,
    senhaHash: modelo.senhaHash,
    avatarSeed: (i % 12) + 1,
    faculdadeId: modelo.faculdadeId,
    cursoId: modelo.cursoId ?? null,
    turmaId: modelo.turmaId ?? null,
    emailVerificado: true,
  }));
  await app.prisma.usuario.createMany({ data: usuarios });
  const tokens = await Promise.all(
    usuarios.map((u) => jwt.signAsync({ sub: u.id, email: u.email })),
  );

  const respostas = await Promise.all(
    tokens.map((token) =>
      app
        .http()
        .post(`/api/eventos/${ID.festa}/participacoes`)
        .set(...comToken(token)),
    ),
  );

  const criadas = respostas.filter((r) => r.status === 201).length;
  const conflitos = respostas.filter((r) => r.status === 409);
  const servidor = respostas.filter((r) => r.status >= 500).length;
  const comTotalFila = conflitos.filter(
    (r) => (r.body as { totalFila?: number }).totalFila !== undefined,
  ).length;

  const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
  const ativas = await app.prisma.participacao.count({
    where: {
      eventoId: ID.festa,
      status: { in: ['CONFIRMADA', 'PENDENTE_PAGAMENTO', 'OFERTA_PENDENTE', 'PRESENTE'] },
    },
  });

  console.log(
    `[SEM TRAVA] ${SIMULTANEAS} simultâneas → 201: ${criadas} · 409: ${conflitos.length} ` +
      `(com totalFila: ${comTotalFila}) · 5xx: ${servidor} · ` +
      `ocupadas: ${depois.ocupadas}/${capacidade} · participações ativas: ${ativas}`,
  );

  /*
   * A afirmação é sobre a DIFERENÇA, e é deliberadamente frouxa em relação ao
   * número exato: quantas transações escapam depende do escalonamento do
   * PostgreSQL, e um `toBe(3)` aqui seria um teste intermitente. O que não
   * depende de escalonamento é que ALGUMA propriedade de CT-020 se perde — e
   * qualquer uma delas basta para provar que o caso com a trava mede algo.
   */
  const desfechoDeCT020 =
    criadas === 1 &&
    conflitos.length === SIMULTANEAS - 1 &&
    servidor === 0 &&
    comTotalFila === SIMULTANEAS - 1 &&
    depois.ocupadas === capacidade &&
    ativas <= capacidade;

  expect(desfechoDeCT020).toBe(false);

  // E a garantia que o banco mantém mesmo sem a trava: nunca passa da
  // capacidade. É o `CHECK` fazendo o trabalho de rede de segurança — o que ele
  // não faz é produzir a resposta certa para o cliente.
  expect(depois.ocupadas).toBeLessThanOrEqual(capacidade);
});
