import { Injectable } from '@nestjs/common';
import type { Notificacao } from '@campus/shared';
import { NaoEncontrado } from '../comum/erros';
import { paraNotificacao } from '../comum/mapeadores';
import type { Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notificações — RF-040.
 *
 * Este serviço só LÊ e marca como lida. Quem escreve notificação são as funções
 * de `comum/avisos.ts`, chamadas dentro da transação que causou o aviso — a vaga
 * é oferecida e o aviso é gravado no mesmo commit. Ver o cabeçalho de
 * `avisos.ts` para o porquê.
 *
 * `referenciaId` não tem chave estrangeira, de propósito: ele aponta para
 * tabelas diferentes conforme o tipo (evento, participação, publicação). O
 * consumidor trata "não encontrado" como caminho normal, e é por isso que a
 * listagem não faz `join` nenhum.
 */
@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(titular: Titular): Promise<Notificacao[]> {
    const linhas = await this.prisma.notificacao.findMany({
      where: { destinatarioId: titular.id },
      orderBy: { criadoEm: 'desc' },
    });
    return linhas.map(paraNotificacao);
  }

  /**
   * `updateMany` com o destinatário no `WHERE`, e não `update` por id.
   *
   * A diferença é de segurança: `update({ where: { id } })` marcaria como lida a
   * notificação de outra pessoa. Com o destinatário no filtro, a linha de
   * outrem simplesmente não casa — e `count === 0` vira `404`, indistinguível
   * de "não existe".
   */
  async marcarComoLida(notificacaoId: string, titular: Titular): Promise<void> {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { id: notificacaoId, destinatarioId: titular.id },
      data: { lida: true },
    });

    if (count === 0) throw new NaoEncontrado('Notificação não encontrada.', 'NAO_ENCONTRADA');
  }

  /** Idempotente: marcar todas duas vezes não é erro e não muda nada. */
  async marcarTodasComoLidas(titular: Titular): Promise<void> {
    await this.prisma.notificacao.updateMany({
      where: { destinatarioId: titular.id, lida: false },
      data: { lida: true },
    });
  }
}
