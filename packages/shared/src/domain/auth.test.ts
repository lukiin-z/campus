import { describe, expect, it } from 'vitest';
import type { Curso, Turma } from '../types';
import {
  decideLogin,
  decideOnboarding,
  dominioInstitucional,
  emailBemFormado,
  normalizaCodigo,
  onboardingPendente,
  senhaAceitavel,
} from './auth';

/**
 * CT-032 e CT-033 — autenticação e vínculo acadêmico (RN-002, RN-003).
 *
 * O que estes testes protegem não é o caminho felizinho: é o MOTIVO da recusa.
 * Mensagem genérica deixa o aluno preso na tela sem saber se errou a senha, o
 * e-mail ou o curso — e é justamente esse o problema que a fila da secretaria
 * resolve hoje.
 */

const DOMINIOS = ['fiap.com.br'];

describe('domínio institucional (RN-002)', () => {
  it('aceita o domínio exato', () => {
    expect(dominioInstitucional('marina@fiap.com.br', DOMINIOS)).toBe(true);
  });

  it('aceita subdomínio, porque é assim que instituição organiza e-mail de aluno', () => {
    expect(dominioInstitucional('marina@aluno.fiap.com.br', DOMINIOS)).toBe(true);
  });

  it('recusa domínio pessoal', () => {
    expect(dominioInstitucional('marina@gmail.com', DOMINIOS)).toBe(false);
  });

  it('não confunde sufixo parecido com subdomínio', () => {
    // `naofiap.com.br` termina com `fiap.com.br` como string, mas não é
    // subdomínio. Sem o ponto na comparação este caso passaria — e qualquer
    // pessoa registraria um domínio terminado assim para entrar.
    expect(dominioInstitucional('invasor@naofiap.com.br', DOMINIOS)).toBe(false);
  });

  it('recusa e-mail sem domínio', () => {
    expect(dominioInstitucional('marina', DOMINIOS)).toBe(false);
    expect(dominioInstitucional('marina@', DOMINIOS)).toBe(false);
  });

  it('ignora caixa e espaço em volta', () => {
    expect(dominioInstitucional('  MARINA@FIAP.COM.BR  ', DOMINIOS)).toBe(true);
  });
});

describe('formato de e-mail e senha', () => {
  it('exige local, arroba e domínio com ponto', () => {
    expect(emailBemFormado('a@b.co')).toBe(true);
    expect(emailBemFormado('a@b')).toBe(false);
    expect(emailBemFormado('a b@c.co')).toBe(false);
    expect(emailBemFormado('')).toBe(false);
  });

  it('exige 8 caracteres na senha', () => {
    expect(senhaAceitavel('1234567')).toBe(false);
    expect(senhaAceitavel('12345678')).toBe(true);
  });
});

describe('decideLogin (RN-002)', () => {
  const verificado = { emailVerificado: true };

  it('recusa domínio antes de olhar a senha', () => {
    // A ordem importa: dizer "senha errada" para quem usou o Gmail manda a
    // pessoa tentar de novo com a mesma conta, para sempre.
    const decisao = decideLogin({
      email: 'marina@gmail.com',
      senhaConfere: true,
      usuario: verificado,
      dominios: DOMINIOS,
    });
    expect(decisao.aceito).toBe(false);
    if (!decisao.aceito) {
      expect(decisao.motivo).toBe('DOMINIO_NAO_INSTITUCIONAL');
      expect(decisao.mensagem).toContain('@fiap.com.br');
    }
  });

  it('recusa credencial inválida sem revelar se o e-mail existe', () => {
    const inexistente = decideLogin({
      email: 'ninguem@fiap.com.br',
      senhaConfere: false,
      usuario: null,
      dominios: DOMINIOS,
    });
    const senhaErrada = decideLogin({
      email: 'marina@fiap.com.br',
      senhaConfere: false,
      usuario: verificado,
      dominios: DOMINIOS,
    });

    expect(inexistente.aceito).toBe(false);
    expect(senhaErrada.aceito).toBe(false);
    if (!inexistente.aceito && !senhaErrada.aceito) {
      // Mensagens idênticas: enumerar contas válidas seria vazamento (RNF-021).
      expect(inexistente.motivo).toBe(senhaErrada.motivo);
      expect(inexistente.mensagem).toBe(senhaErrada.mensagem);
    }
  });

  it('recusa e-mail não verificado mesmo com senha certa', () => {
    const decisao = decideLogin({
      email: 'marina@fiap.com.br',
      senhaConfere: true,
      usuario: { emailVerificado: false },
      dominios: DOMINIOS,
    });
    expect(decisao.aceito).toBe(false);
    if (!decisao.aceito) expect(decisao.motivo).toBe('EMAIL_NAO_VERIFICADO');
  });

  it('aceita quando as três condições valem', () => {
    expect(
      decideLogin({
        email: 'marina@fiap.com.br',
        senhaConfere: true,
        usuario: verificado,
        dominios: DOMINIOS,
      }).aceito,
    ).toBe(true);
  });
});

describe('decideOnboarding (RN-003)', () => {
  const cursos: Curso[] = [
    {
      id: 'cur-001',
      faculdadeId: 'fac-001',
      nome: 'Engenharia',
      codigo: 'ECP',
      duracaoSemestres: 10,
    },
    {
      id: 'cur-002',
      faculdadeId: 'fac-001',
      nome: 'Direito',
      codigo: 'DIR',
      duracaoSemestres: 10,
    },
  ];
  const turmas: Turma[] = [
    {
      id: 'tur-001',
      cursoId: 'cur-001',
      nome: '3ESPX',
      periodo: '2026.1',
      codigoConvite: 'ESPX26',
      codigoAtivo: true,
    },
    {
      id: 'tur-002',
      cursoId: 'cur-002',
      nome: '2DIRA',
      periodo: '2026.1',
      codigoConvite: 'DIRA26',
      codigoAtivo: true,
    },
    {
      id: 'tur-003',
      cursoId: 'cur-001',
      nome: '3ESPY',
      periodo: '2025.2',
      codigoConvite: 'ESPY25',
      codigoAtivo: false,
    },
  ];

  it('vincula com curso e código coerentes', () => {
    const decisao = decideOnboarding({
      cursoId: 'cur-001',
      codigoConvite: 'ESPX26',
      cursos,
      turmas,
    });
    expect(decisao.aceito).toBe(true);
    if (decisao.aceito) expect(decisao.turma.nome).toBe('3ESPX');
  });

  it('tolera espaço, hífen e caixa no código digitado à mão', () => {
    const decisao = decideOnboarding({
      cursoId: 'cur-001',
      codigoConvite: ' espx-26 ',
      cursos,
      turmas,
    });
    expect(decisao.aceito).toBe(true);
  });

  it('distingue código de outro curso de código inexistente', () => {
    const outroCurso = decideOnboarding({
      cursoId: 'cur-001',
      codigoConvite: 'DIRA26',
      cursos,
      turmas,
    });
    const inexistente = decideOnboarding({
      cursoId: 'cur-001',
      codigoConvite: 'NADA00',
      cursos,
      turmas,
    });

    expect(outroCurso.aceito).toBe(false);
    expect(inexistente.aceito).toBe(false);
    if (!outroCurso.aceito) {
      expect(outroCurso.motivo).toBe('CODIGO_DE_OUTRO_CURSO');
      // A mensagem tem de nomear a turma certa, senão o aluno não sabe voltar.
      expect(outroCurso.mensagem).toContain('2DIRA');
    }
    if (!inexistente.aceito) expect(inexistente.motivo).toBe('CODIGO_INVALIDO');
  });

  it('recusa código de período encerrado', () => {
    const decisao = decideOnboarding({
      cursoId: 'cur-001',
      codigoConvite: 'ESPY25',
      cursos,
      turmas,
    });
    expect(decisao.aceito).toBe(false);
    if (!decisao.aceito) expect(decisao.motivo).toBe('CODIGO_INATIVO');
  });

  it('recusa curso que não existe', () => {
    const decisao = decideOnboarding({
      cursoId: 'cur-999',
      codigoConvite: 'ESPX26',
      cursos,
      turmas,
    });
    expect(decisao.aceito).toBe(false);
    if (!decisao.aceito) expect(decisao.motivo).toBe('CURSO_INEXISTENTE');
  });
});

describe('normalizaCodigo e onboardingPendente', () => {
  it('remove separadores e sobe a caixa', () => {
    expect(normalizaCodigo(' es-px 26 ')).toBe('ESPX26');
  });

  it('considera pendente enquanto faltar curso OU turma', () => {
    expect(onboardingPendente({ cursoId: null, turmaId: null })).toBe(true);
    expect(onboardingPendente({ cursoId: 'cur-001', turmaId: null })).toBe(true);
    expect(onboardingPendente({ cursoId: null, turmaId: 'tur-001' })).toBe(true);
    expect(onboardingPendente({ cursoId: 'cur-001', turmaId: 'tur-001' })).toBe(false);
  });
});
