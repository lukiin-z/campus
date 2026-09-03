/*
 * A resposta de `/auth/cadastro`, `/auth/login` e `/auth/refresh` é
 * `TokensDeSessao`, de `@campus/shared`.
 *
 * Havia aqui um `ResultadoLoginApi` local, com a mesma forma, e um comentário
 * dizendo que ele desapareceria assim que o pacote tivesse o tipo. O pacote
 * passou a ter, e ele desapareceu: duas verdades sobre o MESMO corpo de resposta
 * é precisamente o que a ADR-0008 existe para impedir, e a idade da divergência
 * (um checkpoint) não a torna aceitável.
 *
 * `ResultadoLogin` do pacote continua existindo e é OUTRA coisa: `{ token,
 * sessao }`, o que a camada de dados do app entrega às telas. Dois nomes para
 * duas formas reais é o oposto de duplicação.
 */

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
