import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AMBIENTE, type Ambiente } from '../config/ambiente';
import { NaoAutenticado } from '../comum/erros';
import type { Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';
import type { ConteudoDoToken, ParDeTokens } from './tipos';

/**
 * Emissão, rotação e revogação de sessão — RNF-020.
 *
 * ## O que fica no banco, e por que é o hash
 *
 * A tabela `sessao` guarda `refresh_hash`, **nunca** o token. Um vazamento do
 * banco não dá sessão a ninguém: o atacante leva hashes, e hash não serve como
 * credencial. É o mesmo raciocínio de `senha_hash`, por um motivo diferente —
 * lá o objetivo é resistir a força bruta offline, aqui é o token não existir em
 * lugar nenhum além do cliente.
 *
 * ## Por que SHA-256 no refresh e argon2 na senha
 *
 * Argon2 é lento de propósito e **salgado**, então o mesmo valor produz hashes
 * diferentes — o que impede busca por igualdade. Buscar a sessão exigiria
 * varrer a tabela verificando uma a uma, o que é O(n) por requisição de
 * refresh.
 *
 * SHA-256 resolve porque o refresh **não é senha**: são 48 bytes de um CSPRNG,
 * ou seja 384 bits de entropia. Não há dicionário para atacar e não há valor a
 * adivinhar; o que se precisa é de uma função determinística e irreversível
 * para poder indexar. Senha, que tem entropia baixa e é escolhida por gente,
 * continua em argon2id.
 *
 * ## Rotação e reuso
 *
 * Todo refresh bem-sucedido **revoga o token usado** e emite outro. Se um token
 * já revogado voltar a aparecer, isso significa uma de duas coisas: ou o
 * cliente repetiu (bug), ou alguém copiou o token. Nos dois casos a resposta é
 * a mesma e é a conservadora — revogar todas as sessões daquele usuário e
 * exigir login. Perder a sessão é irritante; manter uma sessão roubada viva não
 * é aceitável.
 */
@Injectable()
export class SessoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(AMBIENTE) private readonly ambiente: Ambiente,
  ) {}

  /** Emite o par e registra a sessão. O refresh só existe em claro no retorno. */
  async emitirPar(
    usuario: Pick<Titular, 'id' | 'email'>,
    userAgent: string | null,
  ): Promise<ParDeTokens> {
    const conteudo: ConteudoDoToken = { sub: usuario.id, email: usuario.email };
    const expiraEm = this.ambiente.JWT_ACCESS_TTL_MINUTES * 60;

    const accessToken = await this.jwt.signAsync(conteudo, { expiresIn: expiraEm });
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.sessao.create({
      data: {
        usuarioId: usuario.id,
        refreshHash: this.hashDoRefresh(refreshToken),
        userAgent,
        expiraEm: new Date(Date.now() + this.ambiente.JWT_REFRESH_TTL_DAYS * 86_400_000),
      },
    });

    return { accessToken, refreshToken, expiraEm };
  }

  /**
   * Troca o refresh por um par novo. Devolve também o `usuarioId`, porque quem
   * chama precisa montar a sessão e não deve confiar em nada vindo do cliente.
   */
  async rotacionar(
    refreshToken: string,
    userAgent: string | null,
  ): Promise<{ tokens: ParDeTokens; usuarioId: string }> {
    const sessao = await this.prisma.sessao.findUnique({
      where: { refreshHash: this.hashDoRefresh(refreshToken) },
      include: { usuario: { select: { id: true, email: true } } },
    });

    // Token inexistente e token expirado são indistinguíveis para quem pede: a
    // resposta é a mesma, e é `401`.
    if (!sessao) throw new NaoAutenticado('SESSAO_INVALIDA', 'Sua sessão expirou. Entre de novo.');

    if (sessao.revogadaEm !== null) {
      await this.revogarTodasDoUsuario(sessao.usuarioId);
      throw new NaoAutenticado(
        'SESSAO_REUTILIZADA',
        'Detectamos reuso de sessão. Por segurança, entre de novo.',
      );
    }

    if (sessao.expiraEm.getTime() <= Date.now()) {
      throw new NaoAutenticado('SESSAO_INVALIDA', 'Sua sessão expirou. Entre de novo.');
    }

    /*
     * Revogar e emitir na MESMA transação. Sem ela, uma falha entre as duas
     * escritas deixaria o usuário sem sessão nova e com a antiga já morta — ou,
     * pior, com duas sessões válidas a partir de um refresh só.
     */
    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.sessao.update({ where: { id: sessao.id }, data: { revogadaEm: new Date() } });

      const conteudo: ConteudoDoToken = { sub: sessao.usuario.id, email: sessao.usuario.email };
      const expiraEm = this.ambiente.JWT_ACCESS_TTL_MINUTES * 60;
      const accessToken = await this.jwt.signAsync(conteudo, { expiresIn: expiraEm });
      const novoRefresh = randomBytes(48).toString('base64url');

      await tx.sessao.create({
        data: {
          usuarioId: sessao.usuarioId,
          refreshHash: this.hashDoRefresh(novoRefresh),
          userAgent,
          expiraEm: new Date(Date.now() + this.ambiente.JWT_REFRESH_TTL_DAYS * 86_400_000),
        },
      });

      return { accessToken, refreshToken: novoRefresh, expiraEm };
    });

    return { tokens, usuarioId: sessao.usuarioId };
  }

  /**
   * Revoga a sessão do refresh informado.
   *
   * Só revoga se a sessão for do titular autenticado — caso contrário, quem
   * tivesse um token qualquer derrubaria a sessão de outra pessoa. O `204` sai
   * do mesmo jeito quando não há nada a revogar: logout é idempotente, e
   * responder `404` diria ao cliente que aquele refresh existe em outra conta.
   */
  async revogar(titularId: string, refreshToken: string): Promise<void> {
    await this.prisma.sessao.updateMany({
      where: {
        refreshHash: this.hashDoRefresh(refreshToken),
        usuarioId: titularId,
        revogadaEm: null,
      },
      data: { revogadaEm: new Date() },
    });
  }

  async revogarTodasDoUsuario(usuarioId: string): Promise<void> {
    await this.prisma.sessao.updateMany({
      where: { usuarioId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }

  /** Verifica e lê o JWT de acesso. Qualquer problema vira `401`. */
  async lerAccessToken(token: string): Promise<ConteudoDoToken> {
    try {
      return await this.jwt.verifyAsync<ConteudoDoToken>(token);
    } catch {
      throw new NaoAutenticado('TOKEN_INVALIDO', 'Sua sessão expirou. Entre de novo.');
    }
  }

  /**
   * SHA-256 em hex. Determinístico, o que permite `UNIQUE` e busca por
   * igualdade — ver o cabeçalho da classe para o porquê de não ser argon2.
   */
  private hashDoRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Comparação em tempo constante, para quem precisar comparar dois segredos de
   * mesmo tamanho (a assinatura do webhook, por exemplo). Mora aqui porque é o
   * módulo que já cuida de segredo, e porque `===` em string vaza o número de
   * bytes iguais pelo tempo de execução.
   */
  static segredosIguais(a: string, b: string): boolean {
    const bytesA = Buffer.from(a, 'utf8');
    const bytesB = Buffer.from(b, 'utf8');
    if (bytesA.length !== bytesB.length) return false;
    return timingSafeEqual(bytesA, bytesB);
  }
}
