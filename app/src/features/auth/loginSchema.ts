import { z } from 'zod';
import {
  SENHA_MINIMA,
  dominioInstitucional,
  emailBemFormado,
  senhaAceitavel,
} from '../../domain/auth';

/**
 * Validação do formulário de login (RF-002, RF-003, RN-002).
 *
 * O schema é conveniência de formulário: as três regras — sintaxe do e-mail,
 * domínio institucional e piso da senha — continuam nas funções puras de
 * `domain/auth.ts`, e o schema as CHAMA em vez de reimplementar. É a mesma
 * política de `domain/eventSchema.ts` (ADR-0004): validação de tela e regra de
 * servidor não podem divergir.
 *
 * É uma fábrica, e não uma constante, porque a lista de domínios aceitos é dado
 * da faculdade (`useFaculdade`), não constante do código — uma segunda
 * instituição não exige deploy.
 */

export interface LoginFormValues {
  email: string;
  senha: string;
}

export function criarLoginSchema(dominios: readonly string[]) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail institucional.')
      .refine(emailBemFormado, 'Esse e-mail está incompleto. Falta o @ ou o domínio.')
      // A mensagem nomeia o domínio aceito porque "e-mail inválido" não diz o
      // que fazer: quem tentou o Gmail precisa saber que existe um endereço da
      // faculdade. Mesmo texto que o 422 do servidor devolve.
      .refine((email) => dominioInstitucional(email, dominios), {
        message: `Use seu e-mail institucional (${dominios.map((d) => `@${d}`).join(', ')}).`,
      }),
    senha: z
      .string()
      .min(1, 'Informe sua senha.')
      .refine(senhaAceitavel, `A senha tem no mínimo ${SENHA_MINIMA} caracteres.`),
  });
}
