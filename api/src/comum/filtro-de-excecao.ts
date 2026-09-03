import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { CorpoDeErro, ErroDeNegocio } from './erros';
import { traduzirErroDoPrisma } from './prisma-erros';

/** O que o filtro escreve. Separado para o teste não precisar de um `Response`. */
export interface RespostaDeErro {
  status: number;
  corpo: CorpoDeErro;
}

/**
 * Resolve qualquer exceção em `{ status, corpo }`.
 *
 * Função exportada, e não método privado, por dois motivos: o teste a exercita
 * sem fabricar um `ArgumentsHost` (o que só se consegue com `as unknown as`), e
 * a ordem do tratamento passa a ser legível de fora.
 *
 * Ordem, do mais específico ao menos:
 *
 * 1. `ErroDeNegocio` — já traz código, status e extras. Sai como está.
 * 2. Erro do Prisma — traduzido por `traduzirErroDoPrisma`. É o que faz a
 *    última defesa do banco (o `CHECK` de `ocupadas`, o único parcial de
 *    RN-015) responder `409 SEM_VAGA`/`409 JA_INSCRITO` em vez de `500`.
 * 3. `HttpException` do próprio Nest — rota inexistente, corpo não-JSON,
 *    `ParseUUIDPipe`. Ganha um código pelo status.
 * 4. Qualquer outra coisa — `500 ERRO_INTERNO`, com o erro no log e **nada** do
 *    erro no corpo: mensagem de exceção carrega nome de coluna, trecho de SQL e
 *    às vezes valor de dado (RNF-009).
 */
export function resolverErro(excecao: unknown): RespostaDeErro {
  if (excecao instanceof ErroDeNegocio) {
    return { status: excecao.getStatus(), corpo: excecao.corpo() };
  }

  const doPrisma = traduzirErroDoPrisma(excecao);
  if (doPrisma) {
    return { status: doPrisma.getStatus(), corpo: doPrisma.corpo() };
  }

  if (excecao instanceof HttpException) {
    return { status: excecao.getStatus(), corpo: deHttpException(excecao) };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    corpo: { erro: 'ERRO_INTERNO', mensagem: 'Algo quebrou do nosso lado. Tente de novo.' },
  };
}

/**
 * `HttpException` que não é nossa (rota inexistente, UUID malformado) precisa de
 * um código estável também: o cliente decide pelo `erro`, e um corpo sem ele
 * obrigaria a tela a olhar o status HTTP cru.
 */
function deHttpException(excecao: HttpException): CorpoDeErro {
  const porStatus: Readonly<Record<number, CorpoDeErro>> = {
    [HttpStatus.BAD_REQUEST]: {
      erro: 'REQUISICAO_INVALIDA',
      mensagem: 'Não conseguimos ler essa requisição.',
    },
    [HttpStatus.UNAUTHORIZED]: {
      erro: 'NAO_AUTENTICADO',
      mensagem: 'Entre na sua conta para continuar.',
    },
    [HttpStatus.FORBIDDEN]: {
      erro: 'SEM_PERMISSAO',
      mensagem: 'Você não tem permissão para isso.',
    },
    [HttpStatus.NOT_FOUND]: {
      erro: 'NAO_ENCONTRADO',
      mensagem: 'Não encontramos o que você pediu.',
    },
    [HttpStatus.PAYLOAD_TOO_LARGE]: {
      erro: 'CORPO_GRANDE',
      mensagem: 'Essa requisição é grande demais.',
    },
  };

  return (
    porStatus[excecao.getStatus()] ?? {
      erro: 'ERRO_INTERNO',
      mensagem: 'Algo quebrou do nosso lado. Tente de novo.',
    }
  );
}

/**
 * O único lugar que escreve resposta de erro.
 *
 * Toda recusa da API sai daqui, com a forma `{ erro, mensagem }` e o código
 * estável do contrato. A alternativa — cada handler montando seu corpo — foi o
 * que produziu, no CP5, respostas de erro em três formatos diferentes: a tela
 * tratava um deles e mostrava "algo deu errado" nos outros dois.
 */
@Catch()
export class FiltroDeExcecao implements ExceptionFilter {
  private readonly log = new Logger(FiltroDeExcecao.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const { status, corpo } = resolverErro(excecao);
    this.registrar(excecao, status, corpo);
    host.switchToHttp().getResponse<Response>().status(status).json(corpo);
  }

  private registrar(excecao: unknown, status: number, corpo: CorpoDeErro): void {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.log.error(
        excecao instanceof Error ? excecao.message : 'exceção sem mensagem',
        excecao instanceof Error ? excecao.stack : undefined,
      );
      return;
    }

    // Restrição do banco que virou resposta de negócio: não é falha do
    // servidor, é a rede de segurança fazendo o trabalho dela. Mas vale saber
    // que a aplicação deixou a escrita chegar até lá.
    if (!(excecao instanceof ErroDeNegocio) && !(excecao instanceof HttpException)) {
      this.log.warn(`restrição do banco recusou a escrita e virou ${status} ${corpo.erro}`);
    }
  }
}
