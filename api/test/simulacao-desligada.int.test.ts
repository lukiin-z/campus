import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { comToken, criarAplicacao, entrar, type Aplicacao } from './suporte/aplicacao';
import { ID } from './suporte/banco';

/**
 * O gatilho do gateway fake com a flag DESLIGADA — ADR-0006.
 *
 * `PERMITIR_SIMULACAO_PAGAMENTO` nasce `false`. Arquivo próprio pelo mesmo
 * motivo do limite de taxa: a flag é lida no boot, e o arquivo de pagamento sobe
 * a API com ela ligada para poder exercitar `DUPLICAR`. Provar o desligado exige
 * outra subida.
 *
 * O que se verifica é o STATUS, e ele é `404` — não `403`. Um endpoint que
 * confirma pagamento sem passar pelo gateway não deve nem existir para quem
 * estiver procurando; `403` confirmaria que ele está lá, esperando a permissão
 * certa.
 */

let app: Aplicacao;

beforeAll(async () => {
  app = await criarAplicacao({
    RATE_LIMIT_TENTATIVAS: '10000',
    PERMITIR_SIMULACAO_PAGAMENTO: 'false',
  });
});

afterAll(async () => {
  await app.encerrar();
});

beforeEach(async () => {
  await app.redefinir();
});

it('responde 404 em POST /pagamentos/:id/simular, e não 403', async () => {
  const marina = await entrar(app, 'marina.alves@fiap.com.br');

  const inscricao = await app
    .http()
    .post(`/api/eventos/${ID.futsal}/participacoes`)
    .set(...comToken(marina.accessToken))
    .expect(201);
  const participacaoId = (inscricao.body as { id: string }).id;

  await app
    .http()
    .post(`/api/participacoes/${participacaoId}/pagamento`)
    .set(...comToken(marina.accessToken))
    .send({ metodo: 'PIX' })
    .expect(201);
  const pagamento = await app.prisma.pagamento.findFirstOrThrow({ where: { participacaoId } });

  const resposta = await app
    .http()
    .post(`/api/pagamentos/${pagamento.id}/simular`)
    .set(...comToken(marina.accessToken))
    .send({ desfecho: 'CONFIRMAR' })
    .expect(404);

  expect(resposta.body).toMatchObject({ erro: 'NAO_ENCONTRADO' });

  // E, o que importa: a cobrança continua aguardando. Nenhum caminho alternativo
  // confirmou pagamento — a única porta é a notificação assinada (RN-014).
  const depois = await app.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamento.id } });
  expect(depois.status).toBe('AGUARDANDO');
  const participacao = await app.prisma.participacao.findUniqueOrThrow({
    where: { id: participacaoId },
  });
  expect(participacao.status).toBe('PENDENTE_PAGAMENTO');
});
