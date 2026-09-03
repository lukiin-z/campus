import { z } from 'zod';

/**
 * Schemas que existem só no servidor.
 *
 * `credenciaisSchema`, `cadastroSchema` e `entradaOnboardingSchema` moram em
 * `@campus/shared` porque o formulário os usa. O refresh não: ele nunca é
 * digitado por ninguém, não tem campo de tela e não existe no CP5 — o token
 * opaco daquele checkpoint morria com a aba. Um schema desses em
 * `packages/shared` seria contrato compartilhado com um lado só.
 *
 * O piso de 20 caracteres não valida forma: o refresh são 48 bytes em
 * base64url (64 caracteres). O limite serve para recusar corpo vazio ou
 * `"undefined"` antes de gastar um `SELECT` com hash.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(20, 'Sessão inválida. Entre de novo.'),
});

export type RefreshEntrada = z.infer<typeof refreshSchema>;
