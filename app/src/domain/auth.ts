import type {
  Curso,
  Faculdade,
  MotivoRecusaLogin,
  MotivoRecusaOnboarding,
  Turma,
  Usuario,
} from '../types/domain';

/**
 * Autenticação e vínculo acadêmico — RN-002, RN-003 e RF-001 a RF-005.
 *
 * Funções puras: a decisão de aceitar ou recusar um login e um código de turma
 * vive aqui, e é a MESMA no formulário (feedback imediato) e no servidor
 * (autoridade). Duplicar essa regra em Zod seria criar duas verdades — o
 * schema chama estas funções (ADR-0004).
 */

/** Sintaxe de e-mail que basta para o produto: local@dominio.tld, sem espaço. */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailBemFormado(email: string): boolean {
  return FORMATO_EMAIL.test(email.trim());
}

export function dominioDoEmail(email: string): string {
  const partes = email.trim().toLowerCase().split('@');
  return partes.length === 2 ? (partes[1] ?? '') : '';
}

/**
 * RN-002 — só e-mail institucional entra. A lista de domínios é dado da
 * faculdade, não constante do código: uma segunda instituição não exige deploy.
 * Subdomínio conta (`aluno.fiap.com.br` casa com `fiap.com.br`), porque é assim
 * que instituição de verdade organiza e-mail de aluno.
 */
export function dominioInstitucional(email: string, dominios: readonly string[]): boolean {
  const dominio = dominioDoEmail(email);
  if (!dominio) return false;
  return dominios.some((aceito) => {
    const alvo = aceito.trim().toLowerCase();
    return dominio === alvo || dominio.endsWith(`.${alvo}`);
  });
}

/**
 * Comprimento mínimo da senha. Não é política de força completa — essa é do
 * CP6, junto com o hash argon2 (RNF-019) — é o piso que o formulário exige para
 * não deixar passar senha vazia.
 */
export const SENHA_MINIMA = 8;

export function senhaAceitavel(senha: string): boolean {
  return senha.length >= SENHA_MINIMA;
}

export type DecisaoLogin =
  { aceito: true } | { aceito: false; motivo: MotivoRecusaLogin; mensagem: string };

/**
 * Ordem das verificações é a ordem do que o usuário consegue corrigir: domínio
 * errado é erro de conta errada; credencial inválida é erro de digitação; e-mail
 * não verificado é pendência de ação anterior.
 */
export function decideLogin(input: {
  email: string;
  senhaConfere: boolean;
  usuario: Pick<Usuario, 'emailVerificado'> | null;
  dominios: readonly string[];
}): DecisaoLogin {
  if (!dominioInstitucional(input.email, input.dominios)) {
    return {
      aceito: false,
      motivo: 'DOMINIO_NAO_INSTITUCIONAL',
      mensagem: `Use seu e-mail institucional (${input.dominios.map((d) => `@${d}`).join(', ')}).`,
    };
  }

  if (!input.usuario || !input.senhaConfere) {
    return {
      aceito: false,
      motivo: 'CREDENCIAL_INVALIDA',
      mensagem: 'E-mail ou senha não conferem.',
    };
  }

  if (!input.usuario.emailVerificado) {
    return {
      aceito: false,
      motivo: 'EMAIL_NAO_VERIFICADO',
      mensagem: 'Confirme o e-mail que enviamos antes de entrar.',
    };
  }

  return { aceito: true };
}

/** O onboarding só termina quando curso E turma estão resolvidos (RF-004/RF-005). */
export function onboardingPendente(usuario: Pick<Usuario, 'cursoId' | 'turmaId'>): boolean {
  return usuario.cursoId === null || usuario.turmaId === null;
}

export type DecisaoOnboarding =
  | { aceito: true; turma: Turma }
  | { aceito: false; motivo: MotivoRecusaOnboarding; mensagem: string };

/**
 * RN-003 — o código de convite é a prova de vínculo com a turma. Recusar com
 * motivo específico importa: "código de outro curso" é o erro que o aluno comete
 * quando escolhe o curso errado na tela anterior, e a mensagem genérica o
 * deixaria preso.
 */
export function decideOnboarding(input: {
  cursoId: string;
  codigoConvite: string;
  cursos: readonly Curso[];
  turmas: readonly Turma[];
}): DecisaoOnboarding {
  const curso = input.cursos.find((c) => c.id === input.cursoId);
  if (!curso) {
    return {
      aceito: false,
      motivo: 'CURSO_INEXISTENTE',
      mensagem: 'Escolha um curso da lista.',
    };
  }

  const codigo = normalizaCodigo(input.codigoConvite);
  const turma = input.turmas.find((t) => normalizaCodigo(t.codigoConvite) === codigo);

  if (!turma) {
    return {
      aceito: false,
      motivo: 'CODIGO_INVALIDO',
      mensagem: 'Esse código de turma não existe. Confira com quem te passou.',
    };
  }

  if (!turma.codigoAtivo) {
    return {
      aceito: false,
      motivo: 'CODIGO_INATIVO',
      mensagem: 'Esse código foi desativado. Peça o código do período atual.',
    };
  }

  if (turma.cursoId !== curso.id) {
    return {
      aceito: false,
      motivo: 'CODIGO_DE_OUTRO_CURSO',
      mensagem: `Esse código é de outro curso. Volte e escolha o curso da turma ${turma.nome}.`,
    };
  }

  return { aceito: true, turma };
}

/** Código é digitado à mão: espaço e caixa não podem reprovar um código certo. */
export function normalizaCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

/** Sugestão de e-mail exibida na tela de login, a partir da faculdade carregada. */
export function exemploDeEmail(faculdade: Pick<Faculdade, 'dominiosEmail'>): string {
  return `seu.nome@${faculdade.dominiosEmail[0] ?? 'faculdade.edu.br'}`;
}
