import { z } from 'zod';

/**
 * Configuração da API — lida, validada e congelada no boot.
 *
 * ## Por que a validação é no boot, e por que ela derruba o processo
 *
 * O modo de falha que este arquivo existe para impedir é o pior de todos: a API
 * sobe, responde `/health` com `ok`, e só quebra na primeira assinatura de
 * token — ou pior, **não** quebra, porque alguém deixou um valor padrão para
 * `JWT_SECRET`. Um segredo com padrão não é segredo: quem lê o repositório
 * assina token válido (RNF-020).
 *
 * Então: sem `DATABASE_URL`, sem `JWT_SECRET` ou sem `WEBHOOK_SECRET`, o
 * processo não passa do boot, e a mensagem diz qual variável falta. Os nomes
 * estão documentados em `api/.env.example`, sem valor.
 *
 * `process.env` é lido AQUI e em nenhum outro lugar — o ESLint reprova
 * `process.env` fora de `src/config/`. É o que faz esta função ser a única
 * porta de entrada de configuração em vez de uma recomendação.
 */

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatória: a API não tem modo sem banco (ver api/.env.example).'),

  /*
   * Libera `POST /pagamentos/:id/simular`, o gatilho do gateway fake.
   *
   * É flag própria, e não `NODE_ENV !== 'production'`, por um motivo medido: a
   * stack de demonstração roda com `NODE_ENV=production` DE PROPÓSITO — é o
   * build real que se quer exercitar. Pendurar o simulador no `NODE_ENV` fazia o
   * endpoint responder `404` justamente na stack que existe para demonstrar, e o
   * roteiro de 5 minutos morria no passo do pagamento.
   *
   * O padrão é `false`: em produção de verdade ninguém confirma cobrança por
   * requisição. Mesmo formato de consentimento explícito do
   * `SEED_PERMITIR_RESET`.
   */
  PERMITIR_SIMULACAO_PAGAMENTO: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),

  /*
   * 32 caracteres é o piso, não a recomendação. A recomendação está no
   * `.env.example`: 48 bytes aleatórios em base64url. O piso existe para
   * recusar `JWT_SECRET=segredo`, que é o valor que aparece quando alguém está
   * com pressa.
   */
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres. Não existe valor padrão (RNF-020).'),

  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  WEBHOOK_SECRET: z
    .string()
    .min(
      16,
      'WEBHOOK_SECRET precisa de pelo menos 16 caracteres: é ele que distingue o gateway de uma requisição forjada (RN-014).',
    ),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  RATE_LIMIT_TENTATIVAS: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_JANELA_SEGUNDOS: z.coerce.number().int().min(1).default(60),
});

export type VariaveisDeAmbiente = z.infer<typeof esquema>;

/** Configuração pronta para injeção: o que foi lido, mais o que se deriva dela. */
export interface Ambiente extends VariaveisDeAmbiente {
  readonly producao: boolean;
  readonly origensCors: readonly string[];
  readonly versao: string;
}

/** Token de injeção. Não há `ConfigService` genérico: o tipo é este, e é fechado. */
export const AMBIENTE = 'CAMPUS_AMBIENTE';

export class ConfiguracaoInvalidaError extends Error {
  constructor(problemas: readonly string[]) {
    super(
      [
        'A API não subiu: a configuração de ambiente está incompleta ou inválida.',
        ...problemas.map((p) => `  - ${p}`),
        '',
        'Os nomes esperados estão em api/.env.example (sem valor).',
      ].join('\n'),
    );
    this.name = 'ConfiguracaoInvalidaError';
  }
}

/**
 * Lê e valida o ambiente. Lança `ConfiguracaoInvalidaError` — quem chama é o
 * `bootstrap`, e uma exceção ali é exatamente "a API não sobe".
 *
 * A fonte é parâmetro para o teste não precisar mexer no `process.env` global,
 * que vaza entre casos.
 */
export function carregarAmbiente(
  fonte: Record<string, string | undefined> = process.env,
  versao = '1.0.0',
): Ambiente {
  const resultado = esquema.safeParse(fonte);

  if (!resultado.success) {
    throw new ConfiguracaoInvalidaError(
      resultado.error.issues.map((problema) => {
        const campo = problema.path.join('.') || '(raiz)';
        return `${campo}: ${problema.message}`;
      }),
    );
  }

  const valores = resultado.data;

  return {
    ...valores,
    producao: valores.NODE_ENV === 'production',
    origensCors: valores.CORS_ORIGINS.split(',')
      .map((origem) => origem.trim())
      .filter((origem) => origem.length > 0),
    versao,
  };
}
