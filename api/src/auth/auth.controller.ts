import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cadastroSchema,
  credenciaisSchema,
  entradaOnboardingSchema,
  type CadastroEntrada,
  type CredenciaisEntrada,
  type OnboardingEntrada,
  type SessaoUsuario,
} from '@campus/shared';
import { LimiteDeTaxaGuard } from '../comum/limite-de-taxa.guard';
import { Publico, TitularAtual, type Titular } from '../comum/titular';
import { ZodValidationPipe } from '../comum/validacao.pipe';
import { AuthService } from './auth.service';
import { refreshSchema, type RefreshEntrada } from './schemas';
import type { ResultadoLoginApi } from './tipos';

/**
 * Autenticação e vínculo — `/auth/*` e `/sessao`.
 *
 * As rotas de credencial (`cadastro` e `login`) têm limite de taxa (RNF-021):
 * são as duas em que tentar mil vezes é uma estratégia. `refresh` não tem, de
 * propósito — o token é imprevisível (384 bits) e limitar aqui derrubaria a
 * sessão de quem abre várias abas.
 *
 * O `User-Agent` é gravado na sessão para a pessoa reconhecer o dispositivo
 * numa lista de sessões ativas. É o único dado de cliente que guardamos.
 */
@ApiTags('autenticacao')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/cadastro')
  @Publico()
  @UseGuards(LimiteDeTaxaGuard)
  @ApiOperation({ summary: 'Cria conta com e-mail institucional (RF-001)' })
  cadastrar(
    @Body(new ZodValidationPipe(cadastroSchema)) corpo: CadastroEntrada,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ResultadoLoginApi> {
    return this.auth.cadastrar(corpo, userAgent ?? null);
  }

  @Post('auth/login')
  @Publico()
  @UseGuards(LimiteDeTaxaGuard)
  @ApiOperation({ summary: 'Autentica e devolve os tokens (RF-003, RN-002)' })
  entrar(
    @Body(new ZodValidationPipe(credenciaisSchema)) corpo: CredenciaisEntrada,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ResultadoLoginApi> {
    return this.auth.entrar(corpo, userAgent ?? null);
  }

  @Post('auth/refresh')
  @Publico()
  @ApiOperation({ summary: 'Troca o refresh por um par novo (RNF-020)' })
  renovar(
    @Body(new ZodValidationPipe(refreshSchema)) corpo: RefreshEntrada,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ResultadoLoginApi> {
    return this.auth.renovar(corpo.refreshToken, userAgent ?? null);
  }

  /**
   * `204` e idempotente: sair duas vezes não é erro, e responder `404` para um
   * refresh desconhecido diria ao cliente que aquele token existe em outra conta.
   */
  @Post('auth/logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoga a sessão corrente' })
  async sair(
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(refreshSchema)) corpo: RefreshEntrada,
  ): Promise<void> {
    await this.auth.sair(titular, corpo.refreshToken);
  }

  @Post('auth/onboarding')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vincula curso e turma pelo código de convite (RF-005, RN-003)' })
  concluirOnboarding(
    @TitularAtual() titular: Titular,
    @Body(new ZodValidationPipe(entradaOnboardingSchema)) corpo: OnboardingEntrada,
  ): Promise<SessaoUsuario> {
    return this.auth.concluirOnboarding(titular, corpo);
  }

  @Get('sessao')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Titular autenticado com o vínculo resolvido' })
  obterSessao(@TitularAtual() titular: Titular): Promise<SessaoUsuario> {
    return this.auth.sessaoDe(titular.id);
  }
}
