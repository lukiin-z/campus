# Identidade visual

**Responsável:** Ana Luiza Dourado (RM558793) — UX/UI Designer
**Peso na avaliação do CP4:** 20% — *"logo, cores, tipografia, coerência com o público-alvo"*

**Provas visuais:** [`styleguide.html`](styleguide.html) (abra no navegador — renderiza a
marca inteira) · [`assets/`](assets) (SVGs) · [`guia-figma.md`](guia-figma.md) (arquivo do
Figma) · [`design-system.md`](design-system.md) (componentes)

---

## 1. Racional da marca

### O nome

**Campus** é o lugar físico onde tudo isso acontece. O nome foi escolhido por três razões
concretas:

1. **É a palavra que o próprio público usa.** "Vai ter festa no campus", "te encontro no
   campus". Nome que já está na boca do usuário não precisa ser ensinado.
2. **Delimita o escopo sem adjetivo.** Campus não é uma plataforma de eventos genérica —
   o nome já exclui evento comercial aberto, que é exatamente o antipersona declarado em
   [`../01-problema-e-personas.md`](../01-problema-e-personas.md).
3. **Funciona em português sem soar traduzido.** Palavra latina incorporada ao português,
   sem cacófato, sem plural problemático, com grafia idêntica em inglês e espanhol — o que
   sobrevive a uma expansão futura.

O que o nome **não** faz: não promete festa (o app também serve palestra e hackathon), não
tem sufixo de startup (`-ly`, `-ify`, `-hub`), e não usa "uni", "acad" ou "estuda", que
soariam institucionais — o oposto do tom.

### O conceito do símbolo

O elemento de assinatura da marca é o **cartão-ingresso picotado**: borda com dois recortes
circulares laterais, como um ingresso destacável de cinema ou de show.

O símbolo é a síntese disso: um **ingresso com a inicial "C" vazada**. Um único traço
geométrico faz três coisas ao mesmo tempo:

| Leitura | O que comunica |
|---|---|
| **Ingresso** (retângulo com recortes laterais) | Este app é sobre entrar em algo: reservar vaga, ter ingresso, passar na porta |
| **Letra "C"** (recorte interno) | A inicial de Campus, sem precisar do wordmark. Funciona sozinha em 16px |
| **Recorte / picote** | Metáfora do *destaque*: o pedaço que você leva, o registro de que você estava lá |

O "C" é **negativo**, não positivo. Isso é deliberado: o vazado obriga a leitura da forma
externa (o ingresso) antes da letra, colocando a função à frente da inicial. É também o que
permite a versão monocromática funcionar sem perder a letra.

Construção geométrica, sem nenhuma curva desenhada à mão:

```
Grade 24 × 24
Ingresso    : retângulo x 2→22, y 4→20, cantos r = 3,5
Recortes    : dois arcos concavos r = 2,2 no meio da altura (y = 12)
"C" vazado  : anel centrado em (12,12), raio externo 5,0 e interno 2,4,
              com abertura de 100° voltada para a direita
```

Um `path` único com `fill-rule="evenodd"`: sem máscara, sem `clipPath`, sem filtro, sem
gradiente. Consequência prática: 12 linhas de SVG, renderiza igual em qualquer navegador,
sobrevive a conversão para PNG, e funciona em bordado e serigrafia de uma cor.

### Por que essa direção fala com universitário de 18 a 25 anos

| Decisão | Por que funciona para esse público |
|---|---|
| **Fundo quase branco quente (`#FBFBFA`)**, não branco puro e não escuro | Este público vive em interfaces escuras e saturadas. Um fundo claro e levemente quente lê como "editorial", "produto bem-feito" — e destaca a foto do evento, que é o conteúdo que importa |
| **Coral (`#E8542E`) como único acento de ação** | Cor de energia sem ser infantil. Não é o roxo de fintech, não é o azul de sistema institucional, não é o degradê de rede social. Usado com parcimônia, cria hierarquia forte com uma cor só |
| **Verde-azulado (`#0F7A6E`) como segundo acento** | Serve para diferenciar alcance (curso) sem inventar uma terceira cor. Complementar do coral no círculo cromático: distinguível até por quem tem deuteranopia |
| **Space Grotesk nos títulos** | Geométrica com detalhes idiossincráticos (o `a`, o `G`). Lê como design contemporâneo, não como fonte de sistema. É o que separa "app de faculdade" de "produto" |
| **JetBrains Mono em datas, tags e códigos** | Monoespaçada dá ar técnico e organizado justamente onde a informação é objetiva (13h, 18/40 vagas, R$ 25). Também alinha números em coluna, o que a barra de vagas e a lista exigem |
| **Cartão-ingresso como forma recorrente** | O picote é imediatamente reconhecível e tem carga afetiva: ingresso guardado é lembrança. Casa com o valor "memória do evento" |
| **Densidade alta, sem ilustração decorativa** | Uso real é em pé, no corredor, com 20 segundos. Ilustração ocupa a tela sem informar. O que decora aqui é a foto do evento |

O que foi **recusado**, e por quê:

- **Degradê e vidro fosco** — datam o produto em um ano específico e prejudicam o contraste.
- **Modo escuro na v1** — dobra o custo de manter os tokens e a auditoria de contraste, sem
  resolver nenhuma dor levantada nas personas. Fica como item de CP6.
- **Ilustração de personagem** — cria expectativa de uma linguagem gráfica que o grupo não
  tem capacidade de manter em escala.
- **Emoji na interface** — inconsistente entre plataformas e ruidoso em lista densa.

---

## 2. Logo

### Variações e quando usar cada uma

| Arquivo | Composição | Quando usar | Tamanho mínimo |
|---|---|---|---|
| [`assets/logo.svg`](assets/logo.svg) | Símbolo + wordmark, horizontal | Uso primário: barra superior do app, README, capa de documento | 112 px de largura |
| [`assets/logo-simbolo.svg`](assets/logo-simbolo.svg) | Só o símbolo | Espaço reduzido: ícone de app, avatar de perfil oficial, marca d'água | 16 px |
| [`assets/logo-horizontal.svg`](assets/logo-horizontal.svg) | Símbolo + wordmark + divisória + descritor "eventos universitários" | Cabeçalho de documento, rodapé de slide, faixa larga | 200 px de largura |
| [`assets/logo-mono.svg`](assets/logo-mono.svg) | Uma cor, via `currentColor` | Fundo colorido, sobre foto, impressão em uma tinta, carimbo | 112 px de largura |
| [`assets/favicon.svg`](assets/favicon.svg) | Símbolo invertido sobre placa coral, cantos r = 7 | Aba do navegador, atalho na tela inicial | 16 px |
| [`assets/og-image.svg`](assets/og-image.svg) | 1200 × 630, marca + chamada + cartão-ingresso | Compartilhamento em link (Open Graph, Teams, WhatsApp) | fixo |

### Área de proteção e tamanho mínimo

- **Área de proteção:** distância igual à **altura do símbolo dividida por 2** (8 unidades
  no `viewBox` de 40) em todos os lados. Nenhum outro elemento entra nessa margem.
- **Tamanho mínimo do símbolo:** 16 px. Abaixo disso, os recortes laterais somem e o
  símbolo lê como um retângulo qualquer.
- **Tamanho mínimo do lockup:** 112 px de largura. Abaixo, o wordmark fica ilegível — use
  só o símbolo.

### Sobre o wordmark e a fonte

O wordmark declara a família com **pilha de fallback segura**:

```
font-family="'Space Grotesk','Segoe UI','Helvetica Neue',Arial,sans-serif"
font-weight="700"  font-size="21"  letter-spacing="-0.5"
```

Isso é deliberado: um SVG que referencia fonte externa sem fallback quebra em qualquer
ambiente sem a fonte instalada — e-mail, PDF, máquina de terceiro. Com a pilha declarada, o
logo degrada para uma geométrica próxima em vez de sumir. A versão com o wordmark **em
curvas** vive no arquivo do Figma ([`guia-figma.md`](guia-figma.md)), para impressão e para
casos em que a forma precisa ser idêntica.

`logo-mono.svg` usa `currentColor`: quem insere define a cor. Inline no HTML basta
`color: #FFFFFF` no contêiner; via `<img>` ou `<object>`, o `currentColor` **não** herda do
documento e cai no padrão `#14181C` — então nesses casos use `logo.svg` ou edite o atributo
`color` do arquivo.

### Usos incorretos

| Não faça | Por quê |
|---|---|
| Recolorir o símbolo fora da paleta (roxo, azul, degradê) | O coral é o único identificador cromático da marca |
| Aplicar sombra, contorno, brilho ou bisel | O símbolo é chapado por definição; efeito destrói o corte geométrico |
| Distorcer proporção (esticar, achatar) | Os arcos deixam de ser circulares e o "C" perde a leitura |
| Rotacionar | O picote lateral só lê como ingresso na horizontal |
| Preencher o "C" vazado | A forma vazada **é** o conceito |
| Colocar o lockup colorido sobre fundo escuro ou sobre foto | Use `logo-mono.svg` com a cor definida |
| Redesenhar o wordmark em outra fonte | Space Grotesk 700 com `letter-spacing -0.5` é parte da marca |
| Usar o símbolo abaixo de 16 px | Os recortes desaparecem |
| Adicionar o nome da faculdade dentro do lockup | Co-marca vai **ao lado**, separada pela área de proteção |
| Encaixotar o logo em um quadrado colorido que não seja o favicon | Cria uma segunda marca |

---

## 3. Paleta

Três escalas de 10 passos: **coral** (ação), **teal** (segundo acento) e **neutral** (texto
e superfícies). Nada fora dessas 30 cores entra na interface.

Cada escala é ancorada no passo **500** com a cor exata do protótipo original, e os demais
passos são derivados por variação de luminosidade em HSL, mantendo o matiz. A escala do teal
é mais escura em toda a extensão porque o teal da marca (`#0F7A6E`, L = 27%) é um tom
profundo: forçá-lo em um passo claro tornaria a rampa não monotônica.

#### Coral — ação, destaque, marca

| Token | HEX | RGB | HSL | vs `#FFFFFF` | vs `#14181C` |
|---|---|---|---|---|---|
| `coral-50` | `#FAF4F2` | 250, 244, 242 | 15, 44%, 96% | 1.09:1 | 16.38:1 |
| `coral-100` | `#F7E6E1` | 247, 230, 225 | 14, 58%, 93% | 1.21:1 | 14.75:1 |
| `coral-200` | `#F3CBC1` | 243, 203, 193 | 12, 68%, 85% | 1.49:1 | 12.00:1 |
| `coral-300` | `#F0A693` | 240, 166, 147 | 12, 76%, 76% | 1.98:1 | 8.99:1 |
| `coral-400` | `#EE7D60` | 238, 125, 96 | 12, 81%, 65% | 2.71:1 | 6.57:1 |
| **`coral-500`** | **`#E8542E`** | 232, 84, 46 | 12, 80%, 55% | 3.66:1 | 4.88:1 |
| `coral-600` | `#C83A16` | 200, 58, 22 | 12, 80%, 44% | 5.16:1 | 3.46:1 |
| `coral-700` | `#9B2E13` | 155, 46, 19 | 12, 78%, 34% | 7.52:1 | 2.37:1 |
| `coral-800` | `#6F2411` | 111, 36, 17 | 12, 73%, 25% | 10.85:1 | 1.64:1 |
| `coral-900` | `#491A0E` | 73, 26, 14 | 12, 68%, 17% | 14.61:1 | 1.22:1 |

#### Teal — segundo acento, alcance de curso, confirmação

| Token | HEX | RGB | HSL | vs `#FFFFFF` | vs `#14181C` |
|---|---|---|---|---|---|
| `teal-50` | `#F2F8F7` | 242, 248, 247 | 170, 30%, 96% | 1.07:1 | 16.60:1 |
| `teal-100` | `#DEEFED` | 222, 239, 237 | 173, 35%, 90% | 1.19:1 | 15.02:1 |
| `teal-200` | `#BDE5E0` | 189, 229, 224 | 172, 43%, 82% | 1.36:1 | 13.12:1 |
| `teal-300` | `#82D9CF` | 130, 217, 207 | 173, 53%, 68% | 1.64:1 | 10.85:1 |
| `teal-400` | `#27BFAE` | 39, 191, 174 | 173, 66%, 45% | 2.30:1 | 7.77:1 |
| **`teal-500`** | **`#0F7A6E`** | 15, 122, 110 | 173, 78%, 27% | 5.21:1 | 3.42:1 |
| `teal-600` | `#0C6258` | 12, 98, 88 | 173, 78%, 22% | 7.23:1 | 2.47:1 |
| `teal-700` | `#094D46` | 9, 77, 70 | 174, 79%, 17% | 9.72:1 | 1.84:1 |
| `teal-800` | `#093A34` | 9, 58, 52 | 173, 73%, 13% | 12.60:1 | 1.42:1 |
| `teal-900` | `#072723` | 7, 39, 35 | 172, 70%, 9% | 15.87:1 | 1.12:1 |

#### Neutral — texto, superfícies, bordas

Escala **quente** nos claros (matiz 33–60°, herdado do `#FBFBFA` e do `#E7E5E0` do
protótipo) e **fria** nos escuros (matiz 210–213°, herdado do `#14181C`). A virada acontece
no passo 500. Não é acidente: neutros quentes deixam a superfície acolhedora, e neutros
frios no texto aumentam a legibilidade percebida.

| Token | HEX | RGB | HSL | vs `#FFFFFF` | vs `#14181C` |
|---|---|---|---|---|---|
| `neutral-50` | `#FBFBFA` | 251, 251, 250 | 60, 11%, 98% | 1.04:1 | 17.23:1 |
| `neutral-100` | `#F2F1EE` | 242, 241, 238 | 45, 13%, 94% | 1.13:1 | 15.79:1 |
| `neutral-200` | `#E7E5E0` | 231, 229, 224 | 43, 13%, 89% | 1.26:1 | 14.17:1 |
| `neutral-300` | `#D6D3CC` | 214, 211, 204 | 42, 11%, 82% | 1.49:1 | 11.93:1 |
| `neutral-400` | `#A9A5A0` | 169, 165, 160 | 33, 5%, 65% | 2.45:1 | 7.29:1 |
| `neutral-500` | `#767D85` | 118, 125, 133 | 212, 6%, 49% | 4.16:1 | 4.28:1 |
| `neutral-600` | `#5C6269` | 92, 98, 105 | 212, 7%, 39% | 6.17:1 | 2.89:1 |
| `neutral-700` | `#43484E` | 67, 72, 78 | 213, 8%, 28% | 9.23:1 | 1.93:1 |
| `neutral-800` | `#2A2E33` | 42, 46, 51 | 213, 10%, 18% | 13.66:1 | 1.31:1 |
| `neutral-900` | `#14181C` | 20, 24, 28 | 210, 17%, 9% | 17.84:1 | 1.00:1 |

### Tokens semânticos

Componente **nunca** referencia `coral-600` diretamente: referencia `accent-strong`. Assim
uma decisão de paleta muda em um lugar.

| Token semântico | Valor | Uso |
|---|---|---|
| `bg` | `neutral-50` `#FBFBFA` | Fundo da tela |
| `surface` | `#FFFFFF` | Cartão, ingresso, campo de formulário |
| `surface-2` | `neutral-100` `#F2F1EE` | Fundo de bloco secundário, coluna de data, trilha de progresso |
| `border` | `neutral-200` `#E7E5E0` | Borda de cartão e divisória (decorativa) |
| `border-strong` | `neutral-500` `#767D85` | Borda de campo de formulário — precisa de 3:1 (WCAG 1.4.11) |
| `text` | `neutral-900` `#14181C` | Texto principal |
| `text-muted` | `neutral-600` `#5C6269` | Texto secundário — **corrigido** em relação ao protótipo (ver seção 4) |
| `text-subtle` | `neutral-500` `#767D85` | Texto ≥ 18,66 px bold ou ≥ 24 px, e ícone decorativo |
| `text-disabled` | `neutral-400` `#A9A5A0` | Estado desabilitado (isento de contraste pela WCAG 1.4.3) |
| `accent` | `coral-500` `#E8542E` | Marca, gráfico, texto grande, faixa |
| `accent-strong` | `coral-600` `#C83A16` | Preenchimento de botão primário, anel de foco, texto de destaque pequeno |
| `accent-hover` | `coral-700` `#9B2E13` | Hover e active do botão primário |
| `accent-soft` | `coral-100` `#F7E6E1` | Fundo de badge de alcance "turma" |
| `accent-2` | `teal-500` `#0F7A6E` | Segundo acento: alcance "curso", confirmação, aba ativa do perfil |
| `accent-2-hover` | `teal-600` `#0C6258` | Hover do secundário |
| `accent-2-soft` | `teal-100` `#DEEFED` | Fundo de badge de alcance "curso" |
| `danger` | `coral-800` `#6F2411` | Ação destrutiva (cancelar evento, remover publicação) |

**Não existe token de sucesso verde nem de aviso amarelo.** Sucesso usa `accent-2` e o texto
diz o que aconteceu; aviso usa `accent-strong`. Duas cores fazem o trabalho de cinco, e cada
cor nova é mais uma auditoria de contraste para manter.

### Uso permitido e proibido

| Permitido | Proibido |
|---|---|
| Coral em **uma** ação primária por tela | Coral em duas ações concorrentes na mesma tela — a hierarquia desaparece |
| `accent-strong` como preenchimento com texto branco | `coral-500` com texto branco pequeno (3.66:1, reprova AA) |
| `accent` em texto ≥ 24 px, faixa ou gráfico | `accent` em texto corrido de 13–14 px |
| Teal para diferenciar alcance de curso e confirmação | Teal como ação primária — só o coral é ação |
| `teal-300`/`teal-400` em gráfico e ilustração | `teal-400` como fundo de texto branco (2.30:1) |
| Neutros quentes (50–300) em superfície | Neutro quente em texto — use 600+ |
| Coral e teal na mesma tela, com funções distintas | Coral e teal adjacentes em blocos grandes: vibram |

---

## 4. Verificação de contraste (WCAG 2.1 AA)

Razões calculadas pela fórmula oficial da WCAG — luminância relativa
`L = 0,2126·R + 0,7152·G + 0,0722·B` com linearização sRGB, contraste
`(L_claro + 0,05) / (L_escuro + 0,05)`. Critérios: **1.4.3** exige 4,5:1 para texto normal
e 3:1 para texto grande (≥ 18,66 px bold ou ≥ 24 px); **1.4.11** exige 3:1 para componentes
de interface e elementos gráficos essenciais.

| # | Uso | Frente | Fundo | Contraste | Mínimo WCAG | Resultado |
|---|---|---|---|---|---|---|
| 1 | Texto principal 14px sobre fundo da tela | `#14181C` | `#FBFBFA` | **17.23:1** | 4,5:1 (1.4.3) | **AAA** |
| 2 | Texto principal 14px em cartão | `#14181C` | `#FFFFFF` | **17.84:1** | 4,5:1 (1.4.3) | **AAA** |
| 3 | Texto principal 14px sobre surface-2 | `#14181C` | `#F2F1EE` | **15.79:1** | 4,5:1 (1.4.3) | **AAA** |
| 4 | Texto secundário 13px sobre fundo (corrigido, `neutral-600`) | `#5C6269` | `#FBFBFA` | **5.95:1** | 4,5:1 (1.4.3) | **AA** |
| 5 | Texto secundário 13px em cartão (corrigido) | `#5C6269` | `#FFFFFF` | **6.17:1** | 4,5:1 (1.4.3) | **AA** |
| 6 | Texto secundário 13px sobre surface-2 (corrigido) | `#5C6269` | `#F2F1EE` | **5.46:1** | 4,5:1 (1.4.3) | **AA** |
| 7 | Texto secundário com o valor **original do protótipo** (`neutral-500`) | `#767D85` | `#FBFBFA` | **4.02:1** | 4,5:1 (1.4.3) | **REPROVA** |
| 8 | Botão primário: branco sobre `coral-600` | `#FFFFFF` | `#C83A16` | **5.16:1** | 4,5:1 (1.4.3) | **AA** |
| 9 | Botão primário em hover: branco sobre `coral-700` | `#FFFFFF` | `#9B2E13` | **7.52:1** | 4,5:1 (1.4.3) | **AAA** |
| 10 | Botão primário com o **coral original** (`coral-500`) | `#FFFFFF` | `#E8542E` | **3.66:1** | 4,5:1 (1.4.3) | **REPROVA** |
| 11 | Chip de filtro ativo: branco sobre `neutral-900` | `#FFFFFF` | `#14181C` | **17.84:1** | 4,5:1 (1.4.3) | **AAA** |
| 12 | Badge de alcance turma: `coral-700` sobre `coral-100` | `#9B2E13` | `#F7E6E1` | **6.21:1** | 4,5:1 (1.4.3) | **AA** |
| 13 | Badge de alcance curso: `teal-600` sobre `teal-100` | `#0C6258` | `#DEEFED` | **6.09:1** | 4,5:1 (1.4.3) | **AA** |
| 14 | Badge de alcance faculdade: `neutral-700` sobre `neutral-200` | `#43484E` | `#E7E5E0` | **7.33:1** | 4,5:1 (1.4.3) | **AAA** |
| 15 | Botão secundário preenchido: branco sobre `teal-500` | `#FFFFFF` | `#0F7A6E` | **5.21:1** | 4,5:1 (1.4.3) | **AA** |
| 16 | Preço em destaque: `coral-600` em cartão | `#C83A16` | `#FFFFFF` | **5.16:1** | 4,5:1 (1.4.3) | **AA** |
| 17 | Eyebrow mono 11px: `coral-600` sobre fundo | `#C83A16` | `#FBFBFA` | **4.98:1** | 4,5:1 (1.4.3) | **AA** |
| 18 | Ação textual: `coral-700` sobre surface-2 | `#9B2E13` | `#F2F1EE` | **6.65:1** | 4,5:1 (1.4.3) | **AA** |
| 19 | Título display 28px: `neutral-900` sobre fundo | `#14181C` | `#FBFBFA` | **17.23:1** | 3:1 (texto grande) | **AA** |
| 20 | Número do dia 20px bold: `coral-600` sobre surface-2 | `#C83A16` | `#F2F1EE` | **4.57:1** | 3:1 (texto grande) | **AA** |
| 21 | Estado destrutivo: branco sobre `coral-800` | `#FFFFFF` | `#6F2411` | **10.85:1** | 4,5:1 (1.4.3) | **AAA** |
| 22 | Anel de foco: `coral-600` sobre fundo da tela | `#C83A16` | `#FBFBFA` | **4.98:1** | 3:1 (1.4.11) | **AA** |
| 23 | Borda de campo de formulário: `neutral-500` sobre cartão | `#767D85` | `#FFFFFF` | **4.16:1** | 3:1 (1.4.11) | **AA** |
| 24 | Barra de vagas preenchida: `coral-600` sobre trilha `neutral-200` | `#C83A16` | `#E7E5E0` | **4.10:1** | 3:1 (1.4.11) | **AA** |
| 25 | Ícone informativo: `neutral-600` sobre fundo | `#5C6269` | `#FBFBFA` | **5.95:1** | 3:1 (1.4.11) | **AA** |
| 26 | Borda de cartão: `neutral-200` sobre fundo | `#E7E5E0` | `#FBFBFA` | **1.22:1** | — decorativo | isento |
| 27 | Divisória tracejada do ingresso: `neutral-300` sobre cartão | `#D6D3CC` | `#FFFFFF` | **1.49:1** | — decorativo | isento |
| 28 | Texto de estado desabilitado: `neutral-400` sobre fundo | `#A9A5A0` | `#FBFBFA` | **2.36:1** | — desabilitado | isento |

### Duas correções que a auditoria obrigou

A auditoria encontrou **dois** valores herdados do protótipo que reprovam em AA. Os dois
foram corrigidos, e o registro fica aqui porque essa é a diferença entre "temos uma paleta
bonita" e "temos uma paleta verificada".

**Correção 1 — texto secundário.** O protótipo usa `#767D85` para texto de 11–13 px (metas
de evento, legendas, contadores). Sobre o fundo `#FBFBFA` isso dá **4,02:1**: reprova o
mínimo de 4,5:1 do critério 1.4.3. Como esse é o segundo texto mais frequente da interface,
manter seria um defeito sistêmico.

- `text-muted` passa a ser `neutral-600` `#5C6269` → **5,95:1** (AA).
- `#767D85` continua na paleta como `text-subtle`, permitido apenas em texto grande
  (≥ 18,66 px bold ou ≥ 24 px) e em ícone decorativo — onde o mínimo é 3:1.

Custo visual: o cinza fica ~15% mais escuro. Ganho: o texto secundário passa a ser legível
por quem tem visão reduzida, em tela ao sol, no corredor — que é o cenário de uso real
descrito nas personas.

**Correção 2 — preenchimento do botão primário.** O protótipo preenche o botão com
`#E8542E` e texto branco de 13 px: **3,66:1**, reprova. A correção é usar `coral-600`
`#C83A16` (**5,16:1**) como `accent-strong`.

O `coral-500` original **permanece** como a cor da marca (`accent`) e é usado em texto
grande, faixa, gráfico e no símbolo — onde o mínimo é 3:1 e ele passa. Na prática, o botão
fica um passo mais escuro; o coral da marca não muda.

### Verificação por deficiência de visão de cores

O par coral (matiz 12°) e teal (matiz 173°) foi escolhido também por sobreviver às três
formas mais comuns de daltonismo. Mas a defesa real do produto não é a cor:

> **Nenhuma informação do Campus é transmitida apenas por cor.** Alcance tem badge **com
> texto** ("minha turma", "meu curso", "faculdade"), não só cor de fundo. Estado de
> participação tem rótulo ("confirmado", "lista de espera"), não só cor. A barra de vagas
> traz o número ("18/40"), não só a barra. Isso atende ao critério **1.4.1 (Uso de cor)** e
> é o que faz a interface funcionar em impressão em preto e branco.

---

## 5. Tipografia

Três famílias, cada uma com um trabalho exclusivo. Nenhuma sobreposição de função.

| Família | Papel | Pesos | Onde |
|---|---|---|---|
| **Space Grotesk** | Display e títulos | 500, 700 | Título de tela, título de evento, número em destaque, rótulo de botão primário |
| **Inter** | Corpo e interface | 400, 500, 600 | Parágrafo, descrição, rótulo de campo, texto de lista, corpo de botão |
| **JetBrains Mono** | Dados | 400, 500 | Data, hora, preço, contador de vagas, código de turma, tag, eyebrow, código de ingresso |

Fallbacks declarados (a fonte pode não carregar — e o layout não pode quebrar por isso):

```css
--font-display: 'Space Grotesk', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
--font-body:    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-mono:    'JetBrains Mono', 'Cascadia Mono', Consolas, 'Courier New', monospace;
```

### Escala tipográfica

| Token | Tamanho | Line-height | Letter-spacing | Peso | Família | Uso |
|---|---|---|---|---|---|---|
| `mono-xs` | 11 px | 1.3 (14 px) | +0.10 em | 500 | Mono | Eyebrow, tag de alcance, código |
| `mono-sm` | 12 px | 1.4 (17 px) | +0.04 em | 400 | Mono | Data, contador de vagas, meta |
| `body-xs` | 12 px | 1.5 (18 px) | 0 | 400 | Inter | Rótulo auxiliar, nota de rodapé |
| `body-sm` | 13 px | 1.5 (20 px) | 0 | 400 | Inter | Meta de evento, legenda, texto de lista |
| `body-md` | 14 px | 1.6 (22 px) | 0 | 400 | Inter | Corpo padrão, descrição de evento |
| `body-md-strong` | 14 px | 1.6 (22 px) | 0 | 600 | Inter | Ênfase em corpo, nome de autor |
| `display-sm` | 16 px | 1.3 (21 px) | −0.01 em | 700 | Space Grotesk | Título de seção, rótulo de botão |
| `display-md` | 20 px | 1.25 (25 px) | −0.01 em | 700 | Space Grotesk | Nome no perfil, número de destaque |
| `display-lg` | 24 px | 1.2 (29 px) | −0.02 em | 700 | Space Grotesk | Título do detalhe do evento |
| `display-xl` | 28 px | 1.1 (31 px) | −0.02 em | 700 | Space Grotesk | Título de tela ("Eventos", "Bom dia, Marina") |
| `display-2xl` | 36 px | 1.05 (38 px) | −0.03 em | 700 | Space Grotesk | Capa, styleguide, apresentação (não usado no app) |

Regras da escala:

1. **Nunca use tamanho fora da escala.** `text-[15px]` em componente é revisão reprovada.
2. **`letter-spacing` negativo apenas no display.** Título geométrico grande fecha melhor;
   corpo com tracking negativo perde legibilidade.
3. **`letter-spacing` positivo apenas no mono de 11–12 px.** Monoespaçada pequena precisa de
   ar para não empastar.
4. **Line-height cresce quando o tamanho diminui.** 1.6 em 14 px, 1.05 em 36 px.
5. **Mínimo absoluto: 11 px, e só em mono maiúsculo curto.** Não existe corpo abaixo de 12 px.

### Quando usar cada família — o teste de decisão

| A informação é… | Família | Exemplo |
|---|---|---|
| …um **nome** ou um **título**? | Space Grotesk | "Churrasco de encerramento" |
| …uma **frase** para ler? | Inter | "48 horas de imersão em desenvolvimento…" |
| …um **dado** para conferir? | JetBrains Mono | "Sáb, 12 set · 13h", "18/40 vagas", "R$ 25,00" |

O terceiro caso é o que dá personalidade ao produto: números em monoespaçada alinham em
coluna, lêem como painel e reforçam a sensação de controle — que é exatamente o que o
organizador não tem hoje na planilha.

---

## 6. Espaçamento, raios, sombras e grade

### Escala de espaçamento (base 4 px)

| Token | Valor | Uso típico |
|---|---|---|
| `space-1` | 4 px | Distância entre rótulo e valor |
| `space-2` | 8 px | Gap entre chips, entre ícone e texto |
| `space-3` | 12 px | Padding interno de item de lista |
| `space-4` | 16 px | Padding de cartão, gap entre cartões |
| `space-5` | 20 px | Padding lateral da tela (mobile) |
| `space-6` | 24 px | Gap entre blocos relacionados |
| `space-8` | 32 px | Gap entre seções |
| `space-10` | 40 px | Respiro antes de ação principal |
| `space-12` | 48 px | Topo de tela, fim de conteúdo |
| `space-16` | 64 px | Estado vazio, respiro de capa |

Toda medida da interface é múltiplo de 4. Consequência prática: elementos alinham entre si
sem ajuste manual, e a revisão de layout deixa de ser discussão de gosto.

### Raios de borda

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8 px | Chip pequeno, tag, badge quadrado |
| `radius-md` | 12 px | Campo de formulário, bloco de estatística |
| `radius-lg` | 16 px | Cartão, ingresso, publicação do feed |
| `radius-xl` | 20 px | Capa de evento, modal |
| `radius-full` | 999 px | Chip de filtro, badge de alcance, avatar, botão pílula |

### Sombras

A interface é **plana por padrão**: separação vem de borda (`border`) e de superfície
(`surface` sobre `bg`), não de sombra. Sombra é reservada ao que **flutua de verdade**.

| Token | Valor | Uso |
|---|---|---|
| `shadow-none` | — | Cartão, ingresso, lista — o padrão |
| `shadow-sm` | `0 1px 2px rgba(20,24,28,.05)` | Barra superior fixa quando a página rola |
| `shadow-md` | `0 4px 12px rgba(20,24,28,.08)` | Toast, menu suspenso |
| `shadow-lg` | `0 12px 32px rgba(20,24,28,.12)` | Modal, folha inferior |

A cor da sombra é o `neutral-900` com alfa — nunca preto puro. Preto puro sobre fundo quente
cria uma borda acinzentada suja.

### Grade e largura de conteúdo

| Contexto | Regra |
|---|---|
| Mobile (alvo primário) | Coluna única, padding lateral de 20 px, largura fluida |
| Largura máxima de conteúdo | 640 px, centralizado. O app é mobile; no desktop ele é uma coluna centralizada, não um layout de painel |
| Barra superior | Fixa, altura 56 px, fundo `bg` com 90% de opacidade e `backdrop-filter: blur(10px)` |
| Navegação inferior (mobile) | Fixa, altura 64 px, 4 destinos + ação central |
| Área de toque mínima | 44 × 44 px em qualquer controle — inclusive chips, que recebem padding para atingir isso |
| Rolagem horizontal | Permitida **apenas** em faixa de ingressos e em filtros por chip. O corpo da página nunca rola na horizontal (RNF-018) |
| Breakpoints | 320 (mínimo suportado), 390 (referência de projeto), 768 (tablet), 1024+ (desktop centralizado) |

---

## 7. Tom de voz

O Campus fala como **um veterano organizado explicando algo a um calouro**: direto,
prestativo, sem formalidade institucional e sem gíria forçada.

| Princípio | Faça | Não faça |
|---|---|---|
| **Direto ao ponto** | "18/40 vagas" | "Ainda restam algumas vagas disponíveis!" |
| **Diga o que aconteceu e o que fazer** | "Pagamento não identificado. Você tem 42 min para pagar." | "Ops! Algo deu errado 😕" |
| **Sem euforia artificial** | "Inscrição confirmada." | "Uhuuul! Você conseguiu!!! 🎉🎉" |
| **Segunda pessoa, verbo no presente** | "Você é o 8º da fila." | "O usuário encontra-se na posição 8." |
| **Número em vez de adjetivo** | "Encerra em 2 dias" | "Corre, tá acabando!" |
| **Erro sem culpar quem leu** | "Use seu e-mail institucional (@fiap.com.br)." | "E-mail inválido." |
| **Sem jargão de sistema** | "Este ingresso já foi usado às 20h14." | "Erro 409: conflito de estado." |
| **Português do Brasil, sem anglicismo evitável** | "lista de espera", "ingresso", "publicação" | "waitlist", "ticket", "post" |

### Microcópia de referência

| Situação | Texto |
|---|---|
| Botão de inscrição, evento gratuito | **Quero participar** |
| Botão de inscrição, evento pago | **Quero participar · R$ 25** |
| Evento lotado | **Entrar na lista de espera** · abaixo: "7 pessoas na fila" |
| Posição na fila | **Você é o 8º da fila.** Se abrir vaga, você tem 24 h para confirmar. |
| Vaga oferecida | **Abriu uma vaga para você.** Confirme até quinta, 19h. |
| Aguardando Pix | **Aguardando pagamento.** Confirmamos automaticamente quando o Pix cair. |
| Prazo encerrado | **Inscrições encerradas** em 10 de setembro. |
| Evento cancelado | **Evento cancelado pelo organizador.** Motivo: chuva prevista. Seu pagamento será devolvido integralmente. |
| Check-in aceito | **Marina Alves · confirmado** às 20h14 |
| Check-in recusado, já usado | **Ingresso já utilizado** às 20h14. |
| Estado vazio do feed | **Nada por aqui ainda.** Quando alguém da sua turma publicar, aparece aqui. |
| Estado vazio de eventos | **Nenhum evento no seu alcance.** Que tal criar o primeiro? |
| Erro de domínio de e-mail | **Use seu e-mail institucional.** O Campus só aceita e-mail da faculdade. |

---

## 8. Onde os tokens vivem, e como não divergem

Os mesmos tokens existem em três lugares. Divergência entre eles é defeito.

| Lugar | Forma | Fonte de verdade |
|---|---|---|
| Documentação | Este arquivo | Referência humana |
| Código | `app/tailwind.config.ts` | O que a interface realmente usa |
| Design | Variables e styles do arquivo Figma | O que o time desenha |

**A regra que amarra os três:** o nome do *style* / *variable* no Figma é **idêntico** ao
nome do token no Tailwind — `color/coral/500`, `text/display/lg`, `space/4`,
`radius/lg`. Ver o mapa completo em [`guia-figma.md`](guia-figma.md).

Mudar um token exige atualizar os três no mesmo PR, e a prova visual é
[`styleguide.html`](styleguide.html), que renderiza a marca inteira em uma página
autossuficiente e pode ser aberta direto no navegador.
