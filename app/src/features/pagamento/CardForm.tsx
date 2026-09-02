import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MetodoPagamento, ResumoCartao } from '../../types/domain';
import type { CardFormValues, GatewayPrediction } from './cardSchema';
import { TEST_CARDS, cardSchema, formatCardNumber, formatExpiry } from './cardSchema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { bandeiraDoCartao, desfechoDeterministico, resumirCartao } from '@campus/shared';

/**
 * Formulário de cartão (RF-029, RNF-022).
 *
 * O número completo existe apenas neste componente. `resumirCartao` reduz o
 * formulário aos quatro últimos dígitos, à bandeira e ao titular ANTES de
 * qualquer chamada — o corpo da requisição nunca teve o número, então não há o
 * que vazar em log, em cache de rede ou no CP6.
 */

const TIPOS: Array<{ valor: MetodoPagamento; rotulo: string }> = [
  { valor: 'CARTAO_CREDITO', rotulo: 'Crédito' },
  { valor: 'CARTAO_DEBITO', rotulo: 'Débito' },
];

const PREVISAO: Record<GatewayPrediction, string> = {
  APROVADO: 'com este número o gateway simulado aprova.',
  RECUSADO: 'termina em 1: o gateway simulado recusa.',
  EM_ANALISE: 'termina em 2: o gateway simulado deixa em análise.',
};

export function CardForm({
  onEnviar,
  enviando,
}: {
  onEnviar: (entrada: {
    metodo: MetodoPagamento;
    cartao: ResumoCartao;
    previsao: GatewayPrediction;
  }) => void;
  enviando: boolean;
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento>('CARTAO_CREDITO');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { numero: '', titular: '', validade: '', cvv: '' },
  });

  const numero = String(watch('numero') ?? '');
  const digitos = numero.replace(/\D/g, '');
  const bandeira = bandeiraDoCartao(numero);

  function enviar(valores: CardFormValues) {
    const numeroDigitado = String(valores.numero);
    onEnviar({
      metodo,
      cartao: resumirCartao({ numero: numeroDigitado, titular: String(valores.titular) }),
      // Calculado aqui porque é o último ponto do app em que o número existe.
      previsao: desfechoDeterministico(numeroDigitado),
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(enviar)}>
      <fieldset className="mb-4">
        <legend className="mb-2 block font-mono text-mono-xs uppercase text-text-muted">
          Tipo de cartão
        </legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Tipo de cartão">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.valor}
              type="button"
              role="radio"
              aria-checked={metodo === tipo.valor}
              onClick={() => setMetodo(tipo.valor)}
              className={cn(
                'min-h-touch flex-1 rounded-md border px-2 py-3 text-body-sm transition',
                metodo === tipo.valor
                  ? 'border-neutral-900 bg-neutral-900 font-semibold text-white'
                  : 'border-border bg-surface text-text-muted hover:bg-surface-2',
              )}
            >
              {tipo.rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      <Input
        rotulo="Número do cartão"
        placeholder="0000 0000 0000 0000"
        inputMode="numeric"
        // `off` de propósito: preenchimento automático traria um cartão real para
        // uma tela de demonstração, e nenhum cartão real tem o que fazer aqui.
        autoComplete="off"
        erro={errors.numero?.message}
        {...register('numero')}
        onChange={(evento) => setValue('numero', formatCardNumber(evento.target.value))}
      />

      {digitos.length >= 2 && (
        <p aria-live="polite" className="-mt-2 mb-4 text-body-xs text-text-muted">
          Bandeira detectada: <strong className="font-semibold text-text">{bandeira}</strong> —{' '}
          {PREVISAO[desfechoDeterministico(numero)]}
        </p>
      )}

      <Input
        rotulo="Nome impresso no cartão"
        placeholder="Como está no cartão"
        autoComplete="off"
        erro={errors.titular?.message}
        {...register('titular')}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            rotulo="Validade"
            placeholder="MM/AA"
            inputMode="numeric"
            autoComplete="off"
            erro={errors.validade?.message}
            {...register('validade')}
            onChange={(evento) => setValue('validade', formatExpiry(evento.target.value))}
          />
        </div>
        <div className="flex-1">
          <Input
            rotulo="CVV"
            placeholder={bandeira === 'Amex' ? '0000' : '000'}
            inputMode="numeric"
            autoComplete="off"
            erro={errors.cvv?.message}
            {...register('cvv')}
          />
        </div>
      </div>

      <p className="mb-4 text-body-xs text-text-muted">
        O número completo não sai desta tela: enviamos apenas a bandeira, os quatro últimos dígitos
        e o nome do titular.
      </p>

      <Button type="submit" larguraTotal size="lg" carregando={enviando}>
        Pagar com cartão
      </Button>

      <div className="mt-6 rounded-md border border-dashed border-border bg-surface-2 p-4">
        <p className="font-mono text-mono-xs uppercase text-text-muted">
          Cartões de teste da demonstração
        </p>
        <p className="mt-2 text-body-xs text-text-muted">
          Os dois passam por Luhn. O último dígito é o que decide o desfecho no gateway simulado.
        </p>
        <ul className="mt-3 space-y-2">
          {TEST_CARDS.map((cartao) => (
            <li key={cartao.numero}>
              <button
                type="button"
                onClick={() => {
                  setValue('numero', cartao.numero);
                  setValue('titular', 'MARINA ALVES');
                  setValue('validade', '12/30');
                  setValue('cvv', bandeiraDoCartao(cartao.numero) === 'Amex' ? '1234' : '123');
                }}
                className="min-h-touch w-full rounded-md border border-border bg-surface px-4 py-2 text-left transition hover:bg-surface-2"
              >
                <span className="font-mono text-mono-sm text-text">{cartao.numero}</span>
                <span className="ml-2 font-display text-body-xs font-bold uppercase text-accent-strong">
                  {cartao.rotulo}
                </span>
                <span className="mt-1 block text-body-xs text-text-muted">{cartao.efeito}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
