import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * `@Global` porque todo módulo de domínio fala com o banco, e repetir
 * `imports: [PrismaModule]` em nove módulos não documenta nada — só adiciona
 * uma linha que ninguém lê. A exceção ao "sem módulo global" se justifica em
 * infraestrutura que é premissa de todo o resto.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
