import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, criarClienteHttp } from './api';

/**
 * O cliente HTTP nas bordas que a suíte de repositórios não exercita.
 *
 * O caso que abre o arquivo é um defeito medido, não imaginado: com o mock fora
 * do ar sob um servidor que faz fallback de SPA, `GET /api/eventos` responde
 * `200 text/html`, e o cliente antigo transformava isso em `{}` — sucesso com
 * dados vazios. O sintoma observado no navegador foi
 * `TypeError: Cannot read properties of undefined (reading 'map')` e página em
 * branco, a três camadas de distância da causa.
 */

function clienteComResposta(resposta: Response) {
  const fetchFalso = vi.fn().mockResolvedValue(resposta);
  vi.stubGlobal('fetch', fetchFalso);
  return {
    cliente: criarClienteHttp({
      baseUrl: '/api',
      sessao: {
        obterAccessToken: () => null,
        obterRefreshToken: () => null,
        guardarSessao: () => {},
        encerrar: () => {},
      },
      // Sem renovação: estes casos são sobre a leitura do corpo, e um `401`
      // disparando refresh acrescentaria uma segunda requisição ao `fetch` falso.
      renovarEm401: false,
    }),
    fetchFalso,
  };
}

function html(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { 'Content-Type': 'text/html' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('corpo de sucesso que não é JSON', () => {
  it('recusa 200 com HTML em vez de devolver objeto vazio', async () => {
    const { cliente } = clienteComResposta(html('<!doctype html><html><body>SPA</body></html>'));

    const erro = await cliente.request('/eventos').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).codigo).toBe('RESPOSTA_INVALIDA');
    /*
     * 502 e não 200: o app está reportando que o INTERMEDIÁRIO respondeu por
     * um servidor que não respondeu. Manter o 200 original faria o erro parecer
     * escolha da API.
     */
    expect((erro as ApiError).status).toBe(502);
  });

  it('guarda o content-type e uma amostra curta, que é o que identifica a causa', async () => {
    const pagina = `<!doctype html>\n<html lang="pt-BR">\n  <head><title>Campus</title></head>`;
    const { cliente } = clienteComResposta(html(pagina));

    const erro = (await cliente.request('/eventos').catch((e: unknown) => e)) as ApiError;

    expect(erro.extra.contentType).toBe('text/html');
    expect(String(erro.extra.amostra)).toContain('<!doctype html>');
    // Amostra, não a página: o console não deve receber o documento inteiro.
    expect(String(erro.extra.amostra).length).toBeLessThanOrEqual(80);
  });

  it('a mensagem é para quem está usando o app, não para quem escreveu o servidor', async () => {
    const { cliente } = clienteComResposta(html('<html></html>'));

    const erro = (await cliente.request('/eventos').catch((e: unknown) => e)) as ApiError;

    expect(erro.message).not.toMatch(/JSON|parse|token|Unexpected/i);
    expect(erro.message).toContain('Tente de novo');
  });
});

describe('corpos que legitimamente não têm JSON', () => {
  it('204 devolve undefined sem tentar interpretar corpo', async () => {
    const { cliente } = clienteComResposta(new Response(null, { status: 204 }));

    await expect(cliente.request('/notificacoes/lidas')).resolves.toBeUndefined();
  });

  it('200 com corpo vazio devolve undefined em vez de falhar', async () => {
    const { cliente } = clienteComResposta(new Response('', { status: 200 }));

    await expect(cliente.request('/notificacoes/lidas')).resolves.toBeUndefined();
  });

  it('erro sem corpo JSON continua virando ApiError com mensagem utilizável', async () => {
    /*
     * Aqui o `{}` de consolo É correto, e a distinção é o ponto da correção: um
     * 502 de proxy ou um 413 de servidor web chegam como HTML, e transformá-los
     * em `RESPOSTA_INVALIDA` esconderia o status que explica o que houve.
     */
    const { cliente } = clienteComResposta(html('<html>502 Bad Gateway</html>', 502));

    const erro = (await cliente.request('/eventos').catch((e: unknown) => e)) as ApiError;

    expect(erro.status).toBe(502);
    expect(erro.codigo).toBe('ERRO_DESCONHECIDO');
    expect(erro.message).toContain('Não foi possível concluir a operação');
  });
});

describe('corpo de sucesso em JSON', () => {
  it('atravessa intacto, incluindo lista vazia', async () => {
    const { cliente } = clienteComResposta(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(cliente.request('/eventos')).resolves.toEqual([]);
  });

  it('não confunde `null` legítimo com corpo ausente', async () => {
    const { cliente } = clienteComResposta(
      new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await expect(cliente.request('/eventos/evt-000')).resolves.toBeNull();
  });
});
