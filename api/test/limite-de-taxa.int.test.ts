import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { criarAplicacao, type Aplicacao } from './suporte/aplicacao';

/**
 * Teto de tentativas nas rotas de credencial.
 *
 * Sem RNF próprio, e isso é dito de propósito: `LimiteDeTaxaGuard` documenta que
 * nenhum requisito pede limite de taxa. Ele existe porque RNF-010 protege a
 * senha ARMAZENADA e não protege o endpoint — sem freio, tentar dez mil senhas
 * contra `/auth/login` é de graça. O `429` está no contrato dessas duas rotas, e
 * é isso que estes casos verificam.
 *
 * Arquivo próprio porque o teto é lido no BOOT (`LimiteDeTaxaGuard` constrói a
 * janela no construtor, a partir de `Ambiente`), e todos os outros arquivos da
 * suíte sobem a API com o teto afrouxado: eles fazem dezenas de logins do mesmo
 * IP e receberiam `429` por um motivo que não é o deles. Aqui é o contrário — o
 * teto é 3, e o `429` é o resultado.
 *
 * O contador é em memória, por (IP, método, caminho). Isso está documentado no
 * guard como limitação declarada: duas instâncias atrás de um balanceador
 * toleram o dobro. Os casos medem o que a implementação promete, não o que um
 * limite distribuído prometeria.
 */

const TETO = 3;

let app: Aplicacao;

beforeAll(async () => {
  app = await criarAplicacao({
    RATE_LIMIT_TENTATIVAS: String(TETO),
    RATE_LIMIT_JANELA_SEGUNDOS: '60',
  });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

it('recusa a tentativa seguinte ao teto, dizendo quanto esperar', async () => {
  const credenciaisErradas = { email: 'marina.alves@fiap.com.br', senha: 'chute-errado-de-senha' };

  for (let tentativa = 1; tentativa <= TETO; tentativa += 1) {
    // Dentro do teto, a resposta é a do domínio: credencial inválida.
    await app.http().post('/api/auth/login').send(credenciaisErradas).expect(401);
  }

  const bloqueada = await app.http().post('/api/auth/login').send(credenciaisErradas).expect(429);

  expect(bloqueada.body).toMatchObject({ erro: 'LIMITE_EXCEDIDO' });
  /*
   * `tentarEmSegundos` no corpo é o que permite a tela dizer "tente em 47 s" em
   * vez de "erro". Sem o número, a pessoa tenta de novo na hora e o contador
   * nunca esfria.
   */
  const segundos = (bloqueada.body as { tentarEmSegundos: number }).tentarEmSegundos;
  expect(segundos).toBeGreaterThan(0);
  expect(segundos).toBeLessThanOrEqual(60);
});

it('o teto vale por caminho: o login esgotado não bloqueia o cadastro', async () => {
  const credenciaisErradas = { email: 'marina.alves@fiap.com.br', senha: 'chute-errado-de-senha' };
  for (let tentativa = 0; tentativa <= TETO; tentativa += 1) {
    await app.http().post('/api/auth/login').send(credenciaisErradas);
  }

  /*
   * A chave inclui o caminho de propósito: força bruta de senha e criação de
   * conta em massa são abusos diferentes, com tetos que podem divergir. Um
   * contador único por IP faria uma tentativa de login errada atrapalhar quem
   * está criando a primeira conta.
   */
  await app
    .http()
    .post('/api/auth/cadastro')
    .send({ nome: 'Conta Nova', email: 'conta.nova@fiap.com.br', senha: 'campus123' })
    .expect(201);
});

it('rota autenticada não é limitada pelo teto de credencial', async () => {
  const credenciaisErradas = { email: 'marina.alves@fiap.com.br', senha: 'chute-errado-de-senha' };
  for (let tentativa = 0; tentativa <= TETO; tentativa += 1) {
    await app.http().post('/api/auth/login').send(credenciaisErradas);
  }

  // O login está bloqueado, mas quem já tem sessão continua usando o app: o
  // limite protege a credencial, não o produto.
  const sessao = await app
    .http()
    .post('/api/auth/login')
    .send({ email: 'rafael.souza@fiap.com.br', senha: 'campus123' });
  expect(sessao.status).toBe(429);

  await app.http().get('/api/health').expect(200);
});
