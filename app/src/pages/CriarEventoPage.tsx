import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { AlcanceEvento } from '../types/domain';
import { combinarDataHora, eventFormSchema, type EventFormValues } from '../domain/eventSchema';
import { defaultDeadlines } from '../domain/deadlines';
import { POLICY } from '../domain/policy';
import { useCriarEvento } from '../hooks/useCampusData';
import { useSessionStore } from '../store/session';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Field';
import { cn } from '../lib/cn';

/**
 * Criação de evento (RF-010 a RF-012).
 *
 * Três decisões do organizador — alcance, cobrança e prazos — e o resto é
 * validação. O alcance abre em `TURMA`: errar para menos gera evento pouco
 * divulgado; errar para mais expõe um churrasco de 40 pessoas à faculdade
 * inteira, que é o problema que o produto existe para resolver. Padrão seguro é
 * o que falha para o lado barato.
 */

const ALCANCES: Array<{ valor: AlcanceEvento; rotulo: string; explicacao: string }> = [
  { valor: 'TURMA', rotulo: 'Minha turma', explicacao: 'Só a sua turma vê e pode se inscrever.' },
  { valor: 'CURSO', rotulo: 'Meu curso', explicacao: 'Todas as turmas do seu curso veem.' },
  {
    valor: 'FACULDADE',
    rotulo: 'Faculdade',
    explicacao: 'Toda a faculdade vê. Precisa de aprovação antes de publicar.',
  },
];

export function CriarEventoPage() {
  const navegar = useNavigate();
  const sessao = useSessionStore((s) => s.sessao);
  const criar = useCriarEvento();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      alcance: 'TURMA',
      data: '',
      horaInicio: '19:00',
      horaFim: '22:00',
      local: '',
      capacidade: 40,
      gratuito: true,
      preco: 0,
    },
  });

  const alcance = watch('alcance');
  const gratuito = watch('gratuito');

  function submeter(valores: EventFormValues, publicar: boolean) {
    const inicio = combinarDataHora(String(valores.data), String(valores.horaInicio));
    const fim = combinarDataHora(String(valores.data), String(valores.horaFim));
    if (!inicio || !fim) return;

    const prazos = defaultDeadlines(inicio);

    criar.mutate(
      {
        titulo: String(valores.titulo),
        descricao: String(valores.descricao ?? ''),
        alcance: valores.alcance as AlcanceEvento,
        inicio,
        fim,
        local: String(valores.local),
        capacidade: Number(valores.capacidade),
        preco: valores.gratuito ? 0 : Number(valores.preco),
        prazoInscricao: prazos.prazoInscricao,
        prazoCancelamento: prazos.prazoCancelamento,
        publicar,
      },
      {
        onSuccess: (evento) => {
          navegar(evento.status === 'RASCUNHO' ? '/perfil' : `/eventos/${evento.id}`);
        },
      },
    );
  }

  const rotuloAncora =
    alcance === 'TURMA'
      ? (sessao?.turma?.nome ?? 'sua turma')
      : alcance === 'CURSO'
        ? (sessao?.curso?.nome ?? 'seu curso')
        : (sessao?.faculdade.sigla ?? 'sua faculdade');

  return (
    <div>
      <header className="mb-6">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">Novo evento</p>
        <h1 className="mt-1 font-display text-display-xl font-bold text-text">Criar evento</h1>
      </header>

      <form noValidate onSubmit={handleSubmit((valores) => submeter(valores, true))}>
        <Input
          rotulo="Nome do evento"
          placeholder="Ex: Churrasco de encerramento"
          erro={errors.titulo?.message}
          {...register('titulo')}
        />

        <Textarea
          rotulo="Descrição"
          placeholder="Conte do que se trata, o que levar e o que está incluso."
          erro={errors.descricao?.message}
          {...register('descricao')}
        />

        <fieldset className="mb-4">
          <legend className="mb-2 block font-mono text-mono-xs uppercase text-text-muted">
            Alcance
          </legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Alcance do evento">
            {ALCANCES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={alcance === opcao.valor}
                onClick={() => setValue('alcance', opcao.valor, { shouldValidate: true })}
                className={cn(
                  'min-h-touch flex-1 rounded-md border px-2 py-3 text-body-sm transition',
                  alcance === opcao.valor
                    ? 'border-neutral-900 bg-neutral-900 font-semibold text-white'
                    : 'border-border bg-surface text-text-muted hover:bg-surface-2',
                )}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 text-body-xs text-text-muted">
            {ALCANCES.find((o) => o.valor === alcance)?.explicacao} Alcance: {rotuloAncora}.
          </p>
        </fieldset>

        <Input rotulo="Data" type="date" erro={errors.data?.message} {...register('data')} />

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              rotulo="Início"
              type="time"
              erro={errors.horaInicio?.message}
              {...register('horaInicio')}
            />
          </div>
          <div className="flex-1">
            <Input
              rotulo="Fim"
              type="time"
              erro={errors.horaFim?.message}
              {...register('horaFim')}
            />
          </div>
        </div>

        <Input
          rotulo="Local"
          placeholder="Ex: Quadra do Campus 2"
          erro={errors.local?.message}
          {...register('local')}
        />

        <Input
          rotulo="Vagas"
          type="number"
          inputMode="numeric"
          min={POLICY.MIN_CAPACITY}
          max={POLICY.MAX_CAPACITY}
          dica={`Entre ${POLICY.MIN_CAPACITY} e ${POLICY.MAX_CAPACITY}. Quando lotar, quem chegar entra na lista de espera.`}
          erro={errors.capacidade?.message}
          {...register('capacidade')}
        />

        <fieldset className="mb-4">
          <legend className="mb-2 block font-mono text-mono-xs uppercase text-text-muted">
            Cobrança
          </legend>
          <label className="flex min-h-touch items-center gap-3 rounded-md border border-border bg-surface px-4">
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent-strong"
              {...register('gratuito')}
            />
            <span className="text-body-md text-text">Evento gratuito</span>
          </label>
        </fieldset>

        {!gratuito && (
          <Input
            rotulo="Valor por pessoa (R$)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            dica={`Quem se inscrever tem ${POLICY.PAYMENT_WINDOW_MINUTES} min para pagar. Sem pagamento, a vaga volta para a fila.`}
            erro={errors.preco?.message}
            {...register('preco')}
          />
        )}

        <div className="mt-8 space-y-3">
          <Button type="submit" larguraTotal size="lg" carregando={criar.isPending}>
            Publicar evento
          </Button>
          <Button
            type="button"
            variant="ghost"
            larguraTotal
            onClick={handleSubmit((valores) => submeter(valores, false))}
          >
            Salvar rascunho
          </Button>
        </div>

        <p className="mt-4 text-body-xs text-text-muted">
          Prazos aplicados automaticamente: inscrições até{' '}
          {POLICY.DEFAULT_ENROLLMENT_DEADLINE_HOURS_BEFORE} h antes e cancelamento com reembolso até{' '}
          {POLICY.DEFAULT_CANCELLATION_DEADLINE_HOURS_BEFORE} h antes do início.
        </p>
      </form>
    </div>
  );
}
