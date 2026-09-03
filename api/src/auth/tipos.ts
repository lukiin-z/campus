import type { SessaoUsuario } from '@campus/shared';

/**
 * A resposta de `/auth/cadastro`, `/auth/login` e `/auth/refresh`.
 *
 * ## Divergência declarada com `@campus/shared`
 *
 * `ResultadoLogin` do pacote compartilhado é `{ token, sessao }` — a forma do
 * CP5, quando o "token" era opaco e a sessão morria com a aba. O contrato do
 * CP6 (`api/openapi.yaml`, schema `ResultadoLogin`) tem quatro campos:
 * `accessToken`, `refreshToken`, `expiraEm` e `sessao`. Isto existe porque o
 * refresh precisa ser **revogável** (RNF-020), e um token só não dá para ser ao
 * mesmo tempo curto (15 min) e persistente entre sessões.
 *
 * O contrato de rota é a autoridade sobre a forma da resposta, então é ele que
 * está implementado. Alinhar o tipo do pacote é mudança em
 * `packages/shared/src/types.ts`, que é de outra lane — e uma vez alinhado, este
 * arquivo desaparece.
 */
export interface ResultadoLoginApi {
  accessToken: string;
  refreshToken: string;
  /** Segundos de validade do access token. */
  expiraEm: number;
  sessao: SessaoUsuario;
}

/** O par de tokens sem a sessão — o que o serviço de token sabe produzir. */
export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
  expiraEm: number;
}

/** Conteúdo do JWT de acesso. Nada de vínculo aqui: ver `comum/titular.ts`. */
export interface ConteudoDoToken {
  sub: string;
  email: string;
}
