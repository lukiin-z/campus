import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID, SENHA } from './suporte/banco';

/**
 * Autenticação de verdade — argon2id, JWT e sessão revogável.
 *
 * RNF-010 ("senha com hash forte") é o único requisito não funcional que fala
 * de credencial. A validade curta do token de acesso e a revogabilidade do
 * refresh não têm RNF próprio: são decisão de desenho de `auth/sessoes.service.ts`,
 * e é ela que os casos abaixo verificam.
 *
 * O mock do CP5 aceitava `campus.sess.<usuarioId>` como token: uma string que
 * qualquer pessoa monta. Todo comportamento deste arquivo é, por construção,
 * impossível de testar contra ele — não há hash a verificar, não há assinatura a
 * falsificar, não há sessão a revogar. É o motivo de os casos morarem aqui e não
 * em `app/src/services/`.
 *
 * `decideLogin` (a ORDEM das recusas: domínio antes de credencial antes de
 * e-mail não verificado) já tem teste unitário em `packages/shared`. O que se
 * verifica aqui é o que a API acrescenta: que a senha do seed passa por
 * `argon2.verify`, que o token emitido é aceito, que um token que não deveria
 * ser aceito não é, e que revogar de fato revoga.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_BEATRIZ = 'beatriz.nakamura@fiap.com.br';

let app: Aplicacao;

beforeAll(async () => {
  /*
   * Teto de tentativas afrouxado, e é a única forma de este arquivo existir.
   * `LimiteDeTaxaGuard` conta por (IP, método, caminho) — e todos os casos daqui
   * saem do mesmo `127.0.0.1` para o mesmo `POST /api/auth/login`. Com o teto
   * padrão de 10, o 11º login da suíte recebe `429` e o caso falha por um
   * motivo que não é o dele. O `429` tem arquivo próprio, com o teto baixo:
   * `test/limite-de-taxa.int.test.ts`.
   */
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

describe('login', () => {
  it('verifica a senha com argon2 e devolve o par de tokens com o vínculo resolvido', async () => {
    const resposta = await app
      .http()
      .post('/api/auth/login')
      .send({ email: EMAIL_MARINA, senha: SENHA })
      .expect(201);

    const corpo = resposta.body as {
      accessToken: string;
      refreshToken: string;
      expiraEm: number;
      sessao: {
        usuario: { id: string; email: string };
        faculdade: { sigla: string };
        curso: { codigo: string } | null;
        turma: { nome: string } | null;
      };
    };

    expect(corpo.sessao.usuario.id).toBe(ID.marina);
    // A sessão vem com faculdade, curso e turma resolvidos numa chamada só —
    // sem isso o app faria quatro requisições antes do primeiro pixel.
    expect(corpo.sessao.faculdade.sigla).toBe('FIAP');
    expect(corpo.sessao.curso?.codigo).toBe('ECOMP');
    expect(corpo.sessao.turma?.nome).toBe('3ESPX');
    // 15 min é o padrão de `JWT_ACCESS_TTL_MINUTES`, em segundos.
    expect(corpo.expiraEm).toBe(900);

    // A sessão foi REGISTRADA, e o que ficou no banco é o hash — nunca o token.
    const sessoes = await app.prisma.sessao.findMany({ where: { usuarioId: ID.marina } });
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0]?.refreshHash).not.toBe(corpo.refreshToken);
    expect(sessoes[0]?.refreshHash).toHaveLength(64); // SHA-256 em hex
  });

  it('nunca devolve senha nem hash em nenhum campo da resposta', async () => {
    const resposta = await app
      .http()
      .post('/api/auth/login')
      .send({ email: EMAIL_MARINA, senha: SENHA })
      .expect(201);

    /*
     * A verificação é no JSON SERIALIZADO, e não campo por campo: o risco não é
     * `corpo.usuario.senhaHash`, que o `Omit<…, 'senhaHash'>` do tipo `Titular`
     * já impede de compilar. É um campo novo em alguma projeção aninhada que
     * ninguém lembrou de recortar.
     */
    const texto = JSON.stringify(resposta.body);
    expect(texto).not.toContain(SENHA);
    expect(texto).not.toContain('$argon2');
    expect(texto.toLowerCase()).not.toContain('senhahash');
  });

  it('recusa e-mail fora do domínio institucional nomeando o domínio aceito', async () => {
    const resposta = await app
      .http()
      .post('/api/auth/login')
      .send({ email: 'marina@gmail.com', senha: SENHA })
      .expect(422);

    // RN-002: `422` e não `401` — esta conta nunca vai servir, e a tela reage
    // diferente de "tente de novo".
    expect(resposta.body).toMatchObject({ erro: 'DOMINIO_NAO_INSTITUCIONAL' });
    expect(String((resposta.body as { mensagem: string }).mensagem)).toContain('@fiap.com.br');
  });

  it('dá a mesma resposta para senha errada e para conta que não existe', async () => {
    const senhaErrada = await app
      .http()
      .post('/api/auth/login')
      .send({ email: EMAIL_MARINA, senha: 'senha-que-nao-e-a-dela' })
      .expect(401);

    const contaInexistente = await app
      .http()
      .post('/api/auth/login')
      .send({ email: 'ninguem.aqui@fiap.com.br', senha: SENHA })
      .expect(401);

    /*
     * As duas respostas têm de ser IDÊNTICAS. Qualquer diferença transforma o
     * endpoint num verificador de quem tem conta no Campus — é o mesmo motivo
     * do `hashDescartavel` em `auth.service.ts`, que iguala também o TEMPO de
     * resposta (o que este teste não mede: medir tempo em CI produz falha
     * intermitente, e a garantia está no código e comentada lá).
     */
    expect(senhaErrada.body).toEqual(contaInexistente.body);
    expect(senhaErrada.body).toMatchObject({ erro: 'CREDENCIAL_INVALIDA' });
  });
});

describe('token de acesso', () => {
  it('recusa rota protegida sem cabeçalho Authorization', async () => {
    const resposta = await app.http().get('/api/sessao').expect(401);
    expect(resposta.body).toMatchObject({ erro: 'TOKEN_AUSENTE' });
  });

  it.each([
    ['esquema errado', 'Basic abc'],
    ['sem esquema', 'abc'],
    ['Bearer sem valor', 'Bearer'],
    ['Bearer com valor vazio', 'Bearer   '],
  ])('recusa Authorization malformado: %s', async (_nome, cabecalho) => {
    /*
     * `TOKEN_AUSENTE` e não `TOKEN_INVALIDO` nos quatro: `extrairBearer`
     * devolve `null` sem chegar a verificar assinatura. A distinção importa
     * porque um cliente que recebe `TOKEN_INVALIDO` tenta o refresh, e um que
     * recebe `TOKEN_AUSENTE` manda a pessoa fazer login.
     */
    const resposta = await app
      .http()
      .get('/api/sessao')
      .set('Authorization', cabecalho)
      .expect(401);
    expect(resposta.body).toMatchObject({ erro: 'TOKEN_AUSENTE' });
  });

  it('aceita o esquema Bearer em minúscula (RFC 7235)', async () => {
    const sessao = await entrar(app, EMAIL_MARINA);
    await app
      .http()
      .get('/api/sessao')
      .set('Authorization', `bearer ${sessao.accessToken}`)
      .expect(200);
  });

  it('recusa token expirado', async () => {
    /*
     * O token é forjado com o `JwtService` DA APLICAÇÃO — mesmo segredo, mesmo
     * algoritmo, só com `exp` no passado. A alternativa seria subir a API com
     * `JWT_ACCESS_TTL_MINUTES=1` (o mínimo que o schema aceita) e esperar 60 s,
     * o que acrescentaria um minuto à suíte para medir a mesma coisa.
     */
    const jwt = app.nest.get(JwtService, { strict: false });
    const expirado = await jwt.signAsync(
      { sub: ID.marina, email: EMAIL_MARINA },
      { expiresIn: '-1s' },
    );

    const resposta = await app
      .http()
      .get('/api/sessao')
      .set(...comToken(expirado))
      .expect(401);
    expect(resposta.body).toMatchObject({ erro: 'TOKEN_INVALIDO' });
  });

  it('recusa token com assinatura de outro segredo', async () => {
    const outroJwt = new JwtService({ secret: 'x'.repeat(48) });
    const forjado = await outroJwt.signAsync({ sub: ID.marina, email: EMAIL_MARINA });

    const resposta = await app
      .http()
      .get('/api/sessao')
      .set(...comToken(forjado))
      .expect(401);
    expect(resposta.body).toMatchObject({ erro: 'TOKEN_INVALIDO' });
  });

  it('recusa token válido de conta que não existe mais', async () => {
    // Conta criada e apagada durante o caso: apagar uma do seed bateria nas FKs
    // `RESTRICT` das participações, que é comportamento correto do banco.
    const criada = await app
      .http()
      .post('/api/auth/cadastro')
      .send({ nome: 'Passageira Efêmera', email: 'passageira.efemera@fiap.com.br', senha: SENHA })
      .expect(201);
    const token = (criada.body as { accessToken: string }).accessToken;

    await app
      .http()
      .get('/api/sessao')
      .set(...comToken(token))
      .expect(200);

    const id = (criada.body as { sessao: { usuario: { id: string } } }).sessao.usuario.id;
    await app.prisma.sessao.deleteMany({ where: { usuarioId: id } });
    await app.prisma.usuario.delete({ where: { id } });

    // `401`, não `500`: o token continua assinado por nós e válido por até 15
    // minutos depois de a conta deixar de existir.
    const resposta = await app
      .http()
      .get('/api/sessao')
      .set(...comToken(token))
      .expect(401);
    expect(resposta.body).toMatchObject({ erro: 'CONTA_INEXISTENTE' });
  });

  it('não alcança o recurso de outra pessoa com um token legítimo', async () => {
    const beatriz = await entrar(app, EMAIL_BEATRIZ);

    /*
     * `par-001` é a participação de Marina no churrasco. Com o token de
     * Beatriz, a resposta é `404` e não `403`: o id da participação É o
     * ingresso, e confirmar que ele existe já diria a Beatriz que alguém tem
     * vaga naquele evento (RNF-012).
     */
    const resposta = await app
      .http()
      .get(`/api/participacoes/${ID.parChurrascoMarina}`)
      .set(...comToken(beatriz.accessToken))
      .expect(404);
    expect(resposta.body).toMatchObject({ erro: 'NAO_ENCONTRADO' });

    // E o dono continua alcançando o mesmo id.
    const marina = await entrar(app, EMAIL_MARINA);
    await app
      .http()
      .get(`/api/participacoes/${ID.parChurrascoMarina}`)
      .set(...comToken(marina.accessToken))
      .expect(200);
  });
});

describe('refresh revogável', () => {
  it('rotaciona o refresh e mata o anterior', async () => {
    const inicial = await entrar(app, EMAIL_MARINA);

    const renovado = await app
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: inicial.refreshToken })
      .expect(201);
    const novo = (renovado.body as { refreshToken: string }).refreshToken;

    expect(novo).not.toBe(inicial.refreshToken);

    /*
     * Reapresentar o refresh já usado é o sinal de que alguém copiou o token —
     * ou de um bug do cliente. Nos dois casos a resposta é a conservadora:
     * TODAS as sessões daquele usuário caem. Perder a sessão é irritante;
     * manter uma sessão roubada viva não é aceitável.
     */
    const reuso = await app
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: inicial.refreshToken })
      .expect(401);
    expect(reuso.body).toMatchObject({ erro: 'SESSAO_REUTILIZADA' });

    /*
     * E a punição alcança o refresh NOVO, que era legítimo até aqui. O código
     * é `SESSAO_REUTILIZADA` também aqui, porque `revogarTodasDoUsuario` marca
     * `revogadaEm` na sessão nova e a rotação não distingue "revogada por
     * castigo" de "revogada por já ter sido usada" — as duas exigem login, que
     * é a única informação que o cliente precisa.
     */
    const depois = await app
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: novo })
      .expect(401);
    expect(depois.body).toMatchObject({ erro: 'SESSAO_REUTILIZADA' });

    const vivas = await app.prisma.sessao.count({
      where: { usuarioId: ID.marina, revogadaEm: null },
    });
    expect(vivas).toBe(0);
  });

  it('logout revoga a sessão e é idempotente', async () => {
    const sessao = await entrar(app, EMAIL_MARINA);

    await app
      .http()
      .post('/api/auth/logout')
      .set(...comToken(sessao.accessToken))
      .send({ refreshToken: sessao.refreshToken })
      .expect(204);

    const resposta = await app
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: sessao.refreshToken })
      .expect(401);
    /*
     * `SESSAO_REUTILIZADA`, e não `SESSAO_INVALIDA`: o logout marca
     * `revogadaEm` em vez de apagar a linha, e a rotação lê isso como reuso. O
     * efeito colateral é desejável — quem apresenta um refresh já revogado
     * perde as demais sessões, e é indiferente se a revogação veio de um logout
     * ou de uma rotação.
     */
    expect(resposta.body).toMatchObject({ erro: 'SESSAO_REUTILIZADA' });

    // Sair duas vezes responde `204` do mesmo jeito: `404` diria ao cliente
    // que aquele refresh existe em outra conta.
    await app
      .http()
      .post('/api/auth/logout')
      .set(...comToken(sessao.accessToken))
      .send({ refreshToken: sessao.refreshToken })
      .expect(204);
  });

  it('não deixa uma pessoa revogar a sessão de outra', async () => {
    const marina = await entrar(app, EMAIL_MARINA);
    const beatriz = await entrar(app, EMAIL_BEATRIZ);

    // Beatriz autenticada, mandando o refresh de Marina.
    await app
      .http()
      .post('/api/auth/logout')
      .set(...comToken(beatriz.accessToken))
      .send({ refreshToken: marina.refreshToken })
      .expect(204);

    // O `204` é fachada — a sessão de Marina continua viva.
    await app
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: marina.refreshToken })
      .expect(201);
  });
});
