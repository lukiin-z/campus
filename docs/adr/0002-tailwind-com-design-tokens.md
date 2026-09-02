# ADR-0002 — Tailwind CSS com os design tokens no `tailwind.config.ts`

- **Status:** Aceita
- **Data:** 2026-08-21
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Ana Luiza Dourado (UX/UI Designer), Vitor Pantarotto (Scrum Master / QA)
- **Requisitos afetados:** RNF-002, RNF-007, RNF-017, RNF-018, RF-016 e todas as RFs com tela

## Contexto

**Identidade visual e marca valem 20% da nota do CP4** — o mesmo peso da modelagem UML. E o
modo clássico de perder esses 20% não é desenhar mal: é o arquivo do Figma e o código
divergirem até que ninguém saiba mais qual é a verdade. Já vimos o padrão: o coral do botão
primário no Figma é `#E8542E`, alguém escreve `#E85430` no código porque copiou de um print,
e a partir daí existem duas marcas.

O projeto tem uma pilha de restrições que agrava isso:

- **Seis pessoas em papéis acumulados**, e mais de uma escreve JSX. A designer
  (Ana Luiza Dourado) não é a mesma pessoa que implementa a maioria das telas.
- **Oito telas** e um conjunto de aproximadamente doze componentes de UI, incluindo o
  elemento de assinatura da marca — o **cartão-ingresso picotado** (borda tracejada com
  recortes circulares laterais), que não existe em nenhuma biblioteca pronta.
- **RNF-002** exige contraste AA em *toda* combinação texto/fundo. A tabela de contraste
  está calculada em [`../06-marca/identidade-visual.md`](../06-marca/identidade-visual.md)
  para os pares de tokens — se alguém usa uma cor fora da paleta, a tabela deixa de provar
  qualquer coisa.
- **RNF-007** limita o bundle inicial a 250 KB gzip, o que exclui soluções com custo de CSS
  em tempo de execução.
- **RNF-017** exige `npm run lint` sem erro **nem aviso** como job obrigatório de CI. Ou
  seja: existe um lugar onde uma regra automática pode barrar o erro antes da revisão
  humana — e o projeto deve usá-lo.

A pergunta desta ADR, então, não é "qual tecnologia de CSS é melhor". É: **onde mora o valor
de cor, fonte, raio, espaço e sombra, e o que acontece com quem escrever um valor que não
está lá.**

## Decisão

**Adotamos Tailwind CSS com todos os design tokens declarados em
`app/tailwind.config.ts`, usando exatamente os mesmos nomes que as variáveis do Figma, e
tratamos valor arbitrário como erro de lint.**

Quatro partes concretas:

1. **O `tailwind.config.ts` é a fonte única de verdade visual do código.** Cores semânticas
   (`bg`, `surface`, `surface-2`, `border`, `border-strong`, `text`, `text-muted`,
   `text-subtle`, `text-disabled`, `accent`, `accent-strong`, `accent-hover`, `accent-soft`,
   `accent-2`, `accent-2-hover`, `accent-2-soft`, `danger`), as escalas `coral`/`teal`/`neutral`
   de 50 a 900, a tipografia (`mono-xs`… `display-2xl`), o espaçamento base 4px, os raios
   (`sm`, `md`, `lg`, `xl`, `full`) e as três sombras vivem lá — e em nenhum outro lugar.

2. **Nome idêntico ao do Figma.** `accent-strong` no código é `accent-strong` na variável do
   Figma. Isso transforma a conversa entre designer e implementador em referência a um
   identificador, não em comparação de amostra de cor: a revisão de PR deixa de ser "essa cor
   parece certa?" e passa a ser "esse token é o certo para esse papel?".

3. **Valor arbitrário é erro de lint.** A regra `no-arbitrary-value` está implementada em
   [`app/.eslintrc.cjs`](../../app/.eslintrc.cjs) como seletor de AST em
   `no-restricted-syntax`, sem dependência adicional: **qualquer `[` dentro de um
   `className`** é reprovado — em literal de string e em *template literal* —, o que cobre
   `bg-[#E8542E]`, `p-[13px]`, `text-[rgb(…)]`, `w-[13ch]` e `[calc(…)]` de uma vez, porque
   nenhuma classe de token legítima tem colchete. No mesmo lugar, **`style` inline é
   proibido** em componente. Valor mágico não é discutido na revisão: ele **falha o build**
   (`npm run lint --max-warnings 0`). Consequência intencional: para usar um valor novo, é
   obrigatório passar pelo `tailwind.config.ts` — e portanto pela conversa com a designer.

4. **`src/components/ui/` é a camada que carrega as strings de classe.** Página não compõe
   dez utilitários para desenhar um botão; página usa `<Button variant="primary">`. Isso
   preserva a regra de dependência do
   [diagrama de componentes](../05-modelagem/07-diagrama-componentes.md): componente de
   design system é apresentacional e não conhece dado nem serviço.

## Alternativas consideradas

### A. CSS Modules + variáveis CSS (custom properties)

| | |
|---|---|
| **Prós** | Zero dependência além do que o Vite já traz; escopo local garantido por hash de classe; tokens em `:root` são inspecionáveis no DevTools e trocáveis em tempo de execução (útil se algum dia houver tema escuro); CSS "normal", sem curva de aprendizado |
| **Contras** | Dois nomes para a mesma coisa: a variável (`--color-accent-strong`) e a classe que a usa (`.buttonPrimary`), e a segunda é livre — o vocabulário compartilhado com o Figma se dilui; **não existe verificação automática de valor mágico**: `color: #E8542E` compila e passa no lint, então a garantia volta a depender da atenção do revisor; a escala de espaçamento é sugestão, não restrição, e o layout deriva para `13px`, `18px`, `22px`; um arquivo `.module.css` por componente aumenta o custo de ler o diff de uma mudança visual |
| **Motivo objetivo da recusa** | O problema real do projeto não é escrever CSS — é **impedir divergência entre Figma e código com seis pessoas e três sprints**. CSS Modules não oferece nenhum ponto onde essa divergência falhe automaticamente |

### B. styled-components / Emotion (CSS-in-JS)

| | |
|---|---|
| **Prós** | Tema tipado em TypeScript, com autocompletar de token e erro de compilação para token inexistente; estilo condicionado a props de forma expressiva; colocação do estilo junto do componente |
| **Contras** | Custo em tempo de execução: serialização de estilo e injeção de `<style>` durante o render, exatamente no caminho do feed, que tem alvo **p95 < 2s em 4G** (RNF-006) e teto de bundle de 250 KB gzip (RNF-007); o tema tipado impede *token inexistente*, mas **não impede valor literal** — `color: #E8542E` dentro do template continua válido, e é o erro que queremos barrar; a interpolação de props espalha lógica de apresentação em template string, difícil de revisar em diff |
| **Motivo objetivo da recusa** | Paga custo de runtime contra dois RNFs numéricos e **não resolve** o único problema que motivou a ADR (valor mágico continua compilando) |

### C. Biblioteca de componentes pronta (MUI ou Chakra UI)

| | |
|---|---|
| **Prós** | Velocidade inicial alta; componentes com acessibilidade e navegação por teclado já resolvidas, o que ajudaria RNF-003 e RNF-004; menos código nosso para manter |
| **Contras** | Toda biblioteca traz identidade própria — MUI é reconhecivelmente Material, e "tematizar até deixar de parecer Material" custa mais tempo do que construir os ~12 componentes que o projeto precisa; inverte a direção do design: o Figma passaria a ser desenhado *a partir* dos componentes da biblioteca, e o cartão-ingresso picotado (o único elemento visual que é assinatura da marca) teria de ser feito fora dela de qualquer forma; peso de bundle contra RNF-007; e, sendo direto: **20% da nota é identidade visual**, e entregar uma UI com cara de biblioteca padrão é o pior resultado possível nesse critério |
| **Motivo objetivo da recusa** | Otimiza a variável errada. O gargalo do CP4 não é velocidade de implementação de componente, é distinção visual e coerência com o Figma |

### D. Tailwind sem tokens nomeados (só a paleta padrão + valores arbitrários)

Registrada porque é o caminho que "acontece sozinho" quando ninguém decide: usar
`bg-orange-500` e `bg-[#E8542E]` conforme der. Recusada porque produz exatamente o estado que
a ADR existe para evitar — a marca deixa de ter nome e passa a ter dezenove hexadecimais
espalhados pelo JSX.

## Consequências

### Positivas

- **Divergência de valor visual passa a ser erro de build**, não achado de revisão. É a
  única classe de garantia que sobrevive a seis pessoas com pressa de prazo.
- **Vocabulário único entre design e código.** A revisão de tela vira "aqui deveria ser
  `text-muted`, não `text-subtle`" — uma frase que designer e dev entendem igual.
- **A tabela de contraste do RNF-002 vale de fato**, porque o conjunto de cores usado na UI
  é fechado e igual ao conjunto auditado.
- **Zero CSS em tempo de execução** e purga de classes não usadas: alia-se bem a RNF-006 e
  RNF-007.
- **Escala de espaçamento imposta.** Base 4px vira restrição real (`p-3`, `gap-4`), o que
  produz ritmo vertical consistente entre telas feitas por pessoas diferentes.
- **Trocar um token propaga em toda a UI** com uma edição — e o `git diff` de uma mudança de
  marca é uma linha, o que é auditável.

### Negativas

- **`className` longo polui o JSX e o diff.** Um card real acumula facilmente doze
  utilitários, e a linha passa a competir com a lógica pela atenção de quem revisa. Mitigação
  parcial: os utilitários repetidos ficam encapsulados em `src/components/ui/`, e páginas
  usam componentes — mas dentro do componente a string longa continua existindo, e não há
  como fingir o contrário.
- **Curva de aprendizado real para parte do time.** Quem conhece CSS mas não Tailwind gasta
  os primeiros dias consultando a documentação para descobrir que `mb-4` é 16px. Custo
  concentrado na primeira semana da Sprint 1, com o styleguide servindo de referência.
- **O lint barra valor mágico, não escolha semântica errada.** `text-text-disabled` num
  parágrafo de conteúdo passa no lint e falha no contraste. Ou seja: a regra automática
  cobre a metade mecânica do problema, e a outra metade continua na revisão humana e no
  styleguide. Declarar isso é mais útil do que fingir cobertura total.
- **A regra gera atrito legítimo em casos de borda.** O cartão-ingresso picotado precisa de
  geometria específica (posição e raio dos recortes laterais); a saída é declarar esses
  valores como tokens de projeto (`radius`/`spacing` dedicados) ou isolá-los em uma classe
  utilitária do CSS base, e **não** abrir exceção à regra. Isso significa um pouco mais de
  burocracia para um caso visual único.
- **A regra é deliberadamente grosseira, e isso tem preço.** O seletor de
  `no-restricted-syntax` reprova **qualquer `[`** dentro de um `className`, tanto em literal
  de string quanto em *template literal* — o que cobre todas as formas de valor arbitrário do
  Tailwind, não só cor e `px`. O efeito colateral é que os recursos legítimos do Tailwind que
  usam colchete ficam indisponíveis por tabela: variantes de atributo (`data-[state=open]:…`),
  variantes arbitrárias (`[&>li]:…`) e seletores de grupo com classe (`group-[.aberto]:…`).
  Quando um deles for realmente necessário, a saída é encapsular o comportamento em um
  componente de `src/components/ui/` com estado em prop — não desabilitar a regra na linha.
  Restam dois buracos, declarados: `className` cujo valor vem de variável calculada em outro
  lugar escapa da análise estática, e valor visual literal fora de `className` (atributo de
  SVG, CSS base) não é alcançado por ela.
- **Regra frágil a refatoração do próprio lint.** A garantia central da decisão não está no
  TypeScript nem no Tailwind: está em uma linha de configuração do ESLint. Se essa linha for
  removida ou o seletor deixar de casar (por mudança de versão do parser), a ADR continua
  escrita e a regra deixa de existir **silenciosamente** — por isso a verificação abaixo
  inclui uma busca independente por hexadecimal no CI, e não confia só no lint.
- **Duas fontes para o mesmo token durante o CP4.** Enquanto o arquivo do Figma e o
  `tailwind.config.ts` são mantidos à mão, "nome idêntico" é convenção sustentada por
  disciplina, não por ferramenta. Extrair os tokens do Figma automaticamente exige plugin ou
  API, o que não está no escopo do semestre.

## Como reverter

Os tokens são **dados**, e isso torna a reversão mecânica na parte fácil e caríssima na
parte difícil:

| Etapa | Custo |
|---|---|
| Gerar `:root { --color-accent: … }` a partir do próprio `tailwind.config.ts` | Baixo — um script de ~50 linhas, porque o config é um módulo TypeScript importável |
| Reescrever `className` de utilitário para classe de CSS Module em todos os componentes e páginas | **Alto** — estimativa do grupo: 2 a 3 dias de duas pessoas, com risco alto de regressão visual silenciosa |
| Reauditar contraste (RNF-002) e revalidar RNF-018 nos seis breakpoints | Meio dia |

Reversão parcial não é possível: dois sistemas de estilo convivendo em oito telas produz
justamente a divergência que a decisão evita. Por isso a decisão precisa valer para o
repositório inteiro, ou não valer.

## Verificação

| Como se verifica | Onde |
|---|---|
| O seletor de `no-restricted-syntax` contra valor arbitrário em `className` **e** a proibição de `style` inline estão presentes e como `error` | `app/.eslintrc.cjs`; `npm run lint` (`--max-warnings 0`) no job obrigatório de CI — RNF-017 |
| Nenhum hexadecimal, `rgb(`, `px` de fonte ou `px` de raio literal em `src/**/*.tsx` | Busca automática no CI, **independente do lint**: falha se `#[0-9a-fA-F]{3,8}` aparecer fora de `tailwind.config.ts` e dos SVGs de marca |
| Nenhum componente de `src/components/ui/` importa serviço, store ou mock | `no-restricted-imports`, conforme a tabela de dependências do [diagrama de componentes](../05-modelagem/07-diagrama-componentes.md) |
| Todo token usado na UI existe na tabela de contraste auditada | Revisão cruzada Ana Luiza Dourado × Lucas Baraldi no PR de tela, contra [`../06-marca/identidade-visual.md`](../06-marca/identidade-visual.md) e [`../06-marca/design-system.md`](../06-marca/design-system.md) |
| Nome de token no código == nome no Figma | Item fixo do checklist de PR de tela. Verificação humana declarada: não há ferramenta para isso no escopo do semestre |
| Bundle inicial ≤ 250 KB gzip com o CSS purgado | Relatório de tamanho do `vite build` no CI (RNF-007) |
