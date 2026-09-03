import type { CobrancaPix, MetodoPagamento, ResumoCartao, StatusPagamento } from '@campus/shared';

/**
 * `PaymentGateway` — a fronteira de pagamento (ADR-0006).
 *
 * Quatro métodos, sem herança, sem factory, sem registro dinâmico. A ADR abre
 * exceção deliberada à regra "não abstraia antes do terceiro caso" por três
 * motivos, e o principal é este: **a interface não tem campo de cartão**. Não
 * existe `numeroCartao`, `cvv` nem `validade` em nenhum tipo daqui. RNF-022
 * deixa de depender de disciplina de quem chama e passa a ser propriedade do
 * tipo — o dado proibido não tem por onde entrar.
 *
 * ## Divergências declaradas com a assinatura da ADR-0006
 *
 * A ADR previu que a assinatura mudaria no CP6 ("parte do desenho de hoje é
 * hipótese, e está declarada como hipótese"). Duas mudanças aconteceram, e as
 * duas são para casar com o contrato de rota, que é a autoridade sobre a forma
 * da resposta:
 *
 * 1. `CobrancaCriada.pix` é `CobrancaPix` (`{ chave, brCode, expiraEm }`) e não
 *    `{ copiaECola, qrCodeBase64 }`. É o mesmo dado — `brCode` É o copia-e-cola
 *    — no tipo que `@campus/shared` já exporta e que o schema `Pagamento` do
 *    `openapi.yaml` descreve. Um segundo tipo para o mesmo payload divergiria.
 * 2. `criarCobranca` recebe `cartao?: ResumoCartao`. Não é dado de cartão no
 *    sentido de RNF-022: são os quatro últimos dígitos, a bandeira e o titular
 *    — o que já está declarado na tabela `pagamento` e no schema
 *    `ResumoCartao`. É o que o gateway fake usa para produzir desfecho
 *    determinístico, e é o que um adaptador real usaria para antifraude.
 *
 * ## Dinheiro em centavos
 *
 * Todo valor desta interface é inteiro, em centavos. Nenhum ponto flutuante
 * atravessa a fronteira de pagamento. A conversão de e para `number` em reais —
 * que é como `@campus/shared` declara `preco` e `valor` — acontece no serviço,
 * num lugar só.
 */

/** Solicitação de cobrança. Não carrega número, validade nem CVV — RNF-022. */
export interface CobrancaSolicitada {
  readonly participacaoId: string;
  readonly valorCentavos: number;
  readonly metodo: MetodoPagamento;
  readonly descricao: string;
  /** ISO 8601. `min(agora + 60min, prazoInscricao, inicio - 1h)` — RN-012. */
  readonly expiraEm: string;
  /** Chave de idempotência gerada por nós, estável por tentativa — RN-014. */
  readonly chaveIdempotencia: string;
  /** Só em cartão: o resumo que sobreviveu ao formulário. */
  readonly cartao?: ResumoCartao;
}

export interface CobrancaCriada {
  /** Identificador da transação no provedor. Único dado do gateway que persistimos. */
  readonly transacaoId: string;
  readonly status: StatusPagamento;
  readonly expiraEm: string;
  /** Presente quando `metodo === 'PIX'`. */
  readonly pix?: CobrancaPix;
}

export interface CobrancaConsultada {
  readonly transacaoId: string;
  readonly status: StatusPagamento;
  readonly valorCentavos: number;
  readonly pagoEm?: string;
  readonly motivoRecusa?: string;
}

export interface ReembolsoSolicitado {
  readonly transacaoId: string;
  /** Integral ou parcial conforme a política congelada na participação — RN-013. */
  readonly valorCentavos: number;
  readonly chaveIdempotencia: string;
  readonly motivo: string;
}

export interface ReembolsoRealizado {
  readonly reembolsoId: string;
  readonly status: StatusPagamento;
  readonly valorCentavos: number;
  readonly efetivadoEm?: string;
}

/** Requisição bruta recebida no webhook. Superfície pública, não confiável. */
export interface NotificacaoRecebida {
  readonly corpoBruto: string;
  readonly cabecalhos: Readonly<Record<string, string>>;
}

export type NotificacaoVerificada =
  | {
      readonly valida: true;
      readonly tipo: 'PAGAMENTO_CONFIRMADO' | 'PAGAMENTO_RECUSADO' | 'REEMBOLSO_EFETIVADO';
      readonly transacaoId: string;
      readonly chaveIdempotencia: string;
      readonly valorCentavos: number;
      /*
       * `ocorridoEm` NÃO está aqui, e a ausência é a correção de um defeito.
       *
       * O campo existia e o fake o preenchia com `new Date().toISOString()`, o
       * que tornava impura uma função cuja assinatura promete pureza logo
       * abaixo — e o teste "é pura" dela reprovava por diferença de 1 ms,
       * intermitentemente, inclusive na CI.
       *
       * Ninguém o lia: um produtor, zero consumidores. Um gateway real que
       * envie o instante do evento deve declará-lo em `webhookPagamentoSchema`,
       * para que o valor venha do CORPO ASSINADO — e não do relógio de quem
       * está verificando a assinatura, que é a única fonte que não prova nada.
       */
    }
  | {
      readonly valida: false;
      readonly motivo: 'ASSINATURA_INVALIDA' | 'CORPO_MALFORMADO' | 'EVENTO_IGNORADO';
    };

export interface PaymentGateway {
  criarCobranca(entrada: CobrancaSolicitada): Promise<CobrancaCriada>;
  consultarCobranca(transacaoId: string): Promise<CobrancaConsultada>;
  reembolsar(entrada: ReembolsoSolicitado): Promise<ReembolsoRealizado>;
  /**
   * Síncrona e pura: só verifica assinatura e formato. Não toca rede nem banco.
   *
   * "Pura" aqui é afirmação verificada, não intenção: há um caso que chama duas
   * vezes com a mesma entrada e exige resultado idêntico.
   */
  verificarNotificacao(entrada: NotificacaoRecebida): NotificacaoVerificada;
}

/** Token de injeção. `PaymentGateway` é interface: não existe em runtime. */
export const GATEWAY_DE_PAGAMENTO = 'CAMPUS_GATEWAY_DE_PAGAMENTO';

/** Reais → centavos, sem ponto flutuante depois desta linha. */
export function paraCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/** Centavos → reais. Só para devolver ao contrato, que declara `number`. */
export function paraReais(centavos: number): number {
  return Math.round(centavos) / 100;
}
