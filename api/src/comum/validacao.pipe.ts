import { PipeTransform } from '@nestjs/common';
import type { ZodIssue, ZodType } from 'zod';
import { DetalheDeCampo, RegraViolada } from './erros';

/**
 * Validação de corpo e de query com os schemas de `@campus/shared`.
 *
 * ## Por que não `class-validator`
 *
 * `class-validator` exigiria uma classe DTO por endpoint, com decorators
 * repetindo limites que já existem em `novoEventoSchema`, `novoPagamentoSchema`
 * e companhia. Duas declarações da mesma regra de forma divergem: o formulário
 * aceitaria um título de 3 letras que a API recusa, ou o contrário. O objeto
 * Zod compartilhado é a mesma instância nas duas pontas — e é por isso que ele
 * mora em `packages/shared` e não em nenhum dos dois lados.
 *
 * ## O que sai no 422
 *
 * `{ erro, mensagem, detalhes: [{ campo, mensagem }] }`, como o contrato define.
 * As mensagens vêm dos schemas, que já são escritas em português e dizem o que
 * fazer — nenhuma é a padrão do Zod ("String must contain at least 4
 * character(s)" não é mensagem de produto).
 *
 * O pipe é instanciado por rota (`@Body(new ZodValidationPipe(schema))`) em vez
 * de registrado global: cada endpoint tem o seu schema, e um pipe global
 * precisaria de metadado dizendo qual — que é o DTO que estamos evitando.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(valor: unknown): T {
    const resultado = this.schema.safeParse(valor);
    if (resultado.success) return resultado.data;

    throw new RegraViolada(
      'CORPO_INVALIDO',
      'Confira os campos destacados.',
      resultado.error.issues.map(paraDetalhe),
    );
  }
}

/**
 * `path` do Zod é um array de segmentos (`['perguntas', 0, 'opcoes']`). O
 * cliente precisa de um caminho que case com o nome do campo do formulário,
 * então junta-se com ponto — o formato que `react-hook-form` usa em
 * `setError`.
 */
function paraDetalhe(problema: ZodIssue): DetalheDeCampo {
  return {
    campo: problema.path.join('.') || '(corpo)',
    mensagem: problema.message,
  };
}
