import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Notificacao } from '@campus/shared';
import { TitularAtual, type Titular } from '../comum/titular';
import { NotificacoesService } from './notificacoes.service';

/**
 * `/notificacoes/lidas` é declarada ANTES de `/notificacoes/:id/lida`? Não
 * precisa: os caminhos têm formas diferentes (`lidas` tem um segmento,
 * `:id/lida` tem dois), então não há ambiguidade — ao contrário de
 * `/eventos/destaque` versus `/eventos/:id`, que colidem.
 */
@ApiTags('notificacoes')
@ApiBearerAuth()
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Notificações do titular (RF-040)' })
  listar(@TitularAtual() titular: Titular): Promise<Notificacao[]> {
    return this.notificacoes.listar(titular);
  }

  @Post(':id/lida')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca uma como lida' })
  marcarComoLida(
    @Param('id', ParseUUIDPipe) notificacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<void> {
    return this.notificacoes.marcarComoLida(notificacaoId, titular);
  }

  @Post('lidas')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca todas as do titular como lidas' })
  marcarTodasComoLidas(@TitularAtual() titular: Titular): Promise<void> {
    return this.notificacoes.marcarTodasComoLidas(titular);
  }
}
