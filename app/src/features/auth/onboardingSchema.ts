import { z } from 'zod';
import type { Curso, Turma } from '../../types/domain';
import { decideOnboarding } from '../../domain/auth';

/**
 * Validação do onboarding (RF-004, RF-005, RN-003).
 *
 * Igual ao login: o schema não reimplementa RN-003, ele chama
 * `decideOnboarding` — a MESMA função que o servidor aplica. Rodar nos dois
 * lados não é duplicação de regra; é a mesma regra respondendo antes (feedback
 * imediato) e depois (autoridade).
 *
 * Fábrica porque a decisão precisa dos cursos e das turmas carregados.
 */

export interface OnboardingFormValues {
  cursoId: string;
  codigoConvite: string;
}

interface DadosAcademicos {
  cursos: readonly Curso[];
  /** Turmas do curso escolhido — é o que `listarTurmas` entrega. */
  turmas: readonly Turma[];
}

export function criarOnboardingSchema(dados: DadosAcademicos) {
  return z
    .object({
      cursoId: z.string().min(1, 'Escolha o seu curso para continuar.'),
      codigoConvite: z.string().min(1, 'Digite o código da sua turma.'),
    })
    .superRefine((valores, ctx) => {
      const decisao = decideOnboarding({
        cursoId: valores.cursoId,
        codigoConvite: valores.codigoConvite,
        cursos: dados.cursos,
        turmas: dados.turmas,
      });

      if (decisao.aceito) return;

      /*
       * `CODIGO_INVALIDO` aqui não é conclusão: a tela só tem as turmas do curso
       * escolhido, então um código VÁLIDO de outro curso cai neste motivo.
       * Bloquear com "esse código não existe" prenderia justamente quem errou o
       * curso no passo 1 — o caso que RN-003 quer distinguir. Então deixa
       * enviar: o servidor tem todas as turmas e responde
       * `CODIGO_DE_OUTRO_CURSO`, vindo desta mesma função.
       */
      if (decisao.motivo === 'CODIGO_INVALIDO') return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [decisao.motivo === 'CURSO_INEXISTENTE' ? 'cursoId' : 'codigoConvite'],
        message: decisao.mensagem,
      });
    });
}

/**
 * Turma que o código digitado resolve, para a confirmação visual do passo 2.
 * Devolve `null` enquanto o código não fecha com nenhuma turma aceita — a
 * confirmação só aparece quando a decisão é a mesma que o servidor tomaria.
 */
export function turmaConfirmada(
  valores: OnboardingFormValues,
  dados: DadosAcademicos,
): Turma | null {
  const decisao = decideOnboarding({
    cursoId: valores.cursoId,
    codigoConvite: valores.codigoConvite,
    cursos: dados.cursos,
    turmas: dados.turmas,
  });
  return decisao.aceito ? decisao.turma : null;
}
