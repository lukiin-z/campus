import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  canPostToEvent,
  canRemovePost,
  type Comentario,
  type NovaPublicacaoEntrada,
  type NovoComentarioEntrada,
  type PublicacaoView,
  type Usuario,
} from '@campus/shared';
import { AcessoAEventos } from '../comum/acesso-evento.service';
import { NaoEncontrado, RegraViolada, SemPermissao } from '../comum/erros';
import { paraAutor, paraComentario, paraPublicacao } from '../comum/mapeadores';
import type { Titular } from '../comum/titular';
import { PrismaService } from '../prisma/prisma.service';

/** Entrada de `POST /publicacoes/:id/remocao`. */
export interface RemocaoEntrada {
  motivo: string;
}

/**
 * Comentário com o autor resolvido.
 *
 * O contrato exige `autor` no `Comentario` (é campo `required` no schema), e a
 * razão é a tela: o cartão de publicação mostra nome e avatar de quem comentou.
 * Sem o objeto, o feed renderizaria `undefined` por comentário — e a tela não
 * pode buscar usuário por conta própria.
 *
 * O autor vem como `{ id, nome, avatarSeed }`, e não como `Usuario` inteiro,
 * porque é o tipo que `PublicacaoView` declara em `@campus/shared` — e porque
 * mandar `email` de quem comentou para todo mundo que abre o feed é o oposto de
 * minimização de dado.
 */
export type ComentarioComAutor = Comentario & {
  autor: Pick<Usuario, 'id' | 'nome' | 'avatarSeed'>;
};

/**
 * Feed — RF-036 a RF-038, RF-042, RN-019 e RN-020.
 *
 * ## O feed é segmentado pelo alcance dos EVENTOS
 *
 * Não existe publicação sem evento (RN-019), e é isso que dá ao feed um modelo
 * de visibilidade sem inventar um segundo: quem vê o evento vê o feed dele. Uma
 * publicação de evento de turma não aparece para quem não é da turma, e a regra
 * que decide é a mesma `canSee` da lista de eventos.
 *
 * ## Quem publica
 *
 * `canPostToEvent` decide, e a definição é estreita de propósito: o organizador
 * (a qualquer momento) e quem esteve no evento — `PRESENTE`, depois de o evento
 * começar. No CP5 havia DOIS critérios diferentes para a mesma pergunta: o
 * seletor de eventos usava "confirmada ou presente" e a escrita usava "qualquer
 * participação ativa", que inclui `LISTA_ESPERA`. O resultado prático era um
 * seletor que oferecia eventos onde a escrita podia ser recusada, e uma escrita
 * que aceitava quem nunca teve vaga. Aqui a função é chamada nos dois lugares.
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acesso: AcessoAEventos,
  ) {}

  /** RF-036 — o feed do titular. */
  async listar(titular: Titular): Promise<PublicacaoView[]> {
    const visiveis = await this.acesso.idsVisiveis(titular);
    if (visiveis.size === 0) return [];

    const publicacoes = await this.prisma.publicacao.findMany({
      where: { eventoId: { in: [...visiveis] }, removida: false },
      include: INCLUDE_DA_VIEW,
      orderBy: { criadoEm: 'desc' },
    });

    return publicacoes.map(paraPublicacaoView);
  }

  /** RN-019 — os eventos em que o titular pode publicar. */
  async eventosPublicaveis(titular: Titular): Promise<Array<{ id: string; titulo: string }>> {
    const eventos = await this.acesso.eventosVisiveis(titular);
    const agora = new Date();

    const minhas = await this.prisma.participacao.findMany({
      where: { usuarioId: titular.id, eventoId: { in: eventos.map((e) => e.id) } },
      select: { eventoId: true, status: true },
      orderBy: { criadoEm: 'desc' },
    });
    const statusPorEvento = new Map(minhas.map((p) => [p.eventoId, p.status]));

    return eventos
      .filter((evento) =>
        canPostToEvent(
          titular,
          {
            organizadorId: evento.organizadorId,
            status: evento.status,
            inicio: evento.inicio.toISOString(),
          },
          statusPorEvento.get(evento.id) ?? null,
          agora,
        ),
      )
      .map((evento) => ({ id: evento.id, titulo: evento.titulo }));
  }

  /**
   * RF-037 — publica no feed do evento.
   *
   * A verificação de alcance acontece aqui, na escrita, e não só na leitura:
   * sem ela um `POST` direto publicaria em evento invisível. Foi exatamente o
   * defeito que a revisão do CP4 expôs nos handlers de inscrição — a leitura
   * filtrava, a escrita não.
   */
  async publicar(titular: Titular, entrada: NovaPublicacaoEntrada): Promise<PublicacaoView> {
    const linha = await this.acesso.exigirVisivel(entrada.eventoId, titular);

    const minha = await this.prisma.participacao.findFirst({
      where: { eventoId: entrada.eventoId, usuarioId: titular.id },
      orderBy: { criadoEm: 'desc' },
      select: { status: true },
    });

    const podePublicar = canPostToEvent(
      titular,
      {
        organizadorId: linha.organizadorId,
        status: linha.status,
        inicio: linha.inicio.toISOString(),
      },
      minha?.status ?? null,
      new Date(),
    );

    if (!podePublicar) {
      const antesDeComecar = Date.now() < linha.inicio.getTime();
      throw new SemPermissao(
        antesDeComecar
          ? 'O feed guarda o que aconteceu: só o organizador publica antes do evento começar.'
          : 'Só quem esteve no evento publica no feed dele (RN-019).',
        'SEM_PARTICIPACAO',
      );
    }

    const criada = await this.prisma.publicacao.create({
      data: {
        eventoId: entrada.eventoId,
        autorId: titular.id,
        legenda: entrada.legenda,
        // 1..24: as imagens são geradas localmente a partir da semente, sem
        // upload e sem storage. Ausente = o servidor escolhe.
        imagemSeed: entrada.imagemSeed ?? (Date.now() % 24) + 1,
      },
      include: INCLUDE_DA_VIEW,
    });

    return paraPublicacaoView(criada);
  }

  /**
   * RF-038 — comenta em publicação visível.
   *
   * Publicação de evento fora do alcance é `404`, igual ao evento: se o
   * comentário respondesse `403`, a existência da publicação — e portanto do
   * evento — estaria confirmada.
   */
  async comentar(
    publicacaoId: string,
    titular: Titular,
    entrada: NovoComentarioEntrada,
  ): Promise<ComentarioComAutor> {
    const publicacao = await this.prisma.publicacao.findUnique({ where: { id: publicacaoId } });
    if (!publicacao || publicacao.removida) {
      throw new NaoEncontrado('Publicação não encontrada.', 'NAO_ENCONTRADA');
    }

    // Recusa com `404` quando o evento está fora do alcance.
    await this.acesso.exigirVisivel(publicacao.eventoId, titular);

    const criado = await this.prisma.comentario.create({
      data: { publicacaoId, autorId: titular.id, texto: entrada.texto },
      include: { autor: { select: { id: true, nome: true, avatarSeed: true } } },
    });

    return { ...paraComentario(criado), autor: paraAutor(criado.autor) };
  }

  /**
   * RF-042 e RN-020 — remoção com motivo e responsável.
   *
   * A publicação **continua existindo** com `removida`, `motivoRemocao` e
   * `removidaPorId`. `ck_publicacao_remocao_justificada` garante que os três
   * andem juntos: moderação sem rastro é moderação que ninguém audita. É também
   * por isso que a rota é `POST /remocao` e não `DELETE`.
   */
  async remover(
    publicacaoId: string,
    titular: Titular,
    entrada: RemocaoEntrada,
  ): Promise<PublicacaoView> {
    const publicacao = await this.prisma.publicacao.findUnique({ where: { id: publicacaoId } });
    if (!publicacao) throw new NaoEncontrado('Publicação não encontrada.', 'NAO_ENCONTRADA');

    const evento = await this.acesso.exigirVisivel(publicacao.eventoId, titular);

    if (publicacao.removida) {
      throw new RegraViolada('JA_REMOVIDA', 'Esta publicação já foi removida.');
    }

    // `canRemovePost` aceita três competências: o autor, o organizador do
    // evento e o admin do escopo (RN-020).
    if (!canRemovePost(titular, publicacao, evento)) {
      throw new SemPermissao('Você não pode remover esta publicação.');
    }

    const removida = await this.prisma.publicacao.update({
      where: { id: publicacaoId },
      data: { removida: true, motivoRemocao: entrada.motivo, removidaPorId: titular.id },
      include: INCLUDE_DA_VIEW,
    });

    return paraPublicacaoView(removida);
  }
}

/**
 * O `include` e o tipo da projeção ficam juntos: `Prisma.PublicacaoGetPayload`
 * deriva o tipo do próprio `include`, então mudar um sem o outro não compila.
 */
const INCLUDE_DA_VIEW = {
  autor: { select: { id: true, nome: true, avatarSeed: true } },
  evento: { select: { id: true, titulo: true, alcance: true } },
  comentarios: {
    where: { removido: false },
    include: { autor: { select: { id: true, nome: true, avatarSeed: true } } },
    orderBy: { criadoEm: 'asc' },
  },
} satisfies Prisma.PublicacaoInclude;

type LinhaDaView = Prisma.PublicacaoGetPayload<{ include: typeof INCLUDE_DA_VIEW }>;

function paraPublicacaoView(linha: LinhaDaView): PublicacaoView {
  return {
    ...paraPublicacao(linha),
    autor: paraAutor(linha.autor),
    evento: { id: linha.evento.id, titulo: linha.evento.titulo, alcance: linha.evento.alcance },
    comentarios: linha.comentarios.map((comentario) => ({
      ...paraComentario(comentario),
      autor: paraAutor(comentario.autor),
    })),
  };
}
