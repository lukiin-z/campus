import type {
  Notificacao,
  Participacao,
  StatusParticipacao,
  TipoNotificacao,
} from '../../types/domain';
import { formatFullDate } from '../../domain/format';

/**
 * Central de avisos (RF-039, RF-040): rótulo, destino e agrupamento por dia.
 *
 * Aviso que não leva a lugar nenhum é aviso pela metade — a pessoa lê "abriu uma
 * vaga para você" e tem de ir procurar o evento na lista. Por isso cada tipo
 * declara para onde vai.
 */

/** Para que tela o tipo aponta. */
type AlvoNotificacao = 'EVENTO' | 'INGRESSO';

interface RegraNotificacao {
  /** Rótulo curto do tipo. O tipo é dito em TEXTO, não só por cor (WCAG 1.4.1). */
  rotulo: string;
  alvo: AlvoNotificacao;
}

/**
 * Os 8 tipos, um por um. `Record<TipoNotificacao, …>` é exaustivo em tempo de
 * compilação: tipo novo em `TIPO_NOTIFICACAO` sem regra aqui não compila — que é
 * mais forte do que um `switch` com `default` silencioso, porque o erro aparece
 * antes de a tela existir.
 */
const REGRAS: Readonly<Record<TipoNotificacao, RegraNotificacao>> = {
  NOVO_EVENTO: { rotulo: 'novo evento', alvo: 'EVENTO' },
  VAGA_LIBERADA: { rotulo: 'vaga liberada', alvo: 'EVENTO' },
  PAGAMENTO_CONFIRMADO: { rotulo: 'pagamento', alvo: 'INGRESSO' },
  PAGAMENTO_EXPIRADO: { rotulo: 'prazo de pagamento', alvo: 'EVENTO' },
  EVENTO_ALTERADO: { rotulo: 'evento alterado', alvo: 'EVENTO' },
  EVENTO_CANCELADO: { rotulo: 'evento cancelado', alvo: 'EVENTO' },
  CHECKIN_REALIZADO: { rotulo: 'check-in', alvo: 'INGRESSO' },
  EVENTO_APROVADO: { rotulo: 'evento aprovado', alvo: 'EVENTO' },
};

export function rotuloDoTipo(tipo: TipoNotificacao): string {
  return REGRAS[tipo].rotulo;
}

type ReferenciaParticipacao = Pick<Participacao, 'id' | 'eventoId' | 'status'>;

/**
 * Rota do objeto citado, ou `null` quando não há o que abrir.
 *
 * `referencia_id` é polimórfico e não tem FK (dicionário de dados, seção
 * `notificacao`): dependendo de quem gerou o aviso, o mesmo tipo chega com o ID
 * do evento OU o da participação. Resolver contra as participações do próprio
 * usuário cobre as duas formas sem adivinhar pelo prefixo do ID — adivinhar pelo
 * prefixo amarraria a tela ao formato de ID do mock.
 *
 * ID órfão cai em "não encontrado", que é o pior caso já aceito no documento de
 * dados — e nunca revela evento fora do alcance (RN-001).
 */
export function rotaDaNotificacao(
  notificacao: Pick<Notificacao, 'tipo' | 'referenciaId'>,
  minhasParticipacoes: readonly ReferenciaParticipacao[],
): string | null {
  const referencia = notificacao.referenciaId;
  if (!referencia) return null;

  const porParticipacao = minhasParticipacoes.find((p) => p.id === referencia) ?? null;

  if (REGRAS[notificacao.tipo].alvo === 'INGRESSO') {
    const comIngresso =
      porParticipacao ??
      minhasParticipacoes.find((p) => p.eventoId === referencia && temIngresso(p.status)) ??
      null;
    if (comIngresso) return `/ingresso/${comIngresso.id}`;
  }

  return `/eventos/${porParticipacao?.eventoId ?? referencia}`;
}

/** Só participação em curso ou já presente tem ingresso para abrir. */
function temIngresso(status: StatusParticipacao): boolean {
  return status === 'CONFIRMADA' || status === 'PRESENTE';
}

export interface GrupoDeAvisos {
  chave: string;
  rotulo: string;
  itens: Notificacao[];
}

/**
 * Agrupa por dia, do mais recente para o mais antigo.
 *
 * "Hoje" e "ontem" em vez da data: é assim que se fala do que acabou de
 * acontecer, e é o que distingue um aviso urgente de um de semana passada sem a
 * pessoa ter de calcular a diferença.
 */
export function agruparPorDia(
  notificacoes: readonly Notificacao[],
  agora: Date = new Date(),
): GrupoDeAvisos[] {
  const hoje = chaveDoDia(agora);
  const ontem = chaveDoDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));

  const ordenadas = [...notificacoes].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );

  const grupos: GrupoDeAvisos[] = [];
  for (const notificacao of ordenadas) {
    const chave = chaveDoDia(new Date(notificacao.criadoEm));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.itens.push(notificacao);
      continue;
    }
    grupos.push({
      chave,
      rotulo:
        chave === hoje ? 'Hoje' : chave === ontem ? 'Ontem' : formatFullDate(notificacao.criadoEm),
      itens: [notificacao],
    });
  }
  return grupos;
}

/** Dia no fuso de quem lê. Subtrair 24 h daria o dia errado em virada de horário. */
function chaveDoDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}
