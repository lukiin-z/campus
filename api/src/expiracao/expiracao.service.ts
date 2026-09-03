import { Injectable, Logger } from '@nestjs/common';
import { occupiesSpot, offerExpired, paymentExpired } from '@campus/shared';
import { avisar, avisoDePrazoVencido } from '../comum/avisos';
import { paraParticipacao } from '../comum/mapeadores';
import { reoferecerVaga } from '../comum/promocao';
import { travarEvento } from '../comum/travas';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Expiração de prazos — RN-012 (janela de pagamento) e RN-008 (janela da oferta).
 *
 * ## Por que este serviço existe
 *
 * `paymentExpired`, `offerExpired` e `planPromotion` já existiam no domínio e
 * eram exercitadas por teste unitário. **Nenhum handler as chamava.** A revisão
 * do CP5 encontrou a consequência observável: o cronômetro da cobrança chegava a
 * zero na tela e o pagamento continuava sendo aceito, porque nada nunca mudava a
 * participação para `EXPIRADA`. As transições existiam no papel e não aconteciam
 * no software. Foi um defeito real, não um risco hipotético.
 *
 * ## Preguiçoso na borda E agendável — as duas coisas
 *
 * `aplicar()` é público justamente para um job poder chamá-lo. Mas ele também
 * roda na borda de toda requisição (`ExpiracaoInterceptor`), e a razão é a mesma
 * do CP5: sem a verificação preguiçosa, o comportamento depende de o job estar
 * de pé. Com ela, a regra vale mesmo que o agendador falhe — e o teste controla
 * o relógio movendo a data no dado, sem esperar.
 *
 * O job continua sendo necessário: ninguém pedindo nada é o caso em que a vaga
 * ficaria presa até a manhã seguinte, e a fila esperando por ela.
 *
 * ## O atalho de leitura
 *
 * `existePrazoVencido` é um `COUNT` com índice parcial
 * (`ix_participacao_expira`, `ix_participacao_oferta`). O caminho comum — nada
 * vencido — não abre transação. Isso importa porque a função roda em toda
 * requisição: abrir uma transação vazia por requisição transformaria o teste de
 * 50 inscrições concorrentes numa medida da expiração em vez da capacidade.
 */

export interface ResultadoExpiracao {
  pagamentosExpirados: number;
  ofertasExpiradas: number;
  promovidos: number;
}

const NADA_EXPIROU: ResultadoExpiracao = {
  pagamentosExpirados: 0,
  ofertasExpiradas: 0,
  promovidos: 0,
};

@Injectable()
export class ExpiracaoService {
  private readonly log = new Logger(ExpiracaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Uma varredura de leitura decide se vale abrir transação. */
  async existePrazoVencido(agora: Date = new Date()): Promise<boolean> {
    const vencidos = await this.prisma.participacao.count({
      where: {
        OR: [
          { status: 'PENDENTE_PAGAMENTO', pagamentoExpiraEm: { lte: agora } },
          { status: 'OFERTA_PENDENTE', ofertaExpiraEm: { lte: agora } },
        ],
      },
    });
    return vencidos > 0;
  }

  /**
   * Aplica as expirações pendentes. **Idempotente**: chamar duas vezes seguidas
   * não muda nada na segunda.
   *
   * Público para o job agendado. Não recebe `now`: o relógio da expiração é o do
   * servidor, e um parâmetro aqui seria uma porta para expirar vaga no passado.
   */
  async aplicar(): Promise<ResultadoExpiracao> {
    if (!(await this.existePrazoVencido())) return NADA_EXPIROU;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const agora = new Date();
      const contagem: ResultadoExpiracao = {
        pagamentosExpirados: 0,
        ofertasExpiradas: 0,
        promovidos: 0,
      };

      /*
       * O `WHERE` é um superconjunto: quem decide se expirou são
       * `paymentExpired` e `offerExpired`. O SQL só evita varrer a tabela.
       */
      const candidatas = await tx.participacao.findMany({
        where: {
          OR: [
            { status: 'PENDENTE_PAGAMENTO', pagamentoExpiraEm: { lte: agora } },
            { status: 'OFERTA_PENDENTE', ofertaExpiraEm: { lte: agora } },
          ],
        },
        orderBy: { eventoId: 'asc' },
      });

      /*
       * Travar os eventos ANTES de mexer em qualquer participação, em ordem de
       * id. Duas razões:
       *
       * 1. Liberar vaga escreve `ocupadas`, e escrever `ocupadas` sem trava é o
       *    overbooking de RN-004 por outra porta — uma inscrição concorrente
       *    poderia ler a contagem no meio.
       * 2. Ordem fixa evita deadlock: duas execuções desta rotina que travassem
       *    os mesmos dois eventos em ordens opostas se bloqueariam mutuamente.
       */
      const eventosAfetados = [...new Set(candidatas.map((p) => p.eventoId))].sort();
      for (const eventoId of eventosAfetados) {
        await travarEvento(tx, eventoId);
      }

      /*
       * Uma passada por participação para expirar, e só DEPOIS uma passada por
       * evento para reoferecer. Intercalar faria a promoção de uma vaga
       * competir com a expiração seguinte do mesmo evento pela mesma vaga.
       */
      const vagasLiberadasPorEvento = new Map<string, number>();

      for (const linha of candidatas) {
        const participacao = paraParticipacao(linha);
        const expirouPagamento = paymentExpired(participacao, agora);
        const expirouOferta =
          participacao.status === 'OFERTA_PENDENTE' && offerExpired(participacao, agora);

        if (!expirouPagamento && !expirouOferta) continue;

        const liberouVaga = occupiesSpot(participacao.status);

        await tx.participacao.update({
          where: { id: linha.id },
          data: {
            status: 'EXPIRADA',
            pagamentoExpiraEm: null,
            ofertaExpiraEm: null,
            posicaoFila: null,
            // Oferta recusada por silêncio tem motivo próprio: o organizador
            // precisa distinguir quem desistiu de quem não respondeu.
            motivoCancelamento: expirouOferta ? 'OFERTA_RECUSADA' : null,
          },
        });

        if (expirouPagamento) contagem.pagamentosExpirados += 1;
        if (expirouOferta) contagem.ofertasExpiradas += 1;

        if (liberouVaga) {
          vagasLiberadasPorEvento.set(
            linha.eventoId,
            (vagasLiberadasPorEvento.get(linha.eventoId) ?? 0) + 1,
          );
        }

        await avisar(tx, avisoDePrazoVencido(linha.usuarioId, linha.eventoId, expirouOferta));
      }

      for (const [eventoId, liberadas] of vagasLiberadasPorEvento) {
        const evento = await tx.evento.findUnique({
          where: { id: eventoId },
          select: { ocupadas: true },
        });
        if (!evento) continue;

        // `Math.max` e não `decrement`: uma contagem que ficasse negativa
        // violaria `ck_evento_ocupadas_le_capacidade` e derrubaria a rotina
        // inteira por causa de uma linha inconsistente.
        await tx.evento.update({
          where: { id: eventoId },
          data: { ocupadas: Math.max(0, evento.ocupadas - liberadas) },
        });

        // Uma promoção por vaga liberada. `reoferecerVaga` para quando a fila
        // acaba ou quando a janela fica inviável (RN-007, item 5).
        for (let i = 0; i < liberadas; i += 1) {
          const promovido = await reoferecerVaga(tx, eventoId, agora);
          if (promovido === null) break;
          contagem.promovidos += 1;
        }
      }

      return contagem;
    });

    if (resultado.pagamentosExpirados + resultado.ofertasExpiradas > 0) {
      this.log.log(
        `prazos aplicados: ${resultado.pagamentosExpirados} pagamento(s), ` +
          `${resultado.ofertasExpiradas} oferta(s), ${resultado.promovidos} promoção(ões)`,
      );
    }

    return resultado;
  }
}
