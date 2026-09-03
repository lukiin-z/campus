import {
  STATUS_PARTICIPACAO,
  isActive,
  occupiesSpot,
  type StatusParticipacao,
} from '@campus/shared';

/**
 * Listas de status para o `WHERE` do banco — **derivadas** das funções de
 * domínio, nunca escritas à mão.
 *
 * A tentação é escrever `status: { in: ['CONFIRMADA', 'PRESENTE', ...] }` no
 * lugar de uso. O problema aparece na primeira mudança: `OFERTA_PENDENTE`
 * passou a ocupar vaga (RN-007) e `occupiesSpot` foi atualizada com teste; um
 * array literal num `WHERE` não teria sido atualizado, e a contagem de
 * `ocupadas` teria ficado uma vaga curta em todo evento com fila.
 *
 * Então a fonte é a mesma função que decide na tela: aqui só se traduz o
 * predicado em lista, para o SQL poder usá-la.
 */

/** RN-015 — os cinco status que contam como participação ativa. */
export const STATUS_ATIVOS: readonly StatusParticipacao[] = STATUS_PARTICIPACAO.filter(isActive);

/** RN-004 — os quatro status que consomem uma vaga do evento. */
export const STATUS_QUE_OCUPAM: readonly StatusParticipacao[] =
  STATUS_PARTICIPACAO.filter(occupiesSpot);

/** `readonly` não entra no `in` do Prisma; a cópia mutável é para o `WHERE`. */
export function listaAtivos(): StatusParticipacao[] {
  return [...STATUS_ATIVOS];
}

export function listaQueOcupam(): StatusParticipacao[] {
  return [...STATUS_QUE_OCUPAM];
}
