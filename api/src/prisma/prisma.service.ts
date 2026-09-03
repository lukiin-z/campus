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
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

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
