import type { ParDeTokens, PortaDeSessao } from '../lib/api';

/**
 * Onde os tokens da sessão moram.
 *
 * ## O que mudou do CP5 para cá
 *
 * O CP5 tinha **um** token, guardado em `sessionStorage` sob `campus.token`. O
 * contrato do CP6 tem dois, com tempos de vida muito diferentes: o access token
 * vale 15 minutos e o refresh vale a sessão inteira, é revogável e tem o hash
 * guardado na tabela `sessao` (openapi.yaml, `securitySchemes.bearer`, RNF-020).
 * Dois tokens obrigam a decidir onde cada um mora — e a decisão tem consequência
 * de segurança, então ela fica escrita aqui.
 *
 * ## A decisão
 *
 * **Os dois em `sessionStorage`**, em chaves separadas. Nenhum em
 * `localStorage`, nenhum em cookie, nenhum só em memória.
 *
 * ### Por que não `localStorage`
 *
 * Porque fechar a aba tem de encerrar a sessão. As personas usam o laboratório
 * da faculdade: máquina compartilhada, navegador com o perfil de todo mundo.
 * `localStorage` sobrevive ao fechamento e entregaria a conta da Marina para o
 * próximo aluno que sentasse na mesma cadeira. `sessionStorage` morre com a aba,
 * e é essa a regra do CP5 que este arquivo mantém.
 *
 * ### Por que não deixar o refresh só em memória
 *
 * É a alternativa que a literatura sugere primeiro, e ela custa mais do que
 * parece. Em memória, o refresh morre no F5 — e recarregar a página é o gesto
 * mais comum que existe. O access token em `sessionStorage` sobreviveria, então
 * o usuário continuaria dentro do app por até 15 minutos e seria expulso no meio
 * da navegação, sem entender por quê. Uma sessão que se degrada em silêncio
 * depois de um F5 é pior de diagnosticar do que uma que termina.
 *
 * E o ganho de segurança é menor do que aparenta: um script injetado que
 * consegue ler `sessionStorage` já está executando **dentro** da página, com
 * acesso ao access token e ao próprio cliente HTTP do app — ele pode agir como o
 * usuário enquanto a aba estiver aberta, e manter o acesso renovando pelo mesmo
 * caminho que o app usa. Guardar o refresh fora do storage não fecha esse
 * cenário; quem o fecha é a revogação no servidor (o hash na tabela `sessao`,
 * que permite invalidar a sessão sem esperar expirar) e o `sair` que a chama.
 *
 * ### O que continua sendo verdade
 *
 * - fechar a aba encerra a sessão (os dois tokens morrem com o `sessionStorage`);
 * - `definirToken(null)` — o "sair" — apaga os dois de uma vez;
 * - storage indisponível (janela privada, iframe restrito, armazenamento
 *   desligado) não derruba o app: a sessão passa a viver só em memória e dura
 *   até o recarregamento.
 */

/** Mantida do CP5: uma aba já aberta na hora do deploy não perde a sessão. */
const CHAVE_ACCESS = 'campus.token';
const CHAVE_REFRESH = 'campus.refresh';

function ler(chave: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(chave) ?? null;
  } catch {
    // Modo privado e iframe bloqueiam storage. Sessão em memória ainda funciona.
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor) globalThis.sessionStorage?.setItem(chave, valor);
    else globalThis.sessionStorage?.removeItem(chave);
  } catch {
    // Ignora: o token em memória basta até a aba fechar.
  }
}

let accessToken: string | null = ler(CHAVE_ACCESS);
let refreshToken: string | null = ler(CHAVE_REFRESH);

/**
 * Define (ou apaga) o token de acesso.
 *
 * Assinatura preservada do CP5 — `App.tsx` e `hooks/useCampusData` chamam isto,
 * e a troca de fonte de dados não pode aparecer para eles.
 *
 * `definirToken(null)` apaga **os dois** tokens. Deixar o refresh para trás
 * depois de um "sair" seria pior do que não ter saído: bastaria um `401` numa
 * requisição atrasada para o cliente renovar sozinho e a sessão voltar.
 */
export function definirToken(token: string | null): void {
  accessToken = token;
  gravar(CHAVE_ACCESS, token);

  if (!token) {
    refreshToken = null;
    gravar(CHAVE_REFRESH, null);
  }
}

export function obterToken(): string | null {
  return accessToken;
}

export function obterRefreshToken(): string | null {
  return refreshToken;
}

/**
 * Guarda o par recebido de `/auth/login`, `/auth/cadastro` ou `/auth/refresh`.
 *
 * `expiraEm` é aceito porque o contrato o manda, e é deliberadamente **não
 * usado** para decidir quando renovar. Renovação preventiva por relógio local
 * depende de o relógio do computador do laboratório estar certo — e ele
 * frequentemente não está. O cliente renova em reação ao `401`, que é a única
 * fonte confiável de "este token não vale mais" (ver `lib/api.ts`).
 */
export function guardarSessao(par: ParDeTokens): void {
  accessToken = par.accessToken;
  refreshToken = par.refreshToken;
  gravar(CHAVE_ACCESS, par.accessToken);
  gravar(CHAVE_REFRESH, par.refreshToken);
}

export function encerrarSessao(): void {
  definirToken(null);
}

/** O que o cliente HTTP consome. Ele não conhece storage nem nome de chave. */
export const portaDeSessao: PortaDeSessao = {
  obterAccessToken: obterToken,
  obterRefreshToken,
  guardarSessao,
  encerrar: encerrarSessao,
};
