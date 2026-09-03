import { HttpResponse, delay, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';
import {
  ApiError,
  NetworkError,
  apiRepositories,
  escolherRepositorios,
  httpRepositories,
  obterToken,
  type Repositories,
} from './index';
import { BASE_URL_API } from './api';
import { guardarSessao, obterRefreshToken } from './sessao';
import { criarClienteHttp, type ParDeTokens, type PortaDeSessao } from '../lib/api';
import type { Participacao, SessaoUsuario, StatusParticipacao } from '../types/domain';

/**
 * CT-041 — a troca de fonte de dados e o tratamento de rede que ela exige.
 *
 * Os 377 casos do CP5 provam que a **interface** não mudou: eles rodam contra o
 * mock, sem saber que existe uma segunda implementação. O que eles não podem
 * provar é o que só aparece com um servidor de verdade — porque o MSW nunca
 * falha de verdade. É o que este arquivo cobre:
 *
 * - o container devolve a implementação certa para cada valor da variável;
 * - `401` simultâneo em várias requisições dispara UMA renovação, não N;
 * - falha de rede é distinguível de recusa do servidor;
 * - requisição não idempotente não é repetida sozinha;
 * - a forma nova do contrato (dois tokens no login, `Participacao` crua na
 *   inscrição) é traduzida na camada de serviço, e não nas telas.
 */

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

/** Base própria para os casos do cliente: não colide com o mock nem com a API. */
const BASE_TESTE = 'http://api.teste.local/api';

interface SessaoDeTeste extends PortaDeSessao {
  readonly guardados: ParDeTokens[];
  readonly encerramentos: () => number;
}

function sessaoDeTeste(inicial: { access: string | null; refresh: string | null }): SessaoDeTeste {
  let access = inicial.access;
  let refresh = inicial.refresh;
  const guardados: ParDeTokens[] = [];
  let encerrada = 0;

  return {
    guardados,
    encerramentos: () => encerrada,
    obterAccessToken: () => access,
    obterRefreshToken: () => refresh,
    guardarSessao: (par) => {
      guardados.push(par);
      access = par.accessToken;
      refresh = par.refreshToken;
    },
    encerrar: () => {
      encerrada += 1;
      access = null;
      refresh = null;
    },
  };
}

function sessaoUsuarioFalsa(): SessaoUsuario {
  return {
    usuario: {
      id: 'usr-900',
      nome: 'Ana Souza',
      email: 'ana.souza@fiap.com.br',
      avatarSeed: 3,
      faculdadeId: 'fac-001',
      cursoId: null,
      turmaId: null,
      papeis: ['ALUNO'],
      emailVerificado: true,
      visivelEntreConfirmados: true,
      criadoEm: '2026-01-10T12:00:00.000Z',
    },
    faculdade: {
      id: 'fac-001',
      nome: 'FIAP',
      sigla: 'FIAP',
      dominiosEmail: ['fiap.com.br'],
      criadoEm: '2026-01-01T00:00:00.000Z',
    },
    curso: null,
    turma: null,
  };
}

function participacaoFalsa(status: StatusParticipacao): Participacao {
  return {
    id: 'par-900',
    eventoId: 'evt-001',
    usuarioId: 'usr-900',
    status,
    posicaoFila: null,
    pagamentoExpiraEm: null,
    ofertaExpiraEm: null,
    motivoCancelamento: null,
    canceladaAposPrazo: false,
    politicaVigente: null,
    criadoEm: '2026-03-01T12:00:00.000Z',
    atualizadoEm: '2026-03-01T12:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// O container
// ---------------------------------------------------------------------------

describe('escolha da fonte de dados (RNF-016, ADR-0003)', () => {
  it('mock devolve a implementação interceptada pelo MSW; api devolve a HTTP real', () => {
    expect(escolherRepositorios('mock')).toBe(httpRepositories);
    expect(escolherRepositorios('api')).toBe(apiRepositories);
  });

  it('sem variável — e com valor inválido — o padrão é o mock', () => {
    /*
     * Este é o caso que sustenta a demonstração: o GitHub Pages serve arquivo
     * estático, sem servidor para chamar. Um padrão diferente faria a página
     * publicada mostrar erro em toda tela — e faria a suíte, onde a variável
     * também não existe, tentar sair para a rede.
     */
    expect(escolherRepositorios(undefined)).toBe(httpRepositories);
    expect(escolherRepositorios('')).toBe(httpRepositories);
    expect(escolherRepositorios('API')).toBe(httpRepositories);
  });

  it('as duas implementações expõem exatamente os mesmos métodos', () => {
    /*
     * O compilador já garante isso pelos tipos. O caso existe porque a garantia
     * de tipo desaparece se alguém trocar a anotação por um `as Repositories` —
     * e aí a divergência só apareceria na tela que chamasse o método ausente.
     */
    const chaves = Object.keys(apiRepositories) as Array<keyof Repositories>;
    expect(chaves.length).toBeGreaterThan(0);

    for (const chave of chaves) {
      expect(Object.keys(httpRepositories[chave]).sort()).toEqual(
        Object.keys(apiRepositories[chave]).sort(),
      );
    }
  });

  it('o mock recusa, com código explícito, os endpoints que só a API tem', async () => {
    // Falhar dizendo o motivo é melhor do que chamar uma rota que o MSW não
    // conhece — em teste isso é erro sem explicação, e na demonstração é um 404
    // do servidor de arquivos estáticos.
    await expect(httpRepositories.health.verificar()).rejects.toMatchObject({
      codigo: 'NAO_IMPLEMENTADO_NO_MOCK',
    });
    await expect(httpRepositories.events.aprovar('evt-001')).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// O cliente HTTP
// ---------------------------------------------------------------------------

describe('renovação de sessão em 401 (RNF-020)', () => {
  it('várias requisições com 401 ao mesmo tempo disparam UMA renovação', async () => {
    /*
     * O cenário real: o access token vale 15 minutos e vence no meio da tela do
     * feed, que dispara `/sessao`, `/eventos`, `/eventos/destaque`, `/feed` e
     * `/notificacoes` praticamente juntas.
     *
     * Sem promessa compartilhada, as cinco chamariam `/auth/refresh` com o mesmo
     * refresh token. Como o contrato rotaciona o refresh (o hash fica na tabela
     * `sessao`), a primeira renovação invalida o token das outras quatro — que
     * recebem 401 no refresh e encerram a sessão que a primeira acabou de
     * renovar. O usuário é expulso ao abrir o feed, de forma intermitente.
     */
    let renovacoes = 0;
    let atendidasComTokenNovo = 0;

    server.use(
      http.post(`${BASE_TESTE}/auth/refresh`, async () => {
        renovacoes += 1;
        // A demora é essencial: sem ela as cinco requisições não se sobrepõem e
        // o teste passaria mesmo sem a promessa compartilhada.
        await delay(40);
        return HttpResponse.json({ accessToken: 'novo', refreshToken: 'r2', expiraEm: 900 });
      }),
      http.get(`${BASE_TESTE}/protegido`, ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer novo') {
          return HttpResponse.json(
            { erro: 'TOKEN_EXPIRADO', mensagem: 'Sessão vencida.' },
            {
              status: 401,
            },
          );
        }
        atendidasComTokenNovo += 1;
        return HttpResponse.json({ ok: true });
      }),
    );

    const sessao = sessaoDeTeste({ access: 'velho', refresh: 'r1' });
    const cliente = criarClienteHttp({ baseUrl: BASE_TESTE, sessao, renovarEm401: true });

    const respostas = await Promise.all([
      cliente.request<{ ok: boolean }>('/protegido'),
      cliente.request<{ ok: boolean }>('/protegido'),
      cliente.request<{ ok: boolean }>('/protegido'),
      cliente.request<{ ok: boolean }>('/protegido'),
      cliente.request<{ ok: boolean }>('/protegido'),
    ]);

    expect(respostas.every((r) => r.ok)).toBe(true);
    expect(renovacoes).toBe(1);
    expect(atendidasComTokenNovo).toBe(5);
    expect(sessao.guardados).toHaveLength(1);
    expect(sessao.encerramentos()).toBe(0);
  });

  it('renovação recusada encerra a sessão e propaga o 401 original', async () => {
    server.use(
      http.post(`${BASE_TESTE}/auth/refresh`, () =>
        HttpResponse.json(
          { erro: 'REFRESH_REVOGADO', mensagem: 'Entre de novo.' },
          { status: 401 },
        ),
      ),
      http.get(`${BASE_TESTE}/protegido`, () =>
        HttpResponse.json({ erro: 'TOKEN_EXPIRADO', mensagem: 'Sessão vencida.' }, { status: 401 }),
      ),
    );

    const sessao = sessaoDeTeste({ access: 'velho', refresh: 'r1' });
    const cliente = criarClienteHttp({ baseUrl: BASE_TESTE, sessao, renovarEm401: true });

    // O erro que chega à tela é o da requisição do usuário, não o do refresh:
    // "sessão vencida" é o que explica a ida para o login.
    await expect(cliente.request('/protegido')).rejects.toMatchObject({
      status: 401,
      codigo: 'TOKEN_EXPIRADO',
    });
    expect(sessao.encerramentos()).toBe(1);
  });

  it('401 no login não tenta renovar: é credencial errada, não sessão vencida', async () => {
    const refresh = vi.fn();
    server.use(
      http.post(`${BASE_TESTE}/auth/refresh`, () => {
        refresh();
        return HttpResponse.json({ accessToken: 'novo', refreshToken: 'r2' });
      }),
      http.post(`${BASE_TESTE}/auth/login`, () =>
        HttpResponse.json(
          { erro: 'CREDENCIAL_INVALIDA', mensagem: 'E-mail ou senha não conferem.' },
          { status: 401 },
        ),
      ),
    );

    const sessao = sessaoDeTeste({ access: 'velho', refresh: 'r1' });
    const cliente = criarClienteHttp({ baseUrl: BASE_TESTE, sessao, renovarEm401: true });

    await expect(
      cliente.request('/auth/login', { method: 'POST', body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ codigo: 'CREDENCIAL_INVALIDA' });
    // Renovar aqui gastaria uma requisição por erro de digitação e, no pior
    // caso, mascararia a recusa com uma sessão antiga ainda válida.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('sem refresh guardado, o 401 passa direto e a sessão termina', async () => {
    server.use(
      http.get(`${BASE_TESTE}/protegido`, () =>
        HttpResponse.json(
          { erro: 'TOKEN_AUSENTE', mensagem: 'Entre para continuar.' },
          {
            status: 401,
          },
        ),
      ),
    );

    const sessao = sessaoDeTeste({ access: null, refresh: null });
    const cliente = criarClienteHttp({ baseUrl: BASE_TESTE, sessao, renovarEm401: true });

    await expect(cliente.request('/protegido')).rejects.toBeInstanceOf(ApiError);
    expect(sessao.encerramentos()).toBe(1);
  });
});

describe('erro de rede versus erro de negócio', () => {
  it('servidor que não responde no prazo vira NetworkError de TIMEOUT', async () => {
    server.use(
      http.get(`${BASE_TESTE}/lento`, async () => {
        await delay(300);
        return HttpResponse.json({ ok: true });
      }),
    );

    const cliente = criarClienteHttp({
      baseUrl: BASE_TESTE,
      sessao: sessaoDeTeste({ access: null, refresh: null }),
      renovarEm401: false,
      timeoutMs: 30,
    });

    const erro = await cliente.request('/lento').catch((e: unknown) => e);
    // Sem tempo limite, esta promessa nunca terminaria e a tela ficaria em
    // carregamento para sempre — o defeito que o AbortController evita.
    expect(erro).toBeInstanceOf(NetworkError);
    expect(erro).toMatchObject({ motivo: 'TIMEOUT' });
    expect(erro).not.toBeInstanceOf(ApiError);
  });

  it('conexão que falha vira NetworkError, e não ApiError', async () => {
    server.use(http.get(`${BASE_TESTE}/caiu`, () => HttpResponse.error()));

    const cliente = criarClienteHttp({
      baseUrl: BASE_TESTE,
      sessao: sessaoDeTeste({ access: null, refresh: null }),
      renovarEm401: false,
    });

    const erro = await cliente.request('/caiu').catch((e: unknown) => e);
    /*
     * A distinção decide a mensagem: `mensagemDeErro` em `hooks/useCampusData`
     * mostra o texto do servidor para `ApiError` e "verifique sua conexão" para
     * o resto — e `lib/queryClient` só repete o que NÃO é `ApiError`.
     */
    expect(erro).toBeInstanceOf(NetworkError);
    expect(erro).toMatchObject({ motivo: 'INDISPONIVEL' });
    expect(erro).not.toBeInstanceOf(ApiError);
  });

  it('POST com 500 é entregue uma vez só, sem repetição automática', async () => {
    let tentativas = 0;
    server.use(
      http.post(`${BASE_TESTE}/inscricao`, () => {
        tentativas += 1;
        return HttpResponse.json(
          { erro: 'FALHA_INTERNA', mensagem: 'Tente de novo.' },
          {
            status: 500,
          },
        );
      }),
    );

    const cliente = criarClienteHttp({
      baseUrl: BASE_TESTE,
      sessao: sessaoDeTeste({ access: 'ok', refresh: 'r1' }),
      renovarEm401: true,
    });

    await expect(cliente.request('/inscricao', { method: 'POST' })).rejects.toBeInstanceOf(
      ApiError,
    );
    /*
     * `500` em um POST é ambíguo: a vaga pode ter sido reservada e a resposta
     * ter se perdido. Repetir sozinho criaria a segunda inscrição — ou, no
     * pagamento, a segunda cobrança (RN-015, RN-027).
     */
    expect(tentativas).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Adaptação do contrato novo
// ---------------------------------------------------------------------------

describe('adaptação da forma do openapi.yaml', () => {
  it('login com dois tokens continua chegando à tela como { token, sessao }', async () => {
    server.use(
      http.post(`${BASE_URL_API}/auth/login`, () =>
        HttpResponse.json(
          {
            accessToken: 'jwt-de-acesso',
            refreshToken: 'jwt-de-refresh',
            expiraEm: 900,
            sessao: sessaoUsuarioFalsa(),
          },
          { status: 201 },
        ),
      ),
    );

    const resultado = await apiRepositories.auth.entrar({
      email: 'ana.souza@fiap.com.br',
      senha: 'campus123',
    });

    /*
     * É o ponto inteiro de RNF-016: o contrato passou de um token para dois, e a
     * tela de login recebe a MESMA forma do CP5. O refresh fica na camada de
     * sessão e nunca sobe.
     */
    expect(resultado.token).toBe('jwt-de-acesso');
    expect(resultado.sessao.usuario.nome).toBe('Ana Souza');
    expect(obterToken()).toBe('jwt-de-acesso');
    expect(obterRefreshToken()).toBe('jwt-de-refresh');
  });

  it('sair manda o refresh token no corpo e limpa a sessão local', async () => {
    let corpoRecebido: unknown = null;
    server.use(
      http.post(`${BASE_URL_API}/auth/logout`, async ({ request }) => {
        corpoRecebido = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    guardarSessao({ accessToken: 'a1', refreshToken: 'r1', expiraEm: 900 });
    await apiRepositories.auth.sair();

    // É o refresh que identifica a sessão a revogar: revogar um access token de
    // 15 minutos não significaria nada.
    expect(corpoRecebido).toEqual({ refreshToken: 'r1' });
    expect(obterToken()).toBeNull();
    expect(obterRefreshToken()).toBeNull();
  });

  it('inscrição devolve a união do domínio a partir da Participacao crua', async () => {
    server.use(
      http.post(`${BASE_URL_API}/eventos/evt-001/participacoes`, () =>
        HttpResponse.json(participacaoFalsa('PENDENTE_PAGAMENTO'), { status: 201 }),
      ),
    );

    const resultado = await apiRepositories.participations.inscrever('evt-001');
    // O mock devolvia `{ tipo, participacao }` no corpo; o contrato devolve a
    // participação crua. Quem monta a união é a camada de serviço.
    expect(resultado).toMatchObject({ tipo: 'PENDENTE_PAGAMENTO' });
  });

  it('409 SEM_VAGA vira resultado de domínio, não exceção (RN-006)', async () => {
    server.use(
      http.post(`${BASE_URL_API}/eventos/evt-002/participacoes`, () =>
        HttpResponse.json(
          {
            erro: 'SEM_VAGA',
            mensagem: 'Este evento está lotado.',
            acao: 'LISTA_ESPERA',
            totalFila: 7,
          },
          { status: 409 },
        ),
      ),
    );

    const resultado = await apiRepositories.participations.inscrever('evt-002');
    expect(resultado).toEqual({ tipo: 'SEM_VAGA', acao: 'LISTA_ESPERA', totalFila: 7 });
  });

  it('recusa por regra vira RECUSADA com o motivo do contrato (RN-015)', async () => {
    server.use(
      http.post(`${BASE_URL_API}/eventos/evt-003/participacoes`, () =>
        HttpResponse.json(
          { erro: 'JA_INSCRITO', mensagem: 'Você já tem uma inscrição ativa neste evento.' },
          { status: 409 },
        ),
      ),
    );

    const resultado = await apiRepositories.participations.inscrever('evt-003');
    expect(resultado).toMatchObject({ tipo: 'RECUSADA', motivo: 'JA_INSCRITO' });
  });

  it('status inesperado em 201 falha em vez de anunciar vaga confirmada', async () => {
    server.use(
      http.post(`${BASE_URL_API}/eventos/evt-004/participacoes`, () =>
        HttpResponse.json(participacaoFalsa('LISTA_ESPERA'), { status: 201 }),
      ),
    );

    // Dizer "confirmada" para quem entrou na fila é pior do que falhar: o aluno
    // apareceria no evento sem vaga.
    await expect(apiRepositories.participations.inscrever('evt-004')).rejects.toMatchObject({
      codigo: 'RESPOSTA_INESPERADA',
    });
  });

  it('cancelamento de evento é POST em /cancelamento, não DELETE no evento', async () => {
    let metodo = '';
    server.use(
      http.post(`${BASE_URL_API}/eventos/evt-005/cancelamento`, async ({ request }) => {
        metodo = request.method;
        return HttpResponse.json({ id: 'evt-005', status: 'CANCELADO' }, { status: 201 });
      }),
    );

    const evento = await apiRepositories.events.cancelar('evt-005', 'Chuva forte no dia inteiro.');
    expect(metodo).toBe('POST');
    expect(evento.status).toBe('CANCELADO');
  });

  it('404 continua virando null: "não existe" e "fora do alcance" são a mesma resposta', async () => {
    server.use(
      http.get(`${BASE_URL_API}/eventos/evt-oculto`, () =>
        HttpResponse.json(
          { erro: 'NAO_ENCONTRADO', mensagem: 'Evento não encontrado.' },
          {
            status: 404,
          },
        ),
      ),
    );

    // RN-001 e RNF-012: a API não revela nem a existência do evento fora do
    // alcance, e a tela mostra estado vazio em vez de erro técnico.
    expect(await apiRepositories.events.obter('evt-oculto')).toBeNull();
  });
});
