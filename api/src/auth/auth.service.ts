import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import {
  type CadastroEntrada,
  type CredenciaisEntrada,
  type OnboardingEntrada,
  type SessaoUsuario,
  decideLogin,
  decideOnboarding,
  dominioInstitucional,
  onboardingPendente,
} from '@campus/shared';
import { Conflito, NaoAutenticado, NaoEncontrado, RegraViolada } from '../comum/erros';
import { paraCurso, paraFaculdade, paraTurma, paraUsuario } from '../comum/mapeadores';
import { SELECAO_DO_TITULAR, type Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';
import { SessoesService } from './sessoes.service';
import type { ResultadoLoginApi } from './tipos';

/**
 * Cadastro, login e onboarding — RF-001 a RF-005, RN-002 e RN-003.
 *
 * **Nenhuma decisão é tomada aqui.** `decideLogin` e `decideOnboarding` decidem;
 * este serviço busca o estado que elas precisam, chama-as e persiste o
 * resultado. Inclusive a ORDEM das recusas é delas: domínio errado antes de
 * credencial inválida antes de e-mail não verificado, porque é a ordem do que a
 * pessoa consegue corrigir.
 *
 * O que é do servidor e não existe no domínio puro: o hash da senha (argon2id,
 * RNF-019) e a emissão de token (`SessoesService`).
 */
@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  /**
   * Hash descartável para comparar contra quando o e-mail não existe.
   *
   * Sem ele, `POST /auth/login` responde na hora para e-mail inexistente e
   * demora ~50 ms (o custo do argon2) para e-mail existente — o que transforma
   * o endpoint num verificador de quem tem conta no Campus. Verificar a senha
   * contra um hash de valor aleatório iguala os dois tempos.
   *
   * Calculado uma vez, na primeira necessidade: fazer isso no boot atrasaria a
   * subida por um caminho que talvez nunca seja usado.
   */
  private hashDescartavel: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessoes: SessoesService,
  ) {}

  // -------------------------------------------------------------- cadastro

  /**
   * RF-001 — cria a conta a partir do e-mail institucional.
   *
   * A faculdade **não** vem do corpo: ela é deduzida do domínio do e-mail
   * (RN-002). Aceitá-la do cliente permitiria criar conta em outra instituição
   * com um e-mail que não pertence a ela.
   *
   * `emailVerificado` nasce `true`, e isto é uma divergência consciente com
   * RF-001: não há envio de e-mail no escopo do projeto (nenhum serviço de
   * mensagem foi contratado, e não há credencial de SMTP em lugar nenhum). A
   * prova de vínculo que sobra é o domínio, que é verificado. O contrato
   * confirma a escolha: `/auth/cadastro` responde com sessão pronta, o que é
   * impossível se o e-mail estivesse pendente de confirmação — `decideLogin`
   * recusaria o login seguinte.
   */
  async cadastrar(entrada: CadastroEntrada, userAgent: string | null): Promise<ResultadoLoginApi> {
    const faculdades = await this.prisma.faculdade.findMany();
    const faculdade = faculdades.find((f) => dominioInstitucional(entrada.email, f.dominiosEmail));

    if (!faculdade) {
      const aceitos = faculdades.flatMap((f) => f.dominiosEmail).map((d) => `@${d}`);
      throw new RegraViolada(
        'DOMINIO_NAO_INSTITUCIONAL',
        `Use seu e-mail institucional (${aceitos.join(', ')}).`,
      );
    }

    // `usuario_email_key` é a autoridade sobre duplicidade. A verificação aqui
    // existe para a mensagem sair certa no caso comum; a corrida entre dois
    // cadastros simultâneos cai no único do banco, traduzido em
    // `comum/prisma-erros.ts` como `409 EMAIL_JA_CADASTRADO`.
    const jaExiste = await this.prisma.usuario.count({ where: { email: entrada.email } });
    if (jaExiste > 0) {
      throw new Conflito('EMAIL_JA_CADASTRADO', 'Já existe uma conta com esse e-mail.');
    }

    const criado = await this.prisma.usuario.create({
      data: {
        nome: entrada.nome,
        email: entrada.email,
        senhaHash: await this.hashDaSenha(entrada.senha),
        avatarSeed: sementeDeAvatar(entrada.email),
        faculdadeId: faculdade.id,
        emailVerificado: true,
      },
      select: SELECAO_DO_TITULAR,
    });

    this.log.log(`conta criada para a faculdade ${faculdade.sigla}`);
    return this.montarResultado(criado, userAgent);
  }

  // ----------------------------------------------------------------- login

  /** RF-003 e RN-002 — a decisão inteira é de `decideLogin`. */
  async entrar(
    credenciais: CredenciaisEntrada,
    userAgent: string | null,
  ): Promise<ResultadoLoginApi> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: credenciais.email },
      select: { ...SELECAO_DO_TITULAR, senhaHash: true },
    });

    const dominios = await this.dominiosPara(usuario?.faculdadeId ?? null);

    /*
     * A verificação da senha acontece SEMPRE, mesmo sem usuário — contra um
     * hash descartável. Ver `hashDescartavel`: é o que impede o endpoint de
     * responder mais rápido para e-mail que não existe.
     */
    const senhaConfere = await this.senhaConfere(
      usuario?.senhaHash ?? (await this.obterHashDescartavel()),
      credenciais.senha,
    );

    const decisao = decideLogin({
      email: credenciais.email,
      senhaConfere: usuario ? senhaConfere : false,
      usuario: usuario ? { emailVerificado: usuario.emailVerificado } : null,
      dominios,
    });

    if (!decisao.aceito) {
      /*
       * `401` para credencial e `422` para domínio: um é "tente de novo", o
       * outro é "esta conta nunca vai servir" — e a tela reage diferente. É o
       * mesmo mapeamento do mock do CP5, e os dois códigos estão no contrato.
       */
      if (decisao.motivo === 'CREDENCIAL_INVALIDA') {
        throw new NaoAutenticado(decisao.motivo, decisao.mensagem);
      }
      throw new RegraViolada(decisao.motivo, decisao.mensagem);
    }

    // `decisao.aceito` já implica usuário existente (`decideLogin` recusa com
    // `CREDENCIAL_INVALIDA` quando ele é nulo). O `if` é o que dá ao
    // compilador a mesma certeza.
    if (!usuario) throw new NaoAutenticado('CREDENCIAL_INVALIDA', 'E-mail ou senha não conferem.');

    const { senhaHash: _ignorado, ...titular } = usuario;
    return this.montarResultado(titular, userAgent);
  }

  // --------------------------------------------------------------- refresh

  async renovar(refreshToken: string, userAgent: string | null): Promise<ResultadoLoginApi> {
    const { tokens, usuarioId } = await this.sessoes.rotacionar(refreshToken, userAgent);
    return { ...tokens, sessao: await this.sessaoDe(usuarioId) };
  }

  async sair(titular: Titular, refreshToken: string): Promise<void> {
    await this.sessoes.revogar(titular.id, refreshToken);
  }

  // ------------------------------------------------------------ onboarding

  /**
   * RF-004, RF-005 e RN-003 — vincula curso e turma pelo código de convite.
   *
   * As turmas do curso escolhido são carregadas e `decideOnboarding` decide. O
   * código NÃO é buscado por `WHERE codigo_convite = ...`: `normalizaCodigo`
   * aceita o código digitado com espaço, hífen e em minúscula, e reproduzir essa
   * normalização em SQL seria escrever a regra uma segunda vez. Carregar as
   * turmas do curso e deixar a função de domínio decidir é o que mantém uma só
   * verdade — e o conjunto é pequeno por natureza (turmas de um curso).
   */
  async concluirOnboarding(titular: Titular, entrada: OnboardingEntrada): Promise<SessaoUsuario> {
    if (!onboardingPendente(titular)) {
      throw new Conflito(
        'ONBOARDING_CONCLUIDO',
        'Seu curso e sua turma já estão vinculados. Fale com a coordenação para trocar de turma.',
      );
    }

    const cursos = await this.prisma.curso.findMany({
      where: { faculdadeId: titular.faculdadeId },
    });
    const turmas = await this.prisma.turma.findMany({
      where: { curso: { faculdadeId: titular.faculdadeId } },
    });

    const decisao = decideOnboarding({
      cursoId: entrada.cursoId,
      codigoConvite: entrada.codigoConvite,
      cursos: cursos.map(paraCurso),
      turmas: turmas.map(paraTurma),
    });

    if (!decisao.aceito) {
      throw new RegraViolada(decisao.motivo, decisao.mensagem);
    }

    await this.prisma.usuario.update({
      where: { id: titular.id },
      data: { cursoId: decisao.turma.cursoId, turmaId: decisao.turma.id },
    });

    return this.sessaoDe(titular.id);
  }

  // ---------------------------------------------------------------- sessão

  /**
   * O titular com o vínculo acadêmico resolvido — uma chamada, não quatro.
   *
   * É a projeção que a tela consome no boot: sem ela, o app faria
   * `/sessao` + `/faculdade` + `/cursos/:id` + `/turmas/:id` antes de desenhar
   * o primeiro pixel.
   */
  async sessaoDe(usuarioId: string): Promise<SessaoUsuario> {
    const linha = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        ...SELECAO_DO_TITULAR,
        faculdade: true,
        curso: true,
        turma: true,
      },
    });

    if (!linha) throw new NaoEncontrado('Conta não encontrada.');

    const { faculdade, curso, turma, ...usuario } = linha;
    return {
      usuario: paraUsuario(usuario),
      faculdade: paraFaculdade(faculdade),
      curso: curso ? paraCurso(curso) : null,
      turma: turma ? paraTurma(turma) : null,
    };
  }

  // -------------------------------------------------------------- internos

  private async montarResultado(
    titular: Titular,
    userAgent: string | null,
  ): Promise<ResultadoLoginApi> {
    const tokens = await this.sessoes.emitirPar(titular, userAgent);
    return { ...tokens, sessao: await this.sessaoDe(titular.id) };
  }

  /**
   * Argon2**id** — a variante recomendada quando o atacante pode ter acesso ao
   * hardware: resiste a GPU (como argon2i) e a ataque de canal lateral (como
   * argon2d). Os parâmetros são os padrões da biblioteca, que já seguem a
   * recomendação da OWASP; mudá-los sem medir seria palpite.
   */
  private hashDaSenha(senha: string): Promise<string> {
    return argon2.hash(senha, { type: argon2.argon2id });
  }

  /** `argon2.verify` lança em hash malformado; hash inválido é senha errada. */
  private async senhaConfere(hash: string, senha: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, senha);
    } catch {
      return false;
    }
  }

  private async obterHashDescartavel(): Promise<string> {
    this.hashDescartavel ??= await this.hashDaSenha(randomUUID());
    return this.hashDescartavel;
  }

  /**
   * Domínios contra os quais validar o e-mail.
   *
   * Com usuário conhecido, são os da faculdade dele. Sem usuário, é a união de
   * todos: assim um e-mail de fora recebe `DOMINIO_NAO_INSTITUCIONAL` e um
   * e-mail institucional sem conta recebe `CREDENCIAL_INVALIDA` — nenhuma das
   * duas respostas revela se a conta existe.
   */
  private async dominiosPara(faculdadeId: string | null): Promise<string[]> {
    if (faculdadeId !== null) {
      const faculdade = await this.prisma.faculdade.findUnique({
        where: { id: faculdadeId },
        select: { dominiosEmail: true },
      });
      if (faculdade) return faculdade.dominiosEmail;
    }
    const todas = await this.prisma.faculdade.findMany({ select: { dominiosEmail: true } });
    return todas.flatMap((f) => f.dominiosEmail);
  }
}

/**
 * Semente da cor do avatar de iniciais, 1..12.
 *
 * É apresentação, não regra: o `Avatar` do design system escolhe a cor por
 * `seed % paleta.length`. Derivar do e-mail, e não sortear, é o que faz a mesma
 * pessoa ter sempre a mesma cor — inclusive depois de o banco ser recriado.
 */
function sementeDeAvatar(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) % 100_000;
  }
  return (hash % 12) + 1;
}
