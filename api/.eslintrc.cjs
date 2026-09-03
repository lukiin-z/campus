/* eslint-env node */

/**
 * Padrão de código da API. `npm run lint -w campus-api` roda com
 * `--max-warnings 0`: aviso quebra o CI (RNF-017), igual ao app.
 *
 * As regras de `no-restricted-imports` e `no-restricted-syntax` são a versão
 * executável de duas fronteiras que só existem no servidor:
 *
 * 1. **Regra de negócio não se reescreve.** Ela mora em `@campus/shared` e é
 *    exercitada por 243 testes. Um `service` que reimplementa `isFull` ou
 *    `paymentDeadline` cria uma segunda verdade — que não nasce errada, fica
 *    errada na primeira correção feita só de um lado. O lint não consegue
 *    reconhecer a regra reescrita, mas consegue impedir o caminho oposto: a API
 *    não importa nada do app nem do mock.
 * 2. **Segredo se lê num lugar só.** `process.env` fora de `src/config/` é
 *    proibido: é o que faz a validação de boot (`carregarAmbiente`) ser a única
 *    porta de entrada de configuração, em vez de uma sugestão.
 */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'coverage', 'node_modules', '.eslintrc.cjs', 'prisma/**'],
  rules: {
    /*
     * `ignoreRestSiblings` permite o idioma que REMOVE um campo de um objeto:
     * `const { senhaHash: _ignorado, ...titular } = usuario`. É como o hash da
     * senha sai da projeção sem construir o objeto campo por campo — e o
     * TypeScript já trata esse `_ignorado` como usado, então a regra precisava
     * concordar.
     */
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // `any` desliga o compilador exatamente onde o dado vem de fora (corpo de
    // requisição, linha do banco, notificação do gateway) — que é onde ele
    // precisa estar ligado. Zero `any` na API é requisito do checkpoint.
    '@typescript-eslint/no-explicit-any': 'error',

    eqeqeq: ['error', 'always', { null: 'ignore' }],
    // O log da API é o `Logger` do Nest, que respeita nível e contexto.
    // `console.log` em servidor vira ruído em produção e vaza dado sem filtro
    // (RNF-009).
    'no-console': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/app/src/**', '../../app/*', 'msw', 'msw/*'],
            message:
              'A API não importa nada do app nem do mock. O que as duas pontas compartilham mora em @campus/shared.',
          },
          {
            group: ['react', 'react-dom', 'react-router-dom', '@tanstack/*', 'zustand'],
            message: 'Isso é do cliente. A API não tem tela.',
          },
        ],
      },
    ],
  },

  overrides: [
    {
      /*
       * `src/seed/**` é script de linha de comando, não módulo da aplicação.
       *
       * `console` ali É a saída do comando — a contagem por tabela que a pessoa
       * lê depois de rodar `npm run seed`. Proibi-la obrigaria a inventar um
       * logger para um processo que vive dois segundos e morre.
       *
       * A exceção mora AQUI e não em um `eslint-disable` no topo do arquivo, de
       * propósito: no arquivo ela some da vista de quem revisa a configuração, e
       * a próxima pessoa que precisar de `console` em outro lugar não encontra o
       * precedente nem a razão dele.
       */
      files: ['src/seed/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      /*
       * Configuração se lê em um lugar só: `carregarAmbiente` valida tudo no
       * boot e falha cedo. Um `process.env.JWT_SECRET` lido no meio de um
       * service voltaria a permitir que a API subisse sem segredo e só
       * quebrasse na primeira assinatura de token.
       */
      files: ['src/**/*.ts'],
      /*
       * `src/seed/**` entra na lista pela mesma razão de `src/main.ts`: é um
       * script de CLI, não um módulo da aplicação. Exigir dele a validação de
       * boot completa significaria pedir `JWT_SECRET` e `WEBHOOK_SECRET` para
       * popular um banco — e o `console` dele é a saída do comando, não log
       * perdido em produção.
       */
      excludedFiles: ['src/config/**/*.ts', 'src/main.ts', 'src/seed/**/*.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "MemberExpression[object.name='process'][property.name='env']",
            message:
              'Leia a configuração de src/config/ambiente.ts (injetada como Ambiente). process.env direto burla a validação de boot.',
          },
        ],
      },
    },
    {
      files: ['**/*.test.ts'],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
};
