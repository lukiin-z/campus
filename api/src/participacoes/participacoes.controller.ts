import { Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Participacao, ParticipacaoView } from '@campus/shared';
import { TitularAtual, type Titular } from '../comum/titular';
import { ParticipacoesService, type ResultadoCancelamento } from './participacoes.service';

/**
 * Inscrição, fila de espera e cancelamento.
 *
 * Nenhuma destas rotas tem corpo. É consequência do desenho, não economia: a
 * inscrição não aceita nada do cliente porque tudo o que decide o resultado —
 * quem é a pessoa, qual o evento, se há vaga, se o prazo passou — está no token
 * e no banco. Um corpo aqui só poderia carregar informação que o servidor
 * precisaria ignorar.
 */
@ApiTags('participacoes')
@ApiBearerAuth()
@Controller()
export class ParticipacoesController {
  constructor(private readonly participacoes: ParticipacoesService) {}

  @Post('eventos/:id/participacoes')
  @ApiOperation({ summary: 'Reserva vaga; 409 SEM_VAGA devolve a ação de fila (RN-004, RN-006)' })
  inscrever(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<Participacao> {
    return this.participacoes.inscrever(eventoId, titular);
  }

  @Post('eventos/:id/lista-espera')
  @ApiOperation({ summary: 'Entra na fila FIFO do evento lotado (RN-006)' })
  entrarNaListaEspera(
    @Param('id', ParseUUIDPipe) eventoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<Participacao> {
    return this.participacoes.entrarNaListaEspera(eventoId, titular);
  }

  @Get('participacoes')
  @ApiOperation({ summary: 'Participações do titular (RF-007)' })
  listarMinhas(@TitularAtual() titular: Titular): Promise<ParticipacaoView[]> {
    return this.participacoes.listarMinhas(titular);
  }

  @Get('participacoes/:id')
  @ApiOperation({ summary: 'Ingresso e histórico da participação' })
  obter(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<ParticipacaoView> {
    return this.participacoes.obter(participacaoId, titular);
  }

  @Delete('participacoes/:id')
  @ApiOperation({ summary: 'Cancela e oferece a vaga ao primeiro da fila (RN-007, RN-010)' })
  cancelar(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<ResultadoCancelamento> {
    return this.participacoes.cancelar(participacaoId, titular);
  }

  @Post('participacoes/:id/confirmar')
  @ApiOperation({ summary: 'Confirma a vaga oferecida dentro da janela (RN-008)' })
  confirmarOferta(
    @Param('id', ParseUUIDPipe) participacaoId: string,
    @TitularAtual() titular: Titular,
  ): Promise<Participacao> {
    return this.participacoes.confirmarOferta(participacaoId, titular);
  }
}
