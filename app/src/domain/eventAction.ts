import type { EventoView, Participacao } from '../types/domain';
import { availableSpots, enrollmentOpen, minutesLeftToPay } from '@campus/shared';

/**
 * Ação principal do detalhe do evento.
 *
 * Este módulo é a implementação do segundo diagrama de atividades
 * (docs/05-modelagem/05-diagrama-atividades.md): onze estados de botão, cada um
 * com rótulo próprio. O ganho é direto: o aluno nunca toca em um botão para
 * descobrir que não podia.
 */

export type PrimaryActionKind =
  | 'INSCREVER'
  | 'INSCREVER_PAGO'
  | 'LISTA_ESPERA'
  | 'PAGAR'
  | 'CONFIRMAR_OFERTA'
  | 'VER_INGRESSO'
  | 'VER_FILA'
  | 'PUBLICAR_FOTO'
  | 'ENCERRADO'
  | 'CANCELADO'
  | 'REALIZADO';

export interface PrimaryAction {
  kind: PrimaryActionKind;
  label: string;
  /** Texto auxiliar sob o botão. Nunca "aguarde": sempre o dado concreto. */
  hint?: string;
  disabled: boolean;
  variant: 'primary' | 'secondary' | 'ghost';
}

export function resolvePrimaryAction(event: EventoView, now: Date | string): PrimaryAction {
  if (event.status === 'CANCELADO') {
    return {
      kind: 'CANCELADO',
      label: 'Evento cancelado',
      hint: event.motivoCancelamento
        ? `Motivo: ${event.motivoCancelamento}`
        : 'Cancelado pelo organizador.',
      disabled: true,
      variant: 'ghost',
    };
  }

  if (event.status === 'REALIZADO') {
    return {
      kind: 'REALIZADO',
      label: 'Evento encerrado',
      hint: 'Veja as fotos no feed do evento.',
      disabled: true,
      variant: 'ghost',
    };
  }

  const minha: Participacao | null = event.minhaParticipacao;

  if (minha) {
    switch (minha.status) {
      case 'PENDENTE_PAGAMENTO': {
        const minutos = minutesLeftToPay(minha, now);
        return {
          kind: 'PAGAR',
          label: 'Pagar agora',
          hint:
            minutos != null && minutos > 0
              ? `Sua vaga está reservada por ${minutos} min.`
              : 'A reserva expirou.',
          disabled: false,
          variant: 'primary',
        };
      }
      case 'CONFIRMADA':
        return {
          kind: 'VER_INGRESSO',
          label: 'Ver meu ingresso',
          hint: 'Inscrição confirmada.',
          disabled: false,
          variant: 'primary',
        };
      case 'LISTA_ESPERA':
        return {
          kind: 'VER_FILA',
          label: `Você é o ${minha.posicaoFila ?? '?'}º da fila`,
          hint: 'Se abrir vaga, você tem 24 h para confirmar.',
          disabled: false,
          variant: 'secondary',
        };
      case 'OFERTA_PENDENTE':
        return {
          kind: 'CONFIRMAR_OFERTA',
          label: 'Confirmar vaga',
          hint: minha.ofertaExpiraEm
            ? `Confirme até ${formatDeadline(minha.ofertaExpiraEm)}.`
            : undefined,
          disabled: false,
          variant: 'primary',
        };
      case 'PRESENTE':
        return {
          kind: 'PUBLICAR_FOTO',
          label: 'Publicar foto',
          hint: 'Você fez check-in neste evento.',
          disabled: false,
          variant: 'secondary',
        };
      default:
        break;
    }
  }

  if (!enrollmentOpen(event, now)) {
    return {
      kind: 'ENCERRADO',
      label: 'Inscrições encerradas',
      hint: `Encerraram em ${formatDeadline(event.prazoInscricao)}.`,
      disabled: true,
      variant: 'ghost',
    };
  }

  if (availableSpots(event) === 0) {
    return {
      kind: 'LISTA_ESPERA',
      label: 'Entrar na lista de espera',
      hint:
        event.totalListaEspera > 0
          ? `${event.totalListaEspera} ${event.totalListaEspera === 1 ? 'pessoa' : 'pessoas'} na fila.`
          : 'Você seria o primeiro da fila.',
      disabled: false,
      variant: 'secondary',
    };
  }

  if (event.preco > 0) {
    return {
      kind: 'INSCREVER_PAGO',
      label: `Quero participar · ${event.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      hint: 'Você reserva a vaga e tem 60 min para pagar.',
      disabled: false,
      variant: 'primary',
    };
  }

  return {
    kind: 'INSCREVER',
    label: 'Quero participar',
    hint: 'Confirmação na hora.',
    disabled: false,
    variant: 'primary',
  };
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
