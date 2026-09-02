import type { Evento, MotivoRecusaCheckin, Participacao, Presenca } from '../types/domain';
import { checkInOpen, checkInWindow } from './deadlines';

/**
 * Check-in — RN-017 e RN-018.
 *
 * O token é assinado (HMAC) no servidor; aqui vive a decisão de aceitar ou
 * recusar, e sobretudo o MOTIVO ESPECÍFICO da recusa. Na porta de um evento com
 * fila, "erro ao validar" não é resposta: o operador precisa saber se chama o
 * próximo ou o segurança.
 */

/**
 * A união dos motivos vive em types/domain.ts porque a API a devolve no corpo do
 * `409` e as duas pontas precisam do mesmo conjunto. Aqui fica o apelido usado
 * pelo domínio.
 */
export type CheckInRejection = MotivoRecusaCheckin;

export interface CheckInDecision {
  aceito: boolean;
  motivo?: CheckInRejection;
  /** Mensagem já no tom de voz da marca, pronta para a tela do organizador. */
  mensagem: string;
}

export interface CheckInTokenPayload {
  participacaoId: string;
  eventoId: string;
  usuarioId: string;
  emitidoEm: string;
  assinatura: string;
}

/**
 * As 7 condições de RN-017, verificadas na ordem em que ficam mais baratas e
 * mais informativas. A unicidade (condição 5) é a única que, no CP6, também é
 * garantida pelo banco (índice único em `presenca.participacao_id`) — aqui a
 * verificação existe para dar a mensagem certa antes de tentar escrever.
 */
export function decideCheckIn(input: {
  token: CheckInTokenPayload;
  assinaturaValida: boolean;
  evento: Pick<Evento, 'id' | 'inicio' | 'fim' | 'status'>;
  participacao: Pick<Participacao, 'id' | 'status'> | null;
  presencaExistente: Pick<Presenca, 'checkinEm'> | null;
  operadorTemPermissao: boolean;
  now: Date | string;
}): CheckInDecision {
  const { token, assinaturaValida, evento, participacao, presencaExistente, now } = input;

  if (!input.operadorTemPermissao) {
    return {
      aceito: false,
      motivo: 'SEM_PERMISSAO',
      mensagem: 'Você não tem permissão para validar check-in neste evento.',
    };
  }

  if (!assinaturaValida) {
    return {
      aceito: false,
      motivo: 'TOKEN_INVALIDO',
      mensagem: 'Ingresso inválido.',
    };
  }

  if (token.eventoId !== evento.id) {
    return {
      aceito: false,
      motivo: 'OUTRO_EVENTO',
      mensagem: 'Este ingresso é de outro evento.',
    };
  }

  if (evento.status === 'CANCELADO') {
    return {
      aceito: false,
      motivo: 'EVENTO_CANCELADO',
      mensagem: 'Este evento foi cancelado: o check-in está encerrado.',
    };
  }

  if (!checkInOpen(evento, now)) {
    const { opensAt, closesAt } = checkInWindow(evento);
    const agora = new Date(now).getTime();
    if (agora < opensAt) {
      return {
        aceito: false,
        motivo: 'AINDA_NAO_ABRIU',
        mensagem: `O check-in abre às ${formatHour(opensAt)}.`,
      };
    }
    return {
      aceito: false,
      motivo: 'JA_ENCERROU',
      mensagem: `O check-in encerrou às ${formatHour(closesAt)}.`,
    };
  }

  if (!participacao) {
    return {
      aceito: false,
      motivo: 'TOKEN_INVALIDO',
      mensagem: 'Ingresso inválido.',
    };
  }

  /*
   * A unicidade vem ANTES do status, e a ordem foi corrigida por causa de um
   * defeito real observado na porta simulada: um check-in aceito muda a
   * participação para `PRESENTE`, então a segunda leitura do mesmo ingresso
   * caía na verificação de status e devolvia `NAO_CONFIRMADA`. A mensagem saía
   * certa por acaso ("Check-in já registrado"), mas o CÓDIGO estava errado — e
   * `JA_UTILIZADO`, que é a recusa que RN-018 existe para produzir, ficava
   * inalcançável para quem consome a API.
   *
   * A troca é segura: a presença tem relação 1:1 com a participação, então
   * existir presença já implica que a entrada aconteceu. E `PRESENTE` sem linha
   * de presença — que o banco do CP6 impede — continua caindo na verificação de
   * status logo abaixo.
   */
  if (presencaExistente) {
    return {
      aceito: false,
      motivo: 'JA_UTILIZADO',
      mensagem: `Ingresso já utilizado às ${formatHour(new Date(presencaExistente.checkinEm).getTime())}.`,
    };
  }

  if (participacao.status !== 'CONFIRMADA') {
    return {
      aceito: false,
      motivo: 'NAO_CONFIRMADA',
      mensagem: mensagemPorStatus(participacao.status),
    };
  }

  return { aceito: true, mensagem: 'Check-in confirmado.' };
}

/** RN-017, condição 7 — cada estado tem sua mensagem, nunca um erro genérico. */
function mensagemPorStatus(status: Participacao['status']): string {
  switch (status) {
    case 'PENDENTE_PAGAMENTO':
      return 'Pagamento pendente: a inscrição ainda não está confirmada.';
    case 'LISTA_ESPERA':
      return 'Esta pessoa está na lista de espera, sem vaga confirmada.';
    case 'OFERTA_PENDENTE':
      return 'Há uma vaga oferecida, mas ainda não confirmada.';
    case 'CANCELADA':
      return 'Inscrição cancelada.';
    case 'EXPIRADA':
      return 'A vaga expirou e foi liberada para a fila.';
    case 'AUSENTE':
      return 'Esta inscrição foi marcada como ausente.';
    case 'PRESENTE':
      return 'Check-in já registrado.';
    default:
      return 'Inscrição não confirmada.';
  }
}

/** Código numérico de 8 dígitos: contingência quando o QR não é legível (UC-005 A1). */
export function numericCheckInCode(participacaoId: string): string {
  let hash = 0;
  for (let i = 0; i < participacaoId.length; i += 1) {
    hash = (hash * 31 + participacaoId.charCodeAt(i)) % 100_000_000;
  }
  return String(hash).padStart(8, '0');
}

/** Código legível impresso no ingresso, ex.: `CMP-3ESPX-0184`. */
export function ticketCode(turmaOuSigla: string, participacaoId: string): string {
  const sufixo = numericCheckInCode(participacaoId).slice(-4);
  return `CMP-${turmaOuSigla.toUpperCase()}-${sufixo}`;
}

function formatHour(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
