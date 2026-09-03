import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Erros da API — o **código estável** e o status andam juntos.
 *
 * ## As duas convenções que explicam quase todo status deste projeto
 *
 * - **`404` para invisível.** Evento de turma acessado por quem não é da turma
 *   responde `404`, nunca `403`: revelar que o evento existe já é vazamento de
 *   alcance (RN-001, RNF-012). `403` só aparece onde a existência do recurso
 *   **já** é conhecida por quem pede — o organizador de outro evento tentando
 *   editar este, por exemplo.
 * - **`409` versus `422`.** `409` é conflito com o estado atual e pode deixar de
 *   acontecer: a vaga pode abrir. Por isso o `409` carrega `acao`, dizendo o
 *   que o cliente pode oferecer em seguida (`SEM_VAGA` traz `LISTA_ESPERA`).
 *   `422` é regra de negócio violada e não muda por espera.
 *
 * ## Por que o código é um campo, e não o texto da mensagem
 *
 * `erro` é SCREAMING_SNAKE_CASE e é contrato: é por ele que o cliente decide a
 * tela. `mensagem` é escrita para leitura humana e pode ser reescrita pelo time
 * de conteúdo sem quebrar ninguém. Cliente que compara `mensagem` está errado, e
 * o contrato diz isso explicitamente.
 */

export interface DetalheDeCampo {
  campo: string;
  mensagem: string;
}

/** A forma que o cliente recebe. Nenhuma resposta de erro tem outro shape. */
export interface CorpoDeErro {
  erro: string;
  mensagem: string;
  /** Só em alguns `409`: o que o cliente pode oferecer em seguida. */
  acao?: string;
  /** Só em `422` de validação: um item por campo recusado. */
  detalhes?: DetalheDeCampo[];
  /** Contexto extra do conflito (ex.: `totalFila` em `SEM_VAGA`). */
  [chave: string]: unknown;
}

export class ErroDeNegocio extends HttpException {
  constructor(
    status: HttpStatus,
    readonly codigo: string,
    mensagem: string,
    extra: Readonly<Record<string, unknown>> = {},
  ) {
    super({ erro: codigo, mensagem, ...extra } satisfies CorpoDeErro, status);
  }

  /** O corpo já montado, para o filtro não ter de reconstruí-lo. */
  corpo(): CorpoDeErro {
    return this.getResponse() as CorpoDeErro;
  }
}

/** `401` — token ausente, expirado ou inválido. */
export class NaoAutenticado extends ErroDeNegocio {
  constructor(codigo = 'NAO_AUTENTICADO', mensagem = 'Entre na sua conta para continuar.') {
    super(HttpStatus.UNAUTHORIZED, codigo, mensagem);
  }
}

/**
 * `403` — autenticado, sem competência sobre o recurso.
 *
 * Use só quando a existência do recurso já é conhecida por quem pede. Se a
 * pessoa não deveria nem saber que o recurso existe, o certo é `NaoEncontrado`.
 */
export class SemPermissao extends ErroDeNegocio {
  constructor(mensagem: string, codigo = 'SEM_PERMISSAO') {
    super(HttpStatus.FORBIDDEN, codigo, mensagem);
  }
}

/** `404` — não existe, **ou** está fora do alcance de quem pede. */
export class NaoEncontrado extends ErroDeNegocio {
  constructor(mensagem: string, codigo = 'NAO_ENCONTRADO') {
    super(HttpStatus.NOT_FOUND, codigo, mensagem);
  }
}

/** `409` — conflito com o estado atual. `acao` quando houver saída para o cliente. */
export class Conflito extends ErroDeNegocio {
  constructor(codigo: string, mensagem: string, extra: Readonly<Record<string, unknown>> = {}) {
    super(HttpStatus.CONFLICT, codigo, mensagem, extra);
  }
}

/** `422` — regra de negócio violada. Não muda por espera. */
export class RegraViolada extends ErroDeNegocio {
  constructor(codigo: string, mensagem: string, detalhes?: DetalheDeCampo[]) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, codigo, mensagem, detalhes ? { detalhes } : {});
  }
}

/** `429` — limite de taxa excedido nas rotas de credencial. Ver `limite-de-taxa.guard.ts`. */
export class LimiteExcedido extends ErroDeNegocio {
  constructor(segundosParaTentar: number) {
    super(
      HttpStatus.TOO_MANY_REQUESTS,
      'LIMITE_EXCEDIDO',
      `Muitas tentativas. Tente de novo em ${segundosParaTentar} s.`,
      { tentarEmSegundos: segundosParaTentar },
    );
  }
}
