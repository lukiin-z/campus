import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';

/**
 * Check-in, feed e vínculo acadêmico — CT-022 a CT-026, CT-033 e RN-024.
 *
 * ## Por que estes três num arquivo só
 *
 * Os três são o que sobra do domínio depois de vaga, pagamento e alcance: o que
 * eles têm em comum é serem **autorização por papel sobre o recurso**, decidida
 * no handler depois de o recurso ser carregado. Nenhum guard resolve — quem
 * valida a porta é o organizador DAQUELE evento, e quem publica é quem esteve
 * NAQUELE evento.
 *
 * A decisão em si (`decideCheckIn`, `classificarLeitura`, `podePublicar`,
 * `decideOnboarding`) já tem teste de unidade. O que se acrescenta aqui é o que
 * só a requisição prova: que o token emitido pela API é aceito por ela mesma,
 * que a presença é única no banco, e que a recusa de check-in é resposta de
 * SUCESSO (`200`) e não erro HTTP.
 */

const EMAIL_MARINA = 'marina.alves@fiap.com.br';
const EMAIL_RAFAEL = 'rafael.souza@fiap.com.br';
const EMAIL_ISABELA = 'isabela.duarte@fiap.com.br';
const EMAIL_LUCAS = 'lucas.tavares@fiap.com.br';

let app: Aplicacao;
let marina: string;
let rafael: string;

beforeAll(async () => {
  app = await criarAplicacao({ RATE_LIMIT_TENTATIVAS: '10000' });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
  marina = (await entrar(app, EMAIL_MARINA)).accessToken;
  rafael = (await entrar(app, EMAIL_RAFAEL)).accessToken;
});

/** A participação de Marina no evento EM ANDAMENTO (`evt-013`). */
async function participacaoEmAndamento(): Promise<string> {
  const linha = await app.prisma.participacao.findFirstOrThrow({
    where: { eventoId: ID.emAndamento, usuarioId: ID.marina },
  });
  return linha.id;
}

describe('check-in (RN-017, RN-018, RN-024)', () => {
  it('emite o ingresso para o titular e recusa para qualquer outra pessoa', async () => {
    const participacaoId = await participacaoEmAndamento();

    const resposta = await app
      .http()
      .get(`/api/participacoes/${participacaoId}/token`)
      .set(...comToken(marina))
      .expect(200);

    const corpo = resposta.body as {
      valor: string;
      codigoNumerico: string;
      codigoLegivel: string;
      expiraEm: string;
    };
    // As TRÊS formas de leitura saem na mesma resposta (CT-037): o QR, o código
    // de 8 dígitos para quando a câmera falha, e o código legível impresso.
    expect(corpo.valor.length).toBeGreaterThan(20);
    expect(corpo.codigoNumerico).toMatch(/^\d{8}$/);
    expect(corpo.codigoLegivel).toMatch(/^CMP-/);

    // Nem o organizador do evento pega o ingresso de outra pessoa: `404`, e não
    // `403`, porque o id do ingresso é o próprio ingresso.
    await app
      .http()
      .get(`/api/participacoes/${participacaoId}/token`)
      .set(...comToken(rafael))
      .expect(404);
  });

  it('recusa emitir ingresso de inscrição que não está confirmada', async () => {
    // `par-052` é a inscrição de Marina PENDENTE_PAGAMENTO na Festa Junina.
    const resposta = await app
      .http()
      .get(`/api/participacoes/${ID.parPagamentoMarina}/token`)
      .set(...comToken(marina))
      .expect(409);

    expect(resposta.body).toMatchObject({ erro: 'NAO_CONFIRMADA' });
  });

  it('aceita a leitura uma vez e recusa a segunda com 200, não com erro', async () => {
    const participacaoId = await participacaoEmAndamento();
    const emissao = await app
      .http()
      .get(`/api/participacoes/${participacaoId}/token`)
      .set(...comToken(marina))
      .expect(200);
    const token = (emissao.body as { valor: string }).valor;

    // --- primeira leitura: aceite, e presença CRIADA (201) ---
    const aceite = await app
      .http()
      .post(`/api/eventos/${ID.emAndamento}/checkin`)
      .set(...comToken(rafael))
      .send({ leitura: token })
      .expect(201);
    expect(aceite.body).toMatchObject({ aceito: true });

    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    expect(participacao.status).toBe('PRESENTE');
    expect(await app.prisma.presenca.count({ where: { participacaoId } })).toBe(1);

    /*
     * --- segunda leitura do MESMO token: recusa com `200` ---
     *
     * CT-023. O `200` é a decisão de desenho que este caso protege: na porta de
     * um evento com fila, "ingresso já usado" é resposta do sistema, não falha
     * dele. Um `4xx` faria a tela mostrar "erro ao validar", que não diz ao
     * operador se ele chama o próximo ou o segurança.
     */
    const recusa = await app
      .http()
      .post(`/api/eventos/${ID.emAndamento}/checkin`)
      .set(...comToken(rafael))
      .send({ leitura: token })
      .expect(200);
    expect(recusa.body).toMatchObject({ aceito: false });

    // E a presença continua sendo UMA: `presenca_participacao_id_key` é a
    // garantia final de RN-018, e nada a duplicou.
    expect(await app.prisma.presenca.count({ where: { participacaoId } })).toBe(1);
  });

  it('só quem opera a porta valida a leitura', async () => {
    const participacaoId = await participacaoEmAndamento();
    const emissao = await app
      .http()
      .get(`/api/participacoes/${participacaoId}/token`)
      .set(...comToken(marina))
      .expect(200);
    const token = (emissao.body as { valor: string }).valor;

    /*
     * RN-024 — Marina tem o ingresso E o token na mão, e continua não podendo
     * validar o próprio check-in. É o caso que um guard de papel não pegaria: o
     * que decide é ser organizador DAQUELE evento, informação da linha do
     * evento e não do token.
     *
     * ## `403`, e a forma foi corrigida por causa deste caso
     *
     * A recusa vinha como `200 { aceito: false, motivo: 'SEM_PERMISSAO' }`,
     * porque `operadorTemPermissao` era INPUT de `decideCheckIn` em vez de
     * portão antes dela: a falta de competência saía pela mesma porta de
     * "ingresso já usado" e "fora da janela".
     *
     * A garantia de segurança já estava de pé, mas a forma estava errada em três
     * frentes: o contrato declara `403` para esta rota e o `403` declarado nunca
     * acontecia; as duas rotas irmãs de operador já respondiam `403`; e `200`
     * obriga o cliente a ler o corpo para descobrir que foi recusado.
     *
     * `CheckinService.validar` passou a chamar o `exigirOperador` que
     * `registrarPresencaManual` já usava. O ramo `SEM_PERMISSAO` de
     * `decideCheckIn` continua vivo e testado em `packages/shared`, porque a
     * camada mockada do CP5 decide tudo num lugar só, sem HTTP no meio.
     */
    await app
      .http()
      .post(`/api/eventos/${ID.emAndamento}/checkin`)
      .set(...comToken(marina))
      .send({ leitura: token })
      .expect(403);

    // O que importa: nenhuma presença foi criada por quem não opera a porta.
    expect(await app.prisma.presenca.count({ where: { participacaoId } })).toBe(0);
    const participacao = await app.prisma.participacao.findUniqueOrThrow({
      where: { id: participacaoId },
    });
    expect(participacao.status).toBe('CONFIRMADA');
  });

  it('entrada indecifrável recusa sem derrubar o leitor', async () => {
    // CT-036 — lixo na câmera é o caso comum, não o exótico. A leitura tem de
    // voltar `aceito: false`, nunca `500`.
    for (const leitura of ['xxxx', '{"json":"quebrado"', 'CMP-INEXISTENTE-9999', '00000000']) {
      const resposta = await app
        .http()
        .post(`/api/eventos/${ID.emAndamento}/checkin`)
        .set(...comToken(rafael))
        .send({ leitura });

      expect(resposta.status).toBeLessThan(500);
      if (resposta.status === 200) {
        expect(resposta.body).toMatchObject({ aceito: false });
      }
    }
  });

  it('recusa token de um evento na porta de outro', async () => {
    const participacaoId = await participacaoEmAndamento();
    const emissao = await app
      .http()
      .get(`/api/participacoes/${participacaoId}/token`)
      .set(...comToken(marina))
      .expect(200);
    const token = (emissao.body as { valor: string }).valor;

    // O churrasco também é de Rafael, então a competência existe — o que não
    // existe é o ingresso pertencer a este evento (RN-017).
    const resposta = await app
      .http()
      .post(`/api/eventos/${ID.churrasco}/checkin`)
      .set(...comToken(rafael))
      .send({ leitura: token });

    expect(resposta.status).toBeLessThan(500);
    expect(resposta.body).toMatchObject({ aceito: false });
  });

  it('mostra o painel da porta ao organizador e o esconde do participante', async () => {
    const painel = await app
      .http()
      .get(`/api/eventos/${ID.emAndamento}/checkin`)
      .set(...comToken(rafael))
      .expect(200);

    expect(painel.body).toMatchObject({ presentes: expect.any(Number) });

    await app
      .http()
      .get(`/api/eventos/${ID.emAndamento}/checkin`)
      .set(...comToken(marina))
      .expect(403);
  });

  it('presença manual exige motivo com substância e é registrada uma vez', async () => {
    const participacaoId = await participacaoEmAndamento();

    // RN-018 — "ok" não é registro de correção: quem audita a lista precisa
    // saber por que aquela pessoa entrou sem leitura.
    await app
      .http()
      .post(`/api/participacoes/${participacaoId}/presenca-manual`)
      .set(...comToken(rafael))
      .send({ motivo: 'ok' })
      .expect(422);

    const aceite = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/presenca-manual`)
      .set(...comToken(rafael))
      .send({ motivo: 'Celular descarregado; conferido no documento com foto.' })
      .expect(201);
    expect(aceite.body).toMatchObject({ aceito: true });

    // Presença é fato único e imutável (CT-024): a segunda vez não cria outra.
    const segunda = await app
      .http()
      .post(`/api/participacoes/${participacaoId}/presenca-manual`)
      .set(...comToken(rafael))
      .send({ motivo: 'Tentativa repetida do mesmo registro manual.' });
    expect(segunda.status).toBeLessThan(500);
    expect(await app.prisma.presenca.count({ where: { participacaoId } })).toBe(1);
  });
});

describe('feed (RN-019, RN-020)', () => {
  it('lista só publicação de evento visível', async () => {
    const resposta = await app
      .http()
      .get('/api/feed')
      .set(...comToken(marina))
      .expect(200);

    const itens = resposta.body as Array<{ id: string; evento?: { id: string } }>;
    const eventosCitados = new Set(itens.map((i) => i.evento?.id).filter(Boolean));
    // `evt-006` é do curso de SI: nenhuma publicação dele pode aparecer para
    // Marina, e o feed é o caminho mais fácil de vazar alcance por engano —
    // basta esquecer o filtro em uma junção.
    expect(eventosCitados.has(ID.workshopSI)).toBe(false);
  });

  it('só publica quem esteve no evento', async () => {
    // RN-019 — o churrasco ainda não aconteceu, e Marina está CONFIRMADA nele.
    const recusa = await app
      .http()
      .post('/api/publicacoes')
      .set(...comToken(marina))
      .send({ eventoId: ID.churrasco, legenda: 'Foto de um evento que ainda não aconteceu.' });
    expect(recusa.status).toBeGreaterThanOrEqual(400);
    expect(recusa.status).toBeLessThan(500);

    // Já em evento em que ela tem presença registrada, publica.
    const publicaveis = await app
      .http()
      .get('/api/feed/eventos-publicaveis')
      .set(...comToken(marina))
      .expect(200);
    const lista = publicaveis.body as Array<{ id: string }>;
    expect(lista.length).toBeGreaterThan(0);

    const alvo = lista[0];
    if (!alvo) throw new Error('nenhum evento publicável para o titular do seed');

    const aceite = await app
      .http()
      .post('/api/publicacoes')
      .set(...comToken(marina))
      .send({ eventoId: alvo.id, legenda: 'Melhor churrasco do semestre, sem dúvida.' })
      .expect(201);
    expect(aceite.body).toMatchObject({ legenda: 'Melhor churrasco do semestre, sem dúvida.' });
  });

  it('remoção exige motivo e competência, e registra as duas coisas', async () => {
    const publicacao = await app.prisma.publicacao.findFirstOrThrow({
      where: { removida: false },
    });

    // Motivo curto: recusado pelo schema antes de qualquer verificação.
    await app
      .http()
      .post(`/api/publicacoes/${publicacao.id}/remocao`)
      .set(...comToken(marina))
      .send({ motivo: 'nao' })
      .expect(422);

    // Motivo válido, mas sem competência de moderação (RN-020).
    const semPermissao = await app
      .http()
      .post(`/api/publicacoes/${publicacao.id}/remocao`)
      .set(...comToken(marina))
      .send({ motivo: 'Conteúdo que eu simplesmente não gostei de ver no feed.' });
    expect([403, 404]).toContain(semPermissao.status);

    // Admin de Faculdade modera.
    const isabela = await entrar(app, EMAIL_ISABELA);
    const removida = await app
      .http()
      .post(`/api/publicacoes/${publicacao.id}/remocao`)
      .set(...comToken(isabela.accessToken))
      .send({ motivo: 'Imagem com dado pessoal de terceiro visível na foto.' })
      .expect(201);
    expect(removida.body).toMatchObject({ id: publicacao.id });

    // `ck_publicacao_remocao_justificada` exige motivo E autor: as duas colunas
    // têm de ter sido gravadas.
    const linha = await app.prisma.publicacao.findUniqueOrThrow({ where: { id: publicacao.id } });
    expect(linha.removida).toBe(true);
    expect(linha.motivoRemocao).not.toBeNull();
    expect(linha.removidaPorId).not.toBeNull();
  });

  it('comentário exige texto e publicação visível', async () => {
    const publicacao = await app.prisma.publicacao.findFirstOrThrow({
      where: { removida: false },
    });

    await app
      .http()
      .post(`/api/publicacoes/${publicacao.id}/comentarios`)
      .set(...comToken(marina))
      .send({ texto: '' })
      .expect(422);

    const resposta = await app
      .http()
      .post(`/api/publicacoes/${publicacao.id}/comentarios`)
      .set(...comToken(marina))
      .send({ texto: 'Melhor foto da turma até agora.' });
    expect(resposta.status).toBeLessThan(500);
  });
});

describe('vínculo acadêmico (CT-033, RN-003)', () => {
  it('serve a estrutura acadêmica sem exigir token', async () => {
    // As três são `@Publico()` porque a tela de onboarding precisa delas ANTES
    // de existir vínculo — e é o contrato que declara `security: []` nelas.
    const faculdade = await app.http().get('/api/faculdade').expect(200);
    expect(faculdade.body).toMatchObject({ sigla: 'FIAP' });

    const cursos = await app.http().get('/api/cursos').expect(200);
    expect((cursos.body as unknown[]).length).toBe(3);

    const primeiro = (cursos.body as Array<{ id: string }>)[0];
    if (!primeiro) throw new Error('seed sem cursos');
    const turmas = await app.http().get(`/api/cursos/${primeiro.id}/turmas`).expect(200);
    expect((turmas.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('recusa código de turma errado e aceita o certo, gravando o vínculo', async () => {
    // Lucas Tavares tem e-mail verificado e NENHUM vínculo — é o estado entre a
    // verificação e o onboarding, e existe no seed justamente para isto.
    const lucas = await entrar(app, EMAIL_LUCAS);
    const antes = await app.prisma.usuario.findUniqueOrThrow({ where: { id: ID.lucas } });
    expect(antes.turmaId).toBeNull();

    const ecomp = await app.prisma.curso.findFirstOrThrow({ where: { codigo: 'ECOMP' } });

    const errado = await app
      .http()
      .post('/api/auth/onboarding')
      .set(...comToken(lucas.accessToken))
      // `4SIA-26` é código de turma de OUTRO curso: o erro tem de dizer o que
      // corrigir, não só "inválido".
      .send({ cursoId: ecomp.id, codigoConvite: '4SIA-26' })
      .expect(422);
    expect(typeof (errado.body as { erro: string }).erro).toBe('string');

    const certo = await app
      .http()
      .post('/api/auth/onboarding')
      .set(...comToken(lucas.accessToken))
      // Aceito com espaço e em minúscula: `normalizaCodigo` é quem decide, e
      // por isso o código NÃO é buscado por `WHERE codigo_convite = ...`.
      .send({ cursoId: ecomp.id, codigoConvite: ' 3espx-26 ' })
      .expect(201);
    expect(certo.body).toMatchObject({ turma: { nome: '3ESPX' } });

    const depois = await app.prisma.usuario.findUniqueOrThrow({ where: { id: ID.lucas } });
    expect(depois.turmaId).not.toBeNull();
    expect(depois.cursoId).toBe(ecomp.id);

    // Concluir duas vezes é conflito: trocar de turma passa pela coordenação.
    const repetido = await app
      .http()
      .post('/api/auth/onboarding')
      .set(...comToken(lucas.accessToken))
      .send({ cursoId: ecomp.id, codigoConvite: '3ESPX-26' })
      .expect(409);
    expect(repetido.body).toMatchObject({ erro: 'ONBOARDING_CONCLUIDO' });
  });

  it('rotação do código de convite é competência administrativa', async () => {
    const turma = await app.prisma.turma.findFirstOrThrow({ where: { nome: '3ESPX' } });

    await app
      .http()
      .post(`/api/admin/turmas/${turma.id}/codigo`)
      .set(...comToken(marina))
      .expect(403);

    const isabela = await entrar(app, EMAIL_ISABELA);
    const resposta = await app
      .http()
      .post(`/api/admin/turmas/${turma.id}/codigo`)
      .set(...comToken(isabela.accessToken))
      .expect(200);

    const novo = (resposta.body as { codigoConvite: string }).codigoConvite;
    expect(novo).not.toBe(turma.codigoConvite);
    // O código antigo deixa de valer no mesmo instante: é o que faz a rotação
    // servir para alguma coisa.
    const atual = await app.prisma.turma.findUniqueOrThrow({ where: { id: turma.id } });
    expect(atual.codigoConvite).toBe(novo);
  });
});
