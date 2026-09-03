import { Prisma } from '@prisma/client';
import { NaoEncontrado } from './erros';

/**
 * Cliente do banco que aceita transação. `Prisma.TransactionClient` é o
 * `PrismaClient` sem `$transaction`/`$connect`, e o `PrismaService` é
 * atribuível a ele — então um método que recebe isto funciona dentro e fora de
 * transação, sem sobrecarga e sem `any`.
 */
export type ClienteBanco = Prisma.TransactionClient;

/**
 * `SELECT ... FOR UPDATE` sobre a linha do evento — o ponto mais crítico da API.
 *
 * ## O problema, concretamente
 *
 * Duas pessoas tocam "inscrever" no mesmo instante num evento com 40 vagas e
 * `ocupadas = 39`. Sem trava de linha:
 *
 * 1. requisição A lê `ocupadas = 39` → `isFull` diz que há vaga;
 * 2. requisição B lê `ocupadas = 39` → `isFull` diz que há vaga;
 * 3. A insere a participação e escreve `ocupadas = 40`;
 * 4. B insere a participação e escreve `ocupadas = 40`.
 *
 * Resultado: 41 pessoas com vaga em 40 lugares. As duas transações são
 * individualmente corretas, e `READ COMMITTED` — o padrão do PostgreSQL — não
 * as impede: nenhuma das duas leu dado sujo.
 *
 * ## Por que `FOR UPDATE`, e por que ANTES de contar
 *
 * `FOR UPDATE` na linha do evento serializa as duas transações **nesta linha**:
 * B fica bloqueada no passo 2 até A confirmar, e então lê `ocupadas = 40` e
 * recebe `409 SEM_VAGA` com ação de fila. É por isso que a trava vem antes de
 * qualquer leitura de contagem — travar depois de ler é ler o valor velho.
 *
 * A trava é por evento, não global: inscrições em eventos diferentes não se
 * esperam. É o que mantém a garantia sem transformar a operação mais frequente
 * do produto num gargalo (RNF-013).
 *
 * ## Por que `$queryRaw`
 *
 * O Prisma não expressa `FOR UPDATE` na API fluente — não há
 * `findUnique({ lock: … })`. O `$queryRaw` com template marcado é
 * parametrizado (`$1`), então o id não é concatenado no SQL. Só o `id` volta:
 * a linha completa vem depois, pelo cliente tipado, para não haver mapeamento
 * manual de coluna.
 *
 * ## O `CHECK` continua sendo necessário
 *
 * `ck_evento_ocupadas_le_capacidade` é a última defesa, e ela produz `500` se
 * chegar a disparar — `comum/prisma-erros.ts` traduz para `409 SEM_VAGA`
 * justamente porque `500` mentiria para o cliente. Mas o desenho é que ela
 * nunca dispare: quem garante o comportamento certo é esta trava.
 */
export async function travarEvento(cliente: ClienteBanco, eventoId: string): Promise<void> {
  const travadas = await cliente.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "evento" WHERE "id" = ${eventoId}::uuid FOR UPDATE`,
  );

  /*
   * Zero linhas significa que o evento não existe. Recusar aqui evita uma
   * transação que segue adiante e falha por chave estrangeira — e devolve 404,
   * que é a resposta certa tanto para "não existe" quanto para "não é seu"
   * (RN-001, RNF-012).
   */
  if (travadas.length === 0) {
    throw new NaoEncontrado('Evento não encontrado.');
  }
}

/**
 * Trava a participação. Usada onde a corrida é por uma participação específica
 * — confirmar a oferta, abrir cobrança, registrar presença — e não pela vaga do
 * evento. Dois toques no botão "confirmar" são o caso comum, não o exótico.
 */
export async function travarParticipacao(
  cliente: ClienteBanco,
  participacaoId: string,
): Promise<void> {
  const travadas = await cliente.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "participacao" WHERE "id" = ${participacaoId}::uuid FOR UPDATE`,
  );

  if (travadas.length === 0) {
    throw new NaoEncontrado('Inscrição não encontrada.');
  }
}
