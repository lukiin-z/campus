import { Injectable } from '@nestjs/common';
import type { Evento as EventoLinha, Participacao as ParticipacaoLinha } from '@prisma/client';
import {
  canTransition,
  canValidateCheckIn,
  checkInWindow,
  classificarLeitura,
  decideCheckIn,
  emitirToken,
  lerToken,
  montarIngresso,
  numericCheckInCode,
  type LeituraCheckinEntrada,
  type MetodoCheckin,
  type PainelCheckin,
  type PayloadIngresso,
  type PresencaView,
  type ResultadoCheckin,
  type TokenIngresso,
} from '@campus/shared';
import { AcessoAEventos } from '../comum/acesso-evento.service';
import { avisar, avisoDeCheckinRealizado } from '../comum/avisos';
import { Conflito, NaoEncontrado, RegraViolada, SemPermissao } from '../comum/erros';
import { paraAutor, paraEvento, paraPresenca } from '../comum/mapeadores';
import type { Titular } from '../comum/titular';
import { travarParticipacao } from '../comum/travas';
import { PrismaService } from '../prisma/prisma.service';
import type { PresencaManualEntrada } from './schemas';

/** `TokenIngresso` com o fim da janela de check-in, como o contrato pede. */
export type TokenIngressoComPrazo = TokenIngresso & { expiraEm: string };

/**
 * Check-in — RF-033 a RF-035, RN-017 e RN-018.
 *
 * ## As três formas convergem para a MESMA decisão
 *
 * Na porta do evento aparecem três coisas: o QR completo (câmera), o código de
 * 8 dígitos (digitado quando a câmera falha, UC-005 A1) e o código impresso
 * `CMP-3ESPX-0184`. `classificarLeitura` separa as três e todas terminam em
 * `decideCheckIn` — se cada forma tivesse seu caminho, uma delas aceitaria o
 * que as outras recusam.
 *
 * Os dois códigos curtos são **derivados** do id da participação
 * (`numericCheckInCode`), não armazenados. Não existe tabela de códigos para
 * ficar dessincronizada com as participações.
 *
 * ## Recusa não é erro HTTP
 *
 * `validar` devolve `aceito: false` com motivo específico, e status de sucesso.
 * Na porta de um evento com fila, "ingresso já usado" é resposta do sistema, não
 * falha dele — e um `4xx` faria a tela mostrar "erro ao validar", que não diz ao
 * operador se ele chama o próximo ou o segurança.
 */
@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acesso: AcessoAEventos,
  ) {}

  // --------------------------------------------------------------- ingresso

  /**
   * RF-033 — o token do ingresso, só para o titular.
   *
   * `404` também quando a participação é de outra pessoa: o id da participação
   * É o id do ingresso, e responder `403` confirmaria a um estranho que alguém
   * tem vaga naquele evento.
   *
   * `expiraEm` é o fim da janela de check-in (`checkInWindow`), e não uma
   * validade própria do token: o ingresso deixa de servir quando a porta fecha.
   * Inventar um prazo menor faria a tela pedir para recarregar o QR sem motivo.
   */
  async obterToken(participacaoId: string, titular: Titular): Promise<TokenIngressoComPrazo> {
    const participacao = await this.prisma.participacao.findUnique({
      where: { id: participacaoId },
      include: { evento: true, usuario: { select: { turma: { select: { nome: true } } } } },
    });

    if (!participacao || participacao.usuarioId !== titular.id) {
      throw new NaoEncontrado('Ingresso não encontrado.');
    }
    if (participacao.status !== 'CONFIRMADA' && participacao.status !== 'PRESENTE') {
      throw new Conflito(
        'NAO_CONFIRMADA',
        'O ingresso só é emitido depois da inscrição confirmada.',
      );
    }

    const emitidoEm = new Date().toISOString();
    const payload: PayloadIngresso = {
      participacaoId: participacao.id,
      eventoId: participacao.eventoId,
      usuarioId: participacao.usuarioId,
      emitidoEm,
    };

    const sigla = participacao.usuario.turma?.nome ?? 'CAMPUS';
    const { closesAt } = checkInWindow(paraEvento(participacao.evento));

    return {
      ...montarIngresso(payload, sigla),
      expiraEm: new Date(closesAt).toISOString(),
    };
  }

  // ----------------------------------------------------------------- painel

  /** RF-035 — o painel da porta: janela, contadores e quem falta. */
  async obterPainel(eventoId: string, titular: Titular): Promise<PainelCheckin> {
    const linha = await this.acesso.exigirVisivel(eventoId, titular);
    this.exigirOperador(titular, linha);

    const evento = paraEvento(linha);
    const janela = checkInWindow(evento);
    const agora = Date.now();

    const participacoes = await this.prisma.participacao.findMany({
      where: { eventoId },
      include: {
        usuario: {
          select: { id: true, nome: true, avatarSeed: true, turma: { select: { nome: true } } },
        },
        presenca: true,
      },
      orderBy: { criadoEm: 'asc' },
    });

    // `flatMap` em vez de `filter` + `map`: o `filter` não estreita o tipo de
    // `p.presenca`, e o que resolveria isso seria um `as` — que este projeto
    // não usa.
    const presencas: PresencaView[] = participacoes
      .flatMap((p) =>
        p.presenca === null
          ? []
          : [{ ...paraPresenca(p.presenca), participante: paraAutor(p.usuario) }],
      )
      .sort((a, b) => new Date(b.checkinEm).getTime() - new Date(a.checkinEm).getTime());

    return {
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        inicio: evento.inicio,
        fim: evento.fim,
        status: evento.status,
      },
      abertoAgora: agora >= janela.opensAt && agora <= janela.closesAt,
      abreEm: new Date(janela.opensAt).toISOString(),
      fechaEm: new Date(janela.closesAt).toISOString(),
      confirmados: participacoes.filter((p) => p.status === 'CONFIRMADA' || p.status === 'PRESENTE')
        .length,
      presentes: participacoes.filter((p) => p.status === 'PRESENTE').length,
      presencas,
      /*
       * Quem ainda não entrou, com o código de contingência de cada um. Só o
       * operador recebe esta lista — é ele que digita o código quando a câmera
       * falha. O TOKEN completo não vem aqui: ele é do dono do ingresso, e o
       * painel não precisa dele para validar por código.
       */
      aguardando: participacoes
        .filter((p) => p.status === 'CONFIRMADA')
        .map((p) => ({
          participacaoId: p.id,
          nome: p.usuario.nome,
          turma: p.usuario.turma?.nome ?? null,
          codigoNumerico: numericCheckInCode(p.id),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    };
  }

  // ---------------------------------------------------------------- leitura

  /** RF-034 e RN-017 — valida uma leitura na porta. */
  async validar(
    eventoId: string,
    titular: Titular,
    entrada: LeituraCheckinEntrada,
  ): Promise<ResultadoCheckin> {
    const linha = await this.acesso.exigirVisivel(eventoId, titular);

    /*
     * O portão de permissão vem ANTES da decisão, e não como parâmetro dela.
     *
     * Antes, `operadorTemPermissao` entrava como campo de `decideCheckIn` e
     * quem não opera a porta recebia `200 { aceito: false, motivo:
     * 'SEM_PERMISSAO' }`. Três problemas nisso:
     *
     * 1. O contrato declara `403` para esta rota, e o `403` declarado nunca
     *    acontecia — cliente escrito contra o contrato tratava um status que
     *    não existia.
     * 2. As duas rotas irmãs de operador (`GET /eventos/:id/checkin` e
     *    `POST /participacoes/:id/presenca-manual`) já respondiam `403` pelo
     *    `exigirOperador`. A mesma recusa saía em duas formas diferentes.
     * 3. `200` obriga o cliente a ler o corpo para descobrir que foi recusado.
     *    HTTP tem um status para exatamente isto.
     *
     * `decideCheckIn` continua recebendo `operadorTemPermissao` porque a camada
     * mockada do CP5 decide tudo num lugar só, sem HTTP no meio — o ramo
     * `SEM_PERMISSAO` segue vivo e testado em `packages/shared`.
     */
    this.exigirOperador(titular, linha);

    const evento = paraEvento(linha);

    const leitura = classificarLeitura(entrada.leitura);
    const participacao = await this.resolverParticipacao(eventoId, leitura);

    /*
     * O payload é reconstruído a partir do que foi lido. Para código numérico e
     * legível não existe token na entrada, então um é emitido para a
     * participação encontrada: `decideCheckIn` opera sobre payload assinado, e
     * as três formas precisam chegar até ela do mesmo jeito.
     */
    const payload = this.payloadDaLeitura(leitura, participacao);

    const presencaExistente = participacao
      ? await this.prisma.presenca.findUnique({ where: { participacaoId: participacao.id } })
      : null;

    const decisao = decideCheckIn({
      token: {
        participacaoId: payload?.participacaoId ?? '',
        eventoId: payload?.eventoId ?? '',
        usuarioId: payload?.usuarioId ?? '',
        emitidoEm: payload?.emitidoEm ?? '',
        // A assinatura é verificada por `lerToken`, que devolve `null` em token
        // adulterado — `assinaturaValida` abaixo carrega esse resultado.
        assinatura: '',
      },
      assinaturaValida: payload !== null && leitura.tipo !== 'INDECIFRAVEL',
      evento,
      participacao: participacao ? { id: participacao.id, status: participacao.status } : null,
      presencaExistente: presencaExistente
        ? { checkinEm: presencaExistente.checkinEm.toISOString() }
        : null,
      operadorTemPermissao: canValidateCheckIn(titular, linha),
      now: new Date(),
    });

    if (!decisao.aceito || !participacao) {
      return {
        aceito: false,
        motivo: decisao.motivo ?? 'TOKEN_INVALIDO',
        mensagem: decisao.mensagem,
        participante: null,
        registradoEm: null,
      };
    }

    return this.registrar(
      participacao.id,
      titular,
      leitura.tipo === 'TOKEN' ? 'QR_CODE' : 'CODIGO_NUMERICO',
      null,
      decisao.mensagem,
    );
  }

  /**
   * RN-018 — presença sem leitura, com motivo e responsável registrados.
   *
   * `ck_publicacao_remocao_justificada` tem um irmão conceitual aqui: a coluna
   * `motivo_correcao` existe justamente para que presença manual não seja
   * indistinguível de presença lida. Moderação e correção sem rastro é o que
   * ninguém audita.
   */
  async registrarPresencaManual(
    participacaoId: string,
    titular: Titular,
    entrada: PresencaManualEntrada,
  ): Promise<ResultadoCheckin> {
    const participacao = await this.prisma.participacao.findUnique({
      where: { id: participacaoId },
    });
    if (!participacao) throw new NaoEncontrado('Inscrição não encontrada.');

    const linha = await this.acesso.exigirVisivel(participacao.eventoId, titular);
    this.exigirOperador(titular, linha);

    if (participacao.status === 'PRESENTE') {
      throw new Conflito('JA_UTILIZADO', 'Esta presença já está registrada.');
    }
    if (participacao.status !== 'CONFIRMADA') {
      throw new RegraViolada(
        'NAO_CONFIRMADA',
        'Só quem tem inscrição confirmada pode ter presença registrada.',
      );
    }

    return this.registrar(
      participacaoId,
      titular,
      'MANUAL',
      entrada.motivo,
      'Presença registrada manualmente.',
    );
  }

  // -------------------------------------------------------------- internos

  /**
   * A escrita da presença. Uma só, para as duas entradas.
   *
   * A transação trava a participação porque duas leituras do mesmo ingresso em
   * sequência rápida são o caso comum na porta — o operador aponta a câmera
   * duas vezes. `presenca_participacao_id_key` é a última defesa: violá-lo é
   * traduzido em `409 JA_UTILIZADO` por `comum/prisma-erros.ts`.
   */
  private async registrar(
    participacaoId: string,
    operador: Titular,
    metodo: MetodoCheckin,
    motivoCorrecao: string | null,
    mensagem: string,
  ): Promise<ResultadoCheckin> {
    return this.prisma.$transaction(async (tx) => {
      await travarParticipacao(tx, participacaoId);

      const participacao = await tx.participacao.findUniqueOrThrow({
        where: { id: participacaoId },
        include: {
          evento: { select: { id: true, titulo: true } },
          usuario: { select: { nome: true, turma: { select: { nome: true } } } },
        },
      });

      // Entre a decisão e a escrita a participação pode ter mudado (o
      // interceptor de expiração roda na borda, outra requisição pode ter
      // cancelado). `canTransition` é quem sabe se `PRESENTE` ainda é destino
      // válido.
      if (!canTransition(participacao.status, 'PRESENTE')) {
        throw new Conflito(
          'NAO_CONFIRMADA',
          'A inscrição mudou de estado antes do registro. Leia o ingresso de novo.',
        );
      }

      const presenca = await tx.presenca.create({
        data: {
          participacaoId,
          registradoPorId: operador.id,
          metodo,
          motivoCorrecao,
        },
      });

      await tx.participacao.update({
        where: { id: participacaoId },
        data: { status: 'PRESENTE' },
      });

      await avisar(tx, avisoDeCheckinRealizado(participacao.usuarioId, participacao.evento));

      return {
        aceito: true,
        motivo: null,
        mensagem,
        participante: {
          nome: participacao.usuario.nome,
          turma: participacao.usuario.turma?.nome ?? null,
        },
        registradoEm: presenca.checkinEm.toISOString(),
      };
    });
  }

  /**
   * Encontra a participação a partir da leitura.
   *
   * Token: o id vem do payload assinado. Códigos curtos: comparação por
   * derivação sobre as participações do evento — `numericCheckInCode(p.id)`. O
   * código legível carrega só os 4 últimos dígitos, então a comparação usa o
   * sufixo, e uma colisão de sufixo dentro do mesmo evento é possível (1 em
   * 10.000 por par). Ela cai no primeiro casamento; o QR e o código de 8
   * dígitos não têm esse problema, e são os dois caminhos primários.
   */
  private async resolverParticipacao(
    eventoId: string,
    leitura: ReturnType<typeof classificarLeitura>,
  ): Promise<ParticipacaoLinha | null> {
    if (leitura.tipo === 'TOKEN') {
      const payload = lerToken(leitura.token);
      if (!payload) return null;
      return this.prisma.participacao.findUnique({ where: { id: payload.participacaoId } });
    }

    if (leitura.tipo === 'CODIGO_NUMERICO' || leitura.tipo === 'CODIGO_LEGIVEL') {
      const doEvento = await this.prisma.participacao.findMany({ where: { eventoId } });
      const alvo =
        leitura.tipo === 'CODIGO_NUMERICO'
          ? leitura.codigo
          : (leitura.codigo.split('-').pop() ?? '');

      return (
        doEvento.find((p) =>
          leitura.tipo === 'CODIGO_NUMERICO'
            ? numericCheckInCode(p.id) === alvo
            : numericCheckInCode(p.id).slice(-4) === alvo,
        ) ?? null
      );
    }

    return null;
  }

  private payloadDaLeitura(
    leitura: ReturnType<typeof classificarLeitura>,
    participacao: ParticipacaoLinha | null,
  ): PayloadIngresso | null {
    if (leitura.tipo === 'TOKEN') return lerToken(leitura.token);
    if (!participacao) return null;

    const emitido = emitirToken({
      participacaoId: participacao.id,
      eventoId: participacao.eventoId,
      usuarioId: participacao.usuarioId,
      emitidoEm: new Date().toISOString(),
    });
    return lerToken(emitido);
  }

  /** RN-024 — quem opera a porta é o organizador ou a coordenação do escopo. */
  private exigirOperador(titular: Titular, evento: EventoLinha): void {
    if (!canValidateCheckIn(titular, evento)) {
      throw new SemPermissao('Só o organizador valida check-in deste evento.');
    }
  }
}
