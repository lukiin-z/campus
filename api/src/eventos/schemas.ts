import { POLICY, isoDateTime } from '@campus/shared';
import { z } from 'zod';

/**
 * Schemas de escrita que ainda não têm formulário no app.
 *
 * `novoEventoSchema` e `filtroEventosSchema` moram em `@campus/shared` porque
 * o formulário de criação e a barra de filtros os usam. Edição e cancelamento
 * são telas do CP6 (RF-020, RF-021): enquanto não existirem, o schema é só do
 * servidor. Quando a tela nascer, ele **muda de arquivo** — não é copiado.
 *
 * A prova de que essa mudança é possível sem susto: nenhum limite aqui é
 * literal solto. `POLICY` é a mesma fonte que `novoEventoSchema` usa.
 */

const textoAparado = (min: number, max: number, rotulo: string) =>
  z
    .string()
    .trim()
    .min(min, `${rotulo} precisa de pelo menos ${min} caracteres.`)
    .max(max, `${rotulo} cabe em ${max} caracteres.`);

/**
 * Subconjunto editável de um evento — RN-023.
 *
 * `alcance` **não** entra: mudá-lo depois de publicado tiraria a visibilidade de
 * quem já se inscreveu (RN-002 trata a redução de alcance como caso de cancelar
 * e criar outro). `capacidade` entra, mas a redução abaixo de `ocupadas` é
 * recusada pelo serviço com `canChangeCapacity` — é regra de estado, não de
 * forma, então não caberia aqui (RN-005).
 *
 * `.strict()` porque um `PATCH` que ignora campo desconhecido em silêncio faz o
 * cliente acreditar que salvou o que não salvou. Um `alcance` enviado por
 * engano recebe `422`, e o autor descobre na hora.
 */
export const edicaoEventoSchema = z
  .object({
    titulo: textoAparado(4, 120, 'O título').optional(),
    descricao: textoAparado(20, 2000, 'A descrição').optional(),
    inicio: isoDateTime.optional(),
    fim: isoDateTime.optional(),
    local: textoAparado(3, 160, 'O local').optional(),
    capacidade: z
      .number()
      .int('A capacidade é um número inteiro.')
      .min(POLICY.MIN_CAPACITY, `Um evento precisa de pelo menos ${POLICY.MIN_CAPACITY} vagas.`)
      .max(POLICY.MAX_CAPACITY, `A capacidade máxima é ${POLICY.MAX_CAPACITY}.`)
      .optional(),
    prazoInscricao: isoDateTime.optional(),
    prazoCancelamento: isoDateTime.optional(),
  })
  .strict()
  .refine((valor) => Object.keys(valor).length > 0, {
    message: 'Informe pelo menos um campo para alterar.',
  });

export type EdicaoEventoEntrada = z.infer<typeof edicaoEventoSchema>;

/**
 * RN-021 — cancelar exige motivo, e o motivo é lido por quem se inscreveu.
 *
 * O piso de 10 caracteres não é burocracia: "cancelado" não explica nada a quem
 * reservou a tarde. O `CHECK` `ck_evento_cancelado_tem_motivo` garante que a
 * coluna não fique nula; o piso garante que ela não fique inútil.
 */
export const cancelamentoEventoSchema = z.object({
  motivo: textoAparado(10, 400, 'O motivo'),
});

export type CancelamentoEntrada = z.infer<typeof cancelamentoEventoSchema>;
