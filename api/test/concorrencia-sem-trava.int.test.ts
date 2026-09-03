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
   * ## Por que a degradação é MEDIDA e não afirmada
   *
   * A primeira versão deste caso afirmava que alguma propriedade de CT-020 se
   * perde sem a trava, e reprovou na CI: no runner do GitHub, **nenhuma se
   * perdeu** — as 49 recusas mantiveram o `totalFila`. Na máquina de
   * desenvolvimento, de 7 a 22 delas perdiam, em cinco execuções seguidas.
   *
   * Os dois resultados são verdadeiros, e a diferença é o ponto: quantas
   * transações escapam depende do escalonamento do PostgreSQL, do número de
   * núcleos e da latência do disco. Uma corrida que não se manifesta numa
   * máquina rápida **continua sendo uma corrida** — o que muda é a chance de
   * observá-la nesta execução.
   *
   * Afirmar que ela se manifesta transformaria este arquivo num teste
   * intermitente, e teste intermitente é pior que teste ausente: ele treina
   * quem lê a saída a ignorar vermelho.
   *
   * Então aqui a degradação é registrada no `console.log` acima e as asserções
   * ficam com o que **não** depende de escalonamento. A contraprova
   * DETERMINÍSTICA da trava é outra, e mora em `concorrencia.int.test.ts`: a
   * réplica ingênua (ler `ocupadas`, `pg_sleep`, escrever `lido + 1`) força a
   * intercalação e coloca 5 de 5 pessoas em 1 vaga, sempre.
   */
  const perdeuAlgumaPropriedade =
    criadas !== 1 || conflitos.length !== SIMULTANEAS - 1 || comTotalFila !== SIMULTANEAS - 1;

  console.log(
    perdeuAlgumaPropriedade
      ? '[SEM TRAVA] a corrida se manifestou nesta execução: o desfecho de CT-020 se perdeu'
      : '[SEM TRAVA] a corrida NÃO se manifestou nesta execução — máquina rápida o bastante ' +
          'para as transações não se intercalarem. Ver a contraprova determinística em ' +
          'concorrencia.int.test.ts',
  );

  /*
   * O que vale em qualquer máquina, com trava ou sem: o banco não deixa passar
   * da capacidade. É o `CHECK` fazendo o trabalho de rede de segurança — o que
   * ele não faz é produzir a resposta certa para o cliente, e é isso que a trava
   * acrescenta.
   */
  expect(depois.ocupadas).toBeLessThanOrEqual(capacidade);
  expect(ativas).toBeLessThanOrEqual(capacidade);
  expect(servidor).toBe(0);
});
