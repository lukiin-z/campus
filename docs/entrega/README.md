# Pacote de entrega — CP4, CP5 e CP6

**Apurado em:** 2026-09-11 · **Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)

Esta página é **suficiente para entregar sem abrir mais nada**. Ela traz o texto de
submissão dos três checkpoints pronto para colar no Teams, com todos os links já
preenchidos, e o que ainda depende de pessoa.

> **Esta página é a fonte do texto de submissão.** Os checklists
> [`16`](../16-checklist-entrega-cp4.md), [`19`](../19-checklist-entrega-cp5.md) e
> [`24`](../24-checklist-entrega-cp6.md) **apontam para cá** e não guardam mais uma segunda
> cópia — duas versões do mesmo texto divergem, e aí nenhuma das duas é confiável.

**Faltam quatro links, e só eles.** Estão marcados com `⟨…⟩` no texto,
e a seção 7 diz onde cada um aparece.

---

## 1. Ordem de execução

Não é possível inverter: os dois links que faltam só existem depois dos passos 1 e 2.

| # | Passo | Produz | Seção |
|---|---|---|---|
| 1 | Criar o quadro do Trello e **usá-lo** | `⟨TRELLO⟩` + `docs/09-trello/evidencia.png` | [§5](#5-criar-e-usar-o-quadro-do-trello) |
| 2 | Gravar os três vídeos e subir como não listados | `⟨VIDEO_CP4⟩`, `⟨VIDEO_CP5⟩`, `⟨VIDEO_CP6⟩` | [§6](#6-gravar-os-três-vídeos) |
| 3 | Substituir os marcadores nos textos das seções 2, 3 e 4 | — | — |
| 4 | Colar cada texto no Teams | — | — |

---

## 2. Texto de submissão — CP4

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
  Trello ............... ⟨TRELLO⟩
  Vídeo (2 min) ........ ⟨VIDEO_CP4⟩

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

## 3. Texto de submissão — CP5

```
Checkpoint 5 — Campus (app de eventos universitários)
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
  App rodando .......... https://lukiin-z.github.io/campus/
  Ambiente de teste .... https://github.com/lukiin-z/campus/blob/main/docs/18-ambiente-de-teste.md
  Documentação ......... https://github.com/lukiin-z/campus/blob/main/docs/README.md
  Styleguide da marca .. https://lukiin-z.github.io/campus/styleguide/
  Figma ................ https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp
  Trello ............... ⟨TRELLO⟩
  Vídeo (2 min) ........ ⟨VIDEO_CP5⟩

Onde encontrar cada critério
  Funcionalidade do protótipo (30%) .. app/ e docs/02-requisitos.md §1.1
                                       25 dos 43 RF completos e 3 parciais, com o
                                       endpoint, a função de domínio e o teste de cada um.
                                       293 testes e 6 casos E2E passando, incluindo 50
                                       inscricoes concorrentes na ultima vaga que
                                       confirmam exatamente uma
  Ambiente de teste (20%) ............ docs/18-ambiente-de-teste.md
                                       link público, 3 comandos para rodar local,
                                       usuários de teste do seed e roteiro por fluxo
  Documentação atualizada (20%) ...... docs/02, docs/03, docs/04 e docs/17-jornada.md
                                       histórico de revisões em cada documento; 43 RF com
                                       status lido do código; 22 RNF com valor medido ou
                                       "não medido"; 29 regras de negócio rastreadas até
                                       arquivo, função e teste
  Diagramas UML atualizados (15%) .... docs/05-modelagem/
                                       diagramas conferidos contra o código do CP5,
                                       validados por scripts/render-diagrams.mjs
  Qualidade da demo (15%) ............ docs/20-video-cp5-roteiro.md e os slides
                                       roteiro de 2 min cronometrado, escalação dos 6,
                                       preparo da demo e plano B por fluxo

Como o CP5 foi construído
  O contrato veio primeiro: os endpoints da API simulada, as interfaces dos repositórios e
  as funções de domínio foram definidos antes das telas, o que permitiu construir as telas
  em paralelo sem conflito. Nenhuma tela conhece a origem dos dados — é regra de lint, não
  de boa vontade, e é o que faz a troca do mock pela API real no CP6 mudar só quem responde
  ao HTTP. O registro dessa evolução está em docs/17-jornada.md.

O que mudou de escopo, e por quê
  Sete requisitos que estavam no CP6 entraram no CP5 (pagamento simulado, check-in, escrita
  no feed e central de notificações) porque a demonstração ao vivo precisa deles. Três que
  estavam no CP5 foram para o CP6 (cadastro de conta, edição de perfil e publicação de
  rascunho): são operações de escrita que não aparecem na demonstração, e ficaram por
  último. A troca está declarada item por item em docs/03-escopo.md §8.1.

Pendências declaradas
  CORRIGIDO EM 2026-09-10: este parágrafo dizia que o E2E do Playwright continuava
  "escrito e não executado". Estava errado e contradizia a secao 3 desta mesma pagina,
  que ja registrava 6 de 6 verdes. O E2E foi executado, reprovou 6 de 6 na primeira vez,
  as tres causas foram corrigidas, e ele entrou no ci.yml em job proprio -- ou seja, a
  execucao nao depende mais da maquina de ninguem. Ver docs/17-jornada.md, linha do
  item 12.
  Duas coberturas seguem finas, e estão nomeadas: domain/permissions.ts tem 12 funções
  exportadas e nenhuma coberta por teste, e domain/eventSchema.ts está em 0% — o limite
  global de 60% passa (79,03% de linhas, 63,38% de funções), mas esses dois módulos não
  têm prova própria. Vale registrar que o limite REPROVOU de verdade no meio da sprint,
  com 54,54%: as telas entraram antes dos testes, o build falhou, e os testes vieram
  depois. Tudo está em docs/19-checklist-entrega-cp5.md com o número medido e a correção.

O que a conferência de documentação encontrou
  Conferir os 43 requisitos e as 29 regras de negócio contra o código expôs três coisas
  que já foram corrigidas: um defeito de ORDEM no check-in, que fazia a segunda leitura do
  mesmo QR responder "não confirmada" em vez de "ingresso já utilizado às 20h14" — o
  requisito estava certo e o código foi corrigido, com teste de regressão; quatro arquivos
  citados pela documentação do CP4 que nunca existiram; e uma contradição ativa sobre quem
  pode publicar no feed, em que dois endpoints aplicam critérios diferentes da regra
  escrita. Os três achados estão em docs/02-requisitos.md e docs/04-regras-de-negocio.md.
```

---

## 4. Texto de submissão — CP6

```
Checkpoint 6 — Campus (app de eventos universitários)
Engenharia de Software · Engenharia de Computação, 3º ano · Prof. Hercules Ramos

Equipe
  Ana Luiza Dourado      RM558793  UX/UI Designer
  João Viviani Baldini   RM558596  Product Owner
  Lucas Baraldi          RM555407  Tech Lead / Arquiteto
  Lucas Zolla            RM557952  Analista de Requisitos
  Ronaldo Veloso Filho   RM556445  Modelagem / Analista UML
  Vitor Pantarotto       RM554961  Scrum Master / QA

Entregas
  Repositorio .......... https://github.com/lukiin-z/campus
  Rodar em 1 comando ... docker compose up   (roteiro: docs/23-instalacao.md)
  App sem backend ...... https://lukiin-z.github.io/campus/
  Manual de uso ........ https://github.com/lukiin-z/campus/blob/main/docs/22-manual-de-uso.md
  Contrato da API ...... https://github.com/lukiin-z/campus/blob/main/docs/21-api-contrato.md
  Documentacao ......... https://github.com/lukiin-z/campus/blob/main/docs/README.md
  Styleguide da marca .. https://lukiin-z.github.io/campus/styleguide/
  Figma ................ https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp
  Trello ............... ⟨TRELLO⟩
  Video (3 min) ........ ⟨VIDEO_CP6⟩

Onde encontrar cada critério
  Funcionalidade completa (30%) ...... api/ e app/, sobre PostgreSQL
                                       43 operacoes no contrato e 43 rotas implementadas.
                                       14 tabelas, 20 CHECK, 2 indices unicos parciais.
                                       22 restricoes verificadas contra PostgreSQL real.
                                       713 testes sem contar duas vezes e 9 casos E2E.
  Qualidade tecnica (20%) ............ 0 erro e 0 aviso de lint nos dois workspaces.
                                       Fronteira de arquitetura EXECUTAVEL: 3 verificadores.
                                       Cobertura 96,68% no app e 99,32% no pacote.
                                       8 ADRs com alternativa recusada e como reverter.
  Instalabilidade (20%) .............. docker compose up, tres servicos em cadeia com
                                       healthcheck de verdade (pg_isready, nao depends_on
                                       solto). Migration e seed automaticos. PWA instalavel.
                                       Roteiro em docs/23-instalacao.md.
  Documentacao final (15%) ........... 25 documentos, 8 ADRs, 21 diagramas UML.
                                       Contrato com fonte unica: api/openapi.yaml, com
                                       docs/21-api-contrato.md como leitura derivada.
                                       validate-docs.mjs verifica link, ancora, bloco
                                       Mermaid e SVG de 52 arquivos.
  Evolucao do projeto (15%) .......... docs/17-jornada.md
                                       As 30 rotas do CP5 seguem TODAS no contrato do CP6,
                                       nenhuma renomeada. O dominio foi MOVIDO para um
                                       pacote, nao copiado. A serializacao de RN-004 saiu
                                       da fila do mock para SELECT ... FOR UPDATE.

Como o CP6 foi construído
  O contrato veio primeiro, como no CP5, e desta vez ele e executavel: api/openapi.yaml, com
  38 caminhos e 43 operacoes, escrito antes dos modulos. A doc do contrato DERIVA do YAML e
  diz isso na primeira linha — porque entre o CP4 e o CP5 uma tabela de endpoints escrita a
  mao divergiu do codigo, e a licao foi parar de ter duas fontes em vez de conferir com mais
  cuidado. As regras de negocio foram PORTADAS, nao reescritas: 13 modulos sairam de
  app/src/domain/ e viraram o pacote @campus/shared, com a fronteira verificada por script.
  planPromotion existe uma vez, e e a mesma que decide na tela e na API.

O que separa o CP6 do CP5, em uma frase
  A garantia de "capacidade nunca excedida" deixou de ser uma fila de promessas dentro de um
  navegador e passou a ser SELECT ... FOR UPDATE numa linha do PostgreSQL, com um CHECK
  embaixo como rede. As duas produzem o mesmo comportamento observavel — e so a segunda vale
  entre processos. A comparacao esta tabelada em docs/05-modelagem/03-modelo-dados-er.md.

Pendências declaradas
  O build passa nos tres workspaces SOB UMA CONDICAO, e ela e o unico ponto que ainda exige
  atencao de quem instala: o cliente do Prisma nao e versionado e o npm bloqueia o preinstall
  que o geraria (npm warn allow-scripts). Em arvore limpa, `npm ci && npm run build` reprova
  com 182 erros de tipo na API; com `npm run prisma:generate -w campus-api` antes, passa. Nao
  e defeito de codigo, e um passo de instalacao, e ele esta na secao 7, no CONTRIBUTING e no
  ci.yml. Vale registrar POR QUE nem o lint nem os testes pegam essa classe de falha: nenhum
  dos dois faz verificacao de tipo — o Vitest transpila com esbuild, que remove anotacao de
  tipo sem checar. O unico passo que roda tsc e o build, e o CI o roda.
  check:rotas tem a mesma forma: ele SOBE a aplicacao, entao exige DATABASE_URL, JWT_SECRET e
  WEBHOOK_SECRET. Sem elas reprova por ambiente, nao por rota; com os placeholders do ci.yml,
  os 38 caminhos do contrato batem com os 38 registrados.
  A suite de integracao da API FOI executada: 11 arquivos, 96 casos, 96 verdes contra
  PostgreSQL, com a concorrencia entre processos coberta. A garantia de "uma confirmacao para
  a ultima vaga" deixou de estar provada so contra o mock.
  O docker compose sobe os tres servicos em cadeia NESTA maquina e COM cache de imagem: db e
  api saudaveis pelo healthcheck, front em 8080 respondendo 200, /api/health 200 com
  banco ok, e um GET autenticado em /api/eventos devolvendo 24 eventos do PostgreSQL. Zero
  linha de erro no log dos tres. Em maquina SEM cache de imagem continua NAO verificado — e
  a unica pendencia de medicao que sobra.
  As tres divergencias entre o contrato e a implementacao que o CP6 declarava estao
  FECHADAS em 2026-09-11, e o registro de cada uma ficou em docs/21-api-contrato.md §6:
  a rota do codigo de convite (o YAML dizia GET, a API implementa POST — o YAML mudou),
  o status do webhook de pagamento (o YAML dizia 201, a API responde 200 — o YAML mudou)
  e o tipo ResultadoLogin (o codigo mudou: ResultadoLoginApi foi removido e a API importa
  TokensDeSessao do pacote). Seguem abertas outras duas, menores e nomeadas: 429 ausente
  em duas rotas de escrita do feed, e excluido_em fora do schema.
  Tudo isso esta em docs/24-checklist-entrega-cp6.md com o comando que reproduz.
```

---

## 5. Criar e usar o quadro do Trello

### 5.1. Importar — escolha **um** caminho

| Caminho | Arquivo | Conferido em 2026-09-10 |
|---|---|---|
| **Board export (JSON)** — o mais rápido | [`../09-trello/trello-import.json`](../09-trello/trello-import.json) | JSON válido: **7 listas, 32 cards, 18 labels**, com `desc`, `idList`, `idLabels` e `pos` por card |
| Planilha (CSV) | [`../09-trello/trello-import.csv`](../09-trello/trello-import.csv) | **32 linhas** em UTF-8, colunas `Lista · Card · Descrição · Responsável · Labels · Estimativa · Sprint · Due date` — aceito por Trello, Notion e Jira |
| Manual, ~10 min | [`../09-trello/criar-quadro.md`](../09-trello/criar-quadro.md) | Roteiro passo a passo com o texto pronto de cada card |
| Via API REST | [`../09-trello/criar-quadro.sh`](../09-trello/criar-quadro.sh) | Chave e token lidos de variável de ambiente — **nenhum segredo versionado** |

O desenho do quadro (listas, regra de entrada, limite de WIP, labels, DoR, DoD e a carga
por integrante) está em [`../09-trello/quadro.md`](../09-trello/quadro.md).

### 5.2. Depois de importar — **é isto que fecha o critério**

Importar sozinho **não fecha nada**. O enunciado fala em *uso real da ferramenta*, e essa é
a pendência que se repete pelo terceiro checkpoint seguido.

- [ ] **Convidar os 5 colegas** para o quadro
- [ ] **Mover para `Done`** os cards já concluídos das Sprints 1 a 3
- [ ] **Comentar em pelo menos 5 cards** com o link do commit ou do PR correspondente
- [ ] **Mover de volta ao Backlog, com comentário**, o que escorregou de checkpoint
- [ ] **Usar durante a semana**, não só no dia da entrega — o histórico do card é o que se vê
- [ ] **Salvar o print do quadro em uso** em `docs/09-trello/evidencia.png`
- [ ] **Copiar o link do quadro** e substituir `⟨TRELLO⟩` nas seções 2, 3 e 4

O penúltimo item é o único que produz artefato versionado, e ele **não existe hoje**:
`docs/09-trello/evidencia.png` está ausente do repositório. É a única lacuna de arquivo que
sobrou nos três checkpoints.

---

## 6. Gravar os três vídeos

| CP | Duração | Roteiro | Deck (fonte) | Deck publicado |
|---|---|---|---|---|
| CP4 | 2:00 | **[`../15-video-roteiro.md`](../15-video-roteiro.md)** | [`../15-video-slides.html`](../15-video-slides.html) | [/slides/](https://lukiin-z.github.io/campus/slides/) |
| CP5 | 2:00 | **[`../20-video-cp5-roteiro.md`](../20-video-cp5-roteiro.md)** | [`../20-video-cp5-slides.html`](../20-video-cp5-slides.html) | [/slides-cp5/](https://lukiin-z.github.io/campus/slides-cp5/) |
| CP6 | 3:00 | **[`../25-video-cp6-roteiro.md`](../25-video-cp6-roteiro.md)** | [`../25-video-cp6-slides.html`](../25-video-cp6-slides.html) | [/slides-cp6/](https://lukiin-z.github.io/campus/slides-cp6/) |

**Cada roteiro já traz**, conferido arquivo por arquivo: storyboard cronometrado com hora de
início e fim, o texto falado palavra por palavra, quem dos 6 integrantes fala cada bloco, o
que aparece na tela em cada instante (com notação de corte, zoom, toque e slide), a direção
bloco a bloco, o preparo obrigatório antes da tomada e o plano B de cada fluxo.

**Não há nada a escrever antes de gravar.** Falta as 6 pessoas, a tela compartilhada e — no
CP6 — a stack subindo ao vivo (`docker compose up`).

Depois de subir cada vídeo como link **não listado**, cole a URL em dois lugares: no texto
de submissão do CP correspondente (seções 2, 3 e 4 desta página) e na tabela
["O que foi entregue em cada checkpoint"](../../README.md#o-que-foi-entregue-em-cada-checkpoint)
do README.

---

## 7. Os marcadores que faltam preencher

Quatro nomes, e são sempre estes — `⟨TRELLO⟩`,
`⟨VIDEO_CP4⟩`, `⟨VIDEO_CP5⟩`,
`⟨VIDEO_CP6⟩` — mais `⟨TURMA⟩` no README, que
não é link e sim o número da turma, que não está registrado em lugar nenhum do repositório.

Para reconferir a qualquer momento:

```bash
grep -rn "⟨" --include="*.md" . | grep -v node_modules
```

Saída em 2026-09-11 (a listagem abaixo não se inclui):

```
$ grep -rn "⟨" --include="*.md" . | grep -v node_modules

README.md:22:**Instituição:** FIAP · **Professor:** Hercules Ramos · **Turma:** ⟨TURMA⟩
README.md:52:| **CP4**<br>concepção | Documentação (43 RF, 22 RNF, 25 regras), 12 diagramas UML, identidad...
README.md:53:| **CP5**<br>protótipo | 12 rotas navegáveis com dados mockados: login, onboarding, inscrição...
README.md:54:| **CP6**<br>entrega final | API NestJS sobre PostgreSQL, 43 operações, capacidade garantida ...
docs/16-checklist-entrega-cp4.md:193:já preenchidos e os marcadores `⟨…⟩` que faltam nomeados um a um.
docs/19-checklist-entrega-cp5.md:262:já preenchidos e os marcadores `⟨…⟩` que faltam nomeados um a um.
docs/24-checklist-entrega-cp6.md:492:já preenchidos e os marcadores `⟨…⟩` que faltam nomeados um a um.
docs/entrega/README.md:14:**Faltam quatro links, e só eles.** Estão marcados com `⟨…⟩` no texto,
docs/entrega/README.md:25:| 1 | Criar o quadro do Trello e **usá-lo** | `⟨TRELLO⟩` + `docs/09-trello/evidencia.png` | [...
docs/entrega/README.md:26:| 2 | Gravar os três vídeos e subir como não listados | `⟨VIDEO_CP4⟩`, `⟨VIDEO_CP5⟩`, `⟨VIDEO...
docs/entrega/README.md:53:Trello ............... ⟨TRELLO⟩
docs/entrega/README.md:54:Vídeo (2 min) ........ ⟨VIDEO_CP4⟩
docs/entrega/README.md:109:Trello ............... ⟨TRELLO⟩
docs/entrega/README.md:110:Vídeo (2 min) ........ ⟨VIDEO_CP5⟩
docs/entrega/README.md:197:Trello ............... ⟨TRELLO⟩
docs/entrega/README.md:198:Video (3 min) ........ ⟨VIDEO_CP6⟩
docs/entrega/README.md:297:- [ ] **Copiar o link do quadro** e substituir `⟨TRELLO⟩` nas seções 2, 3 e 4
docs/entrega/README.md:330:Quatro nomes, e são sempre estes — `⟨TRELLO⟩`,
docs/entrega/README.md:331:`⟨VIDEO_CP4⟩`, `⟨VIDEO_CP5⟩`,
docs/entrega/README.md:332:`⟨VIDEO_CP6⟩` — mais `⟨TURMA⟩` no README, que
docs/entrega/README.md:338:grep -rn "⟨" --include="*.md" . | grep -v node_modules
```

---

## 8. O que depende de pessoa mas não é entregável

Ficam aqui para não se perderem: são medições que o repositório declara como **não
medidas**, e nenhuma se resolve por comando.

| Item | Por que depende de pessoa | Onde está declarado |
|---|---|---|
| 🚨 **Religar o GitHub Pages no modo `GitHub Actions`** | É configuração do repositório, e **bloqueia a entrega**: em 2026-09-11 o site publicado serve o `README.md` renderizado pelo Jekyll, e `/styleguide/`, `/prototipo/` e os três decks respondem **404**. O artefato do deploy está correto — o que está errado é a origem. `Settings → Pages → Source: GitHub Actions`, ou `gh api -X PUT repos/lukiin-z/campus/pages -f build_type=workflow`, e depois refazer o deploy | [`README.md`](../../README.md#ver-funcionando-agora) |
| Validação com 5 alunos reais (RNF-005, RNF-001) | 5 pessoas, 15 min cada | [`02-requisitos.md`](../02-requisitos.md) |
| Os 6 breakpoints de RNF-018 | Não há teste de layout; é olhar tela. O E2E prova um (390×844) | [`02-requisitos.md`](../02-requisitos.md) |
| `docker compose up` em máquina **sem cache de imagem** | Precisa de outra máquina; na do grupo a imagem já está em cache | [`24-checklist-entrega-cp6.md` §3](../24-checklist-entrega-cp6.md#3-estado-real-das-verificações) |
| Execução em macOS e Linux | Tudo rodou em Windows. A CI cobre Linux para lint, tipo, teste, integração e E2E — **não** para `docker compose` | [`17-jornada.md`](../17-jornada.md) |
| Ligar a proteção da branch `main` | É configuração do GitHub: Settings → Branches → Add branch ruleset. Medido em 2026-09-10: `protected=false` | [`CONTRIBUTING.md` §2](../../CONTRIBUTING.md) |

> **Saiu desta lista em 2026-09-11:** *"as três correções de contrato do CP6"*. As três
> foram fechadas — o veredito e a medição de cada uma estão em
> [`21-api-contrato.md` §6](../21-api-contrato.md#6-divergências-abertas-entre-o-contrato-e-o-resto).
