import { z } from 'zod';
import { ALCANCE_EVENTO } from '../types/domain';
import { POLICY, validateDeadlines } from '@campus/shared';

/**
 * Validação do formulário de criação de evento (RF-010, RN-011).
 *
 * Este schema é conveniência de formulário. As regras de negócio continuam nas
 * funções puras de `domain/` — o schema as CHAMA em vez de reimplementar, para
 * que validação de tela e regra de servidor nunca divirjam.
 */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const eventFormSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(3, 'O título precisa ter pelo menos 3 caracteres.')
      .max(120, 'O título pode ter no máximo 120 caracteres.'),
    descricao: z
      .string()
      .trim()
      .max(4000, 'A descrição pode ter no máximo 4000 caracteres.')
      .default(''),
    alcance: z.enum(ALCANCE_EVENTO),
    data: z.string().min(1, 'Informe a data do evento.'),
    horaInicio: z.string().regex(HHMM, 'Informe o horário no formato 19:30.'),
    horaFim: z.string().regex(HHMM, 'Informe o horário no formato 22:00.'),
    local: z
      .string()
      .trim()
      .min(3, 'Informe onde o evento acontece.')
      .max(200, 'O local pode ter no máximo 200 caracteres.'),
    capacidade: z.coerce
      .number({ invalid_type_error: 'Informe a quantidade de vagas.' })
      .int('A quantidade de vagas precisa ser um número inteiro.')
      .min(POLICY.MIN_CAPACITY, `O mínimo é ${POLICY.MIN_CAPACITY} vagas.`)
      .max(POLICY.MAX_CAPACITY, `O máximo é ${POLICY.MAX_CAPACITY} vagas.`),
    gratuito: z.boolean().default(true),
    preco: z.coerce
      .number({ invalid_type_error: 'Informe o valor da inscrição.' })
      .min(0, 'O valor não pode ser negativo.')
      .max(POLICY.MAX_PRICE, 'Valor acima do permitido para evento universitário.')
      .default(0),
  })
  .superRefine((valores, ctx) => {
    // Evento pago precisa de valor maior que zero — do contrário é gratuito.
    if (!valores.gratuito && valores.preco <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preco'],
        message: 'Informe um valor maior que zero ou marque o evento como gratuito.',
      });
    }

    const inicio = combinarDataHora(valores.data, valores.horaInicio);
    const fim = combinarDataHora(valores.data, valores.horaFim);
    if (!inicio || !fim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data'],
        message: 'Data ou horário inválidos.',
      });
      return;
    }

    // RN-011: as desigualdades de prazo vêm do domínio, não daqui.
    const violacoes = validateDeadlines(
      {
        inicio,
        fim,
        prazoInscricao: inicio,
        prazoCancelamento: inicio,
      },
      new Date(),
    );

    for (const violacao of violacoes) {
      const path = violacao.field === 'inicio' ? ['data'] : ['horaFim'];
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: violacao.message });
    }
  });

export type EventFormValues = z.input<typeof eventFormSchema>;
export type EventFormParsed = z.output<typeof eventFormSchema>;

/** Junta `2026-09-12` + `13:00` em ISO 8601. Devolve `null` se inválido. */
export function combinarDataHora(data: string, hora: string): string | null {
  if (!data || !HHMM.test(hora)) return null;
  const composto = new Date(`${data}T${hora}:00`);
  if (Number.isNaN(composto.getTime())) return null;
  return composto.toISOString();
}
