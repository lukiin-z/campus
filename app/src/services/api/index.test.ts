import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { encerrarSessao, guardarSessao } from '../sessao';
import { apiRepositories } from './index';

/**
 * O cliente da API real, conferido contra o contrato que ele afirma falar.
 *
 * ## Por que este arquivo existe
 *
 * Porque a medição disse que ele precisava: `services/api/index.ts` estava com
 * **20,83% de cobertura de funções**. Quarenta e uma das quarenta e duas
 * operações nunca haviam sido chamadas uma única vez — e é justamente a camada
 * de que depende a troca do mock pela API real. É o mesmo padrão que o CP5
 * registrou cinco vezes: código escrito, revisado, plausível e nunca executado.
 *
 * E não era coberto por acaso: o primeiro caso escrito aqui **reprovou**.
 * `regerarCodigoConvite` mandava `GET` onde a API serve `POST` — o código de
 * convite da turma não podia ser regerado em modo `api`, e nada acusava.
 *
 * ## O que os casos verificam
 *
 * Não a resposta — isso é papel dos testes de repositório. Aqui a pergunta é
 * **qual requisição o cliente produz**: método e caminho. Cada par é conferido
 * contra `api/openapi.yaml` pela MESMA função que o `check:rotas` usa, então um
 * cliente que chame rota inexistente, ou que use verbo que o contrato não
 * declara para aquela rota, reprova.
 *
 * É a verificação que falta entre "o contrato e as rotas servidas concordam"
 * (`check:rotas`) e "a tela recebe o que espera" (testes de repositório): que o
 * cliente fala o mesmo contrato dos outros dois.
 */

/** Um par (método, caminho) capturado do `fetch`. */
interface Chamada {
  metodo: string;
  caminho: string;
}

let chamadas: Chamada[] = [];

beforeEach(() => {
  chamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const bruto = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      chamadas.push({
        metodo: (init?.method ?? 'GET').toUpperCase(),
        // Só o caminho, sem o host nem a query: o contrato declara caminhos.
        caminho: new URL(bruto, 'http://x').pathname,
      });
      /*
       * Corpo `null` em `200` serve a todo método deste cliente: nenhum caso
       * aqui olha a resposta, e `null` é JSON válido — o que exercita o caminho
       * de sucesso de `lib/api.ts` sem inventar 42 formas de retorno.
       */
      return Promise.resolve(
        new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  // A sessão vive em módulo, não no `fetch`: sem isto, o token guardado por
  // `auth.sair` sobreviveria e apareceria como `Authorization` nos casos
  // seguintes. Foi assim que um teste do CP5 falhou falando de cancelamento.
  encerrarSessao();
});

/**
 * Toda operação do cliente, com argumentos plausíveis.
 *
 * A lista é escrita à mão de propósito: ela é o inventário do que existe, e
 * gerá-la a partir do próprio objeto faria o teste concordar com qualquer coisa
 * que o objeto viesse a ter. O caso final confere que ela não ficou incompleta.
 */
const ID = '00000000-0000-4000-8000-000000000001';
const r = apiRepositories;

const OPERACOES: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ['auth.obterSessao', () => r.auth.obterSessao()],
  ['auth.entrar', () => r.auth.entrar({ email: 'a@fiap.com.br', senha: 'campus123' })],
  [
    'auth.cadastrar',
    () => r.auth.cadastrar({ nome: 'Aluno', email: 'a@fiap.com.br', senha: 'campus123' }),
  ],
  [
    'auth.sair',
    () => {
      /*
       * `sair` só chama `/auth/logout` se houver refresh guardado — e está
       * certo: é o refresh que identifica a sessão a revogar, e sem ele não há
       * nada no servidor para encerrar. Guardar a sessão aqui exercita o caminho
       * que importa, em vez de medir o desvio.
       */
      guardarSessao({ accessToken: 'a', refreshToken: 'r', expiraEm: 900 });
      return r.auth.sair();
    },
  ],
  [
    'auth.concluirOnboarding',
    () => r.auth.concluirOnboarding({ cursoId: ID, codigoConvite: '3ESPX-26' }),
  ],
  ['auth.obterFaculdade', () => r.auth.obterFaculdade()],
  ['auth.listarCursos', () => r.auth.listarCursos()],
  ['auth.listarTurmas', () => r.auth.listarTurmas(ID)],

  ['events.listar', () => r.events.listar({ alcance: 'TODOS', busca: 'x' })],
  ['events.destaques', () => r.events.destaques()],
  ['events.obter', () => r.events.obter(ID)],
  [
    'events.criar',
    () =>
      r.events.criar({
        titulo: 'Evento de teste do cliente',
        descricao: 'Descrição suficientemente longa para o schema aceitar.',
        inicio: '2026-10-01T19:00:00.000Z',
        fim: '2026-10-01T21:00:00.000Z',
        local: 'Auditório',
        capacidade: 30,
        preco: 0,
        alcance: 'TURMA',
        prazoInscricao: '2026-09-30T19:00:00.000Z',
        prazoCancelamento: '2026-09-29T19:00:00.000Z',
        publicar: true,
      }),
  ],
  ['events.editar', () => r.events.editar(ID, { titulo: 'Outro título' })],
  ['events.cancelar', () => r.events.cancelar(ID, 'Chuva forte')],
  ['events.aprovar', () => r.events.aprovar(ID)],
  ['events.listarParticipantes', () => r.events.listarParticipantes(ID)],

  ['participations.inscrever', () => r.participations.inscrever(ID)],
  ['participations.entrarNaListaEspera', () => r.participations.entrarNaListaEspera(ID)],
  ['participations.confirmarOferta', () => r.participations.confirmarOferta(ID)],
  ['participations.cancelar', () => r.participations.cancelar(ID)],
  ['participations.listarMinhas', () => r.participations.listarMinhas()],
  ['participations.obter', () => r.participations.obter(ID)],

  ['payments.iniciar', () => r.payments.iniciar(ID, { metodo: 'PIX' })],
  ['payments.obter', () => r.payments.obter(ID)],
  ['payments.simularDesfecho', () => r.payments.simularDesfecho(ID, 'CONFIRMAR')],
  ['payments.solicitarReembolso', () => r.payments.solicitarReembolso(ID)],
  [
    'payments.notificarWebhook',
    () =>
      r.payments.notificarWebhook(
        { transacaoExternaId: 'tx-1', chaveIdempotencia: 'k-1', valorPago: 10, pago: true },
        'assinatura',
      ),
  ],

  ['checkin.obterTokenDoIngresso', () => r.checkin.obterTokenDoIngresso(ID)],
  ['checkin.validar', () => r.checkin.validar(ID, '123456789')],
  ['checkin.obterPainel', () => r.checkin.obterPainel(ID)],
  ['checkin.registrarPresencaManual', () => r.checkin.registrarPresencaManual(ID, 'Sem celular')],

  ['feed.listar', () => r.feed.listar()],
  ['feed.publicar', () => r.feed.publicar({ eventoId: ID, legenda: 'Legenda' })],
  ['feed.comentar', () => r.feed.comentar(ID, { texto: 'Comentário' })],
  ['feed.eventosPublicaveis', () => r.feed.eventosPublicaveis()],
  ['feed.remover', () => r.feed.remover(ID, 'Fora do contexto')],

  ['notifications.listar', () => r.notifications.listar()],
  ['notifications.marcarComoLida', () => r.notifications.marcarComoLida(ID)],
  ['notifications.marcarTodasComoLidas', () => r.notifications.marcarTodasComoLidas()],

  ['admin.eventosPendentes', () => r.admin.eventosPendentes()],
  ['admin.regerarCodigoConvite', () => r.admin.regerarCodigoConvite(ID)],

  ['health.verificar', () => r.health.verificar()],
];

/**
 * Um caminho concreto casa com um template do contrato?
 *
 * `{id}` casa com um segmento, e só um: `[^/]+`. Sem a restrição,
 * `/eventos/{id}` casaria com `/eventos/abc/participacoes` e o teste aceitaria
 * rota errada — que é exatamente o defeito que ele deveria pegar.
 */
function templateQueCasa(caminho: string, templates: Iterable<string>): string | null {
  for (const template of templates) {
    const padrao = new RegExp(
      `^${template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]*\\\}/g, '[^/]+')}$`,
    );
    if (padrao.test(caminho)) return template;
  }
  return null;
}

/**
 * A raiz do repositório, procurada de baixo para cima.
 *
 * Nem `process.cwd()` nem `import.meta.url` servem sozinhos: o cwd é a raiz do
 * repositório quando o vitest é chamado da raiz e a de `app/` quando é chamado
 * de dentro do workspace, e `import.meta.url` aqui **não é um `file:`** — o
 * vitest serve o módulo pelo dev server, e `fileURLToPath` falha com "The URL
 * must be of scheme file". Procurar o arquivo que só existe na raiz funciona nos
 * dois casos e não depende de como a suíte foi invocada.
 */
function raizDoRepo(): string {
  let atual = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    if (existsSync(join(atual, 'api', 'openapi.yaml'))) return atual;
    atual = dirname(atual);
  }
  throw new Error('raiz do repositório não encontrada a partir de ' + process.cwd());
}

/**
 * Os métodos declarados por caminho, lidos pelo MESMO parser do `check:rotas`.
 *
 * O parser é chamado em um subprocesso, e não importado: `scripts/` está fora da
 * raiz do workspace `app`, e o Vite não transforma arquivo de fora — o import
 * estático falha com `SyntaxError` antes de qualquer caso rodar.
 *
 * Um subprocesso de 200 ms é o preço de manter **um** leitor do contrato. A
 * alternativa era uma segunda regex aqui, que divergiria da primeira na próxima
 * mudança de formatação do YAML — e divergência entre verificadores aparece como
 * teste verde sobre contrato errado, que é o pior resultado possível.
 */
const DECLARADOS: Map<string, string[]> = new Map(
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        "import('./scripts/check-rotas.mjs').then((m) => " +
          'console.log(JSON.stringify([...m.metodosDeclarados()])))',
      ],
      { cwd: raizDoRepo(), encoding: 'utf8' },
    ),
  ) as Array<[string, string[]]>,
);

describe('cada operação chama um caminho que o contrato declara', () => {
  it.each(OPERACOES.map(([nome, executar]) => ({ nome, executar })))(
    '$nome',
    async ({ executar }) => {
      await executar().catch(() => {
        /*
         * Recusa de regra de negócio e resposta inesperada não interessam aqui:
         * o `null` devolvido pelo `fetch` falso faz alguns métodos rejeitarem de
         * propósito. A requisição já foi registrada antes disso — é ela o objeto
         * do teste.
         */
      });

      expect(chamadas.length).toBeGreaterThan(0);
      const chamada = chamadas[0];
      if (!chamada) throw new Error('nenhuma requisição registrada');

      // O prefixo `/api` está no `servers` do contrato, não nos caminhos.
      const semPrefixo = chamada.caminho.replace(/^\/api/, '');
      const template = templateQueCasa(semPrefixo, DECLARADOS.keys());

      expect(template, `caminho fora do contrato: ${chamada.metodo} ${semPrefixo}`).not.toBeNull();
      if (template === null) return;

      /*
       * O verbo importa tanto quanto o caminho, e mais: foi ele que denunciou o
       * defeito. `regerarCodigoConvite` mandava `GET` num caminho que existe —
       * conferir só o caminho teria dado verde sobre uma operação quebrada.
       */
      const permitidos = DECLARADOS.get(template) ?? [];
      expect(
        permitidos,
        `${chamada.metodo} ${semPrefixo}: o contrato declara ${permitidos.join(', ') || 'nada'} para ${template}`,
      ).toContain(chamada.metodo);
    },
  );
});

describe('o inventário de operações está completo', () => {
  it('cobre todo método de todo repositório', () => {
    const noObjeto = Object.entries(apiRepositories).flatMap(([grupo, repo]) =>
      Object.keys(repo as Record<string, unknown>).map((m) => `${grupo}.${m}`),
    );
    const naLista = new Set(OPERACOES.map(([nome]) => nome));

    /*
     * Este caso é a razão de a lista acima ser escrita à mão: se um método novo
     * entrar no cliente sem entrar aqui, ele fica sem verificação de contrato —
     * e é assim que 41 operações chegaram a 20% de cobertura.
     */
    expect(noObjeto.filter((nome) => !naLista.has(nome))).toEqual([]);
  });
});
