import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/ui';

/**
 * Viewport global de avisos.
 *
 * Mora em `layout/` e não em `ui/` de propósito: ele LÊ a store de UI, e
 * componente de design system é apresentacional — recebe dados por props. A
 * regra `no-restricted-imports` do ESLint reprova o contrário, e foi ela que
 * pegou este componente no lugar errado.
 */

const TOAST_CLASSES = {
  info: 'bg-neutral-900 text-white',
  sucesso: 'bg-accent-2 text-white',
  erro: 'bg-danger text-white',
} as const;

/**
 * Toast global. `aria-live="polite"` para o leitor de tela anunciar sem
 * interromper; erro usa `assertive`, porque exige atenção imediata.
 */
export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const removerToast = useUiStore((s) => s.removerToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variante === 'erro' ? 'alert' : 'status'}
          aria-live={toast.variante === 'erro' ? 'assertive' : 'polite'}
          className={cn(
            'pointer-events-auto flex w-full max-w-content items-center justify-between gap-4 rounded-md px-5 py-3 shadow-md animate-toast-in',
            TOAST_CLASSES[toast.variante],
          )}
        >
          <span className="text-body-sm font-medium">{toast.mensagem}</span>
          <button
            type="button"
            onClick={() => removerToast(toast.id)}
            aria-label="Fechar aviso"
            className="font-mono text-mono-sm opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
