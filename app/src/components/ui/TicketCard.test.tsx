import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventoView } from '../../types/domain';
import { TicketCard } from './TicketCard';
import { EventListItem } from './EventListItem';
import { ProgressBar } from './ProgressBar';
import { ScopeBadge, StatusBadge } from './Badge';
import { Button } from './Button';

/**
 * Componentes do design system.
 *
 * O foco não é "renderizou": é que a informação de estado exista em TEXTO, e não
 * só em cor — WCAG 1.4.1, e o que faz a interface funcionar em preto e branco.
 */

function evento(parcial: Partial<EventoView> = {}): EventoView {
  return {
    id: 'evt-001',
    organizadorId: 'usr-002',
    titulo: 'Churrasco de encerramento do semestre',
    descricao: '',
    alcance: 'TURMA',
    turmaId: 'tur-001',
    cursoId: null,
    faculdadeId: null,
    inicio: '2026-09-12T16:00:00.000Z',
    fim: '2026-09-12T22:00:00.000Z',
    local: 'Quadra do Campus 2',
    capacidade: 40,
    ocupadas: 18,
    preco: 25,
    status: 'PUBLICADO',
    motivoCancelamento: null,
    prazoInscricao: '2026-09-12T14:00:00.000Z',
    prazoCancelamento: '2026-09-11T16:00:00.000Z',
    capaSeed: 3,
    criadoEm: '2026-08-20T00:00:00.000Z',
    organizador: { id: 'usr-002', nome: 'Rafael Souza', avatarSeed: 2 },
    alcanceRotulo: '3ESPX',
    vagasDisponiveis: 22,
    taxaOcupacao: 0.45,
    inscricoesAbertas: true,
    totalListaEspera: 0,
    minhaParticipacao: null,
    ...parcial,
  };
}

function renderComRota(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TicketCard — elemento de assinatura da marca', () => {
  it('mostra título, preço e contagem de vagas em texto', () => {
    renderComRota(<TicketCard evento={evento()} />);
    expect(screen.getByText('Churrasco de encerramento do semestre')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?25,00/)).toBeInTheDocument();
    expect(screen.getByText('18/40 vagas')).toBeInTheDocument();
  });

  it('o link tem rótulo acessível com data e preço — não é só "leia mais"', () => {
    renderComRota(<TicketCard evento={evento()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/eventos/evt-001');
    expect(link.getAttribute('aria-label')).toContain('Churrasco de encerramento do semestre');
    expect(link.getAttribute('aria-label')).toContain('25,00');
  });

  it('evento gratuito mostra "Gratuito", nunca "R$ 0,00"', () => {
    renderComRota(<TicketCard evento={evento({ preco: 0 })} />);
    expect(screen.getByText('Gratuito')).toBeInTheDocument();
  });

  it('lotado com fila mostra o tamanho da fila EM TEXTO', () => {
    renderComRota(
      <TicketCard
        evento={evento({ ocupadas: 80, capacidade: 80, vagasDisponiveis: 0, totalListaEspera: 7 })}
      />,
    );
    expect(screen.getByText('fila: 7')).toBeInTheDocument();
  });

  it('lotado sem fila diz "lista de espera"', () => {
    renderComRota(<TicketCard evento={evento({ vagasDisponiveis: 0, totalListaEspera: 0 })} />);
    expect(screen.getByText('lista de espera')).toBeInTheDocument();
  });

  it('evento cancelado diz "cancelado" — não depende da opacidade para comunicar', () => {
    renderComRota(<TicketCard evento={evento({ status: 'CANCELADO' })} />);
    expect(screen.getByText('cancelado')).toBeInTheDocument();
  });
});

describe('EventListItem', () => {
  it('mostra dia e mês separados, para alinhar em coluna na lista', () => {
    renderComRota(<EventListItem evento={evento()} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('set')).toBeInTheDocument();
  });

  it('informa quantas vagas restam, não só que "tem vaga"', () => {
    renderComRota(<EventListItem evento={evento()} />);
    expect(screen.getByText('22 vagas livres')).toBeInTheDocument();
  });
});

describe('ProgressBar — barra de vagas', () => {
  it('expõe o progresso para leitor de tela com valores reais', () => {
    render(<ProgressBar ocupadas={18} capacidade={40} />);
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '18');
    expect(barra).toHaveAttribute('aria-valuemax', '40');
    expect(barra.getAttribute('aria-label')).toBe('18 de 40 vagas preenchidas');
  });

  it('o número aparece em texto, ao lado da barra', () => {
    render(<ProgressBar ocupadas={72} capacidade={80} rotuloDireita="lista de espera ativa" />);
    expect(screen.getByText('72/80 vagas')).toBeInTheDocument();
    expect(screen.getByText('lista de espera ativa')).toBeInTheDocument();
  });
});

describe('Badges — estado nunca é só cor', () => {
  it('ScopeBadge mostra o rótulo do alcance', () => {
    render(<ScopeBadge alcance="TURMA" rotulo="minha turma" />);
    expect(screen.getByText('minha turma')).toBeInTheDocument();
  });

  it('StatusBadge traduz o estado para português', () => {
    render(<StatusBadge status="LISTA_ESPERA" />);
    expect(screen.getByText('lista de espera')).toBeInTheDocument();
  });

  it('StatusBadge não expõe o nome do enum na interface', () => {
    render(<StatusBadge status="PENDENTE_PAGAMENTO" />);
    expect(screen.queryByText('PENDENTE_PAGAMENTO')).not.toBeInTheDocument();
    expect(screen.getByText('aguardando pagamento')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('carregando desabilita e anuncia o estado', () => {
    render(<Button carregando>Quero participar</Button>);
    const botao = screen.getByRole('button');
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
  });

  it('tem type="button" por padrão, para não submeter formulário por acidente', () => {
    render(<Button>Salvar rascunho</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('respeita a área mínima de toque de 44px', () => {
    render(<Button>Quero participar</Button>);
    expect(screen.getByRole('button').className).toContain('min-h-touch');
  });
});
