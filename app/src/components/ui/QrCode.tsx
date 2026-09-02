import { cn } from '../../lib/cn';

/**
 * QR Code do ingresso, desenhado como grade determinística a partir do código.
 *
 * NÃO é um QR Code legível por leitor: no CP4/CP5 o check-in por câmera não está
 * implementado (é RF-034, Sprint 3), e o ingresso já precisa existir para RF-033.
 * Gerar um QR de verdade exigiria uma dependência que só será usada no CP6 —
 * então aqui o desenho é representação visual, e o código alfanumérico impresso
 * abaixo é o que efetivamente identifica o ingresso (fallback de UC-005 A1).
 */
export function QrCode({ codigo, className }: { codigo: string; className?: string }) {
  const grade = gerarGrade(codigo, 21);

  return (
    <div
      role="img"
      aria-label={`Código de check-in ${codigo}`}
      className={cn(
        'grid aspect-square w-full max-w-full grid-cols-21 gap-px bg-surface',
        className,
      )}
    >
      {grade.map((ativo, indice) => (
        <span
          key={indice}
          aria-hidden="true"
          className={cn('aspect-square', ativo ? 'bg-neutral-900' : 'bg-surface')}
        />
      ))}
    </div>
  );
}

/**
 * Grade pseudoaleatória estável: o mesmo código produz sempre o mesmo desenho.
 * Os três cantos de referência são forçados, para o desenho parecer um QR.
 */
function gerarGrade(codigo: string, lado: number): boolean[] {
  let estado = 0;
  for (let i = 0; i < codigo.length; i += 1) {
    estado = (estado * 31 + codigo.charCodeAt(i)) % 2 ** 31;
  }

  const celulas: boolean[] = [];
  for (let linha = 0; linha < lado; linha += 1) {
    for (let coluna = 0; coluna < lado; coluna += 1) {
      if (ehMarcadorDeCanto(linha, coluna, lado)) {
        celulas.push(marcadorAtivo(linha, coluna, lado));
        continue;
      }
      estado = (estado * 1103515245 + 12345) % 2 ** 31;
      celulas.push(estado % 100 < 46);
    }
  }
  return celulas;
}

function ehMarcadorDeCanto(linha: number, coluna: number, lado: number): boolean {
  const dentro = (l: number, c: number) => l < 7 && c < 7;
  return (
    dentro(linha, coluna) || dentro(linha, lado - 1 - coluna) || dentro(lado - 1 - linha, coluna)
  );
}

function marcadorAtivo(linha: number, coluna: number, lado: number): boolean {
  const l = linha < 7 ? linha : lado - 1 - linha;
  const c = coluna < 7 ? coluna : lado - 1 - coluna;
  const borda = l === 0 || l === 6 || c === 0 || c === 6;
  const centro = l >= 2 && l <= 4 && c >= 2 && c <= 4;
  return borda || centro;
}
