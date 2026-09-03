import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  filtroEventosSchema,
  novoEventoSchema,
  type EventoView,
  type FiltroEventosEntrada,
  type NovoEventoEntrada,
} from '@campus/shared';
import { TitularAtual, type Titular } from '../comum/titular';
import { ZodValidationPipe } from '../comum/validacao.pipe';
import { EventosService, type ItemDaListaDeParticipantes } from './eventos.service';
import {
  cancelamentoEventoSchema,
  edicaoEventoSchema,
  type CancelamentoEntrada,
  type EdicaoEventoEntrada,
} from './schemas';

/**
 * Eventos e a fila de aprovação.
 *
 * `/eventos/destaque` é declarada ANTES de `/eventos/:id` de propósito: o
 * roteador do Express casa na ordem de registro, e `:id` engoliria `destaque`
 * como se fosse um identificador. O `ParseUUIDPipe` também rejeitaria, mas com
 * `400` em vez da resposta certa — e a mensagem não diria nada a quem chamou.
 */
@ApiTags('eventos')
@ApiBearerAuth()
@Controller()
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Get('eventos/destaque')
  @ApiOperation({ summary: 'Próximos eventos com inscrição aberta' })
  destaques(@TitularAtual() titular: Titular): Promise<EventoView[]> {
    return this.eventos.destaques(titular);
  }

  @Get('eventos')
  @ApiOperation({ summary: 'Eventos visíveis para o titular (RF-015, RN-001)' })
  listar(
    @TitularAtual() titular: Titular,
    @Query(new ZodValidationPipe(filtroEventosSchema)) filtros: FiltroEventosEntrada,
  ): Promise<EventoView[]> {
    return this.eventos.listar(titular, filtros);
  }

  @Post('eventos')
  @ApiOperation({ summary: 'Cria evento; alcance FACULDADE nasce em aprovação (RN-003)' })
  criar(
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(novoEventoSchema)) corpo: NovoEventoEntrada,
  ): Promise<EventoView> {
    return this.eventos.criar(titular, corpo);
  }

  @Get('eventos/:id')
  @ApiOperation({ summary: 'Detalhe do evento; 404 também para fora do alcance' })
  obter(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<EventoView> {
    return this.eventos.obter(eventoId, titular);
  }

  @Patch('eventos/:id')
  @ApiOperation({ summary: 'Edita evento não encerrado (RN-023)' })
  editar(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(edicaoEventoSchema)) corpo: EdicaoEventoEntrada,
  ): Promise<EventoView> {
    return this.eventos.editar(eventoId, titular, corpo);
  }

  @Post('eventos/:id/cancelamento')
  @ApiOperation({ summary: 'Cancela o evento e as participações em cascata (RN-021, RN-022)' })
  cancelar(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(cancelamentoEventoSchema)) corpo: CancelamentoEntrada,
  ): Promise<EventoView> {
    return this.eventos.cancelar(eventoId, titular, corpo);
  }

  @Post('eventos/:id/aprovacao')
  @ApiOperation({ summary: 'Aprova evento de alcance FACULDADE (RN-003)' })
  aprovar(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<EventoView> {
    return this.eventos.aprovar(eventoId, titular);
  }

  @Get('eventos/:id/participantes')
  @ApiOperation({ summary: 'Confirmados do evento, para o organizador (RN-024, RF-009)' })
  participantes(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<ItemDaListaDeParticipantes[]> {
    return this.eventos.participantes(eventoId, titular);
  }

  @Get('admin/eventos-pendentes')
  @ApiTags('admin')
  @ApiOperation({ summary: 'Eventos aguardando aprovação no escopo do admin (RF-041)' })
  pendentes(@TitularAtual() titular: Titular): Promise<EventoView[]> {
    return this.eventos.pendentes(titular);
  }
}
