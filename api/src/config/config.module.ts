import { Global, Module } from '@nestjs/common';
import { AMBIENTE, carregarAmbiente } from './ambiente';

/**
 * Configuração como provider, e não como `ConfigService` genérico.
 *
 * `ConfigService.get('JWT_SECRET')` devolve `string | undefined` e aceita
 * qualquer chave, inclusive digitada errado — o erro aparece em runtime, no
 * primeiro token assinado com `undefined`. Injetar o objeto `Ambiente`
 * validado dá o oposto: chave inexistente não compila, e valor inválido
 * derruba o boot.
 *
 * A fábrica roda na inicialização do módulo: se `carregarAmbiente` lançar, o
 * `NestFactory.create` lança, e a API não sobe. É o comportamento pedido —
 * `JWT_SECRET` ausente não pode virar API funcionando com token forjável
 * (RNF-020).
 */
@Global()
@Module({
  providers: [{ provide: AMBIENTE, useFactory: () => carregarAmbiente() }],
  exports: [AMBIENTE],
})
export class ConfigModule {}
