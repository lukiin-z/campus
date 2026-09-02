import { z } from 'zod';
import { ALCANCE_EVENTO, DESFECHO_SIMULADO, METODO_PAGAMENTO, TIPO_PERGUNTA } from './types';
import { POLICY } from './domain/policy';

/**
 * Schemas Zod do contrato de escrita — **a mesma definição nas duas pontas**.
 *
 * O formulário valida com o schema daqui e a API valida com o schema daqui. Não
 * é conveniência: é o que impede a tela aceitar um corpo que o servidor recusa,
 * e vice-versa. Quando as duas validações são escritas separadamente, elas
 * divergem — e o sintoma é sempre o mesmo, uma tela que "não faz nada" ao
 * enviar, porque o `422` chegou num formato que ela não sabe ler.
 *
 * ## O que fica aqui, e o que não fica
 *
 * Aqui: **forma e faixa** — campo obrigatório, tipo, tamanho, formato, limite
 * numérico. Coisas que se decidem olhando só o corpo da requisição.
 *
 * Não fica aqui: regra que depende de **estado** — se há vaga, se o prazo passou,
 * se a pessoa já está inscrita. Isso é `domain/` e precisa do banco. Um schema
 * que tentasse cobrir "há vaga" estaria mentindo: no instante em que ele valida,
 * a vaga pode já ter sido de outro (RNF-013).
 *
 * ## Mensagens em português
 *
 * Toda mensagem é escrita, nenhuma é a padrão do Zod: "String must contain at
 * least 4 character(s)" não é mensagem de produto. As mensagens daqui aparecem
 * literalmente sob o campo, então elas dizem **o que fazer**, não o que houve.
 */

// ---------------------------------------------------------------------------
// Primitivas reutilizadas
// ---------------------------------------------------------------------------

/** ISO 8601 com fuso. `z.string().datetime()` recusa offset por padrão. */
export const isoDateTime = z
  .string()
  .datetime({ offset: true })
  .describe('Data e hora em ISO 8601 com fuso, ex.: 2026-09-12T13:00:00.000Z');

const textoAparado = (min: number, max: number, rotulo: string) =>
  z
    .string()
    .trim()
    .min(min, `${rotulo} precisa de pelo menos ${min} caracteres.`)
    .max(max, `${rotulo} cabe em ${max} caracteres.`);

// ---------------------------------------------------------------------------
// Autenticação (RF-002 a RF-005)
// ---------------------------------------------------------------------------

/**
 * O domínio institucional NÃO é validado aqui, e é decisão.
 *
 * A lista de domínios aceitos é dado da faculdade, não constante do código
 * (RN-002): validá-la no schema exigiria injetar a lista na construção dele, e
 * o schema deixaria de ser um valor estático compartilhável. A verificação vive
 * em `domain/auth.ts#dominioInstitucional`, chamada pelo formulário e pelo
 * handler.
 */
export const credenciaisSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe o seu e-mail institucional.')
    .email('Esse e-mail não parece completo.'),
  senha: z.string().min(8, 'A senha tem pelo menos 8 caracteres.'),
});

export const entradaOnboardingSchema = z.object({
  cursoId: z.string().min(1, 'Escolha um curso da lista.'),
  codigoConvite: z
    .string()
    .trim()
    .min(1, 'Digite o código da sua turma.')
    .max(24, 'Código de turma tem no máximo 24 caracteres.'),
});

export const cadastroSchema = credenciaisSchema.extend({
  nome: textoAparado(3, 120, 'O nome'),
});

// ---------------------------------------------------------------------------
// Evento (RF-010 a RF-018)
// ---------------------------------------------------------------------------

export const perguntaCustomizadaSchema = z.object({
  enunciado: textoAparado(4, 160, 'A pergunta'),
  tipo: z.enum(TIPO_PERGUNTA),
  opcoes: z
    .array(textoAparado(1, 60, 'A opção'))
    .min(2)
    .max(6)
    .nullable()
    .optional(),
  obrigatoria: z.boolean(),
});

/**
 * `novoEventoSchema` cobre forma e faixa. As três regras que dependem de estado
 * ficam fora, e é o handler que as aplica:
 *
 * - alcance FACULDADE por aluno comum nasce `EM_APROVACAO` (RN-003);
 * - a âncora do alcance vem do vínculo de quem cria, não do corpo (RN-001) —
 *   por isso não existe campo `turmaId`/`cursoId` aqui;
 * - os prazos, quando omitidos, são calculados por `defaultDeadlines`.
 */
export const novoEventoSchema = z
  .object({
    titulo: textoAparado(4, 120, 'O título'),
    descricao: textoAparado(20, 2000, 'A descrição'),
    alcance: z.enum(ALCANCE_EVENTO, {
      errorMap: () => ({ message: 'Escolha quem vê o evento: turma, curso ou faculdade.' }),
    }),
    inicio: isoDateTime,
    fim: isoDateTime,
    local: textoAparado(3, 160, 'O local'),
    capacidade: z
      .number({ invalid_type_error: 'A capacidade é um número.' })
      .int('A capacidade é um número inteiro.')
      .min(POLICY.MIN_CAPACITY, `Um evento precisa de pelo menos ${POLICY.MIN_CAPACITY} vagas.`)
      .max(
        POLICY.MAX_CAPACITY,
        `A capacidade máxima é ${POLICY.MAX_CAPACITY} — acima disso, fale com a faculdade.`,
      ),
    preco: z
      .number({ invalid_type_error: 'O preço é um número.' })
      .min(0, 'O preço não pode ser negativo.')
      .max(POLICY.MAX_PRICE, `O preço máximo é R$ ${POLICY.MAX_PRICE.toLocaleString('pt-BR')},00.`)
      /*
       * Centavos e nada mais fino: `preco: 12.999` não existe em dinheiro, e
       * arredondar em silêncio cobraria valor diferente do que o organizador
       * escreveu.
       *
       * A primeira versão desta linha era `Number.isInteger(Math.round(v*100))`
       * — que é SEMPRE verdadeiro, porque `Math.round` devolve inteiro. A
       * verificação não verificava nada, e foi o teste que apontou.
       *
       * A tolerância existe porque `12.99 * 100` é `1298.9999999999998` em
       * ponto flutuante: comparar com `Number.isInteger` reprovaria um preço
       * legítimo.
       */
      .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-9, {
        message: 'Use no máximo duas casas decimais.',
      }),
    prazoInscricao: isoDateTime.optional(),
    prazoCancelamento: isoDateTime.optional(),
    publicar: z.boolean(),
    perguntas: z.array(perguntaCustomizadaSchema).max(POLICY.MAX_CUSTOM_QUESTIONS).optional(),
  })
  .superRefine((valor, ctx) => {
    const inicio = new Date(valor.inicio).getTime();
    const fim = new Date(valor.fim).getTime();

    if (fim <= inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fim'],
        message: 'O fim tem de ser depois do início.',
      });
    }

    // Um evento de mais de 7 dias é quase sempre erro de digitação na data.
    if (fim - inicio > POLICY.MAX_EVENT_DURATION_DAYS * 24 * 3_600_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fim'],
        message: `Um evento de mais de ${POLICY.MAX_EVENT_DURATION_DAYS} dias provavelmente está com a data errada.`,
      });
    }

    if (valor.prazoInscricao && new Date(valor.prazoInscricao).getTime() > inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prazoInscricao'],
        message: 'As inscrições não podem fechar depois do evento começar.',
      });
    }

    if (valor.prazoCancelamento && new Date(valor.prazoCancelamento).getTime() > inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prazoCancelamento'],
        message: 'O prazo de cancelamento não pode ser depois do evento começar.',
      });
    }

    // `ESCOLHA_UNICA` sem opções é pergunta que não pode ser respondida.
    for (const [indice, pergunta] of (valor.perguntas ?? []).entries()) {
      if (pergunta.tipo === 'ESCOLHA_UNICA' && (pergunta.opcoes ?? []).length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['perguntas', indice, 'opcoes'],
          message: 'Pergunta de escolha única precisa de pelo menos 2 opções.',
        });
      }
    }
  });

export const filtroEventosSchema = z.object({
  alcance: z.enum(['TODOS', 'MINHA_TURMA', 'MEU_CURSO', 'FACULDADE']).optional(),
  preco: z.enum(['TODOS', 'GRATUITOS', 'PAGOS']).optional(),
  periodo: z.enum(['TODOS', 'ESTE_MES', 'PROXIMOS_7_DIAS']).optional(),
  busca: z.string().trim().max(120).optional(),
});

// ---------------------------------------------------------------------------
// Pagamento (RF-028 a RF-032)
// ---------------------------------------------------------------------------

/**
 * O que a API aceita de um cartão: quatro dígitos, bandeira e titular.
 *
 * Não existe campo para número completo, validade ou CVV — nem opcional, nem
 * ignorado. RNF-022 se cumpre pelo **formato do contrato**, não por disciplina de
 * quem chama: um cliente que tentasse enviar o número receberia `422`, porque o
 * objeto é estrito.
 */
export const resumoCartaoSchema = z
  .object({
    ultimosQuatro: z.string().regex(/^\d{4}$/, 'Os últimos quatro dígitos do cartão.'),
    bandeira: textoAparado(2, 24, 'A bandeira'),
    titular: textoAparado(3, 120, 'O nome do titular'),
  })
  .strict();

export const novoPagamentoSchema = z
  .object({
    metodo: z.enum(METODO_PAGAMENTO, {
      errorMap: () => ({ message: 'Escolha Pix, crédito ou débito.' }),
    }),
    cartao: resumoCartaoSchema.optional(),
  })
  .strict()
  .superRefine((valor, ctx) => {
    const ehCartao = valor.metodo !== 'PIX';
    if (ehCartao && !valor.cartao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cartao'],
        message: 'Pagamento por cartão precisa do resumo do cartão.',
      });
    }
    if (!ehCartao && valor.cartao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cartao'],
        message: 'Pagamento por Pix não leva dados de cartão.',
      });
    }
  });

/** Gatilho da simulação do gateway. No CP6 quem chama é o simulador, não a tela. */
export const desfechoSimuladoSchema = z.object({
  desfecho: z.enum(DESFECHO_SIMULADO),
});

/**
 * Notificação do gateway (RN-014). `chaveIdempotencia` é obrigatória: sem ela
 * não há como distinguir reenvio de cobrança nova, e reenvio é o caso comum —
 * gateway reenvia até receber `200`.
 */
export const webhookPagamentoSchema = z.object({
  transacaoExternaId: textoAparado(4, 120, 'O id da transação'),
  chaveIdempotencia: textoAparado(4, 200, 'A chave de idempotência'),
  valorPago: z.number().min(0),
  pago: z.boolean(),
});

// ---------------------------------------------------------------------------
// Check-in (RF-033 a RF-035)
// ---------------------------------------------------------------------------

/**
 * O leitor manda a leitura crua, e é o servidor que a classifica.
 *
 * O limite de 4096 caracteres existe para o corpo não virar vetor de abuso: um
 * QR pode carregar muito texto, e a classificação (`classificarLeitura`) devolve
 * `INDECIFRAVEL` para qualquer coisa que não seja uma das três formas.
 */
export const leituraCheckinSchema = z.object({
  leitura: z
    .string()
    .trim()
    .min(1, 'Aponte a câmera para o QR ou digite o código.')
    .max(4096, 'Leitura muito longa para ser um ingresso.'),
});

// ---------------------------------------------------------------------------
// Feed (RF-036 a RF-039)
// ---------------------------------------------------------------------------

export const novaPublicacaoSchema = z.object({
  eventoId: z.string().min(1, 'Escolha o evento da publicação.'),
  legenda: textoAparado(2, 500, 'A legenda'),
  imagemSeed: z.number().int().min(1).max(24).optional(),
});

export const novoComentarioSchema = z.object({
  texto: textoAparado(2, 280, 'O comentário'),
});

export const remocaoPublicacaoSchema = z.object({
  motivo: textoAparado(10, 400, 'O motivo da remoção'),
});

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

/**
 * `coerce` porque isto vem de query string, onde tudo é texto. Sem ele,
 * `?pagina=2` reprovaria por não ser número — e o erro apareceria como
 * "esperava number, recebeu string", que não ajuda ninguém.
 */
export const paginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Tipos inferidos — o schema é a fonte, o tipo é derivado
// ---------------------------------------------------------------------------

export type CredenciaisEntrada = z.infer<typeof credenciaisSchema>;
export type CadastroEntrada = z.infer<typeof cadastroSchema>;
export type OnboardingEntrada = z.infer<typeof entradaOnboardingSchema>;
export type NovoEventoEntrada = z.infer<typeof novoEventoSchema>;
export type FiltroEventosEntrada = z.infer<typeof filtroEventosSchema>;
export type NovoPagamentoEntrada = z.infer<typeof novoPagamentoSchema>;
export type WebhookPagamentoEntrada = z.infer<typeof webhookPagamentoSchema>;
export type LeituraCheckinEntrada = z.infer<typeof leituraCheckinSchema>;
export type NovaPublicacaoEntrada = z.infer<typeof novaPublicacaoSchema>;
export type NovoComentarioEntrada = z.infer<typeof novoComentarioSchema>;
export type PaginacaoEntrada = z.infer<typeof paginacaoSchema>;
