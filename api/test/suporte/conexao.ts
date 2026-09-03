/**
 * O endereço do banco de teste, montado num lugar só.
 *
 * Dois consumidores, em processos diferentes: o `globalSetup`
 * (`preparar-banco.ts`, processo principal do Vitest) e o `setupFiles`
 * (`ambiente.ts`, cada worker). Se cada um montasse a própria URL, uma
 * divergência de porta faria a migration ser aplicada num banco e os testes
 * rodarem em outro — e o sintoma seria "table does not exist" depois de um
 * `migrate deploy` que disse "sucesso".
 */

/** `${NOME:-padrão}` do compose: valor vazio conta como ausente, igual a `:-`. */
export function ler(nome: string, padrao: string): string {
  const valor = process.env[nome];
  return valor === undefined || valor.trim().length === 0 ? padrao : valor;
}

/**
 * `DATABASE_URL` do serviço `db-teste` (perfil `teste`, porta 5433).
 *
 * Os padrões são os documentados em `.env.example` (`POSTGRES_TESTE_*`,
 * `DB_TESTE_PORT`) — credenciais de um container descartável em `localhost`, não
 * segredo. Quem já exportou `DATABASE_URL` mantém a sua.
 *
 * ## `connection_limit` explícito
 *
 * O padrão do Prisma é `núcleos × 2 + 1`. O caso de concorrência dispara dezenas
 * de transações simultâneas que ficam **bloqueadas** na trava de linha do
 * evento, cada uma segurando uma conexão do pool enquanto espera. Com o pool
 * padrão, as requisições excedentes falhariam por esgotamento do pool (`P2024`)
 * em vez de esperar a trava — e o teste mediria o tamanho do pool, não a
 * serialização. 60 conexões cabem no `max_connections` padrão do Postgres (100).
 */
export function urlDoBancoDeTeste(): string {
  const usuario = ler('POSTGRES_TESTE_USER', 'campus');
  const senha = ler('POSTGRES_TESTE_PASSWORD', 'campus_dev_local');
  const banco = ler('POSTGRES_TESTE_DB', 'campus_teste');
  const porta = ler('DB_TESTE_PORT', '5433');

  return ler(
    'DATABASE_URL',
    `postgresql://${usuario}:${senha}@localhost:${porta}/${banco}` +
      '?schema=public&connection_limit=60&pool_timeout=30',
  );
}
