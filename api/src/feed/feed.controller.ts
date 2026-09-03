import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  novaPublicacaoSchema,
  novoComentarioSchema,
  remocaoPublicacaoSchema,
  type NovaPublicacaoEntrada,
  type NovoComentarioEntrada,
  type PublicacaoView,
} from '@campus/shared';
import { TitularAtual, type Titular } from '../comum/titular';
import { ZodValidationPipe } from '../comum/validacao.pipe';
import { FeedService, type ComentarioComAutor, type RemocaoEntrada } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller()
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Feed segmentado pelo alcance dos eventos (RF-036, RN-019)' })
  listar(@TitularAtual() titular: Titular): Promise<PublicacaoView[]> {
    return this.feed.listar(titular);
  }

  @Get('feed/eventos-publicaveis')
  @ApiOperation({ summary: 'Eventos em que o titular pode publicar (RN-019)' })
  eventosPublicaveis(
    @TitularAtual() titular: Titular,
  ): Promise<Array<{ id: string; titulo: string }>> {
    return this.feed.eventosPublicaveis(titular);
  }

  @Post('publicacoes')
  @ApiOperation({ summary: 'Publica foto vinculada a um evento (RF-037, RN-019)' })
  publicar(
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(novaPublicacaoSchema)) corpo: NovaPublicacaoEntrada,
  ): Promise<PublicacaoView> {
    return this.feed.publicar(titular, corpo);
  }

  @Post('publicacoes/:id/comentarios')
  @ApiOperation({ summary: 'Comenta em publicação visível (RF-038)' })
  comentar(
    @Param('id', ParseUUIDPipe) publicacaoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(novoComentarioSchema)) corpo: NovoComentarioEntrada,
  ): Promise<ComentarioComAutor> {
    return this.feed.comentar(publicacaoId, titular, corpo);
  }

  @Post('publicacoes/:id/remocao')
  @ApiOperation({ summary: 'Remove com motivo e autor registrados (RF-042, RN-020)' })
  remover(
    @Param('id', ParseUUIDPipe) publicacaoId: string,
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(remocaoPublicacaoSchema)) corpo: RemocaoEntrada,
  ): Promise<PublicacaoView> {
    return this.feed.remover(publicacaoId, titular, corpo);
  }
}
