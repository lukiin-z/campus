import type { Evento, PoliticaReembolso } from '../types';
import { DAY_MS, HOUR_MS, POLICY, toMs } from './policy';

/**
 * Reembolso — RN-013.
 *
 * A política aplicada é sempre a que estava vigente no momento do pagamento,
 * congelada em `Participacao.politicaVigente`. Alterar a política de um evento
 * com pagamento confirmado não retroage: seria mudar o que a pessoa aceitou.
 */

export function currentPolicy(now: Date | string): PoliticaReembolso {
  return {
    reembolsoIntegralDiasAntes: POLICY.FULL_REFUND_DAYS_BEFORE,
    reembolsoParcialHorasAntes: POLICY.PARTIAL_REFUND_HOURS_BEFORE,
    reembolsoParcialTaxa: POLICY.PARTIAL_REFUND_RATE,
    congeladaEm: new Date(toMs(now)).toISOString(),
  };
}

export type RefundReason = 'ALUNO_CANCELOU' | 'EVENTO_CANCELADO' | 'EVENTO_ALTERADO';

export interface RefundResult {
  /** Fração devolvida: 1 = integral, 0.5 = parcial, 0 = sem reembolso. */
  taxa: number;
  valor: number;
  faixa: 'INTEGRAL' | 'PARCIAL' | 'SEM_REEMBOLSO';
  /** Texto exibido ao aluno, no tom de voz da marca. */
  explicacao: string;
}

/**
 * RN-013 — escala pela antecedência em relação ao INÍCIO do evento.
 *
 * Cancelamento pelo organizador e alteração de data/local/preço dão 100%
 * independentemente da antecedência: quem muda as condições é quem assume o custo.
 */
export function computeRefund(
  event: Pick<Evento, 'inicio'>,
  valorPago: number,
  motivo: RefundReason,
  now: Date | string,
  politica: PoliticaReembolso,
): RefundResult {
  if (valorPago <= 0) {
    return {
      taxa: 0,
      valor: 0,
      faixa: 'SEM_REEMBOLSO',
      explicacao: 'Evento gratuito: não há valor a devolver.',
    };
  }

  if (motivo === 'EVENTO_CANCELADO' || motivo === 'EVENTO_ALTERADO') {
    return {
      taxa: 1,
      valor: round2(valorPago),
      faixa: 'INTEGRAL',
      explicacao:
        motivo === 'EVENTO_CANCELADO'
          ? 'O evento foi cancelado pelo organizador: você recebe o valor integral de volta.'
          : 'O organizador alterou data, local ou preço: você recebe o valor integral de volta.',
    };
  }

  const antecedenciaMs = toMs(event.inicio) - toMs(now);
  const limiteIntegral = politica.reembolsoIntegralDiasAntes * DAY_MS;
  const limiteParcial = politica.reembolsoParcialHorasAntes * HOUR_MS;

  if (antecedenciaMs >= limiteIntegral) {
    return {
      taxa: 1,
      valor: round2(valorPago),
      faixa: 'INTEGRAL',
      explicacao: `Cancelamento com mais de ${politica.reembolsoIntegralDiasAntes} dias de antecedência: reembolso integral.`,
    };
  }

  if (antecedenciaMs >= limiteParcial) {
    const taxa = politica.reembolsoParcialTaxa;
    return {
      taxa,
      valor: round2(valorPago * taxa),
      faixa: 'PARCIAL',
      explicacao: `Cancelamento entre ${politica.reembolsoIntegralDiasAntes} dias e ${politica.reembolsoParcialHorasAntes} horas antes do evento: reembolso de ${Math.round(taxa * 100)}%.`,
    };
  }

  return {
    taxa: 0,
    valor: 0,
    faixa: 'SEM_REEMBOLSO',
    explicacao: `Cancelamento com menos de ${politica.reembolsoParcialHorasAntes} horas de antecedência: sem reembolso. A vaga é liberada para a fila de espera.`,
  };
}

/** Texto da política, exibido ANTES da cobrança (RN-013). */
export function policySummary(politica: PoliticaReembolso): string[] {
  return [
    `Cancelando com mais de ${politica.reembolsoIntegralDiasAntes} dias de antecedência: devolvemos 100%.`,
    `Entre ${politica.reembolsoIntegralDiasAntes} dias e ${politica.reembolsoParcialHorasAntes} horas antes: devolvemos ${Math.round(politica.reembolsoParcialTaxa * 100)}%.`,
    `Com menos de ${politica.reembolsoParcialHorasAntes} horas: sem devolução.`,
    'Se o organizador cancelar ou mudar data, local ou preço: devolvemos 100%.',
  ];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
