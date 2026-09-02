import type { ResultadoCheckin } from '../../types/domain';
import { cn } from '../../lib/cn';

/**
 * Retorno da validação (RF-034).
 *
 * Recusa não é erro: "ingresso já utilizado" é uma resposta do sistema, e o
 * operador na porta precisa lê-la de relance, a metros de distância e com fila
 * andando. Daí o veredito em corpo grande.
 *
 * O estado não é comunicado só por cor (WCAG 1.4.1): a palavra ACEITO / RECUSADO
 * e o símbolo dizem a mesma coisa que o verde e o vermelho. E o papel muda com o
 * desfecho — recusa é `alert`, porque interrompe o fluxo da porta; aceite é
 * `status`, que não rouba o foco do leitor de tela no meio da fila.
 */
export function ScanResult({ resultado }: { resultado: ResultadoCheckin }) {
  const aceito = resultado.aceito;

  return (
    <div
      role={aceito ? 'status' : 'alert'}
      className={cn(
        'rounded-lg border-3 p-6 text-center',
        aceito ? 'border-accent-2 bg-accent-2-soft' : 'border-danger bg-accent-soft',
      )}
    >
      <p
        className={cn(
          'font-display text-display-2xl font-bold uppercase tracking-tight',
          aceito ? 'text-teal-700' : 'text-coral-800',
        )}
      >
        <span aria-hidden="true">{aceito ? '✓' : '✕'}</span> {aceito ? 'Aceito' : 'Recusado'}
      </p>

      {resultado.participante && (
        <p
          className={cn(
            'mt-3 font-display text-display-lg font-bold',
            aceito ? 'text-teal-700' : 'text-coral-800',
          )}
        >
          {resultado.participante.nome}
          {resultado.participante.turma ? ` · ${resultado.participante.turma}` : ''}
        </p>
      )}

      <p
        className={cn(
          'mx-auto mt-3 max-w-content text-display-sm',
          aceito ? 'text-teal-700' : 'text-coral-800',
        )}
      >
        {resultado.mensagem}
      </p>

      {resultado.registradoEm && (
        <p className="mt-3 font-mono text-mono-sm text-teal-700">
          Registrado às{' '}
          {new Date(resultado.registradoEm).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {!aceito && resultado.motivo && (
        <p className="mt-3 font-mono text-mono-xs uppercase text-coral-800">
          motivo: {resultado.motivo}
        </p>
      )}
    </div>
  );
}
