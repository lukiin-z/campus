/// <reference types="vite/client" />

/**
 * Variáveis de ambiente do app.
 *
 * O `ImportMetaEnv` do `vite/client` tem índice `[key: string]: any` — ou seja,
 * `import.meta.env.QUALQUER_COISA` compila e vale `undefined` em execução. Um
 * erro de digitação em `VITE_DATA_SOURCE` passaria pelo `tsc` e só apareceria
 * como "o app ignorou minha configuração". Declarar cada chave aqui devolve o
 * erro para o compilador.
 *
 * Todas são opcionais: o app tem de subir sem `.env` nenhum (é o caso do
 * GitHub Pages e o do Vitest). Os padrões estão no código, junto da explicação
 * — `services/index.ts` para a fonte de dados, `services/api/index.ts` para o
 * endereço e o tempo limite.
 */
interface ImportMetaEnv {
  /**
   * `mock` (padrão) usa o mock do CP5 interceptado pelo MSW; `api` fala com a
   * API real. Qualquer outro valor cai no mock.
   */
  readonly VITE_DATA_SOURCE?: 'mock' | 'api';
  /** Endereço da API, já com o prefixo `/api`. Só vale com `VITE_DATA_SOURCE=api`. */
  readonly VITE_API_URL?: string;
  /** Tempo limite de cada requisição, em milissegundos. Padrão: 10000. */
  readonly VITE_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
