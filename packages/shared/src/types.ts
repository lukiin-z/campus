/**
 * Tipos de domínio do Campus — **fonte única**, compartilhada pelo app e pela API.
 *
 * Este arquivo espelha, entidade por entidade e enum por enum, o diagrama de
 * classes em docs/05-modelagem/02-diagrama-classes.md. Divergência entre os dois
 * é defeito, não detalhe: mudou o tipo aqui, atualize o diagrama no mesmo PR
 * (regra do CONTRIBUTING.md).
 *
 * Convenção: nome de entidade e de enum em português (é o vocabulário do domínio,
 * discutido em português com o time), nome de campo em inglês. Ver
 * docs/14-glossario.md.
 *
 * ## Por que mora em `packages/shared`
 *
 * No CP5 este arquivo vivia em `app/src/types/`. Com a API do CP6, ele passou a
 * ter **dois** consumidores — e duas cópias de um enum de status é o jeito mais
 * rápido de o front aceitar um valor que o banco recusa. `app/src/types/domain.ts`
 * continua existindo como reexportação, para que nenhum import do app mude.
 */

// ---------------------------------------------------------------------------
// Enumerações — os mesmos 9 conjuntos existem como tipos ENUM no PostgreSQL
// (docs/05-modelagem/03-modelo-dados-er.md, seção 5), na mesma ordem.
// ---------------------------------------------------------------------------

export const ALCANCE_EVENTO = ['TURMA', 'CURSO', 'FACULDADE'] as const;
export type AlcanceEvento = (typeof ALCANCE_EVENTO)[number];

export const STATUS_EVENTO = [
  'RASCUNHO',
  'EM_APROVACAO',
  'PUBLICADO',
  'CANCELADO',
  'REALIZADO',
] as const;
export type StatusEvento = (typeof STATUS_EVENTO)[number];

export const STATUS_PARTICIPACAO = [
  'PENDENTE_PAGAMENTO',
  'CONFIRMADA',
  'LISTA_ESPERA',
  'OFERTA_PENDENTE',
  'PRESENTE',
  'AUSENTE',
  'CANCELADA',
  'EXPIRADA',
] as const;
export type StatusParticipacao = (typeof STATUS_PARTICIPACAO)[number];

export const STATUS_PAGAMENTO = [
  'AGUARDANDO',
  'CONFIRMADO',
  'RECUSADO',
  'EM_ANALISE',
  'REEMBOLSO_SOLICITADO',
  'REEMBOLSADO',
  'REEMBOLSADO_PARCIAL',
  'ESTORNADO',
] as const;
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];

export const METODO_PAGAMENTO = ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO'] as const;
export type MetodoPagamento = (typeof METODO_PAGAMENTO)[number];

export const PAPEL_USUARIO = ['ALUNO', 'ADMIN_CURSO', 'ADMIN_FACULDADE'] as const;
export type PapelUsuario = (typeof PAPEL_USUARIO)[number];

export const METODO_CHECKIN = ['QR_CODE', 'CODIGO_NUMERICO', 'MANUAL'] as const;
export type MetodoCheckin = (typeof METODO_CHECKIN)[number];

export const TIPO_PERGUNTA = ['TEXTO_CURTO', 'ESCOLHA_UNICA'] as const;
export type TipoPergunta = (typeof TIPO_PERGUNTA)[number];

export const TIPO_NOTIFICACAO = [
  'NOVO_EVENTO',
  'VAGA_LIBERADA',
  'PAGAMENTO_CONFIRMADO',
  'PAGAMENTO_EXPIRADO',
  'EVENTO_ALTERADO',
  'EVENTO_CANCELADO',
  'CHECKIN_REALIZADO',
  'EVENTO_APROVADO',
] as const;
export type TipoNotificacao = (typeof TIPO_NOTIFICACAO)[number];

/** Motivo do cancelamento de uma participação (campo `motivo_cancelamento`). */
export const MOTIVO_CANCELAMENTO = [
  'ALUNO_DESISTIU',
  'EVENTO_CANCELADO',
  'VINCULO_PERDIDO',
  'REMOVIDO_PELO_ORGANIZADOR',
  'OFERTA_RECUSADA',
] as const;
export type MotivoCancelamento = (typeof MOTIVO_CANCELAMENTO)[number];

/** Data-hora em ISO 8601 com fuso (o banco guarda `timestamptz`, sempre UTC). */
export type IsoDateTime = string;

// ---------------------------------------------------------------------------
// Estrutura acadêmica
// ---------------------------------------------------------------------------

export interface Faculdade {
  id: string;
  nome: string;
  sigla: string;
  /** Domínios aceitos no cadastro, sem `@`. Base do RF-002. */
  dominiosEmail: string[];
  criadoEm: IsoDateTime;
}

export interface Curso {
  id: string;
  faculdadeId: string;
  nome: string;
  codigo: string;
  duracaoSemestres: number;
}

export interface Turma {
  id: string;
  cursoId: string;
  /** Ex.: `3ESPX`. */
  nome: string;
  /** Ano e semestre, ex.: `2026.1`. */
  periodo: string;
  /** Código de convite que vincula o aluno à turma (RF-005). */
  codigoConvite: string;
  codigoAtivo: boolean;
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export interface Usuario {
  id: string;
  nome: string;
  /** E-mail institucional: identidade da conta e prova de vínculo. */
  email: string;
  /** Semente da cor do avatar de iniciais. Não há upload de foto na v1. */
  avatarSeed: number;
  faculdadeId: string;
  /** Nulo entre a verificação do e-mail e a conclusão do onboarding. */
  cursoId: string | null;
  turmaId: string | null;
  papeis: PapelUsuario[];
  emailVerificado: boolean;
  /** Opt-out de aparecer na lista pública de confirmados (RF-009). */
  visivelEntreConfirmados: boolean;
  criadoEm: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Evento
// ---------------------------------------------------------------------------

export interface Evento {
  id: string;
  organizadorId: string;
  titulo: string;
  descricao: string;
  alcance: AlcanceEvento;
  /**
   * Âncora do alcance: exatamente UMA das três é preenchida, coerente com
   * `alcance` (RN-001). No banco isso é um CHECK composto; aqui é invariante
   * garantida por `assertAncoraCoerente` em domain/visibility.ts.
   */
  turmaId: string | null;
  cursoId: string | null;
  faculdadeId: string | null;
  inicio: IsoDateTime;
  fim: IsoDateTime;
  local: string;
  capacidade: number;
  /** Contagem materializada de participações que ocupam vaga (RN-004). */
  ocupadas: number;
  /** Em reais. `0` = gratuito. */
  preco: number;
  status: StatusEvento;
  motivoCancelamento: string | null;
  prazoInscricao: IsoDateTime;
  prazoCancelamento: IsoDateTime;
  /** Semente 1..12 da capa gerada localmente em SVG (sem upload nem storage). */
  capaSeed: number;
  criadoEm: IsoDateTime;
}

export interface PerguntaCustomizada {
  id: string;
  eventoId: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: string[] | null;
  obrigatoria: boolean;
  /** 1 a 5 (`MAX_CUSTOM_QUESTIONS`). */
  ordem: number;
}

// ---------------------------------------------------------------------------
// Participação e derivados
// ---------------------------------------------------------------------------

/** Política de reembolso congelada no momento do pagamento (RN-013). */
export interface PoliticaReembolso {
  reembolsoIntegralDiasAntes: number;
  reembolsoParcialHorasAntes: number;
  reembolsoParcialTaxa: number;
  congeladaEm: IsoDateTime;
}

export interface Participacao {
  /** É também o identificador do ingresso (`/ingresso/:id`). */
  id: string;
  eventoId: string;
  usuarioId: string;
  status: StatusParticipacao;
  /** Posição na fila, >= 1. Nulo fora de `LISTA_ESPERA`. */
  posicaoFila: number | null;
  pagamentoExpiraEm: IsoDateTime | null;
  ofertaExpiraEm: IsoDateTime | null;
  motivoCancelamento: MotivoCancelamento | null;
  /** Cancelamento depois do prazo: sem reembolso, e visível ao organizador. */
  canceladaAposPrazo: boolean;
  politicaVigente: PoliticaReembolso | null;
  /** Instante de entrada — define a ordem FIFO da fila (RN-006). */
  criadoEm: IsoDateTime;
  atualizadoEm: IsoDateTime;
}

export interface Pagamento {
  id: string;
  participacaoId: string;
  metodo: MetodoPagamento;
  valor: number;
  valorReembolsado: number;
  status: StatusPagamento;
  /** Único dado do gateway que armazenamos. Nunca dado de cartão (RNF-022). */
  transacaoExternaId: string | null;
  /** Impede processar a mesma notificação duas vezes (RN-014). */
  chaveIdempotencia: string;
  criadoEm: IsoDateTime;
  confirmadoEm: IsoDateTime | null;
}

export interface Presenca {
  id: string;
  /** Relação 1:1 com a participação — é o que impede check-in duplo (RN-018). */
  participacaoId: string;
  registradoPorId: string;
  metodo: MetodoCheckin;
  checkinEm: IsoDateTime;
  motivoCorrecao: string | null;
  sincronizado: boolean;
}

export interface RespostaPergunta {
  id: string;
  perguntaId: string;
  participacaoId: string;
  valor: string;
  criadoEm: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Social e avisos
// ---------------------------------------------------------------------------

export interface Publicacao {
  id: string;
  /** Não existe publicação sem evento (RN-019). */
  eventoId: string;
  autorId: string;
  legenda: string;
  /** Semente 1..24 da imagem gerada localmente. */
  imagemSeed: number;
  removida: boolean;
  motivoRemocao: string | null;
  removidaPorId: string | null;
  criadoEm: IsoDateTime;
}

export interface Comentario {
  id: string;
  publicacaoId: string;
  autorId: string;
  texto: string;
  removido: boolean;
  criadoEm: IsoDateTime;
}

export interface Notificacao {
  id: string;
  destinatarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  /** ID do objeto citado. Sem FK: aponta para tabelas diferentes por tipo. */
  referenciaId: string | null;
  lida: boolean;
  criadoEm: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Formas de leitura (o que a API devolve para as telas)
//
// Estes tipos NÃO estão no diagrama de classes porque não são entidades: são
// projeções compostas para a tela não ter de resolver relacionamento no cliente.
// ---------------------------------------------------------------------------

/** Evento com o que a lista e o detalhe precisam mostrar em uma só requisição. */
export interface EventoView extends Evento {
  organizador: Pick<Usuario, 'id' | 'nome' | 'avatarSeed'>;
  /** Rótulo do alcance já resolvido: "3ESPX", "Engenharia de Computação", "FIAP". */
  alcanceRotulo: string;
  vagasDisponiveis: number;
  taxaOcupacao: number;
  inscricoesAbertas: boolean;
  totalListaEspera: number;
  /** Participação do usuário autenticado neste evento, se houver. */
  minhaParticipacao: Participacao | null;
}

export interface ParticipacaoView extends Participacao {
  evento: Pick<
    Evento,
    'id' | 'titulo' | 'inicio' | 'fim' | 'local' | 'preco' | 'alcance' | 'status' | 'capaSeed'
  >;
  pagamento: Pagamento | null;
  presenca: Presenca | null;
}

export interface PublicacaoView extends Publicacao {
  autor: Pick<Usuario, 'id' | 'nome' | 'avatarSeed'>;
  evento: Pick<Evento, 'id' | 'titulo' | 'alcance'>;
  comentarios: Array<Comentario & { autor: Pick<Usuario, 'id' | 'nome' | 'avatarSeed'> }>;
}

/** Usuário autenticado com o vínculo acadêmico já resolvido. */
export interface SessaoUsuario {
  usuario: Usuario;
  faculdade: Faculdade;
  curso: Curso | null;
  turma: Turma | null;
}

// ---------------------------------------------------------------------------
// Filtros e entradas de escrita
// ---------------------------------------------------------------------------

export type FiltroAlcance = 'TODOS' | 'MINHA_TURMA' | 'MEU_CURSO' | 'FACULDADE';
export type FiltroPreco = 'TODOS' | 'GRATUITOS' | 'PAGOS';
export type FiltroPeriodo = 'TODOS' | 'ESTE_MES' | 'PROXIMOS_7_DIAS';

export interface FiltroEventos {
  alcance?: FiltroAlcance;
  preco?: FiltroPreco;
  periodo?: FiltroPeriodo;
  busca?: string;
}

/** Entrada de criação de evento. Validada por Zod em domain/eventSchema.ts. */
export interface NovoEvento {
  titulo: string;
  descricao: string;
  alcance: AlcanceEvento;
  inicio: IsoDateTime;
  fim: IsoDateTime;
  local: string;
  capacidade: number;
  preco: number;
  prazoInscricao?: IsoDateTime;
  prazoCancelamento?: IsoDateTime;
  publicar: boolean;
}

/** Resultado de uma tentativa de inscrição — o `409` da API tem forma própria. */
export type ResultadoInscricao =
  | { tipo: 'CONFIRMADA'; participacao: Participacao }
  | { tipo: 'PENDENTE_PAGAMENTO'; participacao: Participacao }
  | { tipo: 'SEM_VAGA'; acao: 'LISTA_ESPERA'; totalFila: number }
  | { tipo: 'RECUSADA'; motivo: MotivoRecusaInscricao; mensagem: string };

export const MOTIVO_RECUSA_INSCRICAO = [
  'PRAZO_ENCERRADO',
  'JA_INSCRITO',
  'EVENTO_CANCELADO',
  'FORA_DO_ALCANCE',
  'EVENTO_NAO_PUBLICADO',
] as const;
export type MotivoRecusaInscricao = (typeof MOTIVO_RECUSA_INSCRICAO)[number];

// ---------------------------------------------------------------------------
// Autenticação e onboarding (RF-001 a RF-005) — CP5
// ---------------------------------------------------------------------------

export interface Credenciais {
  email: string;
  senha: string;
}

/**
 * O token existe desde o CP5 mesmo com o mock: é ele que a store guarda e o
 * cliente HTTP envia. No CP6 o valor passa a ser um JWT real assinado pela API,
 * e nada acima desta camada muda (ADR-0003).
 */
export interface ResultadoLogin {
  token: string;
  sessao: SessaoUsuario;
}

/** RF-004 e RF-005 — o aluno escolhe o curso e prova a turma pelo código. */
export interface EntradaOnboarding {
  cursoId: string;
  codigoConvite: string;
}

export const MOTIVO_RECUSA_LOGIN = [
  'DOMINIO_NAO_INSTITUCIONAL',
  'CREDENCIAL_INVALIDA',
  'EMAIL_NAO_VERIFICADO',
] as const;
export type MotivoRecusaLogin = (typeof MOTIVO_RECUSA_LOGIN)[number];

export const MOTIVO_RECUSA_ONBOARDING = [
  'CURSO_INEXISTENTE',
  'CODIGO_INVALIDO',
  'CODIGO_INATIVO',
  'CODIGO_DE_OUTRO_CURSO',
] as const;
export type MotivoRecusaOnboarding = (typeof MOTIVO_RECUSA_ONBOARDING)[number];

// ---------------------------------------------------------------------------
// Pagamento simulado (RF-026 a RF-030) — CP5
// ---------------------------------------------------------------------------

/**
 * Cobrança Pix. `brCode` tem o formato de um payload EMV de verdade, mas é
 * gerado localmente e não corresponde a nenhuma conta: o CP5 simula o gateway
 * (ADR-0007). Nenhum dado de cartão trafega ou é guardado (RNF-022).
 */
export interface CobrancaPix {
  chave: string;
  brCode: string;
  expiraEm: IsoDateTime;
}

/** Só os últimos 4 dígitos sobrevivem à tela — o resto nunca sai do formulário. */
export interface ResumoCartao {
  ultimosQuatro: string;
  bandeira: string;
  titular: string;
}

export interface NovoPagamento {
  metodo: MetodoPagamento;
  /** Presente apenas em cartão; a API recebe o resumo, nunca o número. */
  cartao?: ResumoCartao;
}

export interface PagamentoView extends Pagamento {
  pix: CobrancaPix | null;
  cartao: ResumoCartao | null;
  /** Minutos restantes da janela de RN-012, calculado pelo servidor. */
  minutosRestantes: number | null;
}

/** Gatilho da simulação do gateway: é o que o botão "simular" da demo chama. */
export const DESFECHO_SIMULADO = ['CONFIRMAR', 'RECUSAR', 'DUPLICAR'] as const;
export type DesfechoSimulado = (typeof DESFECHO_SIMULADO)[number];

// ---------------------------------------------------------------------------
// Check-in (RF-031 a RF-035) — CP5
// ---------------------------------------------------------------------------

export const MOTIVO_RECUSA_CHECKIN = [
  'TOKEN_INVALIDO',
  'OUTRO_EVENTO',
  'AINDA_NAO_ABRIU',
  'JA_ENCERROU',
  'JA_UTILIZADO',
  'NAO_CONFIRMADA',
  'SEM_PERMISSAO',
  'EVENTO_CANCELADO',
] as const;
export type MotivoRecusaCheckin = (typeof MOTIVO_RECUSA_CHECKIN)[number];

/** O que o ingresso mostra e o que o leitor consome. */
export interface TokenIngresso {
  /** Conteúdo do QR: payload assinado, opaco para a tela. */
  valor: string;
  /** Contingência de UC-005 A1, digitável quando a câmera falha. */
  codigoNumerico: string;
  /** Código legível impresso no ingresso, ex.: `CMP-3ESPX-0184`. */
  codigoLegivel: string;
  emitidoEm: IsoDateTime;
}

export interface ResultadoCheckin {
  aceito: boolean;
  motivo: MotivoRecusaCheckin | null;
  mensagem: string;
  /** Quem passou pela porta — o operador precisa ver o nome, não só "ok". */
  participante: { nome: string; turma: string | null } | null;
  registradoEm: IsoDateTime | null;
}

export interface PresencaView extends Presenca {
  participante: Pick<Usuario, 'id' | 'nome' | 'avatarSeed'>;
}

export interface PainelCheckin {
  evento: Pick<Evento, 'id' | 'titulo' | 'inicio' | 'fim' | 'status'>;
  abertoAgora: boolean;
  abreEm: IsoDateTime;
  fechaEm: IsoDateTime;
  confirmados: number;
  presentes: number;
  presencas: PresencaView[];
  /**
   * Quem ainda não entrou, com o código de contingência de cada um.
   *
   * Só o organizador do evento recebe esta lista — é ele quem opera a porta e
   * quem digita o código quando a câmera falha (UC-005 A1). O token completo
   * NÃO vem aqui: ele é do dono do ingresso, e o painel não precisa dele para
   * validar por código.
   */
  aguardando: Array<{
    participacaoId: string;
    nome: string;
    turma: string | null;
    codigoNumerico: string;
  }>;
}

// ---------------------------------------------------------------------------
// Feed social (RF-036 a RF-040) — CP5
// ---------------------------------------------------------------------------

export interface NovaPublicacao {
  eventoId: string;
  legenda: string;
  /** 1..24. Ausente = o servidor sorteia (não há upload de arquivo na v1). */
  imagemSeed?: number;
}

export interface NovoComentario {
  texto: string;
}
