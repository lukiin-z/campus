/*
 * Duas regras do `.eslintrc.cjs` da API são desligadas AQUI, e só neste arquivo.
 * As duas existem por razões corretas que não alcançam um script de linha de
 * comando:
 *
 * - `no-console`: o log da API é o `Logger` do Nest, que respeita nível e
 *   contexto. Este arquivo não é a API: é um utilitário cuja saída em `stdout` é
 *   o produto — a contagem por tabela é o que se cola num relatório de entrega.
 * - `no-restricted-syntax` (`process.env`): configuração se lê num lugar só,
 *   `src/config/ambiente.ts`, para a API não subir sem segredo. Mas
 *   `carregarAmbiente()` EXIGE `JWT_SECRET` e `WEBHOOK_SECRET`, e o seed não
 *   assina token nem recebe webhook: usá-lo aqui obrigaria quem só quer popular
 *   um banco a inventar dois segredos. `src/main.ts` está isento da mesma regra,
 *   pelo mesmo motivo de ser um ponto de entrada.
 *
 * A correção durável é acrescentar `src/seed/run.ts` a `excludedFiles` do
 * override em `api/.eslintrc.cjs`, ao lado de `src/main.ts`.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

import { SENHA_DEMO, construirDados, type DadosDoSeed } from './dados';
import { uuidLegado } from './ids';

/**
 * Executor do seed — `npm run seed`, e o segundo passo do `docker compose up`.
 *
 * ## Idempotência: apaga e reescreve, não faz `upsert`
 *
 * Rodar duas vezes tem de dar o mesmo banco. Havia duas formas, e a escolhida
 * foi **apagar tudo na ordem inversa das chaves estrangeiras e reinserir**, numa
 * única transação. As três razões, na ordem em que pesaram:
 *
 * 1. **As datas são relativas ao relógio.** `evt-013` começou "1 h atrás" e a
 *    oferta de vaga de `par-122` expira "em 18 h". Um `upsert` por id também
 *    atualizaria essas colunas, mas deixaria intactas as linhas que uma
 *    demonstração anterior criou — e elas contradizem a contagem materializada
 *    `ocupadas` que o seed grava. Meia hora depois, o banco tem 26 ocupantes num
 *    evento cujo `ocupadas` diz 25.
 * 2. **O índice parcial de RN-015 torna o `upsert` frágil.** Se alguém cancelou
 *    `par-001` e se inscreveu de novo (comportamento legítimo, e o motivo de o
 *    índice ser parcial), existe outra linha ATIVA para o par (evt-001,
 *    Marina). O `upsert` devolveria `par-001` ao estado `CONFIRMADA` e colidiria
 *    com ela. Apagar antes elimina a classe inteira de conflito: a única
 *    consistência que precisa valer é a interna do seed.
 * 3. **"Reset da demonstração" passa a ser um comando.** É o equivalente do
 *    botão de recarga que o mock tinha (`resetDb` em `app/src/mocks/db.ts`), e
 *    o roteiro de `docs/18-ambiente-de-teste.md` depende de poder voltar ao
 *    estado inicial sem derrubar o container.
 *
 * O preço é explícito: **o seed destrói o conteúdo das 14 tabelas.** Por isso a
 * trava de `NODE_ENV=production` abaixo, que o `docker-compose.yml` desarma de
 * propósito — lá, ser reinicializável é a função.
 *
 * ## O que NÃO é idempotente, e por que está certo
 *
 * O hash da senha muda a cada execução: argon2 sorteia um salt novo, e um salt
 * fixo por 13 usuários seria o defeito, não a otimização. Os **ids**, que são o
 * que a documentação cita, são idênticos entre execuções (ver `ids.ts`).
 */

const TABELAS = 14;

/**
 * Ordem de remoção — o inverso das chaves estrangeiras de `0001_init`.
 *
 * A maioria das FKs é `RESTRICT` (agregação: não se apaga evento com
 * participação). Fora desta ordem, o próprio banco recusa — o que é a prova de
 * que a ordem importa, e não uma inconveniência.
 */
async function limpar(tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) {
  await tx.comentario.deleteMany();
  await tx.publicacao.deleteMany();
  await tx.notificacao.deleteMany();
  await tx.respostaPergunta.deleteMany();
  await tx.presenca.deleteMany();
  await tx.pagamento.deleteMany();
  await tx.participacao.deleteMany();
  await tx.perguntaCustomizada.deleteMany();
  await tx.evento.deleteMany();
  await tx.sessao.deleteMany();
  await tx.usuario.deleteMany();
  await tx.turma.deleteMany();
  await tx.curso.deleteMany();
  await tx.faculdade.deleteMany();
}

/** Ordem de inserção — a das chaves estrangeiras. */
async function inserir(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  dados: DadosDoSeed,
) {
  await tx.faculdade.createMany({ data: dados.faculdades });
  await tx.curso.createMany({ data: dados.cursos });
  await tx.turma.createMany({ data: dados.turmas });
  await tx.usuario.createMany({ data: dados.usuarios });
  await tx.evento.createMany({ data: dados.eventos });
  await tx.perguntaCustomizada.createMany({ data: dados.perguntas });
  await tx.participacao.createMany({ data: dados.participacoes });
  await tx.pagamento.createMany({ data: dados.pagamentos });
  await tx.presenca.createMany({ data: dados.presencas });
  await tx.respostaPergunta.createMany({ data: dados.respostas });
  await tx.publicacao.createMany({ data: dados.publicacoes });
  await tx.comentario.createMany({ data: dados.comentarios });
  await tx.notificacao.createMany({ data: dados.notificacoes });
}

async function contar(prisma: PrismaClient): Promise<Array<[string, number]>> {
  return [
    ['faculdade', await prisma.faculdade.count()],
    ['curso', await prisma.curso.count()],
    ['turma', await prisma.turma.count()],
    ['usuario', await prisma.usuario.count()],
    ['sessao', await prisma.sessao.count()],
    ['evento', await prisma.evento.count()],
    ['pergunta_customizada', await prisma.perguntaCustomizada.count()],
    ['participacao', await prisma.participacao.count()],
    ['pagamento', await prisma.pagamento.count()],
    ['presenca', await prisma.presenca.count()],
    ['resposta_pergunta', await prisma.respostaPergunta.count()],
    ['publicacao', await prisma.publicacao.count()],
    ['comentario', await prisma.comentario.count()],
    ['notificacao', await prisma.notificacao.count()],
  ];
}

/**
 * Hash da senha de demonstração.
 *
 * `argon2id` é escolha explícita (é o que o schema declara em `senha_hash`); os
 * parâmetros de custo ficam nos padrões da biblioteca porque eles viajam DENTRO
 * da string do hash — a API verifica qualquer combinação, e quem define o custo
 * dos hashes novos é o serviço de autenticação, não o seed.
 */
function gerarHashDeSenha(senhaEmClaro: string): Promise<string> {
  return argon2.hash(senhaEmClaro, { type: argon2.argon2id });
}

function verificarAmbiente(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não está definida. O seed não adivinha o banco: exporte a ' +
        'variável ou use o `docker compose up`, que a injeta.',
    );
  }

  // O seed apaga as 14 tabelas antes de inserir (ver o comentário do topo). Em
  // produção isso exige consentimento escrito, não um descuido de shell.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_PERMITIR_RESET !== 'true') {
    throw new Error(
      'NODE_ENV=production e SEED_PERMITIR_RESET não é "true". Este seed APAGA ' +
        `as ${TABELAS} tabelas antes de inserir. Se o banco é descartável — o do ` +
        '`docker compose`, por exemplo — defina SEED_PERMITIR_RESET=true.',
    );
  }
}

async function main(): Promise<void> {
  verificarAmbiente();

  const prisma = new PrismaClient();
  try {
    // Um único instante de referência para TODAS as datas relativas: com duas
    // leituras do relógio, um seed executado à meia-noite geraria metade das
    // linhas em cada dia.
    const agora = new Date();
    const dados = await construirDados({ agora, gerarHashDeSenha });

    await prisma.$transaction(
      async (tx) => {
        await limpar(tx);
        await inserir(tx, dados);
      },
      // O argon2 já rodou fora da transação; o que sobra são ~100 linhas. A
      // folga cobre o primeiro boot do container, em que o Postgres ainda está
      // aquecendo os caches.
      { maxWait: 10_000, timeout: 60_000 },
    );

    const contagens = await contar(prisma);
    const larguraNome = Math.max(...contagens.map(([nome]) => nome.length));
    const total = contagens.reduce((soma, [, n]) => soma + n, 0);

    console.log('');
    console.log(`  Seed aplicado. Referência de tempo: ${agora.toISOString()}`);
    console.log('');
    for (const [nome, quantidade] of contagens) {
      console.log(`  ${nome.padEnd(larguraNome)}  ${String(quantidade).padStart(3)}`);
    }
    console.log(`  ${'-'.repeat(larguraNome + 5)}`);
    console.log(`  ${'total'.padEnd(larguraNome)}  ${String(total).padStart(3)}`);
    console.log('');
    console.log(`  Senha de todos os usuários de demonstração: ${SENHA_DEMO}`);
    console.log('  (guardada só como hash argon2id — RNF-019)');
    console.log('');
    console.log('  Ids que a documentação cita:');
    for (const legado of ['usr-001', 'evt-013', 'par-122', 'par-133']) {
      console.log(`    ${legado}  ${uuidLegado(legado)}`);
    }
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro: unknown) => {
  console.error('');
  console.error('  Seed FALHOU.');
  console.error(`  ${erro instanceof Error ? erro.message : String(erro)}`);
  console.error('');
  process.exitCode = 1;
});
