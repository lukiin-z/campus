import type {
  Comentario,
  Curso,
  Evento,
  Faculdade,
  Pagamento,
  Participacao,
  PerguntaCustomizada,
  Presenca,
  Publicacao,
  Notificacao,
  Turma,
  Usuario,
} from '../types/domain';
import { POLICY } from '../domain/policy';

/**
 * Seed do Campus — os MESMOS dados usados no protótipo Figma, no styleguide e nos
 * slides do vídeo. Nada de "Lorem ipsum" nem de "Evento X".
 *
 * As datas são calculadas a partir de HOJE, com deslocamentos fixos, para que o
 * app continue vivo (evento futuro, prazo aberto, fila ativa) em qualquer dia em
 * que for aberto. Na data da entrega do CP4 — 01/09/2026 — os deslocamentos caem
 * exatamente nas datas documentadas:
 *
 *   +11 dias → 12/09/2026 (evt-001)   +14 → 15/09 (evt-006)
 *   +17      → 18/09/2026 (evt-002)   +23 → 24/09 (evt-003)
 *   +26      → 27/09/2026 (evt-007)   +30 → 01/10 (evt-004)
 *   +32      → 03/10/2026 (evt-011)   +35 → 06/10 (evt-008)
 *   +39      → 10/10/2026 (evt-005)   -10 → 22/08 (evt-009)
 *   -22      → 10/08/2026 (evt-010)
 */

const HOJE = startOfToday();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Deslocamento em dias a partir de hoje, com hora e minuto explícitos. */
function at(dias: number, hora: number, minuto = 0): string {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

function hoursBefore(iso: string, horas: number): string {
  return new Date(new Date(iso).getTime() - horas * 3_600_000).toISOString();
}

// ---------------------------------------------------------------------------
// Estrutura acadêmica — 1 faculdade, 3 cursos, 4 turmas
// ---------------------------------------------------------------------------

export const faculdade: Faculdade = {
  id: 'fac-001',
  nome: 'FIAP — Faculdade de Informática e Administração Paulista',
  sigla: 'FIAP',
  dominiosEmail: ['fiap.com.br'],
  criadoEm: at(-900, 8),
};

export const cursos: Curso[] = [
  {
    id: 'cur-001',
    faculdadeId: 'fac-001',
    nome: 'Engenharia de Computação',
    codigo: 'ECOMP',
    duracaoSemestres: 10,
  },
  {
    id: 'cur-002',
    faculdadeId: 'fac-001',
    nome: 'Sistemas de Informação',
    codigo: 'SI',
    duracaoSemestres: 8,
  },
  {
    id: 'cur-003',
    faculdadeId: 'fac-001',
    nome: 'Ciência da Computação',
    codigo: 'CC',
    duracaoSemestres: 8,
  },
];

export const turmas: Turma[] = [
  {
    id: 'tur-001',
    cursoId: 'cur-001',
    nome: '3ESPX',
    periodo: '2026.1',
    codigoConvite: '3ESPX-26',
    codigoAtivo: true,
  },
  {
    id: 'tur-002',
    cursoId: 'cur-001',
    nome: '2ESPA',
    periodo: '2026.1',
    codigoConvite: '2ESPA-26',
    codigoAtivo: true,
  },
  {
    id: 'tur-003',
    cursoId: 'cur-002',
    nome: '4SIA',
    periodo: '2026.1',
    codigoConvite: '4SIA-26',
    codigoAtivo: true,
  },
  {
    id: 'tur-004',
    cursoId: 'cur-003',
    nome: '1CCB',
    periodo: '2026.1',
    codigoConvite: '1CCB-26',
    codigoAtivo: true,
  },
];

// ---------------------------------------------------------------------------
// Usuários — 12, cobrindo as 3 personas e os 2 papéis administrativos
// ---------------------------------------------------------------------------

function aluno(
  id: string,
  nome: string,
  emailLocal: string,
  turmaId: string,
  cursoId: string,
  avatarSeed: number,
  papeis: Usuario['papeis'] = ['ALUNO'],
): Usuario {
  return {
    id,
    nome,
    email: `${emailLocal}@fiap.com.br`,
    avatarSeed,
    faculdadeId: 'fac-001',
    cursoId,
    turmaId,
    papeis,
    emailVerificado: true,
    visivelEntreConfirmados: true,
    criadoEm: at(-300, 10),
  };
}

export const usuarios: Usuario[] = [
  // Persona 1 — participante. É o usuário autenticado do protótipo.
  aluno('usr-001', 'Marina Alves', 'marina.alves', 'tur-001', 'cur-001', 1),
  // Persona 2 — organizador, representante da turma 3ESPX.
  aluno('usr-002', 'Rafael Souza', 'rafael.souza', 'tur-001', 'cur-001', 2),
  // Persona 3 — diretora de eventos da Atlética.
  aluno('usr-003', 'Beatriz Nakamura', 'beatriz.nakamura', 'tur-003', 'cur-002', 3),
  aluno('usr-004', 'Caio Ferreira', 'caio.ferreira', 'tur-001', 'cur-001', 4),
  aluno('usr-005', 'Diego Martins', 'diego.martins', 'tur-002', 'cur-001', 5),
  aluno('usr-006', 'Elisa Prado', 'elisa.prado', 'tur-003', 'cur-002', 6),
  aluno('usr-007', 'Felipe Antunes', 'felipe.antunes', 'tur-004', 'cur-003', 7),
  aluno('usr-008', 'Gabriela Rocha', 'gabriela.rocha', 'tur-001', 'cur-001', 8),
  aluno('usr-009', 'Henrique Lima', 'henrique.lima', 'tur-002', 'cur-001', 9, [
    'ALUNO',
    'ADMIN_CURSO',
  ]),
  aluno('usr-010', 'Isabela Duarte', 'isabela.duarte', 'tur-003', 'cur-002', 10, [
    'ALUNO',
    'ADMIN_FACULDADE',
  ]),
  aluno('usr-011', 'João Pedro Alencar', 'joao.alencar', 'tur-003', 'cur-002', 11),
  aluno('usr-012', 'Karen Yamada', 'karen.yamada', 'tur-002', 'cur-001', 12),
];

/** Usuário autenticado no protótipo (o login é simulado no CP5). */
export const USUARIO_ATUAL_ID = 'usr-001';

// ---------------------------------------------------------------------------
// Eventos — 11, com estados variados: lotado, gratuito, pago, cancelado,
// realizado, rascunho e com lista de espera ativa
// ---------------------------------------------------------------------------

interface SeedEvento {
  id: string;
  organizadorId: string;
  titulo: string;
  descricao: string;
  alcance: Evento['alcance'];
  ancora: string;
  diasDeHoje: number;
  hora: number;
  minuto?: number;
  duracaoHoras: number;
  local: string;
  capacidade: number;
  ocupadas: number;
  preco: number;
  status: Evento['status'];
  motivoCancelamento?: string;
  capaSeed: number;
}

const seedEventos: SeedEvento[] = [
  {
    id: 'evt-001',
    organizadorId: 'usr-002',
    titulo: 'Churrasco de encerramento do semestre',
    descricao:
      'Churrasco da 3ESPX para fechar o semestre. Carne, bebida e caixa de som por conta do rateio — R$ 25 por pessoa, pago no app. Traga acompanhante avisando na pergunta da inscrição. Quem tem restrição alimentar, avise até quinta que a gente resolve.',
    alcance: 'TURMA',
    ancora: 'tur-001',
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
    id: 'evt-002',
    organizadorId: 'usr-004',
    titulo: 'Hackathon Campus 48h',
    descricao:
      '48 horas de imersão em desenvolvimento, com mentoria de empresas parceiras e premiação para as três melhores equipes. Equipes de 3 a 5 pessoas, tema divulgado na abertura. Traga notebook, extensão e disposição. Alimentação inclusa nos três dias.',
    alcance: 'FACULDADE',
    ancora: 'fac-001',
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
    id: 'evt-003',
    organizadorId: 'usr-008',
    titulo: 'Roda de conversa: mercado de dados',
    descricao:
      'Conversa aberta com três ex-alunos que hoje trabalham com engenharia de dados, analytics e machine learning. Sem apresentação de slides: só perguntas da turma. Traga a sua.',
    alcance: 'CURSO',
    ancora: 'cur-001',
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
    id: 'evt-004',
    organizadorId: 'usr-010',
    titulo: 'Feira de Carreiras 2026.2',
    descricao:
      'Vinte e duas empresas com vagas de estágio e trainee, mais quatro palestras curtas sobre processo seletivo. Leve currículo impresso: ainda funciona. Entrada por ordem de check-in.',
    alcance: 'FACULDADE',
    ancora: 'fac-001',
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
    id: 'evt-005',
    organizadorId: 'usr-003',
    titulo: 'Festa Junina Fora de Época',
    descricao:
      'A festa junina da Atlética, em outubro, porque em junho estava todo mundo em prova. Quadrilha, comida típica e banda ao vivo. R$ 45 com uma bebida inclusa. Ingresso não transferível: o check-in é por QR Code no seu nome.',
    alcance: 'FACULDADE',
    ancora: 'fac-001',
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
    id: 'evt-006',
    organizadorId: 'usr-006',
    titulo: 'Workshop de Git e GitHub',
    descricao:
      'Do zero ao pull request: branch, commit, merge, resolução de conflito e revisão de código. Prático, com máquina do laboratório. Não precisa saber nada antes.',
    alcance: 'CURSO',
    ancora: 'cur-002',
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
    id: 'evt-007',
    organizadorId: 'usr-003',
    titulo: 'Torneio de Futsal Interturmas',
    descricao:
      'Doze times, chaves de quatro, jogos de 2×10 minutos. Inscrição por pessoa, R$ 15, revertida em arbitragem e troféu. Formação dos times no dia, por turma. Leve caneleira.',
    alcance: 'FACULDADE',
    ancora: 'fac-001',
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
    id: 'evt-008',
    organizadorId: 'usr-007',
    titulo: 'Palestra: Carreira em Segurança da Informação',
    descricao:
      'Painel sobre carreira em segurança ofensiva e defensiva, com profissionais de resposta a incidente e de teste de intrusão.',
    alcance: 'CURSO',
    ancora: 'cur-003',
    diasDeHoje: 35,
    hora: 19,
    duracaoHoras: 2,
    local: 'Auditório A',
    capacidade: 100,
    ocupadas: 34,
    preco: 0,
    status: 'CANCELADO',
    motivoCancelamento:
      'A palestrante principal ficou indisponível na data. Vamos remarcar para novembro e avisar por aqui.',
    capaSeed: 8,
  },
  {
    id: 'evt-009',
    organizadorId: 'usr-007',
    titulo: 'Churrasco de boas-vindas 1CCB',
    descricao:
      'Primeiro encontro da 1CCB fora da sala. Rateio de R$ 20, churrasco na área de convivência.',
    alcance: 'TURMA',
    ancora: 'tur-004',
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
    id: 'evt-010',
    organizadorId: 'usr-010',
    titulo: 'Semana de Recepção 2026.2',
    descricao:
      'Cinco dias de recepção aos calouros: tour pelo campus, apresentação das entidades, oficinas e festa de encerramento.',
    alcance: 'FACULDADE',
    ancora: 'fac-001',
    diasDeHoje: -22,
    hora: 9,
    duracaoHoras: 100,
    local: 'Campus Paulista',
    capacidade: 500,
    ocupadas: 412,
    preco: 0,
    status: 'REALIZADO',
    capaSeed: 6,
  },
  {
    id: 'evt-011',
    organizadorId: 'usr-002',
    titulo: 'Sarau de fim de semestre',
    descricao:
      'Ideia: noite de música e poesia da 3ESPX. Falta definir se vai ter som amplificado e quanto custa o espaço.',
    alcance: 'TURMA',
    ancora: 'tur-001',
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
];

export const eventos: Evento[] = seedEventos.map((s) => {
  const inicio = at(s.diasDeHoje, s.hora, s.minuto ?? 0);
  const fim = new Date(new Date(inicio).getTime() + s.duracaoHoras * 3_600_000).toISOString();
  return {
    id: s.id,
    organizadorId: s.organizadorId,
    titulo: s.titulo,
    descricao: s.descricao,
    alcance: s.alcance,
    turmaId: s.alcance === 'TURMA' ? s.ancora : null,
    cursoId: s.alcance === 'CURSO' ? s.ancora : null,
    faculdadeId: s.alcance === 'FACULDADE' ? s.ancora : null,
    inicio,
    fim,
    local: s.local,
    capacidade: s.capacidade,
    ocupadas: s.ocupadas,
    preco: s.preco,
    status: s.status,
    motivoCancelamento: s.motivoCancelamento ?? null,
    prazoInscricao: hoursBefore(inicio, POLICY.DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE),
    prazoCancelamento: hoursBefore(inicio, POLICY.DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE),
    capaSeed: s.capaSeed,
    criadoEm: at(s.diasDeHoje - 20, 21),
  };
});

// ---------------------------------------------------------------------------
// Perguntas customizadas — só o churrasco tem (RN-025, máx. 5)
// ---------------------------------------------------------------------------

export const perguntas: PerguntaCustomizada[] = [
  {
    id: 'per-001',
    eventoId: 'evt-001',
    enunciado: 'Vai levar acompanhante?',
    tipo: 'ESCOLHA_UNICA',
    opcoes: ['Não', 'Sim, uma pessoa'],
    obrigatoria: true,
    ordem: 1,
  },
  {
    id: 'per-002',
    eventoId: 'evt-001',
    enunciado: 'Alguma restrição alimentar?',
    tipo: 'TEXTO_CURTO',
    opcoes: null,
    obrigatoria: false,
    ordem: 2,
  },
];

// ---------------------------------------------------------------------------
// Participações
//
// Marina (usr-001): confirmada e paga no evt-001, 7ª da fila no evt-002,
// presente no evt-009 (histórico). Os demais preenchem os contadores e a fila.
// ---------------------------------------------------------------------------

interface SeedParticipacao {
  id: string;
  eventoId: string;
  usuarioId: string;
  status: Participacao['status'];
  posicaoFila?: number;
  diasAtras: number;
}

const seedParticipacoes: SeedParticipacao[] = [
  // evt-001 — churrasco da turma, pago
  { id: 'par-001', eventoId: 'evt-001', usuarioId: 'usr-001', status: 'CONFIRMADA', diasAtras: 4 },
  { id: 'par-002', eventoId: 'evt-001', usuarioId: 'usr-008', status: 'CONFIRMADA', diasAtras: 5 },
  { id: 'par-003', eventoId: 'evt-001', usuarioId: 'usr-004', status: 'CONFIRMADA', diasAtras: 5 },
  {
    id: 'par-004',
    eventoId: 'evt-001',
    usuarioId: 'usr-012',
    status: 'PENDENTE_PAGAMENTO',
    diasAtras: 0,
  },
  { id: 'par-005', eventoId: 'evt-001', usuarioId: 'usr-005', status: 'CANCELADA', diasAtras: 6 },

  // evt-002 — hackathon lotado, com fila de 7
  { id: 'par-010', eventoId: 'evt-002', usuarioId: 'usr-002', status: 'CONFIRMADA', diasAtras: 9 },
  { id: 'par-011', eventoId: 'evt-002', usuarioId: 'usr-008', status: 'CONFIRMADA', diasAtras: 9 },
  { id: 'par-012', eventoId: 'evt-002', usuarioId: 'usr-005', status: 'CONFIRMADA', diasAtras: 8 },
  {
    id: 'par-020',
    eventoId: 'evt-002',
    usuarioId: 'usr-006',
    status: 'LISTA_ESPERA',
    posicaoFila: 1,
    diasAtras: 3,
  },
  {
    id: 'par-021',
    eventoId: 'evt-002',
    usuarioId: 'usr-011',
    status: 'LISTA_ESPERA',
    posicaoFila: 2,
    diasAtras: 3,
  },
  {
    id: 'par-022',
    eventoId: 'evt-002',
    usuarioId: 'usr-012',
    status: 'LISTA_ESPERA',
    posicaoFila: 3,
    diasAtras: 2,
  },
  {
    id: 'par-023',
    eventoId: 'evt-002',
    usuarioId: 'usr-007',
    status: 'LISTA_ESPERA',
    posicaoFila: 4,
    diasAtras: 2,
  },
  {
    id: 'par-024',
    eventoId: 'evt-002',
    usuarioId: 'usr-003',
    status: 'LISTA_ESPERA',
    posicaoFila: 5,
    diasAtras: 1,
  },
  {
    id: 'par-025',
    eventoId: 'evt-002',
    usuarioId: 'usr-009',
    status: 'LISTA_ESPERA',
    posicaoFila: 6,
    diasAtras: 1,
  },
  {
    id: 'par-026',
    eventoId: 'evt-002',
    usuarioId: 'usr-001',
    status: 'LISTA_ESPERA',
    posicaoFila: 7,
    diasAtras: 0,
  },

  // evt-003 — roda de conversa do curso
  { id: 'par-030', eventoId: 'evt-003', usuarioId: 'usr-002', status: 'CONFIRMADA', diasAtras: 3 },
  { id: 'par-031', eventoId: 'evt-003', usuarioId: 'usr-012', status: 'CONFIRMADA', diasAtras: 2 },

  // evt-004 — feira de carreiras
  { id: 'par-040', eventoId: 'evt-004', usuarioId: 'usr-001', status: 'CONFIRMADA', diasAtras: 1 },
  { id: 'par-041', eventoId: 'evt-004', usuarioId: 'usr-007', status: 'CONFIRMADA', diasAtras: 1 },

  // evt-005 — festa da Atlética, quase lotada
  { id: 'par-050', eventoId: 'evt-005', usuarioId: 'usr-008', status: 'CONFIRMADA', diasAtras: 2 },
  {
    id: 'par-051',
    eventoId: 'evt-005',
    usuarioId: 'usr-005',
    status: 'PENDENTE_PAGAMENTO',
    diasAtras: 0,
  },

  // evt-006 — workshop lotado, fila de 4
  { id: 'par-060', eventoId: 'evt-006', usuarioId: 'usr-011', status: 'CONFIRMADA', diasAtras: 6 },
  {
    id: 'par-061',
    eventoId: 'evt-006',
    usuarioId: 'usr-003',
    status: 'LISTA_ESPERA',
    posicaoFila: 1,
    diasAtras: 2,
  },
  {
    id: 'par-062',
    eventoId: 'evt-006',
    usuarioId: 'usr-006',
    status: 'LISTA_ESPERA',
    posicaoFila: 2,
    diasAtras: 2,
  },
  {
    id: 'par-063',
    eventoId: 'evt-006',
    usuarioId: 'usr-010',
    status: 'LISTA_ESPERA',
    posicaoFila: 3,
    diasAtras: 1,
  },
  {
    id: 'par-064',
    eventoId: 'evt-006',
    usuarioId: 'usr-009',
    status: 'LISTA_ESPERA',
    posicaoFila: 4,
    diasAtras: 1,
  },

  // evt-007 — torneio
  { id: 'par-070', eventoId: 'evt-007', usuarioId: 'usr-002', status: 'CONFIRMADA', diasAtras: 4 },
  { id: 'par-071', eventoId: 'evt-007', usuarioId: 'usr-004', status: 'CONFIRMADA', diasAtras: 4 },

  // evt-008 — cancelado: participações em cascata (RN-022)
  {
    id: 'par-080',
    eventoId: 'evt-008',
    usuarioId: 'usr-007',
    status: 'CANCELADA',
    diasAtras: 7,
  },
  {
    id: 'par-081',
    eventoId: 'evt-008',
    usuarioId: 'usr-012',
    status: 'CANCELADA',
    diasAtras: 7,
  },

  // evt-009 — realizado: presença e ausência
  { id: 'par-090', eventoId: 'evt-009', usuarioId: 'usr-001', status: 'PRESENTE', diasAtras: 15 },
  { id: 'par-091', eventoId: 'evt-009', usuarioId: 'usr-007', status: 'PRESENTE', diasAtras: 16 },
  { id: 'par-092', eventoId: 'evt-009', usuarioId: 'usr-005', status: 'AUSENTE', diasAtras: 16 },

  // evt-010 — realizado
  { id: 'par-100', eventoId: 'evt-010', usuarioId: 'usr-001', status: 'PRESENTE', diasAtras: 26 },
  { id: 'par-101', eventoId: 'evt-010', usuarioId: 'usr-002', status: 'PRESENTE', diasAtras: 26 },
];

export const participacoes: Participacao[] = seedParticipacoes.map((s) => {
  const criadoEm = at(-s.diasAtras, 10);
  const evento = eventos.find((e) => e.id === s.eventoId);
  return {
    id: s.id,
    eventoId: s.eventoId,
    usuarioId: s.usuarioId,
    status: s.status,
    posicaoFila: s.posicaoFila ?? null,
    pagamentoExpiraEm:
      s.status === 'PENDENTE_PAGAMENTO' ? new Date(Date.now() + 42 * 60_000).toISOString() : null,
    ofertaExpiraEm: null,
    motivoCancelamento:
      s.status === 'CANCELADA'
        ? evento?.status === 'CANCELADO'
          ? 'EVENTO_CANCELADO'
          : 'ALUNO_DESISTIU'
        : null,
    canceladaAposPrazo: false,
    politicaVigente:
      evento && evento.preco > 0 && (s.status === 'CONFIRMADA' || s.status === 'PRESENTE')
        ? {
            reembolsoIntegralDiasAntes: POLICY.FULL_REFUND_DAYS_BEFORE,
            reembolsoParcialHorasAntes: POLICY.PARTIAL_REFUND_HOURS_BEFORE,
            reembolsoParcialTaxa: POLICY.PARTIAL_REFUND_RATE,
            congeladaEm: criadoEm,
          }
        : null,
    criadoEm,
    atualizadoEm: criadoEm,
  };
});

// ---------------------------------------------------------------------------
// Pagamentos — só participações de evento pago
// ---------------------------------------------------------------------------

export const pagamentos: Pagamento[] = [
  {
    id: 'pag-001',
    participacaoId: 'par-001',
    metodo: 'PIX',
    valor: 25,
    valorReembolsado: 0,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8842',
    chaveIdempotencia: 'pay:par-001:gw-8842',
    criadoEm: at(-4, 10),
    confirmadoEm: at(-4, 10, 3),
  },
  {
    id: 'pag-002',
    participacaoId: 'par-002',
    metodo: 'CARTAO_CREDITO',
    valor: 25,
    valorReembolsado: 0,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8791',
    chaveIdempotencia: 'pay:par-002:gw-8791',
    criadoEm: at(-5, 21),
    confirmadoEm: at(-5, 21, 1),
  },
  {
    id: 'pag-003',
    participacaoId: 'par-004',
    metodo: 'PIX',
    valor: 25,
    valorReembolsado: 0,
    status: 'AGUARDANDO',
    transacaoExternaId: 'gw-9013',
    chaveIdempotencia: 'pay:par-004:gw-9013',
    criadoEm: new Date(Date.now() - 18 * 60_000).toISOString(),
    confirmadoEm: null,
  },
  {
    id: 'pag-004',
    participacaoId: 'par-050',
    metodo: 'PIX',
    valor: 45,
    valorReembolsado: 0,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8990',
    chaveIdempotencia: 'pay:par-050:gw-8990',
    criadoEm: at(-2, 19),
    confirmadoEm: at(-2, 19, 2),
  },
  {
    id: 'pag-005',
    participacaoId: 'par-090',
    metodo: 'PIX',
    valor: 20,
    valorReembolsado: 0,
    status: 'CONFIRMADO',
    transacaoExternaId: 'gw-8110',
    chaveIdempotencia: 'pay:par-090:gw-8110',
    criadoEm: at(-15, 11),
    confirmadoEm: at(-15, 11, 1),
  },
];

// ---------------------------------------------------------------------------
// Presenças — 1:1 com participação (RN-018)
// ---------------------------------------------------------------------------

export const presencas: Presenca[] = [
  {
    id: 'pre-001',
    participacaoId: 'par-090',
    registradoPorId: 'usr-007',
    metodo: 'QR_CODE',
    checkinEm: at(-10, 12, 14),
    motivoCorrecao: null,
    sincronizado: true,
  },
  {
    id: 'pre-002',
    participacaoId: 'par-091',
    registradoPorId: 'usr-007',
    metodo: 'QR_CODE',
    checkinEm: at(-10, 12, 6),
    motivoCorrecao: null,
    sincronizado: true,
  },
  {
    id: 'pre-003',
    participacaoId: 'par-100',
    registradoPorId: 'usr-010',
    metodo: 'QR_CODE',
    checkinEm: at(-22, 9, 22),
    motivoCorrecao: null,
    sincronizado: true,
  },
  {
    id: 'pre-004',
    participacaoId: 'par-101',
    registradoPorId: 'usr-010',
    metodo: 'CODIGO_NUMERICO',
    checkinEm: at(-22, 9, 31),
    motivoCorrecao: null,
    sincronizado: true,
  },
];

// ---------------------------------------------------------------------------
// Feed — publicações de eventos já realizados, mais avisos dos organizadores
// ---------------------------------------------------------------------------

export const publicacoes: Publicacao[] = [
  {
    id: 'pub-001',
    eventoId: 'evt-010',
    autorId: 'usr-002',
    legenda:
      'Semana de recepção foi a melhor dos últimos anos. 412 pessoas passaram pelo campus em cinco dias. Quem tira a próxima foto no mural?',
    imagemSeed: 4,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: 'pub-002',
    eventoId: 'evt-004',
    autorId: 'usr-010',
    legenda:
      'Inscrições abertas para a Feira de Carreiras 2026.2 — 22 empresas confirmadas, 400 vagas. Corre lá em Eventos.',
    imagemSeed: 11,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  },
  {
    id: 'pub-003',
    eventoId: 'evt-009',
    autorId: 'usr-007',
    legenda:
      'Churrasco de boas-vindas da 1CCB: 31 dos 35 inscritos apareceram. Melhor número de comparecimento que a gente já teve.',
    imagemSeed: 18,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: at(-9, 20),
  },
  {
    id: 'pub-004',
    eventoId: 'evt-002',
    autorId: 'usr-004',
    legenda:
      'Hackathon lotou em quatro dias. Quem ficou de fora, entra na lista de espera: sempre abre vaga na semana do evento.',
    imagemSeed: 7,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: at(-3, 15),
  },
  {
    id: 'pub-005',
    eventoId: 'evt-010',
    autorId: 'usr-001',
    legenda: 'Tour pelo campus com a galera do primeiro semestre. Saudade já.',
    imagemSeed: 21,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: at(-21, 18),
  },
  {
    id: 'pub-006',
    eventoId: 'evt-005',
    autorId: 'usr-003',
    legenda:
      'Festa Junina Fora de Época: 287 de 300 ingressos vendidos. Quem ainda não garantiu, é agora.',
    imagemSeed: 9,
    removida: false,
    motivoRemocao: null,
    removidaPorId: null,
    criadoEm: at(-1, 21),
  },
];

export const comentarios: Comentario[] = [
  {
    id: 'com-001',
    publicacaoId: 'pub-001',
    autorId: 'usr-008',
    texto: 'A oficina de robótica foi o melhor momento, sem discussão.',
    removido: false,
    criadoEm: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    id: 'com-002',
    publicacaoId: 'pub-001',
    autorId: 'usr-005',
    texto: 'Ano que vem quero ajudar a organizar.',
    removido: false,
    criadoEm: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: 'com-003',
    publicacaoId: 'pub-002',
    autorId: 'usr-001',
    texto: 'Já me inscrevi. Alguém sabe se precisa levar currículo impresso mesmo?',
    removido: false,
    criadoEm: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  },
  {
    id: 'com-004',
    publicacaoId: 'pub-004',
    autorId: 'usr-006',
    texto: 'Sou a primeira da fila. Torcendo por uma desistência.',
    removido: false,
    criadoEm: at(-3, 16),
  },
];

// ---------------------------------------------------------------------------
// Notificações da Marina
// ---------------------------------------------------------------------------

export const notificacoes: Notificacao[] = [
  {
    id: 'not-001',
    destinatarioId: 'usr-001',
    tipo: 'PAGAMENTO_CONFIRMADO',
    titulo: 'Pagamento confirmado',
    mensagem: 'Sua inscrição no Churrasco de encerramento do semestre está confirmada.',
    referenciaId: 'evt-001',
    lida: false,
    criadoEm: at(-4, 10, 3),
  },
  {
    id: 'not-002',
    destinatarioId: 'usr-001',
    tipo: 'NOVO_EVENTO',
    titulo: 'Novo evento no seu curso',
    mensagem: 'Roda de conversa: mercado de dados — 60 vagas, gratuito.',
    referenciaId: 'evt-003',
    lida: false,
    criadoEm: at(-3, 9),
  },
  {
    id: 'not-003',
    destinatarioId: 'usr-001',
    tipo: 'EVENTO_CANCELADO',
    titulo: 'Evento cancelado',
    mensagem:
      'Palestra: Carreira em Segurança da Informação foi cancelada. Motivo: palestrante indisponível.',
    referenciaId: 'evt-008',
    lida: true,
    criadoEm: at(-7, 14),
  },
];
