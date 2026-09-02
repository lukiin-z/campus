import { cn } from '../../lib/cn';

/**
 * Capa do evento, gerada localmente a partir de `capaSeed`.
 *
 * Não há upload nem storage de imagem no CP4/CP5 (RFX-11 / ADR-0003): a capa é
 * um par de cores da própria paleta, determinístico pela semente. O ganho é
 * concreto — o app funciona sem rede externa, sem moderação de imagem e sem
 * dependência de terceiro na demo.
 *
 * As 12 combinações são classes literais porque o Tailwind precisa vê-las em
 * tempo de build; gerar a string dinamicamente as apagaria do CSS final.
 */
const CAPAS = [
  'from-coral-300 to-coral-600',
  'from-teal-300 to-teal-600',
  'from-coral-200 to-teal-500',
  'from-neutral-300 to-neutral-700',
  'from-coral-400 to-coral-800',
  'from-teal-200 to-teal-700',
  'from-coral-300 to-teal-600',
  'from-neutral-400 to-coral-700',
  'from-teal-400 to-neutral-800',
  'from-coral-200 to-coral-500',
  'from-teal-300 to-neutral-700',
  'from-coral-400 to-teal-700',
] as const;

export function EventCover({
  seed,
  titulo,
  altura = 'md',
  className,
}: {
  seed: number;
  titulo: string;
  altura?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const gradiente = CAPAS[(seed - 1) % CAPAS.length] ?? CAPAS[0];
  const alturas = { sm: 'h-20', md: 'h-40', lg: 'h-56' } as const;

  return (
    <div
      role="img"
      aria-label={`Capa do evento ${titulo}`}
      className={cn(
        'w-full overflow-hidden rounded-lg bg-gradient-to-br',
        gradiente,
        alturas[altura],
        className,
      )}
    />
  );
}
