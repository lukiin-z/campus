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
 * PENDÊNCIA CONHECIDA DO CP4: o navegador do Playwright não foi baixado nesta
 * máquina (`npx playwright install chromium`), então este teste está escrito e
 * configurado, mas ainda não foi executado. É a primeira tarefa da Sprint 2
 * (card S2-13) — ver docs/13-roadmap-cp5-cp6.md.
 */

test.describe('inscrição em evento', () => {
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

    // --- 5. Confirmação: toast, contador e novo estado do botão ---
    await expect(page.getByRole('status').filter({ hasText: /vaga reservada/i })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '97');
    // Em evento pago a participação nasce PENDENTE_PAGAMENTO (RN-012): o botão
    // passa a ser "Pagar agora", com a contagem da janela.
    await expect(acao).toContainText('Pagar agora');
    await expect(page.getByText(/Sua vaga está reservada por \d+ min/)).toBeVisible();
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
