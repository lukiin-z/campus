import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AMBIENTE, type Ambiente } from '../config/ambiente';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AutenticacaoGuard } from './autenticacao.guard';
import { SessoesService } from './sessoes.service';

/**
 * `JwtModule.registerAsync` com o segredo vindo do `Ambiente` validado, e não de
 * `process.env` direto: aqui `JWT_SECRET` já passou pelo piso de 32 caracteres.
 * `registerAsync` sem `secret` deixaria o `JwtService` assinar com `undefined`,
 * o que o `jsonwebtoken` aceita em algumas versões — e um token assinado com
 * segredo vazio é um token que qualquer pessoa forja.
 *
 * Global porque `AutenticacaoGuard` é registrado no nível da aplicação
 * (`APP_GUARD`) e precisa ser resolvível de qualquer contexto.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AMBIENTE],
      useFactory: (ambiente: Ambiente) => ({
        secret: ambiente.JWT_SECRET,
        signOptions: { expiresIn: `${ambiente.JWT_ACCESS_TTL_MINUTES}m` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessoesService, AutenticacaoGuard],
  exports: [AuthService, SessoesService, AutenticacaoGuard],
})
export class AuthModule {}
