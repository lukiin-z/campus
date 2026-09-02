import { initials } from '../../domain/format';
import { cn } from '../../lib/cn';

type AvatarSize = 'sm' | 'md' | 'lg';

const TAMANHOS: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-mono-xs',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-20 w-20 text-display-md',
};

/**
 * Avatar de iniciais. Não há upload de foto na v1 (nem storage, nem moderação de
 * imagem no CP4/CP5): a cor é derivada de `seed`, então a mesma pessoa tem
 * sempre a mesma cor.
 */
const PALETA = [
  'bg-coral-200 text-coral-800',
  'bg-teal-200 text-teal-800',
  'bg-neutral-300 text-neutral-800',
  'bg-coral-100 text-coral-700',
  'bg-teal-100 text-teal-700',
  'bg-neutral-200 text-neutral-700',
] as const;

export function Avatar({
  nome,
  seed,
  tamanho = 'md',
  className,
}: {
  nome: string;
  seed: number;
  tamanho?: AvatarSize;
  className?: string;
}) {
  const cor = PALETA[seed % PALETA.length] ?? PALETA[0];
  return (
    <span
      role="img"
      aria-label={`Avatar de ${nome}`}
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full font-display font-bold',
        TAMANHOS[tamanho],
        cor,
        className,
      )}
    >
      {initials(nome)}
    </span>
  );
}
