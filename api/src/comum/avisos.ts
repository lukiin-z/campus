import { POLICY, type TipoNotificacao } from '@campus/shared';
import type { ClienteBanco } from './travas';

/**
 * Escrita de notificação — funções livres, não um serviço injetável.
 *
 * Notificação nasce **dentro** da transação que a causou: a vaga é oferecida e
 * o aviso é gravado no mesmo commit. Se fosse assíncrono, existiria uma janela
 * em que a vaga está reservada para alguém que não sabe disso — e o cronômetro
 * de 24 h correndo contra uma pessoa que não recebeu nada.
 *
 * Por isso a assinatura recebe o `ClienteBanco`: quem chama já está numa
 * transação e passa o `tx`. Um serviço injetável convidaria a usar o cliente
 * global por engano, gravando fora da transação.
 */

export interface NovoAviso {
  destinatarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  /** Id do objeto citado. Sem FK: aponta para tabelas diferentes por tipo. */
  referenciaId: string | null;
}

export async function avisar(cliente: ClienteBanco, aviso: NovoAviso): Promise<void> {
  await cliente.notificacao.create({ data: aviso });
}

export async function avisarMuitos(
  cliente: ClienteBanco,
  avisos: readonly NovoAviso[],
): Promise<void> {
  if (avisos.length === 0) return;
  await cliente.notificacao.createMany({ data: [...avisos] });
}

// ---------------------------------------------------------------------------
// Textos
//
// Ficam aqui, e não espalhados pelos services, porque o mesmo aviso é escrito
// por mais de um caminho: a vaga liberada nasce no cancelamento manual E na
// expiração de prazo. Dois textos para o mesmo evento é o começo de duas
// versões da mesma notícia.
// ---------------------------------------------------------------------------

export function avisoDeVagaLiberada(
  destinatarioId: string,
  evento: { id: string; titulo: string },
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'VAGA_LIBERADA',
    titulo: 'Abriu uma vaga para você',
    mensagem: `Confirme sua vaga em ${evento.titulo} dentro de ${POLICY.WAITLIST_OFFER_WINDOW_HOURS} h.`,
    referenciaId: evento.id,
  };
}

export function avisoDePrazoVencido(
  destinatarioId: string,
  eventoId: string,
  eraOferta: boolean,
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'PAGAMENTO_EXPIRADO',
    // Oferta recusada por silêncio e pagamento não feito são coisas diferentes
    // para quem recebe: uma volta para a fila, a outra volta para o começo.
    titulo: eraOferta ? 'A oferta de vaga expirou' : 'O prazo de pagamento acabou',
    mensagem: eraOferta
      ? 'A vaga foi para a próxima pessoa da fila. Você pode entrar na fila de novo.'
      : 'A vaga foi liberada. Você pode se inscrever de novo se ainda houver lugar.',
    referenciaId: eventoId,
  };
}

export function avisoDePagamentoConfirmado(
  destinatarioId: string,
  participacaoId: string,
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'PAGAMENTO_CONFIRMADO',
    titulo: 'Pagamento confirmado',
    mensagem: 'Sua vaga está garantida. O ingresso já está no seu perfil.',
    referenciaId: participacaoId,
  };
}

export function avisoDeEventoCancelado(
  destinatarioId: string,
  evento: { id: string; titulo: string },
  motivo: string,
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'EVENTO_CANCELADO',
    titulo: `${evento.titulo} foi cancelado`,
    mensagem: motivo,
    referenciaId: evento.id,
  };
}

export function avisoDeEventoAlterado(
  destinatarioId: string,
  evento: { id: string; titulo: string },
  oQueMudou: string,
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'EVENTO_ALTERADO',
    titulo: `${evento.titulo} mudou`,
    mensagem: oQueMudou,
    referenciaId: evento.id,
  };
}

export function avisoDeEventoAprovado(
  destinatarioId: string,
  evento: { id: string; titulo: string },
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'EVENTO_APROVADO',
    titulo: `${evento.titulo} foi aprovado`,
    mensagem: 'O evento já está publicado para toda a faculdade.',
    referenciaId: evento.id,
  };
}

export function avisoDeCheckinRealizado(
  destinatarioId: string,
  evento: { id: string; titulo: string },
): NovoAviso {
  return {
    destinatarioId,
    tipo: 'CHECKIN_REALIZADO',
    titulo: 'Check-in confirmado',
    mensagem: `Sua presença em ${evento.titulo} foi registrada.`,
    referenciaId: evento.id,
  };
}
