import * as argon2 from 'argon2';
import type { PrismaClient } from '@prisma/client';
import { SENHA_DEMO, construirDados, type DadosDoSeed } from '../../src/seed/dados';
import { uuidLegado } from '../../src/seed/ids';

/**
 * Estado conhecido antes de cada caso — e por que é TRUNCATE + seed.
 *
 * ## O que se ganha reaplicando o seed inteiro
 *
 * Cada caso começa do MESMO banco de 103 linhas que a demonstração usa, então o
 * caso pode dizer "o evt-007 tem 96/120 vagas" em vez de montar cinco linhas de
 * fixture antes de chegar ao que interessa. Legibilidade de teste de integração
 * é o que decide se ele vai ser mantido: um caso que precisa de vinte linhas de
 * preparação é um caso que ninguém corrige quando falha.
 *
 * O preço é tempo. As duas partes caras foram removidas:
 *
 * 1. **`TRUNCATE ... RESTART IDENTITY CASCADE` num comando só**, com as 14
 *    tabelas na mesma instrução — assim não há ordem de chave estrangeira a
 *    respeitar e não há 14 viagens ao banco. `_prisma_migrations` fica de fora
 *    de propósito: apagá-la faria o `migrate deploy` seguinte reaplicar tudo.
 * 2. **Um hash de senha por execução, não treze.** `construirDados` recebe a
 *    função de hash injetada exatamente para isto. É argon2 de verdade (o login
 *    dos testes é real, com `argon2.verify`), calculado uma vez e reusado nos 13
 *    usuários. A propriedade "um salt por usuário" é do seed de produção
 *    (`src/seed/run.ts`), e é lá que ela deve ser verificada; aqui ela custaria
 *    ~13 derivações de chave por caso de teste sem provar nada novo.
 *
 * ## O instante de referência é o do processo
 *
 * As datas do seed são relativas a `agora` (o churrasco em 11 dias, o evento em
 * andamento começando 1 h atrás). `agora` é fixado UMA vez por processo, e não
 * por reset: assim dois casos do mesmo arquivo vêem exatamente as mesmas datas,
 * e a suíte não muda de comportamento porque levou 40 s para chegar no último
 * caso. Quem precisa de prazo vencido move a data na linha (ver
 * `test/expiracao.int.test.ts`), que é mais rápido e mais preciso do que
 * esperar o relógio.
 */

/** As 14 tabelas de `0001_init`. A ordem é irrelevante: TRUNCATE é um só. */
const TABELAS = [
  'comentario',
  'publicacao',
  'notificacao',
  'resposta_pergunta',
  'presenca',
  'pagamento',
  'participacao',
  'pergunta_customizada',
  'evento',
  'sessao',
  'usuario',
  'turma',
  'curso',
  'faculdade',
] as const;

const TRUNCAR = `TRUNCATE TABLE ${TABELAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`;

let hashUnico: Promise<string> | null = null;

/** argon2id de verdade, calculado uma vez. Ver o cabeçalho do arquivo. */
function hashDeTeste(senha: string): Promise<string> {
  hashUnico ??= argon2.hash(senha, { type: argon2.argon2id });
  return hashUnico;
}

let sementeMemoizada: Promise<DadosDoSeed> | null = null;

export function semente(): Promise<DadosDoSeed> {
  sementeMemoizada ??= construirDados({
    agora: new Date(),
    gerarHashDeSenha: hashDeTeste,
  });
  return sementeMemoizada;
}

/** A senha em claro dos 13 usuários do seed — o login dos testes é real. */
export const SENHA = SENHA_DEMO;

/**
 * Os registros que os casos citam por nome.
 *
 * Ter os UUIDs derivados aqui, e não espalhados em `uuidLegado('evt-007')` pelos
 * arquivos, deixa o caso legível ("o evento com vaga") e mantém uma só linha a
 * corrigir se o seed mudar de composição.
 */
export const ID = {
  /** Marina Alves — 3ESPX / Engenharia de Computação. A usuária da demonstração. */
  marina: uuidLegado('usr-001'),
  /** Rafael Souza — mesma turma de Marina, organizador de evt-001/011/012/013. */
  rafael: uuidLegado('usr-002'),
  /** Beatriz Nakamura — 4SIA / Sistemas de Informação. Fora do alcance de turma. */
  beatriz: uuidLegado('usr-003'),
  /** Caio Ferreira — 3ESPX, posição 1 da fila de evt-002. */
  caio: uuidLegado('usr-004'),
  /** Diego Martins — 2ESPA / Engenharia de Computação. */
  diego: uuidLegado('usr-005'),
  /** Elisa Prado — 4SIA / SI, organizadora de evt-006. */
  elisa: uuidLegado('usr-006'),
  /** Karen Yamada — 2ESPA. */
  karen: uuidLegado('usr-012'),
  /** Lucas Tavares — e-mail verificado, SEM curso e turma (onboarding pendente). */
  lucas: uuidLegado('usr-013'),

  /** Churrasco da 3ESPX: alcance TURMA, pago (R$ 25), 18/40. Marina já confirmada. */
  churrasco: uuidLegado('evt-001'),
  /** Hackathon: alcance FACULDADE, gratuito, LOTADO 80/80, fila de 7. */
  hackathon: uuidLegado('evt-002'),
  /** Roda de conversa: alcance CURSO (ECOMP), gratuito, 41/60. */
  roda: uuidLegado('evt-003'),
  /** Festa Junina: alcance FACULDADE, paga (R$ 45), 287/300. */
  festa: uuidLegado('evt-005'),
  /** Workshop de Git: alcance CURSO **SI**, lotado 30/30 — invisível para Marina. */
  workshopSI: uuidLegado('evt-006'),
  /** Torneio de Futsal: alcance FACULDADE, pago (R$ 15), 96/120. Tem vaga. */
  futsal: uuidLegado('evt-007'),
  /** Palestra CANCELADA, alcance CURSO (CC) — invisível para Marina. */
  canceladoCC: uuidLegado('evt-008'),
  /** Sarau: RASCUNHO da 3ESPX. Visível só para o organizador. */
  rascunho: uuidLegado('evt-011'),
  /** Visita técnica: TURMA 3ESPX, gratuita, lotada 25/25, com oferta viva. */
  visita: uuidLegado('evt-012'),
  /** Maratona de estudos: EM ANDAMENTO (começou 1 h atrás), 12/20. */
  emAndamento: uuidLegado('evt-013'),

  /** Participação de Marina no churrasco: CONFIRMADA e paga. */
  parChurrascoMarina: uuidLegado('par-001'),
  /** Marina na Festa Junina: PENDENTE_PAGAMENTO, com a janela de RN-012 aberta. */
  parPagamentoMarina: uuidLegado('par-052'),
  /** Marina na visita técnica: OFERTA_PENDENTE, com a janela de RN-008 aberta. */
  parOfertaMarina: uuidLegado('par-122'),
  /** Caio na visita técnica: posição 1 da fila — é quem herda a oferta expirada. */
  parFilaVisitaCaio: uuidLegado('par-123'),
} as const;

/**
 * Devolve o banco ao estado do seed.
 *
 * Não recebe o instante: ver o cabeçalho. Recebe o cliente porque quem manda no
 * ciclo de vida da conexão é `test/suporte/aplicacao.ts` — abrir um segundo
 * `PrismaClient` só para o reset dobraria o pool sem necessidade.
 */
export async function redefinirBanco(prisma: PrismaClient): Promise<void> {
  const dados = await semente();

  await prisma.$executeRawUnsafe(TRUNCAR);

  /*
   * Uma transação para as 13 inserções. Sem ela, uma falha no meio deixaria o
   * banco num estado que nenhum caso descreve — e o caso seguinte falharia por
   * um motivo que não é o dele.
   */
  await prisma.$transaction(async (tx) => {
    await tx.faculdade.createMany({ data: dados.faculdades });
    await tx.curso.createMany({ data: dados.cursos });
    await tx.turma.createMany({ data: dados.turmas });
    await tx.usuario.createMany({ data: dados.usuarios });
    await tx.evento.createMany({ data: dados.eventos });
    await tx.perguntaCustomizada.createMany({ data: dados.perguntas });
    await tx.participacao.createMany({ data: dados.participacoes });
    await tx.pagamento.createMany({ data: dados.pagamentos });
    await tx.presenca.createMany({ data: dados.presencas });
    await tx.respostaPergunta.createMany({ data: dados.respostas });
    await tx.publicacao.createMany({ data: dados.publicacoes });
    await tx.comentario.createMany({ data: dados.comentarios });
    await tx.notificacao.createMany({ data: dados.notificacoes });
  });
}
