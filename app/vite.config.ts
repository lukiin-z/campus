// `defineConfig` do vitest/config aceita o bloco `test` sem plugin extra.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// A base precisa casar com o caminho do GitHub Pages (https://lukiin-z.github.io/campus/).
// Em dev e em teste a base é '/', senão o roteador e os assets quebram localmente.
const base = process.env.GITHUB_PAGES === 'true' ? '/campus/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separa o vendor para o pacote inicial caber no orçamento do RNF-007.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/domain/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // RNF-015: cobertura mínima nos módulos de domínio.
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 55 },
    },
  },
});
