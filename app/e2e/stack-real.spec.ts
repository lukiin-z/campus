import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Os três fluxos principais contra a STACK REAL: front construído com
 * `VITE_DATA_SOURCE=api`, API NestJS compilada e PostgreSQL com o seed aplicado.
 *
 * ## O que este arquivo prova, e o de `inscricao.spec.ts` não
 *
 * Os 6 casos do mock provam que as telas funcionam. Provam contra um banco em
 * memória dentro do próprio navegador, que o recarregamento reconstrói. Aqui a
 * mesma tela fala HTTP com um servidor que assina JWT, verifica argon2, abre
 * transação e mantém `ocupadas` num `CHECK`. As três coisas que só aparecem
 * neste modo:
 *
 * - **o login é real.** O mock aceitava `campus.sess.<id>` como token — uma
 *   string que qualquer pessoa monta, e que o `beforeEach` do outro arquivo
 *   semeia em `sessionStorage`. Contra a API isso não vale nada: o token é um
 *   JWT assinado com o segredo do processo. Não existe atalho aqui, e a ausência
 *   dele é o ponto;
 * - **o estado sobrevive ao F5.** Contra o mock, recarregar reconstrói o seed e
 *   a inscrição desaparece — o outro arquivo usa `goBack()` por causa disso, e
 *   documenta que uma versão anterior media 96 em vez de 97. Aqui a inscrição
 *   está no banco: recarregar mostra o estado NOVO, e é isso que se verifica;
 * - **os ids são UUID.** O mock usava `par-122`; a API usa
 *   `@default(uuid())`. Toda expectativa de URL deste arquivo casa UUID.
 *
 * ## Serial, e sem retry
 *
 * Ver `playwright.config.ts`: o estado é um PostgreSQL, e cada caso o altera. O
 * seed é reaplicado a cada subida da suíte (`e2e/preparar-stack.mjs`), então a
 * ordem de declaração é a ordem em que os casos leem um banco conhecido.
 */

/**
 * UUID dos registros do seed.
 *
 * O seed deriva o UUID do id legado do CP5 em vez de sortear, justamente para
 * que a documentação e os testes possam citar `evt-007` — a fórmula é
 * `<código da tabela, 8 dígitos>-0000-4000-8000-<sequência, 12 dígitos>`, e o
 * código de `evento` é 5. A fonte é `api/src/seed/ids.ts`.
 *
 * A função é reproduzida aqui, e não importada, porque `app/` não depende de
 * `api/`: são workspaces irmãos, e um `import '../../api/src/...'` faria o build
 * do front puxar código de servidor. São quatro linhas, e a duplicação está
 * declarada.
 */
function uuidDoSeed(codigoDaTabela: number, sequencia: number): string {
  const tabela = String(codigoDaTabela).padStart(8, '0');
  const registro = String(sequencia).padStart(12, '0');
  return `${tabela}-0000-4000-8000-${registro}`;
}

const evento = (numero: number): string => uuidDoSeed(5, numero);

/** Torneio de Futsal: alcance FACULDADE, R$ 15, 96/120. Marina não está nele. */
const FUTSAL = evento(7);
/** Roda de conversa: alcance CURSO (ECOMP), gratuita, 41/60, sem fila. */
const RODA = evento(3);
/** Hackathon: alcance FACULDADE, gratuito, 80/80. Marina é a 7ª da fila. */
const HACKATHON = evento(2);
/** Workshop de Git: alcance CURSO **SI**. Invisível para Marina. */
const WORKSHOP_SI = evento(6);

const MARINA = { email: 'marina.alves@fiap.com.br', senha: 'campus123' };
/** Gabriela Rocha organiza a roda de conversa — é ela quem muda a capacidade. */
const ORGANIZADORA_DA_RODA = { email: 'gabriela.rocha@fiap.com.br', senha: 'campus123' };

/** O endereço que o build do front recebeu em `VITE_API_URL`. */
const API = 'http://localhost:3100/api';

/** UUID em caminho de URL — o mock usava `par-\d+`, a API usa `@default(uuid())`. */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Login pela tela, sempre.
 *
 * Não há `addInitScript` semeando token neste arquivo, e isso é deliberado: o
 * `campus.token` que o mock aceitava é recusado pela API, e um helper que
 * assinasse um JWT por fora pularia `decideLogin`, a verificação da senha e o
 * registro da sessão — que são exatamente as três coisas que a stack real
 * acrescenta.
 */
async function entrar(page: Page, quem: { email: string; senha: string }): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail institucional/i).fill(quem.email);
  await page.getByLabel(/senha/i).fill(quem.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

/** Token de acesso obtido pela API, para os casos que precisam ARRANJAR estado. */
async function tokenDaApi(
  request: APIRequestContext,
  quem: { email: string; senha: string },
): Promise<string> {
  const resposta = await request.post(`${API}/auth/login`, { data: quem });
  expect(resposta.status(), 'login pela API para arranjar o estado').toBe(201);
  const corpo = (await resposta.json()) as { accessToken: string };
  return corpo.accessToken;
}

test.describe('stack real', () => {
  test('login institucional leva ao feed e ao alcance de quem entrou', async ({ page }) => {
    /*
     * --- 0. a rede é a prova de que este projeto está no modo certo ---
     *
     * `VITE_DATA_SOURCE` e `VITE_API_URL` são embutidos em tempo de build. Um
     * servidor adotado por engano (o incidente que o `playwright.config.ts`
     * descreve) serviria o bundle do MOCK, e o caso passaria pelas telas sem
     * nunca falar com a API — provando o oposto do que se propõe.
     *
     * As asserções de UUID abaixo já não casariam com os ids do mock
     * (`evt-007`), mas elas falhariam com "elemento não encontrado", que manda
     * procurar no lugar errado. Contar as requisições que saíram para
     * `localhost:3100` diz o que de fato aconteceu.
     */
    const chamadasAApi: string[] = [];
    page.on('request', (requisicao) => {
      if (requisicao.url().startsWith(API)) chamadasAApi.push(requisicao.url());
    });

    // --- 1. sem sessão, a guarda manda para o login e guarda o destino ---
    await page.goto('/eventos');
    await expect(page).toHaveURL(/\/login$/);

    // --- 2. login de verdade: argon2 verificado no servidor, JWT emitido ---
    await page.getByLabel(/e-mail institucional/i).fill(MARINA.email);
    await page.getByLabel(/senha/i).fill(MARINA.senha);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Volta para onde a pessoa queria ir, não para a raiz.
    await expect(page).toHaveURL(/\/eventos$/);
    const lista = page.getByTestId('lista-eventos');
    await expect(lista).toBeVisible();

    /*
     * --- 3. o alcance vem do SERVIDOR ---
     *
     * `evt-006` é do curso de Sistemas de Informação e Marina é de Engenharia de
     * Computação. Contra o mock, quem filtrava era a camada mockada dentro do
     * navegador; aqui a lista é o que `AcessoAEventos.eventosVisiveis` devolveu.
     * É a diferença entre "a tela esconde" e "o servidor não manda" (RN-001).
     */
    await expect(page.getByTestId(`evento-item-${FUTSAL}`)).toBeVisible();
    await expect(page.getByTestId(`evento-item-${HACKATHON}`)).toBeVisible();
    await expect(page.getByTestId(`evento-item-${RODA}`)).toBeVisible();
    await expect(page.getByTestId(`evento-item-${WORKSHOP_SI}`)).toHaveCount(0);

    // E o evento invisível continua invisível por id direto — `404` do servidor,
    // não uma tela que decide esconder.
    await page.goto(`/eventos/${WORKSHOP_SI}`);
    await expect(page.getByText('Evento não encontrado')).toBeVisible();

    // --- 4. o feed do titular, com os destaques do alcance dele ---
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Bom dia|Boa tarde|Boa noite/,
    );
    await expect(page.getByTestId('faixa-destaques')).toBeVisible();

    // --- 5. e tudo isso saiu de requisições à API, não de dado em memória ---
    expect(
      chamadasAApi.filter((url) => url.includes('/auth/login')).length,
      'o login tem de ter ido para a API real; se for zero, o servidor adotado serve o build do mock',
    ).toBeGreaterThan(0);
    expect(chamadasAApi.filter((url) => url.includes('/eventos')).length).toBeGreaterThan(0);
  });

  test('inscrição em evento com vaga abre cobrança, confirma o pagamento e emite o ingresso', async ({
    page,
  }) => {
    await entrar(page, MARINA);

    // --- 1. o evento com vaga, com a ocupação que o banco tem ---
    await page.goto(`/eventos/${FUTSAL}`);
    await expect(page.getByTestId('titulo-evento')).toHaveText('Torneio de Futsal Interturmas');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '96');

    const acao = page.getByTestId('acao-principal');
    // Evento pago: o valor aparece no próprio botão (RF-016).
    await expect(acao).toContainText('Quero participar');
    await expect(acao).toContainText('15');

    // --- 2. reservar a vaga ---
    await acao.click();

    /*
     * Evento pago nasce `PENDENTE_PAGAMENTO` (RN-012) e a tela vai DIRETO para a
     * cobrança: a janela de 60 minutos começa a correr no instante da reserva, e
     * mandar a pessoa procurar um botão gasta parte dela.
     *
     * O padrão da URL é UUID, e não `par-\d+`: contra a API o id da participação
     * é gerado pelo banco.
     */
    await expect(page).toHaveURL(new RegExp(`/pagamento/${UUID}$`));
    await expect(page.getByText(/tempo para pagar/i)).toBeVisible();

    // --- 3. abrir a cobrança Pix ---
    await page.getByRole('button', { name: 'Gerar cobrança Pix' }).click();

    /*
     * A chave de idempotência aparece no painel de simulação porque é ela que
     * identifica a notificação do gateway (RN-014). Ver a chave na tela é a
     * prova de que a cobrança foi criada pelo SERVIDOR — o mock não tinha
     * chave, ele tinha um objeto.
     */
    await expect(page.getByText(/Chave de idempotência/i)).toBeVisible();

    // --- 4. o desfecho vem do gateway, e só dele ---
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

    /*
     * A asserção é sobre a frase que SÓ a tela tem.
     *
     * "Pagamento confirmado" aparece em dois lugares no instante da
     * confirmação: o bloco de status da tela e o toast de `usePagamento`. Aqui
     * passava e na CI reprovava — na máquina lenta o toast ainda estava na tela
     * quando a asserção rodou.
     *
     * A primeira tentativa de conserto trocou `getByText` por
     * `getByRole('status')` e reprovou igual: o toast de sucesso **também** é
     * `role="status"` (`ToastViewport.tsx` reserva `alert` para erro). Duas
     * correções pela mesma causa, e a segunda foi escrita sem abrir o toast.
     *
     * "o ingresso já foi emitido" existe apenas em `PagamentoPage`, e é a
     * informação que a pessoa precisa ver — o toast some sozinho, o bloco fica.
     */
    await expect(page.getByText(/o ingresso já foi emitido/i)).toBeVisible();

    // --- 5. o ingresso ---
    await page.getByRole('link', { name: 'Ver meu ingresso' }).click();
    await expect(page).toHaveURL(new RegExp(`/ingresso/${UUID}$`));
    // `CMP-<turma>-<sequência>` é o código legível emitido pelo servidor, ao
    // lado do QR — o conteúdo do QR é o token assinado, opaco para a tela.
    await expect(page.getByText(/CMP-/)).toBeVisible();

    /*
     * --- 6. o estado SOBREVIVE ao recarregamento ---
     *
     * É o cuidado que o arquivo do mock documenta ao contrário: lá, `goto`
     * reconstruía o seed no service worker e a vaga voltava a 96. Aqui a
     * inscrição está numa linha do PostgreSQL, então recarregar a página do
     * evento mostra 97 e o botão já mudou de papel.
     */
    await page.goto(`/eventos/${FUTSAL}`);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '97');
    await expect(page.getByTestId('acao-principal')).toContainText('Ver meu ingresso');
  });

  test('evento lotado oferece a lista de espera e devolve a posição', async ({ page, request }) => {
    /*
     * --- 0. arranjo: lotar a roda de conversa ---
     *
     * O seed não tem evento lotado em que Marina ainda não esteja: no hackathon
     * ela é a 7ª da fila e na visita técnica ela tem oferta pendente. Então o
     * estado é arranjado pela API, como o organizador faria pela tela — a roda
     * de conversa está 41/60, e reduzir a capacidade para 41 a deixa lotada sem
     * remover ninguém (RN-005, CT-021: reduzir até as ocupadas é permitido).
     *
     * É arranjo por requisição autenticada, e não escrita direta no banco: passa
     * pelas mesmas verificações de competência que o produto usa.
     */
    const token = await tokenDaApi(request, ORGANIZADORA_DA_RODA);
    const ajuste = await request.patch(`${API}/eventos/${RODA}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { capacidade: 41 },
    });
    expect(ajuste.status(), 'reduzir a capacidade até as vagas ocupadas').toBe(200);

    await entrar(page, MARINA);

    // --- 1. lotado não é erro: é o desvio para a fila (RN-006) ---
    await page.goto(`/eventos/${RODA}`);
    await expect(page.getByTestId('titulo-evento')).toHaveText(
      'Roda de conversa: mercado de dados',
    );
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '41');

    const acao = page.getByTestId('acao-principal');
    await expect(acao).toContainText('Entrar na lista de espera');

    // --- 2. entrar na fila ---
    await acao.click();

    /*
     * A posição É a informação, e ela vem do servidor: `nextWaitlistPosition`
     * lê a fila do evento dentro da transação que já travou a linha, para duas
     * entradas simultâneas não receberem o mesmo número. A roda não tinha fila,
     * então Marina é a primeira.
     */
    await expect(acao).toContainText('Você é o 1º da fila');

    // --- 3. e a vaga NÃO foi consumida: a fila não ocupa capacidade ---
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '41');

    // --- 4. o F5 confirma que a posição está no banco, e não na tela ---
    await page.reload();
    await expect(page.getByTestId('acao-principal')).toContainText('Você é o 1º da fila');
  });
});
