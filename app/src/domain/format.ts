import type { Evento } from '../types/domain';

/**
 * Formatação de dados para a UI. Fica no domínio porque a forma de apresentar
 * data, hora e preço é decisão de produto (tom de voz da marca), não de
 * componente — e precisa ser idêntica em todas as telas.
 */

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/** "Sáb, 12 set · 13h" — o formato do cartão-ingresso. */
export function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  const dia = DIAS_CURTOS[d.getDay()] ?? '';
  const mes = MESES_CURTOS[d.getMonth()] ?? '';
  const hora = d.getMinutes() === 0 ? `${d.getHours()}h` : formatTime(iso);
  return `${dia}, ${d.getDate()} ${mes} · ${hora}`;
}

/** "13h" ou "19h30". Hora cheia sem os dois zeros — é como o público escreve. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const minutos = d.getMinutes();
  return minutos === 0 ? `${d.getHours()}h` : `${d.getHours()}h${String(minutos).padStart(2, '0')}`;
}

/** Dia e mês para a coluna de data do item de lista. */
export function formatDayMonth(iso: string): { dia: string; mes: string } {
  const d = new Date(iso);
  return {
    dia: String(d.getDate()).padStart(2, '0'),
    mes: MESES_CURTOS[d.getMonth()] ?? '',
  };
}

/** "12 de setembro de 2026, 13h" — usado no detalhe e no ingresso. */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** "há 2h", "há 5 min", "ontem" — feed social. */
export function formatRelative(iso: string, now: Date | string = new Date()): string {
  const diffMs = new Date(now).getTime() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return formatFullDate(iso);
}

/** "18/40 vagas" — sempre o número, nunca "quase lotado". */
export function formatSpots(event: Pick<Evento, 'capacidade' | 'ocupadas'>): string {
  return `${event.ocupadas}/${event.capacidade} vagas`;
}

/** Duração do intervalo do evento: "13h – 18h" ou "18h – dom, 20h". */
export function formatEventRange(inicio: string, fim: string): string {
  const a = new Date(inicio);
  const b = new Date(fim);
  if (a.toDateString() === b.toDateString()) {
    return `${formatTime(inicio)} – ${formatTime(fim)}`;
  }
  const diaFim = DIAS_CURTOS[b.getDay()] ?? '';
  return `${formatTime(inicio)} – ${diaFim.toLowerCase()}, ${formatTime(fim)}`;
}

/** Iniciais para o avatar. Duas letras no máximo. */
export function initials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '?';
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] : undefined;
  return `${primeira}${ultima ?? ''}`.toUpperCase();
}
