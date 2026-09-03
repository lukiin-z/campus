/**
 * Tradução dos ids legados do CP5 (`usr-001`, `evt-013`, `par-122`) para UUID.
 *
 * ## Por que traduzir, e não gerar
 *
 * O schema usa `uuid` (`api/prisma/schema.prisma`), e os ids do mock não são
 * UUID. As três saídas possíveis eram: gerar UUID aleatório no seed, escrever
 * 90 UUIDs à mão, ou derivar o UUID do id legado. Só a terceira atende às duas
 * exigências ao mesmo tempo:
 *
 * - **Reprodutível.** Rodar o seed duas vezes tem de dar os mesmos ids, senão
 *   `docs/18-ambiente-de-teste.md` não pode citar `evt-013` nem o roteiro de
 *   demonstração pode mandar abrir uma participação específica.
 * - **Legível.** UUID v5 (SHA-1 sobre um namespace) também seria reprodutível,
 *   mas `9f1c4e77-...` não diz de qual registro se trata. Depurar um seed em que
 *   nenhum id é reconhecível custa mais do que a elegância do v5 economiza.
 *
 * ## O formato
 *
 *     <código da tabela, 8 dígitos>-0000-4000-8000-<sequência, 12 dígitos>
 *
 * Os dois números são **decimais**, lidos como decimais. O `4` e o `8` nas
 * posições de versão e variante deixam a string com a forma de um UUID v4 —
 * a mesma que `@default(uuid())` produziria — de modo que um id do seed é
 * indistinguível em formato de um id criado pela API em runtime.
 *
 * | Legado | UUID |
 * |---|---|
 * | `fac-001` | `00000001-0000-4000-8000-000000000001` |
 * | `usr-013` | `00000004-0000-4000-8000-000000000013` |
 * | `evt-013` | `00000005-0000-4000-8000-000000000013` |
 * | `par-122` | `00000007-0000-4000-8000-000000000122` |
 *
 * Na prática o que se lê é a última metade: "a participação que termina em 122"
 * é `par-122`. A tabela de códigos abaixo decodifica a primeira.
 *
 * A função é injetiva por construção: cada prefixo tem um código próprio, e o
 * par (código, sequência) é único porque o par (prefixo, sequência) do id
 * legado já era. Duas entradas diferentes não podem colidir.
 */

/**
 * Código de cada tabela. A ordem é a de criação (`0001_init`), o que faz o
 * código crescer junto com a dependência de chave estrangeira.
 *
 * Um prefixo novo tem de entrar aqui. Não há fallback de propósito: gerar um
 * UUID para um prefixo desconhecido esconderia um erro de digitação até ele
 * virar uma linha órfã no banco.
 */
const CODIGO_POR_PREFIXO: Readonly<Record<string, number>> = {
  fac: 1, // faculdade
  cur: 2, // curso
  tur: 3, // turma
  usr: 4, // usuario
  evt: 5, // evento
  per: 6, // pergunta_customizada
  par: 7, // participacao
  pag: 8, // pagamento
  pre: 9, // presenca
  res: 10, // resposta_pergunta
  pub: 11, // publicacao
  com: 12, // comentario
  not: 13, // notificacao
  ses: 14, // sessao
};

const FORMATO_LEGADO = /^([a-z]{3})-(\d{1,12})$/;

/** Converte um id legado do CP5 no UUID equivalente. Lança se não reconhecer. */
export function uuidLegado(idLegado: string): string {
  const partes = FORMATO_LEGADO.exec(idLegado);
  // Os dois grupos existem sempre que a expressão casa; o teste explícito é o
  // que `noUncheckedIndexedAccess` exige, e ele custa uma linha.
  const prefixo = partes?.[1];
  const sequencia = partes?.[2];
  if (prefixo === undefined || sequencia === undefined) {
    throw new Error(`id legado fora do formato "<prefixo>-<numero>": ${JSON.stringify(idLegado)}`);
  }

  const codigo = CODIGO_POR_PREFIXO[prefixo];
  if (codigo === undefined) {
    throw new Error(
      `prefixo de id legado desconhecido: "${prefixo}". ` +
        `Acrescente-o a CODIGO_POR_PREFIXO em api/src/seed/ids.ts.`,
    );
  }

  const tabela = String(codigo).padStart(8, '0');
  const registro = sequencia.padStart(12, '0');
  return `${tabela}-0000-4000-8000-${registro}`;
}
