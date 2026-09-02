import type { PapelUsuario } from '../../types/domain';

/**
 * Perfis de demonstração da tela de login (RF-003).
 *
 * Existe porque quem avalia o CP5 precisa entrar como cada persona sem decorar
 * e-mail. Os quatro estão no seed (`src/mocks/seed.ts`) e o campo `papeis`
 * abaixo é o `papeis` de lá — não rótulo inventado para a tela.
 *
 * A senha é declarada aqui, e não importada de `src/mocks/support.ts`, porque
 * tela não importa mock (RNF-016, regra `no-restricted-imports`). É duplicação
 * consciente de UM literal de demonstração: se o seed trocar a senha, esta
 * constante troca com ele.
 */
export const SENHA_DEMO = 'campus123';

export interface PerfilDemo {
  nome: string;
  email: string;
  /** Papéis do seed. `ALUNO` sozinho não é organizador: ver `descricao`. */
  papeis: readonly PapelUsuario[];
  /** O que este perfil serve para demonstrar na avaliação. */
  descricao: string;
  vinculo: string;
  /**
   * Código de turma a usar no onboarding, para o perfil sem vínculo.
   *
   * É campo, e não texto embutido em `vinculo`, porque um código errado aqui
   * quebra a demonstração em silêncio — e campo pode ser verificado contra o
   * seed por teste (`src/mocks/seed.test.ts`). A primeira versão trazia
   * `ESPX-26` em vez de `3ESPX-26`, e só o onboarding real revelou.
   */
  codigoSugerido?: string;
}

export const PERFIS_DEMO: readonly PerfilDemo[] = [
  {
    nome: 'Marina Alves',
    email: 'marina.alves@fiap.com.br',
    papeis: ['ALUNO'],
    descricao: 'Participante: inscrição, pagamento, ingresso e lista de espera.',
    vinculo: '3ESPX · Engenharia de Computação',
  },
  {
    nome: 'Rafael Souza',
    email: 'rafael.souza@fiap.com.br',
    papeis: ['ALUNO'],
    // Organizador por ter criado eventos no seed (evt-001, evt-011), não por
    // papel administrativo — é o representante da 3ESPX.
    descricao: 'Organiza os eventos da 3ESPX: painel de check-in e rascunho.',
    vinculo: '3ESPX · Engenharia de Computação',
  },
  {
    nome: 'Henrique Lima',
    email: 'henrique.lima@fiap.com.br',
    papeis: ['ALUNO', 'ADMIN_CURSO'],
    descricao: 'Administra o curso: aprova evento de alcance de curso.',
    vinculo: '2ESPA · Engenharia de Computação',
  },
  {
    nome: 'Isabela Duarte',
    email: 'isabela.duarte@fiap.com.br',
    papeis: ['ALUNO', 'ADMIN_FACULDADE'],
    descricao: 'Administra a faculdade: aprova evento de alcance de faculdade.',
    vinculo: '4SIA · Sistemas de Informação',
  },
  {
    nome: 'Lucas Tavares',
    email: 'lucas.tavares@fiap.com.br',
    papeis: ['ALUNO'],
    descricao: 'Conta nova, sem vínculo: cai no onboarding em vez do feed.',
    // O único perfil com `cursoId` e `turmaId` nulos no seed.
    vinculo: 'sem turma ainda',
    codigoSugerido: '3ESPX-26',
  },
];

const PAPEL_ROTULO: Record<PapelUsuario, string> = {
  ALUNO: 'aluno',
  ADMIN_CURSO: 'admin do curso',
  ADMIN_FACULDADE: 'admin da faculdade',
};

/** "aluno · admin do curso" — o papel é texto, nunca só cor (WCAG 1.4.1). */
export function papeisEmTexto(papeis: readonly PapelUsuario[]): string {
  return papeis.map((papel) => PAPEL_ROTULO[papel]).join(' · ');
}
