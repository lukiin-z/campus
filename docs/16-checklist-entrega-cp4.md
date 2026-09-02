# Checklist de entrega — Checkpoint 4

**Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)
**Data-alvo de entrega:** 08/09/2026 (premissa do grupo, ajustar ao calendário oficial)

Este documento existe para uma coisa: **provar que cada item exigido foi entregue, e
apontar exatamente onde**. A coluna "evidência" não diz "está pronto" — diz o que a pessoa
que corrige pode abrir, contar ou rodar para verificar.

---

## 1. Itens exigidos pelo enunciado

| # | Item exigido | Artefato que cumpre | Evidência verificável |
|---|---|---|---|
| 1 | Documentação inicial completa: problema + persona | [`01-problema-e-personas.md`](01-problema-e-personas.md) | Declaração de problema em uma frase (seção 2), **3 personas** completas com cenário e citação, **1 antipersona** com 6 perfis recusados, jornada em Mermaid e mapa de empatia |
| 2 | RF/RNF bem definidos | [`02-requisitos.md`](02-requisitos.md) | **43 RFs** (`RF-001`–`RF-043`) em 10 módulos, cada um com critério de aceite `Dado/Quando/Então`; **22 RNFs** (`RNF-001`–`RNF-022`) em 7 características da ISO/IEC 25010, cada um com **métrica verificável e como medir** |
| 3 | Escopo coerente | [`03-escopo.md`](03-escopo.md) | In/out of scope item por item com justificativa, MVP por MoSCoW (28 Must / 11 Should / 4 Could), 7 premissas, restrições, 6 dependências, marcos e 10 critérios de saída |
| 4 | Repositório GitHub organizado, com README | [`README.md`](../README.md) e [`CONTRIBUTING.md`](../CONTRIBUTING.md) | **164 arquivos versionados**, README com logo, badges, one-liner, sumário, links de demonstração, stack justificada, como rodar, estrutura comentada e índice de toda a documentação |
| 5 | Estrutura mínima de pastas | raiz do repositório | `app/`, `docs/` (com 6 subpastas), `prototype/legacy/`, `scripts/`, `.github/workflows/` — todas com conteúdo real, nenhuma vazia |
| 6 | Ao menos um diagrama UML relevante (Caso de Uso e/ou Classe) | [`05-modelagem/`](05-modelagem/README.md) | **12 diagramas Mermaid** em **7 tipos**: caso de uso (23 UCs, 7 atores, `include`/`extend`), classes (14 classes, 9 enums), ER, sequência ×3, atividades ×2, estados ×2, componentes. **16 exports em SVG** em [`exports/`](05-modelagem/exports/README.md) |
| 7 | Desenvolvimento de marca: nome, logo, paleta, tipografia | [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) | Racional do nome e do símbolo, **6 SVGs escritos à mão** em [`assets/`](06-marca/assets), 3 escalas de 10 passos com HEX/RGB/HSL, 3 famílias tipográficas com escala de 11 passos |
| 8 | Ideia de venda / pitch de 1 minuto | [`07-pitch.md`](07-pitch.md) | Pitch de **150 palavras** cronometrado bloco por bloco, one-liner, elevator pitch de 30 s, canvas de proposta de valor, comparativo com 4 alternativas reais e 6 objeções respondidas |
| 9 | Quadro do Trello com colunas de sprint e tarefas distribuídas | [`09-trello/quadro.md`](09-trello/quadro.md) | **7 listas**, labels por módulo e por tipo, **32 cards** em **3 sprints** com responsável, pontos e DoD por card, e tabela de carga por integrante |
| 10 | Vídeo de apresentação de 2 minutos | [`15-video-roteiro.md`](15-video-roteiro.md) + [`15-video-slides.html`](15-video-slides.html) | Roteiro de **300 palavras** cronometrado em 7 blocos, escalação dos **6 integrantes** somando 2:00, storyboard, checklist de gravação e deck de **8 slides** navegável |

---

## 2. Critérios de avaliação, com o peso de cada um

### Documentação e requisitos — 25%

*Observado: clareza do problema, RF/RNF bem definidos, escopo coerente.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| Clareza do problema | [`01-problema-e-personas.md`](01-problema-e-personas.md) §1–2 | Quatro problemas nomeados e explicados; declaração em uma frase no formato "Para/que/é um/que/diferente de/porque" |
| Premissas honestas | [`01-problema-e-personas.md`](01-problema-e-personas.md) §1 | **Nenhuma estatística de mercado inventada.** Toda estimativa está rotulada como "premissa do grupo", com a coluna "por que importa para o produto" |
| RF bem definidos | [`02-requisitos.md`](02-requisitos.md) §1 | 43 RFs com ID, descrição, MoSCoW, ator, critério de aceite `Dado/Quando/Então` e checkpoint-alvo |
| RNF bem definidos | [`02-requisitos.md`](02-requisitos.md) §2 | 22 RNFs com **métrica verificável** e coluna "como medir". Ex.: RNF-007 "bundle ≤ 250 KB gzip" é medido por `npm run check:size` no CI |
| Rastreabilidade | [`02-requisitos.md`](02-requisitos.md) §3 | Matriz RF → caso de uso → tela/rota → componente → sprint, para todos os 43 RFs |
| Escopo coerente | [`03-escopo.md`](03-escopo.md) | 14 itens dentro, 12 recusados com justificativa (`RFX-01`–`RFX-12`) e "quando reavaliar" |
| Regras de negócio | [`04-regras-de-negocio.md`](04-regras-de-negocio.md) | **25 regras** `RN-001`–`RN-025`, com os parâmetros centralizados e rastreabilidade regra → requisito → teste → arquivo de código |
| Linguagem ubíqua | [`14-glossario.md`](14-glossario.md) | Termo em português, identificador em inglês, definição e "não confundir com" — mais uma lista de **termos proibidos** |
| Plano de testes | [`11-plano-de-testes.md`](11-plano-de-testes.md) | **32 casos de teste** em blocos Gherkin, com dados do seed canônico |
| Riscos | [`12-riscos.md`](12-riscos.md) | **16 riscos** com probabilidade, impacto, exposição, gatilho, contingência e responsável |

**Volume:** 13.781 linhas de documentação em 40 arquivos markdown.

### Modelagem UML — 20%

*Observado: diagrama(s) corretos e condizentes com a ideia proposta.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| Caso de uso | [`01-casos-de-uso.md`](05-modelagem/01-casos-de-uso.md) | 23 UCs, 7 atores (3 primários + 3 externos + ator de tempo), 7 relações `include` e 5 `extend` — **cada uma com justificativa** de por que é `include` e não `extend` |
| Especificação textual dos UCs principais | idem, §3 | UC-001 a UC-005 no formato completo: ator, interessados, pré e pós-condições, fluxo principal numerado, **fluxos alternativos** e **fluxos de exceção** (7 exceções só em UC-001) |
| Diagrama de classes | [`02-diagrama-classes.md`](05-modelagem/02-diagrama-classes.md) | 14 classes com atributos tipados e métodos, 9 enumerações, multiplicidades, composição e agregação distinguidas — e **7 decisões de modelagem explicadas** |
| Modelo de dados | [`03-modelo-dados-er.md`](05-modelagem/03-modelo-dados-er.md) | 14 tabelas, restrições `CHECK`, índice único **parcial** que sustenta RN-015, 11 índices justificados por consulta e a transação que sustenta RN-004 |
| Dicionário de dados | [`dicionario-de-dados.md`](05-modelagem/dicionario-de-dados.md) | Campo, tipo, obrigatoriedade, default, descrição e constraint para as 14 entidades + **inventário de dados pessoais LGPD** |
| Sequência | [`04-diagrama-sequencia.md`](05-modelagem/04-diagrama-sequencia.md) | 3 sequências, cada uma com "por que esta ordem" — Pix com confirmação assíncrona e idempotência, promoção da lista de espera, check-in com uso único garantido pelo banco |
| Atividades | [`05-diagrama-atividades.md`](05-modelagem/05-diagrama-atividades.md) | Criação e publicação de evento com 7 validações e ramo de aprovação; decisão do botão principal com 9 estados |
| Estados | [`06-diagrama-estados.md`](05-modelagem/06-diagrama-estados.md) | `Participacao` (8 estados) e `Evento` (5 estados) — e as **transições proibidas**, com o motivo de cada proibição |
| Componentes | [`07-diagrama-componentes.md`](05-modelagem/07-diagrama-componentes.md) | 5 camadas, a fronteira mock→API destacada e a tabela de dependências **proibidas**, verificadas por regra de ESLint |
| Coerência com o código | [`app/src/types/domain.ts`](../app/src/types/domain.ts) | Os tipos espelham o diagrama de classes entidade por entidade e enum por enum, na mesma ordem |
| Diagramas renderizam | `node scripts/render-diagrams.mjs --check` | **16/16 blocos Mermaid** renderizam sem erro |

### Identidade visual e marca — 20%

*Observado: logo, cores, tipografia, coerência com o público-alvo.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| Logo | [`assets/`](06-marca/assets) | **6 SVGs escritos à mão**, sem dependência externa: símbolo (path único com `fill-rule="evenodd"`), lockup, mono via `currentColor`, horizontal com descritor, favicon e og-image 1200×630. Todos validados como XML bem formado |
| Racional da marca | [`identidade-visual.md`](06-marca/identidade-visual.md) §1 | Significado do nome, conceito do símbolo (ingresso + "C" vazado + picote), construção geométrica na grade de 24, e **7 razões** pelas quais a direção fala com universitário de 18–25 anos — mais 4 direções recusadas |
| Paleta | idem §3 | 3 escalas de 10 passos com HEX, RGB e HSL; 17 tokens semânticos; usos permitidos e proibidos |
| **Contraste verificado** | idem §4 | **28 pares texto/fundo** com a razão **calculada pela fórmula da WCAG**, o mínimo aplicável e o resultado. Duas linhas marcadas como REPROVA são os valores herdados do protótipo, com a correção adotada documentada |
| Tipografia | idem §5 | 3 famílias com papel exclusivo, escala de 11 passos com tamanho, line-height, letter-spacing e peso, e o teste de decisão de qual família usar |
| Espaçamento, raios, sombras, grade | idem §6 | Escala de 4px, 5 raios, 4 sombras, largura de conteúdo e área de toque mínima de 44px |
| Usos incorretos | idem §2 | 10 usos proibidos, área de proteção e tamanho mínimo |
| Tom de voz | idem §7 | 8 princípios faça/não faça e 13 microcópias de referência |
| Design system | [`design-system.md`](06-marca/design-system.md) | 20 componentes com função, anatomia em tokens, variantes, 6 estados, tokens usados, acessibilidade e "quando NÃO usar" |
| **Prova visual** | [`styleguide.html`](06-marca/styleguide.html) | Página única e autossuficiente que renderiza a marca inteira. Publicada em [/styleguide/](https://lukiin-z.github.io/campus/styleguide/) |
| Arquivo do Figma | [`guia-figma.md`](06-marca/guia-figma.md) | **64 variables**, 11 estilos de texto, 3 de efeito, **9 componentes com 34 variants** — [abrir](https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp). Os nomes dos styles são idênticos aos tokens do `tailwind.config.ts` |
| Coerência marca ↔ código | [`app/tailwind.config.ts`](../app/tailwind.config.ts) | Os 30 passos de cor, 11 tamanhos, 12 espaçamentos, 5 raios e 4 sombras estão no config. Valor arbitrário em `className` é **erro de lint** |

### Ideia de venda / pitch — 15%

*Observado: clareza da proposta de valor e diferencial.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| One-liner e elevator pitch | [`07-pitch.md`](07-pitch.md) | Uma frase + versão de 30 s (~75 palavras) |
| Pitch de 1 minuto | idem | Roteiro **palavra por palavra**, 150 palavras, 6 blocos com marcação de tempo e contagem: gancho → problema → solução → diferencial → plano → pedido |
| Proposta de valor | idem | Canvas com dores, ganhos, aliviadores e criadores de ganho, cada aliviador amarrado a um RF/RN |
| Diferencial competitivo | idem | Comparativo com Instagram/Stories, WhatsApp, Sympla e Google Forms por 8 critérios — **honesto**, dizendo onde cada concorrente é melhor antes de explicar por que o Campus ganha no caso de uso |
| Modelo de negócio | idem | Hipótese declarada como fora do escopo técnico do semestre, com conta de viabilidade usando **somente premissas do grupo**, rotuladas |
| Métricas de sucesso | idem | 6 métricas com fórmula, meta inicial e como medir |
| Objeções | idem | 6 objeções que a banca pode levantar, com resposta factual apontando o artefato |

### Organização no Trello — 10%

*Observado: quadro estruturado, tarefas distribuídas, uso real da ferramenta.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| Quadro estruturado | [`quadro.md`](09-trello/quadro.md) | 7 listas com regra de entrada e limite de WIP, labels por módulo e por tipo com cor sugerida, DoR e DoD |
| Tarefas distribuídas | idem | **32 cards** específicos em 3 sprints, com responsável, pontos, sprint, labels, requisito e critério de pronto. Tabela de carga por integrante — ninguém sem card |
| Pronto para importar | [`trello-import.json`](09-trello/trello-import.json) · [`trello-import.csv`](09-trello/trello-import.csv) · [`criar-quadro.md`](09-trello/criar-quadro.md) · [`criar-quadro.sh`](09-trello/criar-quadro.sh) | **3 caminhos redundantes**: JSON de board export (32 cards, 7 listas, validado), CSV (32 linhas, aceito por Trello/Notion/Jira) e roteiro manual de 10 min com o texto pronto de cada card. Mais o script de API REST com key/token em variável de ambiente |
| **Uso real da ferramenta** | [`quadro.md`](09-trello/quadro.md) §6 | ⚠️ **AÇÃO MANUAL PENDENTE**: importar o quadro, usar durante a semana (mover cards, comentar link de commit e PR) e salvar o print em `docs/09-trello/evidencia.png` |

### GitHub organizado — 10%

*Observado: repositório criado, README presente, estrutura mínima.*

| Sub-item | Artefato | Evidência |
|---|---|---|
| Repositório e README | [`README.md`](../README.md) | Logo, 6 badges, one-liner, sumário, problema, links de demonstração, funcionalidades, stack justificada, como rodar testado, estrutura comentada, índice da documentação, equipe, status por checkpoint e licença |
| Estrutura de pastas | raiz | Conforme a árvore do README, sem pasta vazia |
| Higiene | [`.gitignore`](../.gitignore) · [`.gitattributes`](../.gitattributes) · [`.editorconfig`](../.editorconfig) · [`.nvmrc`](../.nvmrc) · [`LICENSE`](../LICENSE) | Node/Vite/editores/`.env` ignorados; fim de linha normalizado; Node 22.17.0 fixado; MIT |
| Contribuição | [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Padrão de branch (`feat/`, `fix/`, `docs/`…), **Conventional Commits** com escopos do projeto, DoR, DoD, fluxo de PR e padrões de código |
| Templates | [`.github/`](../.github) | Template de PR com checklist da DoD, e templates de issue de bug e de funcionalidade |
| Commits atômicos | `git log --oneline` | Commits semânticos em português por fase, no padrão `tipo(escopo): descrição` — não um commit gigante no final |
| CI passando | [`ci.yml`](../.github/workflows/ci.yml) | Dois jobs: documentação (links, Mermaid, SVGs) e aplicação (lint, escala, formatação, cobertura, build, orçamento de pacote) |
| Publicação | [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) | Publica app, styleguide, protótipo legado e slides no GitHub Pages, com `base` do Vite em `/campus/` |

---

## 3. Base técnica que adianta o CP5

Não é item de avaliação do CP4, mas é o que o CP5 consome.

| Item | Evidência |
|---|---|
| App React funcionando | [`app/`](../app) — 8.594 linhas em `src/` e `e2e/`, 7 rotas, 20 componentes |
| Domínio testado | 12 módulos de funções puras implementando RN-001 a RN-025 |
| **156 testes passando** | `npm run test` — 30 de domínio, 20 de componente, 14 de integração pela camada HTTP real, 4 E2E escritos |
| Cobertura acima do limite | `npm run test:coverage` — **66,35%** de linhas no domínio, limite de 60% (RNF-015) configurado para falhar o build |
| Camada de dados trocável | MSW intercepta `fetch('/api/...')` e responde do mock que aplica as mesmas regras. No CP6 muda só quem responde (RNF-016) |
| Orçamento de pacote respeitado | `npm run check:size` — **211,01 KB gzip** de um limite de 250 (RNF-007) |
| Verificadores próprios | 4 scripts em [`scripts/`](../scripts): docs, diagramas, escala de espaçamento e tamanho de pacote |

### Pendências técnicas conhecidas — declaradas, não escondidas

| Pendência | Motivo | Onde está registrado |
|---|---|---|
| Teste E2E do Playwright escrito mas **não executado** | O navegador do Playwright não foi baixado nesta máquina (`npx playwright install chromium`). Primeira tarefa da Sprint 2 | [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md), [`app/e2e/inscricao.spec.ts`](../app/e2e/inscricao.spec.ts) |
| 8 telas do Figma e ligações de protótipo | Cota de chamadas do MCP do plano Starter do Figma esgotada durante a construção. Substituto existente: 4 telas de referência no styleguide + o app React funcionando | [`06-marca/guia-figma.md`](06-marca/guia-figma.md) §5, com o roteiro de 20 min para completar |
| Arquivo do Figma com 3 páginas em vez de 5 | Plano Starter limita a 3 páginas por arquivo. Os 5 conteúdos foram consolidados sem perda | idem |
| MSW vai para o pacote de produção | É a consequência aceita de ADR-0003 no CP4/CP5: o app precisa dos dados mockados para ser demonstrável por link. Sai no CP6 | [ADR-0003](adr/0003-camada-de-repositorio-com-msw.md) |

---

## 4. O que ainda depende de ação manual do grupo

Três coisas, na ordem em que devem ser feitas.

### 1. Criar o quadro no Trello — ~10 minutos

Siga [`09-trello/criar-quadro.md`](09-trello/criar-quadro.md). Escolha um dos três
caminhos (JSON, CSV ou manual). Depois:

- [ ] Convidar os 5 colegas no quadro
- [ ] Mover para **Done** os cards da Sprint 1 (o CP4 está entregue)
- [ ] Comentar em pelo menos 5 cards com o link do commit ou do PR correspondente
- [ ] Usar o quadro durante a semana — o critério fala em "uso real da ferramenta"
- [ ] Salvar o print do quadro **em uso** em `docs/09-trello/evidencia.png`

### 2. Gravar o vídeo de 2 minutos

Siga [`15-video-roteiro.md`](15-video-roteiro.md) com
[`15-video-slides.html`](15-video-slides.html) na tela compartilhada.

- [ ] Ensaiar cada bloco cronometrado (o roteiro tem contagem de palavras por bloco)
- [ ] Gravar bloco por bloco, não em uma tomada
- [ ] Confirmar que os **6 integrantes** aparecem e que cada fala combina com o papel
- [ ] Subir como link não listado e colar a URL no README e no checklist

### 3. Submeter no Teams

Texto pronto na seção 5.

---

## 5. O que entregar no Teams

Preencha os dois links marcados com `⟨…⟩` e envie.

```
Checkpoint 4 — Campus (app de eventos universitários)
Engenharia de Software · Engenharia de Computação, 3º ano · Prof. Hercules Ramos

Equipe
  Ana Luiza Dourado      RM558793  UX/UI Designer
  João Viviani Baldini   RM558596  Product Owner
  Lucas Baraldi          RM555407  Tech Lead / Arquiteto
  Lucas Zolla            RM557952  Analista de Requisitos
  Ronaldo Veloso Filho   RM556445  Modelagem / Analista UML
  Vitor Pantarotto       RM554961  Scrum Master / QA

Entregas
  Repositório .......... https://github.com/lukiin-z/campus
  Documentação ......... https://github.com/lukiin-z/campus/blob/main/docs/README.md
  App rodando .......... https://lukiin-z.github.io/campus/
  Styleguide da marca .. https://lukiin-z.github.io/campus/styleguide/
  Protótipo original ... https://lukiin-z.github.io/campus/prototipo/
  Figma ................ https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp
  Trello ............... ⟨colar o link do quadro⟩
  Vídeo (2 min) ........ ⟨colar o link não listado⟩

Onde encontrar cada critério
  Documentação e requisitos (25%) .. docs/01 a docs/04 e docs/14
                                     43 RF com critério de aceite, 22 RNF com métrica,
                                     25 regras de negócio, 12 requisitos recusados
  Modelagem UML (20%) .............. docs/05-modelagem/
                                     12 diagramas Mermaid em 7 tipos, 16 exports em SVG,
                                     especificação textual de UC-001 a UC-005
  Identidade visual (20%) .......... docs/06-marca/ e o styleguide
                                     6 SVGs à mão, 3 escalas de 10 passos e o contraste
                                     WCAG AA de 28 pares, calculado
  Pitch (15%) ...................... docs/07-pitch.md
                                     pitch de 1 min cronometrado e comparativo honesto
                                     com 4 alternativas
  Trello (10%) ..................... docs/09-trello/
                                     7 listas, 32 cards em 3 sprints, 3 formas de importar
  GitHub (10%) ..................... README, CONTRIBUTING, CI verde e Pages publicado

Base técnica que adianta o CP5
  App React com TypeScript strict, 156 testes passando, 66% de cobertura no domínio,
  e a camada de dados desacoplada: trocar o mock pela API real no CP6 muda só quem
  responde ao HTTP, sem tocar em nenhuma tela.

Pendências declaradas
  O teste E2E do Playwright está escrito e configurado, mas não executado (o navegador
  do Playwright não foi instalado). As 8 telas do Figma não foram montadas: a cota de
  chamadas do plano Starter esgotou durante a construção do arquivo — o substituto são
  as 4 telas de referência do styleguide e o próprio app funcionando. Os dois casos
  estão registrados em docs/06-marca/guia-figma.md e docs/13-roadmap-cp5-cp6.md.
```

---

## 6. Conferência final, para rodar antes de enviar

```bash
# Documentação: links, âncoras, blocos Mermaid e SVGs
node scripts/validate-docs.mjs

# Diagramas: valida a sintaxe de todos os blocos Mermaid renderizando cada um
node scripts/render-diagrams.mjs --check

# Aplicação
cd app
npm ci
npm run lint
npm run check:scale
npm run format:check
npm run test:coverage
npm run build
npm run check:size
```

| Verificação | Resultado no fechamento do CP4 |
|---|---|
| `validate-docs.mjs` | 40 arquivos, 493 links relativos resolvidos, 16 blocos Mermaid, 22 SVGs · **sem falha** |
| `render-diagrams.mjs --check` | **16/16** blocos renderizam |
| `npm run lint` | **0 erro, 0 aviso** |
| `npm run check:scale` | 230 utilitários verificados, todos na escala de 4px |
| `npm run format:check` | todos os arquivos no padrão do Prettier |
| `npm run test` | **156 de 156** passando |
| `npm run test:coverage` | **66,35%** de linhas no domínio (limite: 60%) |
| `npm run build` | **sem erro**, `tsc -b` + `vite build` |
| `npm run check:size` | **211,01 KB gzip** (orçamento: 250) |
| `npm run test:e2e` | ⚠️ **não executado** — navegador do Playwright não instalado |
