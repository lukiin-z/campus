import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MetodoCheckin, ResultadoCheckin } from '../types/domain';
import { formatEventDateTime, formatTime } from '../domain/format';
import { ApiError } from '../services';
import { mensagemDeErro, useEvento } from '../hooks/useCampusData';
import { usePainelCheckin, useValidarCheckin } from '../hooks/useCheckin';
import { demoCodes } from '../features/checkin/demoCodes';
import { ScanResult } from '../features/checkin/ScanResult';
import { ScannerInput } from '../features/checkin/ScannerInput';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, SkeletonLista } from '../components/ui/Feedback';
import { ProgressBar } from '../components/ui/ProgressBar';
import { cn } from '../lib/cn';
import { POLICY } from '@campus/shared';

/**
 * Check-in do organizador (RF-034 e RF-035).
 *
 * Esta é a única tela do app usada em pé, na porta de um evento, com fila
 * andando. Por isso o veredito da leitura ocupa um bloco grande e a lista de
 * quem já entrou fica abaixo, não acima: o operador olha o resultado, não o
 * relatório.
 *
 * A leitura é digitada ou colada — a câmera é do CP6. O que já é definitivo aqui
 * é a decisão: as 6 condições de RN-017 vêm de `domain/checkin.ts`, e recusa
 * chega como resposta normal, com motivo, nunca como erro de rede.
 */

const METODO_ROTULO: Record<MetodoCheckin, string> = {
  QR_CODE: 'QR Code',
  CODIGO_NUMERICO: 'código digitado',
  MANUAL: 'registro manual',
};

export function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = id ?? '';
  const painel = usePainelCheckin(id);
  const evento = useEvento(id);
  const validar = useValidarCheckin(eventoId);
  const [leitura, setLeitura] = useState('');
  const [resultado, setResultado] = useState<ResultadoCheckin | null>(null);

  function validarLeitura() {
    validar.mutate(leitura, {
      onSuccess: (retorno: ResultadoCheckin) => {
        setResultado(retorno);
        // Aceito, o campo é limpo: a próxima pessoa da fila cola a leitura dela
        // sem ter de apagar a anterior. Recusado, o texto fica para conferência.
        if (retorno.aceito) setLeitura('');
      },
    });
  }

  if (painel.isPending) {
    return (
      <div className="space-y-4">
        <SkeletonLista itens={2} />
      </div>
    );
  }

  if (painel.error instanceof ApiError && painel.error.status === 403) {
    return (
      <EmptyState
        titulo="Você não valida o check-in deste evento"
        descricao={
          evento.data
            ? `Quem valida é ${evento.data.organizador.nome}, que organiza o evento, e os administradores do curso ou da faculdade. Peça para ser incluído na organização.`
            : 'Quem valida é o organizador do evento e os administradores do curso ou da faculdade.'
        }
        acao={
          <Link to={`/eventos/${eventoId}`}>
            <Button variant="ghost">Ver o evento</Button>
          </Link>
        }
      />
    );
  }

  if (painel.isError) {
    return (
      <ErrorState
        mensagem={mensagemDeErro(painel.error)}
        onTentarDeNovo={() => void painel.refetch()}
      />
    );
  }

  if (!painel.data) {
    return (
      <EmptyState
        titulo="Evento não encontrado"
        descricao="Ou ele não existe, ou não está no seu alcance — eventos de turma e de curso só aparecem para quem faz parte."
        acao={
          <Link to="/eventos">
            <Button variant="ghost">Ver eventos</Button>
          </Link>
        }
      />
    );
  }

  const dados = painel.data;
  const faltam = Math.max(0, dados.confirmados - dados.presentes);
  const codigos = demoCodes({
    aguardando: dados.aguardando,
    presencas: dados.presencas,
  });
  // Ordem decrescente garantida na tela, sem depender da ordem da resposta.
  const presencas = [...dados.presencas].sort(
    (a, b) => new Date(b.checkinEm).getTime() - new Date(a.checkinEm).getTime(),
  );

  return (
    <div>
      <header className="mb-5">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">Check-in</p>
        <h1 className="mt-1 font-display text-display-lg font-bold text-text">
          {dados.evento.titulo}
        </h1>
      </header>

      <div
        className={cn(
          'rounded-lg border px-4 py-3',
          dados.abertoAgora ? 'border-accent-2 bg-accent-2-soft' : 'border-border bg-surface',
        )}
      >
        <p
          className={cn(
            'font-display text-display-sm font-bold',
            dados.abertoAgora ? 'text-teal-700' : 'text-text',
          )}
        >
          {dados.abertoAgora ? 'Janela de check-in aberta' : 'Janela de check-in fechada'}
        </p>
        <p className="mt-1 font-mono text-mono-sm text-text-muted">
          abre {formatEventDateTime(dados.abreEm)} · fecha {formatEventDateTime(dados.fechaEm)}
        </p>
        {!dados.abertoAgora && (
          <p className="mt-2 text-body-sm text-text-muted">
            Fora da janela toda leitura é recusada, com o motivo na tela. O check-in abre{' '}
            {POLICY.CHECKIN_OPENS_HOURS_BEFORE} h antes do início e fecha{' '}
            {POLICY.CHECKIN_CLOSES_HOURS_AFTER} h depois do fim.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-5">
        <p className="font-mono text-mono-xs uppercase text-text-muted">Já entraram</p>
        <p className="mt-1 font-display text-display-xl font-bold text-text">
          {dados.presentes}{' '}
          <span className="font-display text-display-sm font-bold text-text-muted">
            de {dados.confirmados} confirmados
          </span>
        </p>
        <div className="mt-4">
          <ProgressBar
            ocupadas={dados.presentes}
            capacidade={dados.confirmados}
            unidade="confirmados"
            verboAcessivel="já entraram"
          />
        </div>
        <p className="mt-2 text-body-sm text-text-muted">
          {faltam === 0
            ? 'Todos os confirmados já passaram pela porta.'
            : `Faltam ${faltam} de ${dados.confirmados}. O painel se atualiza sozinho enquanto esta tela estiver aberta.`}
        </p>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-display-md font-bold text-text">Validar ingresso</h2>
        <ScannerInput
          valor={leitura}
          onChange={setLeitura}
          onValidar={validarLeitura}
          validando={validar.isPending}
        />
      </section>

      {resultado && (
        <div className="mt-5">
          <ScanResult resultado={resultado} />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-dashed border-border bg-surface-2 p-4">
        <p className="font-mono text-mono-xs uppercase text-text-muted">
          Códigos deste evento para testar
        </p>
        {codigos.length === 0 ? (
          <p className="mt-2 text-body-sm text-text-muted">
            Nenhum código de demonstração disponível: este evento ainda não tem presença registrada
            e nenhuma inscrição sua está confirmada nele. Abra o ingresso de um participante e use o
            código de 8 dígitos impresso lá.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {codigos.map((codigo) => (
              <li key={codigo.codigo}>
                <button
                  type="button"
                  onClick={() => setLeitura(codigo.codigo)}
                  className="min-h-touch w-full rounded-md border border-border bg-surface px-4 py-2 text-left transition hover:bg-surface-2"
                >
                  <span className="font-mono text-mono-sm text-text">{codigo.codigo}</span>
                  <span className="ml-2 text-body-xs text-text-muted">{codigo.pessoa}</span>
                  <span className="mt-1 block text-body-xs text-text-muted">{codigo.efeito}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-display-md font-bold text-text">
          Quem já entrou{presencas.length > 0 ? ` (${presencas.length})` : ''}
        </h2>
        {presencas.length === 0 ? (
          <EmptyState
            titulo="Ninguém entrou ainda"
            descricao="A primeira leitura aceita aparece aqui, com nome e horário, e a lista fica em ordem da mais recente para a mais antiga."
          />
        ) : (
          <ul className="space-y-2">
            {presencas.map((presenca) => (
              <li
                key={presenca.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
              >
                <Avatar
                  nome={presenca.participante.nome}
                  seed={presenca.participante.avatarSeed}
                  tamanho="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold text-text">
                    {presenca.participante.nome}
                  </p>
                  <p className="font-mono text-mono-sm text-text-muted">
                    {METODO_ROTULO[presenca.metodo]}
                  </p>
                </div>
                <span className="font-mono text-mono-sm text-text-muted">
                  {formatTime(presenca.checkinEm)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
