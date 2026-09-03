import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { RESTRICOES_TRADUZIDAS, traduzirErroDoPrisma } from './prisma-erros';

/**
 * O que estes testes protegem.
 *
 * `comum/prisma-erros.ts` é a peça que impede a última defesa do banco de virar
 * `500`. Se `ux_participacao_ativa` deixar de ser reconhecido, um clique duplo
 * em "inscrever" passa a responder "algo quebrou do nosso lado" em vez de "você
 * já está inscrito" — e a tela mostra a mensagem errada num caso que acontece
 * todo dia.
 *
 * A regra de negócio (RN-004, RN-015, RN-027) já tem teste em
 * `packages/shared`. Aqui se testa **a tradução**, que é código desta lane.
 */

const VERSAO = '6.1.0';

function unico(mensagem: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(mensagem, {
    code: 'P2002',
    clientVersion: VERSAO,
    ...(meta ? { meta } : {}),
  });
}

function desconhecido(mensagem: string) {
  return new Prisma.PrismaClientUnknownRequestError(mensagem, { clientVersion: VERSAO });
}

describe('traduzirErroDoPrisma — índices únicos parciais', () => {
  it('RN-015: violação de ux_participacao_ativa é 409 JA_INSCRITO', () => {
    const traduzido = traduzirErroDoPrisma(
      unico('Unique constraint failed on the fields: (`ux_participacao_ativa`)'),
    );

    expect(traduzido?.getStatus()).toBe(409);
    expect(traduzido?.codigo).toBe('JA_INSCRITO');
  });

  it('reconhece o nome do índice vindo em meta.target, não só na mensagem', () => {
    const traduzido = traduzirErroDoPrisma(
      unico('Unique constraint failed', { target: ['ux_participacao_ativa'] }),
    );

    expect(traduzido?.codigo).toBe('JA_INSCRITO');
  });

  it('RN-027: violação de ux_pagamento_aguardando_por_participacao é 409 COBRANCA_JA_ABERTA', () => {
    const traduzido = traduzirErroDoPrisma(
      unico('Unique constraint failed on ux_pagamento_aguardando_por_participacao'),
    );

    expect(traduzido?.getStatus()).toBe(409);
    expect(traduzido?.codigo).toBe('COBRANCA_JA_ABERTA');
  });

  it('RN-018: presenca_participacao_id_key é 409 JA_UTILIZADO', () => {
    const traduzido = traduzirErroDoPrisma(
      unico('Unique constraint failed on the constraint: `presenca_participacao_id_key`'),
    );

    expect(traduzido?.codigo).toBe('JA_UTILIZADO');
  });

  it('RN-014: chave de idempotência duplicada é 409 NOTIFICACAO_DUPLICADA', () => {
    const traduzido = traduzirErroDoPrisma(
      unico('Unique constraint failed on `pagamento_chave_idempotencia_key`'),
    );

    expect(traduzido?.codigo).toBe('NOTIFICACAO_DUPLICADA');
  });
});

describe('traduzirErroDoPrisma — CHECK', () => {
  /*
   * O caso que mais importa. Um `CHECK` violado numa escrita comum sobe como
   * erro DESCONHECIDO (o Prisma não modela `CHECK`), então a única pista é o
   * nome no texto. Sem esta tradução, overbooking barrado pelo banco responde
   * `500` — e o cliente não tem como oferecer a lista de espera.
   */
  it('RN-004: ck_evento_ocupadas_le_capacidade é 409 SEM_VAGA com ação de fila', () => {
    const traduzido = traduzirErroDoPrisma(
      desconhecido(
        'new row for relation "evento" violates check constraint "ck_evento_ocupadas_le_capacidade"',
      ),
    );

    expect(traduzido?.getStatus()).toBe(409);
    expect(traduzido?.codigo).toBe('SEM_VAGA');
    expect(traduzido?.corpo().acao).toBe('LISTA_ESPERA');
  });

  it('RN-001: ck_evento_ancora_coerente é 422 ALCANCE_INCOERENTE', () => {
    const traduzido = traduzirErroDoPrisma(
      desconhecido('violates check constraint "ck_evento_ancora_coerente"'),
    );

    expect(traduzido?.getStatus()).toBe(422);
    expect(traduzido?.codigo).toBe('ALCANCE_INCOERENTE');
  });

  it('RNF-022: ck_pagamento_pix_sem_cartao é 422 PIX_SEM_CARTAO', () => {
    const traduzido = traduzirErroDoPrisma(
      desconhecido('violates check constraint "ck_pagamento_pix_sem_cartao"'),
    );

    expect(traduzido?.codigo).toBe('PIX_SEM_CARTAO');
  });

  it('RN-020: ck_publicacao_remocao_justificada é 422 MOTIVO_OBRIGATORIO', () => {
    const traduzido = traduzirErroDoPrisma(
      desconhecido('violates check constraint "ck_publicacao_remocao_justificada"'),
    );

    expect(traduzido?.codigo).toBe('MOTIVO_OBRIGATORIO');
  });
});

describe('traduzirErroDoPrisma — códigos do Prisma sem nome de restrição', () => {
  it('P2003 (chave estrangeira) é 422 REFERENCIA_INVALIDA', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: VERSAO,
    });

    expect(traduzirErroDoPrisma(erro)?.getStatus()).toBe(422);
    expect(traduzirErroDoPrisma(erro)?.codigo).toBe('REFERENCIA_INVALIDA');
  });

  it('P2025 (registro exigido inexistente) é 404', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('An operation failed', {
      code: 'P2025',
      clientVersion: VERSAO,
    });

    expect(traduzirErroDoPrisma(erro)?.getStatus()).toBe(404);
  });

  it('único desconhecido cai em 409 CONFLITO em vez de 500', () => {
    const traduzido = traduzirErroDoPrisma(unico('Unique constraint failed on something_else'));

    expect(traduzido?.getStatus()).toBe(409);
    expect(traduzido?.codigo).toBe('CONFLITO');
  });

  it('erro de validação do cliente é 422 CORPO_INVALIDO', () => {
    const erro = new Prisma.PrismaClientValidationError('Argument x is missing', {
      clientVersion: VERSAO,
    });

    expect(traduzirErroDoPrisma(erro)?.codigo).toBe('CORPO_INVALIDO');
  });
});

describe('traduzirErroDoPrisma — o que NÃO é do banco', () => {
  it('erro comum devolve null, para o filtro seguir para o tratamento genérico', () => {
    expect(traduzirErroDoPrisma(new Error('qualquer coisa'))).toBeNull();
    expect(traduzirErroDoPrisma('texto')).toBeNull();
    expect(traduzirErroDoPrisma(null)).toBeNull();
    expect(traduzirErroDoPrisma(undefined)).toBeNull();
  });

  it('erro desconhecido sem nome de restrição devolve null', () => {
    expect(traduzirErroDoPrisma(desconhecido('connection reset by peer'))).toBeNull();
  });
});

describe('cobertura do catálogo', () => {
  /*
   * Não é teste de comportamento: é uma amarra contra o catálogo ser esvaziado
   * por acidente num merge. Os nomes vivem em
   * `api/prisma/migrations/0001_init/migration.sql`, e são 12 `CHECK` mais 2
   * índices únicos parciais mais os únicos que o Prisma declara.
   */
  it('as três restrições que o prompt do CP6 exige nominalmente estão no catálogo', () => {
    expect(RESTRICOES_TRADUZIDAS).toContain('ux_participacao_ativa');
    expect(RESTRICOES_TRADUZIDAS).toContain('ux_pagamento_aguardando_por_participacao');
    expect(RESTRICOES_TRADUZIDAS).toContain('ck_evento_ocupadas_le_capacidade');
  });

  it('todo nome do catálogo produz um erro com status de negócio, nunca 5xx', () => {
    for (const nome of RESTRICOES_TRADUZIDAS) {
      const traduzido = traduzirErroDoPrisma(desconhecido(`violates constraint "${nome}"`));
      expect(traduzido, nome).not.toBeNull();
      expect(traduzido?.getStatus(), nome).toBeLessThan(500);
    }
  });
});
