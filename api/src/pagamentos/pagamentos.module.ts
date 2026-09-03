import { Module } from '@nestjs/common';
import { PagamentosController } from './pagamentos.controller';
import { PagamentosService } from './pagamentos.service';

/**
 * O `GatewayModule` é global (ver o cabeçalho dele): a implementação do
 * `PaymentGateway` é escolhida em um arquivo só, e o cancelamento de evento em
 * cascata também precisa dela para reembolsar.
 */
@Module({
  controllers: [PagamentosController],
  providers: [PagamentosService],
  exports: [PagamentosService],
})
export class PagamentosModule {}
