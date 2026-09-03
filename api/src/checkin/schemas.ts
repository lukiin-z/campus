import { z } from 'zod';

/**
 * RN-018 — presença registrada à mão exige motivo.
 *
 * O piso de 10 caracteres é o mesmo do cancelamento de evento, pela mesma razão:
 * "ok" não é registro de correção. Quem audita a lista de presença precisa saber
 * por que aquela pessoa entrou sem leitura — câmera quebrada, ingresso no
 * celular descarregado, nome na lista impressa.
 *
 * Fica no servidor porque a tela do organizador é do CP6 e ainda não existe;
 * quando existir, o schema muda de arquivo para `packages/shared`.
 */
export const presencaManualSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com pelo menos 10 caracteres.')
    .max(400, 'O motivo cabe em 400 caracteres.'),
});

export type PresencaManualEntrada = z.infer<typeof presencaManualSchema>;
