/**
 * Reexportação dos tipos de domínio.
 *
 * A definição vive em `packages/shared/src/types.ts` desde o CP6, porque passou
 * a ter dois consumidores — o app e a API. Este arquivo continua existindo por
 * uma razão prática e uma de projeto:
 *
 * - **prática:** os ~40 arquivos do app que importam `'../types/domain'`
 *   continuam válidos, e a migração não virou um diff de 200 linhas de import;
 * - **de projeto:** `types/` é onde o app declara o que ele conhece. Se um dia
 *   surgir um tipo que só a interface precisa, ele nasce aqui, ao lado do
 *   reexport, e não no pacote compartilhado — onde a API o herdaria sem uso.
 *
 * Não acrescente definição aqui sem essa segunda razão. Tipo que descreve dado
 * que atravessa a rede pertence ao pacote.
 */
export * from '@campus/shared';
