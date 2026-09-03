import { Injectable } from '@nestjs/common';
import { Prisma, type Evento as EventoLinha } from '@prisma/client';
import { canSee } from '@campus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NaoEncontrado } from './erros';
import { paraEvento } from './mapeadores';
import { listaAtivos } from './status';
import type { Titular } from './titular';
import type { ClienteBanco } from './travas';

/**
 * O portão de alcance — RN-001 e RNF-012.
 *
 * ## Por que isto é um serviço, e por que TODO handler de escrita passa por ele
 *
 * O defeito nº 3 do CP4 foi exatamente um handler de escrita que não repetia a
 * verificação de alcance: dava para se inscrever, por requisição direta, em um
 * evento que a tela nunca mostraria. A leitura filtrava, a escrita não.
 *
 * Um guard de rota não resolve isso. Guard olha papel e token — informação que
 * cabe na requisição. Alcance depende do RECURSO: o mesmo usuário pode ver o
 * evento X e não ver o Y, e a diferença está no `turma_id` da linha. Então a
 * verificação tem de acontecer depois de carregar o recurso, dentro do handler,
 * em toda leitura e em toda escrita.
 *
 * `exigirVisivel` é esse ponto único. Ele devolve a linha ou lança `404` — nunca
 * `403`, porque `403` confirmaria que o evento existe (RNF-012).
 */
@Injectable()
export class AcessoAEventos {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carrega o evento e recusa com `404` se estiver fora do alcance do titular.
   *
   * Aceita um cliente de transação: quando a escrita precisa de trava
   * (`travarEvento`), a verificação de alcance tem de acontecer DENTRO da mesma
   * transação — verificar fora e escrever dentro deixa uma janela em que o
   * vínculo muda entre as duas.
   */
  async exigirVisivel(
    eventoId: string,
    titular: Titular,
    cliente: ClienteBanco = this.prisma,
  ): Promise<EventoLinha> {
    const evento = await cliente.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NaoEncontrado('Evento não encontrado.');

    const ativas = await cliente.participacao.count({
      where: { eventoId, usuarioId: titular.id, status: { in: listaAtivos() } },
    });

    /*
     * `temParticipacaoAtiva` é a exceção deliberada de RN-001: quem já tem vaga
     * continua vendo o evento mesmo depois de perder o vínculo (trocou de
     * turma). Perder acesso ao próprio ingresso seria pior que a inconsistência.
     */
    if (!canSee(titular, evento, { temParticipacaoAtiva: ativas > 0 })) {
      throw new NaoEncontrado('Evento não encontrado.');
    }

    return evento;
  }

  /**
   * Eventos visíveis para o titular.
   *
   * O `WHERE` é um **superconjunto** do que `canSee` aceita, e a decisão final é
   * de `canSee` — não de SQL. Traduzir RN-001 para `WHERE` seria escrever a
   * regra uma segunda vez, em outra linguagem, sem os testes que a primeira
   * tem: a divergência apareceria como evento que a lista mostra e o detalhe
   * responde `404`.
   *
   * O papel do SQL aqui é só não trazer a tabela inteira para a memória.
   */
  async eventosVisiveis(titular: Titular): Promise<EventoLinha[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { OR: this.candidatos(titular) },
      orderBy: { inicio: 'asc' },
    });

    const meus = await this.prisma.participacao.findMany({
      where: { usuarioId: titular.id, status: { in: listaAtivos() } },
      select: { eventoId: true },
    });
    const comParticipacaoAtiva = new Set(meus.map((p) => p.eventoId));

    return eventos.filter((evento) =>
      canSee(titular, evento, { temParticipacaoAtiva: comParticipacaoAtiva.has(evento.id) }),
    );
  }

  /** Os ids visíveis, para o feed filtrar publicação por evento. */
  async idsVisiveis(titular: Titular): Promise<Set<string>> {
    const eventos = await this.eventosVisiveis(titular);
    return new Set(eventos.map((evento) => evento.id));
  }

  /**
   * Pré-filtro do banco. Cada ramo espelha um caminho de `canSee`, e na dúvida
   * inclui: falso positivo aqui é descartado por `canSee`; falso negativo
   * esconderia evento que a pessoa tem direito de ver, e ninguém descobriria.
   */
  private candidatos(titular: Titular): Prisma.EventoWhereInput[] {
    const adminFaculdade = titular.papeis.includes('ADMIN_FACULDADE');
    const adminCurso = titular.papeis.includes('ADMIN_CURSO');

    const porVinculo: Prisma.EventoWhereInput[] = [{ faculdadeId: titular.faculdadeId }];
    if (titular.turmaId !== null) porVinculo.push({ turmaId: titular.turmaId });
    if (titular.cursoId !== null) porVinculo.push({ cursoId: titular.cursoId });
    // Admin de Curso alcança evento de turma; Admin de Faculdade também vê o
    // que está em aprovação (RN-003).
    if (adminCurso) porVinculo.push({ turmaId: { not: null } });
    if (adminFaculdade) porVinculo.push({ status: 'EM_APROVACAO' });

    return [
      // Organizador sempre vê o que criou, inclusive rascunho.
      { organizadorId: titular.id },
      { participacoes: { some: { usuarioId: titular.id, status: { in: listaAtivos() } } } },
      { status: { not: 'RASCUNHO' }, OR: porVinculo },
    ];
  }

  /** Atalho para quem precisa do evento já no formato do contrato. */
  async exigirVisivelComoDominio(eventoId: string, titular: Titular) {
    return paraEvento(await this.exigirVisivel(eventoId, titular));
  }
}
