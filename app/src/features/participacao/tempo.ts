import { MINUTE_MS } from '../../domain/policy';

/**
 * Texto de tempo RESTANTE.
 *
 * Não vive em `domain/format.ts` porque lá a formatação é de instante e de
 * intervalo passado (`formatRelative`, `formatEventRange`); aqui é contagem
 * regressiva, que só a tela de participação usa. Se um terceiro caso aparecer,
 * o lugar disto passa a ser o domínio.
 */

/**
 * Precisão que a pessoa vê: segundos só quando falta menos de uma hora. Acima
 * disso, segundo é ruído — ninguém decide nada com "23 h 14 min 07 s".
 */
export function formatarRestante(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  if (horas > 0) return `${horas} h ${doisDigitos(minutos)} min`;
  if (minutos > 0) return `${minutos} min ${doisDigitos(segundos)} s`;
  return `${segundos} s`;
}

/**
 * Precisão que o leitor de tela ANUNCIA: minuto. O texto só muda quando o
 * minuto vira, e é isso que impede a região `aria-live` de falar a cada
 * segundo (RNF-003).
 */
export function formatarRestanteEmMinutos(ms: number): string {
  const totalMinutos = Math.max(0, Math.ceil(ms / MINUTE_MS));
  if (totalMinutos === 0) return 'Menos de um minuto restante.';

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (horas === 0) return `${totalMinutos} ${totalMinutos === 1 ? 'minuto' : 'minutos'} restantes.`;
  if (minutos === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'} restantes.`;
  return `${horas} h e ${minutos} min restantes.`;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}
