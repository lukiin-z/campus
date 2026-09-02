import { describe, expect, it } from 'vitest';
import { ApiError, definirToken, obterToken, repositories } from './index';
import { getDb } from '../mocks/db';

/**
 * CT-040 — todo método de repositório é exercido pela camada HTTP real.
 *
 * A cobertura de **funções** de `services/http` estava em 45,71% e derrubou o
 * limite de RNF-015 por 0,43 ponto. O número não era um detalhe de métrica: ele
 * dizia que metade dos métodos do contrato de dados nunca havia sido chamada
 * nem uma vez.
 *
 * Isso importa mais no CP6 do que importaria em qualquer outro momento. A troca
 * do mock pela API real (ADR-0003, RNF-016) muda **exatamente** este arquivo de
 * implementação — e um método sem nenhuma chamada é um método cuja assinatura,
 * caminho e tratamento de erro ninguém verificou. O primeiro a descobrir seria
 * o avaliador.
 *
 * Cada caso aqui é curto de propósito: a regra de negócio é testada em
 * `@campus/shared` e nos outros arquivos de integração. O que se prova aqui é
 * que o método **existe, é chamável e devolve a forma prometida**.
 */

describe('AuthRepository', () => {
  it('obterFaculdade devolve os domínios aceitos', async () => {
    const faculdade = await repositories.auth.obterFaculdade();
    expect(faculdade.sigla).toBe('FIAP');
    expect(faculdade.dominiosEmail.length).toBeGreaterThan(0);
  });

  it('listarCursos e listarTurmas devolvem a estrutura acadêmica', async () => {
    const cursos = await repositories.auth.listarCursos();
    expect(cursos.length).toBeGreaterThan(0);

    const primeiro = cursos[0];
    expect(primeiro).toBeDefined();
    if (!primeiro) return;

    const turmas = await repositories.auth.listarTurmas(primeiro.id);
    expect(turmas.every((t) => t.cursoId === primeiro.id)).toBe(true);
  });

  it('entrar guarda o token na camada de serviço, não na tela', async () => {
    /*
     * A tela nunca vê o cabeçalho `Authorization`. Este caso protege essa
     * fronteira: se o `definirToken` saísse de dentro de `entrar`, a página de
     * login passaria a ter de conhecer o transporte.
     */
    definirToken(null);
    const resultado = await repositories.auth.entrar({
      email: 'marina.alves@fiap.com.br',
      senha: 'campus123',
    });

    expect(resultado.sessao.usuario.nome).toBe('Marina Alves');
    expect(obterToken()).toBe(resultado.token);
  });

  it('sair limpa o token local mesmo que o servidor não colabore', async () => {
    await repositories.auth.entrar({ email: 'marina.alves@fiap.com.br', senha: 'campus123' });
    expect(obterToken()).toBeTruthy();

    await repositories.auth.sair();
    // Manter o token depois de "sair" é pior que uma sessão órfã no servidor.
    expect(obterToken()).toBeNull();
  });

  it('credencial errada vira ApiError com 401, não resultado vazio', async () => {
    try {
      await repositories.auth.entrar({ email: 'marina.alves@fiap.com.br', senha: 'errada12' });
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(401);
        expect(erro.codigo).toBe('CREDENCIAL_INVALIDA');
      }
    }
  });

  it('concluirOnboarding vincula curso e turma e devolve a sessão completa', async () => {
    const login = await repositories.auth.entrar({
      email: 'lucas.tavares@fiap.com.br',
      senha: 'campus123',
    });
    expect(login.sessao.turma).toBeNull();

    const sessao = await repositories.auth.concluirOnboarding({
      cursoId: 'cur-001',
      codigoConvite: '3ESPX-26',
    });
    expect(sessao.turma?.nome).toBe('3ESPX');
    expect(sessao.curso?.nome).toContain('Engenharia');
  });
});

describe('EventsRepository', () => {
  it('destaques devolve só evento com inscrição aberta', async () => {
    const destaques = await repositories.events.destaques();
    expect(destaques.length).toBeGreaterThan(0);
    expect(destaques.every((e) => e.inscricoesAbertas)).toBe(true);
  });

  it('criar devolve o evento com a âncora resolvida pelo vínculo de quem cria', async () => {
    const daquiUmMes = new Date(Date.now() + 30 * 24 * 3_600_000);
    const evento = await repositories.events.criar({
      titulo: 'Maratona de revisão de Cálculo',
      descricao: 'Três horas de exercício resolvido com dois monitores do quarto semestre.',
      alcance: 'TURMA',
      inicio: daquiUmMes.toISOString(),
      fim: new Date(daquiUmMes.getTime() + 3 * 3_600_000).toISOString(),
      local: 'Laboratório 3',
      capacidade: 30,
      preco: 0,
      publicar: true,
    });

    expect(evento.status).toBe('PUBLICADO');
    // RN-001: a âncora vem do vínculo, e não do corpo da requisição.
    expect(evento.turmaId).toBe('tur-001');
    expect(evento.ocupadas).toBe(0);
    expect(evento.alcanceRotulo).toBe('3ESPX');
  });

  it('filtros chegam ao servidor como query string', async () => {
    const daTurma = await repositories.events.listar({ alcance: 'MINHA_TURMA' });
    expect(daTurma.every((e) => e.alcance === 'TURMA')).toBe(true);

    const gratuitos = await repositories.events.listar({ preco: 'GRATUITOS' });
    expect(gratuitos.every((e) => e.preco === 0)).toBe(true);

    const busca = await repositories.events.listar({ busca: 'churrasco' });
    expect(busca.length).toBeGreaterThan(0);
    expect(
      busca.every((e) =>
        `${e.titulo} ${e.local} ${e.descricao}`.toLowerCase().includes('churrasco'),
      ),
    ).toBe(true);
  });
});

describe('PaymentsRepository', () => {
  it('iniciar, obter e simular percorrem a cobrança inteira', async () => {
    const cobranca = await repositories.payments.iniciar('par-052', { metodo: 'PIX' });
    expect(cobranca.status).toBe('AGUARDANDO');
    expect(cobranca.pix?.brCode).toContain('br.gov.bcb.pix');

    const lida = await repositories.payments.obter('par-052');
    expect(lida?.id).toBe(cobranca.id);

    const confirmada = await repositories.payments.simularDesfecho(cobranca.id, 'CONFIRMAR');
    expect(confirmada.status).toBe('CONFIRMADO');
    expect(confirmada.confirmadoEm).toBeTruthy();
    // Confirmada, a cobrança não devolve mais o QR: o Pix não serve mais.
    expect(confirmada.pix).toBeNull();
  });

  it('obter devolve null quando a participação não tem cobrança nenhuma', async () => {
    // `404` da API não é falha do app: é "essa inscrição não tem cobrança".
    // `par-040` é a Feira de Carreiras, gratuita — nunca teve cobrança.
    expect(await repositories.payments.obter('par-040')).toBeNull();
  });

  it('obter devolve a cobrança já confirmada do seed', async () => {
    // `par-001` tem pagamento confirmado (churrasco, R$ 25). Vale o caso: a
    // primeira redação deste arquivo supôs que ele não tinha, e o teste
    // corrigiu a suposição.
    const paga = await repositories.payments.obter('par-001');
    expect(paga?.status).toBe('CONFIRMADO');
    expect(paga?.pix).toBeNull();
  });

  it('cartão trafega como resumo, e o número não existe no contrato', async () => {
    const cobranca = await repositories.payments.iniciar('par-052', {
      metodo: 'CARTAO_CREDITO',
      cartao: { ultimosQuatro: '4444', bandeira: 'Mastercard', titular: 'MARINA ALVES' },
    });

    expect(cobranca.cartao?.ultimosQuatro).toBe('4444');
    // RNF-022: nada além dos quatro dígitos volta do servidor.
    expect(JSON.stringify(cobranca)).not.toContain('5555');
  });
});

describe('CheckinRepository', () => {
  it('obterTokenDoIngresso devolve as três formas do mesmo ingresso', async () => {
    const token = await repositories.checkin.obterTokenDoIngresso('par-001');
    expect(token.valor.startsWith('campus.v1.')).toBe(true);
    expect(token.codigoNumerico).toMatch(/^\d{8}$/);
    expect(token.codigoLegivel).toMatch(/^CMP-[A-Z0-9]+-\d{4}$/);
  });

  it('obterPainel propaga o 403, e NÃO o transforma em null', async () => {
    /*
     * `evt-001` é organizado por Rafael; o usuário autenticado do mock é Marina.
     *
     * A distinção importa e a primeira redação deste caso a errou, esperando
     * `null`. `null` é a resposta para "não existe ou está fora do seu alcance"
     * (RN-001, e aí o `404` esconde a existência). Aqui a pessoa **vê** o
     * evento; o que ela não pode é operar a porta. São duas telas diferentes —
     * "evento não encontrado" e "só o organizador valida check-in" — e conflatá-las
     * em `null` deixaria o organizador sem saber por que o painel não abre.
     */
    try {
      await repositories.checkin.obterPainel('evt-001');
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(403);
        expect(erro.codigo).toBe('SEM_PERMISSAO');
      }
    }
  });

  it('validar devolve resultado, não exceção, quando a leitura é recusada', async () => {
    /*
     * Recusa de check-in é resposta do sistema, com `200` e `aceito: false`. Se
     * virasse exceção, cairia em `onError` e a porta do evento mostraria "erro
     * ao validar" — que não diz ao operador se chama o próximo ou o segurança.
     *
     * O motivo aqui é `SEM_PERMISSAO` e não `TOKEN_INVALIDO`: `evt-013` é
     * organizado por Rafael, e o usuário do mock é Marina. A permissão é a
     * primeira das sete condições de RN-017 justamente porque não depende de
     * ler nada — recusar antes de tocar no token não dá pista a quem tenta
     * fraudar.
     */
    const resultado = await repositories.checkin.validar('evt-013', 'nao-e-um-ingresso');
    expect(resultado.aceito).toBe(false);
    expect(resultado.motivo).toBe('SEM_PERMISSAO');
    expect(resultado.mensagem.length).toBeGreaterThan(0);
  });
});

describe('FeedRepository e NotificationsRepository', () => {
  it('eventosPublicaveis, publicar e comentar formam o caminho de escrita', async () => {
    const publicaveis = await repositories.feed.eventosPublicaveis();
    const alvo = publicaveis[0];
    expect(alvo).toBeDefined();
    if (!alvo) return;

    const publicacao = await repositories.feed.publicar({
      eventoId: alvo.id,
      legenda: 'Ficou melhor do que a gente esperava.',
    });
    const comentario = await repositories.feed.comentar(publicacao.id, { texto: 'Melhor edição.' });
    expect(comentario.publicacaoId).toBe(publicacao.id);
  });

  it('marcarComoLida e marcarTodasComoLidas zeram o contador', async () => {
    const antes = await repositories.notifications.listar();
    const naoLida = antes.find((n) => !n.lida);
    expect(naoLida).toBeDefined();
    if (!naoLida) return;

    await repositories.notifications.marcarComoLida(naoLida.id);
    const meio = await repositories.notifications.listar();
    expect(meio.find((n) => n.id === naoLida.id)?.lida).toBe(true);

    await repositories.notifications.marcarTodasComoLidas();
    const depois = await repositories.notifications.listar();
    expect(depois.every((n) => n.lida)).toBe(true);
  });
});

describe('ParticipationsRepository', () => {
  it('obter devolve a participação com evento, pagamento e presença resolvidos', async () => {
    const participacao = await repositories.participations.obter('par-001');
    expect(participacao?.evento.titulo).toContain('Churrasco');
    // A projeção resolve os relacionamentos: a tela não faz três chamadas.
    expect(participacao).toHaveProperty('pagamento');
    expect(participacao).toHaveProperty('presenca');
  });

  it('obter devolve null para id inexistente', async () => {
    expect(await repositories.participations.obter('par-inexistente')).toBeNull();
  });

  it('cancelar devolve se houve promoção da fila', async () => {
    const antes = getDb().participacoes.find((p) => p.id === 'par-001')?.status;
    expect(antes).toBe('CONFIRMADA');

    const resultado = await repositories.participations.cancelar('par-001');
    expect(resultado.cancelada).toBe(true);
    // `evt-001` tem vaga sobrando, então não há fila para promover.
    expect(resultado.promovido).toBeNull();
  });

  it('entrarNaListaEspera devolve a posição na fila', async () => {
    const db = getDb();
    db.participacoes = db.participacoes.filter(
      (p) => !(p.eventoId === 'evt-002' && p.usuarioId === 'usr-001'),
    );

    const participacao = await repositories.participations.entrarNaListaEspera('evt-002');
    expect(participacao.status).toBe('LISTA_ESPERA');
    expect(participacao.posicaoFila).toBeGreaterThanOrEqual(1);
  });

  it('confirmarOferta transforma a oferta em vaga confirmada', async () => {
    const confirmada = await repositories.participations.confirmarOferta('par-122');
    expect(confirmada.status).toBe('CONFIRMADA');
    expect(confirmada.ofertaExpiraEm).toBeNull();
  });
});
