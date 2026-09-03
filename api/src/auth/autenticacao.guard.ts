import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NaoAutenticado } from '../comum/erros';
import { PUBLICO, SELECAO_DO_TITULAR, type RequisicaoAutenticada } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';
import { SessoesService } from './sessoes.service';

/**
 * Guard global de autenticação. O padrão é **exigir** token; abrir uma rota é
 * marcá-la com `@Publico()`, e isso aparece no diff.
 *
 * A inversão do padrão importa. Com guard por rota, uma rota nova nasce
 * desprotegida e ninguém percebe até alguém tentar; com guard global, uma rota
 * nova nasce protegida e o autor precisa dizer explicitamente que não deve ser.
 * O erro passa a ser "pedi token onde não precisava", que aparece no primeiro
 * teste, em vez de "não pedi token onde precisava", que aparece num incidente.
 *
 * ## O que este guard NÃO faz
 *
 * Não autoriza. Ele responde "quem é esta pessoa?" e nada mais. Alcance
 * (RN-001) e papel sobre o recurso (RN-023, RN-024) são decididos no handler,
 * depois de o recurso ser carregado — porque a resposta depende do recurso, não
 * do token. O defeito nº 3 do CP4 foi exatamente confiar em verificação que só
 * olhava a requisição.
 */
@Injectable()
export class AutenticacaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessoes: SessoesService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token = extrairBearer(requisicao.headers.authorization);

    /*
     * Rota pública com token válido resolve o titular de todo jeito. Não é
     * capricho: `POST /auth/refresh` é pública (o access token já expirou) e
     * `/faculdade` é pública mas útil de personalizar. Token inválido em rota
     * pública é ignorado, não recusado.
     */
    if (publico === true) {
      if (token !== null) await this.tentarResolver(requisicao, token);
      return true;
    }

    if (token === null) {
      throw new NaoAutenticado('TOKEN_AUSENTE', 'Entre na sua conta para continuar.');
    }

    const conteudo = await this.sessoes.lerAccessToken(token);
    const titular = await this.prisma.usuario.findUnique({
      where: { id: conteudo.sub },
      select: SELECAO_DO_TITULAR,
    });

    /*
     * Token assinado por nós apontando para conta que não existe mais: a conta
     * foi apagada e o token ainda vale por até 15 minutos. É `401`, não `500`.
     */
    if (!titular) {
      throw new NaoAutenticado('CONTA_INEXISTENTE', 'Essa conta não existe mais.');
    }

    requisicao.titular = titular;
    return true;
  }

  private async tentarResolver(requisicao: RequisicaoAutenticada, token: string): Promise<void> {
    try {
      const conteudo = await this.sessoes.lerAccessToken(token);
      const titular = await this.prisma.usuario.findUnique({
        where: { id: conteudo.sub },
        select: SELECAO_DO_TITULAR,
      });
      if (titular) requisicao.titular = titular;
    } catch {
      // Rota pública não recusa por token ruim.
    }
  }
}

/**
 * `Authorization: Bearer <token>`.
 *
 * A comparação do esquema é case-insensitive porque a RFC 7235 diz que ele é —
 * e cliente que manda `bearer` minúsculo existe.
 */
function extrairBearer(cabecalho: string | undefined): string | null {
  if (!cabecalho) return null;
  const [esquema, valor] = cabecalho.split(' ');
  if (esquema?.toLowerCase() !== 'bearer') return null;
  const token = valor?.trim();
  return token && token.length > 0 ? token : null;
}
