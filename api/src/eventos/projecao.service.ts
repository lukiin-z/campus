import { Injectable } from '@nestjs/common';
import type { Evento as EventoLinha } from '@prisma/client';
import {
  alcanceRotulo,
  availableSpots,
  enrollmentOpen,
  findActiveParticipation,
  occupancyRate,
  waitlistSize,
  type Curso,
  type EventoView,
  type Faculdade,
  type Turma,
} from '@campus/shared';
import { NaoEncontrado } from '../comum/erros';
import {
  paraAutor,
  paraCurso,
  paraEvento,
  paraFaculdade,
  paraParticipacao,
  paraTurma,
} from '../comum/mapeadores';
import type { Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `Evento` → `EventoView`: a projeção que a lista e o detalhe consomem.
 *
 * ## Por que a projeção existe
 *
 * Sem ela, a tela de lista faria uma requisição por evento para descobrir
 * quantas vagas sobraram, se as inscrições estão abertas, qual o rótulo do
 * alcance e se a pessoa já está inscrita. São cinco derivações, todas baratas
 * no servidor e todas impossíveis no cliente sem mais uma volta na rede.
 *
 * ## Todos os cinco campos derivados saem de função de domínio
 *
 * `vagasDisponiveis` é `availableSpots`, `taxaOcupacao` é `occupancyRate`,
 * `inscricoesAbertas` é `enrollmentOpen`, `totalListaEspera` é `waitlistSize`,
 * `minhaParticipacao` é `findActiveParticipation` e `alcanceRotulo` é
 * `alcanceRotulo`. Nenhuma conta aqui — o mock do CP5 calculava
 * `taxaOcupacao` com uma divisão escrita à mão, o que ignorava o caso
 * `capacidade = 0` que `occupancyRate` trata.
 *
 * ## Por que uma consulta por COLEÇÃO, e não por evento
 *
 * `paraViews` carrega participações, organizadores e referências em quatro
 * consultas, independentemente do tamanho da lista. A versão ingênua — projetar
 * um evento por vez — faria 4 × N consultas, e a lista de eventos é a tela mais
 * aberta do produto (RNF-007).
 */
@Injectable()
export class ProjecaoDeEventos {
  constructor(private readonly prisma: PrismaService) {}

  async paraView(linha: EventoLinha, titular: Titular): Promise<EventoView> {
    const [view] = await this.paraViews([linha], titular);
    // A lista de entrada tem um elemento, então a de saída também — mas
    // `noUncheckedIndexedAccess` pede a prova, e ela é barata.
    if (!view) throw new NaoEncontrado('Evento não encontrado.');
    return view;
  }

  async paraViews(linhas: readonly EventoLinha[], titular: Titular): Promise<EventoView[]> {
    if (linhas.length === 0) return [];

    const agora = new Date();
    const eventoIds = linhas.map((linha) => linha.id);

    const participacoes = await this.prisma.participacao.findMany({
      where: { eventoId: { in: eventoIds } },
      orderBy: { criadoEm: 'asc' },
    });

    const porEvento = new Map<string, ReturnType<typeof paraParticipacao>[]>();
    for (const linha of participacoes) {
      const lista = porEvento.get(linha.eventoId) ?? [];
      lista.push(paraParticipacao(linha));
      porEvento.set(linha.eventoId, lista);
    }

    const organizadores = await this.prisma.usuario.findMany({
      where: { id: { in: [...new Set(linhas.map((linha) => linha.organizadorId))] } },
      select: { id: true, nome: true, avatarSeed: true },
    });
    const porOrganizador = new Map(organizadores.map((u) => [u.id, paraAutor(u)]));

    const referencias = await this.referencias(linhas, titular);

    return linhas.map((linha) => {
      const evento = paraEvento(linha);
      const doEvento = porEvento.get(linha.id) ?? [];

      return {
        ...evento,
        organizador: porOrganizador.get(linha.organizadorId) ?? {
          id: linha.organizadorId,
          nome: 'Organizador',
          avatarSeed: 1,
        },
        alcanceRotulo: alcanceRotulo(evento, referencias),
        vagasDisponiveis: availableSpots(evento),
        taxaOcupacao: occupancyRate(evento),
        inscricoesAbertas: enrollmentOpen(evento, agora),
        totalListaEspera: waitlistSize(doEvento),
        minhaParticipacao: findActiveParticipation(doEvento, titular.id),
      };
    });
  }

  /**
   * Turmas, cursos e faculdade que `alcanceRotulo` precisa para transformar
   * `alcance` + âncora em "3ESPX", "Engenharia de Computação" ou "FIAP".
   *
   * Só as âncoras que aparecem nesta lista são carregadas. Carregar todas as
   * turmas da faculdade funcionaria e seria mais simples, mas cresce com a
   * instituição em vez de crescer com a resposta.
   */
  private async referencias(
    linhas: readonly EventoLinha[],
    titular: Titular,
  ): Promise<{ turmas: Turma[]; cursos: Curso[]; faculdade: Faculdade }> {
    const turmaIds = linhas.map((linha) => linha.turmaId).filter((id): id is string => id !== null);
    const cursoIds = linhas.map((linha) => linha.cursoId).filter((id): id is string => id !== null);

    const [turmas, cursos, faculdade] = await Promise.all([
      turmaIds.length > 0
        ? this.prisma.turma.findMany({ where: { id: { in: turmaIds } } })
        : Promise.resolve([]),
      cursoIds.length > 0
        ? this.prisma.curso.findMany({ where: { id: { in: cursoIds } } })
        : Promise.resolve([]),
      this.prisma.faculdade.findUnique({ where: { id: titular.faculdadeId } }),
    ]);

    if (!faculdade) throw new NaoEncontrado('Faculdade não encontrada.');

    return {
      turmas: turmas.map(paraTurma),
      cursos: cursos.map(paraCurso),
      faculdade: paraFaculdade(faculdade),
    };
  }
}
