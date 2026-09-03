#!/usr/bin/env node
/**
 * As rotas que a API SERVE e os caminhos que o `openapi.yaml` DECLARA concordam?
 *
 * ## Por que este script existe
 *
 * Porque `api/src/main.ts` afirmava que essa verificação existia:
 *
 * > "Ele e o `api/openapi.yaml` têm de concordar na lista de caminhos — é a
 * > verificação que impede o contrato escrito e as rotas servidas divergirem."
 *
 * E não existia. Era um comentário descrevendo uma verificação nunca escrita —
 * o mesmo padrão que o CP5 documentou cinco vezes: a função escrita, testada e
 * nunca chamada, que *parece* coberta. Um contrato que ninguém confere é pior do
 * que contrato nenhum, porque alguém escreve cliente contra ele.
 *
 * ## Como ele descobre a verdade
 *
 * Subindo a aplicação de verdade e pedindo o documento ao Swagger, que lê os
 * decoradores em tempo de execução. Um parser de decorador por texto erraria
 * nos dois pontos em que este projeto é irregular: sete controladores usam
 * `@Controller()` sem prefixo e dois usam prefixo (`notificacoes`, `health`).
 *
 * O `PrismaService` é substituído por um objeto inerte: a pergunta é sobre
 * roteamento, e exigir PostgreSQL para respondê-la tornaria a verificação
 * impossível no job da CI que não tem banco.
 *
 * ## Por que o YAML é lido com regex e não com um parser
 *
 * `js-yaml` existe em `node_modules` como dependência transitiva de outra coisa
 * — depender dela seria depender de um detalhe da árvore de alguém. Os caminhos
 * do `openapi.yaml` estão todos em indentação de dois espaços sob `paths:`, e o
 * arquivo é nosso: a regex é suficiente e não acrescenta dependência.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const vermelho = (t) => `[31m${t}[0m`;
const verde = (t) => `[32m${t}[0m`;
const cinza = (t) => `[90m${t}[0m`;

/**
 * Caminhos declarados no contrato, na forma do OpenAPI (`/eventos/{id}`).
 *
 * Exportada porque `app/src/services/api/index.test.ts` confere o cliente HTTP
 * contra a mesma lista. Duas cópias desta leitura divergiriam na primeira
 * mudança de formatação do YAML — e a divergência apareceria como teste verde
 * sobre contrato errado.
 */
export function caminhosDeclarados() {
  const texto = readFileSync(join(raiz, 'api/openapi.yaml'), 'utf8');
  const inicio = texto.indexOf('\npaths:');
  if (inicio === -1) throw new Error('openapi.yaml sem seção `paths:`');

  const depois = texto.slice(inicio + 1);
  // A seção termina na próxima chave de primeiro nível (`components:`).
  const fim = depois.search(/\n[a-z]/);
  const secao = fim === -1 ? depois : depois.slice(0, fim);

  return new Set([...secao.matchAll(/^ {2}(\/[^\s:]*):/gm)].map((m) => m[1]));
}

/**
 * Os métodos HTTP declarados para cada caminho, em maiúsculas.
 *
 * `Map<'/eventos/{id}', ['GET', 'PATCH']>`. Usada pelo teste do cliente HTTP:
 * conferir só o caminho deixaria passar verbo errado num caminho que existe —
 * que foi exatamente o defeito de `regerarCodigoConvite`, `GET` onde a API
 * serve `POST`.
 *
 * A leitura continua sendo por texto, e por bloco: um método é uma linha de
 * quatro espaços com um dos verbos, dentro do bloco de um caminho.
 */
export function metodosDeclarados() {
  const texto = readFileSync(join(raiz, 'api/openapi.yaml'), 'utf8');
  const inicio = texto.indexOf('\npaths:');
  const depois = texto.slice(inicio + 1);
  const fim = depois.search(/\n[a-z]/);
  const secao = fim === -1 ? depois : depois.slice(0, fim);

  const porCaminho = new Map();
  let atual = null;
  for (const linha of secao.split('\n')) {
    const caminho = /^ {2}(\/[^\s:]*):/.exec(linha);
    if (caminho) {
      atual = caminho[1];
      porCaminho.set(atual, []);
      continue;
    }
    const metodo = /^ {4}(get|post|put|patch|delete|head|options):/.exec(linha);
    if (metodo && atual !== null) porCaminho.get(atual).push(metodo[1].toUpperCase());
  }
  return porCaminho;
}

/** Caminhos que o Nest realmente registrou, normalizados para a forma do OpenAPI. */
async function caminhosServidos() {
  const { Test } = require('@nestjs/testing');
  const { AppModule } = require(join(raiz, 'api/dist/app.module.js'));
  const { PrismaService } = require(join(raiz, 'api/dist/prisma/prisma.service.js'));
  const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');

  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({
      // Inerte: nada aqui é chamado durante o registro de rotas. Se algum dia
      // for, a falha aparece como método ausente — e é melhor falhar assim do
      // que exigir um banco para conferir roteamento.
      $connect: async () => {},
      $disconnect: async () => {},
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
    })
    .compile();

  const aplicacao = modulo.createNestApplication({ logger: false });
  aplicacao.setGlobalPrefix('api');
  await aplicacao.init();

  const documento = SwaggerModule.createDocument(
    aplicacao,
    new DocumentBuilder().setTitle('x').setVersion('0').build(),
  );

  await aplicacao.close();

  /*
   * O Swagger devolve `/api/eventos/{id}` porque o prefixo global entra no
   * documento; o `openapi.yaml` declara `/eventos/{id}` e põe o `/api` no
   * `servers`. As duas formas dizem a mesma coisa, e comparar sem normalizar
   * acusaria 43 divergências falsas.
   */
  return new Set(Object.keys(documento.paths).map((c) => c.replace(/^\/api/, '')));
}

/*
 * Exceções, e cada uma precisa de razão escrita.
 *
 * Do lado do contrato não há nenhuma, e isso é o estado desejado: caminho
 * declarado e não servido é 404 na cara de quem escreveu o cliente. O conjunto
 * existe vazio para que acrescentar uma exija justificar aqui.
 */
const TOLERADOS_NO_CONTRATO = new Set([]);
const TOLERADOS_NA_API = new Set([
  // O Swagger serve a própria página de documentação; ela não é parte do
  // contrato de dados e não deve ser declarada nele.
  '/docs',
]);

/*
 * Executado como script? Então compara. Importado por um teste? Então só
 * oferece as funções, sem imprimir nem chamar `process.exit`.
 */
const invocadoDireto =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invocadoDireto) {
  try {
    const declarados = caminhosDeclarados();
    const servidos = await caminhosServidos();

    const soNoContrato = [...declarados]
      .filter((c) => !servidos.has(c))
      .filter((c) => !TOLERADOS_NO_CONTRATO.has(c));
    const soNaApi = [...servidos]
      .filter((c) => !declarados.has(c))
      .filter((c) => !TOLERADOS_NA_API.has(c));

    console.log('');
    console.log(`  ${declarados.size} caminhos declarados no openapi.yaml`);
    console.log(`  ${servidos.size} caminhos registrados pela aplicação`);

    if (soNoContrato.length === 0 && soNaApi.length === 0) {
      console.log('');
      console.log(`  ${verde('contrato e rotas servidas concordam')}`);
      process.exit(0);
    }

    console.log('');
    if (soNoContrato.length > 0) {
      console.log(`  ${vermelho('declarados no contrato e NÃO servidos:')}`);
      for (const c of soNoContrato.sort()) console.log(`    ${c}`);
      console.log(cinza('    → um cliente escrito contra o contrato receberia 404.'));
    }
    if (soNaApi.length > 0) {
      console.log(`  ${vermelho('servidos e NÃO declarados no contrato:')}`);
      for (const c of soNaApi.sort()) console.log(`    ${c}`);
      console.log(cinza('    → rota sem contrato é rota que ninguém sabe que existe.'));
    }
    console.log('');
    process.exit(1);
  } catch (erro) {
    console.error('');
    console.error(`  ${vermelho('não foi possível comparar:')} ${erro.message}`);
    console.error(cinza('  Este script depende de `npm run build -w campus-api` (lê api/dist).'));
    console.error('');
    process.exit(1);
  }
}
