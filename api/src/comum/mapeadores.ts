import { Prisma } from '@prisma/client';
import type {
  Comentario as ComentarioLinha,
  Curso as CursoLinha,
  Evento as EventoLinha,
  Faculdade as FaculdadeLinha,
  Notificacao as NotificacaoLinha,
  Pagamento as PagamentoLinha,
  Participacao as ParticipacaoLinha,
  PerguntaCustomizada as PerguntaLinha,
  Presenca as PresencaLinha,
  Publicacao as PublicacaoLinha,
  Turma as TurmaLinha,
  Usuario as UsuarioLinha,
} from '@prisma/client';
import type {
  Comentario,
  Curso,
  Evento,
  Faculdade,
  Notificacao,
  Pagamento,
  Participacao,
  PerguntaCustomizada,
  PoliticaReembolso,
  Presenca,
  Publicacao,
  ResumoCartao,
  Turma,
  Usuario,
} from '@campus/shared';

/**
 * Linha do Prisma → tipo de `@campus/shared`.
 *
 * ## Por que a conversão existe, em vez de devolver a linha direto
 *
 * Três diferenças de representação, e nenhuma é cosmética:
 *
 * | No banco | No contrato | Por quê |
 * |---|---|---|
 * | `Date` | ISO 8601 com fuso | O tipo compartilhado é `IsoDateTime`, e as funções de domínio recebem `string \| Date` mas as entidades declaram `string`. Serializar no mapeador, e não no `JSON.stringify`, é o que faz o tipo do handler ser verdade |
 * | `Prisma.Decimal` | `number` | `Decimal` serializa como objeto (`{ s, e, d }`), o que quebraria o cliente. O domínio compartilhado declara `preco: number` |
 * | `senhaHash` presente | ausente | Nenhuma projeção de leitura carrega o hash. O tipo do parâmetro é `Omit<…, 'senhaHash'>`: passar uma linha completa continua compilando, mas o mapeador não tem como devolvê-lo |
 *
 * ## Dinheiro como `number`
 *
 * `Evento.preco` e `Pagamento.valor` atravessam a rede como `number` porque é
 * assim que `@campus/shared` os declara e é o que `computeRefund` consome. O
 * `number` é de **leitura**: toda escrita de valor monetário vai para o banco
 * como `Decimal`, e a coluna é `numeric(10,2)`. Nenhuma soma de dinheiro
 * acontece em ponto flutuante do lado do servidor.
 */

/** `timestamptz` do PostgreSQL sempre volta em UTC; `toISOString` mantém o fuso. */
export function paraIso(data: Date): string {
  return data.toISOString();
}

export function paraIsoOuNulo(data: Date | null): string | null {
  return data === null ? null : data.toISOString();
}

export function paraNumero(valor: Prisma.Decimal): number {
  return valor.toNumber();
}

/** Dinheiro entrando: `number` do contrato → `Decimal` da coluna. */
export function paraDecimal(valor: number): Prisma.Decimal {
  return new Prisma.Decimal(valor.toFixed(2));
}

export function paraFaculdade(linha: FaculdadeLinha): Faculdade {
  return {
    id: linha.id,
    nome: linha.nome,
    sigla: linha.sigla,
    dominiosEmail: linha.dominiosEmail,
    criadoEm: paraIso(linha.criadoEm),
  };
}

export function paraCurso(linha: CursoLinha): Curso {
  return {
    id: linha.id,
    faculdadeId: linha.faculdadeId,
    nome: linha.nome,
    codigo: linha.codigo,
    duracaoSemestres: linha.duracaoSemestres,
  };
}

export function paraTurma(linha: TurmaLinha): Turma {
  return {
    id: linha.id,
    cursoId: linha.cursoId,
    nome: linha.nome,
    periodo: linha.periodo,
    codigoConvite: linha.codigoConvite,
    codigoAtivo: linha.codigoAtivo,
  };
}

/**
 * Turma sem o código de convite.
 *
 * `GET /cursos/:id/turmas` é rota pública — é a lista que a tela de onboarding
 * mostra para a pessoa **escolher** a turma antes de digitar o código. Devolver
 * `codigoConvite` ali entregaria de graça a credencial que RN-003 usa como prova
 * de vínculo: qualquer pessoa entraria em qualquer turma sem ninguém lhe passar
 * nada. O código só aparece em `GET /admin/turmas/:id/codigo`, que exige Admin
 * de Curso.
 */
export function paraTurmaPublica(linha: TurmaLinha): Omit<Turma, 'codigoConvite'> {
  return {
    id: linha.id,
    cursoId: linha.cursoId,
    nome: linha.nome,
    periodo: linha.periodo,
    codigoAtivo: linha.codigoAtivo,
  };
}

export function paraUsuario(linha: Omit<UsuarioLinha, 'senhaHash'>): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    avatarSeed: linha.avatarSeed,
    faculdadeId: linha.faculdadeId,
    cursoId: linha.cursoId,
    turmaId: linha.turmaId,
    papeis: linha.papeis,
    emailVerificado: linha.emailVerificado,
    visivelEntreConfirmados: linha.visivelEntreConfirmados,
    criadoEm: paraIso(linha.criadoEm),
  };
}

/** O que uma lista mostra de quem organizou: nome e cor do avatar, nada mais. */
export function paraAutor(
  linha: Pick<UsuarioLinha, 'id' | 'nome' | 'avatarSeed'>,
): Pick<Usuario, 'id' | 'nome' | 'avatarSeed'> {
  return { id: linha.id, nome: linha.nome, avatarSeed: linha.avatarSeed };
}

export function paraEvento(linha: EventoLinha): Evento {
  return {
    id: linha.id,
    organizadorId: linha.organizadorId,
    titulo: linha.titulo,
    descricao: linha.descricao,
    alcance: linha.alcance,
    turmaId: linha.turmaId,
    cursoId: linha.cursoId,
    faculdadeId: linha.faculdadeId,
    inicio: paraIso(linha.inicio),
    fim: paraIso(linha.fim),
    local: linha.local,
    capacidade: linha.capacidade,
    ocupadas: linha.ocupadas,
    preco: paraNumero(linha.preco),
    status: linha.status,
    motivoCancelamento: linha.motivoCancelamento,
    prazoInscricao: paraIso(linha.prazoInscricao),
    prazoCancelamento: paraIso(linha.prazoCancelamento),
    capaSeed: linha.capaSeed,
    criadoEm: paraIso(linha.criadoEm),
  };
}

export function paraPergunta(linha: PerguntaLinha): PerguntaCustomizada {
  return {
    id: linha.id,
    eventoId: linha.eventoId,
    enunciado: linha.enunciado,
    tipo: linha.tipo,
    // `String[]` no PostgreSQL não é nulo, é vazio. O contrato usa `null` para
    // "não se aplica" (pergunta de texto curto não tem opções).
    opcoes: linha.opcoes.length > 0 ? linha.opcoes : null,
    obrigatoria: linha.obrigatoria,
    ordem: linha.ordem,
  };
}

/**
 * A política congelada é `Json` na coluna: é um retrato de parâmetros que podem
 * mudar de FORMA, e normalizá-la em colunas convidaria a "atualizar" a política
 * de uma participação passada — exatamente o que RN-013 proíbe.
 *
 * O preço é que a leitura tem de verificar a forma. Um JSON que não casa volta
 * como `null` em vez de derrubar a requisição: participação antiga com formato
 * antigo é dado legítimo, e a tela sabe lidar com política ausente.
 */
export function paraPolitica(valor: Prisma.JsonValue | null): PoliticaReembolso | null {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;

  const bruto: Record<string, Prisma.JsonValue | undefined> = valor;
  const integral = bruto.reembolsoIntegralDiasAntes;
  const parcialHoras = bruto.reembolsoParcialHorasAntes;
  const taxa = bruto.reembolsoParcialTaxa;
  const congeladaEm = bruto.congeladaEm;

  if (
    typeof integral !== 'number' ||
    typeof parcialHoras !== 'number' ||
    typeof taxa !== 'number' ||
    typeof congeladaEm !== 'string'
  ) {
    return null;
  }

  return {
    reembolsoIntegralDiasAntes: integral,
    reembolsoParcialHorasAntes: parcialHoras,
    reembolsoParcialTaxa: taxa,
    congeladaEm,
  };
}

/** Política de domínio → JSON para a coluna, sem `as` no meio. */
export function politicaParaJson(politica: PoliticaReembolso): Prisma.InputJsonObject {
  return {
    reembolsoIntegralDiasAntes: politica.reembolsoIntegralDiasAntes,
    reembolsoParcialHorasAntes: politica.reembolsoParcialHorasAntes,
    reembolsoParcialTaxa: politica.reembolsoParcialTaxa,
    congeladaEm: politica.congeladaEm,
  };
}

export function paraParticipacao(linha: ParticipacaoLinha): Participacao {
  return {
    id: linha.id,
    eventoId: linha.eventoId,
    usuarioId: linha.usuarioId,
    status: linha.status,
    posicaoFila: linha.posicaoFila,
    pagamentoExpiraEm: paraIsoOuNulo(linha.pagamentoExpiraEm),
    ofertaExpiraEm: paraIsoOuNulo(linha.ofertaExpiraEm),
    motivoCancelamento: linha.motivoCancelamento,
    canceladaAposPrazo: linha.canceladaAposPrazo,
    politicaVigente: paraPolitica(linha.politicaVigente),
    criadoEm: paraIso(linha.criadoEm),
    atualizadoEm: paraIso(linha.atualizadoEm),
  };
}

export function paraPagamento(linha: PagamentoLinha): Pagamento {
  return {
    id: linha.id,
    participacaoId: linha.participacaoId,
    metodo: linha.metodo,
    valor: paraNumero(linha.valor),
    valorReembolsado: paraNumero(linha.valorReembolsado),
    status: linha.status,
    transacaoExternaId: linha.transacaoExternaId,
    chaveIdempotencia: linha.chaveIdempotencia,
    criadoEm: paraIso(linha.criadoEm),
    confirmadoEm: paraIsoOuNulo(linha.confirmadoEm),
  };
}

/**
 * O que sobra de um cartão. As três colunas são nulas juntas — o `CHECK`
 * `ck_pagamento_pix_sem_cartao` garante isso para Pix, e para cartão o resumo
 * sempre foi gravado inteiro. Faltando uma, devolvemos `null`: meio cartão não
 * é dado, é ruído na tela.
 */
export function paraResumoCartao(
  linha: Pick<PagamentoLinha, 'ultimosQuatro' | 'bandeiraCartao' | 'titularCartao'>,
): ResumoCartao | null {
  if (
    linha.ultimosQuatro === null ||
    linha.bandeiraCartao === null ||
    linha.titularCartao === null
  ) {
    return null;
  }
  return {
    ultimosQuatro: linha.ultimosQuatro,
    bandeira: linha.bandeiraCartao,
    titular: linha.titularCartao,
  };
}

export function paraPresenca(linha: PresencaLinha): Presenca {
  return {
    id: linha.id,
    participacaoId: linha.participacaoId,
    registradoPorId: linha.registradoPorId,
    metodo: linha.metodo,
    checkinEm: paraIso(linha.checkinEm),
    motivoCorrecao: linha.motivoCorrecao,
    sincronizado: linha.sincronizado,
  };
}

export function paraPublicacao(linha: PublicacaoLinha): Publicacao {
  return {
    id: linha.id,
    eventoId: linha.eventoId,
    autorId: linha.autorId,
    legenda: linha.legenda,
    imagemSeed: linha.imagemSeed,
    removida: linha.removida,
    motivoRemocao: linha.motivoRemocao,
    removidaPorId: linha.removidaPorId,
    criadoEm: paraIso(linha.criadoEm),
  };
}

export function paraComentario(linha: ComentarioLinha): Comentario {
  return {
    id: linha.id,
    publicacaoId: linha.publicacaoId,
    autorId: linha.autorId,
    texto: linha.texto,
    removido: linha.removido,
    criadoEm: paraIso(linha.criadoEm),
  };
}

export function paraNotificacao(linha: NotificacaoLinha): Notificacao {
  return {
    id: linha.id,
    destinatarioId: linha.destinatarioId,
    tipo: linha.tipo,
    titulo: linha.titulo,
    mensagem: linha.mensagem,
    referenciaId: linha.referenciaId,
    lida: linha.lida,
    criadoEm: paraIso(linha.criadoEm),
  };
}
