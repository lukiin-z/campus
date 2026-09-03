import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { redefinirBanco, SENHA } from './banco';

/**
 * A API de verdade, ouvindo numa porta de verdade.
 *
 * ## Por que `NestFactory.create(AppModule)`, e não `Test.createTestingModule`
 *
 * O módulo de teste do Nest existe para SUBSTITUIR provider — e substituir
 * provider é exatamente o que não se pode fazer aqui. O que estes testes provam
 * é o comportamento do grafo real: guard global de autenticação, interceptor de
 * expiração, filtro de exceção único, `PrismaService` contra PostgreSQL. Uma
 * árvore montada à mão com metade dos providers trocados por dublê provaria o
 * dublê.
 *
 * ## Por que `listen(0)`, e não só `getHttpServer()`
 *
 * O `supertest` sabe subir um servidor efêmero por requisição quando o servidor
 * não está ouvindo. Isso é fatal para o caso de concorrência: N requisições
 * "simultâneas" viriam de N servidores diferentes, o que testa N processos de
 * uma requisição cada em vez de um processo com N requisições. Com
 * `listen(0)` há UM servidor, e as N requisições disputam de verdade — pool de
 * conexões, event loop e trava de linha inclusos.
 *
 * ## O que este helper NÃO reproduz de `src/main.ts`
 *
 * `helmet`, CORS e Swagger. Nenhum dos três muda status ou corpo de resposta, e
 * reproduzi-los aqui criaria uma segunda definição da subida da API, que
 * divergiria da primeira na primeira mudança. O que é reproduzido é o que altera
 * comportamento: `rawBody` (sem ele o HMAC do webhook não pode ser verificado —
 * RN-014) e o prefixo global `api`.
 */

export interface Aplicacao {
  readonly nest: INestApplication;
  readonly prisma: PrismaService;
  /** Cliente HTTP apontado para a porta efêmera. Já inclui o prefixo `/api`. */
  http(): request.Agent;
  /** Volta o banco ao seed. Chame no `beforeEach`. */
  redefinir(): Promise<void>;
  encerrar(): Promise<void>;
}

/**
 * Sobe a API.
 *
 * @param sobrescritas variáveis de ambiente aplicadas ANTES do boot. Existe por
 *   causa de `carregarAmbiente()`, que lê `process.env` na construção do
 *   `ConfigModule`: é o único jeito de um caso exercitar um ambiente diferente
 *   (o teto do limite de taxa, `NODE_ENV=production`) sem mexer em `src/`.
 */
export async function criarAplicacao(
  sobrescritas: Readonly<Record<string, string>> = {},
): Promise<Aplicacao> {
  for (const [nome, valor] of Object.entries(sobrescritas)) {
    process.env[nome] = valor;
  }

  const nest = await NestFactory.create(AppModule, {
    rawBody: true,
    // Só erro. `log` traria "conta criada", "conectado ao PostgreSQL" e o
    // roteamento inteiro a cada arquivo; `warn` traria os avisos esperados de
    // divergência de valor e estorno, que são o comportamento sob teste.
    logger: ['error'],
  });
  nest.setGlobalPrefix('api');

  await nest.init();
  await nest.listen(0);

  const prisma = nest.get(PrismaService);
  const servidor = nest.getHttpServer() as Server;

  return {
    nest,
    prisma,
    http: () => request(servidor),
    redefinir: () => redefinirBanco(prisma),
    encerrar: () => nest.close(),
  };
}

/** O par de tokens de um login real, mais o id de quem entrou. */
export interface Sessao {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly usuarioId: string;
}

/**
 * Login de verdade: `POST /api/auth/login`, argon2 verificado, JWT emitido.
 *
 * Não existe atalho que injete um token — e a ausência é deliberada. Um helper
 * que assinasse o JWT por fora pularia `decideLogin`, a verificação da senha e
 * o registro da sessão, que são três dos quatro comportamentos que os casos de
 * autenticação existem para provar. O quarto (o refresh revogável) precisa do
 * `refreshToken` que só o login devolve.
 */
export async function entrar(
  app: Aplicacao,
  email: string,
  senha: string = SENHA,
): Promise<Sessao> {
  const resposta = await app.http().post('/api/auth/login').send({ email, senha }).expect(201);

  const corpo = resposta.body as {
    accessToken: string;
    refreshToken: string;
    sessao: { usuario: { id: string } };
  };

  return {
    accessToken: corpo.accessToken,
    refreshToken: corpo.refreshToken,
    usuarioId: corpo.sessao.usuario.id,
  };
}

/** `Authorization: Bearer <token>`, para não repetir a string em cada caso. */
export function comToken(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}
