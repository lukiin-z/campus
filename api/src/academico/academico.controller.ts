import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Curso, Faculdade, Turma } from '@campus/shared';
import { Publico, TitularAtual, type RequisicaoAutenticada, type Titular } from '../comum/titular';
import { AcademicoService } from './academico.service';

/**
 * Estrutura acadêmica.
 *
 * `/faculdade`, `/cursos` e `/cursos/:id/turmas` são públicas porque a tela de
 * cadastro precisa delas ANTES de existir sessão: sem os domínios de e-mail,
 * ela não sabe o que dizer a quem digita um endereço pessoal; sem a lista de
 * cursos e turmas, o onboarding não tem o que mostrar.
 *
 * `@Req()` aparece aqui, e só aqui, porque a rota é pública mas o titular
 * MELHORA a resposta quando existe: quem já entrou recebe a própria faculdade
 * em vez da primeira do banco. `@TitularAtual()` não serve, porque ele lança
 * `401` quando não há titular — que é o caso normal desta rota.
 */
@ApiTags('academico')
@Controller()
export class AcademicoController {
  constructor(private readonly academico: AcademicoService) {}

  @Get('faculdade')
  @Publico()
  @ApiOperation({ summary: 'Dados públicos da instituição (RF-002)' })
  obterFaculdade(@Req() requisicao: RequisicaoAutenticada): Promise<Faculdade> {
    return this.academico.obterFaculdade(requisicao.titular);
  }

  @Get('cursos')
  @Publico()
  @ApiOperation({ summary: 'Cursos da faculdade' })
  listarCursos(@Req() requisicao: RequisicaoAutenticada): Promise<Curso[]> {
    return this.academico.listarCursos(requisicao.titular);
  }

  @Get('cursos/:id/turmas')
  @Publico()
  @ApiOperation({ summary: 'Turmas de um curso' })
  listarTurmas(
    @Param('id', ParseUUIDPipe) cursoId: string,
  ): Promise<Array<Omit<Turma, 'codigoConvite'>>> {
    return this.academico.listarTurmas(cursoId);
  }

  /**
   * `POST`, e não `GET`, porque a operação **muda estado**: o código anterior
   * para de funcionar. Enquanto o contrato a declarava como `GET`, um prefetch
   * de navegador ou uma repetição automática invalidaria o código que a turma
   * já tinha recebido.
   */
  @Post('admin/turmas/:id/codigo')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gera um código de convite novo e desativa o anterior (RF-043)' })
  regerarCodigo(
    @Param('id', ParseUUIDPipe) turmaId: string,
    @TitularAtual() titular: Titular,
  ): Promise<Turma> {
    return this.academico.regerarCodigoConvite(turmaId, titular);
  }
}
