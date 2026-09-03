import { Prisma } from '@prisma/client';
import { Conflito, ErroDeNegocio, NaoEncontrado, RegraViolada } from './erros';

/**
 * Tradução de erro do banco para código de negócio.
 *
 * ## Por que isto existe
 *
 * Três garantias centrais do modelo são do BANCO, não da aplicação: o `CHECK` de
 * `ocupadas <= capacidade` (RN-004), o índice único parcial de uma participação
 * ativa por aluno/evento (RN-015) e o único parcial de uma cobrança aberta por
 * participação (RN-027). Elas existem porque a transação da aplicação pode ter
 * um furo — é o desenho: o banco recusa a escrita em vez de gravar dado
 * impossível.
 *
 * Mas uma violação de restrição que chega crua ao cliente é `500`. E `500` é
 * mentira: "algo deu errado no servidor" quando o que houve foi "você já está
 * inscrito". O cliente perde a informação e mostra a tela errada. Este arquivo
 * fecha esse buraco — a última defesa do banco passa a produzir a MESMA resposta
 * que a verificação da aplicação produziria se tivesse chegado primeiro.
 *
 * ## Por que a busca é pelo NOME da restrição, e por texto
 *
 * O `meta.target` do Prisma traz nome de coluna para os únicos que ele conhece
 * (os declarados no `schema.prisma`), mas `ux_participacao_ativa` e
 * `ux_pagamento_aguardando_por_participacao` são **índices parciais escritos à
 * mão na migration** — o Prisma não os declara, então o que sobra é o nome que
 * o PostgreSQL reporta. O mesmo vale para todo `CHECK`: nenhum deles existe no
 * schema do Prisma.
 *
 * Por isso a estratégia é: procurar `ux_*`/`ck_*` no texto do erro (mensagem +
 * `meta`), e cair no código do Prisma (`P2002`, `P2003`, …) quando nenhum nome
 * aparecer. É acoplamento a nome de restrição — deliberado, e o preço de ter as
 * garantias no banco. Os nomes vivem em `api/prisma/migrations/0001_init`.
 */

type Tradutor = () => ErroDeNegocio;

/**
 * Nome da restrição → erro de negócio.
 *
 * Cada linha responde à pergunta "o que o cliente deveria ver se a aplicação
 * tivesse detectado isso antes de escrever?". Não é catálogo de mensagens de
 * banco: é o mesmo par (código, texto) que o handler devolve no caminho normal.
 */
const POR_RESTRICAO: Readonly<Record<string, Tradutor>> = {
  // ------------------------------------------------------------- únicos
  ux_participacao_ativa: () =>
    new Conflito('JA_INSCRITO', 'Você já tem uma inscrição ativa neste evento.'),

  ux_pagamento_aguardando_por_participacao: () =>
    new Conflito(
      'COBRANCA_JA_ABERTA',
      'Já existe uma cobrança aberta para esta inscrição. Use a que está na tela.',
    ),

  presenca_participacao_id_key: () =>
    new Conflito('JA_UTILIZADO', 'Este ingresso já foi utilizado.'),

  pagamento_chave_idempotencia_key: () =>
    new Conflito('NOTIFICACAO_DUPLICADA', 'Esta notificação do gateway já foi processada.'),

  usuario_email_key: () =>
    new Conflito('EMAIL_JA_CADASTRADO', 'Já existe uma conta com esse e-mail.'),

  turma_codigo_convite_key: () =>
    new Conflito('CODIGO_JA_EXISTE', 'Esse código de convite já está em uso. Gere outro.'),

  sessao_refresh_hash_key: () =>
    new Conflito('SESSAO_DUPLICADA', 'Essa sessão já existe. Entre de novo.'),

  resposta_pergunta_pergunta_id_participacao_id_key: () =>
    new Conflito('RESPOSTA_DUPLICADA', 'Esta pergunta já foi respondida nesta inscrição.'),

  pergunta_customizada_evento_id_ordem_key: () =>
    new Conflito('PERGUNTA_DUPLICADA', 'Duas perguntas não podem ocupar a mesma posição.'),

  // --------------------------------------------------------------- CHECK
  /*
   * A que mais importa. Se duas requisições concorrentes furarem o
   * `SELECT ... FOR UPDATE`, é este `CHECK` que impede o overbooking — e é esta
   * linha que faz a recusa chegar como `409 SEM_VAGA` com ação de fila, em vez
   * de `500`. Ou seja: mesmo no caminho de exceção, o cliente recebe a resposta
   * que sabe tratar.
   */
  ck_evento_ocupadas_le_capacidade: () =>
    new Conflito('SEM_VAGA', 'As vagas acabaram. Você pode entrar na lista de espera.', {
      acao: 'LISTA_ESPERA',
    }),

  ck_evento_capacidade_faixa: () =>
    new RegraViolada('CAPACIDADE_INVALIDA', 'A capacidade precisa ficar entre 2 e 2000 vagas.'),

  ck_evento_preco_nao_negativo: () =>
    new RegraViolada('PRECO_INVALIDO', 'O preço não pode ser negativo.'),

  ck_evento_inicio_antes_do_fim: () =>
    new RegraViolada('DATAS_INCOERENTES', 'O fim do evento tem de ser depois do início.'),

  ck_evento_duracao_maxima: () =>
    new RegraViolada('DURACAO_EXCESSIVA', 'Um evento não pode durar mais de 7 dias.'),

  ck_evento_prazo_inscricao: () =>
    new RegraViolada(
      'PRAZO_INSCRICAO_INVALIDO',
      'As inscrições não podem fechar depois do evento começar.',
    ),

  ck_evento_prazo_cancelamento: () =>
    new RegraViolada(
      'PRAZO_CANCELAMENTO_INVALIDO',
      'O prazo de cancelamento não pode ser depois do evento começar.',
    ),

  ck_evento_ancora_coerente: () =>
    new RegraViolada(
      'ALCANCE_INCOERENTE',
      'O alcance do evento não bate com o vínculo informado. Conclua o onboarding e tente de novo.',
    ),

  ck_evento_cancelado_tem_motivo: () =>
    new RegraViolada(
      'MOTIVO_OBRIGATORIO',
      'Cancelar exige um motivo — quem se inscreveu vai lê-lo.',
    ),

  ck_participacao_posicao_positiva: () =>
    new RegraViolada('FILA_INCOERENTE', 'A posição na fila de espera é inválida.'),

  ck_participacao_fila_tem_posicao: () =>
    new RegraViolada('FILA_INCOERENTE', 'Quem está na lista de espera precisa de uma posição.'),

  ck_participacao_oferta_tem_prazo: () =>
    new RegraViolada('PRAZO_OBRIGATORIO', 'Uma vaga oferecida precisa de prazo para ser aceita.'),

  ck_participacao_pagamento_tem_prazo: () =>
    new RegraViolada('PRAZO_OBRIGATORIO', 'Uma inscrição a pagar precisa de prazo de pagamento.'),

  ck_pagamento_valor_positivo: () =>
    new RegraViolada('VALOR_INVALIDO', 'Não existe cobrança de valor zero.'),

  ck_pagamento_reembolso_na_faixa: () =>
    new RegraViolada(
      'REEMBOLSO_FORA_DA_FAIXA',
      'O reembolso não pode ser maior do que o valor cobrado.',
    ),

  ck_pagamento_pix_sem_cartao: () =>
    new RegraViolada('PIX_SEM_CARTAO', 'Pagamento por Pix não leva dados de cartão.'),

  ck_pagamento_ultimos_quatro_digitos: () =>
    new RegraViolada('CARTAO_INVALIDO', 'Os últimos quatro dígitos do cartão são quatro números.'),

  ck_pergunta_ordem_faixa: () =>
    new RegraViolada('PERGUNTA_INVALIDA', 'Um evento aceita no máximo 5 perguntas.'),

  ck_pergunta_escolha_tem_opcoes: () =>
    new RegraViolada(
      'PERGUNTA_INVALIDA',
      'Pergunta de escolha única precisa de pelo menos 2 opções.',
    ),

  ck_publicacao_remocao_justificada: () =>
    new RegraViolada('MOTIVO_OBRIGATORIO', 'Remover uma publicação exige motivo e responsável.'),
};

/** Código do Prisma → erro de negócio, para quando nenhum nome de restrição aparece. */
const POR_CODIGO: Readonly<Record<string, Tradutor>> = {
  // Violação de único que o Prisma conhece, mas cujo nome não reconhecemos.
  P2002: () => new Conflito('CONFLITO', 'Esse registro já existe.'),
  // Chave estrangeira: o cliente mandou um id que não aponta para nada.
  P2003: () =>
    new RegraViolada('REFERENCIA_INVALIDA', 'Um dos identificadores enviados não existe.'),
  // Registro exigido pela operação não existe.
  P2025: () => new NaoEncontrado('Não encontramos o que você pediu.'),
  // Valor maior do que a coluna aceita.
  P2000: () => new RegraViolada('VALOR_LONGO', 'Um dos campos passou do tamanho aceito.'),
  // Restrição NOT NULL.
  P2011: () => new RegraViolada('CAMPO_OBRIGATORIO', 'Falta um campo obrigatório.'),
};

const NOME_DE_RESTRICAO = /\b(?:ux|ck|ix)_[a-z0-9_]+|\b[a-z_]+_key\b/g;

/**
 * Junta tudo o que pode carregar o nome da restrição: a mensagem e o `meta`.
 *
 * `meta` é `unknown` de propósito no cliente do Prisma — a forma muda por
 * código de erro. `JSON.stringify` é o jeito honesto de procurar dentro dele
 * sem afirmar um tipo que não se conhece.
 */
function textoDoErro(erro: Prisma.PrismaClientKnownRequestError): string {
  let metaSerializado = '';
  try {
    metaSerializado = JSON.stringify(erro.meta ?? {});
  } catch {
    metaSerializado = '';
  }
  return `${erro.message} ${metaSerializado}`;
}

function nomesNoTexto(texto: string): string[] {
  return texto.match(NOME_DE_RESTRICAO) ?? [];
}

/**
 * Traduz um erro do Prisma. Devolve `null` quando o erro não é do banco — o
 * chamador (o filtro de exceção) segue para o tratamento genérico.
 */
export function traduzirErroDoPrisma(erro: unknown): ErroDeNegocio | null {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    for (const nome of nomesNoTexto(textoDoErro(erro))) {
      const tradutor = POR_RESTRICAO[nome];
      if (tradutor) return tradutor();
    }
    const porCodigo = POR_CODIGO[erro.code];
    return porCodigo ? porCodigo() : null;
  }

  /*
   * `CHECK` violado numa escrita comum não vem como `PrismaClientKnownRequestError`
   * com código próprio: o Prisma não modela `CHECK`, então a violação sobe como
   * erro desconhecido, com o nome da restrição no texto. Procurar o nome é o
   * único caminho — e é o que transforma um `500` em `409 SEM_VAGA`.
   */
  if (
    erro instanceof Prisma.PrismaClientUnknownRequestError ||
    erro instanceof Prisma.PrismaClientRustPanicError
  ) {
    for (const nome of nomesNoTexto(erro.message)) {
      const tradutor = POR_RESTRICAO[nome];
      if (tradutor) return tradutor();
    }
    return null;
  }

  if (erro instanceof Prisma.PrismaClientValidationError) {
    return new RegraViolada('CORPO_INVALIDO', 'A requisição não tem a forma esperada.');
  }

  return null;
}

/** Exposto para teste: os nomes cobertos são os da migration `0001_init`. */
export const RESTRICOES_TRADUZIDAS = Object.keys(POR_RESTRICAO);
