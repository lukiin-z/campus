import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * O cliente do Prisma como serviço injetável.
 *
 * `onModuleInit` conecta explicitamente em vez de deixar a primeira consulta
 * conectar sozinha: o custo é o mesmo e a diferença é onde a falha aparece.
 * Banco indisponível no boot vira erro de boot; banco indisponível na primeira
 * requisição vira `500` para um usuário.
 *
 * `onModuleDestroy` fecha o pool. Sem isso, o `nest start --watch` acumula
 * conexões a cada recompilação até o PostgreSQL recusar novas — e o sintoma
 * ("too many clients") aparece meia hora depois, longe da causa.
 *
 * ## `errorFormat: 'minimal'`
 *
 * No formato padrão o Prisma embute um **trecho do código-fonte** que fez a
 * chamada dentro da mensagem de erro. `comum/prisma-erros.ts` procura nomes de
 * restrição (`ux_*`, `ck_*`) no texto do erro — e passava a encontrá-los em
 * COMENTÁRIOS próximos da chamada. A tradução acertava lendo o comentário, o
 * que é indistinguível de acertar de verdade até o comentário mudar.
 *
 * E não é só em desenvolvimento: `api/tsconfig.json` tem `removeComments:
 * false`, então os comentários de `api/src/**` estão no `dist` que roda em
 * produção.
 *
 * Foi medido: com o formato padrão, um `P2002` de e-mail duplicado dava
 * `nomeNaMensagem=true` só porque a string `usuario_email_key` aparecia no
 * arquivo que chamou; com `minimal`, `false`. Uma linha, e a tradução passa a
 * depender apenas do que o banco disse.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  constructor() {
    super({ errorFormat: 'minimal' });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.log.log('conectado ao PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Fecha o pool quando o processo recebe sinal de término.
   *
   * `app.enableShutdownHooks()` do Nest cobre o caso normal; este método existe
   * para quem sobe a aplicação fora do `bootstrap` padrão (um job agendado
   * chamando `ExpiracaoService`, por exemplo) e precisa encerrar sem deixar
   * conexão pendurada.
   */
  async encerrar(): Promise<void> {
    await this.$disconnect();
  }
}
