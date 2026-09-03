import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  leituraCheckinSchema,
  type LeituraCheckinEntrada,
  type PainelCheckin,
  type ResultadoCheckin,
} from '@campus/shared';
import { TitularAtual, type Titular } from '../comum/titular';
import { ZodValidationPipe } from '../comum/validacao.pipe';
import { CheckinService, type TokenIngressoComPrazo } from './checkin.service';
import { presencaManualSchema, type PresencaManualEntrada } from './schemas';

@ApiTags('checkin')
@ApiBearerAuth()
@Controller()
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Get('participacoes/:id/token')
  @ApiOperation({ summary: 'Token assinado do ingresso, só para o titular (RF-033)' })
  obterToken(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<TokenIngressoComPrazo> {
    return this.checkin.obterToken(participacaoId, titular);
  }

  @Get('eventos/:id/checkin')
  @ApiOperation({ summary: 'Painel da porta: janela, contadores e quem falta (RF-035)' })
  obterPainel(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<PainelCheckin> {
    return this.checkin.obterPainel(eventoId, titular);
  }

  /**
   * `201` quando aceita, `200` quando recusa — os dois são sucesso.
   *
   * A diferença tem significado: `201` diz que uma presença foi CRIADA, e é
   * verdade só no aceite. `200` na recusa é o que faz "ingresso já usado" ser
   * resposta do sistema em vez de falha dele — um `4xx` mandaria a tela mostrar
   * "erro ao validar", que não diz ao operador se ele chama o próximo ou o
   * segurança (RN-017).
   *
   * O status é escrito à mão porque depende do RESULTADO, não da rota.
   * `@Res({ passthrough: true })` mantém a serialização do Nest: só o código sai
   * do padrão.
   */
  @Post('eventos/:id/checkin')
  @ApiOperation({ summary: 'Valida a leitura; aceite cria presença (201) e recusa devolve 200' })
  async validar(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(leituraCheckinSchema)) corpo: LeituraCheckinEntrada,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<ResultadoCheckin> {
    const resultado = await this.checkin.validar(eventoId, titular, corpo);
    resposta.status(resultado.aceito ? HttpStatus.CREATED : HttpStatus.OK);
    return resultado;
  }

  @Post('participacoes/:id/presenca-manual')
  @ApiOperation({ summary: 'Registra presença sem leitura, com motivo (RN-018)' })
  registrarPresencaManual(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(presencaManualSchema)) corpo: PresencaManualEntrada,
  ): Promise<ResultadoCheckin> {
    return this.checkin.registrarPresencaManual(participacaoId, titular, corpo);
  }
}
