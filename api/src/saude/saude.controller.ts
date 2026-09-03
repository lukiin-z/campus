import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../comum/titular';
import { SaudeService, type Saude } from './saude.service';

@ApiTags('saude')
@Controller('health')
export class SaudeController {
  constructor(private readonly saude: SaudeService) {}

  /**
   * Pública porque quem chama é o orquestrador, que não tem conta. Não devolve
   * nada além de status, versão e contagem: `/health` é a rota mais exposta de
   * qualquer API, e detalhe de infraestrutura ali é reconhecimento de graça.
   */
  @Get()
  @Publico()
  @ApiOperation({ summary: 'Saúde da API e conexão com o banco' })
  verificar(): Promise<Saude> {
    return this.saude.verificar();
  }
}
