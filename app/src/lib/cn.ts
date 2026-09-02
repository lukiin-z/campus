/**
 * Junta classes condicionalmente. Sem dependência externa: `clsx` resolveria o
 * mesmo problema, e a stdlib do projeto (uma função de 3 linhas) já basta —
 * dependência nova exige justificar por que o que existe não serve.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
