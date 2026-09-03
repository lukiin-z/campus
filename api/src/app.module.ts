import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AcademicoModule } from './academico/academico.module';
import { AuthModule } from './auth/auth.module';
import { AutenticacaoGuard } from './auth/autenticacao.guard';
import { CheckinModule } from './checkin/checkin.module';
import { ComumModule } from './comum/comum.module';
import { FiltroDeExcecao } from './comum/filtro-de-excecao';
import { ConfigModule } from './config/config.module';
import { EventosModule } from './eventos/eventos.module';
import { ExpiracaoInterceptor } from './expiracao/expiracao.interceptor';
import { ExpiracaoModule } from './expiracao/expiracao.module';
import { FeedModule } from './feed/feed.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { GatewayModule } from './pagamentos/gateway/gateway.module';
import { ParticipacoesModule } from './participacoes/participacoes.module';
import { PrismaModule } from './prisma/prisma.module';
import { SaudeModule } from './saude/saude.module';

/**
 * A raiz da aplicação — e as três coisas que valem para TODA requisição.
 *
 * ## `APP_GUARD`: autenticação por padrão
 *
 * `AutenticacaoGuard` é global, e abrir uma rota exige `@Publico()`. A inversão
 * é o ponto: com guard por rota, uma rota nova nasce desprotegida e ninguém
 * percebe; com guard global, ela nasce protegida e quem quiser o contrário
 * precisa dizer, no diff.
 *
 * ## `APP_INTERCEPTOR`: prazos aplicados na borda
 *
 * `ExpiracaoInterceptor` roda `ExpiracaoService.aplicar()` antes de cada
 * handler. Sem isso, o cronômetro do pagamento chega a zero e o pagamento
 * continua sendo aceito — foi um defeito real do CP5, não um risco teórico. O
 * atalho de leitura evita abrir transação quando não há nada vencido; o job
 * agendado (que chama o mesmo método público) cobre o caso de ninguém pedir
 * nada.
 *
 * ## `APP_FILTER`: uma forma de erro
 *
 * `FiltroDeExcecao` é o único lugar que escreve resposta de erro, com
 * `{ erro, mensagem }` e o código estável do contrato. É também onde violação de
 * restrição do banco vira `409 SEM_VAGA`/`409 JA_INSCRITO` em vez de `500`.
 *
 * ## Ordem dos módulos
 *
 * `ConfigModule` primeiro: se `JWT_SECRET` faltar, a fábrica dele lança e o
 * processo não passa daqui — que é o comportamento pedido. Os módulos de
 * infraestrutura marcados `@Global` (`Prisma`, `Comum`, `Auth`, `Gateway`,
 * `Expiracao`) vêm antes dos de domínio.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ComumModule,
    GatewayModule,
    ExpiracaoModule,
    AuthModule,

    SaudeModule,
    AcademicoModule,
    EventosModule,
    ParticipacoesModule,
    PagamentosModule,
    CheckinModule,
    FeedModule,
    NotificacoesModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: AutenticacaoGuard },
    { provide: APP_INTERCEPTOR, useExisting: ExpiracaoInterceptor },
    { provide: APP_FILTER, useClass: FiltroDeExcecao },
  ],
})
export class AppModule {}
