import { Prisma } from '@prisma/client';
import type {
  AlcanceEvento,
  MetodoCheckin,
  MetodoPagamento,
  MotivoCancelamento,
  PapelUsuario,
  StatusEvento,
  StatusPagamento,
  StatusParticipacao,
  TipoNotificacao,
  TipoPergunta,
} from '@prisma/client';
import { POLICY, defaultDeadlines, offerDeadline, paymentDeadline } from '@campus/shared';
import { uuidLegado } from './ids';

/**
 * Os dados do seed — os MESMOS do CP5, agora em linhas de PostgreSQL.
 *
 * A fonte é `app/src/mocks/seed.ts`, e a fidelidade não é estética: quem seguir
 * o roteiro de `docs/18-ambiente-de-teste.md` contra a API real tem de ver o que
 * via contra o mock, com os mesmos nomes de pessoa, os mesmos títulos de evento
 * e os mesmos estados. É esse "mesmo produto, outra infraestrutura" que faz a
 * evolução do CP5 para o CP6 ser demonstrável em vez de afirmada.
 *
 * Os dados foram **portados, não importados**: `app/` é outro workspace, e a API
 * não depende do front. O que é compartilhado de verdade — os parâmetros do
 * domínio e as funções de prazo — vem de `@campus/shared`, uma vez só.
 *
 * ## As três diferenças em relação ao mock
 *
 * | O quê | No CP5 | Aqui | Por quê |
 * |---|---|---|---|
 * | Senha | `campus123` em texto claro | hash argon2id, um salt por usuário | RNF-019 |
 * | Id | `usr-001` | UUID derivado (ver `ids.ts`) | o schema usa `uuid` |
 * | Data | relativa a hoje | relativa a hoje | igual — e é essencial |
 *
 * As datas continuam calculadas a partir do relógio, com deslocamentos fixos.
 * Um seed com datas absolutas apodrece: o "evento em andamento" para de estar em
 * andamento no dia seguinte, e com ele morre a única demonstração possível do
 * check-in aceito e da recusa por uso único (RN-018).
 *
 * ## Este módulo não escreve nada
 *
 * Ele monta os registros e devolve. Quem grava é `run.ts`. A separação existe
 * para que o hash da senha seja injetado (o teste de integração usa um hash
 * falso e barato em vez de gastar argon2 em cada execução) e para que os dados
 * possam ser inspecionados sem um banco de pé.
 */

// ---------------------------------------------------------------------------
// O domínio compartilhado
// ---------------------------------------------------------------------------

/*
 * Aqui havia um `import()` dinâmico com um comentário longo explicando que
 * `import` estático de `@campus/shared` falhava com
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` em módulo CommonJS.
 *
 * Era verdade quando foi escrito, e deixou de ser: o pacote passou a declarar a
 * condição `require`, `dist/index.js` é CommonJS e `scripts/check-contrato.mjs`
 * **executa** um `require` e um `import` dele a cada verificação. Com a causa
 * removida, o `import()` dinâmico virou complexidade sem motivo — e um
 * comentário afirmando um defeito já corrigido é pior do que nenhum comentário,
 * porque manda a próxima pessoa contornar um problema que não existe.
 */

// ---------------------------------------------------------------------------
// Senha de demonstração
// ---------------------------------------------------------------------------

/**
 * A senha de todos os usuários de demonstração.
 *
 * Está documentada em `docs/18-ambiente-de-teste.md` e era `SENHA_DEMO` em
 * `app/src/mocks/support.ts`. Continua sendo `campus123` de propósito: mudá-la
 * invalidaria o documento que a banca usa para entrar. O que mudou é que ela
 * **não é armazenada** — só o hash chega ao banco (RNF-019).
 */
export const SENHA_DEMO = 'campus123';

// ---------------------------------------------------------------------------
// Datas relativas
//
// Portadas de `app/src/mocks/seed.ts`. As três funções recebem `agora` em vez
// de ler o relógio: é o que permite gerar o mesmo seed duas vezes no mesmo
// instante e comparar, e é a mesma disciplina de `@campus/shared/domain`.
// ---------------------------------------------------------------------------

const MS_POR_HORA = 3_600_000;

function inicioDoDia(agora: Date): Date {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Deslocamento em dias a partir de hoje, com hora e minuto explícitos. */
function emDias(agora: Date, dias: number, hora: number, minuto = 0): Date {
  const d = inicioDoDia(agora);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

/**
 * Deslocamento em horas a partir de AGORA, não da meia-noite.
 *
 * Existe para o evento em andamento (`evt-013`): a janela de check-in vai de 4 h
 * antes do início a 2 h depois do fim (RN-017), e um horário cravado na
 * meia-noite só cairia dentro dela se a demonstração fosse feita naquela hora
 * do dia. Com esta função o evento está sempre acontecendo.
 */
function emHoras(agora: Date, horas: number): Date {
  return new Date(agora.getTime() + horas * MS_POR_HORA);
}

// ---------------------------------------------------------------------------
// Estrutura acadêmica — 1 faculdade, 3 cursos, 4 turmas
// ---------------------------------------------------------------------------

const FACULDADE = 'fac-001';

interface DescricaoCurso {
  idLegado: string;
  nome: string;
  codigo: string;
  duracaoSemestres: number;
}

const CURSOS: readonly DescricaoCurso[] = [
  { idLegado: 'cur-001', nome: 'Engenharia de Computação', codigo: 'ECOMP', duracaoSemestres: 10 },
  { idLegado: 'cur-002', nome: 'Sistemas de Informação', codigo: 'SI', duracaoSemestres: 8 },
  { idLegado: 'cur-003', nome: 'Ciência da Computação', codigo: 'CC', duracaoSemestres: 8 },
];

interface DescricaoTurma {
  idLegado: string;
  cursoLegado: string;
  nome: string;
  codigoConvite: string;
}

/**
 * Os quatro códigos de convite são citados um a um em
 * `docs/18-ambiente-de-teste.md` (§4) — mudar qualquer um invalida o roteiro de
 * onboarding, que manda digitar `4SIA-26` para ver a recusa e `3ESPX-26` para
 * concluir.
 */
const TURMAS: readonly DescricaoTurma[] = [
  { idLegado: 'tur-001', cursoLegado: 'cur-001', nome: '3ESPX', codigoConvite: '3ESPX-26' },
  { idLegado: 'tur-002', cursoLegado: 'cur-001', nome: '2ESPA', codigoConvite: '2ESPA-26' },
  { idLegado: 'tur-003', cursoLegado: 'cur-002', nome: '4SIA', codigoConvite: '4SIA-26' },
  { idLegado: 'tur-004', cursoLegado: 'cur-003', nome: '1CCB', codigoConvite: '1CCB-26' },
];

const PERIODO = '2026.1';

// ---------------------------------------------------------------------------
// Usuários — 13, cobrindo as 3 personas e os 2 papéis administrativos
// ---------------------------------------------------------------------------

interface DescricaoUsuario {
  idLegado: string;
  nome: string;
  emailLocal: string;
  /**
   * `null` nos dois é o estado entre a verificação do e-mail e a conclusão do
   * onboarding (RF-004, RF-005). Existe um usuário assim no seed de propósito:
   * sem ele, a tela de vínculo só apareceria para quem criasse uma conta nova, e
   * o fluxo não seria demonstrável.
   */
  turmaLegado: string | null;
  cursoLegado: string | null;
  avatarSeed: number;
  papeis?: readonly PapelUsuario[];
}

const USUARIOS: readonly DescricaoUsuario[] = [
  // Persona 1 — participante. É a usuária autenticada da demonstração.
  {
    idLegado: 'usr-001',
    nome: 'Marina Alves',
    emailLocal: 'marina.alves',
    turmaLegado: 'tur-001',
    cursoLegado: 'cur-001',
    avatarSeed: 1,
  },
  // Persona 2 — organizador, representante da turma 3ESPX.
  {
    idLegado: 'usr-002',
    nome: 'Rafael Souza',
    emailLocal: 'rafael.souza',
    turmaLegado: 'tur-001',
    cursoLegado: 'cur-001',
    avatarSeed: 2,
  },
  // Persona 3 — diretora de eventos da Atlética.
  {
    idLegado: 'usr-003',
    nome: 'Beatriz Nakamura',
    emailLocal: 'beatriz.nakamura',
    turmaLegado: 'tur-003',
    cursoLegado: 'cur-002',
    avatarSeed: 3,
  },
  {
    idLegado: 'usr-004',
    nome: 'Caio Ferreira',
    emailLocal: 'caio.ferreira',
    turmaLegado: 'tur-001',
    cursoLegado: 'cur-001',
    avatarSeed: 4,
  },
  {
    idLegado: 'usr-005',
    nome: 'Diego Martins',
    emailLocal: 'diego.martins',
    turmaLegado: 'tur-002',
    cursoLegado: 'cur-001',
    avatarSeed: 5,
  },
  {
    idLegado: 'usr-006',
    nome: 'Elisa Prado',
    emailLocal: 'elisa.prado',
    turmaLegado: 'tur-003',
    cursoLegado: 'cur-002',
    avatarSeed: 6,
  },
  {
    idLegado: 'usr-007',
    nome: 'Felipe Antunes',
    emailLocal: 'felipe.antunes',
    turmaLegado: 'tur-004',
    cursoLegado: 'cur-003',
    avatarSeed: 7,
  },
  {
    idLegado: 'usr-008',
    nome: 'Gabriela Rocha',
    emailLocal: 'gabriela.rocha',
    turmaLegado: 'tur-001',
    cursoLegado: 'cur-001',
    avatarSeed: 8,
  },
  {
    idLegado: 'usr-009',
    nome: 'Henrique Lima',
    emailLocal: 'henrique.lima',
    turmaLegado: 'tur-002',
    cursoLegado: 'cur-001',
    avatarSeed: 9,
    papeis: ['ALUNO', 'ADMIN_CURSO'],
  },
  {
    idLegado: 'usr-010',
    nome: 'Isabela Duarte',
    emailLocal: 'isabela.duarte',
    turmaLegado: 'tur-003',
    cursoLegado: 'cur-002',
    avatarSeed: 10,
    papeis: ['ALUNO', 'ADMIN_FACULDADE'],
  },
  {
    idLegado: 'usr-011',
    nome: 'João Pedro Alencar',
    emailLocal: 'joao.alencar',
    turmaLegado: 'tur-003',
    cursoLegado: 'cur-002',
    avatarSeed: 11,
  },
  {
    idLegado: 'usr-012',
    nome: 'Karen Yamada',
    emailLocal: 'karen.yamada',
    turmaLegado: 'tur-002',
    cursoLegado: 'cur-001',
    avatarSeed: 12,
  },
  // Conta nova: e-mail verificado, vínculo pendente. É por ela que se demonstra
  // o onboarding — o código da 3ESPX é `3ESPX-26` (tur-001).
  {
    idLegado: 'usr-013',
    nome: 'Lucas Tavares',
    emailLocal: 'lucas.tavares',
    turmaLegado: null,
    cursoLegado: null,
    avatarSeed: 5,
  },
];

// ---------------------------------------------------------------------------
// Eventos — 13, com estados variados: lotado, gratuito, pago, cancelado,
// realizado, rascunho, com lista de espera ativa, com oferta de vaga em curso e
// um EM ANDAMENTO, para o check-in poder ser exercitado
// ---------------------------------------------------------------------------

interface DescricaoEvento {
  idLegado: string;
  organizadorLegado: string;
  titulo: string;
  descricao: string;
  alcance: AlcanceEvento;
  /** Turma, curso ou faculdade, conforme o alcance (RN-001). */
  ancoraLegado: string;
  diasDeHoje: number;
  hora: number;
  minuto?: number;
  /**
   * Início em horas a partir de agora, sobrepondo `diasDeHoje`/`hora`. Só o
   * evento em andamento usa: ver `emHoras`.
   */
  inicioEmHorasDeAgora?: number;
  duracaoHoras: number;
  local: string;
  capacidade: number;
  /** Contagem materializada de RN-004 — o `CHECK` do banco a mantém honesta. */
  ocupadas: number;
  preco: number;
  status: StatusEvento;
  motivoCancelamento?: string;
  capaSeed: number;
}

const EVENTOS: readonly DescricaoEvento[] = [
  {
    idLegado: 'evt-001',
    organizadorLegado: 'usr-002',
    titulo: 'Churrasco de encerramento do semestre',
    descricao:
      'Churrasco da 3ESPX para fechar o semestre. Carne, bebida e caixa de som por conta do rateio — R$ 25 por pessoa, pago no app. Traga acompanhante avisando na pergunta da inscrição. Quem tem restrição alimentar, avise até quinta que a gente resolve.',
    alcance: 'TURMA',
    ancoraLegado: 'tur-001',
    diasDeHoje: 11,
    hora: 13,
    duracaoHoras: 6,
    local: 'Quadra do Campus 2',
    capacidade: 40,
    ocupadas: 18,
    preco: 25,
    status: 'PUBLICADO',
    capaSeed: 3,
  },
  {
    idLegado: 'evt-002',
    organizadorLegado: 'usr-004',
    titulo: 'Hackathon Campus 48h',
    descricao:
      '48 horas de imersão em desenvolvimento, com mentoria de empresas parceiras e premiação para as três melhores equipes. Equipes de 3 a 5 pessoas, tema divulgado na abertura. Traga notebook, extensão e disposição. Alimentação inclusa nos três dias.',
    alcance: 'FACULDADE',
    ancoraLegado: 'fac-001',
    diasDeHoje: 17,
    hora: 18,
    duracaoHoras: 50,
    local: 'Bloco de Tecnologia',
    capacidade: 80,
    ocupadas: 80,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 7,
  },
  {
    idLegado: 'evt-003',
    organizadorLegado: 'usr-008',
    titulo: 'Roda de conversa: mercado de dados',
    descricao:
      'Conversa aberta com três ex-alunos que hoje trabalham com engenharia de dados, analytics e machine learning. Sem apresentação de slides: só perguntas da turma. Traga a sua.',
    alcance: 'CURSO',
    ancoraLegado: 'cur-001',
    diasDeHoje: 23,
    hora: 19,
    duracaoHoras: 2,
    local: 'Auditório B',
    capacidade: 60,
    ocupadas: 41,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 5,
  },
  {
    idLegado: 'evt-004',
    organizadorLegado: 'usr-010',
    titulo: 'Feira de Carreiras 2026.2',
    descricao:
      'Vinte e duas empresas com vagas de estágio e trainee, mais quatro palestras curtas sobre processo seletivo. Leve currículo impresso: ainda funciona. Entrada por ordem de check-in.',
    alcance: 'FACULDADE',
    ancoraLegado: 'fac-001',
    diasDeHoje: 30,
    hora: 14,
    duracaoHoras: 6,
    local: 'Ginásio Central',
    capacidade: 400,
    ocupadas: 233,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 1,
  },
  {
    idLegado: 'evt-005',
    organizadorLegado: 'usr-003',
    titulo: 'Festa Junina Fora de Época',
    descricao:
      'A festa junina da Atlética, em outubro, porque em junho estava todo mundo em prova. Quadrilha, comida típica e banda ao vivo. R$ 45 com uma bebida inclusa. Ingresso não transferível: o check-in é por QR Code no seu nome.',
    alcance: 'FACULDADE',
    ancoraLegado: 'fac-001',
    diasDeHoje: 39,
    hora: 20,
    duracaoHoras: 5,
    local: 'Clube Paulista',
    capacidade: 300,
    ocupadas: 287,
    preco: 45,
    status: 'PUBLICADO',
    capaSeed: 9,
  },
  {
    idLegado: 'evt-006',
    organizadorLegado: 'usr-006',
    titulo: 'Workshop de Git e GitHub',
    descricao:
      'Do zero ao pull request: branch, commit, merge, resolução de conflito e revisão de código. Prático, com máquina do laboratório. Não precisa saber nada antes.',
    alcance: 'CURSO',
    ancoraLegado: 'cur-002',
    diasDeHoje: 14,
    hora: 19,
    minuto: 30,
    duracaoHoras: 3,
    local: 'Laboratório 4',
    capacidade: 30,
    ocupadas: 30,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 11,
  },
  {
    idLegado: 'evt-007',
    organizadorLegado: 'usr-003',
    titulo: 'Torneio de Futsal Interturmas',
    descricao:
      'Doze times, chaves de quatro, jogos de 2×10 minutos. Inscrição por pessoa, R$ 15, revertida em arbitragem e troféu. Formação dos times no dia, por turma. Leve caneleira.',
    alcance: 'FACULDADE',
    ancoraLegado: 'fac-001',
    diasDeHoje: 26,
    hora: 9,
    duracaoHoras: 8,
    local: 'Quadra Coberta',
    capacidade: 120,
    ocupadas: 96,
    preco: 15,
    status: 'PUBLICADO',
    capaSeed: 4,
  },
  {
    idLegado: 'evt-008',
    organizadorLegado: 'usr-007',
    titulo: 'Palestra: Carreira em Segurança da Informação',
    descricao:
      'Painel sobre carreira em segurança ofensiva e defensiva, com profissionais de resposta a incidente e de teste de intrusão.',
    alcance: 'CURSO',
    ancoraLegado: 'cur-003',
    diasDeHoje: 35,
    hora: 19,
    duracaoHoras: 2,
    local: 'Auditório A',
    capacidade: 100,
    ocupadas: 34,
    preco: 0,
    status: 'CANCELADO',
    // Sem este texto o `CHECK` de RN-021 recusa a linha: cancelamento sem
    // motivo deixa o inscrito sem saber o que houve.
    motivoCancelamento:
      'A palestrante principal ficou indisponível na data. Vamos remarcar para novembro e avisar por aqui.',
    capaSeed: 8,
  },
  {
    idLegado: 'evt-009',
    organizadorLegado: 'usr-007',
    titulo: 'Churrasco de boas-vindas 1CCB',
    descricao:
      'Primeiro encontro da 1CCB fora da sala. Rateio de R$ 20, churrasco na área de convivência.',
    alcance: 'TURMA',
    ancoraLegado: 'tur-004',
    diasDeHoje: -10,
    hora: 12,
    duracaoHoras: 5,
    local: 'Área de convivência',
    capacidade: 35,
    ocupadas: 31,
    preco: 20,
    status: 'REALIZADO',
    capaSeed: 2,
  },
  {
    idLegado: 'evt-010',
    organizadorLegado: 'usr-010',
    titulo: 'Semana de Recepção 2026.2',
    descricao:
      'Cinco dias de recepção aos calouros: tour pelo campus, apresentação das entidades, oficinas e festa de encerramento.',
    alcance: 'FACULDADE',
    ancoraLegado: 'fac-001',
    diasDeHoje: -22,
    hora: 9,
    // 100 h cabem no `CHECK` de duração máxima (7 dias); 8 dias não cabem.
    duracaoHoras: 100,
    local: 'Campus Paulista',
    capacidade: 500,
    ocupadas: 412,
    preco: 0,
    status: 'REALIZADO',
    capaSeed: 6,
  },
  {
    idLegado: 'evt-011',
    organizadorLegado: 'usr-002',
    titulo: 'Sarau de fim de semestre',
    descricao:
      'Ideia: noite de música e poesia da 3ESPX. Falta definir se vai ter som amplificado e quanto custa o espaço.',
    alcance: 'TURMA',
    ancoraLegado: 'tur-001',
    diasDeHoje: 32,
    hora: 20,
    duracaoHoras: 4,
    local: 'A definir com a coordenação',
    capacidade: 40,
    ocupadas: 0,
    preco: 0,
    status: 'RASCUNHO',
    capaSeed: 10,
  },
  {
    idLegado: 'evt-012',
    organizadorLegado: 'usr-002',
    titulo: 'Visita técnica à fábrica da Bosch',
    descricao:
      'Visita guiada à linha de produção e ao laboratório de testes, com engenheiros da própria planta. Ônibus sai do Campus 2 às 7h em ponto e volta às 14h. Vagas limitadas pelo ônibus, não pela fábrica — por isso a fila de espera anda rápido quando alguém desiste. Levar documento com foto e sapato fechado.',
    alcance: 'TURMA',
    ancoraLegado: 'tur-001',
    diasDeHoje: 9,
    hora: 7,
    duracaoHoras: 7,
    local: 'Saída do Campus 2',
    capacidade: 25,
    ocupadas: 25,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 11,
  },
  {
    idLegado: 'evt-013',
    organizadorLegado: 'usr-002',
    titulo: 'Maratona de estudos para a prova de Algoritmos',
    descricao:
      'Sala reservada, café por conta do rateio e três monitores do 5º semestre resolvendo exercício com quem chegar. Entrada por check-in no app: a coordenação exige lista de presença para liberar a sala fora do horário.',
    alcance: 'TURMA',
    ancoraLegado: 'tur-001',
    // Começou 1 h atrás e termina em 3 h: dentro da janela de check-in de
    // RN-017 em qualquer momento em que a demonstração seja feita.
    diasDeHoje: 0,
    hora: 0,
    inicioEmHorasDeAgora: -1,
    duracaoHoras: 4,
    local: 'Laboratório 2',
    capacidade: 20,
    ocupadas: 12,
    preco: 0,
    status: 'PUBLICADO',
    capaSeed: 7,
  },
];

// ---------------------------------------------------------------------------
// Perguntas customizadas — só o churrasco tem (RN-025, máx. 5)
// ---------------------------------------------------------------------------

interface DescricaoPergunta {
  idLegado: string;
  eventoLegado: string;
  enunciado: string;
  tipo: TipoPergunta;
  /**
   * Vazio em `TEXTO_CURTO`. O mock guardava `null`; o schema declara
   * `String[]`, e lista escalar no Prisma não é anulável — daí `[]`. O `CHECK`
   * de RN-025 só exige duas opções quando o tipo é `ESCOLHA_UNICA`, então o
   * array vazio passa.
   */
  opcoes: readonly string[];
  obrigatoria: boolean;
  ordem: number;
}

const PERGUNTAS: readonly DescricaoPergunta[] = [
  {
    idLegado: 'per-001',
    eventoLegado: 'evt-001',
    enunciado: 'Vai levar acompanhante?',
    tipo: 'ESCOLHA_UNICA',
    opcoes: ['Não', 'Sim, uma pessoa'],
    obrigatoria: true,
    ordem: 1,
  },
  {
    idLegado: 'per-002',
    eventoLegado: 'evt-001',
    enunciado: 'Alguma restrição alimentar?',
    tipo: 'TEXTO_CURTO',
    opcoes: [],
    obrigatoria: false,
    ordem: 2,
  },
];

// ---------------------------------------------------------------------------
// Participações
//
// Marina (usr-001): confirmada e paga no evt-001, com pagamento pendente no
// evt-005, com oferta de vaga viva no evt-012, 7ª da fila no evt-002, presente
// no evt-009 e no evt-010 (histórico) e confirmada no evento em andamento.
// Os demais preenchem os contadores e as filas.
// ---------------------------------------------------------------------------

interface DescricaoParticipacao {
  idLegado: string;
  eventoLegado: string;
  usuarioLegado: string;
  status: StatusParticipacao;
  posicaoFila?: number;
  diasAtras: number;
}

const PARTICIPACOES: readonly DescricaoParticipacao[] = [
  // evt-001 — churrasco da turma, pago
  {
    idLegado: 'par-001',
    eventoLegado: 'evt-001',
    usuarioLegado: 'usr-001',
    status: 'CONFIRMADA',
    diasAtras: 4,
  },
  {
    idLegado: 'par-002',
    eventoLegado: 'evt-001',
    usuarioLegado: 'usr-008',
    status: 'CONFIRMADA',
    diasAtras: 5,
  },
  {
    idLegado: 'par-003',
    eventoLegado: 'evt-001',
    usuarioLegado: 'usr-004',
    status: 'CONFIRMADA',
    diasAtras: 5,
  },
  {
    idLegado: 'par-004',
    eventoLegado: 'evt-001',
    usuarioLegado: 'usr-012',
    status: 'PENDENTE_PAGAMENTO',
    diasAtras: 0,
  },
  {
    idLegado: 'par-005',
    eventoLegado: 'evt-001',
    usuarioLegado: 'usr-005',
    status: 'CANCELADA',
    diasAtras: 6,
  },

  // evt-002 — hackathon lotado, com fila de 7
  {
    idLegado: 'par-010',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-002',
    status: 'CONFIRMADA',
    diasAtras: 9,
  },
  {
    idLegado: 'par-011',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-008',
    status: 'CONFIRMADA',
    diasAtras: 9,
  },
  {
    idLegado: 'par-012',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-005',
    status: 'CONFIRMADA',
    diasAtras: 8,
  },
  {
    idLegado: 'par-020',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-006',
    status: 'LISTA_ESPERA',
    posicaoFila: 1,
    diasAtras: 3,
  },
  {
    idLegado: 'par-021',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-011',
    status: 'LISTA_ESPERA',
    posicaoFila: 2,
    diasAtras: 3,
  },
  {
    idLegado: 'par-022',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-012',
    status: 'LISTA_ESPERA',
    posicaoFila: 3,
    diasAtras: 2,
  },
  {
    idLegado: 'par-023',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-007',
    status: 'LISTA_ESPERA',
    posicaoFila: 4,
    diasAtras: 2,
  },
  {
    idLegado: 'par-024',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-003',
    status: 'LISTA_ESPERA',
    posicaoFila: 5,
    diasAtras: 1,
  },
  {
    idLegado: 'par-025',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-009',
    status: 'LISTA_ESPERA',
    posicaoFila: 6,
    diasAtras: 1,
  },
  {
    idLegado: 'par-026',
    eventoLegado: 'evt-002',
    usuarioLegado: 'usr-001',
    status: 'LISTA_ESPERA',
    posicaoFila: 7,
    diasAtras: 0,
  },

  // evt-003 — roda de conversa do curso
  {
    idLegado: 'par-030',
    eventoLegado: 'evt-003',
    usuarioLegado: 'usr-002',
    status: 'CONFIRMADA',
    diasAtras: 3,
  },
  {
    idLegado: 'par-031',
    eventoLegado: 'evt-003',
    usuarioLegado: 'usr-012',
    status: 'CONFIRMADA',
    diasAtras: 2,
  },

  // evt-004 — feira de carreiras
  {
    idLegado: 'par-040',
    eventoLegado: 'evt-004',
    usuarioLegado: 'usr-001',
    status: 'CONFIRMADA',
    diasAtras: 1,
  },
  {
    idLegado: 'par-041',
    eventoLegado: 'evt-004',
    usuarioLegado: 'usr-007',
    status: 'CONFIRMADA',
    diasAtras: 1,
  },

  // evt-005 — festa da Atlética, quase lotada
  {
    idLegado: 'par-050',
    eventoLegado: 'evt-005',
    usuarioLegado: 'usr-008',
    status: 'CONFIRMADA',
    diasAtras: 2,
  },
  {
    idLegado: 'par-051',
    eventoLegado: 'evt-005',
    usuarioLegado: 'usr-005',
    status: 'PENDENTE_PAGAMENTO',
    diasAtras: 0,
  },

  // evt-006 — workshop lotado, fila de 4
  {
    idLegado: 'par-060',
    eventoLegado: 'evt-006',
    usuarioLegado: 'usr-011',
    status: 'CONFIRMADA',
    diasAtras: 6,
  },
  {
    idLegado: 'par-061',
    eventoLegado: 'evt-006',
    usuarioLegado: 'usr-003',
    status: 'LISTA_ESPERA',
    posicaoFila: 1,
    diasAtras: 2,
  },
  {
    idLegado: 'par-062',
    eventoLegado: 'evt-006',
    usuarioLegado: 'usr-006',
    status: 'LISTA_ESPERA',
    posicaoFila: 2,
    diasAtras: 2,
  },
  {
    idLegado: 'par-063',
    eventoLegado: 'evt-006',
    usuarioLegado: 'usr-010',
    status: 'LISTA_ESPERA',
    posicaoFila: 3,
    diasAtras: 1,
  },
  {
    idLegado: 'par-064',
    eventoLegado: 'evt-006',
    usuarioLegado: 'usr-009',
    status: 'LISTA_ESPERA',
    posicaoFila: 4,
    diasAtras: 1,
  },

  // evt-007 — torneio
  {
    idLegado: 'par-070',
    eventoLegado: 'evt-007',
    usuarioLegado: 'usr-002',
    status: 'CONFIRMADA',
    diasAtras: 4,
  },
  {
    idLegado: 'par-071',
    eventoLegado: 'evt-007',
    usuarioLegado: 'usr-004',
    status: 'CONFIRMADA',
    diasAtras: 4,
  },

  // evt-005 — a inscrição de Marina aguardando pagamento, para a tela de
  // cobrança abrir com dado real em vez de exigir uma inscrição antes.
  // Fica em evt-005 (R$ 45) e não em evt-007 porque o teste de inscrição usa
  // evt-007 justamente como o evento em que Marina AINDA não está inscrita.
  {
    idLegado: 'par-052',
    eventoLegado: 'evt-005',
    usuarioLegado: 'usr-001',
    status: 'PENDENTE_PAGAMENTO',
    diasAtras: 0,
  },

  // evt-008 — cancelado: participações em cascata (RN-022)
  {
    idLegado: 'par-080',
    eventoLegado: 'evt-008',
    usuarioLegado: 'usr-007',
    status: 'CANCELADA',
    diasAtras: 7,
  },
  {
    idLegado: 'par-081',
    eventoLegado: 'evt-008',
    usuarioLegado: 'usr-012',
    status: 'CANCELADA',
    diasAtras: 7,
  },

  // evt-009 — realizado: presença e ausência
  {
    idLegado: 'par-090',
    eventoLegado: 'evt-009',
    usuarioLegado: 'usr-001',
    status: 'PRESENTE',
    diasAtras: 15,
  },
  {
    idLegado: 'par-091',
    eventoLegado: 'evt-009',
    usuarioLegado: 'usr-007',
    status: 'PRESENTE',
    diasAtras: 16,
  },
  {
    idLegado: 'par-092',
    eventoLegado: 'evt-009',
    usuarioLegado: 'usr-005',
    status: 'AUSENTE',
    diasAtras: 16,
  },

  // evt-010 — realizado
  {
    idLegado: 'par-100',
    eventoLegado: 'evt-010',
    usuarioLegado: 'usr-001',
    status: 'PRESENTE',
    diasAtras: 26,
  },
  {
    idLegado: 'par-101',
    eventoLegado: 'evt-010',
    usuarioLegado: 'usr-002',
    status: 'PRESENTE',
    diasAtras: 26,
  },

  /*
   * evt-012 — visita técnica lotada, com uma oferta de vaga EM CURSO.
   *
   * A história é a de RN-007 e RN-008: Gabriela desistiu (`par-121`), a vaga foi
   * oferecida ao primeiro da fila — Marina — e a oferta expira em 18 h,
   * calculadas a partir de agora. Caio continua na fila, na posição 1, porque
   * Marina saiu dela ao receber a oferta.
   *
   * A fila tem uma pessoa só porque a 3ESPX tem quatro alunos no seed e os
   * outros três já têm papel neste evento. Fila longa é demonstrada em evt-002,
   * que é de alcance FACULDADE e tem sete. Pôr aqui alguém de outra turma seria
   * criar participação fora de alcance.
   *
   * `ocupadas` continua 25: a vaga que Gabriela liberou é a que Marina segura
   * agora, e OFERTA_PENDENTE ocupa vaga (RN-004).
   *
   * Este bloco existe para que "vaga liberada → oferta com prazo → confirmação"
   * seja demonstrável abrindo o app, sem provocar um cancelamento antes.
   */
  {
    idLegado: 'par-120',
    eventoLegado: 'evt-012',
    usuarioLegado: 'usr-002',
    status: 'CONFIRMADA',
    diasAtras: 8,
  },
  {
    idLegado: 'par-121',
    eventoLegado: 'evt-012',
    usuarioLegado: 'usr-008',
    status: 'CANCELADA',
    diasAtras: 1,
  },
  {
    idLegado: 'par-122',
    eventoLegado: 'evt-012',
    usuarioLegado: 'usr-001',
    status: 'OFERTA_PENDENTE',
    diasAtras: 0,
  },
  {
    idLegado: 'par-123',
    eventoLegado: 'evt-012',
    usuarioLegado: 'usr-004',
    status: 'LISTA_ESPERA',
    posicaoFila: 1,
    diasAtras: 3,
  },

  /*
   * evt-013 — acontecendo agora, com a porta aberta.
   *
   * Três confirmados que ainda não entraram (é o que a lista `aguardando` do
   * painel mostra, com o código de 8 dígitos de cada um) e um que já entrou,
   * para a recusa por uso único (RN-018) ser demonstrável sem precisar validar
   * duas vezes na frente de quem avalia.
   *
   * `usr-002` organiza: é por ele que se entra no painel de check-in.
   */
  {
    idLegado: 'par-130',
    eventoLegado: 'evt-013',
    usuarioLegado: 'usr-001',
    status: 'CONFIRMADA',
    diasAtras: 3,
  },
  {
    idLegado: 'par-131',
    eventoLegado: 'evt-013',
    usuarioLegado: 'usr-004',
    status: 'CONFIRMADA',
    diasAtras: 3,
  },
  {
    idLegado: 'par-132',
    eventoLegado: 'evt-013',
    usuarioLegado: 'usr-008',
    status: 'CONFIRMADA',
    diasAtras: 2,
  },
  {
    idLegado: 'par-133',
    eventoLegado: 'evt-013',
    usuarioLegado: 'usr-002',
    status: 'PRESENTE',
    diasAtras: 4,
  },
];

// ---------------------------------------------------------------------------
// Pagamentos — só participações de evento pago
// ---------------------------------------------------------------------------

interface DescricaoPagamento {
  idLegado: string;
  participacaoLegado: string;
  metodo: MetodoPagamento;
  valor: number;
  status: StatusPagamento;
  transacaoExternaId: string;
  /** Instante de criação; `null` em `criadoHaMinutos` significa data absoluta. */
  criadoDiasAtras?: number;
  criadoHora?: number;
  criadoHaMinutos?: number;
  confirmadoMinutosDepois?: number;
  /**
   * O que sobra de um cartão depois do formulário (RNF-022). Ausente em Pix — o
   * `CHECK` recusa a linha se os três não forem nulos quando o método é Pix.
   */
  cartao?: { ultimosQuatro: string; bandeira: string; titular: string };
}

const PAGAMENTOS: readonly DescricaoPagamento[] = [
  {
    idLegado: 'pag-001',
    participacaoLegado: 'par-001',
    metodo: 'PIX',
    valor: 25,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8842',
    criadoDiasAtras: 4,
    criadoHora: 10,
    confirmadoMinutosDepois: 3,
  },
  {
    idLegado: 'pag-002',
    participacaoLegado: 'par-002',
    metodo: 'CARTAO_CREDITO',
    valor: 25,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8791',
    criadoDiasAtras: 5,
    criadoHora: 21,
    confirmadoMinutosDepois: 1,
    /*
     * A única linha do seed com dado de cartão, e ela é uma ADIÇÃO em relação ao
     * CP5 — o mock mantinha `resumosCartao: []` porque as três colunas viviam
     * fora do tipo `Pagamento` (a revisão de modelagem do CP5 apontou que o nome
     * do titular existia escondido do inventário LGPD).
     *
     * Agora as colunas estão declaradas e sob dois `CHECK`. Deixá-las nulas em
     * todo o seed manteria o caminho de cartão sem nenhum dado real e o formato
     * de `ultimos_quatro` nunca exercitado. Número e CVV continuam não existindo
     * — nem como coluna.
     */
    cartao: { ultimosQuatro: '4291', bandeira: 'Visa', titular: 'GABRIELA R ROCHA' },
  },
  {
    idLegado: 'pag-003',
    participacaoLegado: 'par-004',
    metodo: 'PIX',
    valor: 25,
    status: 'AGUARDANDO',
    transacaoExternaId: 'gw-9013',
    // Aberta 18 min atrás. É o que faz a janela de 60 min de RN-012 aparecer na
    // tela com 42 min restantes — número que o mock cravava e que aqui sai da
    // política, via `paymentDeadline`.
    criadoHaMinutos: 18,
  },
  {
    idLegado: 'pag-004',
    participacaoLegado: 'par-050',
    metodo: 'PIX',
    valor: 45,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8990',
    criadoDiasAtras: 2,
    criadoHora: 19,
    confirmadoMinutosDepois: 2,
  },
  {
    idLegado: 'pag-005',
    participacaoLegado: 'par-090',
    metodo: 'PIX',
    valor: 20,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8110',
    criadoDiasAtras: 15,
    criadoHora: 11,
    confirmadoMinutosDepois: 1,
  },
];

// ---------------------------------------------------------------------------
// Presenças — 1:1 com participação (RN-018)
// ---------------------------------------------------------------------------

interface DescricaoPresenca {
  idLegado: string;
  participacaoLegado: string;
  registradoPorLegado: string;
  metodo: MetodoCheckin;
  /** Uma das duas: horas a partir de agora, ou dia/hora/minuto absolutos. */
  horasDeAgora?: number;
  diasAtras?: number;
  hora?: number;
  minuto?: number;
}

const PRESENCAS: readonly DescricaoPresenca[] = [
  {
    idLegado: 'pre-010',
    participacaoLegado: 'par-133',
    registradoPorLegado: 'usr-002',
    metodo: 'QR_CODE',
    // Meia hora atrás: dentro do evento em andamento, e é o registro que faz a
    // segunda validação do mesmo ingresso ser recusada por RN-018.
    horasDeAgora: -0.5,
  },
  {
    idLegado: 'pre-001',
    participacaoLegado: 'par-090',
    registradoPorLegado: 'usr-007',
    metodo: 'QR_CODE',
    diasAtras: 10,
    hora: 12,
    minuto: 14,
  },
  {
    idLegado: 'pre-002',
    participacaoLegado: 'par-091',
    registradoPorLegado: 'usr-007',
    metodo: 'QR_CODE',
    diasAtras: 10,
    hora: 12,
    minuto: 6,
  },
  {
    idLegado: 'pre-003',
    participacaoLegado: 'par-100',
    registradoPorLegado: 'usr-010',
    metodo: 'QR_CODE',
    diasAtras: 22,
    hora: 9,
    minuto: 22,
  },
  {
    idLegado: 'pre-004',
    participacaoLegado: 'par-101',
    registradoPorLegado: 'usr-010',
    metodo: 'CODIGO_NUMERICO',
    diasAtras: 22,
    hora: 9,
    minuto: 31,
  },
];

// ---------------------------------------------------------------------------
// Feed — publicações de eventos já realizados, mais avisos dos organizadores
// ---------------------------------------------------------------------------

interface DescricaoPublicacao {
  idLegado: string;
  eventoLegado: string;
  autorLegado: string;
  legenda: string;
  imagemSeed: number;
  horasDeAgora?: number;
  diasAtras?: number;
  hora?: number;
}

const PUBLICACOES: readonly DescricaoPublicacao[] = [
  {
    idLegado: 'pub-001',
    eventoLegado: 'evt-010',
    autorLegado: 'usr-002',
    legenda:
      'Semana de recepção foi a melhor dos últimos anos. 412 pessoas passaram pelo campus em cinco dias. Quem tira a próxima foto no mural?',
    imagemSeed: 4,
    horasDeAgora: -2,
  },
  {
    idLegado: 'pub-002',
    eventoLegado: 'evt-004',
    autorLegado: 'usr-010',
    legenda:
      'Inscrições abertas para a Feira de Carreiras 2026.2 — 22 empresas confirmadas, 400 vagas. Corre lá em Eventos.',
    imagemSeed: 11,
    horasDeAgora: -5,
  },
  {
    idLegado: 'pub-003',
    eventoLegado: 'evt-009',
    autorLegado: 'usr-007',
    legenda:
      'Churrasco de boas-vindas da 1CCB: 31 dos 35 inscritos apareceram. Melhor número de comparecimento que a gente já teve.',
    imagemSeed: 18,
    diasAtras: 9,
    hora: 20,
  },
  {
    idLegado: 'pub-004',
    eventoLegado: 'evt-002',
    autorLegado: 'usr-004',
    legenda:
      'Hackathon lotou em quatro dias. Quem ficou de fora, entra na lista de espera: sempre abre vaga na semana do evento.',
    imagemSeed: 7,
    diasAtras: 3,
    hora: 15,
  },
  {
    idLegado: 'pub-005',
    eventoLegado: 'evt-010',
    autorLegado: 'usr-001',
    legenda: 'Tour pelo campus com a galera do primeiro semestre. Saudade já.',
    imagemSeed: 21,
    diasAtras: 21,
    hora: 18,
  },
  {
    idLegado: 'pub-006',
    eventoLegado: 'evt-005',
    autorLegado: 'usr-003',
    legenda:
      'Festa Junina Fora de Época: 287 de 300 ingressos vendidos. Quem ainda não garantiu, é agora.',
    imagemSeed: 9,
    diasAtras: 1,
    hora: 21,
  },
];

interface DescricaoComentario {
  idLegado: string;
  publicacaoLegado: string;
  autorLegado: string;
  texto: string;
  minutosDeAgora?: number;
  diasAtras?: number;
  hora?: number;
}

const COMENTARIOS: readonly DescricaoComentario[] = [
  {
    idLegado: 'com-001',
    publicacaoLegado: 'pub-001',
    autorLegado: 'usr-008',
    texto: 'A oficina de robótica foi o melhor momento, sem discussão.',
    minutosDeAgora: -90,
  },
  {
    idLegado: 'com-002',
    publicacaoLegado: 'pub-001',
    autorLegado: 'usr-005',
    texto: 'Ano que vem quero ajudar a organizar.',
    minutosDeAgora: -40,
  },
  {
    idLegado: 'com-003',
    publicacaoLegado: 'pub-002',
    autorLegado: 'usr-001',
    texto: 'Já me inscrevi. Alguém sabe se precisa levar currículo impresso mesmo?',
    minutosDeAgora: -180,
  },
  {
    idLegado: 'com-004',
    publicacaoLegado: 'pub-004',
    autorLegado: 'usr-006',
    texto: 'Sou a primeira da fila. Torcendo por uma desistência.',
    diasAtras: 3,
    hora: 16,
  },
];

// ---------------------------------------------------------------------------
// Notificações da Marina
// ---------------------------------------------------------------------------

interface DescricaoNotificacao {
  idLegado: string;
  destinatarioLegado: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  /** Id legado do objeto citado — sem FK de propósito (ver o schema). */
  referenciaLegado: string;
  lida: boolean;
  diasAtras: number;
  hora: number;
  minuto?: number;
}

const NOTIFICACOES: readonly DescricaoNotificacao[] = [
  {
    idLegado: 'not-001',
    destinatarioLegado: 'usr-001',
    tipo: 'PAGAMENTO_CONFIRMADO',
    titulo: 'Pagamento confirmado',
    mensagem: 'Sua inscrição no Churrasco de encerramento do semestre está confirmada.',
    // Aponta para a PARTICIPAÇÃO, não para o evento: quem lê este aviso quer
    // abrir o ingresso. É como o handler do webhook grava.
    referenciaLegado: 'par-001',
    lida: false,
    diasAtras: 4,
    hora: 10,
    minuto: 3,
  },
  {
    idLegado: 'not-002',
    destinatarioLegado: 'usr-001',
    tipo: 'NOVO_EVENTO',
    titulo: 'Novo evento no seu curso',
    mensagem: 'Roda de conversa: mercado de dados — 60 vagas, gratuito.',
    referenciaLegado: 'evt-003',
    lida: false,
    diasAtras: 3,
    hora: 9,
  },
  {
    idLegado: 'not-003',
    destinatarioLegado: 'usr-001',
    tipo: 'EVENTO_CANCELADO',
    titulo: 'Evento cancelado',
    mensagem:
      'Palestra: Carreira em Segurança da Informação foi cancelada. Motivo: palestrante indisponível.',
    referenciaLegado: 'evt-008',
    lida: true,
    diasAtras: 7,
    hora: 14,
  },
];

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/**
 * Os registros prontos para inserção, na ordem das chaves estrangeiras.
 *
 * Os tipos são os do Prisma (`*CreateManyInput`): é o que garante que um campo
 * renomeado no schema quebre a compilação deste arquivo, em vez de virar erro de
 * runtime na primeira execução do seed.
 */
export interface DadosDoSeed {
  faculdades: Prisma.FaculdadeCreateManyInput[];
  cursos: Prisma.CursoCreateManyInput[];
  turmas: Prisma.TurmaCreateManyInput[];
  usuarios: Prisma.UsuarioCreateManyInput[];
  eventos: Prisma.EventoCreateManyInput[];
  perguntas: Prisma.PerguntaCustomizadaCreateManyInput[];
  participacoes: Prisma.ParticipacaoCreateManyInput[];
  pagamentos: Prisma.PagamentoCreateManyInput[];
  presencas: Prisma.PresencaCreateManyInput[];
  /**
   * Vazio, como no CP5: o mock não guardava resposta de pergunta customizada, e
   * inventar respostas aqui seria criar dado que a demonstração do CP5 não tinha.
   * As respostas nascem quando alguém se inscreve no churrasco pela API.
   */
  respostas: Prisma.RespostaPerguntaCreateManyInput[];
  publicacoes: Prisma.PublicacaoCreateManyInput[];
  comentarios: Prisma.ComentarioCreateManyInput[];
  notificacoes: Prisma.NotificacaoCreateManyInput[];
}

export interface OpcoesDoSeed {
  /** Instante de referência de todas as datas relativas. */
  agora: Date;
  /**
   * Injetada em vez de importada: o seed de produção usa argon2, e o teste de
   * integração usa um hash barato — sem isso, cada execução da suíte pagaria
   * 13 derivações de chave só para popular o banco.
   */
  gerarHashDeSenha: (senhaEmClaro: string) => Promise<string>;
}

export async function construirDados(opcoes: OpcoesDoSeed): Promise<DadosDoSeed> {
  const { agora, gerarHashDeSenha } = opcoes;

  const faculdades: Prisma.FaculdadeCreateManyInput[] = [
    {
      id: uuidLegado(FACULDADE),
      nome: 'FIAP — Faculdade de Informática e Administração Paulista',
      sigla: 'FIAP',
      // Base de RN-002. É dado da instituição, não constante do código.
      dominiosEmail: ['fiap.com.br'],
      criadoEm: emDias(agora, -900, 8),
    },
  ];

  const cursos: Prisma.CursoCreateManyInput[] = CURSOS.map((c) => ({
    id: uuidLegado(c.idLegado),
    faculdadeId: uuidLegado(FACULDADE),
    nome: c.nome,
    codigo: c.codigo,
    duracaoSemestres: c.duracaoSemestres,
  }));

  const turmas: Prisma.TurmaCreateManyInput[] = TURMAS.map((t) => ({
    id: uuidLegado(t.idLegado),
    cursoId: uuidLegado(t.cursoLegado),
    nome: t.nome,
    periodo: PERIODO,
    codigoConvite: t.codigoConvite,
    codigoAtivo: true,
  }));

  const criadoEmDosUsuarios = emDias(agora, -300, 10);
  const usuarios: Prisma.UsuarioCreateManyInput[] = [];
  for (const u of USUARIOS) {
    usuarios.push({
      id: uuidLegado(u.idLegado),
      nome: u.nome,
      email: `${u.emailLocal}@fiap.com.br`,
      // Um hash por usuário, e portanto um salt por usuário: reaproveitar um
      // único hash para os 13 seria mais rápido e ensinaria o contrário do que
      // RNF-019 pede.
      senhaHash: await gerarHashDeSenha(SENHA_DEMO),
      avatarSeed: u.avatarSeed,
      faculdadeId: uuidLegado(FACULDADE),
      cursoId: u.cursoLegado === null ? null : uuidLegado(u.cursoLegado),
      turmaId: u.turmaLegado === null ? null : uuidLegado(u.turmaLegado),
      papeis: [...(u.papeis ?? ['ALUNO'])],
      emailVerificado: true,
      visivelEntreConfirmados: true,
      criadoEm: criadoEmDosUsuarios,
      // `@updatedAt` seria preenchido pelo Prisma com o relógio da inserção.
      // Fixar em `criadoEm` mantém duas execuções do seed comparáveis.
      atualizadoEm: criadoEmDosUsuarios,
    });
  }

  /** Datas de cada evento, reusadas pelas participações e pelos pagamentos. */
  const janelaDoEvento = new Map<string, { inicio: Date; fim: Date; prazoInscricao: Date }>();

  const eventos: Prisma.EventoCreateManyInput[] = EVENTOS.map((e) => {
    const inicio =
      e.inicioEmHorasDeAgora === undefined
        ? emDias(agora, e.diasDeHoje, e.hora, e.minuto ?? 0)
        : emHoras(agora, e.inicioEmHorasDeAgora);
    const fim = new Date(inicio.getTime() + e.duracaoHoras * MS_POR_HORA);

    // RN-009 e RN-010 — os dois prazos saem da política compartilhada, não de
    // um `-2h` escrito à mão aqui: o formulário do app sugere pelos mesmos
    // números, e duas fontes divergem na primeira mudança.
    const prazos = defaultDeadlines(inicio.toISOString());
    const prazoInscricao = new Date(prazos.prazoInscricao);
    const prazoCancelamento = new Date(prazos.prazoCancelamento);

    janelaDoEvento.set(e.idLegado, { inicio, fim, prazoInscricao });

    const criadoEm = emDias(agora, e.diasDeHoje - 20, 21);
    return {
      id: uuidLegado(e.idLegado),
      organizadorId: uuidLegado(e.organizadorLegado),
      titulo: e.titulo,
      descricao: e.descricao,
      alcance: e.alcance,
      // RN-001 — exatamente uma âncora, coerente com o alcance. O `CHECK`
      // composto da migration recusa qualquer outra combinação.
      turmaId: e.alcance === 'TURMA' ? uuidLegado(e.ancoraLegado) : null,
      cursoId: e.alcance === 'CURSO' ? uuidLegado(e.ancoraLegado) : null,
      faculdadeId: e.alcance === 'FACULDADE' ? uuidLegado(e.ancoraLegado) : null,
      inicio,
      fim,
      local: e.local,
      capacidade: e.capacidade,
      ocupadas: e.ocupadas,
      preco: e.preco,
      status: e.status,
      motivoCancelamento: e.motivoCancelamento ?? null,
      prazoInscricao,
      prazoCancelamento,
      capaSeed: e.capaSeed,
      criadoEm,
      atualizadoEm: criadoEm,
    };
  });

  const perguntas: Prisma.PerguntaCustomizadaCreateManyInput[] = PERGUNTAS.map((p) => ({
    id: uuidLegado(p.idLegado),
    eventoId: uuidLegado(p.eventoLegado),
    enunciado: p.enunciado,
    tipo: p.tipo,
    opcoes: [...p.opcoes],
    obrigatoria: p.obrigatoria,
    ordem: p.ordem,
  }));

  const statusDoEvento = new Map(EVENTOS.map((e) => [e.idLegado, e.status]));
  const precoDoEvento = new Map(EVENTOS.map((e) => [e.idLegado, e.preco]));

  const participacoes: Prisma.ParticipacaoCreateManyInput[] = PARTICIPACOES.map((p) => {
    const criadoEm = emDias(agora, -p.diasAtras, 10);
    const janela = janelaDoEvento.get(p.eventoLegado);
    if (!janela) {
      throw new Error(`${p.idLegado} referencia evento inexistente: ${p.eventoLegado}`);
    }
    const eventoParaPrazo = {
      inicio: janela.inicio.toISOString(),
      prazoInscricao: janela.prazoInscricao.toISOString(),
    };

    /*
     * RN-012 — a janela de 60 min do pagamento, truncada pelo prazo de
     * inscrição e pelo início. Calculada a partir de "18 min atrás" para que a
     * tela abra com 42 min restantes, como no CP5, sem repetir o número: quem
     * muda `PAYMENT_WINDOW_MINUTES` muda o seed junto.
     */
    const pagamentoExpiraEm =
      p.status === 'PENDENTE_PAGAMENTO'
        ? new Date(paymentDeadline(eventoParaPrazo, new Date(agora.getTime() - 18 * 60_000)))
        : null;

    /*
     * RN-007 e RN-008 — a janela de 24 h da oferta, truncada para `inicio - 1h`.
     * Ancorada em "6 h atrás" para restarem 18 h, também como no CP5. Estar
     * sempre viva é o que torna a confirmação demonstrável em qualquer data.
     */
    const ofertaExpiraEm =
      p.status === 'OFERTA_PENDENTE'
        ? new Date(
            offerDeadline(
              { inicio: janela.inicio.toISOString() },
              new Date(agora.getTime() - 6 * MS_POR_HORA),
            ).expiresAt,
          )
        : null;

    let motivoCancelamento: MotivoCancelamento | null = null;
    if (p.status === 'CANCELADA') {
      motivoCancelamento =
        statusDoEvento.get(p.eventoLegado) === 'CANCELADO' ? 'EVENTO_CANCELADO' : 'ALUNO_DESISTIU';
    }

    /*
     * RN-013 — a política de reembolso congelada no instante do pagamento. Só
     * existe onde houve pagamento: evento pago e vaga que se manteve.
     */
    const ehVagaPaga =
      (precoDoEvento.get(p.eventoLegado) ?? 0) > 0 &&
      (p.status === 'CONFIRMADA' || p.status === 'PRESENTE');
    const politicaVigente: Prisma.InputJsonValue | typeof Prisma.DbNull = ehVagaPaga
      ? {
          reembolsoIntegralDiasAntes: POLICY.FULL_REFUND_DAYS_BEFORE,
          reembolsoParcialHorasAntes: POLICY.PARTIAL_REFUND_HOURS_BEFORE,
          reembolsoParcialTaxa: POLICY.PARTIAL_REFUND_RATE,
          congeladaEm: criadoEm.toISOString(),
        }
      : Prisma.DbNull;

    return {
      id: uuidLegado(p.idLegado),
      eventoId: uuidLegado(p.eventoLegado),
      usuarioId: uuidLegado(p.usuarioLegado),
      status: p.status,
      posicaoFila: p.posicaoFila ?? null,
      pagamentoExpiraEm,
      ofertaExpiraEm,
      motivoCancelamento,
      canceladaAposPrazo: false,
      politicaVigente,
      criadoEm,
      atualizadoEm: criadoEm,
    };
  });

  const pagamentos: Prisma.PagamentoCreateManyInput[] = PAGAMENTOS.map((g) => {
    const criadoEm =
      g.criadoHaMinutos !== undefined
        ? new Date(agora.getTime() - g.criadoHaMinutos * 60_000)
        : emDias(agora, -(g.criadoDiasAtras ?? 0), g.criadoHora ?? 0);
    const confirmadoEm =
      g.confirmadoMinutosDepois === undefined
        ? null
        : new Date(criadoEm.getTime() + g.confirmadoMinutosDepois * 60_000);

    return {
      id: uuidLegado(g.idLegado),
      participacaoId: uuidLegado(g.participacaoLegado),
      metodo: g.metodo,
      valor: g.valor,
      valorReembolsado: 0,
      status: g.status,
      transacaoExternaId: g.transacaoExternaId,
      // RN-014 — o `UNIQUE` desta coluna é o que faz a idempotência do webhook
      // ser garantia do banco. A chave repete a do CP5.
      chaveIdempotencia: `pay:${g.participacaoLegado}:${g.transacaoExternaId}`,
      ultimosQuatro: g.cartao?.ultimosQuatro ?? null,
      bandeiraCartao: g.cartao?.bandeira ?? null,
      titularCartao: g.cartao?.titular ?? null,
      criadoEm,
      confirmadoEm,
    };
  });

  const presencas: Prisma.PresencaCreateManyInput[] = PRESENCAS.map((p) => ({
    id: uuidLegado(p.idLegado),
    participacaoId: uuidLegado(p.participacaoLegado),
    registradoPorId: uuidLegado(p.registradoPorLegado),
    metodo: p.metodo,
    checkinEm:
      p.horasDeAgora !== undefined
        ? emHoras(agora, p.horasDeAgora)
        : emDias(agora, -(p.diasAtras ?? 0), p.hora ?? 0, p.minuto ?? 0),
    motivoCorrecao: null,
    sincronizado: true,
  }));

  const publicacoes: Prisma.PublicacaoCreateManyInput[] = PUBLICACOES.map((p) => ({
    id: uuidLegado(p.idLegado),
    eventoId: uuidLegado(p.eventoLegado),
    autorId: uuidLegado(p.autorLegado),
    legenda: p.legenda,
    imagemSeed: p.imagemSeed,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm:
      p.horasDeAgora !== undefined
        ? emHoras(agora, p.horasDeAgora)
        : emDias(agora, -(p.diasAtras ?? 0), p.hora ?? 0),
  }));

  const comentarios: Prisma.ComentarioCreateManyInput[] = COMENTARIOS.map((c) => ({
    id: uuidLegado(c.idLegado),
    publicacaoId: uuidLegado(c.publicacaoLegado),
    autorId: uuidLegado(c.autorLegado),
    texto: c.texto,
    removido: false,
    criadoEm:
      c.minutosDeAgora !== undefined
        ? new Date(agora.getTime() + c.minutosDeAgora * 60_000)
        : emDias(agora, -(c.diasAtras ?? 0), c.hora ?? 0),
  }));

  const notificacoes: Prisma.NotificacaoCreateManyInput[] = NOTIFICACOES.map((n) => ({
    id: uuidLegado(n.idLegado),
    destinatarioId: uuidLegado(n.destinatarioLegado),
    tipo: n.tipo,
    titulo: n.titulo,
    mensagem: n.mensagem,
    referenciaId: uuidLegado(n.referenciaLegado),
    lida: n.lida,
    criadoEm: emDias(agora, -n.diasAtras, n.hora, n.minuto ?? 0),
  }));

  return {
    faculdades,
    cursos,
    turmas,
    usuarios,
    eventos,
    perguntas,
    participacoes,
    pagamentos,
    presencas,
    respostas: [],
    publicacoes,
    comentarios,
    notificacoes,
  };
}
