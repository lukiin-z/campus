/**
 * Cliente HTTP do Campus.
 *
 * ## Por que este arquivo existe
 *
 * Até o CP5 a única implementação de transporte era `services/http`, e o
 * "servidor" dela era o MSW rodando no mesmo processo. Um servidor assim **nunca
 * falha de verdade**: não perde pacote, não demora, não devolve `401` por token
 * expirado. Todo o tratamento que uma API real exige — tempo limite, renovação
 * de sessão, distinção entre "a rede caiu" e "o servidor recusou" — não existia
 * porque nada nunca o exercitou.
 *
 * Este módulo é esse tratamento, isolado do que fala de domínio. Quem chama
 * continua vendo `request<T>(caminho, init)`; o que muda é que agora a promessa
 * termina, sempre, em um dos três resultados: valor, `ApiError` (o servidor
 * respondeu e recusou) ou `NetworkError` (não houve resposta).
 *
 * ## Por que é uma fábrica, e não um cliente único
 *
 * O CP6 tem duas fontes de dados vivas ao mesmo tempo (ADR-0003): o mock do CP5,
 * que sustenta a demonstração sem backend, e a API real. As duas precisam do
 * mesmo tratamento de rede e de políticas diferentes de sessão — o mock do CP5
 * não tem `/auth/refresh`, e tentar renovar contra ele cairia direto no
 * `onUnhandledRequest` do MSW. Uma fábrica com configuração resolve isso sem
 * duplicar o cliente.
 */

/** Corpo de erro do contrato (`components/schemas/Erro` do openapi.yaml). */
interface CorpoDeErro {
  erro?: string;
  mensagem?: string;
  [chave: string]: unknown;
}

/**
 * Erro de API: o servidor respondeu, com código e mensagem próprios.
 *
 * A tela decide o que mostrar pelo `codigo`, nunca pelo texto — `mensagem` é
 * escrita para leitura humana e pode mudar sem aviso (openapi.yaml, `Erro`).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(mensagem);
    this.name = 'ApiError';
  }
}

export type MotivoFalhaDeRede = 'TIMEOUT' | 'INDISPONIVEL';

/**
 * Falha de rede: **não houve resposta**.
 *
 * Precisa ser distinguível de `ApiError` porque a tela reage de forma oposta.
 * "As inscrições deste evento já encerraram" é informação — o usuário lê e
 * desiste. "Não conseguimos falar com o servidor" é convite a tentar de novo, e
 * é a única das duas que justifica repetir a requisição (ver `lib/queryClient`,
 * que só repete o que não é `ApiError`).
 *
 * Herda de `Error` e não de `ApiError` de propósito: `mensagemDeErro` em
 * `hooks/useCampusData` já separa os dois casos por `instanceof`, e continua
 * valendo sem alteração nenhuma nas telas.
 */
export class NetworkError extends Error {
  constructor(
    readonly motivo: MotivoFalhaDeRede,
    mensagem: string,
    /** Erro original (`TypeError` do fetch, `AbortError`), para depuração. */
    readonly causa: unknown = null,
  ) {
    super(mensagem);
    this.name = 'NetworkError';
  }
}

/** Par de tokens de `/auth/login`, `/auth/cadastro` e `/auth/refresh`. */
export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
  /** Segundos de validade do access token. O contrato informa; ver nota abaixo. */
  expiraEm?: number;
}

/**
 * O que o cliente precisa saber sobre a sessão — e nada além disso.
 *
 * O cliente não conhece `sessionStorage` nem a chave usada: onde o token mora é
 * decisão de `services/sessao.ts`, que é onde a consequência de segurança está
 * documentada. Aqui só interessa ler, gravar e encerrar.
 */
export interface PortaDeSessao {
  obterAccessToken(): string | null;
  obterRefreshToken(): string | null;
  guardarSessao(par: ParDeTokens): void;
  encerrar(): void;
}

/**
 * `RequestInit` com `headers` restrito a objeto simples.
 *
 * O `HeadersInit` do DOM aceita `Headers` e pares em array, e nenhum dos dois
 * sobrevive ao espalhamento (`...init.headers`) que monta os cabeçalhos — o
 * resultado seria um objeto vazio e um `Authorization` silenciosamente perdido.
 * Como todos os chamadores são deste repositório, restringir o tipo é melhor do
 * que normalizar em tempo de execução.
 */
export type OpcoesRequisicao = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export interface ClienteHttp {
  request<T>(caminho: string, init?: OpcoesRequisicao): Promise<T>;
}

export interface ConfigCliente {
  /** Prefixo de toda requisição, já incluindo `/api`. */
  baseUrl: string;
  sessao: PortaDeSessao;
  /**
   * Renovar a sessão automaticamente em `401`.
   *
   * Desligado no cliente do mock: o MSW do CP5 não tem `/auth/refresh`, e a
   * requisição extra pararia a suíte no `onUnhandledRequest: 'error'`.
   */
  renovarEm401: boolean;
  timeoutMs?: number;
}

/**
 * Tempo limite padrão.
 *
 * Sem limite, `fetch` espera o que o sistema operacional der — dezenas de
 * segundos — e a tela fica em carregamento sem fim quando a API não responde.
 * 10 s é folgado para a rede do campus e curto o bastante para o usuário
 * receber uma mensagem em vez de um esqueleto eterno.
 */
const TIMEOUT_PADRAO_MS = 10_000;

const CAMINHO_REFRESH = '/auth/refresh';

/**
 * Caminhos em que `401` é resposta final, não sessão vencida.
 *
 * Em `/auth/login` o `401` é "e-mail ou senha não conferem" (RN-002): tentar
 * renovar ali produziria uma requisição inútil a cada erro de digitação, e — no
 * pior caso — mascararia a recusa com uma sessão antiga ainda válida. Em
 * `/auth/refresh` a renovação já É a requisição; repetir seria laço infinito.
 */
const SEM_RENOVACAO: ReadonlySet<string> = new Set([
  '/auth/login',
  '/auth/cadastro',
  '/auth/logout',
  CAMINHO_REFRESH,
]);

function semQuery(caminho: string): string {
  return caminho.split('?')[0] ?? caminho;
}

/**
 * O `fetch` deste ambiente aceita o `AbortSignal` deste realm?
 *
 * No navegador, sempre — `window.fetch` e `window.AbortController` são do mesmo
 * realm. Na suíte, não: o ambiente é jsdom (que implementa `AbortController`) e
 * o `fetch` é o do Node/undici, que valida o sinal por marca de classe e recusa
 * o de fora com `TypeError: RequestInit: Expected signal ("AbortSignal {}") to
 * be an instance of AbortSignal`.
 *
 * Isso não é hipótese: foi o que aconteceu na primeira versão deste arquivo, e o
 * sintoma foram 55 testes falhando com "não conseguimos falar com o servidor" —
 * todos, porque nenhuma requisição chegava a sair.
 *
 * A sonda decide uma vez. Onde o sinal é aceito, o tempo limite **cancela** a
 * requisição e libera a conexão; onde não é, ele ainda rejeita a promessa no
 * prazo (é o que a tela precisa), e a resposta que chegar depois é descartada.
 * Perder o cancelamento em ambiente de teste é aceitável; perder o tempo limite
 * não seria.
 */
const SINAL_ACEITO_PELO_FETCH: boolean = (() => {
  try {
    if (typeof Request !== 'function') return false;
    void new Request('http://localhost/sonda', { signal: new AbortController().signal });
    return true;
  } catch {
    return false;
  }
})();

export function criarClienteHttp(config: ConfigCliente): ClienteHttp {
  const timeoutMs = config.timeoutMs ?? TIMEOUT_PADRAO_MS;

  /**
   * Renovação em curso, compartilhada por todas as requisições.
   *
   * ## O problema que esta variável resolve
   *
   * O access token vale 15 minutos (openapi.yaml, `securitySchemes.bearer`). Ele
   * não expira em um momento calmo: expira no meio da tela do feed, que dispara
   * `/sessao`, `/eventos`, `/eventos/destaque`, `/feed` e `/notificacoes`
   * praticamente juntas. As cinco recebem `401` quase ao mesmo tempo.
   *
   * Sem coordenação, cada uma chamaria `/auth/refresh` com o MESMO refresh
   * token. O contrato guarda o hash do refresh na tabela `sessao` e o rotaciona
   * (RNF-020): a primeira renovação invalida o token que as outras quatro ainda
   * estão enviando. Resultado: uma renova, quatro recebem `401` no refresh, e o
   * `encerrar()` da quarta derruba a sessão que a primeira acabou de renovar. O
   * sintoma para o usuário é ser expulso ao abrir o feed — e ele é
   * intermitente, porque depende de qual resposta chega primeiro.
   *
   * Com a promessa compartilhada, as cinco esperam a MESMA renovação e repetem
   * com o token novo. Uma chamada a `/auth/refresh`, não cinco.
   *
   * O `finally` zera a variável: ela só existe enquanto a renovação está em voo.
   * Um `401` que chegue depois — token novo já vencido, o que é possível se a
   * aba dormiu — começa uma renovação nova em vez de reusar uma promessa velha
   * já resolvida.
   */
  let renovacaoEmCurso: Promise<string | null> | null = null;

  function montarCabecalhos(init: OpcoesRequisicao | undefined, token: string | null) {
    return {
      /*
       * `Content-Type` só quando há corpo. Em requisição sem corpo o cabeçalho
       * não significa nada e, contra outra origem (`VITE_API_URL` aponta para
       * `localhost:3000` em desenvolvimento), ele por si só já obriga o
       * navegador a um preflight.
       */
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    };
  }

  async function enviar(
    caminho: string,
    init: OpcoesRequisicao | undefined,
    token: string | null,
  ): Promise<Response> {
    const { signal: externo, ...resto } = init ?? {};

    const controlador = new AbortController();
    let expirou = false;
    let relogio: ReturnType<typeof setTimeout> | undefined;

    /*
     * O prazo é uma promessa que rejeita, e não só um `abort`.
     *
     * Com o sinal aceito, `abort()` já faria o `fetch` rejeitar e esta promessa
     * seria redundante. Sem ele, `abort()` não tem efeito nenhum e a tela
     * ficaria esperando para sempre — que é exatamente o defeito que o tempo
     * limite existe para evitar. As duas rotas terminam no mesmo
     * `NetworkError('TIMEOUT')`, então o comportamento observável é um só.
     */
    const prazo = new Promise<never>((_, rejeitar) => {
      relogio = setTimeout(() => {
        expirou = true;
        controlador.abort();
        rejeitar(
          new NetworkError(
            'TIMEOUT',
            'O servidor não respondeu. Tente de novo em alguns instantes.',
          ),
        );
      }, timeoutMs);
    });

    // Cancelamento pedido por quem chama (React Query desmontando a tela, por
    // exemplo) tem de continuar funcionando: o sinal do cliente é somado a ele,
    // não o substitui.
    const propagar = () => controlador.abort();
    externo?.addEventListener('abort', propagar);

    try {
      const requisicao = fetch(`${config.baseUrl}${caminho}`, {
        ...resto,
        headers: montarCabecalhos(init, token),
        ...(SINAL_ACEITO_PELO_FETCH ? { signal: controlador.signal } : {}),
      });
      /*
       * Quando o prazo ganha a corrida, a rejeição do `fetch` abortado fica sem
       * quem a leia e o Node a reporta como "unhandled rejection" — ruído que
       * derruba a suíte por si só. O erro já está representado no `prazo`.
       */
      requisicao.catch(() => undefined);

      return await Promise.race([requisicao, prazo]);
    } catch (erro) {
      if (expirou) {
        // Ou é o `NetworkError` do prazo, ou é o `AbortError` do `fetch`
        // cancelado por ele. Os dois querem dizer a mesma coisa para a tela.
        throw erro instanceof NetworkError
          ? erro
          : new NetworkError(
              'TIMEOUT',
              'O servidor não respondeu. Tente de novo em alguns instantes.',
              erro,
            );
      }
      // Aborto de quem chamou não é falha: propaga como veio, para o chamador
      // reconhecer o próprio cancelamento.
      if (externo?.aborted) throw erro;
      throw new NetworkError(
        'INDISPONIVEL',
        'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.',
        erro,
      );
    } finally {
      clearTimeout(relogio);
      externo?.removeEventListener('abort', propagar);
    }
  }

  async function executar<T>(
    caminho: string,
    init: OpcoesRequisicao | undefined,
    token: string | null,
  ): Promise<T> {
    const resposta = await enviar(caminho, init, token);

    if (resposta.status === 204) return undefined as T;

    if (!resposta.ok) {
      /*
       * No caminho de ERRO o `{}` é razoável: uma resposta de falha pode
       * legitimamente vir sem corpo JSON (um 502 de proxy, um 413 do servidor
       * web), e os padrões abaixo dão uma mensagem utilizável.
       */
      const dados = (await resposta.json().catch(() => ({}))) as CorpoDeErro;
      const { erro, mensagem, ...extra } = dados;
      throw new ApiError(
        resposta.status,
        erro ?? 'ERRO_DESCONHECIDO',
        mensagem ?? 'Não foi possível concluir a operação. Tente de novo.',
        extra,
      );
    }

    /*
     * No caminho de SUCESSO ele não é. Aqui havia
     * `resposta.json().catch(() => ({}))` para os dois caminhos, e o `{}` de
     * consolo transformava resposta ilegível em sucesso com dados vazios.
     *
     * Isso não é hipótese: com o MSW fora do ar sob um servidor que faz fallback
     * de SPA — `vite preview`, o nginx do compose, qualquer host de SPA —,
     * `GET /api/eventos` responde **200 com o index.html**. O `json()` rejeitava,
     * o `catch` devolvia `{}`, a tela chamava `eventos.map(...)` e o resultado
     * medido foi `TypeError: Cannot read properties of undefined (reading 'map')`
     * com a página em branco.
     *
     * Um 200 que não é JSON é resposta quebrada, e dizer isso em voz alta é o que
     * permite às telas mostrarem o estado de erro que elas já têm.
     */
    const texto = await resposta.text();
    if (texto === '') return undefined as T;

    try {
      return JSON.parse(texto) as T;
    } catch {
      throw new ApiError(
        502,
        'RESPOSTA_INVALIDA',
        'O servidor respondeu em um formato que o app não entende. Tente de novo em instantes.',
        {
          contentType: resposta.headers.get('content-type'),
          // Amostra curta: o suficiente para reconhecer HTML de fallback no
          // relatório de erro, sem despejar a página inteira no console.
          amostra: texto.slice(0, 80),
        },
      );
    }
  }

  async function renovarSessao(): Promise<string | null> {
    const refreshToken = config.sessao.obterRefreshToken();
    // Sem refresh guardado não há o que tentar — é o caso de quem nunca entrou,
    // e o `401` dele é legítimo.
    if (!refreshToken) return null;

    try {
      // Sem `Authorization`: o access token que temos está vencido, e o
      // contrato autentica esta rota pelo corpo (`security: []`).
      const par = await executar<ParDeTokens>(
        CAMINHO_REFRESH,
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        null,
      );
      if (!par?.accessToken) return null;
      config.sessao.guardarSessao(par);
      return par.accessToken;
    } catch {
      /*
       * Qualquer falha aqui — `401` de refresh revogado, `NetworkError` de rede
       * caída — resulta em "não renovou". Distinguir os dois não mudaria a
       * decisão de quem chamou: o erro que a tela recebe é o original da
       * requisição do usuário, não este.
       */
      return null;
    }
  }

  function renovacaoCompartilhada(): Promise<string | null> {
    renovacaoEmCurso ??= renovarSessao().finally(() => {
      renovacaoEmCurso = null;
    });
    return renovacaoEmCurso;
  }

  function deveRenovar(erro: unknown, caminho: string): boolean {
    if (!config.renovarEm401) return false;
    if (!(erro instanceof ApiError) || erro.status !== 401) return false;
    return !SEM_RENOVACAO.has(semQuery(caminho));
  }

  return {
    async request<T>(caminho: string, init?: OpcoesRequisicao): Promise<T> {
      try {
        return await executar<T>(caminho, init, config.sessao.obterAccessToken());
      } catch (erro) {
        if (!deveRenovar(erro, caminho)) {
          /*
           * Nenhuma repetição automática fora do caso de `401`.
           *
           * `500` e tempo limite em um `POST /eventos/:id/participacoes` são
           * ambíguos por natureza: a vaga pode ter sido reservada e a resposta
           * ter se perdido no caminho. Repetir sozinho criaria a segunda
           * inscrição — ou, no pagamento, a segunda cobrança. Quem repete é o
           * usuário, com o dedo, sabendo o que está fazendo (RN-015, RN-027).
           */
          throw erro;
        }

        const tokenNovo = await renovacaoCompartilhada();
        if (!tokenNovo) {
          // Sem renovação não há sessão: melhor cair na tela de login do que
          // deixar o app pedindo dados que nunca virão.
          config.sessao.encerrar();
          throw erro;
        }

        /*
         * Repetição única, e só aqui.
         *
         * `401` vem do guard, antes de o handler tocar em qualquer estado: a
         * requisição foi recusada sem ser executada, então repeti-la não
         * duplica efeito nenhum, nem em `POST`. É por isso que esta é a única
         * repetição automática do cliente.
         *
         * `init.body` é sempre string (`JSON.stringify`) nos chamadores deste
         * repositório, e string se reenvia. Um corpo de fluxo (`FormData` com
         * arquivo, `ReadableStream`) já teria sido consumido — se algum dia
         * existir upload, ele precisa passar por um caminho próprio.
         */
        return await executar<T>(caminho, init, tokenNovo);
      }
    },
  };
}
