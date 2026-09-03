import { Global, Module } from '@nestjs/common';
import { ExpiracaoInterceptor } from './expiracao.interceptor';
import { ExpiracaoService } from './expiracao.service';

/**
 * Global porque o interceptor é registrado no nível da aplicação e porque um job
 * agendado (fora do ciclo de requisição) resolve `ExpiracaoService` pelo
 * contexto raiz.
 */
@Global()
@Module({
  providers: [ExpiracaoService, ExpiracaoInterceptor],
  exports: [ExpiracaoService, ExpiracaoInterceptor],
})
export class ExpiracaoModule {}
