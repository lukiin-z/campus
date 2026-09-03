import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Prisma, Usuario as UsuarioLinha } from '@prisma/client';
import type { Request } from 'express';
import { NaoAutenticado } from './erros';

/**
 * O titular autenticado, e como ele chega ao handler.
 *
 * ## Por que o titular é a linha inteira do usuário, e não só o `sub` do token
 *
 * Autorização neste produto depende de **vínculo**, não só de papel: quem vê um
 * evento de turma é quem está naquela turma (RN-001). O `turmaId` está no banco
 * e muda — um aluno que troca de turma perde acesso ao evento da antiga no
 * instante seguinte. Se o vínculo viesse no JWT, ele valeria por 15 minutos
 * depois de deixar de ser verdade, e o token viraria um cache de permissão que
 * ninguém invalida.
 *
 * Custa uma consulta por requisição. É o preço de a autorização ser sobre o
 * estado atual, e é o mesmo motivo por que o refresh é revogável (RNF-020).
 *
 * `senhaHash` está fora do tipo, não por cuidado do programador: o `Omit` faz o
 * compilador recusar qualquer projeção que o carregue.
 */
export type Titular = Omit<UsuarioLinha, 'senhaHash'>;

/** O que o guard seleciona. Fica ao lado do tipo para os dois não divergirem. */
export const SELECAO_DO_TITULAR = {
  id: true,
  nome: true,
  email: true,
  avatarSeed: true,
  faculdadeId: true,
  cursoId: true,
  turmaId: true,
  papeis: true,
  emailVerificado: true,
  visivelEntreConfirmados: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.UsuarioSelect;

/** Requisição depois do guard. O campo é opcional porque a rota pode ser pública. */
export interface RequisicaoAutenticada extends Request {
  titular?: Titular;
}

/**
 * Rota sem autenticação. Só onde o contrato declara `security: []`:
 * `/health`, `/auth/cadastro`, `/auth/login`, `/auth/refresh`, `/faculdade`,
 * `/cursos` e `/cursos/:id/turmas`.
 *
 * O guard é global e o padrão é exigir token — a decisão de deixar uma rota
 * aberta fica visível no diff, em vez de ser o esquecimento de um `@UseGuards`.
 */
export const PUBLICO = 'campus:publico';
export const Publico = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLICO, true);

/**
 * `@TitularAtual()` no parâmetro do handler.
 *
 * Lança `401` se o guard não populou a requisição. Não é defesa redundante: é o
 * que impede um handler protegido de receber `undefined` silenciosamente se
 * alguém marcar a rota como pública por engano — o handler falharia mais tarde,
 * lendo `titular.id` de `undefined`, com um `500` em vez de um `401`.
 */
export const TitularAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): Titular => {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    if (!requisicao.titular) throw new NaoAutenticado();
    return requisicao.titular;
  },
);
