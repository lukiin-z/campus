import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { classificarLeitura } from '@campus/shared';

/**
 * Leitor simulado (RF-034).
 *
 * A câmera é do CP6: aqui a leitura é digitada ou colada. As três formas que
 * aparecem na porta de um evento são aceitas — token do QR, código de 8 dígitos
 * e código impresso `CMP-XXXX-0000` — porque `classificarLeitura` já as
 * distingue, e é a mesma função que o leitor real vai usar.
 *
 * Entrada irreconhecível NÃO é bloqueada: validar lixo devolve "Ingresso
 * inválido", e essa é uma resposta que o operador precisa poder ver.
 */

const RECONHECIDO: Record<ReturnType<typeof classificarLeitura>['tipo'], string> = {
  TOKEN: 'Token do QR Code reconhecido.',
  CODIGO_NUMERICO: 'Código numérico de 8 dígitos reconhecido.',
  CODIGO_LEGIVEL: 'Código impresso reconhecido.',
  INDECIFRAVEL: 'Formato não reconhecido — validar vai recusar como ingresso inválido.',
};

export function ScannerInput({
  valor,
  onChange,
  onValidar,
  validando,
}: {
  valor: string;
  onChange: (valor: string) => void;
  onValidar: () => void;
  validando: boolean;
}) {
  const leitura = classificarLeitura(valor);

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        if (valor.trim()) onValidar();
      }}
    >
      <Input
        rotulo="Leitura do ingresso"
        placeholder="Cole o token, ou digite os 8 dígitos"
        autoComplete="off"
        autoCapitalize="characters"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        dica="Leitor simulado: a leitura por câmera entra no CP6. Aqui vale o token do QR, o código de 8 dígitos ou o código impresso (CMP-3ESPX-0184)."
      />

      <p aria-live="polite" className="-mt-2 mb-4 font-mono text-mono-sm text-text-muted">
        {valor.trim() === '' ? 'Aguardando leitura.' : RECONHECIDO[leitura.tipo]}
      </p>

      <Button
        type="submit"
        size="lg"
        larguraTotal
        carregando={validando}
        disabled={valor.trim() === ''}
      >
        Validar
      </Button>
    </form>
  );
}
