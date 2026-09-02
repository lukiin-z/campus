# Design system

**Responsável:** Ana Luiza Dourado (RM558793) — UX/UI Designer
**Peso na avaliação do CP4:** parte dos 20% de identidade visual e marca — *"coerência com o público-alvo"*

**Pré-requisito de leitura:** [`identidade-visual.md`](identidade-visual.md) define paleta, contraste
verificado, tipografia, espaçamento e tom de voz. Este arquivo **não redefine token nenhum**: só
diz quais tokens cada componente consome, em que estado, e com que contrato de acessibilidade.

**Provas visuais:** [`styleguide.html`](styleguide.html) renderiza todos estes componentes em
todos os estados · [`guia-figma.md`](guia-figma.md) tem os mesmos componentes como *component set*
no Figma · [`assets/`](assets) tem os SVGs da marca.

**Rastreabilidade:** os requisitos citados vivem em [`../02-requisitos.md`](../02-requisitos.md),
as regras em [`../04-regras-de-negocio.md`](../04-regras-de-negocio.md) e as personas em
[`../01-problema-e-personas.md`](../01-problema-e-personas.md).

---

## 1. Princípios do design system

Sete regras. Cada uma é verificável em revisão de PR — não é opinião.

1. **Uma ação primária por tela.** Só um botão coral preenchido por tela. Duas ações coral
   concorrentes destroem a hierarquia que a paleta de uma cor de ação construiu. As demais ações
   são secundárias (contorno) ou textuais.
2. **Estado nunca é só cor.** Selecionado ganha peso e inversão de fundo, não só matiz. Erro ganha
   ícone e frase, não só borda vermelha. Ativo ganha indicador de 2 px, não só cor de texto. Isso
   atende ao critério 1.4.1 e é o que faz a interface funcionar em preto e branco e para quem tem
   deuteranopia.
3. **Nada fora da escala de 4 px.** Espaçamento, altura, largura, ícone: múltiplo de 4. `p-[13px]`
   é revisão reprovada, não gosto pessoal.
4. **Plano por padrão.** Separação vem de `border` e da troca de `surface` sobre `bg`. Sombra é só
   para o que flutua de verdade: Toast, Modal, TopBar rolada. Cartão de lista não tem sombra.
5. **Cada família de fonte tem um trabalho.** Nome e título em Space Grotesk; frase para ler em
   Inter; dado para conferir em JetBrains Mono. Sem sobreposição — a decisão é do tipo de
   informação, não do tamanho.
6. **A área de toque é 44 × 44, sempre.** O tamanho *visual* pode ser 20 px (chip, ícone); a área
   clicável não. Quando o desenho pede menor, a área é estendida por pseudo-elemento.
7. **Componente consome token semântico, nunca a escala crua.** `accent-strong`, não `coral-600`.
   Trocar a paleta tem que ser uma linha em um arquivo, não uma busca-e-substitui em 20 componentes.

---

## 2. Como ler cada subseção

| Bloco | O que traz |
|---|---|
| **Função** | O problema do usuário que o componente resolve. Uma frase. Se não couber em uma frase, o componente está fazendo duas coisas |
| **Anatomia** | As partes, com medida em token (`space-4`, `radius-lg`). Nunca px solto — px aparece só como nota de equivalência |
| **Variantes** | Eixos de variação e o que muda em cada um |
| **Estados** | `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`. Quando um estado não existe, a tabela diz **por quê** — componente estático que parece clicável é defeito |
| **Tokens usados** | Nomes exatos. É a lista que a revisão confere |
| **Acessibilidade** | Papel ARIA, nome acessível, ordem de foco, área de toque |
| **Quando NÃO usar** | O componente errado que as pessoas escolhem no lugar. É a parte mais útil do inventário |

Convenções globais que valem para **todos** os componentes e não se repetem em cada subseção:

- **Anel de foco:** `outline: 2px solid var(--accent-strong)` com `outline-offset: 2px`.
  Contraste 4,98:1 contra `bg` — linha 22 da verificação em `identidade-visual.md`. `outline: none`
  sem substituto visível reprova a revisão (RNF-003).
- **Transição:** 120 ms para cor e borda, 160 ms para transformação, `ease-out`. Toda animação é
  desligada em `@media (prefers-reduced-motion: reduce)`.
- **`active`:** `transform: scale(0.98)` em superfície clicável. Nunca deslocamento em px, para não
  brigar com a escala de 4.
- **`disabled`:** fundo `surface-2`, texto `text-disabled`, borda `border`, `cursor: not-allowed`.
  Isento de contraste pela WCAG 1.4.3 (linha 28 da verificação).

---

## 3. Inventário de componentes

### 3.1 Button

**Função.** Executar a ação da tela — inscrever-se, pagar, publicar, validar check-in, cancelar —
com o peso visual proporcional à consequência.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | altura mínima `44px` (área de toque), padding `space-3` vertical e `space-5` horizontal, raio `radius-full`, gap interno `space-2` |
| Ícone opcional (à esquerda) | 20 × 20, `currentColor`, `aria-hidden="true"` |
| Rótulo | `display-sm` no primário e no destrutivo; `body-md-strong` no secundário e no textual |
| Slot de dado (à direita) | `mono-sm`, ex. `· R$ 25` — separado por `space-2` |
| Indicador de carregamento | círculo de 16 px em `currentColor`, ocupa o lugar do ícone; o rótulo **não** muda, para a largura não pular |

**Variantes.**

| Variante | Preenchimento | Texto | Borda | Uso |
|---|---|---|---|---|
| `primary` | `accent-strong` | `surface` | — | A única ação primária da tela: "Quero participar" |
| `secondary` | `surface` | `text` | 1 px `border-strong` | "Compartilhar", "Editar evento" |
| `tertiary` | transparente | `accent-hover` | — | Ação em linha: "Ver todos", "Desfazer" |
| `danger` | `danger` | `surface` | — | Ação irreversível: "Cancelar evento" (RN-021) |
| `confirm` | `accent-2` | `surface` | — | Confirmação operacional: "Validar check-in" |
| `icon-only` | herda da variante | — | herda | 44 × 44, `radius-full`, exige `aria-label` |
| `block` | herda | — | herda | `width: 100%`, usado no rodapé fixo do detalhe do evento |
| `size-sm` | herda | `body-sm` | herda | Altura visual 36 px dentro de cartão; área estendida a 44 px por `::before` |

**Estados.**

| Estado | `primary` | `secondary` | `tertiary` | `danger` |
|---|---|---|---|---|
| `default` | fundo `accent-strong`, texto `surface` (5,16:1 — linha 8) | fundo `surface`, borda `border-strong`, texto `text` | texto `accent-hover` | fundo `danger`, texto `surface` (10,85:1 — linha 21) |
| `hover` | fundo `accent-hover` (7,52:1 — linha 9) | fundo `surface-2`, borda `text-muted` | fundo `accent-soft` | fundo `coral-900` via `danger` escurecido — ver nota |
| `focus-visible` | anel `accent-strong`, offset `2px` | igual | igual | igual |
| `active` | fundo `accent-hover` + `scale(0.98)` | fundo `surface-2` + `scale(0.98)` | fundo `accent-soft` + `scale(0.98)` | `scale(0.98)` |
| `disabled` | fundo `surface-2`, texto `text-disabled` | fundo `surface-2`, borda `border`, texto `text-disabled` | texto `text-disabled` | fundo `surface-2`, texto `text-disabled` |
| `loading` | mantém o preenchimento, `aria-busy="true"`, ponteiro inerte, indicador girando | igual | igual | igual |

> **Nota sobre o hover do `danger`.** `danger` é `coral-800`. O hover não introduz cor nova: usa
> `coral-900`, que já está na escala e é o único passo mais escuro disponível. Qualquer par novo de
> cor sobre cor exige linha na tabela de contraste de `identidade-visual.md` antes de entrar.

**Tokens usados.** `accent-strong` · `accent-hover` · `accent-soft` · `accent-2` · `danger` ·
`surface` · `surface-2` · `text` · `text-muted` · `text-disabled` · `border` · `border-strong` ·
`display-sm` · `body-md-strong` · `body-sm` · `mono-sm` · `space-2` · `space-3` · `space-5` ·
`radius-full`.

**Acessibilidade.**

- Elemento nativo `<button type="button|submit">`. `div` com `onClick` reprova a revisão: perde
  Enter, Espaço, foco e papel.
- Nome acessível vem do texto visível. Variante `icon-only` exige `aria-label` (RNF-004).
- `loading` usa `aria-busy="true"` e mantém o rótulo — o leitor de tela não perde a referência.
- Botão que precisa **explicar** por que está bloqueado usa `aria-disabled="true"` e continua
  focável, com o motivo em `aria-describedby`. Botão sem explicação usa `disabled` nativo.
- Ordem de foco = ordem do DOM. Em rodapé de modal, a ação destrutiva **nunca** é a primeira do DOM.
- Área de toque 44 × 44 mesmo na variante `size-sm`.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Navegar para outra rota | `<a>` / `Link` do React Router — muda a URL, abre em nova aba, é compartilhável |
| Filtrar a lista | `Chip` com `aria-pressed` |
| Alternar entre subconjuntos da mesma tela | `Tabs` |
| Abrir o evento a partir de um cartão | O cartão inteiro é o link; botão dentro de link é um alvo aninhado |

---

### 3.2 Chip (filtro)

**Função.** Filtrar a lista de eventos por alcance, preço e período sem sair da tela e sem abrir
modal — o caminho mais curto para o "alcance errado" deixar de acontecer (RF-015).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | altura visual 32 px, padding `space-1` vertical / `space-3` horizontal, `radius-full`, borda 1 px |
| Extensão de toque | `::before` absoluto com `inset: -6px 0` → 44 px de altura clicável sem alterar o desenho |
| Rótulo | `mono-xs` em caixa alta (`letter-spacing +0.10 em`) |
| Contador opcional | `mono-xs`, separado por `space-1`, entre parênteses: `(12)` |
| Ícone de remover (chip removível) | 16 × 16, `aria-hidden`, dentro de alvo de 44 px |
| Faixa de chips | `display: flex`, gap `space-2`, `overflow-x: auto` — a única rolagem horizontal permitida junto com a faixa de ingressos (RNF-018) |

**Variantes.**

| Eixo | Valores | Observação |
|---|---|---|
| Filtro de alcance | `Todos` · `Minha turma` · `Meu curso` · `Faculdade` | Espelha `AlcanceEvento` (RF-011, RN-001) |
| Filtro de preço | `Gratuito` · `Pago` | |
| Filtro de período | `Esta semana` · `Este mês` | |
| Com contador | qualquer um acima + `(n)` | O número vem da consulta, não é estimado |
| Removível | chip de filtro aplicado, com `×` | Aparece só quando há filtro ativo |

**Estados.**

| Estado | Fundo | Texto | Borda | Extra |
|---|---|---|---|---|
| `default` | `surface` | `text-muted` | `border` | — |
| `hover` | `surface-2` | `text` | `border-strong` | — |
| `focus-visible` | herda | herda | herda | anel `accent-strong`, offset `2px` |
| `active` (pressionando) | `surface-2` | `text` | `border-strong` | `scale(0.98)` |
| `selecionado` | `text` (neutral-900) | `surface` (17,84:1 — linha 11) | `text` | peso **600** — a inversão não é o único sinal |
| `selecionado + hover` | `neutral-800` | `surface` | `neutral-800` | — |
| `disabled` | `surface-2` | `text-disabled` | `border` | filtro sem nenhum resultado possível |
| `loading` | — | — | — | Não existe. Enquanto os filtros carregam, a faixa mostra `Skeleton` de pílula |

**Tokens usados.** `surface` · `surface-2` · `text` · `text-muted` · `text-disabled` · `border` ·
`border-strong` · `neutral-800` · `accent-strong` · `mono-xs` · `space-1` · `space-2` · `space-3` ·
`radius-full`.

**Acessibilidade.**

- Cada chip é `<button aria-pressed="true|false">`, **não** `role="tab"`: filtros combinam entre si,
  abas não.
- A faixa é `<div role="group" aria-label="Filtrar eventos">`.
- Estado não é só cor: `aria-pressed` para leitor de tela, peso 600 e inversão de fundo para quem vê.
- Faixa rolável nunca captura o teclado: cada chip é alcançável por Tab, e o navegador rola o chip
  focado para dentro da vista.
- Área de toque de 44 px pela extensão em `::before` — o chip continua com 32 px de altura visual.
- Ao mudar o filtro, o número de resultados é anunciado em `aria-live="polite"`: "6 eventos".

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Trocar de tela | `BottomNav` / `TopBar` — rota real |
| Mostrar metadado que não é clicável | `ScopeBadge` ou `StatusBadge` |
| Escolha exclusiva entre muitas opções | `Select` nativo |
| Alternar duas visões do mesmo dado | `Tabs` |

---

### 3.3 TicketCard — elemento de assinatura

**Função.** Anunciar um evento no formato que o público já reconhece como *ingresso*, entregando
alcance, data, preço e vagas em uma leitura de dois segundos — na faixa horizontal do feed e em
grade (RF-015, RF-016).

Este é o componente que carrega a marca. Se ele estiver certo, o produto parece o produto; se
estiver errado, nenhuma outra tela salva. Por isso a especificação abaixo é a mais longa do
inventário e inclui o CSS do picote.

#### 3.3.1 Anatomia

| Parte | Medida em token |
|---|---|
| Contêiner | largura 264 px na faixa horizontal / fluida em grade · fundo `surface` · borda 1 px `border` · `radius-lg` · padding `space-4` · `position: relative` · **`overflow: visible`** |
| Cabeça | `ScopeBadge` + `StatusBadge` (só quando o estado não é `PUBLICADO`), gap `space-2` |
| Título | `display-sm`, máximo 2 linhas com reticências |
| Metas | 2 linhas de `mono-sm` em `text-muted`: `Sáb, 12 set · 13h` e o local |
| **Picote** | divisória tracejada de 2 px em `border`, com `margin: space-4 0`, mais dois recortes circulares de `space-4` de diâmetro centrados nas bordas laterais |
| Pé | preço à esquerda, vagas à direita, alinhados na base |
| Preço | `mono-sm` peso 500 — `accent-strong` quando pago (5,16:1 — linha 16), `accent-2` quando gratuito (5,21:1 — linha 15, mesmo par) |
| Vagas | `mono-sm` em `text-muted`: `18/40` |
| `ProgressBar` | 8 px de altura acima do pé, **só** quando a ocupação é ≥ 80% ou o evento está lotado |

A altura total fica entre 176 px e 208 px conforme o título ocupe uma ou duas linhas — sempre
múltiplo de 4 porque toda medida interna é múltiplo de 4.

#### 3.3.2 Como o picote é feito em CSS

O recorte é **borda tracejada + dois pseudo-elementos circulares na cor do fundo**. Sem imagem, sem
máscara, sem SVG: renderiza igual em qualquer navegador e sobrevive a impressão.

```css
.ticket {
  position: relative;
  overflow: visible;              /* obrigatorio: overflow hidden corta os recortes */
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);

  /* cor do que esta ATRAS do cartao — o consumidor sobrescreve quando o fundo muda */
  --ticket-notch: var(--bg);
}

.ticket__perf {
  position: relative;
  margin: var(--space-4) 0;
  border-top: 2px dashed var(--border);
}

.ticket__perf::before,
.ticket__perf::after {
  content: "";
  position: absolute;
  top: calc(-1 * var(--space-2));        /* -8px: centra o circulo de 16px na linha */
  width: var(--space-4);                 /* 16px de diametro */
  height: var(--space-4);
  border-radius: var(--radius-full);
  background: var(--ticket-notch);
}

/* space-4 (padding) + space-2 (raio) + 1px (borda) = 25px  →  o centro do circulo
   cai exatamente sobre a borda externa do cartao: metade dentro, metade fora. */
.ticket__perf::before { left:  calc(-1 * (var(--space-4) + var(--space-2) + 1px)); }
.ticket__perf::after  { right: calc(-1 * (var(--space-4) + var(--space-2) + 1px)); }
```

Três coisas que essa geometria exige, e que a revisão confere:

1. **`overflow: visible` no cartão.** A metade externa de cada círculo vive fora da caixa. Com
   `overflow: hidden` — que é o que o protótipo legado usa no item de lista — o recorte
   simplesmente desaparece.
2. **`--ticket-notch` igual ao fundo real.** O padrão é `bg`. Dentro de bloco em `surface-2`, o
   consumidor declara `--ticket-notch: var(--surface-2)`; dentro de Modal, `var(--surface)`. Chumbar
   `var(--bg)` no componente é o defeito do protótipo: o recorte aparece na cor errada em qualquer
   fundo que não seja o da tela.
3. **Offsets derivados de token.** `calc(space-4 + space-2 + 1px)` em vez de `-25px`. O número é o
   mesmo; a diferença é que ele se corrige sozinho quando o padding do cartão muda.

**Variante técnica avaliada e recusada para a v1:** `mask-composite` com dois `radial-gradient`
abre um buraco *real*, e aí a cor do fundo não importa — nem `--ticket-notch` é necessário. Custo:
perde-se o tracejado na linha do recorte, o suporte em Safari antigo é irregular e a borda de 1 px
do cartão precisa ser redesenhada dentro da máscara. Fica registrado como item de CP6.

#### 3.3.3 Variantes por alcance e por preço

Seis combinações. O alcance define o `ScopeBadge`; o preço define o tratamento do valor no pé.
Nada mais muda — mesma anatomia, mesmo picote, mesma altura.

| Alcance | Preço | `ScopeBadge` (fundo / texto) | Pé — preço | Exemplo do seed canônico |
|---|---|---|---|---|
| `TURMA` | pago | `accent-soft` / `coral-700` (6,21:1 — linha 12) | `accent-strong` | `evt-001` Churrasco de encerramento do semestre · Sáb, 12 set · 13h · **R$ 25,00** · 18/40 |
| `TURMA` | gratuito | `accent-soft` / `coral-700` | `accent-2` "Gratuito" | `evt-011` Sarau de fim de semestre · Sáb, 3 out · 20h · `RASCUNHO` |
| `CURSO` | gratuito | `accent-2-soft` / `teal-600` (6,09:1 — linha 13) | `accent-2` "Gratuito" | `evt-003` Roda de conversa: mercado de dados · Qui, 24 set · 19h · 41/60 |
| `CURSO` | pago | `accent-2-soft` / `teal-600` | `accent-strong` | **Sem caso no seed canônico** — ver nota |
| `FACULDADE` | gratuito | `neutral-200` / `neutral-700` (7,33:1 — linha 14) | `accent-2` "Gratuito" | `evt-002` Hackathon Campus 48h · Sex, 18 set · 18h · 80/80 **lotado**, 7 na fila |
| `FACULDADE` | pago | `neutral-200` / `neutral-700` | `accent-strong` | `evt-005` Festa Junina Fora de Época · Sáb, 10 out · 20h · **R$ 45,00** · 287/300 |

> **Nota — combinação sem dado.** O seed canônico não tem evento de `CURSO` pago (`evt-003`,
> `evt-006` e `evt-008` são todos gratuitos). A célula existe no design system porque a combinação
> é válida no domínio, e no [`styleguide.html`](styleguide.html) ela é preenchida com `evt-003`
> recebendo o tratamento de preço, **marcada como demonstração**. Nenhum evento novo foi inventado.

#### 3.3.4 Variantes por estado do evento

| Variante | O que muda | Regra |
|---|---|---|
| `publicado` | Padrão: sem `StatusBadge` | — |
| `lotado` | `ProgressBar` em 100%, vagas viram `80/80 · lotado`, `StatusBadge` = `LISTA DE ESPERA` quando o leitor já entrou na fila | RN-006 |
| `cancelado` | `StatusBadge` `EVENTO CANCELADO` em `danger` preenchido, título em `text-muted`, pé sem preço, motivo em `body-xs` | RN-021, RN-022 |
| `realizado` | `StatusBadge` `REALIZADO` neutro, pé troca preço por ação textual "Ver fotos" | RF-036 |
| `rascunho` | `StatusBadge` `RASCUNHO`, borda tracejada de 1 px em `border-strong`, visível só para o organizador | — |
| `em aprovação` | `StatusBadge` `EM APROVAÇÃO`, sem ação de inscrição | RN-003, RF-041 |

#### 3.3.5 Estados de interação

| Estado | O que muda |
|---|---|
| `default` | borda `border`, sem sombra |
| `hover` | borda `border-strong` **e** título sublinhado — o sinal não é só a cor da borda |
| `focus-visible` | anel `accent-strong` com offset `2px`; o anel acompanha o `radius-lg` |
| `active` | `scale(0.98)` |
| `disabled` | **Não existe.** Um cartão cancelado ou realizado continua navegável — o que está bloqueado é a inscrição, e isso se resolve no detalhe, não escondendo o cartão |
| `loading` | Variante `Skeleton.Ticket`: mesma altura, mesmo padding, **mesmo picote**, blocos em `surface-2`. Sem isso a faixa horizontal pula quando os dados chegam |

**Tokens usados.** `surface` · `surface-2` · `bg` · `border` · `border-strong` · `text` ·
`text-muted` · `accent-strong` · `accent-2` · `accent-soft` · `accent-2-soft` · `danger` ·
`coral-700` · `teal-600` · `neutral-200` · `neutral-700` · `display-sm` · `mono-sm` · `mono-xs` ·
`body-xs` · `space-2` · `space-4` · `radius-lg` · `radius-full`.

**Acessibilidade.**

- O cartão inteiro é **um** `<a>` → um único ponto de parada do Tab por evento. Nenhum botão
  aninhado dentro do link.
- Nome acessível montado por extenso em `.sr-only`, porque a versão visual é abreviada:
  `Churrasco de encerramento do semestre, evento da minha turma, sábado 12 de setembro às 13 horas,
  Quadra do Campus 2, R$ 25, 18 de 40 vagas ocupadas`. As partes abreviadas visíveis
  (`Sáb, 12 set · 13h`, `18/40`) levam `aria-hidden="true"` para não duplicar a leitura.
- Data e hora em `<time datetime="2026-09-12T13:00">`.
- Divisória tracejada e recortes são pseudo-elementos: nunca chegam à árvore de acessibilidade.
  Contraste 1,49:1 é decorativo e isento (linha 27).
- Faixa horizontal: `<ul role="list">` com `<li>`. A faixa não recebe `tabindex` própria — o foco
  dos cartões já rola a faixa.
- Alcance nunca é transmitido só por cor: o `ScopeBadge` traz texto (1.4.1).
- Área de toque: o cartão tem ~180 px de altura, muito acima de 44.

**Quando NÃO usar.**

| Situação | Componente certo | Por quê |
|---|---|---|
| Lista vertical densa de 10+ eventos | `EventListItem` | O picote repetido 12 vezes vira ruído, e cada cartão gasta dois `space-4` extras de altura só na divisória |
| O ingresso do próprio leitor, com QR | `QrTicket` | É outro objeto: tem portador, código e janela de validade |
| Foto publicada no feed | `PostCard` | O conteúdo é a imagem, não o metadado |
| Notificação de vaga liberada | `Toast` + item na lista de notificações | Cartão é conteúdo permanente; aviso é temporário |

---

### 3.4 EventListItem

**Função.** Percorrer muitos eventos em uma coluna, com a data destacada à esquerda para varredura
vertical rápida (RF-015).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | `display: flex`, fundo `surface`, borda 1 px `border`, `radius-lg`, `overflow: hidden` (permitido aqui: não tem picote), altura mínima 72 px |
| Coluna de data | largura 64 px, fundo `surface-2`, conteúdo centralizado |
| Dia | `display-md` em `accent-strong` (4,57:1 sobre `surface-2` — linha 20) |
| Mês | `mono-xs` em caixa alta, `text-muted` |
| Corpo | padding `space-3` vertical / `space-4` horizontal, gap `space-1` |
| Título | `display-sm`, 1 linha com reticências |
| Meta | `mono-sm` em `text-muted`: `13h · Quadra do Campus 2` |
| `ScopeBadge` | em linha, abaixo da meta |
| Coluna direita | vagas em `mono-sm` + chevron 16 px `aria-hidden`, padding `space-4` |

> **Nota de escala.** O protótipo legado usa Space Grotesk 700 em 14 px no título da lista — passo
> que **não existe** na escala tipográfica. O componente usa `display-sm` (16 px). Foi a primeira
> correção que a escala impôs, e é o tipo de divergência que o design system existe para eliminar.

**Variantes.**

| Variante | O que muda |
|---|---|
| `default` | Coluna de data + corpo + vagas |
| `com estado` | Ganha `StatusBadge` ao lado do `ScopeBadge` |
| `lotado` | Vagas viram `80/80 · lotado`; ação implícita passa a ser lista de espera (RN-006) |
| `cancelado` | Dia em `text-muted`, título em `text-muted`, `StatusBadge` `EVENTO CANCELADO` |
| `realizado` | Coluna de data em `neutral-200`, ação textual "Ver fotos" |
| `compacto` | Sem coluna de data (a data vai para a meta). Usado na aba "Próximos" do perfil, onde o contexto de data já está no cabeçalho |

**Estados.**

| Estado | O que muda |
|---|---|
| `default` | borda `border` |
| `hover` | corpo em `surface-2`, título sublinhado |
| `focus-visible` | anel `accent-strong`, offset `2px` |
| `active` | `scale(0.99)` — a linha é larga, 2% já é perceptível |
| `disabled` | Não existe: item cancelado ou realizado continua navegável |
| `loading` | `Skeleton.ListItem` com a mesma altura e a mesma coluna de 64 px |

**Tokens usados.** `surface` · `surface-2` · `border` · `text` · `text-muted` · `accent-strong` ·
`neutral-200` · `display-md` · `display-sm` · `mono-sm` · `mono-xs` · `space-1` · `space-3` ·
`space-4` · `radius-lg`.

**Acessibilidade.**

- `<li>` dentro de `<ul role="list">`; a linha inteira é um `<a>`.
- Nome acessível por extenso em `.sr-only`, mesma regra do `TicketCard`.
- `<time datetime="2026-09-12T13:00">` envolve a coluna de data; `12` e `SET` isolados levam
  `aria-hidden` e o `<time>` carrega o texto completo.
- Chevron é decorativo: `aria-hidden="true"`.
- Altura mínima de 72 px cobre os 44 px de toque com folga.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Destaque no feed, faixa horizontal | `TicketCard` |
| Menos de 3 eventos na tela | `TicketCard` — sobra espaço, e o picote é o que dá identidade |
| Lista de participantes | Linha de participante com `Avatar` + `StatusBadge`, não este |

---

### 3.5 Avatar

**Função.** Identificar quem publicou, quem organiza e quem está inscrito — sem depender de uma
foto que talvez não exista nem carregue.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | círculo `radius-full`, borda 1 px `border`, fundo `surface-2`, `overflow: hidden` |
| Imagem | `object-fit: cover`, 100% do contêiner |
| Iniciais (fallback) | `mono-sm` até 32 px, `display-sm` de 40 px para cima, cor `text-muted` sobre `surface-2` (5,46:1 — linha 6) |
| Símbolo da marca | usado só em perfil oficial: `assets/logo-simbolo.svg` a 60% do diâmetro |

Tamanhos — todos múltiplos de 4:

| Token de tamanho | Diâmetro | Onde |
|---|---|---|
| `xs` | 24 px | Linha de participante em lista densa |
| `sm` | 32 px | `TopBar`, cabeça do `PostCard` |
| `md` | 40 px | Organizador no detalhe do evento |
| `lg` | 56 px | Cabeçalho do perfil |
| `xl` | 96 px | Capa do perfil, `EmptyState` de perfil |

**Variantes.**

| Eixo | Valores |
|---|---|
| Conteúdo | foto · iniciais · símbolo da marca |
| Tamanho | `xs` · `sm` · `md` · `lg` · `xl` |
| Anel | sem anel (padrão) · anel `accent-2` de 2 px (participante `PRESENTE`, RN-018) · anel `accent-strong` de 2 px (organizador do evento, RN-023) |
| Grupo | pilha sobreposta com deslocamento de `-space-2` e contador `+4` ao final |

**Estados.**

| Estado | O que muda |
|---|---|
| `default` | borda `border` |
| `hover` | Só quando é clicável: borda `border-strong` |
| `focus-visible` | Só quando é clicável: anel `accent-strong`, offset `2px` |
| `active` | Só quando é clicável: `scale(0.98)` |
| `disabled` | Não existe — avatar não é controle |
| `loading` | `Skeleton` circular do mesmo diâmetro |
| `imagem falhou` | Cai para as iniciais. Nunca mostra o ícone de imagem quebrada do navegador |

**Tokens usados.** `surface-2` · `border` · `border-strong` · `text-muted` · `accent-2` ·
`accent-strong` · `mono-sm` · `display-sm` · `space-2` · `radius-full`.

**Acessibilidade.**

- Avatar **ao lado** do nome visível é decorativo: `alt=""` e `aria-hidden="true"` no contêiner. O
  nome já está na tela; repetir gera leitura dupla.
- Avatar **sozinho** como única identificação: `alt="Marina Alves"`.
- Avatar de iniciais: contêiner `aria-hidden="true"` mais `<span class="sr-only">Marina Alves</span>`.
  As iniciais "MA" lidas em voz alta não informam nada.
- Avatar clicável mora dentro de um alvo de 44 × 44, mesmo quando o círculo tem 32 px.
- Anel de `PRESENTE` e de organizador nunca é o único portador da informação: a linha traz também
  `StatusBadge` ou o rótulo "organizador".

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Ilustração decorativa | Nada — a identidade recusa ilustração (ver `identidade-visual.md`) |
| Marca do app | `assets/logo-simbolo.svg` direto, não um avatar com a logo dentro |
| Capa do evento | A capa é imagem do próprio evento, retangular com `radius-xl` |

---

### 3.6 ScopeBadge

**Função.** Dizer, em uma palavra, quem pode ver e se inscrever no evento — a informação que
resolve o problema declarado nº 1 do produto: alcance errado nas duas direções (RF-011, RN-001).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | pílula `radius-full`, altura 20 px, padding `space-1` vertical / `space-2` horizontal |
| Rótulo | `mono-xs` em caixa alta, `letter-spacing +0.10 em` |
| Ícone opcional | 12 × 12, `currentColor`, `aria-hidden="true"` |

**Variantes.** O rótulo muda conforme o alcance seja ou não o do leitor — mesma cor, texto
diferente, porque a pergunta do usuário é "isso é meu?".

| Valor do enum | Rótulo (é do leitor) | Rótulo (não é do leitor) | Fundo | Texto | Contraste |
|---|---|---|---|---|---|
| `TURMA` | `MINHA TURMA` | `3ESPX` | `accent-soft` | `coral-700` | 6,21:1 — linha 12 |
| `CURSO` | `MEU CURSO` | `ECOMP` | `accent-2-soft` | `teal-600` | 6,09:1 — linha 13 |
| `FACULDADE` | `FACULDADE` | `FACULDADE` | `neutral-200` | `neutral-700` | 7,33:1 — linha 14 |

**Estados.**

| Estado | O que acontece |
|---|---|
| `default` | O único estado visual |
| `hover` / `focus-visible` / `active` | **Não existem.** O badge não é interativo. Badge com hover parece clicável, o usuário toca, nada acontece, e a confiança na interface cai |
| `disabled` | Não existe |
| `loading` | `Skeleton` de pílula com 20 px de altura e largura aproximada do rótulo |

**Tokens usados.** `accent-soft` · `accent-2-soft` · `neutral-200` · `coral-700` · `teal-600` ·
`neutral-700` · `mono-xs` · `space-1` · `space-2` · `radius-full`.

**Acessibilidade.**

- É um `<span>`. Nunca `<button>`, nunca `<a>`, nunca `tabindex`.
- Rótulo por extenso quando a sigla é opaca: `3ESPX` recebe
  `<span class="sr-only">turma 3ESPX</span>` e a sigla visível fica `aria-hidden`.
- Nunca `role="status"` nem `aria-live`: o alcance de um evento não muda depois de publicado
  (RN-002), então não há nada para anunciar.
- O texto é o portador da informação; a cor é reforço (1.4.1).

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Estado da participação do leitor | `StatusBadge` |
| Filtrar por alcance | `Chip` |
| Contagem | Texto em `mono-sm`, não badge |

---

### 3.7 StatusBadge

**Função.** Dizer em que ponto está a participação do leitor — ou o estado do evento — sem que ele
precise abrir o detalhe.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | pílula `radius-full`, altura 20 px, padding `space-1` / `space-2` |
| Ponto indicador | 8 px, `radius-full`, `currentColor`, `aria-hidden` — reforço, nunca sinal único |
| Rótulo | `mono-xs` em caixa alta |
| Sufixo opcional | posição na fila: `· 7º` |

**Variantes — `StatusParticipacao`.**

| Enum | Rótulo | Fundo | Texto |
|---|---|---|---|
| `CONFIRMADA` | `CONFIRMADO` | `accent-2-soft` | `teal-600` |
| `PRESENTE` | `PRESENTE` | `accent-2-soft` | `teal-600` |
| `PENDENTE_PAGAMENTO` | `AGUARDANDO PAGAMENTO` | `accent-soft` | `coral-700` |
| `OFERTA_PENDENTE` | `VAGA OFERECIDA` | `accent-soft` | `coral-700` |
| `LISTA_ESPERA` | `LISTA DE ESPERA · 7º` | `neutral-200` | `neutral-700` |
| `AUSENTE` | `AUSENTE` | `neutral-200` | `neutral-700` |
| `CANCELADA` | `INSCRIÇÃO CANCELADA` | `neutral-200` | `neutral-700` |
| `EXPIRADA` | `EXPIRADA` | `neutral-200` | `neutral-700` |

**Variantes — `StatusEvento`.**

| Enum | Rótulo | Fundo | Texto |
|---|---|---|---|
| `RASCUNHO` | `RASCUNHO` | `neutral-200` | `neutral-700` |
| `EM_APROVACAO` | `EM APROVAÇÃO` | `accent-soft` | `coral-700` |
| `PUBLICADO` | — sem badge | — | — |
| `CANCELADO` | `EVENTO CANCELADO` | `danger` **preenchido** | `surface` (10,85:1 — linha 21) |
| `REALIZADO` | `REALIZADO` | `neutral-200` | `neutral-700` |

`CANCELADO` é a única variante preenchida e invertida. É o único estado irreversível e bloqueante
do domínio (RN-021, RN-022), e o peso visual é proporcional à consequência.

**Como não confundir com `ScopeBadge`,** já que os pares de cor se repetem:

1. Posição fixa: `ScopeBadge` sempre primeiro, `StatusBadge` sempre depois.
2. `StatusBadge` tem o ponto indicador de 8 px; `ScopeBadge` não tem.
3. Os vocabulários não se cruzam: nenhum rótulo de alcance é nome de estado.

**Estados.**

| Estado | O que acontece |
|---|---|
| `default` | O único estado visual |
| `hover` / `focus-visible` / `active` / `disabled` | **Não existem** — não é controle |
| `loading` | `Skeleton` de pílula |
| mudança de valor | O badge **não** anuncia. Quem anuncia a mudança é o `Toast` disparado pela ação. Dois anúncios para o mesmo fato é ruído em leitor de tela |

**Tokens usados.** `accent-soft` · `accent-2-soft` · `neutral-200` · `danger` · `surface` ·
`coral-700` · `teal-600` · `neutral-700` · `mono-xs` · `space-1` · `space-2` · `radius-full`.

**Acessibilidade.**

- `<span>`, não controle.
- `EM APROVAÇÃO`, `LISTA DE ESPERA` e afins já são texto legível — não precisam de `.sr-only`.
- `· 7º` recebe `<span class="sr-only">, sétima posição na fila</span>`.
- Sem `aria-live`.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Alcance do evento | `ScopeBadge` |
| Resultado imediato de uma ação | `Toast` |
| Erro em campo de formulário | `Input` com mensagem em `aria-describedby` |
| Contagem de vagas | `ProgressBar` + número |

---

### 3.8 ProgressBar (barra de vagas)

**Função.** Mostrar quão cheio o evento está — com o número ao lado — para o usuário decidir agora
se se inscreve ou espera (RF-020, RN-004).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Trilha | altura 8 px (`space-2`), `radius-full`, fundo **`border`** (`neutral-200`) |
| Preenchimento | `accent-strong`, `radius-full`, largura em % de ocupadas/capacidade |
| Rótulo obrigatório | `mono-sm` ao lado ou acima: `18/40 vagas` |

> **Por que a trilha é `border` e não `surface-2`.** A linha 24 da verificação de contraste mede
> `coral-600` sobre `neutral-200` = 4,10:1, acima dos 3:1 exigidos pelo critério 1.4.11 para
> elemento gráfico essencial. `surface-2` (`neutral-100`) seria mais claro e o par não está
> auditado. Trocar a trilha exige nova linha na tabela antes.

**Variantes.**

| Variante | O que muda |
|---|---|
| `default` | Preenchimento proporcional + contador |
| `crítica` (ocupação ≥ 80%) | A **barra não muda de cor**. O contador ganha `accent-strong` e peso 500, e o texto passa a "Últimas 13 vagas". Cor nova exigiria auditoria nova; a palavra resolve melhor |
| `lotado` | 100% preenchido, contador `80/80 · lotado`, e a tela troca a ação para "Entrar na lista de espera" (RN-006) |
| `oculta` | Inscrições encerradas por prazo (RN-009): a barra **sai da tela** e é substituída por "Inscrições encerradas em 10 de setembro". Barra congelada sem explicação não informa nada |
| `indeterminada` | Faixa de 33% deslizando em 1,2 s, usada só enquanto a capacidade real não chegou do servidor |

**Estados.**

| Estado | O que acontece |
|---|---|
| `default` | Único estado visual |
| `hover` / `focus-visible` / `active` / `disabled` | **Não existem** — a barra não é controle e não recebe foco |
| `loading` | Variante `indeterminada`, desligada em `prefers-reduced-motion: reduce` |

**Tokens usados.** `border` · `accent-strong` · `text-muted` · `mono-sm` · `space-2` ·
`radius-full`.

**Acessibilidade.**

- **Decisão adotada:** a barra é `aria-hidden="true"` e o número visível ao lado é a fonte de
  verdade. Um `18/40 vagas` em texto é mais preciso, mais curto e mais robusto que
  `role="progressbar"` com três atributos que podem sair de sincronia (RNF-004).
- Quando o contexto exigir a semântica formal (relatório do organizador), usar
  `role="progressbar" aria-valuenow="18" aria-valuemin="0" aria-valuemax="40"` mais
  `aria-label="Vagas ocupadas"` — e então o texto ao lado é que fica `aria-hidden`. Nunca os dois.
- Nunca só a barra: o número é obrigatório (1.4.1).

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Carregamento de tela | `Skeleton` |
| Etapa do formulário de criação | `Tabs` em modo stepper, com "Etapa 2 de 3" em texto |
| Tempo restante da janela de pagamento (60 min, RN-012) | Contador em `mono-sm`: "42 min para pagar". Barra encurtando sem número não diz quanto falta |

---

### 3.9 Input

**Função.** Coletar um dado curto e digitável: e-mail institucional, título do evento, local,
capacidade, código de check-in.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Rótulo | `body-sm` peso 500 em `text`, acima do campo, gap `space-1`. **Sempre visível** |
| Campo | altura 44 px, padding `space-3`, `radius-md`, borda 1 px `border-strong` (4,16:1 — linha 23), fundo `surface`, texto `body-md` |
| Prefixo / sufixo | `mono-sm` em `text-muted` dentro do campo: `R$`, `/40`, `@fiap.com.br` |
| Texto de ajuda | `body-xs` em `text-muted`, gap `space-1` abaixo |
| Mensagem de erro | `body-xs` em `danger` + ícone 16 px, substitui o texto de ajuda |
| Contador de caracteres | `mono-xs` em `text-muted`, alinhado à direita na mesma linha da ajuda |

**Variantes.**

| Variante | Especificidade |
|---|---|
| `texto` | Título do evento, local |
| `e-mail` | `inputmode="email"`, `autocomplete="email"`, validação de domínio institucional (RF-001) |
| `número` | `inputmode="numeric"`, capacidade entre 2 e 2000 (`app/src/domain/policy.ts`) |
| `moeda` | Prefixo `R$`, `inputmode="decimal"` |
| `data` / `hora` | Nativo do sistema; prazos coerentes validados no domínio (RN-011) |
| `busca` | Ícone 16 px à esquerda, botão limpar 44 × 44 à direita |
| `somente leitura` | Código de ingresso, valor já pago |

**Estados.**

| Estado | Borda | Fundo | Texto | Extra |
|---|---|---|---|---|
| `default` | `border-strong` | `surface` | `text` | — |
| `hover` | `text-muted` | `surface` | `text` | `cursor: text` |
| `focus-visible` | `accent-strong` | `surface` | `text` | anel `accent-strong`, offset `2px` |
| `preenchido` | `border-strong` | `surface` | `text` | idêntico a `default` — campo preenchido não é estado especial |
| `erro` | `danger` | `surface` | `text` | ícone + mensagem, `aria-invalid="true"`, `aria-describedby` |
| `disabled` | `border` | `surface-2` | `text-disabled` | `disabled` |
| `somente leitura` | `border` | `surface-2` | `text` | `readonly`, sem cursor de texto |
| `loading` | `border` | `surface-2` | — | `Skeleton` com a altura de 44 px do campo |

**Tokens usados.** `surface` · `surface-2` · `border` · `border-strong` · `text` · `text-muted` ·
`text-disabled` · `accent-strong` · `danger` · `body-sm` · `body-md` · `body-xs` · `mono-sm` ·
`mono-xs` · `space-1` · `space-3` · `radius-md`.

**Acessibilidade.**

- `<label for="id">` explícito. `placeholder` **nunca** substitui rótulo: desaparece ao digitar e
  não é lido de forma confiável.
- Erro ligado por `aria-describedby` e marcado com `aria-invalid="true"`.
- O erro é anunciado com `role="alert"` **no envio**, não a cada tecla digitada.
- Erro nunca só em vermelho: ícone + frase (1.4.1).
- Texto do erro no tom de voz definido: "Use seu e-mail institucional (@fiap.com.br)." — não
  "E-mail inválido."
- `inputmode` e `autocomplete` corretos por variante: o teclado que abre no celular faz parte da
  acessibilidade real.
- Altura de 44 px já satisfaz a área de toque; clicar no rótulo foca o campo.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Escolha entre poucas opções conhecidas | `Select` ou grupo de `Chip` |
| Texto de mais de uma linha | `Textarea` |
| Ligar/desligar | Não existe `Switch` na v1: use `Select` de duas opções ou `Chip` com `aria-pressed` |
| Dado de cartão de crédito | Nenhum. RNF-022: dado de cartão não passa pelo nosso front nem pelo nosso banco — o campo é do gateway |

---

### 3.10 Select

**Função.** Escolher um valor de um conjunto fechado e conhecido: alcance, turma, curso, método de
pagamento, ordenação.

**Anatomia.** Mesma casca do `Input` — altura 44 px, `radius-md`, borda `border-strong`, padding
`space-3` — mais:

| Parte | Medida em token |
|---|---|
| Chevron | 16 × 16 à direita, a `space-3` da borda, `aria-hidden="true"` |
| Nota de consequência | `body-xs` em `text-muted` abaixo, quando a escolha tem efeito colateral |

O elemento é o `<select>` **nativo** com `appearance: none`. Nenhum listbox customizado na v1.

**Variantes.**

| Variante | Opções | Nota de consequência |
|---|---|---|
| Alcance | `Minha turma (3ESPX)` · `Meu curso (ECOMP)` · `Faculdade` | "Evento de faculdade precisa de aprovação antes de ficar visível." (RN-003) e "O alcance não pode aumentar depois de publicar." (RN-002) |
| Turma | Turmas do curso do usuário | Depende do curso selecionado |
| Curso | `ECOMP` · `SI` · `CC` | Ao mudar, a turma é limpa — e isso é anunciado |
| Método de pagamento | `PIX` · `CARTAO_CREDITO` · `CARTAO_DEBITO` | "Pix confirma automaticamente. Você tem 60 minutos." (RN-012) |
| Ordenação | `Data` · `Vagas restantes` · `Preço` | — |

**Estados.** Idênticos ao `Input` (tabela em 3.9), com duas diferenças:

| Estado | Diferença |
|---|---|
| `default` sem escolha | Primeira `<option value="" disabled selected>Selecione…</option>` — não é opção válida e não passa na validação |
| `disabled` por dependência | Turma fica `disabled` enquanto não há curso, com nota "Escolha o curso primeiro" |

**Tokens usados.** Os mesmos do `Input`, mais nada. Reutilizar a casca é intencional: campo e seleção
com alturas diferentes desalinham o formulário.

**Acessibilidade.**

- `<select>` nativo entrega, de graça: teclado completo, roda de seleção no celular e leitura
  correta em todos os leitores de tela. Um listbox customizado precisaria reimplementar as três
  coisas — e é a origem clássica de formulário inacessível.
- `<label for>` explícito.
- Ao limpar um campo dependente, anunciar em `aria-live="polite"`: "Turma foi limpa porque o curso
  mudou." Limpeza silenciosa é perda de dado sem aviso.
- A nota de consequência é ligada por `aria-describedby` — quem usa leitor de tela precisa saber
  que escolher `FACULDADE` implica aprovação **antes** de escolher.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| 2 a 4 opções que cabem na tela | Grupo de `Chip` ou rádio — menos toques, tudo visível |
| Executar ação | `Button` |
| Navegar entre telas | `BottomNav` / `Tabs` |
| Mais de ~15 opções | Campo de busca com filtro (fora do escopo da v1) |

---

### 3.11 Textarea

**Função.** Escrever o texto livre do produto: descrição do evento, legenda da publicação, motivo do
cancelamento, resposta a pergunta customizada.

**Anatomia.** Mesma casca do `Input`, mais:

| Parte | Medida em token |
|---|---|
| Altura mínima | 96 px (24 × 4) — três linhas de `body-md` mais o padding |
| Padding | `space-3` |
| `resize` | `vertical`. Nunca `none`: impedir o usuário de ampliar o campo onde ele escreve mais é hostil |
| Contador | `mono-xs` em `text-muted`, canto inferior direito, **só quando existe limite** |

**Variantes.**

| Variante | Contexto |
|---|---|
| Descrição do evento | RF-010, campo do formulário de criação |
| Legenda da publicação | RF-037 |
| Motivo do cancelamento | Obrigatório: RN-020 (moderação com autor e motivo) e RN-021 (cancelamento de evento) |
| Resposta a pergunta customizada | `TipoPergunta = TEXTO_CURTO`, máximo 5 perguntas por evento (`MAX_CUSTOM_QUESTIONS`) |

O limite de caracteres de cada variante vem do schema Zod da tela, não deste documento — o contador
só aparece quando o schema declara um `max`.

**Estados.** Os mesmos do `Input` (3.9), mais:

| Estado | O que muda |
|---|---|
| `contador em excesso` | Contador em `danger` peso 500, borda `danger`, envio bloqueado, mensagem "Passou 12 caracteres do limite." |

**Tokens usados.** Os mesmos do `Input`.

**Acessibilidade.**

- `<label for>` explícito; `<textarea>` nativo.
- Contador ligado por `aria-describedby`, com `aria-live="polite"` acionado **apenas** nos últimos
  10% do limite. Anunciar a cada tecla é insuportável em leitor de tela.
- `resize: none` reprova a revisão.
- Altura mínima de 96 px cobre a área de toque.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Uma linha | `Input` |
| Texto com formatação | Nada. A v1 é texto puro — não há editor rico, e inventar um é o tipo de escopo que a `../03-escopo.md` recusa |
| Mensagem de erro do sistema | `Toast` ou banner |

---

### 3.12 Toast

**Função.** Confirmar que a ação do usuário deu certo — ou explicar por que não deu — sem tirá-lo
de onde ele está (RF-039).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | fundo `surface`, borda 1 px `border`, `radius-md`, **`shadow-md`** (é uma das três coisas que flutuam de verdade), padding `space-3` vertical / `space-4` horizontal, largura máxima 480 px |
| Ancoragem | `bottom: calc(var(--bottomnav-h) + var(--space-4))`, centralizado, `space-4` de margem lateral |
| Faixa de estado | 4 px de largura à esquerda: `accent-2` (sucesso) · `accent-strong` (atenção) · `danger` (erro) |
| Ícone | 20 × 20 na cor da faixa, `aria-hidden="true"` |
| Título | `body-md-strong` |
| Detalhe | `body-sm` em `text-muted`, uma linha |
| Ação opcional | `Button` variante `tertiary`, tamanho `sm`: "Desfazer", "Ver ingresso" |
| Fechar | alvo 44 × 44 com `aria-label="Fechar aviso"` |

**Variantes.**

| Variante | Faixa | Exemplo de conteúdo |
|---|---|---|
| Sucesso | `accent-2` | "Inscrição confirmada." · "Seu ingresso está no perfil." |
| Atenção | `accent-strong` | "Aguardando pagamento." · "Confirmamos automaticamente quando o Pix cair." |
| Erro | `danger` | "Não foi possível confirmar." · "Tente de novo em alguns segundos." |
| Com ação | qualquer | "Inscrição cancelada." + "Desfazer" |
| Persistente | `danger` | Erro não fecha sozinho; só pelo botão |

**Estados.**

| Estado | O que muda |
|---|---|
| `entrando` | `translateY(space-2) → 0` mais opacidade, 160 ms `ease-out` |
| `visível` | Estado de repouso. Duração mínima 5 s |
| `saindo` | Inverso do `entrando` |
| `pausado` | Ao passar o ponteiro ou receber foco, o cronômetro para. Ler um aviso não pode ser uma corrida |
| `hover` / `focus-visible` / `active` | Vivem no botão de fechar e na ação, não no contêiner |
| `disabled` | Não existe |
| `loading` | Não existe — `Toast` é o resultado, não a espera |

**Tokens usados.** `surface` · `border` · `text` · `text-muted` · `accent-2` · `accent-strong` ·
`danger` · `shadow-md` · `body-md-strong` · `body-sm` · `space-2` · `space-3` · `space-4` ·
`radius-md`.

**Acessibilidade.**

- Região `role="status" aria-live="polite"` para sucesso e atenção; `role="alert"
  aria-live="assertive"` **só** para erro. Erro assertivo interrompe a leitura em curso — usar isso
  em confirmação é agressivo.
- Nunca rouba o foco. O usuário continua onde estava.
- Nunca é o **único** lugar onde a informação existe: a tela também muda (`StatusBadge`, botão,
  contador). Toast que passa leva a informação com ele.
- Duração mínima de 5 s, pausada em hover e foco.
- `prefers-reduced-motion: reduce` remove o deslocamento e mantém a opacidade.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Erro de validação de campo | `Input` com mensagem inline — o erro precisa ficar ao lado do campo |
| Decisão que exige confirmação | `Modal` |
| Estado permanente ("evento cancelado") | `StatusBadge` + banner na tela |
| Informação que o usuário vai precisar depois | Tela de notificações |

---

### 3.13 Modal

**Função.** Interromper o fluxo para confirmar uma ação irreversível — ou coletar o mínimo
indispensável para prosseguir.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Sobreposição | `overlay` — `neutral-900` a 40% de alfa (**token novo**, ver nota) |
| Folha (desktop / tablet) | fundo `surface`, `radius-xl`, **`shadow-lg`**, padding `space-6`, largura máxima 480 px, centralizada |
| Folha (mobile) | colada na base, `radius-xl` só no topo, largura total, padding `space-5` |
| Alça (mobile) | 32 × 4 px em `border`, `radius-full`, centralizada, `aria-hidden` |
| Título | `display-md`, é um `<h2>` |
| Corpo | `body-md`, máximo 3 linhas de texto |
| Rodapé | gap `space-3`; no desktop as ações vão à direita, no mobile empilham em `block` com a ação segura em cima |

> **Nota — token novo.** `overlay` (`rgba(20,24,28,.4)`) é o único token que este inventário
> introduz e que não está em `identidade-visual.md`. Ele é sobreposição, não par texto-sobre-fundo,
> então não entra na tabela de contraste; entra na lista de tokens semânticos junto com as sombras.
> Registrado aqui para ser adicionado no mesmo PR que criar o componente.

**Variantes.**

| Variante | Ação primária | Regra |
|---|---|---|
| Confirmação destrutiva | `Button danger` "Cancelar evento" | RN-021: irreversível, e a cascata em RN-022 é explicada no corpo |
| Confirmação simples | `Button primary` "Cancelar inscrição" | RN-010: prazo de cancelamento no corpo |
| Coleta curta | `Button primary` "Confirmar inscrição" | Até 5 perguntas customizadas (RN-025: a pergunta não bloqueia a vaga) |
| Informativa | `Button secondary` "Entendi" | Política de reembolso (RN-013) |

**Estados.**

| Estado | O que muda |
|---|---|
| `fechado` | **Não está no DOM.** Modal escondido com `display: none` continua no caminho do leitor de tela |
| `abrindo` | Sobreposição em fade, folha subindo `space-4`, 160 ms |
| `aberto` | Foco preso dentro da folha, `overflow: hidden` no `body` |
| `fechando` | Inverso |
| `hover` / `focus-visible` / `active` | Nos botões e no fechar, não no contêiner |
| `disabled` | Não existe |
| `loading` | Ação primária em `loading`, foco continua preso, sobreposição impede clique duplo |

**Tokens usados.** `overlay` · `surface` · `border` · `text` · `text-muted` · `shadow-lg` ·
`display-md` · `body-md` · `space-3` · `space-5` · `space-6` · `radius-xl` · `radius-full`.

**Acessibilidade.**

- `role="dialog" aria-modal="true"`, com `aria-labelledby` apontando para o `<h2>` e
  `aria-describedby` para o corpo.
- Foco entra no **primeiro elemento seguro** — nunca na ação destrutiva. Ordem do DOM no rodapé:
  cancelar, depois confirmar.
- Foco é cíclico dentro da folha (Tab do último volta ao primeiro).
- `Esc` fecha. Clique na sobreposição fecha **apenas** em modal não destrutivo.
- Ao fechar, o foco volta ao elemento que abriu.
- `overflow: hidden` no `body` enquanto aberto, para a página de trás não rolar.
- No mobile, a folha nunca ocupa mais de 90% da altura: o usuário precisa ver que existe conteúdo
  atrás.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Avisar resultado | `Toast` |
| Formulário longo (criar evento) | Tela própria em `/criar` — formulário em modal é armadilha no celular |
| Escolha entre poucas opções | `Select` nativo: o sistema já abre em folha |
| Onboarding / boas-vindas | Nada. RNF-005 exige 90 s sem treinamento; se precisa de modal explicando, a tela está errada |

---

### 3.14 Tabs

**Função.** Alternar entre subconjuntos do **mesmo** contexto sem trocar de rota — "Próximos /
Histórico" no perfil, "Confirmados / Lista de espera / Presentes" na gestão do evento.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Trilha | linha inferior de 1 px em `border`, largura total |
| Aba | altura 44 px, padding `space-2` vertical / `space-4` horizontal, gap `space-1` interno |
| Rótulo | `body-md-strong` |
| Contador | `mono-sm` em `text-muted`, entre parênteses: `(18)` |
| Indicador ativo | 2 px na base, em `accent-2`, largura da aba |
| Transbordo | `overflow-x: auto` quando as abas não couberem em 320 px |

O indicador usa `accent-2` porque o token semântico "aba ativa do perfil" já é `accent-2` em
`identidade-visual.md` — e porque `accent-strong` fica reservado à ação primária da tela.

**Variantes.**

| Variante | Uso |
|---|---|
| 2 abas, largura dividida | Perfil: "Próximos" / "Histórico" — cada aba com `flex: 1` |
| 3 abas com contador | Gestão do evento: "Confirmados (18)" / "Lista de espera (7)" / "Presentes (0)" |
| Rolável | Mais de 3 abas em 320 px |
| Stepper | Formulário de criação, com "Etapa 2 de 3" em texto e abas anteriores navegáveis, futuras desabilitadas |

**Estados.**

| Estado | Texto | Indicador | Extra |
|---|---|---|---|
| `default` | `text-muted` | — | peso 600 do `body-md-strong` |
| `hover` | `text` | trilha em `border-strong` | — |
| `focus-visible` | herda | herda | anel `accent-strong`, offset `2px` |
| `active` (pressionando) | `text` | — | `scale(0.98)` |
| `selecionado` | `text` | `accent-2` 2 px | `aria-selected="true"` — três sinais: cor, indicador e ARIA |
| `disabled` | `text-disabled` | — | `aria-disabled="true"`; etapa futura do stepper |
| `loading` | abas ficam | — | `Skeleton` no painel; as abas **não** desaparecem, senão a tela pula |

**Tokens usados.** `border` · `border-strong` · `text` · `text-muted` · `text-disabled` ·
`accent-2` · `accent-strong` · `body-md-strong` · `mono-sm` · `space-1` · `space-2` · `space-4`.

**Acessibilidade.**

- `<div role="tablist" aria-label="Meus eventos">`, abas `<button role="tab" aria-selected
  aria-controls="painel-x" id="aba-x">`, painel `<div role="tabpanel" aria-labelledby="aba-x"
  tabindex="0">`.
- Teclado: `←` `→` movem entre abas, `Home` e `End` vão à primeira e à última. Apenas a aba
  selecionada está no `tab order` (`tabindex="0"`); as outras recebem `tabindex="-1"`.
- Selecionado não é só cor: indicador de 2 px, peso 600 e `aria-selected`.
- Altura de 44 px cobre a área de toque.
- Troca de aba **não** muda a URL: por isso Tabs não serve para navegação principal — o estado não
  é compartilhável nem volta com o botão "voltar".

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Navegação principal do app | `BottomNav` — precisa de rota real e link compartilhável |
| Filtros combináveis | `Chip` |
| Mais de 4 abas | `Select` |
| Passos que devem ser lineares e travados | Formulário em etapas com validação, não abas livres |

---

### 3.15 EmptyState

**Função.** Explicar por que a tela está vazia e oferecer a próxima ação — em vez de deixar o
usuário concluir que o app quebrou.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | centralizado, padding `space-16` vertical / `space-5` horizontal, gap `space-4` |
| Marca d'água | símbolo do logo a 48 px em `border`, `aria-hidden="true"`. **Não é ilustração** — a identidade recusa ilustração decorativa |
| Título | `display-sm`, é um `<h2>` ou `<h3>` conforme a hierarquia da tela |
| Explicação | `body-sm` em `text-muted`, máximo 2 linhas |
| Ação | um `Button` — `primary` quando há algo a criar, `tertiary` quando é só limpar filtro |

**Variantes.** Todos os textos vêm da tabela de microcópia de `identidade-visual.md`.

| Variante | Título | Explicação | Ação |
|---|---|---|---|
| Feed vazio | "Nada por aqui ainda." | "Quando alguém da sua turma publicar, aparece aqui." | — |
| Eventos vazios | "Nenhum evento no seu alcance." | "Que tal criar o primeiro?" | `primary` "Criar evento" |
| Filtro sem resultado | "Nenhum evento com esses filtros." | "Tente ampliar o alcance ou o período." | `tertiary` "Limpar filtros" |
| Histórico vazio | "Você ainda não participou de nenhum evento." | "Seu histórico aparece aqui depois do primeiro check-in." | `tertiary` "Ver eventos" |
| Erro de carregamento | "Não foi possível carregar." | "Verifique a conexão e tente de novo." | `secondary` "Tentar de novo" |
| Sem ingresso ativo | "Você não tem ingresso ativo." | "Inscreva-se em um evento para receber seu ingresso." | `tertiary` "Ver eventos" |

**Estados.**

| Estado | O que acontece |
|---|---|
| `default` | Único estado do bloco; o botão tem os seus |
| `hover` / `focus-visible` / `active` / `disabled` | Vivem no botão |
| `loading` | **Não existe.** `Skeleton` vem antes; o `EmptyState` só aparece depois de a resposta confirmar zero resultado. Mostrar "nada aqui" antes da resposta é mentira |

**Tokens usados.** `border` · `text` · `text-muted` · `display-sm` · `body-sm` · `space-4` ·
`space-5` · `space-16`.

**Acessibilidade.**

- O título é cabeçalho real na hierarquia da tela, não `<div>` estilizado.
- Marca d'água `aria-hidden="true"`.
- Quando o `EmptyState` substitui uma lista por causa de mudança de filtro, o fato é anunciado em
  `aria-live="polite"`: "Nenhum evento com esses filtros."
- A ação recebe o foco em uma ordem que faz sentido: título, explicação, ação.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Enquanto carrega | `Skeleton` |
| Erro dentro de formulário | `Input` com mensagem inline |
| Há conteúdo, mas pouco | Mostrar o conteúdo. Um evento é melhor que um estado vazio bem desenhado |

---

### 3.16 Skeleton

**Função.** Reservar **exatamente** o espaço do conteúdo que está chegando, para a tela não pular
quando ele chega — a diferença entre "rápido" e "instável" percebidos (RNF-006).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Bloco | fundo `surface-2`; `radius-sm` para texto, `radius-lg` para cartão, `radius-full` para avatar e pílula |
| Altura de linha de texto | igual ao `line-height` do token que substitui — `body-md` vira bloco de 22 px, `display-lg` vira 29 px |
| Brilho | `linear-gradient` de `surface-2` → `surface` → `surface-2` deslizando 1,2 s, `ease-in-out`, infinito |

**Variantes.** Cada variante é a silhueta de um componente real, com a **mesma** geometria.

| Variante | Silhueta |
|---|---|
| `Skeleton.Text` | 1 a 3 linhas com larguras 100% / 80% / 60% — bloco uniforme parece caixa, não texto |
| `Skeleton.Avatar` | Círculo no diâmetro pedido |
| `Skeleton.Ticket` | `TicketCard` completo, **com o picote**: os recortes ficam no lugar e o cartão não muda de altura ao carregar |
| `Skeleton.ListItem` | Linha com coluna de 64 px, título e duas metas |
| `Skeleton.Post` | Cabeça com avatar, retângulo de imagem em `aspect-ratio`, duas linhas de legenda |
| `Skeleton.QrTicket` | Ingresso grande com o bloco do QR quadrado |

**Estados.**

| Estado | O que acontece |
|---|---|
| `default` | Animado |
| `reduzido` | `@media (prefers-reduced-motion: reduce)`: sem animação, só o `surface-2` estático |
| `hover` / `focus-visible` / `active` / `disabled` | Não existem — não é controle e não recebe foco |
| Tempo excedido | Depois do tempo limite da consulta, o `Skeleton` sai e entra `EmptyState` variante "Erro de carregamento". `Skeleton` eterno é o pior estado possível |

**Tokens usados.** `surface` · `surface-2` · `radius-sm` · `radius-lg` · `radius-full`.

**Acessibilidade.**

- Contêiner `aria-hidden="true"` mais um único
  `<p class="sr-only" role="status">Carregando eventos…</p>`. Sem isso, o leitor de tela anuncia
  dezenas de blocos vazios.
- Nunca recebe foco.
- A silhueta tem que bater com o conteúdo real: se o `Skeleton` tem altura diferente, a tela pula e
  o usuário toca no elemento errado — que é uma falha de acessibilidade, não de estética.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Ação em andamento dentro de um botão | `Button` estado `loading` |
| Resultado vazio | `EmptyState` |
| Conteúdo que chega em menos de 200 ms | Nada. `Skeleton` piscando é pior que ausência de feedback |

---

### 3.17 TopBar

**Função.** Dizer onde o usuário está, dar acesso ao perfil e manter "criar" a um toque de distância
em qualquer tela.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | altura 56 px, `position: sticky; top: 0`, fundo `bg` a 90% de alfa com `backdrop-filter: blur(10px)`, borda inferior 1 px `border`, padding lateral `space-5` |
| Sombra | `shadow-sm`, **apenas** quando a página está rolada |
| Esquerda (raiz) | símbolo 24 px + wordmark em `display-sm` |
| Esquerda (interna) | botão voltar 44 × 44 + título da tela em `display-sm`, truncado com reticências |
| Direita | `Button primary size-sm` "Criar" + `Avatar sm` dentro de alvo 44 × 44 |
| `z-index` | acima do conteúdo, abaixo de `Modal` e `Toast` |

**Variantes.**

| Variante | Composição | Rota |
|---|---|---|
| Raiz | Logo + "Criar" + avatar | `/` |
| Interna | Voltar + título + avatar | `/eventos`, `/perfil` |
| Interna com ação | Voltar + título + ação textual ("Editar", "Compartilhar") | `/eventos/:id` para o organizador |
| Transparente sobre capa | Sem fundo nem borda; o botão voltar ganha cápsula `surface` de 44 px para contraste sobre a foto | `/eventos/:id` no topo do scroll |

**Estados.**

| Estado | O que muda |
|---|---|
| `default` | Fundo translúcido, borda inferior, sem sombra |
| `rolado` | Ganha `shadow-sm` |
| `transparente` | Sem fundo, sem borda; o conteúdo interno ganha cápsula para não perder contraste sobre foto |
| `hover` / `focus-visible` / `active` / `disabled` | Vivem nos filhos (voltar, "Criar", avatar) |
| `loading` | Não existe: a barra é casca, aparece antes dos dados |

**Tokens usados.** `bg` · `surface` · `border` · `text` · `shadow-sm` · `display-sm` · `space-5` ·
`radius-full`.

**Acessibilidade.**

- `<header>` (papel `banner` implícito). Se houver mais de um `<header>` na página, o principal
  recebe `aria-label="Barra superior"`.
- **Hierarquia de cabeçalho:** em tela interna, o título da `TopBar` **é** o `<h1>` da página, e o
  conteúdo não o repete. No feed, o `<h1>` é "Bom dia, Marina" no conteúdo, e a barra traz apenas a
  marca. Um `<h1>` por página, sempre.
- Primeiro elemento focável do documento é o link "Pular para o conteúdo".
- Botão voltar com `aria-label="Voltar"`; wordmark do logo com `<title>` no SVG.
- `backdrop-filter` é enfeite: a cor de fundo com alfa já garante legibilidade onde o filtro não é
  suportado.
- `position: sticky` com `top: 0` e altura fixa de 56 px é segura em 320 px — não há conteúdo
  lateral que estoure.

**Quando NÃO usar.**

| Situação | Onde deve ir |
|---|---|
| Filtros | No conteúdo, para rolarem junto com a lista |
| Ação primária da tela | Rodapé fixo do detalhe do evento — no alcance do polegar |
| Navegação entre destinos no mobile | `BottomNav` |

---

### 3.18 BottomNav

**Função.** Trocar de destino em um toque de polegar, sem menu escondido — a navegação inteira do
app visível de uma vez (RNF-001, RNF-005).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | altura 64 px mais `env(safe-area-inset-bottom)`, `position: fixed; bottom: 0`, fundo `surface`, borda superior 1 px `border` |
| Grade | `grid-template-columns: 1fr 1fr 56px 1fr 1fr` — 4 destinos e a ação central |
| Destino | coluna: ícone 24 px + rótulo `mono-xs`, alvo mínimo 44 × 44 |
| Indicador ativo | 2 px no **topo** da célula, em `accent-strong` |
| Ação central | círculo de 56 px em `accent-strong`, ícone 24 px em `surface`, elevado `space-2` acima da barra |
| Reserva no conteúdo | a página aplica `padding-bottom: calc(var(--bottomnav-h) + var(--space-6))` |

Destinos e rotas — todas existentes na tabela de rotas do app:

| Célula | Destino | Rota |
|---|---|---|
| 1 | Feed | `/` |
| 2 | Eventos | `/eventos` |
| 3 (central) | Criar | `/criar` |
| 4 | Ingresso | `/ingresso/:id` da participação confirmada mais próxima |
| 5 | Perfil | `/perfil` |

> **Divergência registrada.** `identidade-visual.md` especifica "4 destinos + ação central" e a
> tabela de rotas não tem uma rota de *lista* de ingressos. A célula 4 resolve para
> `/ingresso/:id` da próxima participação confirmada (para Marina: `evt-001`). Quando não há
> nenhuma, a célula fica `aria-disabled="true"` em `text-disabled`, com
> `<span class="sr-only">Você não tem ingresso ativo</span>`. Alternativa avaliada e recusada:
> criar `/ingressos`, que expande a tabela de rotas fora do que o escopo da v1 aprovou.

**Variantes.**

| Variante | Quando |
|---|---|
| Mobile (padrão) | Abaixo de 1024 px |
| Oculta | A partir de 1024 px: a navegação sobe para a `TopBar` e a barra inferior sai do DOM |
| Sem ingresso ativo | Célula 4 desabilitada |

**Estados.**

| Estado | Ícone | Rótulo | Extra |
|---|---|---|---|
| `default` | contorno, `text-muted` | `text-muted` | — |
| `hover` (ponteiro) | `text` | `text` | célula em `surface-2` |
| `focus-visible` | — | — | anel `accent-strong` com `outline-offset: -2px` — offset positivo seria cortado pela borda da barra fixa |
| `active` | — | — | `scale(0.98)` |
| `ativo` (destino atual) | preenchido, `text` | `text`, peso 600 | indicador `accent-strong` de 2 px + `aria-current="page"` |
| `disabled` | `text-disabled` | `text-disabled` | `aria-disabled="true"` + explicação em `.sr-only` |
| `loading` | Não existe | | |

**Tokens usados.** `surface` · `surface-2` · `border` · `text` · `text-muted` · `text-disabled` ·
`accent-strong` · `mono-xs` · `space-2` · `space-6` · `radius-full`.

**Acessibilidade.**

- `<nav aria-label="Navegação principal">` com `<ul>` e `<li>`; cada destino é um `Link`.
- Destino atual com `aria-current="page"`.
- Ação central é um `Link` só com ícone: exige `aria-label="Criar evento"` (RNF-004).
- Ativo não é só cor: ícone preenchido, rótulo em peso 600 e indicador de 2 px.
- `padding-bottom: env(safe-area-inset-bottom)` para o iPhone com barra de gestos.
- Área de toque: a altura de 64 px já cobre 44 px; cada célula tem no mínimo 44 px de largura até
  em 320 px (320 − 56 = 264 ÷ 4 = 66 px).
- O anel de foco usa offset negativo para não ser cortado.

**Quando NÃO usar.**

| Situação | Onde deve ir |
|---|---|
| Desktop a partir de 1024 px | `TopBar` |
| Ações do contexto (compartilhar, editar, cancelar) | `TopBar` ou rodapé da tela |
| Mais de 5 células | Nenhuma. Se aparecer um sexto destino, a informação de arquitetura está errada, não a barra |

---

### 3.19 PostCard

**Função.** Mostrar a memória do evento — a foto de quem esteve lá — que hoje se perde no grupo de
WhatsApp. É o valor "nenhuma memória do que aconteceu" sendo resolvido (RF-036, RF-037).

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | fundo `surface`, borda 1 px `border`, `radius-lg`, `overflow: hidden` (sem picote aqui) |
| Cabeça | padding `space-3` vertical / `space-4` horizontal, gap `space-3`: `Avatar sm` + bloco de identidade + botão de opções 44 × 44 |
| Nome | `body-md-strong` |
| Linha de contexto | `mono-xs` em `text-muted`: `3ESPX · há 2 h` |
| Imagem | largura total, `aspect-ratio: 4 / 5` no máximo, `object-fit: cover`, fundo `surface-2` enquanto carrega |
| Vínculo com o evento | faixa em `surface-2`, padding `space-2` / `space-4`, símbolo 16 px + título do evento como link |
| Legenda | padding `space-3` / `space-4`, `body-md`, 3 linhas e "ver mais" |
| Pé | `mono-sm` em `text-muted`: contadores |

**Variantes.**

| Variante | O que muda |
|---|---|
| Com evento vinculado | Padrão. RN-019: publica quem esteve no evento |
| Sem imagem | Só legenda, com `radius-lg` e padding `space-4` |
| Múltiplas imagens | Faixa rolável horizontal com indicador de posição em pontos e contador `2/5` em `mono-xs` |
| Moderada | Imagem e legenda substituídas por bloco em `surface-2`: "Publicação removida pela moderação. Motivo: …" (RN-020, RF-042) |
| Própria | Menu de opções ganha "Excluir publicação" |

**Estados.**

| Estado | O que muda |
|---|---|
| `default` | Borda `border` |
| `hover` | Só nos alvos: o vínculo do evento sublinha, o botão de opções ganha `surface-2`. O cartão inteiro **não** é clicável — a imagem não navega |
| `focus-visible` | Anel `accent-strong` em cada alvo focável |
| `active` | `scale(0.98)` nos alvos |
| `disabled` | Não existe |
| `loading` | `Skeleton.Post` com a mesma `aspect-ratio`, para o feed não pular |

**Tokens usados.** `surface` · `surface-2` · `border` · `text` · `text-muted` · `accent-strong` ·
`body-md` · `body-md-strong` · `mono-sm` · `mono-xs` · `space-2` · `space-3` · `space-4` ·
`radius-lg`.

**Acessibilidade.**

- `<article aria-labelledby="post-x-autor">`.
- `alt` da imagem é escrito por quem publica. Quando não há, `alt=""` e a legenda faz o trabalho —
  jamais `alt="imagem"` ou `alt="foto do evento"`, que só atrapalham.
- `<time datetime="2026-08-22T14:30">` com "há 2 h" visível.
- Contadores **não** são botões na v1 (não há reação): não recebem cursor de ponteiro nem hover, para
  não prometer interação que não existe.
- Botão de opções: alvo 44 × 44 com `aria-label="Opções da publicação"`.
- Faixa de múltiplas imagens é `role="group" aria-label="5 fotos"`, navegável por teclado.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Anunciar o evento | `TicketCard` ou `EventListItem` |
| Aviso do sistema no feed | Banner dedicado — post falso do sistema quebra a confiança no feed |
| Galeria da tela do evento | Grade de miniaturas, não cartões empilhados |

---

### 3.20 QrTicket

**Função.** Ser o ingresso: o que o usuário abre na porta do evento para o organizador validar
(RF-033, RN-017).

É a geometria do `TicketCard` ampliada — de propósito. O usuário reconhece o objeto que viu no feed,
agora com o nome dele dentro.

**Anatomia.**

| Parte | Medida em token |
|---|---|
| Contêiner | fundo `surface`, borda 1 px `border`, `radius-xl`, padding `space-6`, `overflow: visible`, `--ticket-notch` conforme o fundo |
| Topo | `ScopeBadge` + `StatusBadge` `CONFIRMADO` |
| Título | `display-lg`, até 2 linhas |
| Metas | `mono-sm` em `text-muted`: data completa, hora, local |
| Portador | `display-md` com o nome + `mono-sm` com a turma |
| **Picote** | mesma técnica de 3.3.2, com círculos de `space-6` (24 px) e offset `calc(space-6 + space-3 + 1px)` = 37 px |
| Bloco do QR | fundo `surface`, borda 1 px `border`, `radius-md`, padding `space-4`; QR de 176 × 176 (44 × 4) com módulos em `text` sobre `surface` — 17,84:1 |
| Código | `mono-sm` com `letter-spacing +0.10 em`: `CMP-3ESPX-0184` |
| Janela de validade | `body-xs` em `text-muted` |
| Aviso | `body-xs` em `text-muted`: "Uso único. Não compartilhe esta imagem." |
| Ações | `Button secondary` "Adicionar ao calendário" e "Compartilhar", empilhadas em `block` no mobile |

A janela de validade é calculada com os parâmetros de `app/src/domain/policy.ts`:
`CHECKIN_OPENS_HOURS_BEFORE` 4 e `CHECKIN_CLOSES_HOURS_AFTER` 2. Para `evt-001` (sábado, 12 de
setembro, 13h) o texto é: **"Válido das 9h às 15h de sábado, 12 de setembro."**

**Variantes.**

| Variante | O que muda | Regra |
|---|---|---|
| `confirmado` | Padrão, com QR ativo | RF-033 |
| `presente` | QR substituído por marca de conferido em `accent-2` mais "Check-in feito às 13h07"; `StatusBadge` `PRESENTE` | RN-018, presença imutável 1:1 |
| `já utilizado` | Bloco do QR em `surface-2` com "Ingresso já utilizado às 13h07." | RN-017 |
| `aguardando pagamento` | QR não é gerado. No lugar: "Aguardando pagamento. Você tem 42 min para pagar." em `mono-sm` | RN-012, janela de 60 min |
| `lista de espera` | Sem QR. Mostra "Você é o 8º da fila." e "Se abrir vaga, você tem 24 h para confirmar." | RN-006, RN-007, `WAITLIST_OFFER_WINDOW_HOURS` 24 |
| `evento cancelado` | QR em `surface-2`, `StatusBadge` `EVENTO CANCELADO` preenchido, mais "Evento cancelado pelo organizador. Seu pagamento será devolvido integralmente." | RN-021, RN-022, RN-013 |

**Estados.**

| Estado | O que muda |
|---|---|
| `default` | QR legível, `StatusBadge` `CONFIRMADO` |
| `hover` / `focus-visible` / `active` | Vivem nas duas ações secundárias. O ingresso em si não é clicável |
| `disabled` | Não existe. O que existe é o QR **não gerado** nas variantes de pagamento e lista de espera |
| `loading` | `Skeleton.QrTicket` com o quadrado do QR reservado |

**Tokens usados.** `surface` · `surface-2` · `border` · `text` · `text-muted` · `accent-2` ·
`accent-soft` · `accent-2-soft` · `danger` · `display-lg` · `display-md` · `mono-sm` · `body-xs` ·
`space-3` · `space-4` · `space-6` · `radius-xl` · `radius-md` · `radius-full`.

**Acessibilidade.**

- O QR é `<svg role="img">` com `<title>Ingresso CMP-3ESPX-0184</title>`.
- O código **também** está em texto, sempre. Duas razões: leitor de tela não lê QR, e o organizador
  precisa poder digitar o código quando a câmera falha (`MetodoCheckin.CODIGO_NUMERICO`).
- Contraste do QR: módulos `text` sobre `surface` = 17,84:1, muito acima do mínimo. O QR **nunca**
  vai sobre foto, sobre cor nem sobre degradê — leitor óptico precisa de preto sobre branco.
- Nenhum `aria-live`: o ingresso não muda sozinho na tela.
- O aviso de uso único é texto, não ícone.
- Brilho de tela no máximo é decisão do usuário na v1 (exigiria API do dispositivo); a compensação
  é o contraste máximo do QR.

**Quando NÃO usar.**

| Situação | Componente certo |
|---|---|
| Anunciar o evento | `TicketCard` |
| Tela de validação do organizador | Tela de check-in com câmera — CP5, fora da tabela de rotas da v1 |
| Comprovante de pagamento | Bloco de pagamento no detalhe do evento |

---

## 4. Mapa componente → tela

| Componente | Telas onde aparece | Rota |
|---|---|---|
| `Button` | Todas | todas |
| `Chip` | Lista de eventos (filtros), Perfil (filtro de histórico) | `/eventos`, `/perfil` |
| `TicketCard` | Feed (faixa "Próximos no seu alcance"), Perfil (grade de próximos) | `/`, `/perfil` |
| `EventListItem` | Lista de eventos, Perfil (histórico) | `/eventos`, `/perfil` |
| `Avatar` | TopBar, Feed, Detalhe (organizador), Perfil, lista de participantes | todas |
| `ScopeBadge` | Feed, Lista, Detalhe, Criar (pré-visualização), Ingresso | `/`, `/eventos`, `/eventos/:id`, `/criar`, `/ingresso/:id` |
| `StatusBadge` | Lista, Detalhe, Perfil, Ingresso | `/eventos`, `/eventos/:id`, `/perfil`, `/ingresso/:id` |
| `ProgressBar` | Lista (quando ≥ 80%), Detalhe | `/eventos`, `/eventos/:id` |
| `Input` | Criar evento, login/cadastro, busca da lista | `/criar`, `/eventos` |
| `Select` | Criar evento (alcance, turma, curso), Detalhe (método de pagamento) | `/criar`, `/eventos/:id` |
| `Textarea` | Criar evento (descrição), publicar foto, cancelar evento (motivo) | `/criar`, `/` |
| `Toast` | Todas (inscrição, cancelamento, publicação, erro de pagamento) | todas |
| `Modal` | Detalhe (cancelar inscrição, perguntas customizadas), Criar (cancelar evento) | `/eventos/:id`, `/criar` |
| `Tabs` | Perfil (Próximos / Histórico), Detalhe do organizador (Confirmados / Espera / Presentes) | `/perfil`, `/eventos/:id` |
| `EmptyState` | Feed, Lista, Perfil, 404 | `/`, `/eventos`, `/perfil`, `*` |
| `Skeleton` | Feed, Lista, Detalhe, Perfil, Ingresso | todas menos `*` |
| `TopBar` | Todas menos 404 | todas |
| `BottomNav` | Todas menos 404, e oculta a partir de 1024 px | todas |
| `PostCard` | Feed, Detalhe (galeria do evento realizado) | `/`, `/eventos/:id` |
| `QrTicket` | Ingresso, Perfil (pré-visualização reduzida) | `/ingresso/:id`, `/perfil` |

Cobertura das 7 rotas: `/` `/eventos` `/eventos/:id` `/criar` `/perfil` `/ingresso/:id` `*`.
A rota `*` (404) usa apenas `EmptyState` e `Button` — sem `TopBar` e sem `BottomNav`, porque não há
contexto de navegação válido para mostrar.

---

## 5. Mapa componente → arquivo

Este mapa é o **contrato de implementação** da Sprint 2 (CP5). As pastas
`app/src/components/ui/` e `app/src/components/layout/` já existem na árvore; os arquivos abaixo
são o que deve ser criado, com estes nomes exatos. Divergir do nome quebra o vínculo com o Figma,
onde o *component set* tem o mesmo nome (ver [`guia-figma.md`](guia-figma.md)).

| Componente | Arquivo |
|---|---|
| `Button` | `app/src/components/ui/Button.tsx` |
| `Chip` | `app/src/components/ui/Chip.tsx` |
| `TicketCard` | `app/src/components/ui/TicketCard.tsx` |
| `EventListItem` | `app/src/components/ui/EventListItem.tsx` |
| `Avatar` | `app/src/components/ui/Avatar.tsx` |
| `ScopeBadge` | `app/src/components/ui/ScopeBadge.tsx` |
| `StatusBadge` | `app/src/components/ui/StatusBadge.tsx` |
| `ProgressBar` | `app/src/components/ui/ProgressBar.tsx` |
| `Input` | `app/src/components/ui/Input.tsx` |
| `Select` | `app/src/components/ui/Select.tsx` |
| `Textarea` | `app/src/components/ui/Textarea.tsx` |
| `Toast` | `app/src/components/ui/Toast.tsx` |
| `Modal` | `app/src/components/ui/Modal.tsx` |
| `Tabs` | `app/src/components/ui/Tabs.tsx` |
| `EmptyState` | `app/src/components/ui/EmptyState.tsx` |
| `Skeleton` | `app/src/components/ui/Skeleton.tsx` |
| `PostCard` | `app/src/components/ui/PostCard.tsx` |
| `QrTicket` | `app/src/components/ui/QrTicket.tsx` |
| `TopBar` | `app/src/components/layout/TopBar.tsx` |
| `BottomNav` | `app/src/components/layout/BottomNav.tsx` |
| Casca da aplicação (TopBar + conteúdo + BottomNav + Toast) | `app/src/components/layout/AppShell.tsx` |

Arquivos de apoio que o design system também governa:

| Arquivo | Papel |
|---|---|
| `app/tailwind.config.ts` | Fonte de verdade dos tokens em código: cores, escala tipográfica, espaçamento, raios, sombras |
| `app/src/styles/globals.css` | Camada base: `@font-face`/import das 3 famílias, regra global de `:focus-visible`, `.sr-only`, `prefers-reduced-motion`, custom properties que o Tailwind não cobre (`--ticket-notch`, `--overlay`) |
| `app/src/types/domain.ts` | Enums que as variantes de `ScopeBadge` e `StatusBadge` consomem — a variante é derivada do enum, nunca de string solta |

---

## 6. Regras de contribuição do design system

### 6.1 Como propor componente novo

**A regra dos três.** Componente novo só nasce no **terceiro** caso concreto. Antes disso:

| Casos de uso | O que fazer |
|---|---|
| 1 caso | Resolver na própria tela, com os componentes existentes. Não abstrair |
| 2 casos | Adicionar **variante** ou **prop** ao componente existente mais próximo |
| 3 casos com a mesma anatomia | Aí sim: propor componente, e a proposta traz os três usos nomeados |

A proposta precisa conter, no PR, antes de qualquer linha de implementação:

1. **Os três usos reais**, cada um com tela e rota. "Vai ser útil no futuro" não conta.
2. **Anatomia em tokens** — se a anatomia exige uma medida que não está na escala, a proposta é da
   medida, não do componente.
3. **Tabela de estados** completa, com `não existe porque…` nos estados ausentes.
4. **Par de contraste verificado** para cada combinação de cor nova, com a linha correspondente
   adicionada à tabela de `identidade-visual.md`.
5. **A seção "quando NÃO usar"**, nomeando o componente que as pessoas vão escolher por engano.
6. **O nome**, idêntico nos três lugares: arquivo React, *component set* do Figma e esta tabela.

Ordem de preferência, sempre: **usar como está → nova variante → nova prop → componente novo.**
Componente novo é a opção mais cara: é mais um item para manter, auditar e documentar.

### 6.2 O que reprova uma revisão de PR

Cada linha é objetiva e verificável por leitura do diff. Não é questão de gosto.

| Reprova | Por quê | O que fazer |
|---|---|---|
| Valor de cor literal (`#E8542E`, `rgb(232,84,46)`, `text-[#C83A16]`) | Rompe o vínculo com a auditoria de contraste: a cor deixa de estar sob controle | Usar o token semântico |
| Token cru da escala em componente (`coral-600`, `neutral-500`) | Trocar a paleta passa a ser busca-e-substitui em 20 arquivos | Usar `accent-strong`, `border-strong` |
| Tamanho de fonte fora da escala (`text-[15px]`, `font-size: 15px`) | Quebra o ritmo vertical e o alinhamento entre cartões | Escolher o passo existente mais próximo |
| Medida fora da escala de 4 (`p-[13px]`, `gap-[7px]`, `h-[34px]`) | Desalinha com todo o resto sem que ninguém saiba por quê | Usar `space-*`; se faltar um passo, propor o passo |
| Raio literal (`rounded-[14px]`) | Cria uma quarta linguagem de forma além das cinco existentes | Usar `radius-*` |
| Sombra literal ou sombra em cartão de lista | A interface é plana por definição; sombra é só para o que flutua | `border` + troca de `surface` |
| Botão só de ícone sem `aria-label` | RNF-004: controle sem nome acessível é inoperável em leitor de tela | Rotular, ou expor o texto |
| `outline: none` sem substituto visível | RNF-003: navegação por teclado fica cega | Manter a regra global de `:focus-visible` |
| Área clicável abaixo de 44 × 44 | Uso real é em pé, no corredor, com uma mão | Estender com `::before`, sem mudar o desenho |
| Cor como único portador de informação | Critério 1.4.1 e daltonismo | Somar rótulo, ícone ou peso |
| `div` com `onClick` | Perde teclado, foco e papel | `<button>` ou `<a>` |
| Novo par cor-sobre-cor sem linha na tabela de contraste | A auditoria de `identidade-visual.md` deixa de valer | Adicionar a linha, com o número calculado |
| `overflow: hidden` em `TicketCard` ou `QrTicket` | Corta o picote — o elemento de assinatura da marca | `overflow: visible` |
| `--ticket-notch` não ajustado ao fundo real | O recorte aparece na cor errada | Declarar no contêiner que muda o fundo |
| `placeholder` no lugar de `<label>` | Desaparece ao digitar e não é lido com confiança | `<label for>` visível |
| Texto de erro ou de estado fora do tom de voz | "Ops! Algo deu errado" não diz o que fazer | Seguir a tabela de microcópia |
| Componente novo com menos de 3 casos reais | Abstração antes da terceira repetição | Variante no componente existente |

### 6.3 Como mudar um token

Um token vive em três lugares (ver seção 8 de `identidade-visual.md`). Mudança em um só é defeito.
No **mesmo PR**:

1. `identidade-visual.md` — valor, e a linha de contraste recalculada se for cor de texto ou de
   componente.
2. `app/tailwind.config.ts` — o valor que a interface realmente usa.
3. Figma — *variable* com o nome idêntico (`color/coral/500`, `space/4`, `radius/lg`).
4. [`styleguide.html`](styleguide.html) — a prova visual, que é o que o professor abre.

Renomear token é mudança de contrato: exige varredura por todos os consumidores no mesmo PR.
Remover token exige que nenhum consumidor sobre.

---

## 7. Anti-padrões observados no protótipo legado

O protótipo em [`../../prototype/legacy/index.html`](../../prototype/legacy/index.html) — 491
linhas, 5 telas, sem build — é a referência visual do projeto e o motivo de a identidade existir.
Ele também tem defeitos concretos, e o design system existe em grande parte para corrigi-los. A
tabela abaixo é evidência lida no arquivo, não impressão.

| # | O que o protótipo faz | Por que é defeito | Como o design system corrige |
|---|---|---|---|
| 1 | `--text-muted: #767D85` aplicado em texto de 11–13 px (`.post-meta`, `.ticket-meta`, `.list-meta`, `.h-sub`, `.ticket-spots`) | 4,02:1 sobre `#FBFBFA` — **reprova** o mínimo de 4,5:1 do critério 1.4.3 (linha 7 da verificação). É o segundo texto mais frequente da interface: o defeito é sistêmico | `text-muted` passa a ser `neutral-600` `#5C6269` (5,95:1). `#767D85` sobrevive como `text-subtle`, permitido só em texto grande e ícone decorativo |
| 2 | `.btn-create { background: var(--accent) }` com texto branco de 13 px, onde `--accent` é `#E8542E` | 3,66:1 — **reprova** (linha 10). É o botão da ação principal do app | Preenchimento primário em `accent-strong` `coral-600` (5,16:1). `coral-500` continua sendo a cor da marca em texto grande, faixa e símbolo |
| 3 | Zero ocorrências de `focus` ou `outline` nas 491 linhas | Nenhum estado de foco: navegar por teclado é navegar às cegas. Viola RNF-003 | Regra global de `:focus-visible` com anel de 2 px em `accent-strong` e offset de 2 px (4,98:1 — linha 22). `outline: none` sem substituto reprova a revisão |
| 4 | Zero ocorrências de `aria-` | `.avatar-btn`, `.navlink` e os controles de ícone não têm nome acessível. Viola RNF-004 | Cada componente traz o contrato ARIA na sua subseção; variante `icon-only` **exige** `aria-label` |
| 5 | CSS organizado por tela, não por componente: `.ticket`, `.list-ticket`, `.chip`, `.chip.active`, `.ticket-tag`, `.ticket-tag.alt`, `.list-scope` | A mesma ideia — pílula com rótulo curto — virou **três** desenhos diferentes: `.ticket-tag` com `radius 20px`, `.chip` com `radius 20px`, `.list-scope` com `radius 10px`. Cada variante nova é uma classe nova, e nenhuma sabe da outra | `ScopeBadge`, `StatusBadge` e `Chip` com anatomia única, `radius-full` e variantes derivadas do enum do domínio |
| 6 | Medidas fora da escala de 4: `padding: 14px 28px` (topbar), `padding: 9px 18px` (botão), `padding: 7px 14px` (chip), `padding: 13px 16px` (corpo do item), avatares de `34px` e `36px`, `margin-bottom: 18px`, `margin: 28px 0 14px`, larguras de `250px` e `280px`, offset de `-25px` | Nada alinha com nada; cada ajuste é discussão de gosto porque não há referência | Escala `space-*` obrigatória, avatares em 24/32/40/56/96, offset do picote derivado de `calc(space-4 + space-2 + 1px)` |
| 7 | `font-size: 10px` em `.ticket-tag`, `.list-date .mon` e `.list-scope` | Abaixo do mínimo absoluto de 11 px da escala tipográfica. Em tela ao sol, no corredor, é ilegível — que é o cenário das personas | `mono-xs` de 11 px com `letter-spacing +0.10 em`, o passo mínimo, e só em mono maiúsculo curto |
| 8 | `.chip` com ~29 px de altura, `.avatar-btn` com 34 px, `.navlink` com ~30 px | Todos abaixo dos 44 px de área de toque. Erro de toque em lista densa é o defeito mais frequente de app mobile | Altura mínima de 44 px, ou extensão da área por `::before` mantendo o tamanho visual |
| 9 | `.ticket-divider::before/::after { background: var(--bg) }` com `left: -25px` fixo, e `.list-ticket { overflow: hidden }` | O recorte só funciona se o cartão estiver **diretamente** sobre `bg`: dentro de bloco `surface-2` ou de modal ele aparece na cor errada. E o `overflow: hidden` do item de lista cortaria o recorte se o picote fosse aplicado ali. É o elemento de assinatura da marca com dois modos de falha silenciosa | `--ticket-notch` como custom property local, declarada pelo contêiner que muda o fundo; `overflow: visible` obrigatório e verificado na revisão; offsets derivados de token |
| 10 | Nenhum estado de carregamento e nenhum estado vazio — as telas assumem dados presentes | Com dados reais e rede de 4G (RNF-006), a tela pisca, pula e às vezes fica em branco sem explicar nada | `Skeleton` e `EmptyState` como componentes de primeira classe, com variante por cartão e com a mesma geometria do conteúdo real |
| 11 | Navegação por `.screen { display: none }` mais a variável global `lastTab` | Sem URL, sem histórico, sem link compartilhável, sem 404. O evento que o organizador quer divulgar não tem endereço | `TopBar` e `BottomNav` consomem rotas reais do React Router; `aria-current="page"` no destino atual |
| 12 | `.list-title` em Space Grotesk 700 a 14 px | Passo que não existe na escala tipográfica — nem `body-md` (Inter 14) nem `display-sm` (Space Grotesk 16) | `EventListItem` usa `display-sm`. Foi a primeira correção que a escala impôs |
| 13 | Imagens de `unsplash.com` e `pravatar.cc` por URL externa | Estilo visual depende de rede e de terceiro; em apresentação sem internet a identidade desaparece | Capa e avatar gerados localmente (SVG/iniciais). O `styleguide.html` não faz nenhuma requisição além das Google Fonts, e degrada com a pilha de fallback declarada |

O que o protótipo **acertou**, e que o design system preserva sem mudar: a paleta coral + teal +
neutro quente, as três famílias com funções separadas, a densidade sem ilustração, e o
cartão-ingresso picotado como forma recorrente. A evolução é de rigor, não de direção.

---

## 8. Divergências registradas

Duas divergências foram encontradas na produção deste inventário e ficam registradas aqui em vez de
serem silenciadas.

| # | Divergência | Decisão |
|---|---|---|
| 1 | `identidade-visual.md` especifica `BottomNav` com "4 destinos + ação central", e a tabela de rotas do app não tem rota de lista de ingressos | A quarta célula resolve para `/ingresso/:id` da participação confirmada mais próxima e fica `aria-disabled` quando não há nenhuma. Criar `/ingressos` foi recusado: expande a tabela de rotas fora do escopo aprovado |
| 2 | A matriz de `TicketCard` prevê `CURSO` + pago, e o seed canônico não tem evento de curso pago | A célula existe no design system porque a combinação é válida no domínio. No `styleguide.html` ela aparece marcada como demonstração, usando `evt-003` com tratamento de preço. Nenhum evento novo foi inventado |

---

**Ver também:** [`identidade-visual.md`](identidade-visual.md) ·
[`styleguide.html`](styleguide.html) · [`guia-figma.md`](guia-figma.md) ·
[`../02-requisitos.md`](../02-requisitos.md) ·
[`../04-regras-de-negocio.md`](../04-regras-de-negocio.md) ·
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)
