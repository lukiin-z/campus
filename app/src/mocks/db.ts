import type {
  Comentario,
  Curso,
  Evento,
  Faculdade,
  Notificacao,
  Pagamento,
  Participacao,
  PerguntaCustomizada,
  Presenca,
  Publicacao,
  Turma,
  Usuario,
} from '../types/domain';
import * as seed from './seed';

/**
 * Banco em memória do CP5.
 *
 * Duas propriedades importam aqui, e as duas existem para que o mock se comporte
 * como a API real vai se comportar no CP6:
 *
 * 1. **Escrita serializada.** `transaction()` enfileira as operações de escrita.
 *    É a versão em memória do `SELECT ... FOR UPDATE` de RN-004: duas inscrições
 *    simultâneas para a última vaga produzem exatamente uma confirmação
 *    (RNF-013, CT-020). Sem isso, o teste de concorrência passaria no mock e
 *    falharia na API — o pior tipo de falso positivo.
 *
 * 2. **Invariante verificada.** `assertInvariants()` roda ao fim de cada
 *    transação e estoura se `ocupadas > capacidade` ou se houver duas
 *    participações ativas do mesmo aluno no mesmo evento. É o equivalente aos
 *    CHECKs e ao índice único parcial do PostgreSQL
 *    (docs/05-modelagem/03-modelo-dados-er.md).
 */

export interface Database {
  faculdade: Faculdade;
  cursos: Curso[];
  turmas: Turma[];
  usuarios: Usuario[];
  eventos: Evento[];
  perguntas: PerguntaCustomizada[];
  participacoes: Participacao[];
  pagamentos: Pagamento[];
  presencas: Presenca[];
  publicacoes: Publicacao[];
  comentarios: Comentario[];
  notificacoes: Notificacao[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freshDatabase(): Database {
  return {
    faculdade: clone(seed.faculdade),
    cursos: clone(seed.cursos),
    turmas: clone(seed.turmas),
    usuarios: clone(seed.usuarios),
    eventos: clone(seed.eventos),
    perguntas: clone(seed.perguntas),
    participacoes: clone(seed.participacoes),
    pagamentos: clone(seed.pagamentos),
    presencas: clone(seed.presencas),
    publicacoes: clone(seed.publicacoes),
    comentarios: clone(seed.comentarios),
    notificacoes: clone(seed.notificacoes),
  };
}

let db: Database = freshDatabase();

/** Leitura direta. Só a camada de mock usa — nenhuma tela importa este módulo. */
export function getDb(): Database {
  return db;
}

/** Volta o banco ao seed. Usado por cada teste e pelo botão de recarga da demo. */
export function resetDb(): void {
  db = freshDatabase();
}

class InvariantViolation extends Error {
  constructor(message: string) {
    super(`[mock] invariante do domínio violada: ${message}`);
    this.name = 'InvariantViolation';
  }
}

const ESTADOS_QUE_OCUPAM = new Set([
  'PENDENTE_PAGAMENTO',
  'CONFIRMADA',
  'OFERTA_PENDENTE',
  'PRESENTE',
]);

const ESTADOS_ATIVOS = new Set([
  'PENDENTE_PAGAMENTO',
  'CONFIRMADA',
  'LISTA_ESPERA',
  'OFERTA_PENDENTE',
  'PRESENTE',
]);

/**
 * As três invariantes que o banco de verdade garante por restrição. Aqui elas
 * são verificadas em tempo de execução, e uma violação estoura em vez de gerar
 * dado inconsistente silenciosamente.
 */
export function assertInvariants(database: Database = db): void {
  // RN-004 — capacidade nunca excedida. Esta é A invariante do produto.
  for (const evento of database.eventos) {
    if (evento.ocupadas > evento.capacidade) {
      throw new InvariantViolation(
        `evento ${evento.id} com ${evento.ocupadas} ocupadas acima da capacidade ${evento.capacidade}`,
      );
    }
    if (evento.ocupadas < 0) {
      throw new InvariantViolation(`evento ${evento.id} com ocupadas negativo`);
    }

    // `ocupadas` é contagem materializada. O seed carrega números realistas
    // (233 inscritos na Feira de Carreiras) sem materializar cada participação:
    // fazê-lo exigiria inventar ~1.500 usuários fictícios, o que tornaria o seed
    // ilegível sem provar nada a mais. O que se verifica, então, é que o
    // contador nunca fica ABAIXO das participações efetivamente conhecidas — é
    // isso que pegaria um erro de contabilidade nas escritas.
    const ocupantesConhecidos = database.participacoes.filter(
      (p) => p.eventoId === evento.id && ESTADOS_QUE_OCUPAM.has(p.status),
    ).length;
    if (evento.ocupadas < ocupantesConhecidos) {
      throw new InvariantViolation(
        `evento ${evento.id} tem ocupadas=${evento.ocupadas}, abaixo das ${ocupantesConhecidos} participações que ocupam vaga`,
      );
    }
  }

  // RN-015 — uma participação ativa por (evento, usuário).
  const ativas = new Map<string, string>();
  for (const p of database.participacoes) {
    if (!ESTADOS_ATIVOS.has(p.status)) continue;
    const chave = `${p.eventoId}:${p.usuarioId}`;
    const anterior = ativas.get(chave);
    if (anterior) {
      throw new InvariantViolation(`duas participações ativas em ${chave} (${anterior} e ${p.id})`);
    }
    ativas.set(chave, p.id);
  }

  // RN-018 — uma presença por participação.
  const presencasPorParticipacao = new Set<string>();
  for (const presenca of database.presencas) {
    if (presencasPorParticipacao.has(presenca.participacaoId)) {
      throw new InvariantViolation(`duas presenças para a participação ${presenca.participacaoId}`);
    }
    presencasPorParticipacao.add(presenca.participacaoId);
  }
}

/**
 * Fila de escrita. Cada `transaction` só começa quando a anterior termina, o que
 * serializa as mutações exatamente como a trava de linha do banco faria.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

export function transaction<T>(work: (database: Database) => T): Promise<T> {
  const result = writeQueue.then(async () => {
    // Ponto de rendição: garante que duas chamadas concorrentes de fato entrem
    // em ordem, e não sejam otimizadas para o mesmo tick.
    await Promise.resolve();
    const output = work(db);
    assertInvariants(db);
    return output;
  });
  // A fila continua mesmo se esta transação falhar, senão uma exceção travaria
  // todas as escritas seguintes.
  writeQueue = result.catch(() => undefined);
  return result;
}

// --------------------------------------------------------------------------
// Auxiliares de leitura usados pelos handlers
// --------------------------------------------------------------------------

export function findEvento(id: string): Evento | undefined {
  return db.eventos.find((e) => e.id === id);
}

export function findUsuario(id: string): Usuario | undefined {
  return db.usuarios.find((u) => u.id === id);
}

export function findParticipacao(id: string): Participacao | undefined {
  return db.participacoes.find((p) => p.id === id);
}

export function participacoesDoEvento(eventoId: string): Participacao[] {
  return db.participacoes.filter((p) => p.eventoId === eventoId);
}

export function participacoesDoUsuario(usuarioId: string): Participacao[] {
  return db.participacoes.filter((p) => p.usuarioId === usuarioId);
}

export function pagamentoDaParticipacao(participacaoId: string): Pagamento | undefined {
  return db.pagamentos.find((p) => p.participacaoId === participacaoId);
}

export function presencaDaParticipacao(participacaoId: string): Presenca | undefined {
  return db.presencas.find((p) => p.participacaoId === participacaoId);
}

/** Gera identificador legível e estável dentro da sessão. */
let sequencia = 1000;
export function nextId(prefixo: string): string {
  sequencia += 1;
  return `${prefixo}-${sequencia}`;
}
