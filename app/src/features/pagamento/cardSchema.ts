import { z } from 'zod';
import type { desfechoDeterministico } from '../../domain/pix';
import { bandeiraDoCartao, cvvValido, luhnValido, validadeNoFuturo } from '../../domain/pix';

/**
 * Validação do formulário de cartão (RF-029).
 *
 * O schema CHAMA o domínio em vez de reimplementar Luhn, validade e CVV — mesmo
 * padrão de domain/eventSchema.ts. Se a regra mudar em `domain/pix.ts`, a tela
 * muda com ela; não há como as duas divergirem.
 */

export const cardSchema = z
  .object({
    numero: z
      .string()
      .trim()
      .min(1, 'Informe o número do cartão.')
      .refine(
        (valor) => luhnValido(valor),
        'Este número de cartão não existe. Confira os dígitos.',
      ),
    titular: z
      .string()
      .trim()
      .min(3, 'Informe o nome impresso no cartão.')
      .max(60, 'O nome do titular cabe em 60 caracteres.'),
    validade: z
      .string()
      .trim()
      .min(1, 'Informe a validade.')
      .refine(
        (valor) => validadeNoFuturo(valor, new Date()),
        'Validade no formato MM/AA, ainda no futuro.',
      ),
    cvv: z.string().trim().min(1, 'Informe o código de segurança.'),
  })
  .superRefine((valores, ctx) => {
    // O tamanho do CVV depende da bandeira (Amex tem 4 dígitos), então esta
    // verificação precisa dos dois campos juntos — não cabe no campo isolado.
    const bandeira = bandeiraDoCartao(valores.numero);
    if (!cvvValido(valores.cvv, bandeira)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cvv'],
        message:
          bandeira === 'Amex'
            ? 'O código de segurança da Amex tem 4 dígitos.'
            : 'O código de segurança tem 3 dígitos.',
      });
    }
  });

export type CardFormValues = z.input<typeof cardSchema>;

/** O que o gateway simulado fará com um número — a fonte é `domain/pix.ts`. */
export type GatewayPrediction = ReturnType<typeof desfechoDeterministico>;

export interface TestCard {
  numero: string;
  rotulo: string;
  efeito: string;
}

/**
 * Cartões de demonstração.
 *
 * Os dois passam por `luhnValido` (verificado com a própria função antes de
 * entrarem aqui) e o último dígito escolhe o desfecho em
 * `desfechoDeterministico`: terminado em 1 recusa, o resto aprova. É o que
 * permite demonstrar a recusa de RF-030 sem depender de sorte.
 */
export const TEST_CARDS: TestCard[] = [
  {
    numero: '5555 5555 5555 4444',
    rotulo: 'Aprova',
    efeito: 'Termina em 4: o gateway simulado aprova e a vaga é confirmada.',
  },
  {
    numero: '4111 1111 1111 1111',
    rotulo: 'Recusa',
    efeito: 'Termina em 1: o gateway simulado recusa e a vaga segue pendente.',
  },
];

/**
 * Agrupa em blocos de 4 enquanto a pessoa digita. Amex é impressa 4-6-5, mas o
 * bloco uniforme continua legível e evita um caso especial no campo — o que
 * importa para conferir dígito é o agrupamento existir.
 */
export function formatCardNumber(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 19);
  return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** `MM/AA` com a barra inserida sozinha: ninguém digita barra em teclado numérico. */
export function formatExpiry(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}
