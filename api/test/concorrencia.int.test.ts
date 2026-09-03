/* eslint-disable no-console -- ver o comentário "A tally é o produto" abaixo */
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, type Aplicacao } from './suporte/aplicacao';
import { ID, semente } from './suporte/banco';

/**
 * CT-020 e RNF-013 — a última vaga sob concorrência real.
 *
 * ## Por que este é o caso mais importante da suíte
 *
 * É o único que **não pode** ser provado sem banco. O mock do CP5 serializa a
 * escrita numa fila de operações dentro de uma thread: o resultado é o certo,
 * mas o que ele demonstra é que uma fila serializa — não que o Campus resiste a
 * uma corrida. `READ COMMITTED`, o padrão do PostgreSQL, não impede duas
 * transações de lerem `ocupadas = 299` e ambas escreverem 300. Quem impede é o
 * `SELECT ... FOR UPDATE` de `comum/travas.ts`, e a única forma de verificar
 * isso é disparar N requisições de verdade contra um servidor de verdade.
 *
 * ## O desenho do caso
 *
 * `evt-005` (Festa Junina, capacidade 300) tem `ocupadas` ajustada para 299 —
 * exatamente uma vaga, como no Gherkin de CT-020. N alunos distintos disparam
 * `POST /eventos/:id/participacoes` no mesmo instante. O esperado:
 *
 * | Quantos | Resposta | Por quê |
 * |---|---|---|
 * | 1 | `201` `PENDENTE_PAGAMENTO` | a vaga era uma |
 * | N-1 | `409 SEM_VAGA` com `acao: LISTA_ESPERA` | RN-006: lotado desvia, não falha |
 * | 0 | `5xx` | esgotamento de pool ou violação de `CHECK` vazando como 500 seria defeito |
 *
 * E `ocupadas` termina em **300**, nunca 301.
 *
 * ### Divergência declarada com o Gherkin de CT-020
 *
 * O plano de testes descreve as outras 49 nascendo `LISTA_ESPERA`. Isso é o
 * comportamento da CAMADA MOCKADA, que emenda o desvio internamente. O contrato
 * da API (`openapi.yaml`) separa os dois passos: `409` com `acao: LISTA_ESPERA`
 * informa a saída, e é o cliente que decide entrar na fila com um `POST`
 * próprio. O segundo caso deste arquivo exercita justamente esse segundo passo,
 * também sob concorrência.
 *
 * ## Tokens assinados, login não
 *
 * Os N tokens vêm do `JwtService` DA APLICAÇÃO — assinatura real, verificada
 * pelo guard real. O que se pula é o `POST /auth/login`, por duas razões que não
 * têm a ver com o que está sob teste: 50 verificações argon2 custariam segundos,
 * e o `LimiteDeTaxaGuard` recusaria a partir da 11ª tentativa do mesmo IP. A
 * autenticação tem arquivo próprio.
 */

/** Quantas requisições simultâneas disputam a vaga. O Gherkin de CT-020 diz 50. */
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

/**
 * Cria N alunos do mesmo vínculo de Marina e devolve um token de acesso para
 * cada um. `createMany` numa chamada: N inserções separadas dominariam o tempo
 * do caso.
 */
async function criarDisputantes(quantos: number): Promise<string[]> {
  const dados = await semente();
  const modelo = dados.usuarios[0];
  if (!modelo) throw new Error('seed sem usuários');

  const novos = Array.from({ length: quantos }, (_, i) => {
    const numero = String(i + 1).padStart(3, '0');
    return {
      // Faixa de UUID própria (código de tabela 4, sequência 900+) para não
      // colidir com os 13 do seed nem confundir quem inspecionar o banco.
      id: `00000004-0000-4000-8000-${String(900 + i).padStart(12, '0')}`,
      nome: `Disputante ${numero}`,
      email: `disputante.${numero}@fiap.com.br`,
      senhaHash: modelo.senhaHash,
      avatarSeed: (i % 12) + 1,
      faculdadeId: modelo.faculdadeId,
      cursoId: modelo.cursoId ?? null,
      turmaId: modelo.turmaId ?? null,
      emailVerificado: true,
    };
  });

  await app.prisma.usuario.createMany({ data: novos });

  return Promise.all(novos.map((u) => jwt.signAsync({ sub: u.id, email: u.email })));
}

/** Deixa exatamente uma vaga livre em `evt-005`. */
async function deixarUmaVaga(): Promise<number> {
  const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
  await app.prisma.evento.update({
    where: { id: ID.festa },
    data: { ocupadas: evento.capacidade - 1 },
  });
  return evento.capacidade;
}

describe('a última vaga', () => {
  it(`produz exatamente uma confirmação com ${SIMULTANEAS} requisições simultâneas`, async () => {
    const capacidade = await deixarUmaVaga();
    const tokens = await criarDisputantes(SIMULTANEAS);

    /*
     * `Promise.all` sobre requisições já criadas: o `.then()` do supertest
     * dispara a requisição, então mapear e esperar em conjunto é o que as põe em
     * voo ao mesmo tempo. Um `for await` faria 50 requisições sequenciais e o
     * caso passaria sem nunca ter havido corrida — que é o modo silencioso de
     * este teste deixar de testar.
     */
    const respostas = await Promise.all(
      tokens.map((token) =>
        app
          .http()
          .post(`/api/eventos/${ID.festa}/participacoes`)
          .set(...comToken(token)),
      ),
    );

    const criadas = respostas.filter((r) => r.status === 201);
    const semVaga = respostas.filter((r) => r.status === 409);
    const servidor = respostas.filter((r) => r.status >= 500);
    const outros = respostas.filter((r) => r.status !== 201 && r.status !== 409 && r.status < 500);

    /*
     * A tally é o produto deste caso: é o número que vai para o relatório de
     * entrega. Imprimir aqui é o mesmo raciocínio de `src/seed/run.ts` — a
     * saída em `stdout` é o resultado, não log perdido em produção. Por isso o
     * `no-console` está desligado neste arquivo, e só neste.
     */
    console.log(
      `[CT-020] ${SIMULTANEAS} simultâneas → 201: ${criadas.length} · ` +
        `409: ${semVaga.length} · 5xx: ${servidor.length} · outros: ${outros.length} · ` +
        `ocupadas: ${(await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } })).ocupadas}/${capacidade}`,
    );

    expect({
      criadas: criadas.length,
      semVaga: semVaga.length,
      erroDeServidor: servidor.length,
      outros: outros.map((r) => r.status),
    }).toEqual({
      criadas: 1,
      semVaga: SIMULTANEAS - 1,
      erroDeServidor: 0,
      outros: [],
    });

    // Evento pago: a única vencedora nasce aguardando pagamento.
    expect(criadas[0]?.body).toMatchObject({ status: 'PENDENTE_PAGAMENTO' });

    // Todas as recusadas recebem a saída, não só o erro (RN-006).
    for (const recusada of semVaga) {
      expect(recusada.body).toMatchObject({ erro: 'SEM_VAGA', acao: 'LISTA_ESPERA' });
    }

    // A contagem materializada fecha exatamente na capacidade.
    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    expect(evento.ocupadas).toBe(capacidade);

    /*
     * E a contagem materializada bate com as linhas: `ocupadas` correta com
     * duas participações ativas seria overbooking com contador mentiroso, que é
     * pior do que overbooking visível.
     */
    const ativas = await app.prisma.participacao.count({
      where: {
        eventoId: ID.festa,
        status: { in: ['CONFIRMADA', 'PENDENTE_PAGAMENTO', 'OFERTA_PENDENTE', 'PRESENTE'] },
      },
    });
    expect(ativas).toBeLessThanOrEqual(capacidade);
  });

  it('distribui posições de fila únicas e contíguas quando todas entram na fila juntas', async () => {
    /*
     * O segundo ponto de corrida do mesmo handler, e o que quase ninguém lembra:
     * `nextWaitlistPosition` LÊ a fila inteira para decidir a próxima posição.
     * Duas entradas simultâneas sem trava receberiam a MESMA posição — e o
     * `CHECK` do banco não pega, porque posição repetida é um inteiro válido. O
     * sintoma seria duas pessoas "3ª da fila" e uma promoção que escolhe a
     * errada.
     */
    await app.prisma.evento.update({
      where: { id: ID.festa },
      data: { ocupadas: 300 },
    });
    const filaInicial = await app.prisma.participacao.count({
      where: { eventoId: ID.festa, status: 'LISTA_ESPERA' },
    });

    const tokens = await criarDisputantes(SIMULTANEAS);
    const respostas = await Promise.all(
      tokens.map((token) =>
        app
          .http()
          .post(`/api/eventos/${ID.festa}/lista-espera`)
          .set(...comToken(token)),
      ),
    );

    expect(respostas.filter((r) => r.status !== 201)).toHaveLength(0);

    const fila = await app.prisma.participacao.findMany({
      where: { eventoId: ID.festa, status: 'LISTA_ESPERA' },
      orderBy: { posicaoFila: 'asc' },
    });

    const posicoes = fila.map((p) => p.posicaoFila);
    const esperadas = Array.from({ length: filaInicial + SIMULTANEAS }, (_, i) => i + 1);
    // Únicas E contíguas: `new Set` de tamanho igual já provaria a unicidade,
    // mas a igualdade com 1..N também pega salto de numeração.
    expect(posicoes).toEqual(esperadas);
  });
});

describe('contraprova: a trava é o que produz o resultado', () => {
  it('sem SELECT ... FOR UPDATE, o mesmo fluxo deixa mais de uma pessoa entrar em uma vaga', async () => {
    /*
     * Um teste que não pode falhar não é teste. Este caso responde à pergunta
     * "e se a trava não estivesse lá?" — e responde reproduzindo a MESMA
     * sequência da API (ler o evento, comparar com a capacidade, inserir a
     * participação, escrever `ocupadas`) **sem** `travarEvento`.
     *
     * Duas diferenças em relação a `ParticipacoesService.inscrever`, e as duas
     * são o ponto:
     *
     * 1. Não há `SELECT ... FOR UPDATE`. As transações concorrentes leem
     *    `ocupadas = 299` ao mesmo tempo, porque `READ COMMITTED` permite.
     * 2. `ocupadas` é escrita por VALOR ABSOLUTO (`lido + 1`) e não por
     *    `increment`. É a forma ingênua — e é a que o `CHECK`
     *    `ck_evento_ocupadas_le_capacidade` **não** pega: todas escrevem 300, que
     *    é um valor legal. O `increment` do código real seria barrado pelo
     *    `CHECK` na segunda escrita, o que mostra que as duas defesas cobrem
     *    coisas diferentes: a trava produz a resposta certa, o `CHECK` impede o
     *    dado impossível.
     *
     * O `pg_sleep` dentro da transação não fabrica o defeito; ele só torna a
     * janela grande o bastante para o resultado não depender do escalonador do
     * sistema operacional. Sem ele o caso passaria de forma intermitente, o que
     * seria pior do que não existir.
     */
    const capacidade = await deixarUmaVaga();
    const dados = await semente();
    const modelo = dados.usuarios[0];
    if (!modelo) throw new Error('seed sem usuários');

    const concorrentes = 5;
    const usuarios = Array.from({ length: concorrentes }, (_, i) => ({
      id: `00000004-0000-4000-8000-${String(800 + i).padStart(12, '0')}`,
      nome: `Ingênuo ${i}`,
      email: `ingenuo.${i}@fiap.com.br`,
      senhaHash: modelo.senhaHash,
      avatarSeed: 1,
      faculdadeId: modelo.faculdadeId,
      cursoId: modelo.cursoId ?? null,
      turmaId: modelo.turmaId ?? null,
      emailVerificado: true,
    }));
    await app.prisma.usuario.createMany({ data: usuarios });

    const resultados = await Promise.all(
      usuarios.map(async (usuario) => {
        try {
          await app.prisma.$transaction(
            async (tx) => {
              const evento = await tx.evento.findUniqueOrThrow({ where: { id: ID.festa } });
              if (evento.ocupadas >= evento.capacidade) throw new Error('SEM_VAGA');

              // O `::text` não é decoração: `pg_sleep` devolve `void`, e o
              // Prisma não sabe desserializar `void` — sem o cast, a query
              // falha e o caso "passaria" por ninguém ter entrado.
              await tx.$queryRaw`SELECT pg_sleep(0.2)::text AS espera`;

              await tx.participacao.create({
                data: { eventoId: ID.festa, usuarioId: usuario.id, status: 'CONFIRMADA' },
              });
              await tx.evento.update({
                where: { id: ID.festa },
                data: { ocupadas: evento.ocupadas + 1 },
              });
            },
            { timeout: 30_000, maxWait: 30_000 },
          );
          return 'entrou' as const;
        } catch {
          return 'recusada' as const;
        }
      }),
    );

    const entraram = resultados.filter((r) => r === 'entrou').length;

    console.log(
      `[contraprova] sem trava, ${concorrentes} simultâneas em 1 vaga → ${entraram} entraram`,
    );

    /*
     * Mais de uma pessoa numa vaga. É a falha que a trava impede — e o caso
     * acima, com a trava, mede exatamente 1. Se algum dia este caso passar a
     * medir 1, alguma premissa mudou (nível de isolamento, versão do Postgres)
     * e a garantia precisa ser reexaminada, não celebrada.
     */
    expect(entraram).toBeGreaterThan(1);

    const evento = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.festa } });
    // E o contador ficou MENTINDO: diz 300 com mais de 300 ocupantes reais.
    expect(evento.ocupadas).toBe(capacidade);
  });
});
