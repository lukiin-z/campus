import { describe, expect, it } from 'vitest';
import { ConfiguracaoInvalidaError, carregarAmbiente } from './ambiente';

/**
 * O que estes testes protegem — RNF-020.
 *
 * O modo de falha é este: a API sobe, responde `/health` com `ok`, e assina
 * token com um segredo fraco ou vazio. Ninguém percebe até alguém forjar um.
 * `carregarAmbiente` existe para transformar isso em erro de boot, e é isso que
 * se verifica aqui — não a leitura de variável, mas a RECUSA.
 */

const MINIMO = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/campus?schema=public',
  JWT_SECRET: 'a'.repeat(32),
  WEBHOOK_SECRET: 'b'.repeat(16),
};

describe('carregarAmbiente — obrigatórias', () => {
  it('aceita o mínimo e aplica os padrões de desenvolvimento', () => {
    const ambiente = carregarAmbiente(MINIMO);

    expect(ambiente.NODE_ENV).toBe('development');
    expect(ambiente.producao).toBe(false);
    expect(ambiente.PORT).toBe(3000);
    expect(ambiente.JWT_ACCESS_TTL_MINUTES).toBe(15);
    expect(ambiente.JWT_REFRESH_TTL_DAYS).toBe(30);
  });

  it('sem JWT_SECRET, NÃO carrega — a API não sobe', () => {
    const { JWT_SECRET: _ignorado, ...semSegredo } = MINIMO;

    expect(() => carregarAmbiente(semSegredo)).toThrow(ConfiguracaoInvalidaError);
  });

  it('JWT_SECRET curto é recusado: `segredo` não é segredo', () => {
    expect(() => carregarAmbiente({ ...MINIMO, JWT_SECRET: 'segredo' })).toThrow(
      ConfiguracaoInvalidaError,
    );
  });

  it('sem DATABASE_URL, NÃO carrega — não existe modo sem banco', () => {
    const { DATABASE_URL: _ignorado, ...semBanco } = MINIMO;

    expect(() => carregarAmbiente(semBanco)).toThrow(ConfiguracaoInvalidaError);
  });

  it('sem WEBHOOK_SECRET, NÃO carrega — RN-014 depende dele', () => {
    const { WEBHOOK_SECRET: _ignorado, ...semWebhook } = MINIMO;

    expect(() => carregarAmbiente(semWebhook)).toThrow(ConfiguracaoInvalidaError);
  });

  it('a mensagem nomeia TODAS as variáveis que faltam, não só a primeira', () => {
    /*
     * Falhar uma por vez obriga quem está configurando a subir a API três
     * vezes para descobrir três variáveis. A mensagem lista tudo de uma vez.
     */
    try {
      carregarAmbiente({});
      expect.unreachable('deveria ter lançado');
    } catch (erro: unknown) {
      expect(erro).toBeInstanceOf(ConfiguracaoInvalidaError);
      if (!(erro instanceof Error)) return;
      expect(erro.message).toContain('DATABASE_URL');
      expect(erro.message).toContain('JWT_SECRET');
      expect(erro.message).toContain('WEBHOOK_SECRET');
      expect(erro.message).toContain('api/.env.example');
    }
  });

  it('NENHUM segredo aparece na mensagem de erro', () => {
    // Mensagem de configuração vai para o log do orquestrador (RNF-009).
    try {
      carregarAmbiente({ ...MINIMO, JWT_SECRET: 'curto-mas-secreto', PORT: '0' });
      expect.unreachable('deveria ter lançado');
    } catch (erro: unknown) {
      if (!(erro instanceof Error)) return;
      expect(erro.message).not.toContain('curto-mas-secreto');
      expect(erro.message).not.toContain(MINIMO.WEBHOOK_SECRET);
    }
  });
});

describe('carregarAmbiente — derivados', () => {
  it('producao é true só em NODE_ENV=production', () => {
    expect(carregarAmbiente({ ...MINIMO, NODE_ENV: 'production' }).producao).toBe(true);
    expect(carregarAmbiente({ ...MINIMO, NODE_ENV: 'test' }).producao).toBe(false);
  });

  it('NODE_ENV desconhecido é recusado, e não silenciosamente tratado como dev', () => {
    // `NODE_ENV=prod` (em vez de `production`) faria a rota de simulação de
    // pagamento continuar exposta. É o tipo de erro que precisa derrubar o boot.
    expect(() => carregarAmbiente({ ...MINIMO, NODE_ENV: 'prod' })).toThrow(
      ConfiguracaoInvalidaError,
    );
  });

  it('CORS_ORIGINS vira lista, tolerando espaço e vírgula sobrando', () => {
    const ambiente = carregarAmbiente({
      ...MINIMO,
      CORS_ORIGINS: 'http://localhost:5173, https://campus.example , ',
    });

    expect(ambiente.origensCors).toEqual(['http://localhost:5173', 'https://campus.example']);
  });

  it('PORT e os TTL vêm como número, mesmo sendo texto no ambiente', () => {
    const ambiente = carregarAmbiente({
      ...MINIMO,
      PORT: '8080',
      JWT_ACCESS_TTL_MINUTES: '5',
      RATE_LIMIT_TENTATIVAS: '3',
    });

    expect(ambiente.PORT).toBe(8080);
    expect(ambiente.JWT_ACCESS_TTL_MINUTES).toBe(5);
    expect(ambiente.RATE_LIMIT_TENTATIVAS).toBe(3);
  });

  it('PORT fora de faixa é recusado', () => {
    expect(() => carregarAmbiente({ ...MINIMO, PORT: '70000' })).toThrow(ConfiguracaoInvalidaError);
  });

  it('access token acima de 60 min é recusado — RNF-020 pede token curto', () => {
    expect(() => carregarAmbiente({ ...MINIMO, JWT_ACCESS_TTL_MINUTES: '120' })).toThrow(
      ConfiguracaoInvalidaError,
    );
  });
});
