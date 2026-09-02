import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FiltroAlcance, FiltroPeriodo, FiltroPreco } from '../types/domain';
import { mensagemDeErro, useEventos } from '../hooks/useCampusData';
import { Chip } from '../components/ui/Chip';
import { EventListItem } from '../components/ui/EventListItem';
import { EmptyState, ErrorState, SkeletonLista } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';

/**
 * Lista de eventos com filtros (RF-015).
 *
 * Os filtros são chips e não um formulário com "aplicar": um toque, um
 * resultado. O filtro por alcance é o que dá nome ao produto, então vem primeiro
 * e é o único grupo mutuamente exclusivo.
 */

const FILTROS_ALCANCE: Array<{ valor: FiltroAlcance; rotulo: string }> = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'MINHA_TURMA', rotulo: 'Minha turma' },
  { valor: 'MEU_CURSO', rotulo: 'Meu curso' },
  { valor: 'FACULDADE', rotulo: 'Faculdade' },
];

export function EventosPage() {
  const [alcance, setAlcance] = useState<FiltroAlcance>('TODOS');
  const [preco, setPreco] = useState<FiltroPreco>('TODOS');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('TODOS');

  const filtros = useMemo(() => ({ alcance, preco, periodo }), [alcance, preco, periodo]);
  const { data, isPending, isError, error, refetch } = useEventos(filtros);

  const algumFiltroAtivo = alcance !== 'TODOS' || preco !== 'TODOS' || periodo !== 'TODOS';

  return (
    <div>
      <header className="mb-6">
        <p className="font-mono text-mono-xs uppercase text-accent-strong">Encontrar</p>
        <h1 className="mt-1 font-display text-display-xl font-bold text-text">Eventos</h1>
        <p className="mt-1 text-body-sm text-text-muted">
          Você vê o que é da sua turma, do seu curso e da faculdade.
        </p>
      </header>

      <div className="mb-3">
        <div className="hscroll" role="group" aria-label="Filtrar por alcance">
          {FILTROS_ALCANCE.map((filtro) => (
            <Chip
              key={filtro.valor}
              ativo={alcance === filtro.valor}
              onClick={() => setAlcance(filtro.valor)}
            >
              {filtro.rotulo}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="hscroll" role="group" aria-label="Outros filtros">
          <Chip
            ativo={preco === 'GRATUITOS'}
            onClick={() => setPreco(preco === 'GRATUITOS' ? 'TODOS' : 'GRATUITOS')}
          >
            Gratuitos
          </Chip>
          <Chip
            ativo={preco === 'PAGOS'}
            onClick={() => setPreco(preco === 'PAGOS' ? 'TODOS' : 'PAGOS')}
          >
            Pagos
          </Chip>
          <Chip
            ativo={periodo === 'PROXIMOS_7_DIAS'}
            onClick={() => setPeriodo(periodo === 'PROXIMOS_7_DIAS' ? 'TODOS' : 'PROXIMOS_7_DIAS')}
          >
            Próximos 7 dias
          </Chip>
          <Chip
            ativo={periodo === 'ESTE_MES'}
            onClick={() => setPeriodo(periodo === 'ESTE_MES' ? 'TODOS' : 'ESTE_MES')}
          >
            Este mês
          </Chip>
        </div>
      </div>

      {isPending && <SkeletonLista itens={4} />}

      {isError && (
        <ErrorState mensagem={mensagemDeErro(error)} onTentarDeNovo={() => void refetch()} />
      )}

      {data && (
        <>
          <p aria-live="polite" className="mb-3 font-mono text-mono-sm text-text-muted">
            {data.length} {data.length === 1 ? 'evento' : 'eventos'}
          </p>

          {data.length === 0 ? (
            <EmptyState
              titulo={
                algumFiltroAtivo
                  ? 'Nenhum evento com esses filtros'
                  : 'Nenhum evento no seu alcance'
              }
              descricao={
                algumFiltroAtivo
                  ? 'Tente afrouxar os filtros — ou seja a pessoa que cria o próximo.'
                  : 'Quando alguém da sua turma, do seu curso ou da faculdade publicar um evento, ele aparece aqui.'
              }
              acao={
                <Link to="/criar">
                  <Button>Criar evento</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3" data-testid="lista-eventos">
              {data.map((evento) => (
                <li key={evento.id}>
                  <EventListItem evento={evento} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
