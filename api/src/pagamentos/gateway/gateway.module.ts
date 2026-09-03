import { Global, Module } from '@nestjs/common';
import { GatewayFake } from './fake.gateway';
import { GATEWAY_DE_PAGAMENTO } from './pagamento.gateway';

/**
 * A escolha da implementação do `PaymentGateway` acontece AQUI, e em nenhum
 * outro lugar (ADR-0006).
 *
 * Trocar o simulador pelo adaptador real é editar este arquivo: nenhum serviço
 * conhece `GatewayFake`, todos injetam `GATEWAY_DE_PAGAMENTO`. É o que a ADR
 * chama de "trocar de provedor é escrever um arquivo" — e não é vantagem
 * hipotética, porque a dependência D-02 (sandbox com Pix) pode não se
 * confirmar.
 *
 * Global porque o cancelamento de evento em cascata também reembolsa (RN-022),
 * e o módulo de eventos não deveria importar o de pagamentos só por isso.
 */
@Global()
@Module({
  providers: [GatewayFake, { provide: GATEWAY_DE_PAGAMENTO, useExisting: GatewayFake }],
  exports: [GATEWAY_DE_PAGAMENTO],
})
export class GatewayModule {}
