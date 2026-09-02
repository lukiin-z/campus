import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ChangeEvent } from 'react';
import type { Curso, Turma } from '../types/domain';
import { normalizaCodigo } from '../domain/auth';
import {
  criarOnboardingSchema,
  turmaConfirmada,
  type OnboardingFormValues,
} from '../features/auth/onboardingSchema';
import { useConcluirOnboarding, useCursos, useTurmas } from '../hooks/useAuth';
import { mensagemDeErro } from '../hooks/useCampusData';
import { Logo } from '../components/layout/Logo';
import { ToastViewport } from '../components/layout/ToastViewport';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { ErrorState, Skeleton } from '../components/ui/Feedback';
import { cn } from '../lib/cn';

/**
 * Onboarding — vínculo com curso e turma (RF-004, RF-005, RN-003).
 *
 * Os dois passos ficam na MESMA tela, e não em duas: o código é conferido contra
 * as turmas do curso escolhido, então quem erra o curso precisa ver os dois
 * campos juntos para voltar. Duas telas esconderiam a causa do erro atrás de um
 * botão "voltar".
 *
 * Fora do AppShell, como o login — por isso monta o próprio `ToastViewport`, que
 * no resto do app mora no AppShell.
 */
export function OnboardingPage() {
  const cursos = useCursos();

  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto max-w-content px-5 pb-20 pt-16">
        <header>
          <Logo />
          <h1 className="mt-6 font-display text-display-xl font-bold text-text">
            Falta o seu vínculo
          </h1>
          <p className="mt-2 text-body-sm text-text-muted">
            Curso e turma definem quais eventos você vê. Sem eles, o feed abriria vazio.
          </p>
        </header>

        <div className="mt-8">
          {cursos.isPending && (
            <div role="status" aria-label="Carregando" className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {cursos.isError && (
            <ErrorState
              mensagem={mensagemDeErro(cursos.error)}
              onTentarDeNovo={() => void cursos.refetch()}
            />
          )}

          {cursos.data && <FormularioOnboarding cursos={cursos.data} />}
        </div>
      </main>

      <ToastViewport />
    </div>
  );
}

interface DadosAcademicos {
  cursos: readonly Curso[];
  turmas: readonly Turma[];
}

function FormularioOnboarding({ cursos }: { cursos: Curso[] }) {
  const concluir = useConcluirOnboarding();

  /*
   * O resolver precisa das turmas, e as turmas dependem do curso escolhido no
   * próprio formulário — um ciclo. O ref o quebra: o resolver lê sempre os dados
   * do último render, sem que o formulário precise ser recriado quando as turmas
   * chegam (o que apagaria o código já digitado).
   */
  const dadosRef = useRef<DadosAcademicos>({ cursos, turmas: [] });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    defaultValues: { cursoId: '', codigoConvite: '' },
    resolver: (valores, contexto, opcoes) =>
      zodResolver(criarOnboardingSchema(dadosRef.current))(valores, contexto, opcoes),
  });

  const cursoId = watch('cursoId');
  const codigoConvite = watch('codigoConvite');

  // `useTurmas` fica desabilitado sem curso: é o que dá a ordem dos dois passos
  // sem precisar de estado de "passo atual".
  const turmas = useTurmas(cursoId || undefined);
  const dados: DadosAcademicos = { cursos, turmas: turmas.data ?? [] };
  dadosRef.current = dados;

  const turma = turmaConfirmada({ cursoId, codigoConvite }, dados);
  const passo = cursoId ? 2 : 1;
  const campoCodigo = register('codigoConvite');

  function submeter(valores: OnboardingFormValues) {
    // Navegação e toast são do hook (RF-005): a tela não repete.
    concluir.mutate({
      cursoId: valores.cursoId,
      codigoConvite: normalizaCodigo(valores.codigoConvite),
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(submeter)}>
      <p className="font-mono text-mono-xs uppercase text-accent-strong">Passo {passo} de 2</p>
      <div aria-hidden="true" className="mt-2 flex gap-2">
        <span className="h-2 flex-1 rounded-full bg-accent-strong" />
        <span
          className={cn(
            'h-2 flex-1 rounded-full',
            passo === 2 ? 'bg-accent-strong' : 'bg-neutral-200',
          )}
        />
      </div>

      <fieldset className="mb-4 mt-6">
        <legend className="mb-2 block font-mono text-mono-xs uppercase text-text-muted">
          1. Seu curso
        </legend>
        <div className="space-y-2">
          {cursos.map((curso) => (
            <label
              key={curso.id}
              className={cn(
                'flex min-h-touch cursor-pointer items-center gap-3 rounded-md bg-surface px-4 py-3 transition',
                cursoId === curso.id
                  ? 'border-2 border-neutral-900'
                  : 'border border-border-strong',
              )}
            >
              <input
                type="radio"
                value={curso.id}
                className="h-5 w-5 accent-accent-strong"
                // `role=radio` não suporta `aria-invalid` (jsx-a11y reprova): a
                // ligação com o erro é só por `aria-describedby`.
                aria-describedby={errors.cursoId ? 'curso-erro' : undefined}
                {...register('cursoId')}
              />
              <span className="min-w-0">
                <span className="block font-display text-display-sm font-bold text-text">
                  {curso.nome}
                </span>
                <span className="block font-mono text-mono-xs uppercase text-text-muted">
                  {curso.codigo} · {curso.duracaoSemestres} semestres
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.cursoId?.message && (
          <p id="curso-erro" role="alert" className="mt-2 text-body-xs font-medium text-danger">
            {errors.cursoId.message}
          </p>
        )}
      </fieldset>

      <fieldset disabled={!cursoId} className="mb-4">
        <legend className="mb-2 block font-mono text-mono-xs uppercase text-text-muted">
          2. Código da turma
        </legend>

        <Input
          rotulo="Código de convite"
          placeholder="3ESPX-26"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dica={
            cursoId
              ? 'Espaço, hífen e caixa não importam: o código é normalizado enquanto você digita.'
              : 'Escolha o curso acima para liberar este campo.'
          }
          erro={errors.codigoConvite?.message}
          {...campoCodigo}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => {
            // Normaliza o que aparece na tela, e não só o que é comparado: o que
            // a pessoa lê passa a ser exatamente o que a regra confere.
            evento.target.value = normalizaCodigo(evento.target.value);
            void campoCodigo.onChange(evento);
          }}
        />

        {turmas.isError && (
          <p role="alert" className="mb-4 text-body-xs font-medium text-danger">
            {mensagemDeErro(turmas.error)}{' '}
            <button
              type="button"
              onClick={() => void turmas.refetch()}
              className="min-h-touch underline hover:no-underline"
            >
              Tentar de novo
            </button>
          </p>
        )}

        {/* Confirmação antes de enviar: o aluno vê qual turma o código resolveu,
            com o período, e reconhece (ou não) a própria. */}
        <div aria-live="polite" className="min-h-touch">
          {turma && (
            <p className="flex min-h-touch items-center gap-3 rounded-md border border-accent-2 bg-accent-2-soft px-4 text-body-sm text-teal-600">
              <span aria-hidden="true" className="font-mono text-mono-sm">
                OK
              </span>
              <span>
                Turma <strong className="font-semibold">{turma.nome}</strong> · {turma.periodo}
              </span>
            </p>
          )}
        </div>
      </fieldset>

      {concluir.isError && (
        <p
          id="onboarding-erro-servidor"
          role="alert"
          className="mb-4 rounded-md border border-danger bg-accent-soft px-4 py-3 text-body-sm font-medium text-danger"
        >
          {mensagemDeErro(concluir.error)}
        </p>
      )}

      <Button
        type="submit"
        larguraTotal
        size="lg"
        carregando={concluir.isPending}
        aria-describedby={concluir.isError ? 'onboarding-erro-servidor' : undefined}
      >
        Concluir
      </Button>

      <details className="mt-6">
        <summary className="min-h-touch cursor-pointer text-body-sm text-text-muted underline hover:no-underline">
          Não sei meu código
        </summary>
        <p className="mt-2 text-body-sm text-text-muted">
          O código é da turma, não seu: quem tem é o representante, e ele muda a cada período. Peça
          no grupo da turma. Se ninguém souber, a coordenação do curso gera um novo.
        </p>
      </details>
    </form>
  );
}
