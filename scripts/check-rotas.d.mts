/**
 * Tipos de `check-rotas.mjs`.
 *
 * O script é `.mjs` porque roda direto pelo Node no CI, sem passar por build.
 * `app/src/services/api/index.test.ts` o importa para conferir o cliente contra
 * a mesma leitura do contrato — e sem esta declaração o import entraria como
 * `any`, o que o `strict` do projeto reprova (e com razão: `any` importado é
 * `any` que se espalha).
 */

/** Caminhos declarados no `api/openapi.yaml`, na forma `/eventos/{id}`. */
export function caminhosDeclarados(): Set<string>;

/** Métodos HTTP declarados por caminho, em maiúsculas. */
export function metodosDeclarados(): Map<string, string[]>;
