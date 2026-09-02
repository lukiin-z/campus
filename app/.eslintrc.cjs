/* eslint-env node */

/**
 * Padrão de código do Campus. `npm run lint` roda com --max-warnings 0: aviso
 * quebra o CI (RNF-017).
 *
 * As regras de `no-restricted-imports` são a versão executável da fronteira de
 * camadas descrita em docs/05-modelagem/07-diagrama-componentes.md — a
 * dependência sempre aponta para dentro, e isso é verificado pelo CI, não pela
 * boa vontade do revisor.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-refresh', 'jsx-a11y'],
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    'playwright-report',
    'test-results',
    'public/mockServiceWorker.js',
    '.eslintrc.cjs',
    'postcss.config.js',
  ],
  settings: {},
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // `any` só com justificativa: a regra obriga a desabilitar na linha, o que
    // aparece no diff e força a explicação no PR.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',

    // Nenhum valor mágico de estilo: cor, tamanho, raio e espaçamento vêm do
    // tailwind.config.ts (RNF-017 e docs/06-marca/design-system.md).
    // Valor arbitrário do Tailwind (`text-[#E8542E]`, `p-[13px]`) sempre contém
    // um `[` no className. A regra procura exatamente isso: nenhuma classe de
    // token legítima tem colchete. O seletor evita classe de caractere porque o
    // `]` encerraria o atributo do próprio seletor do esquery.
    'no-restricted-syntax': [
      'error',
      {
        selector: String.raw`JSXAttribute[name.name='className'] Literal[value=/\[/]`,
        message:
          'Valor arbitrário em className. Use um token do tailwind.config.ts (ex: bg-accent-strong, p-4, rounded-lg).',
      },
      {
        selector: String.raw`JSXAttribute[name.name='className'] TemplateElement[value.raw=/\[/]`,
        message:
          'Valor arbitrário em className. Use um token do tailwind.config.ts (ex: bg-accent-strong, p-4, rounded-lg).',
      },
      {
        selector: "JSXAttribute[name.name='style']",
        message:
          'Estilo inline não é permitido em componente. Use classes utilitárias com os tokens; se falta um token, adicione-o ao tailwind.config.ts.',
      },
    ],
  },

  overrides: [
    {
      // Telas e componentes não conhecem a origem dos dados nem o mock.
      files: ['src/pages/**/*.tsx', 'src/components/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/mocks/**', '@/mocks/*'],
                message:
                  'Tela/componente não importa o mock. Fale com a camada de serviços (src/services) — RNF-016.',
              },
              {
                group: ['axios', 'msw', 'msw/*'],
                message:
                  'Nenhuma tela faz HTTP direto. Toda chamada passa por um repositório de src/services.',
              },
            ],
          },
        ],
      },
    },
    {
      // Componente de design system é apresentacional: recebe dados por props.
      files: ['src/components/ui/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/services/**', '**/store/**', '**/hooks/use*Query*', '**/mocks/**'],
                message:
                  'Componente de design system não busca dado nem lê store. Receba por props.',
              },
            ],
          },
        ],
      },
    },
    {
      // Domínio é puro: sem React, sem rede, sem mock. É o que permite reusar
      // as mesmas regras no servidor no CP6.
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react-dom', 'react-router-dom', '**/services/**', '**/mocks/**', '**/components/**'],
                message:
                  'src/domain é puro: só tipos de domínio e outras funções de domínio. Ver ADR-0003.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.ts'],
      env: { node: true },
      rules: {
        'no-restricted-imports': 'off',
        'no-restricted-syntax': 'off',
      },
    },
    {
      files: ['e2e/**/*.ts', 'playwright.config.ts', 'vite.config.ts', 'tailwind.config.ts'],
      env: { node: true },
      rules: { 'no-restricted-syntax': 'off' },
    },
  ],
};
