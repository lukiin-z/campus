import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Campos de formulário.
 *
 * A borda usa `border-strong` (#767D85), não `border`: a borda de um campo é
 * necessária para identificar o componente, então precisa de 3:1 — e #E7E5E0 dá
 * 1,22:1. Ver docs/06-marca/identidade-visual.md, seção 4.
 *
 * O erro é ligado ao campo por `aria-describedby` e `aria-invalid`, não só por
 * cor vermelha.
 */

const BASE_CONTROL =
  'w-full min-h-touch rounded-md border bg-surface px-4 py-3 font-body text-body-md text-text placeholder:text-text-subtle disabled:bg-surface-2 disabled:text-text-disabled';

function estadoBorda(erro?: string): string {
  return erro ? 'border-danger border-2' : 'border-border-strong';
}

interface WrapperProps {
  rotulo: string;
  htmlFor: string;
  erro?: string;
  dica?: string;
  idErro: string;
  idDica: string;
  children: ReactNode;
}

function Wrapper({ rotulo, htmlFor, erro, dica, idErro, idDica, children }: WrapperProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-mono-xs uppercase text-text-muted"
      >
        {rotulo}
      </label>
      {children}
      {dica && !erro && (
        <p id={idDica} className="mt-2 text-body-xs text-text-muted">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="mt-2 text-body-xs font-medium text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { rotulo, erro, dica, className, id, ...props },
  ref,
) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const idErro = `${campoId}-erro`;
  const idDica = `${campoId}-dica`;

  return (
    <Wrapper
      rotulo={rotulo}
      htmlFor={campoId}
      erro={erro}
      dica={dica}
      idErro={idErro}
      idDica={idDica}
    >
      <input
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : dica ? idDica : undefined}
        className={cn(BASE_CONTROL, estadoBorda(erro), className)}
        {...props}
      />
    </Wrapper>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { rotulo, erro, dica, className, id, ...props },
  ref,
) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const idErro = `${campoId}-erro`;
  const idDica = `${campoId}-dica`;

  return (
    <Wrapper
      rotulo={rotulo}
      htmlFor={campoId}
      erro={erro}
      dica={dica}
      idErro={idErro}
      idDica={idDica}
    >
      <textarea
        ref={ref}
        id={campoId}
        rows={4}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : dica ? idDica : undefined}
        className={cn(BASE_CONTROL, 'resize-none', estadoBorda(erro), className)}
        {...props}
      />
    </Wrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  opcoes: Array<{ valor: string; texto: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { rotulo, erro, dica, opcoes, className, id, ...props },
  ref,
) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const idErro = `${campoId}-erro`;
  const idDica = `${campoId}-dica`;

  return (
    <Wrapper
      rotulo={rotulo}
      htmlFor={campoId}
      erro={erro}
      dica={dica}
      idErro={idErro}
      idDica={idDica}
    >
      <select
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : dica ? idDica : undefined}
        className={cn(BASE_CONTROL, estadoBorda(erro), className)}
        {...props}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>
    </Wrapper>
  );
});
