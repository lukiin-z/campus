import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  desfechoSimuladoSchema,
  novoPagamentoSchema,
  webhookPagamentoSchema,
  type DesfechoSimulado,
  type NovoPagamentoEntrada,
  type PagamentoView,
  type WebhookPagamentoEntrada,
} from '@campus/shared';
import { Publico, TitularAtual, type RequisicaoAutenticada, type Titular } from '../comum/titular';
import { ZodValidationPipe } from '../comum/validacao.pipe';
import { PagamentosService, type AceitePagamento } from './pagamentos.service';

/**
 * Pagamento e reembolso.
 *
 * ## Por que o webhook lê o corpo BRUTO
 *
 * A assinatura HMAC é calculada sobre os bytes que o gateway enviou. Assinar o
 * JSON reserializado por nós quebraria a verificação na primeira diferença de
 * ordem de chave ou de espaçamento — e a diferença existe, porque
 * `JSON.stringify` não preserva a serialização de origem.
 *
 * `rawBody: true` é ligado em `main.ts`. Se o corpo bruto não chegar, a
 * verificação falha fechada (`401`), e não aberta: uma notificação que não pode
 * ser verificada não é uma notificação confiável.
 *
 * O `@Body` com o schema roda ANTES, mesmo que a verificação valide a forma de
 * novo dentro do gateway. É o que garante `422` com `detalhes` por campo para
 * quem está integrando, em vez de um `CORPO_MALFORMADO` sem pista.
 */
@ApiTags('pagamentos')
@Controller()
export class PagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Post('participacoes/:id/pagamento')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Abre a cobrança; idempotente por participação (RN-012, RN-027)' })
  abrirCobranca(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(novoPagamentoSchema)) corpo: NovoPagamentoEntrada,
  ): Promise<PagamentoView> {
    return this.pagamentos.abrirCobranca(participacaoId, titular, corpo);
  }

  @Get('participacoes/:id/pagamento')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cobrança corrente da participação' })
  obterCobranca(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<PagamentoView> {
    return this.pagamentos.obterCobranca(participacaoId, titular);
  }

  /**
   * `@Publico()` porque quem chama é o gateway, que não tem conta no Campus. A
   * autenticação desta rota é a **assinatura HMAC** no cabeçalho
   * `X-Assinatura`, verificada em `PaymentGateway.verificarNotificacao` — e é o
   * único lugar do sistema que decide se uma notificação é autêntica (RN-014).
   */
  @Post('pagamentos/webhook')
  @Publico()
  /*
   * `200`, e não o `201` padrão do `POST`: a notificação não cria recurso, e o
   * reprocessamento de uma já vista é resposta de SUCESSO sem efeito (RN-014).
   * `201` prometeria um recurso novo que não existe.
   */
  @HttpCode(200)
  @ApiOperation({ summary: 'Notificação do gateway; idempotente por chave (RN-014)' })
  processarWebhook(
    @Req() requisicao: RawBodyRequest<RequisicaoAutenticada>,
    @Body(new ZodValidationPipe(webhookPagamentoSchema)) _corpo: WebhookPagamentoEntrada,
  ): Promise<AceitePagamento> {
    return this.pagamentos.processarWebhook({
      corpoBruto: requisicao.rawBody?.toString('utf8') ?? '',
      cabecalhos: cabecalhosDeTexto(requisicao.headers),
    });
  }

  @Post('pagamentos/:id/simular')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispara o desfecho do gateway fake (ADR-0006, só fora de produção)' })
  simular(
    @Param('id', ParseUUIDPipe) pagamentoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(desfechoSimuladoSchema)) corpo: { desfecho: DesfechoSimulado },
  ) {
    return this.pagamentos.simularDesfecho(pagamentoId, titular, corpo.desfecho);
  }

  @Post('participacoes/:id/reembolso')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calcula e registra o reembolso pela política congelada (RN-013)' })
  solicitarReembolso(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<PagamentoView> {
    return this.pagamentos.solicitarReembolso(participacaoId, titular);
  }
}

/**
 * Cabeçalhos do Express vêm como `string | string[] | undefined`. O gateway só
 * lê `x-assinatura`, e um cabeçalho repetido é requisição malformada — juntar os
 * valores criaria uma assinatura que nunca casa, o que é o resultado certo.
 */
function cabecalhosDeTexto(
  brutos: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [nome, valor] of Object.entries(brutos)) {
    if (typeof valor === 'string') saida[nome.toLowerCase()] = valor;
    else if (Array.isArray(valor)) saida[nome.toLowerCase()] = valor.join(',');
  }
  return saida;
}
