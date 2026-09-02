import { expect, test } from '@playwright/test';

/**
 * O único teste ponta a ponta do CP5: abrir feed → abrir evento → inscrever-se
 * → ver confirmação.
 *
 * Por que só um: E2E é o teste mais caro de manter e o mais lento de rodar. Ele
 * se paga quando cobre o caminho que, se quebrar, torna o produto inútil — e
 * esse caminho é a inscrição. As regras de vaga, fila, prazo e reembolso são
 * cobertas por 30 testes unitários de domínio, que rodam em milissegundos e
 * dizem exatamente qual regra falhou. Duplicá-las aqui pagaria caro pela mesma
 * informação. Ver docs/11-plano-de-testes.md, seção 4.
 *
 * O alvo é o build de produção servido pelo `preview` (ver playwright.config.ts),
 * não o dev server: o artefato que vai para o GitHub Pages é o que precisa
 * funcionar.
 *
 * O CP5 acrescentou guarda de sessão: sem token, toda rota protegida redireciona
 * para `/login`. O `beforeEach` semeia o token antes de a página carregar, e um
 * teste próprio exercita a tela de login de verdade — cobrir o login em cada
 * caso pagaria 4× pela mesma informação.
 */

/** Token que o mock reconhece: `campus.sess.<usuarioId>` (mocks/support.ts). */
const TOKEN_MARINA = 'campus.sess.usr-001';

test.describe('inscrição em evento', () => {
  test.beforeEach(async ({ page }) => {
    // `addInitScript` roda antes de qualquer script da página: quando a guarda
    // de rota lê o token, ele já está lá. Semear depois do `goto` produziria um
    // redirect para /login antes da semeadura.
    await page.addInitScript((token) => {
      window.sessionStorage.setItem('campus.token', token);
    }, TOKEN_MARINA);
  });
  test('do feed até a confirmação da inscrição', async ({ page }) => {
    // --- 1. Feed carrega com os eventos em destaque ---
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Bom dia|Boa tarde|Boa noite/,
    );
    const faixa = page.getByTestId('faixa-destaques');
    await expect(faixa).toBeVisible();

    // --- 2. Abrir a lista e escolher um evento com vaga ---
    await page.getByRole('link', { name: 'Eventos' }).click();
    await expect(page).toHaveURL(/\/eventos$/);

    const lista = page.getByTestId('lista-eventos');
    await expect(lista).toBeVisible();

    // `evt-007` (Torneio de Futsal Interturmas, R$ 15, 96/120) tem vaga e o
    // usuário do seed não está inscrito nele.
    await page.getByTestId('evento-item-evt-007').click();
    await expect(page).toHaveURL(/\/eventos\/evt-007$/);

    // --- 3. Detalhe mostra ocupação e a ação certa ---
    await expect(page.getByTestId('titulo-evento')).toHaveText('Torneio de Futsal Interturmas');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '96');

    const acao = page.getByTestId('acao-principal');
    // Evento pago: o valor aparece no próprio botão (RF-016).
    await expect(acao).toContainText('Quero participar');
    await expect(acao).toContainText('15');

    // --- 4. Inscrever-se ---
    await acao.click();

    // --- 5. Confirmação: toast e ida direta para a cobrança ---
    await expect(page.getByRole('status').filter({ hasText: /vaga reservada/i })).toBeVisible();

    /*
     * Em evento pago a participação nasce `PENDENTE_PAGAMENTO` (RN-012) e a tela
     * **navega para a cobrança**, em vez de deixar o aluno de volta no detalhe
     * com um botão "Pagar agora". A primeira versão deste teste esperava o
     * segundo comportamento e falhou na primeira execução real: a janela de 60
     * minutos começa a correr no instante da reserva, e mandar a pessoa procurar
     * o botão gasta parte dela.
     */
    await expect(page).toHaveURL(/\/pagamento\/par-\d+$/);
    await expect(page.getByText(/tempo para pagar/i)).toBeVisible();
    await expect(page.getByText(/Torneio de Futsal Interturmas/)).toBeVisible();

    // --- 6. Voltando, a vaga aparece consumida e o botão mudou ---
    /*
     * `goBack`, e não `goto`: o mock vive em memória dentro do service worker,
     * então recarregar a página o reconstrói a partir do seed e a inscrição
     * desaparece — está documentado em docs/18-ambiente-de-teste.md. A primeira
     * versão deste passo usava `goto` e media 96 em vez de 97, provando o reset
     * em vez do incremento.
     */
    await page.goBack();
    await expect(page).toHaveURL(/\/eventos\/evt-007$/);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '97');
    await expect(page.getByTestId('acao-principal')).toContainText('Pagar agora');
  });

  test('evento lotado oferece a lista de espera em vez de recusar', async ({ page }) => {
    // `evt-002` (Hackathon Campus 48h) está 80/80 com fila ativa no seed.
    await page.goto('/eventos/evt-002');

    await expect(page.getByTestId('titulo-evento')).toHaveText('Hackathon Campus 48h');

    // O usuário do seed é o 7º da fila: o botão É a informação (RN-006).
    const acao = page.getByTestId('acao-principal');
    await expect(acao).toContainText('da fila');
  });

  test('evento fora do alcance não revela nem a própria existência', async ({ page }) => {
    // `evt-006` é evento de curso de Sistemas de Informação; o usuário do seed é
    // de Engenharia de Computação (RN-001, RNF-012).
    await page.goto('/eventos/evt-006');

    await expect(page.getByText('Evento não encontrado')).toBeVisible();
    await expect(page.getByTestId('titulo-evento')).toHaveCount(0);
  });

  test('a tela de login autentica e leva ao feed', async ({ page }) => {
    // O único caso que passa pela tela de login de verdade. Os outros semeiam o
    // token: repetir o login em cada um custaria quatro vezes o mesmo caminho.
    await page.addInitScript(() => {
      window.sessionStorage.removeItem('campus.token');
    });
    await page.goto('/eventos');

    // Sem token, a guarda manda para o login e guarda o destino.
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel(/e-mail institucional/i).fill('marina.alves@fiap.com.br');
    await page.getByLabel(/senha/i).fill('campus123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Volta para onde a pessoa queria ir, não para a raiz.
    await expect(page).toHaveURL(/\/eventos$/);
    await expect(page.getByTestId('lista-eventos')).toBeVisible();
  });

  test('e-mail pessoal é recusado com o domínio aceito na mensagem', async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.removeItem('campus.token');
    });
    await page.goto('/login');

    await page.getByLabel(/e-mail institucional/i).fill('marina@gmail.com');
    await page.getByLabel(/senha/i).fill('campus123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    /*
     * RN-002: a recusa nomeia o domínio, senão a pessoa tenta de novo igual. O
     * seletor é o `role="alert"` do campo, e não o texto solto: a própria tela
     * lista cinco e-mails `@fiap.com.br` nos cartões de demonstração, e o
     * primeiro seletor escrito casava com seis elementos.
     */
    await expect(page.getByRole('alert').filter({ hasText: /@fiap\.com\.br/ })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('navegação por teclado alcança a ação principal', async ({ page }) => {
    // RNF-003: o fluxo tem de ser operável sem mouse.
    await page.goto('/eventos/evt-007');
    await expect(page.getByTestId('acao-principal')).toBeVisible();

    let encontrou = false;
    for (let i = 0; i < 40 && !encontrou; i += 1) {
      await page.keyboard.press('Tab');
      encontrou = await page.getByTestId('acao-principal').evaluate((elemento) => {
        return document.activeElement === elemento;
      });
    }

    expect(encontrou).toBe(true);
  });
});
