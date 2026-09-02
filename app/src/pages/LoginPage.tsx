import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import type { Faculdade } from '../types/domain';
import { PerfisDemo } from '../features/auth/PerfisDemo';
import { SENHA_DEMO } from '../features/auth/perfis';
import { criarLoginSchema, type LoginFormValues } from '../features/auth/loginSchema';
import { useEntrar, useFaculdade } from '../hooks/useAuth';
import { mensagemDeErro } from '../hooks/useCampusData';
import { useSessionStore } from '../store/session';
import { Logo } from '../components/layout/Logo';
import { ToastViewport } from '../components/layout/ToastViewport';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { ErrorState, Skeleton } from '../components/ui/Feedback';
import { exemploDeEmail } from '@campus/shared';

/**
 * Login (RF-001 a RF-003).
 *
 * Fora do AppShell: sem barra inferior, porque não há para onde navegar antes de
 * entrar. Por isso a tela monta o próprio `ToastViewport` — o global mora no
 * AppShell, e sem ele o toast de erro de `useEntrar` não teria onde aparecer.
 *
 * A lista de domínios aceitos é dado da faculdade, não constante: o formulário
 * só monta depois de `useFaculdade` responder, para que a mensagem de recusa
 * possa nomear o domínio certo em vez de dizer "e-mail inválido".
 */
export function LoginPage() {
  const sessao = useSessionStore((s) => s.sessao);
  const local = useLocation();
  const faculdade = useFaculdade();

  /*
   * Já autenticado. A guarda de rota de App.tsx guarda o destino original em
   * `state.de`, e é para lá que a pessoa volta — `useEntrar` navega para `/` ou
   * `/onboarding`, então quem resolve o retorno é esta tela.
   */
  if (sessao) {
    return <Navigate to={destinoDeVolta(local.state)} replace />;
  }

  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto max-w-content px-5 pb-20 pt-16">
        <header>
          <Logo />
          <h1 className="mt-6 font-display text-display-xl font-bold text-text">
            Entre com o e-mail da faculdade
          </h1>
          <p className="mt-2 text-body-sm text-text-muted">
            Os eventos da sua turma, do seu curso e da sua faculdade em um só lugar.
          </p>
        </header>

        <div className="mt-8">
          {faculdade.isPending && (
            <div role="status" aria-label="Carregando" className="space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {faculdade.isError && (
            <ErrorState
              mensagem={mensagemDeErro(faculdade.error)}
              onTentarDeNovo={() => void faculdade.refetch()}
            />
          )}

          {faculdade.data && <FormularioLogin faculdade={faculdade.data} />}
        </div>
      </main>

      <ToastViewport />
    </div>
  );
}

function FormularioLogin({ faculdade }: { faculdade: Faculdade }) {
  const entrar = useEntrar();
  const schema = useMemo(
    () => criarLoginSchema(faculdade.dominiosEmail),
    [faculdade.dominiosEmail],
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  });

  function submeter(valores: LoginFormValues) {
    // Navegação e toast de erro são do hook (RF-003/RF-004): a tela não repete.
    entrar.mutate({ email: valores.email.trim(), senha: valores.senha });
  }

  /** Preenche e envia: o atalho de demonstração passa pelo mesmo caminho. */
  function entrarComo(email: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('senha', SENHA_DEMO, { shouldValidate: true });
    void handleSubmit(submeter)();
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit(submeter)}>
        <Input
          rotulo="E-mail institucional"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={exemploDeEmail(faculdade)}
          erro={errors.email?.message}
          {...register('email')}
        />

        <Input
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />

        {/*
          O hook já mostra o toast, que some em 4s. O erro do servidor fica
          também aqui, junto ao campo que a pessoa vai corrigir: 401 é erro de
          digitação, 422 é conta errada, e os dois exigem reler o formulário.
        */}
        {entrar.isError && (
          <p
            id="login-erro-servidor"
            role="alert"
            className="mb-4 rounded-md border border-danger bg-accent-soft px-4 py-3 text-body-sm font-medium text-danger"
          >
            {mensagemDeErro(entrar.error)}
          </p>
        )}

        <Button
          type="submit"
          larguraTotal
          size="lg"
          carregando={entrar.isPending}
          aria-describedby={entrar.isError ? 'login-erro-servidor' : undefined}
        >
          Entrar
        </Button>
      </form>

      <PerfisDemo onEscolher={entrarComo} desabilitado={entrar.isPending} />
    </>
  );
}

/**
 * Destino guardado pela guarda de rota. Só caminho interno entra: uma URL
 * absoluta em `state` viraria redirecionamento para fora do app.
 */
function destinoDeVolta(state: unknown): string {
  if (state && typeof state === 'object' && 'de' in state) {
    const de = (state as { de: unknown }).de;
    if (typeof de === 'string' && de.startsWith('/') && !de.startsWith('//') && de !== '/login') {
      return de;
    }
  }
  return '/';
}
