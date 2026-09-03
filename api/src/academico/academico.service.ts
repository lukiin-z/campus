import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  isAdminOfScope,
  normalizaCodigo,
  type Curso,
  type Faculdade,
  type Turma,
} from '@campus/shared';
import { Conflito, NaoEncontrado, SemPermissao } from '../comum/erros';
import { paraCurso, paraFaculdade, paraTurma, paraTurmaPublica } from '../comum/mapeadores';
import type { Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Estrutura acadêmica — RF-002, RF-005 e RF-043.
 *
 * Faculdade, curso e turma são dados da instituição, não configuração do
 * código: uma segunda faculdade não exige deploy (RN-002). É por isso que os
 * domínios de e-mail aceitos são coluna, e não constante.
 */
@Injectable()
export class AcademicoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * RF-002 — dados públicos da instituição.
   *
   * O modelo aceita mais de uma faculdade; o produto opera com uma. Com titular
   * autenticado, devolve a dele; sem titular (a tela de login precisa dos
   * domínios de e-mail antes de existir sessão), devolve a mais antiga. A
   * alternativa seria exigir um `id` na rota, e a tela de login não tem de onde
   * tirá-lo.
   */
  async obterFaculdade(titular?: Titular): Promise<Faculdade> {
    const linha = titular
      ? await this.prisma.faculdade.findUnique({ where: { id: titular.faculdadeId } })
      : await this.prisma.faculdade.findFirst({ orderBy: { criadoEm: 'asc' } });

    if (!linha) throw new NaoEncontrado('Nenhuma faculdade cadastrada.');
    return paraFaculdade(linha);
  }

  async listarCursos(titular?: Titular): Promise<Curso[]> {
    const faculdade = await this.obterFaculdade(titular);
    const cursos = await this.prisma.curso.findMany({
      where: { faculdadeId: faculdade.id },
      orderBy: { nome: 'asc' },
    });
    return cursos.map(paraCurso);
  }

  /**
   * Turmas de um curso — **sem** o código de convite.
   *
   * A rota é pública porque é a lista que a tela de onboarding mostra para a
   * pessoa escolher a turma antes de digitar o código. Devolver `codigoConvite`
   * aqui entregaria de graça a credencial que RN-003 usa como prova de vínculo:
   * qualquer pessoa entraria em qualquer turma sem ninguém lhe passar nada. Ver
   * `paraTurmaPublica`.
   */
  async listarTurmas(cursoId: string): Promise<Array<Omit<Turma, 'codigoConvite'>>> {
    const curso = await this.prisma.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new NaoEncontrado('Curso não encontrado.');

    const turmas = await this.prisma.turma.findMany({
      where: { cursoId },
      orderBy: [{ periodo: 'desc' }, { nome: 'asc' }],
    });
    return turmas.map(paraTurmaPublica);
  }

  /**
   * RF-043 — gera um código de convite novo, invalidando o anterior.
   *
   * O código antigo para de funcionar porque a coluna é sobrescrita: a turma tem
   * um código, não um histórico deles. É a operação que a coordenação usa no
   * início de cada período, e é o que impede o código de 2025.2 continuar
   * vinculando gente em 2026.1.
   *
   * A competência é de Admin de Curso do curso da turma. `isAdminOfScope`
   * também aceita Admin de Faculdade da mesma faculdade — autoridade sobre a
   * faculdade inclui autoridade sobre os cursos dela, e é a mesma função que
   * decide isso em evento (RN-024).
   */
  async regerarCodigoConvite(turmaId: string, titular: Titular): Promise<Turma> {
    const turma = await this.prisma.turma.findUnique({
      where: { id: turmaId },
      include: { curso: { select: { faculdadeId: true } } },
    });
    if (!turma) throw new NaoEncontrado('Turma não encontrada.');

    /*
     * `403` e não `404`: a existência da turma é pública (`/cursos/:id/turmas`
     * a lista sem token), então esconder não protege nada e confundiria quem
     * está com o papel errado. A regra de `404 para invisível` vale onde a
     * existência é o segredo — evento de turma, por exemplo.
     */
    const escopo = { cursoId: turma.cursoId, faculdadeId: turma.curso.faculdadeId };
    if (!isAdminOfScope(titular, escopo)) {
      throw new SemPermissao('Só a coordenação do curso gera código de convite.');
    }

    const atualizada = await this.prisma.turma.update({
      where: { id: turmaId },
      data: { codigoConvite: await this.codigoInedito(turma.nome), codigoAtivo: true },
    });

    return paraTurma(atualizada);
  }

  /**
   * Código legível, digitável e único.
   *
   * O alfabeto exclui `0`, `O`, `1`, `I` e `L`: o código é passado de boca em
   * sala e digitado à mão, e essas cinco letras produzem o erro de digitação
   * mais comum. `normalizaCodigo` já tolera espaço, hífen e minúscula — o que
   * ela não pode consertar é `0` lido como `O`.
   *
   * A unicidade é do banco (`turma_codigo_convite_key`). A tentativa em laço
   * existe porque colisão, mesmo improvável, não pode virar `500`: são 6
   * caracteres de um alfabeto de 27, e a coordenação regera código todo
   * semestre.
   */
  private async codigoInedito(nomeDaTurma: string): Promise<string> {
    const prefixo = normalizaCodigo(nomeDaTurma).slice(0, 8) || 'CAMPUS';

    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      const candidato = `${prefixo}-${sufixoAleatorio(6)}`;
      const existe = await this.prisma.turma.count({ where: { codigoConvite: candidato } });
      if (existe === 0) return candidato;
    }

    throw new Conflito(
      'CODIGO_JA_EXISTE',
      'Não conseguimos gerar um código livre agora. Tente de novo.',
    );
  }
}

const ALFABETO_SEM_AMBIGUIDADE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function sufixoAleatorio(tamanho: number): string {
  let saida = '';
  for (let i = 0; i < tamanho; i += 1) {
    // `randomInt` do `node:crypto`, e não `Math.random`: o código é credencial
    // de vínculo, e credencial previsível é credencial adivinhável.
    saida += ALFABETO_SEM_AMBIGUIDADE[randomInt(ALFABETO_SEM_AMBIGUIDADE.length)] ?? 'X';
  }
  return saida;
}
