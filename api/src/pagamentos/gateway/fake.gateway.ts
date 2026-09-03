import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { desfechoDeterministico, gerarCobrancaPix, webhookPagamentoSchema } from '@campus/shared';
import { AMBIENTE, type Ambiente } from '../../config/ambiente';
import {
  paraCentavos,
  paraReais,
  type CobrancaConsultada,
  type CobrancaCriada,
  type CobrancaSolicitada,
  type NotificacaoRecebida,
  type NotificacaoVerificada,
  type PaymentGateway,
  type ReembolsoRealizado,
  type ReembolsoSolicitado,
} from './pagamento.gateway';

/**
 * Gateway simulado — a implementação do plano B da dependência D-02 (ADR-0006).
 *
 * ## Determinístico, não sorteado
 *
 * O desfecho sai de `desfechoDeterministico`, a MESMA função que o CP5 usa: o
 * último dígito decide (1 → recusado, 2 → em análise, resto → aprovado). Um
 * gateway que sorteia não serve para demonstrar recusa — a demo dependeria de
 * sorte — nem para teste, que ficaria intermitente.
 *
 * É também o antídoto para o risco que a própria ADR-0006 registra: "um gateway
 * que sempre confirma em cinco segundos e nunca recusa ensina o app a assumir
 * sucesso". Aqui, um cartão terminado em 1 recusa **sempre**, e o teste da tela
 * de recusa não precisa de mock.
 *
 * ## O que este objeto NÃO faz
 *
 * Não move dinheiro, não fala com rede e não tem credencial. O `brCode` que ele
 * devolve é sintaticamente um payload EMV com CRC16 válido e aponta para uma
 * chave fictícia: um leitor de Pix reconhece o formato e a instituição recusa a
 * conta. É exatamente o que se quer — QR real de formato, zero centavos
 * transferíveis.
 */
@Injectable()
export class GatewayFake implements PaymentGateway {
  constructor(@Inject(AMBIENTE) private readonly ambiente: Ambiente) {}

  criarCobranca(entrada: CobrancaSolicitada): Promise<CobrancaCriada> {
    const transacaoId = `sim-${entrada.chaveIdempotencia}`;

    if (entrada.metodo === 'PIX') {
      /*
       * Pix nasce `AGUARDANDO`: quem paga é a pessoa, no app do banco, e o
       * desfecho chega pelo webhook. Confirmar na criação apagaria a janela de
       * RN-012 — que é justamente o que a tela mostra em contagem regressiva.
       */
      return Promise.resolve({
        transacaoId,
        status: 'AGUARDANDO',
        expiraEm: entrada.expiraEm,
        pix: gerarCobrancaPix({
          valor: paraReais(entrada.valorCentavos),
          referencia: entrada.participacaoId,
          expiraEm: entrada.expiraEm,
        }),
      });
    }

    /*
     * Cartão tem captura síncrona: o provedor responde na hora. O desfecho vem
     * dos quatro últimos dígitos, que são o único pedaço do número que a API
     * conhece (RNF-022) — e são suficientes, porque `desfechoDeterministico`
     * olha só o último.
     */
    const desfecho = desfechoDeterministico(entrada.cartao?.ultimosQuatro ?? '0');

    return Promise.resolve({
      transacaoId,
      status:
        desfecho === 'APROVADO'
          ? 'CONFIRMADO'
          : desfecho === 'RECUSADO'
            ? 'RECUSADO'
            : 'EM_ANALISE',
      expiraEm: entrada.expiraEm,
    });
  }

  /**
   * Consulta. O simulador não guarda estado: o desfecho é derivado do próprio
   * id da transação, então consultar duas vezes devolve a mesma coisa.
   *
   * Não guardar estado é decisão, não preguiça — estado no gateway fake seria
   * uma segunda fonte de verdade sobre o pagamento, competindo com a tabela
   * `pagamento`. Quando o adaptador real entrar, a autoridade sobre o status
   * continua sendo o provedor, consultado por este método.
   */
  consultarCobranca(transacaoId: string): Promise<CobrancaConsultada> {
    const desfecho = desfechoDeterministico(transacaoId);
    return Promise.resolve({
      transacaoId,
      status:
        desfecho === 'APROVADO'
          ? 'CONFIRMADO'
          : desfecho === 'RECUSADO'
            ? 'RECUSADO'
            : 'EM_ANALISE',
      valorCentavos: 0,
      ...(desfecho === 'RECUSADO' ? { motivoRecusa: 'Cartão recusado pelo emissor.' } : {}),
    });
  }

  /**
   * Reembolso. Devolve sempre `REEMBOLSADO` com o valor pedido: quem decide se
   * o reembolso é integral ou parcial é `computeRefund` (RN-013), pela política
   * **congelada** na participação — o gateway não conhece política nenhuma e não
   * deveria. O serviço traduz a faixa em `REEMBOLSADO` ou
   * `REEMBOLSADO_PARCIAL`.
   */
  reembolsar(entrada: ReembolsoSolicitado): Promise<ReembolsoRealizado> {
    return Promise.resolve({
      reembolsoId: `ref-${entrada.chaveIdempotencia}`,
      status: 'REEMBOLSADO',
      valorCentavos: entrada.valorCentavos,
      efetivadoEm: new Date().toISOString(),
    });
  }

  /**
   * Verificação da notificação — síncrona e pura, como a ADR-0006 exige.
   *
   * É o **único** lugar que decide se uma notificação é autêntica. RN-014 diz
   * que a confirmação de pagamento vem somente do gateway; sem verificação de
   * assinatura, essa frase não tem como ser verdadeira — qualquer pessoa com a
   * URL confirmaria a própria inscrição com um `curl`.
   *
   * O HMAC é sobre o corpo **bruto**, não sobre o JSON reserializado: ordem de
   * chave e espaçamento mudam a serialização e quebrariam a assinatura de um
   * provedor real. `timingSafeEqual` porque `===` em string vaza, pelo tempo de
   * execução, quantos bytes iniciais estão certos.
   */
  verificarNotificacao(entrada: NotificacaoRecebida): NotificacaoVerificada {
    const assinaturaRecebida = entrada.cabecalhos['x-assinatura'] ?? '';
    if (assinaturaRecebida.length === 0 || entrada.corpoBruto.length === 0) {
      return { valida: false, motivo: 'ASSINATURA_INVALIDA' };
    }

    const esperada = createHmac('sha256', this.ambiente.WEBHOOK_SECRET)
      .update(entrada.corpoBruto, 'utf8')
      .digest('hex');

    if (!assinaturasIguais(assinaturaRecebida, esperada)) {
      return { valida: false, motivo: 'ASSINATURA_INVALIDA' };
    }

    let corpo: unknown;
    try {
      corpo = JSON.parse(entrada.corpoBruto);
    } catch {
      return { valida: false, motivo: 'CORPO_MALFORMADO' };
    }

    // O MESMO schema que o controller usaria. A verificação é pura, então ela
    // valida a forma aqui e o serviço não precisa validar de novo.
    const lido = webhookPagamentoSchema.safeParse(corpo);
    if (!lido.success) return { valida: false, motivo: 'CORPO_MALFORMADO' };

    return {
      valida: true,
      tipo: lido.data.pago ? 'PAGAMENTO_CONFIRMADO' : 'PAGAMENTO_RECUSADO',
      transacaoId: lido.data.transacaoExternaId,
      chaveIdempotencia: lido.data.chaveIdempotencia,
      valorCentavos: paraCentavos(lido.data.valorPago),
    };
  }
}

function assinaturasIguais(recebida: string, esperada: string): boolean {
  const a = Buffer.from(recebida, 'utf8');
  const b = Buffer.from(esperada, 'utf8');
  // Tamanho diferente já é recusa, e `timingSafeEqual` lança nesse caso.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
