/**
 * Limites de escrita do feed — os MESMOS que o servidor aplica.
 *
 * Existem no cliente porque o campo precisa dizer "faltam letras" antes de
 * gastar uma ida ao servidor; a autoridade continua sendo o servidor, que
 * responde 422 `LEGENDA_CURTA`/`LEGENDA_LONGA` (RF-036) e
 * `TEXTO_CURTO`/`TEXTO_LONGO` (RF-038). Divergência entre os dois números é
 * defeito: o aluno escreveria o texto inteiro para ser recusado no envio.
 */

export const LIMITES_FEED = {
  LEGENDA_MIN: 2,
  LEGENDA_MAX: 500,
  COMENTARIO_MIN: 2,
  COMENTARIO_MAX: 280,
} as const;

export interface EstadoTexto {
  /** Pode enviar: dentro do mínimo e do máximo, já sem espaços nas pontas. */
  valido: boolean;
  /**
   * Erro de verdade — o texto passou do limite. Campo ainda curto NÃO é erro:
   * é o estado normal de quem começou a escrever agora, e marcar vermelho na
   * primeira letra treina a pessoa a ignorar o vermelho.
   */
  erro: string | null;
  /** Orientação: quanto falta, ou quanto já foi usado. */
  dica: string;
}

/** Estado do campo de legenda de uma publicação (RF-036). */
export function estadoDaLegenda(bruto: string): EstadoTexto {
  return estadoDeTexto(
    bruto,
    LIMITES_FEED.LEGENDA_MIN,
    LIMITES_FEED.LEGENDA_MAX,
    `Escreva pelo menos ${LIMITES_FEED.LEGENDA_MIN} letras na legenda.`,
    `A legenda cabe em ${LIMITES_FEED.LEGENDA_MAX} caracteres.`,
  );
}

/** Estado do campo de comentário (RF-038). */
export function estadoDoComentario(bruto: string): EstadoTexto {
  return estadoDeTexto(
    bruto,
    LIMITES_FEED.COMENTARIO_MIN,
    LIMITES_FEED.COMENTARIO_MAX,
    `Escreva pelo menos ${LIMITES_FEED.COMENTARIO_MIN} letras.`,
    `O comentário cabe em ${LIMITES_FEED.COMENTARIO_MAX} caracteres.`,
  );
}

function estadoDeTexto(
  bruto: string,
  minimo: number,
  maximo: number,
  mensagemCurto: string,
  mensagemLongo: string,
): EstadoTexto {
  // O servidor valida o texto já aparado; validar o bruto aqui aprovaria um
  // campo com 300 espaços.
  const limpo = bruto.trim();
  return {
    valido: limpo.length >= minimo && limpo.length <= maximo,
    erro: limpo.length > maximo ? mensagemLongo : null,
    dica: limpo.length < minimo ? mensagemCurto : `${bruto.length}/${maximo} caracteres`,
  };
}
