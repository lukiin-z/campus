import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { AMBIENTE, ConfiguracaoInvalidaError, type Ambiente } from './config/ambiente';
import { PrismaService } from './prisma/prisma.service';

/**
 * Subida da API.
 *
 * ## `rawBody: true`
 *
 * O webhook de pagamento verifica um HMAC sobre os bytes que o gateway enviou.
 * Sem o corpo bruto, a única alternativa seria assinar o JSON reserializado por
 * nós — que quebra na primeira diferença de ordem de chave. Ligar aqui é o que
 * torna a verificação de RN-014 possível.
 *
 * ## Prefixo `/api` e o Swagger
 *
 * O contrato declara o servidor como `http://localhost:3000/api`, então o
 * prefixo global é `api` e todo caminho do `openapi.yaml` vive sob ele. O
 * Swagger é montado em `api/docs` **com o prefixo escrito à mão**: o
 * `SwaggerModule.setup` não passa pelo prefixo global, e `setup('docs')` serviria
 * em `/docs`.
 *
 * ## Por que não há `ValidationPipe` global
 *
 * A validação é por rota, com o schema Zod de `@campus/shared` (ver
 * `comum/validacao.pipe.ts`). Um pipe global precisaria de metadado dizendo
 * qual schema usar — que é o DTO com decorators que estamos evitando.
 */
async function bootstrap(): Promise<void> {
  const log = new Logger('bootstrap');

  const aplicacao = await NestFactory.create(AppModule, { rawBody: true });
  const ambiente = aplicacao.get<Ambiente>(AMBIENTE);

  aplicacao.setGlobalPrefix('api');

  // Cabeçalhos de segurança padrão. `contentSecurityPolicy` fica desligada
  // porque a API só serve JSON e a página do Swagger precisa de script inline;
  // CSP para JSON não protege nada e quebraria `/api/docs`.
  aplicacao.use(helmet({ contentSecurityPolicy: false }));

  aplicacao.enableCors({
    origin: [...ambiente.origensCors],
    // O refresh vai no CORPO, não em cookie (ver `auth/sessoes.service.ts`), então
    // a API não precisa de credencial de origem cruzada.
    credentials: false,
  });

  /*
   * O documento é gerado do código em execução, o que o torna a única fonte que
   * não pode mentir sobre quais rotas existem.
   *
   * Ele e o `api/openapi.yaml` têm de concordar na lista de caminhos, e essa
   * concordância é VERIFICADA por `scripts/check-rotas.mjs` (`npm run
   * check:rotas`), que sobe a aplicação, pede este mesmo documento e compara os
   * dois conjuntos. Até o CP6 este comentário afirmava que a verificação
   * existia, e ela não existia — o script nasceu de reler esta frase e procurar
   * por ela.
   */
  const documento = SwaggerModule.createDocument(
    aplicacao,
    new DocumentBuilder()
      .setTitle('Campus API')
      .setDescription(
        'Eventos universitários com alcance segmentado por turma, curso e faculdade. ' +
          'Duas convenções valem em todo o contrato: 404 para invisível (revelar a ' +
          'existência já é vazamento de alcance) e 409 para conflito com o estado atual ' +
          'versus 422 para regra de negócio violada.',
      )
      .setVersion(ambiente.versao)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build(),
  );
  SwaggerModule.setup('api/docs', aplicacao, documento);

  // Fecha o pool do Prisma em SIGTERM/SIGINT. Sem isso, cada reinício em
  // desenvolvimento deixa conexões penduradas até o PostgreSQL recusar novas.
  aplicacao.enableShutdownHooks();
  aplicacao.get(PrismaService, { strict: false });

  await aplicacao.listen(ambiente.PORT);
  log.log(`Campus API em http://localhost:${ambiente.PORT}/api (${ambiente.NODE_ENV})`);
  log.log(`Contrato servido em http://localhost:${ambiente.PORT}/api/docs`);
}

/*
 * Configuração inválida derruba o processo com a lista do que falta, e nada
 * mais. É o comportamento pedido: uma API que sobe sem `JWT_SECRET` assina
 * token que qualquer pessoa forja (RNF-020), e é pior do que uma API que não
 * sobe.
 *
 * `console.error` e não `Logger`: neste ponto o contexto do Nest pode não
 * existir, e a mensagem precisa chegar ao terminal de quem tentou subir.
 */
bootstrap().catch((erro: unknown) => {
  if (erro instanceof ConfiguracaoInvalidaError) {
    // eslint-disable-next-line no-console -- o Logger do Nest pode não existir aqui
    console.error(`\n${erro.message}\n`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- idem
  console.error(erro);
  process.exit(1);
});
