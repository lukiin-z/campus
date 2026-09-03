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
 * ## Dois mapas, porque o banco fala de duas formas
 *
 * A primeira versão deste arquivo procurava o NOME da restrição no texto do
 * erro, para tudo. Para `CHECK` funciona — o PostgreSQL põe o nome na própria
 * mensagem e o Prisma não modela `CHECK`, então a violação sobe crua. Para
 * ÚNICO não funciona, e as nove entradas de único eram **código morto**.
 *
 * O que o Prisma entrega num `P2002`, medido:
 *
 *     meta = { modelName: 'Usuario',      target: ['email'] }
 *     meta = { modelName: 'Participacao', target: ['evento_id', 'usuario_id'] }
 *
 * Nome de COLUNA, nunca o da restrição — e vale igual para os únicos declarados
 * no `schema.prisma` e para os índices parciais escritos à mão na migration.
 * Sem tabela por coluna, toda violação de único caía em `POR_CODIGO.P2002` e
 * chegava ao cliente como `409 CONFLITO / "Esse registro já existe."` em vez de
 * `JA_INSCRITO`, `COBRANCA_JA_ABERTA` ou `EMAIL_JA_CADASTRADO`. O status estava
 * certo; o **código** — que é o contrato pelo qual a tela decide o que mostrar —
 * estava perdido.
 *
 * Daí os dois mapas:
 *
 * - `POR_COLUNAS`, indexado por `Modelo:coluna,coluna` — é o que atende `P2002`,
 *   ou seja, todo único. As listas de coluna saíram de `pg_index` no banco real,
 *   não da leitura da migration.
 * - `POR_RESTRICAO`, indexado por nome — atende os `CHECK` e o caminho de SQL
 *   cru, onde a mensagem do PostgreSQL chega inteira. As entradas de único
 *   continuam nele **de propósito**, para esse segundo caminho, e não são o que
 *   traduz um `P2002`.
 *
 * ## Uma armadilha que custou um teste passando pelo motivo errado
 *
 * No `errorFormat` padrão o Prisma embute um TRECHO DO CÓDIGO-FONTE na mensagem.
 * Procurar `ux_*` no texto do erro passava a encontrar o nome escrito em um
 * comentário perto da chamada — a tradução acertava lendo o comentário, e
 * `api/tsconfig.json` tem `removeComments: false`, então os comentários estão no
 * `dist`. Por isso o `PrismaService` usa `errorFormat: 'minimal'`: a tradução
 * passa a depender só do que o banco disse.
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
  /* --------------------------------------------------------------- únicos
   *
   * Estas NÃO traduzem um `P2002` — quem faz isso é `POR_COLUNAS`. Elas cobrem
   * o caminho em que a mensagem do PostgreSQL chega inteira, com o nome do
   * índice: SQL cru (`$executeRaw`) e erro que o Prisma não modela.
   */
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

/**
 * `Modelo:colunas` → erro de negócio. É o mapa que atende `P2002`.
 *
 * A chave junta o `modelName` e as colunas do `target`, **ordenadas**: o Prisma
 * não promete ordem, e `evento_id,usuario_id` tem de casar com
 * `usuario_id,evento_id`.
 *
 * As listas de coluna vieram de `pg_index` no banco criado pela migration —
 * conferir por leitura era o caminho para errar, porque `@map` faz o nome do
 * campo no Prisma e o da coluna no banco divergirem.
 */
const POR_COLUNAS: Readonly<Record<string, Tradutor>> = {
  // ux_participacao_ativa — índice parcial, `WHERE status IN (...)` (RN-015)
  'Participacao:evento_id,usuario_id': () =>
    new Conflito('JA_INSCRITO', 'Você já tem uma inscrição ativa neste evento.'),

  // ux_pagamento_aguardando_por_participacao — parcial, `WHERE status='AGUARDANDO'` (RN-027)
  'Pagamento:participacao_id': () =>
    new Conflito(
      'COBRANCA_JA_ABERTA',
      'Já existe uma cobrança aberta para esta inscrição. Use a que está na tela.',
    ),

  // presenca_participacao_id_key — uso único do ingresso (RN-018)
  'Presenca:participacao_id': () => new Conflito('JA_UTILIZADO', 'Este ingresso já foi utilizado.'),

  // pagamento_chave_idempotencia_key — reprocessamento do gateway (RN-014)
  'Pagamento:chave_idempotencia': () =>
    new Conflito('NOTIFICACAO_DUPLICADA', 'Esta notificação do gateway já foi processada.'),

  'Usuario:email': () =>
    new Conflito('EMAIL_JA_CADASTRADO', 'Já existe uma conta com esse e-mail.'),

  'Turma:codigo_convite': () =>
    new Conflito('CODIGO_JA_EXISTE', 'Esse código de convite já está em uso. Gere outro.'),

  'Sessao:refresh_hash': () =>
    new Conflito('SESSAO_DUPLICADA', 'Essa sessão já existe. Entre de novo.'),

  'RespostaPergunta:participacao_id,pergunta_id': () =>
    new Conflito('RESPOSTA_DUPLICADA', 'Esta pergunta já foi respondida nesta inscrição.'),

  'PerguntaCustomizada:evento_id,ordem': () =>
    new Conflito('PERGUNTA_DUPLICADA', 'Duas perguntas não podem ocupar a mesma posição.'),

  /*
   * Estes dois não tinham entrada em lugar nenhum, e a falta aparecia como
   * `409 CONFLITO` genérico em duas telas de administração.
   */
  'Curso:codigo': () => new Conflito('CODIGO_JA_EXISTE', 'Já existe um curso com esse código.'),

  'Faculdade:sigla': () =>
    new Conflito('SIGLA_JA_EXISTE', 'Já existe uma faculdade com essa sigla.'),
};

/** `chaveIdempotencia` → `chave_idempotencia`. */
function paraSnake(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * A chave de `POR_COLUNAS` a partir do `meta` de um `P2002`, ou `null`.
 *
 * `meta` é `unknown` no cliente do Prisma porque a forma muda por código de
 * erro; aqui ela é estreitada campo por campo em vez de afirmada por `as`.
 *
 * As colunas passam por `paraSnake` porque o Prisma reporta o nome da COLUNA
 * (medido), mas a promessa é fraca o suficiente para não valer a aposta — e
 * normalizar custa uma linha.
 */
function chaveDeColunas(meta: unknown): string | null {
  if (typeof meta !== 'object' || meta === null) return null;
  const registro = meta as Record<string, unknown>;
  const modelo = registro.modelName;
  const alvo = registro.target;
  if (typeof modelo !== 'string' || !Array.isArray(alvo)) return null;

  const colunas = alvo
    .filter((c): c is string => typeof c === 'string')
    .map(paraSnake)
    .sort();
  if (colunas.length === 0) return null;

  return `${modelo}:${colunas.join(',')}`;
}

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
    /*
     * Único vem por aqui, e a informação disponível é (modelo, colunas). Esta
     * consulta vem PRIMEIRO porque é a que tem dado estruturado: a busca por
     * nome, abaixo, depende de o nome aparecer em algum texto.
     */
    if (erro.code === 'P2002') {
      const chave = chaveDeColunas(erro.meta);
      const porColunas = chave === null ? undefined : POR_COLUNAS[chave];
      if (porColunas) return porColunas();
    }

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

/**
 * Exposto para teste: as chaves `Modelo:colunas` cobertas.
 *
 * O teste confere esta lista contra os índices únicos que a migration cria —
 * um único sem entrada aqui é um `409 CONFLITO` genérico esperando acontecer.
 */
export const UNICOS_TRADUZIDOS = Object.keys(POR_COLUNAS);
