import { randomBytes } from 'node:crypto';
import { urlDoBancoDeTeste } from './conexao';

/**
 * Ambiente dos testes de integração — preenchido ANTES de o Nest subir.
 *
 * `carregarAmbiente()` (src/config/ambiente.ts) valida `process.env` na
 * construção do `ConfigModule` e derruba o boot se faltar `DATABASE_URL`,
 * `JWT_SECRET` ou `WEBHOOK_SECRET`. É o comportamento certo — e significa que
 * a suíte precisa desses três nomes definidos antes da primeira chamada de
 * `criarAplicacao()`. Por isso este arquivo é `setupFiles`, e não um `import`
 * qualquer: o Vitest o executa antes de coletar cada arquivo de teste.
 *
 * ## Nenhum segredo mora aqui
 *
 * Cada nome é lido de `process.env` primeiro, com a mesma semântica `:-` do
 * compose: valor vazio conta como ausente. Quem já exportou o seu, usa o seu.
 *
 * - **Banco**: `urlDoBancoDeTeste()` monta a URL do serviço `db-teste`, com os
 *   padrões documentados em `.env.example`. São credenciais de um container
 *   descartável em `localhost`, não segredo.
 * - **`JWT_SECRET` e `WEBHOOK_SECRET`**: sorteados a cada execução. Um valor
 *   fixo escrito aqui seria um segredo commitado, e um valor curto não passaria
 *   pelo mínimo de 32/16 caracteres do schema. Sortear resolve os dois: o JWT só
 *   precisa ser consistente dentro do processo, e a assinatura do webhook é
 *   calculada pelo próprio teste a partir do mesmo valor
 *   (`test/suporte/webhook.ts`).
 */

function definirSeAusente(nome: string, valor: string): void {
  const atual = process.env[nome];
  if (atual === undefined || atual.trim().length === 0) {
    process.env[nome] = valor;
  }
}

definirSeAusente('DATABASE_URL', urlDoBancoDeTeste());

definirSeAusente('JWT_SECRET', randomBytes(48).toString('base64url'));
definirSeAusente('WEBHOOK_SECRET', randomBytes(32).toString('base64url'));

// `test` e não `production`: a rota de simulação do gateway e o seed olham para
// `NODE_ENV`, e cada arquivo que precisa de um valor diferente o passa em
// `criarAplicacao({ ... })`.
definirSeAusente('NODE_ENV', 'test');

// A janela de expiração é medida movendo a data no banco, não esperando o
// relógio; o fuso do processo só afeta as datas relativas do seed.
definirSeAusente('TZ', 'America/Sao_Paulo');
