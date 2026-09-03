import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AMBIENTE, type Ambiente } from '../config/ambiente';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Saúde da API — o que `/health` responde.
 *
 * ## Por que a contagem de migrations entra
 *
 * "A API responde" e "o banco tem o schema que esta versão da API espera" são
 * perguntas diferentes, e a segunda é a que quebra em deploy. Um banco vazio
 * aceita conexão e responde `SELECT 1` — e a primeira consulta real falha com
 * "relation does not exist". Contar as migrations aplicadas transforma isso em
 * um número que o `docker compose` e o painel de deploy conseguem olhar.
 *
 * ## Por que nunca lança
 *
 * `/health` que responde `500` quando o banco cai é `/health` que não informa
 * nada: o orquestrador vê "erro" e não sabe se é a API ou o banco. Aqui o corpo
 * distingue — `status: degradado`, `banco: indisponivel` — e o código HTTP
 * continua `200`, porque a API está de pé o suficiente para responder isso.
 */
export interface Saude {
  status: 'ok' | 'degradado';
  banco: 'ok' | 'indisponivel';
  versao: string;
  migrationsAplicadas: number;
}

@Injectable()
export class SaudeService {
  private readonly log = new Logger(SaudeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AMBIENTE) private readonly ambiente: Ambiente,
  ) {}

  async verificar(): Promise<Saude> {
    const bancoOk = await this.bancoResponde();
    const migrationsAplicadas = bancoOk ? await this.contarMigrations() : 0;

    return {
      status: bancoOk && migrationsAplicadas > 0 ? 'ok' : 'degradado',
      banco: bancoOk ? 'ok' : 'indisponivel',
      versao: this.ambiente.versao,
      migrationsAplicadas,
    };
  }

  private async bancoResponde(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      return true;
    } catch (erro: unknown) {
      this.log.error(
        `banco indisponível: ${erro instanceof Error ? erro.message : 'motivo desconhecido'}`,
      );
      return false;
    }
  }

  /**
   * `_prisma_migrations` é tabela do Prisma, não do nosso schema — por isso a
   * consulta é crua. `finished_at IS NOT NULL` conta só o que terminou: uma
   * migration em andamento ou revertida não deve aparecer como aplicada.
   *
   * A tabela não existe num banco criado por `prisma db push` (que não registra
   * migration). Nesse caso a contagem é zero e o status vira `degradado` — que é
   * a informação certa: o banco está de pé, mas não pelo caminho que produção
   * usa.
   */
  private async contarMigrations(): Promise<number> {
    try {
      const linhas = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`,
      );
      // `COUNT` volta como `bigint` no driver do PostgreSQL, e `bigint` não
      // serializa em JSON — daí a conversão explícita.
      return Number(linhas[0]?.total ?? 0n);
    } catch {
      return 0;
    }
  }
}
