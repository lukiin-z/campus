import type { Database } from './db';
import { getDb, nextId, transaction } from './db';
import { occupiesSpot } from '../domain/capacity';
import { paymentExpired } from '../domain/payment';
import { offerExpired, planPromotion, recomputePositions } from '../domain/waitlist';
import { POLICY } from '../domain/policy';

/**
 * Expiração de prazos — RN-012 (janela de pagamento) e RN-008 (janela da oferta).
 *
 * ## Por que este módulo existe
 *
 * `paymentExpired`, `offerExpired` e `planPromotion` já existiam no domínio e
 * eram exercitadas por teste unitário. **Nenhum handler as chamava.** A revisão
 * dos diagramas do CP5 encontrou a consequência observável: o cronômetro da
 * cobrança chegava a zero na tela e o pagamento continuava sendo aceito, porque
 * nada nunca mudava a participação para `EXPIRADA`. As transições existiam no
 * papel e não aconteciam no software.
 *
 * ## Por que é preguiçoso, e não agendado
 *
 * A expiração acontece na chegada da requisição, antes de o handler decidir
 * qualquer coisa — não em um `setInterval`. Três razões:
 *
 * 1. O CP5 roda dentro de um service worker no navegador de quem abriu a página.
 *    Um temporizador ali expira a vaga de quem está com a aba aberta e não a de
 *    quem fechou — o oposto do comportamento desejado.
 * 2. Expiração preguiçosa é **determinística no teste**: o teste controla o
 *    relógio movendo a data no dado, não esperando.
 * 3. É o que a API do CP6 vai fazer de todo jeito, no `guard` da requisição, com
 *    um job agendado por cima para o caso de ninguém pedir nada. O job é do CP6;
 *    a verificação na borda é o que faz a regra valer desde já.
 */

/** Quantas participações expiraram e quantas vagas foram reoferecidas. */
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

/** Uma varredura de leitura decide se vale abrir transação. */
function existePrazoVencido(agora: Date): boolean {
  return getDb().participacoes.some(
    (p) => paymentExpired(p, agora) || (p.status === 'OFERTA_PENDENTE' && offerExpired(p, agora)),
  );
}

/**
 * Aplica as expirações pendentes. Idempotente: chamar duas vezes seguidas não
 * muda nada na segunda.
 *
 * O caminho comum — nada vencido — não abre transação, só varre o array. Isso
 * importa porque a função roda em TODA requisição: a fila de escrita serializada
 * do mock é a mesma que sustenta a garantia de RNF-013, e enfileirar uma
 * transação vazia por requisição tornaria o teste de 50 inscrições concorrentes
 * uma medida da expiração em vez da capacidade.
 */
export async function aplicarExpiracoes(): Promise<ResultadoExpiracao> {
  if (!existePrazoVencido(new Date())) return NADA_EXPIROU;

  return transaction((db) => {
    const agora = new Date();
    const resultado: ResultadoExpiracao = {
      pagamentosExpirados: 0,
      ofertasExpiradas: 0,
      promovidos: 0,
    };

    /*
     * Uma passada por evento, e não por participação: liberar uma vaga pode
     * promover alguém da fila, e promover muda a contagem do MESMO evento.
     * Iterar participações soltas faria a promoção competir com a expiração
     * seguinte pela mesma vaga.
     */
    const eventosAfetados = new Set<string>();

    for (const participacao of db.participacoes) {
      const expirouPagamento = paymentExpired(participacao, agora);
      const expirouOferta =
        participacao.status === 'OFERTA_PENDENTE' && offerExpired(participacao, agora);

      if (!expirouPagamento && !expirouOferta) continue;

      const liberouVaga = occupiesSpot(participacao.status);

      participacao.status = 'EXPIRADA';
      participacao.pagamentoExpiraEm = null;
      participacao.ofertaExpiraEm = null;
      participacao.posicaoFila = null;
      // Oferta recusada por silêncio tem motivo próprio: o organizador precisa
      // distinguir quem desistiu de quem simplesmente não respondeu.
      participacao.motivoCancelamento = expirouOferta ? 'OFERTA_RECUSADA' : null;
      participacao.atualizadoEm = agora.toISOString();

      if (expirouPagamento) resultado.pagamentosExpirados += 1;
      if (expirouOferta) resultado.ofertasExpiradas += 1;

      if (liberouVaga) {
        const evento = db.eventos.find((e) => e.id === participacao.eventoId);
        if (evento) {
          evento.ocupadas = Math.max(0, evento.ocupadas - 1);
          eventosAfetados.add(evento.id);
        }
      }

      db.notificacoes.push({
        id: nextId('not'),
        destinatarioId: participacao.usuarioId,
        tipo: 'PAGAMENTO_EXPIRADO',
        titulo: expirouOferta ? 'A oferta de vaga expirou' : 'O prazo de pagamento acabou',
        mensagem: expirouOferta
          ? 'A vaga foi para a próxima pessoa da fila. Você pode entrar na fila de novo.'
          : 'A vaga foi liberada. Você pode se inscrever de novo se ainda houver lugar.',
        referenciaId: participacao.eventoId,
        lida: false,
        criadoEm: agora.toISOString(),
      });
    }

    for (const eventoId of eventosAfetados) {
      resultado.promovidos += reoferecerVaga(db, eventoId, agora);
    }

    return resultado;
  });
}

/**
 * RN-007 — oferece a vaga liberada ao primeiro da fila. Mesma sequência do
 * cancelamento manual (`DELETE /participacoes/:id`): recompõe as posições,
 * consulta `planPromotion`, e a vaga volta a ocupar enquanto a oferta corre.
 */
function reoferecerVaga(db: Database, eventoId: string, agora: Date): number {
  const evento = db.eventos.find((e) => e.id === eventoId);
  if (!evento) return 0;

  const participacoes = db.participacoes.filter((p) => p.eventoId === eventoId);
  for (const mudanca of recomputePositions(participacoes)) {
    const alvo = db.participacoes.find((p) => p.id === mudanca.id);
    if (alvo) alvo.posicaoFila = mudanca.posicaoFila;
  }

  const plano = planPromotion(evento, participacoes, agora);
  if (plano.tipo !== 'PROMOVER') return 0;

  const alvo = db.participacoes.find((p) => p.id === plano.participacaoId);
  if (!alvo) return 0;

  alvo.status = 'OFERTA_PENDENTE';
  alvo.ofertaExpiraEm = plano.ofertaExpiraEm;
  alvo.posicaoFila = null;
  alvo.atualizadoEm = agora.toISOString();
  evento.ocupadas += 1;

  const posterior = db.participacoes.filter((p) => p.eventoId === eventoId);
  for (const mudanca of recomputePositions(posterior)) {
    const item = db.participacoes.find((p) => p.id === mudanca.id);
    if (item) item.posicaoFila = mudanca.posicaoFila;
  }

  db.notificacoes.push({
    id: nextId('not'),
    destinatarioId: alvo.usuarioId,
    tipo: 'VAGA_LIBERADA',
    titulo: 'Abriu uma vaga para você',
    mensagem: `Confirme sua vaga em ${evento.titulo} dentro de ${POLICY.WAITLIST_OFFER_WINDOW_HOURS} h.`,
    referenciaId: evento.id,
    lida: false,
    criadoEm: agora.toISOString(),
  });

  return 1;
}
