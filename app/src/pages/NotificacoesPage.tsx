import { Link } from 'react-router-dom';
import type { Notificacao } from '../types/domain';
import { formatRelative } from '../domain/format';
import {
  mensagemDeErro,
  useMarcarNotificacaoLida,
  useMinhasParticipacoes,
  useNotificacoes,
} from '../hooks/useCampusData';
import { useMarcarTodasLidas } from '../hooks/useFeedSocial';
import {
  agruparPorDia,
  rotaDaNotificacao,
  rotuloDoTipo,
} from '../features/participacao/notificacoes';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, SkeletonLista } from '../components/ui/Feedback';
import { cn } from '../lib/cn';

/**
 * Central de notificações (RF-040).
 *
 * Duas decisões sustentam a tela. A primeira: agrupar por dia, porque um aviso de
 * vaga liberada de hoje e um de semana passada exigem reações diferentes e a
 * pessoa não deveria ter de calcular a diferença. A segunda: cada aviso abre o
 * objeto citado — a lista existe para tirar a pessoa dela, não para ser lida.
 */
export function NotificacoesPage() {
  const notificacoes = useNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();

  // As participações resolvem a referência polimórfica do aviso (ver
  // features/participacao/notificacoes.ts). Chega do cache: o perfil e a barra
  // superior já as pediram.
  const participacoes = useMinhasParticipacoes();

  const lista = notificacoes.data ?? [];
  const naoLidas = lista.filter((aviso) => !aviso.lida).length;
  const grupos = agruparPorDia(lista);

  return (
    <div>
      <header className="mb-6">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">Campus avisa</p>
        <h1 className="mt-1 font-display text-display-xl font-bold text-text">Notificações</h1>
        <p className="mt-1 text-body-sm text-text-muted">
          {naoLidas > 0
            ? `${naoLidas} ${naoLidas === 1 ? 'aviso não lido' : 'avisos não lidos'}.`
            : 'Você está em dia com os avisos.'}
        </p>
      </header>

      {naoLidas > 0 && (
        <div className="mb-6">
          <Button
            variant="ghost"
            carregando={marcarTodas.isPending}
            onClick={() => marcarTodas.mutate()}
          >
            Marcar todas como lidas
          </Button>
        </div>
      )}

      {notificacoes.isPending && <SkeletonLista itens={3} />}

      {notificacoes.isError && (
        <ErrorState
          mensagem={mensagemDeErro(notificacoes.error)}
          onTentarDeNovo={() => void notificacoes.refetch()}
        />
      )}

      {notificacoes.data && lista.length === 0 && (
        <EmptyState
          titulo="Nada novo por aqui"
          descricao="Quando abrir uma vaga para você, um pagamento for confirmado ou sair um evento no seu alcance, o aviso aparece nesta tela."
          acao={
            <Link to="/eventos">
              <Button variant="ghost">Ver eventos</Button>
            </Link>
          }
        />
      )}

      {grupos.map((grupo) => (
        <section key={grupo.chave} aria-labelledby={`dia-${grupo.chave}`} className="mb-6">
          <h2
            id={`dia-${grupo.chave}`}
            className="mb-3 font-mono text-mono-sm uppercase text-text-muted"
          >
            {grupo.rotulo}
          </h2>

          <ul className="space-y-2">
            {grupo.itens.map((aviso) => (
              <li key={aviso.id}>
                <ItemDeAviso
                  aviso={aviso}
                  rota={rotaDaNotificacao(aviso, participacoes.data ?? [])}
                  onAbrir={() => {
                    // Idempotente no servidor, mas evitar a chamada mantém a
                    // lista quieta: marcar o que já está lido invalidaria o
                    // cache e redesenharia a tela por nada.
                    if (!aviso.lida) marcarLida.mutate(aviso.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Um aviso. Não lido se distingue por três sinais — a palavra "novo", o peso do
 * título e a faixa lateral —, nunca só por cor (WCAG 1.4.1).
 */
function ItemDeAviso({
  aviso,
  rota,
  onAbrir,
}: {
  aviso: Notificacao;
  rota: string | null;
  onAbrir: () => void;
}) {
  const classes = cn(
    'block rounded-md border bg-surface px-4 py-3',
    aviso.lida ? 'border-border' : 'border-border border-l-3 border-l-accent-strong',
    rota && 'transition hover:bg-surface-2',
  );

  const conteudo = (
    <>
      <span className="flex items-center gap-2">
        {!aviso.lida && (
          <span className="rounded-full bg-accent-soft px-2 py-px font-mono text-mono-xs uppercase text-coral-700">
            novo
          </span>
        )}
        <span className="font-mono text-mono-xs uppercase text-text-subtle">
          {rotuloDoTipo(aviso.tipo)}
        </span>
        <span className="ml-auto font-mono text-mono-xs text-text-subtle">
          {formatRelative(aviso.criadoEm)}
        </span>
      </span>

      <span
        className={cn(
          'mt-1 block text-body-sm',
          aviso.lida ? 'font-medium text-text-muted' : 'font-bold text-text',
        )}
      >
        {aviso.titulo}
      </span>

      <span className="mt-1 block text-body-xs text-text-muted">{aviso.mensagem}</span>
    </>
  );

  // Sem referência não há o que abrir — e um link para lugar nenhum é pior do
  // que um cartão inerte. O botão "marcar todas" cobre a leitura desse caso.
  if (!rota) return <div className={classes}>{conteudo}</div>;

  return (
    <Link to={rota} onClick={onAbrir} className={classes}>
      {conteudo}
    </Link>
  );
}
