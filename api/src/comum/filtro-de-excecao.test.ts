import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { Conflito, NaoEncontrado, RegraViolada } from './erros';
import { resolverErro } from './filtro-de-excecao';

/**
 * O que estes testes protegem.
 *
 * Toda resposta de erro da API sai de `resolverErro`. Duas garantias:
 *
 * 1. **Forma única.** `{ erro, mensagem }` sempre, com `acao` e `detalhes` só
 *    onde o contrato os declara. No CP5 havia três formatos, e a tela tratava
 *    um deles.
 * 2. **Nada do erro interno no corpo.** Mensagem de exceção carrega nome de
 *    coluna, trecho de SQL e às vezes valor de dado (RNF-009). O `500` sai com
 *    texto fixo, e o detalhe fica no log.
 */

describe('resolverErro — erro de negócio', () => {
  it('preserva status, código e extras', () => {
    const { status, corpo } = resolverErro(
      new Conflito('SEM_VAGA', 'As vagas acabaram.', { acao: 'LISTA_ESPERA', totalFila: 4 }),
    );

    expect(status).toBe(409);
    expect(corpo).toEqual({
      erro: 'SEM_VAGA',
      mensagem: 'As vagas acabaram.',
      acao: 'LISTA_ESPERA',
      totalFila: 4,
    });
  });

  it('422 leva os detalhes por campo', () => {
    const { status, corpo } = resolverErro(
      new RegraViolada('PRAZOS_INCOERENTES', 'Confira as datas.', [
        { campo: 'fim', mensagem: 'O fim tem de ser depois do início.' },
      ]),
    );

    expect(status).toBe(422);
    expect(corpo.detalhes).toEqual([
      { campo: 'fim', mensagem: 'O fim tem de ser depois do início.' },
    ]);
  });

  it('404 de invisível não carrega `acao` nem `detalhes`', () => {
    const { status, corpo } = resolverErro(new NaoEncontrado('Evento não encontrado.'));

    expect(status).toBe(404);
    expect(corpo).toEqual({ erro: 'NAO_ENCONTRADO', mensagem: 'Evento não encontrado.' });
  });
});

describe('resolverErro — restrição do banco', () => {
  it('RN-004: CHECK de ocupadas vira 409 SEM_VAGA, e não 500', () => {
    const { status, corpo } = resolverErro(
      new Prisma.PrismaClientUnknownRequestError(
        'violates check constraint "ck_evento_ocupadas_le_capacidade"',
        { clientVersion: '6.1.0' },
      ),
    );

    expect(status).toBe(409);
    expect(corpo.erro).toBe('SEM_VAGA');
    expect(corpo.acao).toBe('LISTA_ESPERA');
  });

  it('RN-015: único parcial vira 409 JA_INSCRITO', () => {
    const { status, corpo } = resolverErro(
      new Prisma.PrismaClientKnownRequestError('Unique failed on ux_participacao_ativa', {
        code: 'P2002',
        clientVersion: '6.1.0',
      }),
    );

    expect(status).toBe(409);
    expect(corpo.erro).toBe('JA_INSCRITO');
  });
});

describe('resolverErro — HttpException do Nest', () => {
  it('404 de rota inexistente ganha código estável', () => {
    const { status, corpo } = resolverErro(new NotFoundException());

    expect(status).toBe(404);
    expect(corpo.erro).toBe('NAO_ENCONTRADO');
  });

  it('400 do ParseUUIDPipe vira REQUISICAO_INVALIDA', () => {
    const { status, corpo } = resolverErro(new BadRequestException('Validation failed (uuid)'));

    expect(status).toBe(400);
    expect(corpo.erro).toBe('REQUISICAO_INVALIDA');
    // A mensagem interna do Nest ("Validation failed (uuid...)") não vaza: ela
    // é inglês técnico no meio de uma interface em português.
    expect(corpo.mensagem).toBe('Não conseguimos ler essa requisição.');
  });
});

describe('resolverErro — RNF-009: nada do erro interno no corpo', () => {
  it('erro inesperado vira 500 com texto fixo', () => {
    const { status, corpo } = resolverErro(
      new Error('column "senha_hash" of relation "usuario" contains $2b$12$abcdef'),
    );

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(corpo).toEqual({
      erro: 'ERRO_INTERNO',
      mensagem: 'Algo quebrou do nosso lado. Tente de novo.',
    });
    expect(JSON.stringify(corpo)).not.toContain('senha_hash');
    expect(JSON.stringify(corpo)).not.toContain('$2b$12$');
  });

  it('exceção que não é Error também vira 500 bem formado', () => {
    for (const estranho of [null, undefined, 'texto', 42, { erro: 'inventado' }]) {
      const { status, corpo } = resolverErro(estranho);
      expect(status).toBe(500);
      expect(corpo.erro).toBe('ERRO_INTERNO');
    }
  });
});
