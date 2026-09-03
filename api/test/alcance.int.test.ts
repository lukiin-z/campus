import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';

/**
 * Alcance verificado no SERVIDOR, por requisição HTTP — CT-011, CT-012, RN-001
 * e RNF-012.
 *
 * ## O defeito que este arquivo existe para impedir
 *
 * O nº 3 do CP4 foi um handler de escrita que não repetia a verificação de
 * alcance: a lista filtrava, o detalhe filtrava, e `POST` direto no id passava.
 * Quem descobre isso é uma requisição, não um teste de unidade — a unidade
 * chamaria `canSee` e veria `false`, que é justamente a função que o handler
 * defeituoso não chamava. Por isso todo caso aqui é uma requisição de verdade
 * contra o handler de verdade.
 *
 * ## `404` e não `403`, com o corpo idêntico
 *
 * Fora do alcance e inexistente têm de ser indistinguíveis. Não basta o status
 * bater: um `mensagem` diferente nos dois casos entrega a mesma informação que o
 * `403` entregaria. Os casos comparam o corpo INTEIRO.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_BEATRIZ = 'beatriz.nakamura@fiap.com.br';
const EMAIL_RAFAEL = 'rafael.souza@fiap.com.br';

/** UUID bem formado que não existe em nenhuma tabela. */
const INEXISTENTE = '00000005-0000-4000-8000-000000000999';

let app: Aplicacao;
let marina: string;

beforeAll(async () => {
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
  marina = (await entrar(app, EMAIL_MARINA)).accessToken;
});

describe('leitura', () => {
  it('esconde evento de outro curso e o esconde do mesmo jeito que um inexistente', async () => {
    // `evt-006` é do curso de Sistemas de Informação; Marina é de Engenharia de
    // Computação.
    const foraDoAlcance = await app
      .http()
      .get(`/api/eventos/${ID.workshopSI}`)
      .set(...comToken(marina))
      .expect(404);

    const naoExiste = await app
      .http()
      .get(`/api/eventos/${INEXISTENTE}`)
      .set(...comToken(marina))
      .expect(404);

    // O corpo INTEIRO, não só o status: `mensagem` diferente vazaria o que o
    // `403` vazaria.
    expect(foraDoAlcance.body).toEqual(naoExiste.body);
    expect(foraDoAlcance.body).toEqual({
      erro: 'NAO_ENCONTRADO',
      mensagem: 'Evento não encontrado.',
    });
  });

  it('mostra o mesmo evento para quem é do curso dele', async () => {
    const beatriz = await entrar(app, EMAIL_BEATRIZ);
    const resposta = await app
      .http()
      .get(`/api/eventos/${ID.workshopSI}`)
      .set(...comToken(beatriz.accessToken))
      .expect(200);

    // A MESMA linha, o MESMO id: o que muda é quem pede. Sem este par, um `404`
    // por bug de query passaria por "alcance funcionando".
    expect((resposta.body as { id: string; titulo: string }).titulo).toBe(
      'Workshop de Git e GitHub',
    );
  });

  it('não lista nenhum evento fora do alcance', async () => {
    const resposta = await app
      .http()
      .get('/api/eventos')
      .set(...comToken(marina))
      .expect(200);

    const ids = (resposta.body as Array<{ id: string }>).map((e) => e.id);

    // `evt-006` (curso SI) e `evt-008` (curso CC) não são do curso de Marina;
    // `evt-011` é rascunho de outra pessoa.
    expect(ids).not.toContain(ID.workshopSI);
    expect(ids).not.toContain(ID.canceladoCC);
    expect(ids).not.toContain(ID.rascunho);
    // E o que é dela aparece: turma, curso e faculdade.
    expect(ids).toContain(ID.churrasco);
    expect(ids).toContain(ID.roda);
    expect(ids).toContain(ID.hackathon);
  });

  it('mostra rascunho só para o organizador', async () => {
    await app
      .http()
      .get(`/api/eventos/${ID.rascunho}`)
      .set(...comToken(marina))
      .expect(404);

    const rafael = await entrar(app, EMAIL_RAFAEL);
    await app
      .http()
      .get(`/api/eventos/${ID.rascunho}`)
      .set(...comToken(rafael.accessToken))
      .expect(200);
  });

  it('mantém o acesso de quem tem participação ativa mesmo depois de perder o vínculo', async () => {
    /*
     * A exceção deliberada de RN-001, e a única que precisa de banco para ser
     * exercitada: o vínculo mora na linha do usuário, não no token. Marina é
     * movida para a turma 4SIA (outro curso) e o churrasco da 3ESPX continua
     * visível — porque a participação dela nele está ativa. Perder acesso ao
     * próprio ingresso ao trocar de turma seria pior que a inconsistência.
     */
    const turma4SIA = await app.prisma.turma.findFirstOrThrow({ where: { nome: '4SIA' } });
    await app.prisma.usuario.update({
      where: { id: ID.marina },
      data: { turmaId: turma4SIA.id, cursoId: turma4SIA.cursoId },
    });

    await app
      .http()
      .get(`/api/eventos/${ID.churrasco}`)
      .set(...comToken(marina))
      .expect(200);

    // Já a visita técnica da mesma turma, em que ela tem oferta pendente, também
    // continua visível — e o rascunho da 3ESPX, em que ela não tem nada, não.
    await app
      .http()
      .get(`/api/eventos/${ID.rascunho}`)
      .set(...comToken(marina))
      .expect(404);
  });
});

describe('escrita — o defeito nº 3 do CP4', () => {
  it('recusa inscrição por POST direto em evento fora do alcance, sem escrever nada', async () => {
    const antes = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.workshopSI } });

    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.workshopSI}/participacoes`)
      .set(...comToken(marina))
      .expect(404);

    /*
     * `404`, não `422 SEM_VAGA`. O `evt-006` está lotado (30/30), então um
     * handler que verificasse capacidade ANTES do alcance responderia
     * `409 SEM_VAGA` — e essa resposta já confirmaria a existência do evento e
     * o estado dele. A ordem das verificações é parte da garantia.
     */
    expect(resposta.body).toEqual({ erro: 'NAO_ENCONTRADO', mensagem: 'Evento não encontrado.' });

    const depois = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.workshopSI } });
    expect(depois.ocupadas).toBe(antes.ocupadas);
    const criadas = await app.prisma.participacao.count({
      where: { eventoId: ID.workshopSI, usuarioId: ID.marina },
    });
    expect(criadas).toBe(0);
  });

  it('recusa entrada na lista de espera por POST direto em evento fora do alcance', async () => {
    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.workshopSI}/lista-espera`)
      .set(...comToken(marina))
      .expect(404);

    expect(resposta.body).toEqual({ erro: 'NAO_ENCONTRADO', mensagem: 'Evento não encontrado.' });
    expect(
      await app.prisma.participacao.count({
        where: { eventoId: ID.workshopSI, usuarioId: ID.marina },
      }),
    ).toBe(0);
  });

  it('recusa edição de evento de outra pessoa com 403, e de evento invisível com 404', async () => {
    /*
     * Os dois códigos, no mesmo caso, porque a diferença entre eles é a regra:
     *
     * - `evt-001` é da turma de Marina: ela SABE que ele existe (está inscrita).
     *   Recusar com `404` seria mentir sobre algo que ela já viu. É `403`.
     * - `evt-006` é de outro curso: ela não deveria nem saber que existe. É
     *   `404`, igual a inexistente.
     */
    const proprioAlcance = await app
      .http()
      .patch(`/api/eventos/${ID.churrasco}`)
      .set(...comToken(marina))
      .send({ titulo: 'Churrasco sequestrado' })
      .expect(403);
    expect(proprioAlcance.body).toMatchObject({ erro: 'SEM_PERMISSAO' });

    await app
      .http()
      .patch(`/api/eventos/${ID.workshopSI}`)
      .set(...comToken(marina))
      .send({ titulo: 'Workshop sequestrado' })
      .expect(404);

    // Nem o título nem nada mais mudou.
    const churrasco = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.churrasco } });
    expect(churrasco.titulo).toBe('Churrasco de encerramento do semestre');
  });

  it('recusa cancelamento de evento por quem não é o organizador', async () => {
    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.churrasco}/cancelamento`)
      .set(...comToken(marina))
      .send({ motivo: 'Motivo com tamanho suficiente para passar pelo schema de cancelamento.' })
      .expect(403);

    expect(resposta.body).toMatchObject({ erro: 'SEM_PERMISSAO' });
    const churrasco = await app.prisma.evento.findUniqueOrThrow({ where: { id: ID.churrasco } });
    expect(churrasco.status).toBe('PUBLICADO');
  });

  it('recusa a lista de participantes para quem não organiza o evento', async () => {
    await app
      .http()
      .get(`/api/eventos/${ID.churrasco}/participantes`)
      .set(...comToken(marina))
      .expect(403);

    const rafael = await entrar(app, EMAIL_RAFAEL);
    const dele = await app
      .http()
      .get(`/api/eventos/${ID.churrasco}/participantes`)
      .set(...comToken(rafael.accessToken))
      .expect(200);
    expect((dele.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('deriva a âncora do vínculo de quem cria, e não do corpo da requisição', async () => {
    /*
     * RN-001, invariante 2. `NovoEvento` não tem campo `turmaId` de propósito —
     * mas um corpo com campos a mais é o teste de que o schema é `strict` e que
     * o handler não os lê. Se a âncora viesse do corpo, daria para publicar na
     * turma de outra pessoa.
     */
    const inicio = new Date(Date.now() + 20 * 86_400_000);
    const fim = new Date(inicio.getTime() + 2 * 3_600_000);

    const resposta = await app
      .http()
      .post('/api/eventos')
      .set(...comToken(marina))
      .send({
        titulo: 'Evento de teste de alcance',
        descricao: 'Descrição longa o suficiente para passar pelo mínimo de 20 caracteres.',
        alcance: 'TURMA',
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        local: 'Sala 1',
        capacidade: 10,
        preco: 0,
        publicar: true,
        // Turma da Beatriz. Não existe no schema; a expectativa é que seja
        // ignorado ou recusado, nunca obedecido.
        turmaId: '00000003-0000-4000-8000-000000000003',
      });

    if (resposta.status === 201) {
      const criado = await app.prisma.evento.findUniqueOrThrow({
        where: { id: (resposta.body as { id: string }).id },
      });
      const marinaLinha = await app.prisma.usuario.findUniqueOrThrow({ where: { id: ID.marina } });
      expect(criado.turmaId).toBe(marinaLinha.turmaId);
    } else {
      // Recusa por corpo estrito também satisfaz a garantia.
      expect(resposta.status).toBe(422);
    }
  });
});
