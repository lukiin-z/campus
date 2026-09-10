# O que só pessoa faz

**Apurado em:** 2026-09-10 · **Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)

Esta página existe porque três entregáveis dos CP4, CP5 e CP6 **não podem ser produzidos por
comando**: gravar vídeo, usar o Trello e submeter no Teams. Para cada um, o insumo já está
escrito e conferido — o que falta é a pessoa.

A regra desta página é estreita de propósito: **ela não repete o insumo, ela aponta para o
único lugar onde ele vive.** Duplicar um board de 32 cards ou um roteiro de 465 linhas
garante que as duas cópias divirjam, e aí nenhuma das duas é confiável.

---

## 1. Gravar os vídeos

| CP | Duração | Roteiro | Deck | Publicado em |
|---|---|---|---|---|
| CP4 | 2:00 | [`15-video-roteiro.md`](../15-video-roteiro.md) | [`15-video-slides.html`](../15-video-slides.html) | [/slides/](https://lukiin-z.github.io/campus/slides/) — **200** |
| CP5 | 2:00 | [`20-video-cp5-roteiro.md`](../20-video-cp5-roteiro.md) | [`20-video-cp5-slides.html`](../20-video-cp5-slides.html) | [/slides-cp5/](https://lukiin-z.github.io/campus/slides-cp5/) — **200** |
| CP6 | 3:00 | [`25-video-cp6-roteiro.md`](../25-video-cp6-roteiro.md) | [`25-video-cp6-slides.html`](../25-video-cp6-slides.html) | [/slides-cp6/](https://lukiin-z.github.io/campus/slides-cp6/) — **200** |

**O que cada roteiro já traz, conferido arquivo por arquivo:** storyboard cronometrado em
blocos com hora de início e fim, o texto falado palavra por palavra, quem dos 6 integrantes
fala cada bloco, **o que aparece na tela em cada instante** (com a notação de corte, zoom,
toque e slide), a direção bloco por bloco, o preparo obrigatório antes da tomada e o plano B
de cada fluxo.

**Não há nada a escrever antes de gravar.** O que falta são as 6 pessoas, a tela
compartilhada e — no CP6 — a stack subindo ao vivo (`docker compose up`).

Depois de subir como link não listado, cole a URL em dois lugares: no texto de submissão do
checklist do checkpoint e na tabela "Como ver funcionando" do [`README.md`](../../README.md).

---

## 2. Criar e usar o quadro do Trello

O quadro está pronto para importar, por **três caminhos redundantes** — escolha um:

| Caminho | Arquivo | Conferido em 2026-09-10 |
|---|---|---|
| Board export (JSON) | [`../09-trello/trello-import.json`](../09-trello/trello-import.json) | JSON válido: **7 listas, 32 cards, 18 labels**, com `desc`, `idList`, `idLabels` e `pos` por card |
| Planilha (CSV) | [`../09-trello/trello-import.csv`](../09-trello/trello-import.csv) | **32 linhas** em UTF-8, colunas `Lista · Card · Descrição · Responsável · Labels · Estimativa · Sprint · Due date` — aceito por Trello, Notion e Jira |
| Manual, ~10 min | [`../09-trello/criar-quadro.md`](../09-trello/criar-quadro.md) | Roteiro passo a passo com o texto pronto de cada card |
| Via API REST | [`../09-trello/criar-quadro.sh`](../09-trello/criar-quadro.sh) | Chave e token lidos de variável de ambiente — **nenhum segredo versionado** |

O desenho do quadro (listas, regra de entrada, limite de WIP, labels, DoR, DoD e a carga por
integrante) está em [`../09-trello/quadro.md`](../09-trello/quadro.md).

**Importar não fecha o critério.** O enunciado fala em *uso real da ferramenta*, e isso é o
que ainda falta — em três checkpoints seguidos:

- [ ] Convidar os 5 colegas
- [ ] Mover para **Done** os cards já concluídos das Sprints 1 a 3
- [ ] Comentar em pelo menos 5 cards com o link do commit ou do PR
- [ ] Mover de volta ao Backlog, **com comentário**, o que escorregou de checkpoint
- [ ] Usar o quadro durante a semana, não só no dia da entrega
- [ ] Salvar o print do quadro **em uso** em `docs/09-trello/evidencia.png`

O último item é o único que produz artefato versionado, e ele **não existe hoje**:
`docs/09-trello/evidencia.png` está ausente do repositório. É a única lacuna de arquivo que
sobrou nos três checkpoints.

---

## 3. Submeter no Teams

O texto de submissão está escrito e pronto em cada checklist, com a equipe, os RM, os links
e o mapa de onde cada critério é atendido:

| CP | Texto pronto |
|---|---|
| CP4 | [`16-checklist-entrega-cp4.md` §5](../16-checklist-entrega-cp4.md#5-o-que-entregar-no-teams) |
| CP5 | [`19-checklist-entrega-cp5.md` §5](../19-checklist-entrega-cp5.md#5-o-que-entregar-no-teams) |
| CP6 | [`24-checklist-entrega-cp6.md` §5](../24-checklist-entrega-cp6.md#5-o-que-entregar-no-teams) |

Em cada um sobram **dois** marcadores `⟨…⟩` para preencher: o link do quadro do Trello e o
link do vídeo. Os dois só existem depois das seções 1 e 2 desta página — é essa a ordem, e
não há como invertê-la.

---

## 4. O que depende de pessoa mas não é entregável

Ficam aqui para não se perderem: são medições que o repositório declara como **não medidas**,
e nenhuma delas se resolve por comando.

| Item | Por que depende de pessoa | Onde está declarado |
|---|---|---|
| Validação com 5 alunos reais (RNF-005, RNF-001) | 5 pessoas, 15 min cada | [`02-requisitos.md`](../02-requisitos.md) |
| Os 6 breakpoints de RNF-018 | Não há teste de layout; é olhar tela. O E2E prova um (390×844) | [`02-requisitos.md`](../02-requisitos.md) |
| `docker compose up` em máquina **sem cache de imagem** | Precisa de outra máquina; na do grupo a imagem já está em cache | [`24-checklist-entrega-cp6.md` §3](../24-checklist-entrega-cp6.md#3-estado-real-das-verificações) |
| Execução em macOS e Linux | Tudo rodou em Windows. A CI cobre Linux para lint, tipo, teste, integração e E2E — **não** para `docker compose` | [`17-jornada.md`](../17-jornada.md) |
| As três correções de contrato do CP6 | É decisão de contrato: mudar o YAML ou mudar o código | [`24-checklist-entrega-cp6.md` §4](../24-checklist-entrega-cp6.md#4-checklist-operacional-de-submissão) |
