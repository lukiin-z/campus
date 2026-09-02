# Roteiro do vídeo de apresentação — 2 minutos

**Responsável pelo roteiro:** João Viviani Baldini (RM558596), Product Owner ·
**Duração alvo:** 2:00 (tolerância −5 s / +0 s) ·
**Base de texto:** [`07-pitch.md`](07-pitch.md) — o one-liner do fecho e o gancho vêm de lá.

Premissa de ritmo adotada pelo grupo: **150 palavras por minuto** de fala clara em
português. Logo, o vídeo inteiro tem **300 palavras faladas**, e cada bloco tem um
orçamento fixo de palavras. Passar do orçamento é estourar o tempo — não existe "falar
mais rápido".

Regras de escrita do texto falado, seguidas em todos os blocos:

1. Frase curta. Uma ideia por frase. Nenhuma oração subordinada longa.
2. Nenhuma sigla sem explicação. `QR Code` fica; "RF-011", "FIFO", "MoSCoW" e "CRUD" não
   são ditos em voz alta.
3. Nenhum número de requisito falado. Requisito aparece na tela, não na boca.
4. Nenhuma frase lida do slide. O que está na tela é diferente do que é falado.
5. Dados sempre do seed do projeto: Marina, turma 3ESPX, churrasco de R$ 25,00, 18 de 40
   vagas, Hackathon 80 de 80. Nada inventado na hora.

---

## 1. Roteiro palavra por palavra

### 0:00–0:15 · Abertura e equipe — 38 palavras

> Boa tarde. Somos o grupo do Campus, do terceiro ano de Engenharia de Computação. Eu sou
> o João, Product Owner. Comigo estão Lucas Zolla, Ronaldo, Ana Luiza, Vitor e Lucas
> Baraldi. Vamos mostrar o projeto em dois minutos.

*Direção:* câmera, não tela. Diga os cinco nomes olhando para a lente, sem pressa nos
nomes — é a única vez que eles aparecem falados.

### 0:15–0:40 · Problema e persona — 60 palavras

> Eu sou o Lucas Zolla, requisitos. Pense na Marina, terceiro ano, turma 3ESPX. O
> churrasco da turma dela nasce num story que expira. A lista de presença é uma planilha.
> O pagamento é um Pix na conta pessoal do representante. Ela descobre tarde, ou não
> descobre. Levantamos quarenta e três requisitos funcionais e vinte e cinco regras de
> negócio escritas.

*Direção:* as três frases do meio têm a mesma cadência e nenhum conectivo. É a lista de
falhas, não uma explicação. Só a última frase muda o tom.

### 0:40–1:10 · Solução, protótipo e styleguide — 75 palavras

> Ana Luiza, designer. Esta é a tela inicial da Marina. Aparece só o que é da turma, do
> curso e da faculdade dela. O churrasco: dezoito de quarenta vagas, vinte e cinco reais,
> um toque para se inscrever. O Hackathon lotou, e o botão vira lista de espera.
> Marina é a sétima da fila. O ingresso tem QR Code. Cor, tipografia e componentes vêm do
> styleguide, com o mesmo nome no Figma e no código.

*Direção:* é o bloco mais longo e o mais importante. A mão fica no mouse: cada frase
corresponde a um clique. Não narre o clique ("agora eu clico aqui") — narre o resultado.

### 1:10–1:25 · Modelagem — 38 palavras

> Ronaldo, modelagem. Vinte e três casos de uso e sete diagramas: classes, estados, dados,
> sequência. Este é o ciclo de vida da participação. Da lista de espera para oferta
> pendente. De oferta para confirmada, só com pagamento aprovado.

*Direção:* o dedo acompanha as setas do diagrama de estados enquanto a frase é dita. Se o
diagrama não estiver legível na tela, o bloco perde a função — dar zoom antes, não durante.

### 1:25–1:35 · Arquitetura — 25 palavras

> Lucas Baraldi, arquitetura. Regra de negócio, dados e tela são camadas separadas. Hoje
> os dados são simulados. Trocar por servidor real não muda nenhuma tela.

*Direção:* mostrar o diagrama de componentes, não código. Se aparecer editor de código,
o bloco vira demonstração técnica e perde o público.

### 1:35–1:50 · Organização do time — 38 palavras

> Vitor, scrum master. Três sprints no Trello, trinta e dois cards, cada um com critério de
> aceite. No GitHub, um repositório com documentação, protótipo e verificação automática a
> cada envio. Cada artefato tem um responsável e um revisor.

*Direção:* rolar o quadro do Trello uma vez, devagar, e cortar para a árvore do
repositório. Duas telas, dois movimentos, nada mais.

### 1:50–2:00 · Fecho — 26 palavras

> Campus é o app onde o evento já nasce sabendo para quem ele é: sua turma, seu curso, sua
> faculdade. Com vagas, fila e check-in. Obrigado.

*Direção:* volta para a câmera. O one-liner é a última coisa falada e não muda uma palavra
em relação a [`07-pitch.md`](07-pitch.md) §1.

### Fechamento de conta

| Bloco | Tempo | Duração | Palavras | Palavras/min |
|---|---|---|---|---|
| Abertura e equipe | 0:00–0:15 | 15 s | 38 | 152 |
| Problema e persona | 0:15–0:40 | 25 s | 60 | 144 |
| Solução, protótipo, styleguide | 0:40–1:10 | 30 s | 75 | 150 |
| Modelagem | 1:10–1:25 | 15 s | 38 | 152 |
| Arquitetura | 1:25–1:35 | 10 s | 25 | 150 |
| Organização do time | 1:35–1:50 | 15 s | 38 | 152 |
| Fecho | 1:50–2:00 | 10 s | 26 | 156 |
| **Total** | **0:00–2:00** | **120 s** | **300** | **150** |

Soma das durações: 15 + 25 + 30 + 15 + 10 + 15 + 10 = **120 segundos**. Soma das palavras:
38 + 60 + 75 + 38 + 25 + 38 + 26 = **300**.

---

## 2. Escalação — quem fala cada bloco

Todos os 6 integrantes falam. A regra da escalação é uma só: **quem produziu o artefato é
quem o apresenta.** Papéis conforme
[`10-equipe-e-papeis.md`](10-equipe-e-papeis.md).

| Bloco | Tempo | Duração | Quem fala | RM | Por que essa pessoa |
|---|---|---|---|---|---|
| Abertura e equipe | 0:00–0:15 | 15 s | João Viviani Baldini | RM558596 | Product Owner: dono da proposta de valor, abre e fecha o vídeo |
| Problema e persona | 0:15–0:40 | 25 s | Lucas Zolla | RM557952 | Analista de Requisitos: escreveu o problema, as personas e os 43 requisitos |
| Solução, protótipo e styleguide | 0:40–1:10 | 30 s | Ana Luiza Dourado | RM558793 | UX/UI Designer: desenhou as telas no Figma e a identidade visual |
| Modelagem | 1:10–1:25 | 15 s | Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML: produziu os 7 diagramas e os 23 casos de uso |
| Arquitetura | 1:25–1:35 | 10 s | Lucas Baraldi | RM555407 | Tech Lead / Arquiteto: definiu camadas, mocks e a fronteira de troca por servidor real |
| Organização do time | 1:35–1:50 | 15 s | Vitor Pantarotto | RM554961 | Scrum Master / QA: montou o quadro do Trello, as sprints e o plano de testes |
| Fecho | 1:50–2:00 | 10 s | João Viviani Baldini | RM558596 | Fecha com o pitch de uma frase, que é artefato dele |

**Conferência:** 15 + 25 + 30 + 15 + 10 + 15 + 10 = **120 s = 2:00**. Seis integrantes,
sete blocos (João fala em dois: abertura e fecho).

Regra de transição entre blocos: cada pessoa começa dizendo o **primeiro nome e o papel**,
em duas palavras. Isso resolve o critério "citar os papéis" sem gastar tempo com
apresentação formal.

---

## 3. Storyboard

Legenda de captura: **[T]** gravação de tela · **[C]** câmera (webcam) · **[Z]** zoom ou
recorte na gravação de tela · **[X]** corte seco entre fontes.

| Tempo | Fala (resumo) | O que aparece na tela | Captura |
|---|---|---|---|
| 0:00–0:08 | Quem somos, curso e ano | Os 6 integrantes enquadrados (webcam ou mosaico de 6 janelas de chamada), com a logo `docs/06-marca/assets/logo-horizontal.svg` no canto | **[C]** plano fixo, sem movimento |
| 0:08–0:15 | Nomes e papéis, "em dois minutos" | Mesma imagem, com os 6 nomes e RMs entrando como legenda estática | **[C]** + legenda |
| 0:15–0:25 | Marina, turma 3ESPX | Persona 1 de [`01-problema-e-personas.md`](01-problema-e-personas.md) §3 na tela: nome, curso, turma, uma dor | **[X]** para **[T]** do arquivo aberto no GitHub |
| 0:25–0:33 | Story, planilha, Pix | Três imagens lado a lado: print de story expirado, planilha de nomes, tela de Pix — todos com dado fictício do seed | **[T]** com **[Z]** em cada terço |
| 0:33–0:40 | "Quarenta e três requisitos, vinte e cinco regras" | Tabela de [`02-requisitos.md`](02-requisitos.md) rolando, e depois [`04-regras-de-negocio.md`](04-regras-de-negocio.md) | **[T]** rolagem única, sem zoom |
| 0:40–0:47 | Tela inicial da Marina | Figma, página **Telas**, tela `Feed` (rota `/`) do protótipo navegável — link no arquivo `docs/06-marca/guia-figma.md` | **[X]** para **[T]** no protótipo do Figma |
| 0:47–0:56 | Churrasco: 18/40, R$ 25,00, 1 toque | Tela `Detalhe do evento` com `evt-001` — Churrasco de encerramento do semestre, 18/40 vagas | **[Z]** na barra de ocupação e no botão principal |
| 0:56–1:04 | Hackathon lotado, fila, 7ª posição | Tela `Detalhe do evento` com `evt-002` — Hackathon Campus 48h, 80/80, botão de lista de espera; depois tela `Ingresso` com o código `CMP-3ESPX-0184` e o QR Code | **[T]** dois cliques + **[Z]** no cartão-ingresso picotado |
| 1:04–1:10 | Cor, tipografia, componentes | `docs/06-marca/styleguide.html` aberto no navegador: paleta coral e teal, escala tipográfica, cartão-ingresso | **[X]** para **[T]**, rolagem única |
| 1:10–1:18 | 23 casos de uso, 7 diagramas | [`05-modelagem/README.md`](05-modelagem/README.md) — tabela do índice dos 7 diagramas | **[X]** para **[T]** |
| 1:18–1:25 | Ciclo de vida da participação | [`05-modelagem/06-diagrama-estados.md`](05-modelagem/06-diagrama-estados.md) renderizado no GitHub: os 8 estados de `Participacao` | **[Z]** nas transições `LISTA_ESPERA` → `OFERTA_PENDENTE` → `CONFIRMADA` |
| 1:25–1:35 | Camadas e troca do mock | [`05-modelagem/07-diagrama-componentes.md`](05-modelagem/07-diagrama-componentes.md): camadas do app e a fronteira de dados simulados | **[T]** parado, com **[Z]** na fronteira |
| 1:35–1:43 | 3 sprints, 32 cards, critério de aceite | Quadro do Trello do projeto (listas e cards; instruções em `docs/09-trello/quadro.md`) | **[X]** para **[T]**, rolagem horizontal única |
| 1:43–1:50 | Repositório e verificação automática | https://github.com/lukiin-z/campus — árvore de pastas `docs/`, `app/`, `prototype/`, e a aba **Actions** com o último check verde | **[T]** + **[Z]** no ícone verde |
| 1:50–2:00 | One-liner e agradecimento | Volta para os 6 na câmera; o one-liner entra como legenda de uma linha; último quadro com a logo e o endereço https://lukiin-z.github.io/campus/ | **[X]** para **[C]**, corte final em 2:00 |

Duas proibições no storyboard: **nenhum editor de código na tela** (nem terminal), e
**nenhuma tela com dado pessoal real** — todo nome exibido é do seed do projeto.

---

## 4. Checklist de gravação

### 4.1 Ferramenta (todas gratuitas)

| Uso | Opção | Observação |
|---|---|---|
| Gravar tela + voz | **OBS Studio** | Grava tela e microfone em faixas separadas — permite refazer só o áudio |
| Gravar tela (rápido) | **Xbox Game Bar** (`Win` + `G`, Windows) | Já vem instalado; grava a janela ativa |
| Gravar a câmera | Aplicativo **Câmera** do Windows, ou celular na horizontal | Celular na horizontal, apoiado; nunca na vertical |
| Editar e cortar | **Clipchamp** (vem com o Windows), **DaVinci Resolve** ou **CapCut** | Só corte e legenda; sem transição animada |
| Cronometrar o ensaio | Cronômetro do celular | Um bloco por vez, não o vídeo inteiro |

### 4.2 Imagem

- Resolução **1920 × 1080**, **30 fps**, arquivo `.mp4`.
- Navegador em tela cheia (`F11`), zoom da página em **125%** para o texto ficar legível.
- Cursor grande e realce de clique ligados (Windows: Configurações → Acessibilidade →
  Ponteiro do mouse).
- Modo de foco ligado: nenhuma notificação pode aparecer na gravação.
- Tema claro no navegador e no editor — os tokens de cor da marca foram verificados em
  tema claro (ver [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) §4).

### 4.3 Áudio

- Fone **com microfone** (o microfone do notebook capta o ventilador e a sala).
- Ambiente sem eco: quarto com cama e cortina; evitar cozinha, corredor e sala vazia.
- **Teste de 10 segundos antes de cada bloco:** gravar, ouvir com fone, conferir volume,
  chiado e estouro. Só depois gravar o bloco.
- Distância constante do microfone: um palmo, fora do caminho da respiração.
- Um bloco por arquivo, com o nome do arquivo igual ao do bloco (`bloco-3-solucao.mp4`).

### 4.4 Ordem de gravação

Gravar **por bloco**, nunca em uma tomada única. Ordem recomendada, do mais difícil para o
mais fácil:

1. Bloco 3 (0:40–1:10, Ana Luiza) — é o mais longo e depende de navegação; refazer é normal.
2. Bloco 4 (1:10–1:25, Ronaldo) e bloco 5 (1:25–1:35, Lucas Baraldi) — dependem de zoom no
   diagrama certo.
3. Bloco 2 (0:15–0:40, Lucas Zolla).
4. Bloco 6 (1:35–1:50, Vitor).
5. Blocos 1 e 7 (câmera, João) — gravar por último, quando o tom do vídeo já está definido.

Cada bloco tem no máximo **3 tomadas**. Se a quarta for necessária, o texto está errado —
corte palavra, não grave de novo.

### 4.5 Abas e arquivos abertos antes de começar

Deixar exatamente estes itens abertos, nesta ordem, e nada além disso:

1. Protótipo navegável no Figma — arquivo do grupo, página **Telas** (link em
   `docs/06-marca/guia-figma.md`).
2. `docs/06-marca/styleguide.html` aberto no navegador (arquivo local).
3. https://github.com/lukiin-z/campus — árvore do repositório na página inicial.
4. https://github.com/lukiin-z/campus/actions — aba **Actions**, último check verde.
5. `docs/05-modelagem/README.md` no GitHub (tabela dos 7 diagramas).
6. `docs/05-modelagem/06-diagrama-estados.md` no GitHub, já com o diagrama renderizado e
   rolado até o ciclo de vida de `Participacao`.
7. `docs/05-modelagem/07-diagrama-componentes.md` no GitHub, renderizado.
8. `docs/01-problema-e-personas.md` no GitHub, rolado até a Persona 1 (Marina).
9. `docs/02-requisitos.md` e `docs/04-regras-de-negocio.md` no GitHub.
10. Quadro do Trello do projeto, na visão de listas.
11. https://lukiin-z.github.io/campus/ — apenas para o quadro final.

Fechar tudo o mais: e-mail, mensageiro, aba de banco, aba pessoal. Se aparecer na
gravação, precisa regravar.

### 4.6 Publicação

1. Subir no **YouTube** como **"Não listado"** (não "Privado" — privado exige login e o
   professor não consegue abrir; não "Público" — o vídeo é trabalho de disciplina).
2. Título: `Campus — Engenharia de Software CP4 — FIAP 3º ano`.
3. Descrição: one-liner, os 6 nomes com RM, link do repositório e link do GitHub Pages.
4. Colar o link em **dois** lugares: no `README.md` da raiz do repositório, em seção
   própria, e na entrega do **Teams** da disciplina.
5. Conferir o link em janela anônima, sem estar logado, antes de entregar.

---

## 5. Erros que mais custam nota

| Erro | Por que custa | Como evitar |
|---|---|---|
| **Ler o slide em voz alta** | A banca lê mais rápido do que você fala; ler zera o valor da narração | O texto falado deste roteiro nunca repete o texto da tela |
| **Estourar o tempo** | Corte em 2:00 significa terminar sem o fecho e sem o pitch — perde-se justamente o critério de proposta de valor | Orçamento de palavras por bloco, medido no ensaio |
| **Mostrar código em vez de resultado** | Código não é entregável do CP4, e ocupa o tempo do que é avaliado | Nenhum editor e nenhum terminal na tela: só protótipo, diagrama, Trello e repositório |
| **Não citar os papéis** | Organização e divisão de trabalho são critério explícito | Cada pessoa abre a fala com o primeiro nome e o papel |
| **Áudio ruim** | Áudio ruim faz a banca parar de ouvir na metade; conteúdo bom não compensa | Fone com microfone e teste de 10 s antes de cada bloco |
| **Integrante que não aparece** | Vídeo com 3 falantes sugere grupo com 3 pessoas trabalhando | A escalação da seção 2 tem os 6 nomes; conferir antes de exportar |
| **Dado inventado na hora** | Número na fala que não bate com o documento cria dúvida sobre o resto | Só dado do seed: 18/40, 80/80, R$ 25,00, 3ESPX |
| **Mouse errante e zoom ausente** | Diagrama ilegível em tela de celular vira tempo perdido | Zoom preparado antes da tomada, movimento único por bloco |

---

## 6. Ensaio

### 6.1 Como cronometrar

1. **Ensaio individual, em voz alta, com cronômetro.** Cada pessoa cronometra **só o
   próprio bloco**, três vezes, e anota os três tempos.
2. **Calcular o ritmo real:** palavras do bloco ÷ segundos gastos × 60 = palavras por
   minuto. Se der acima de 165, você está correndo e a banca não acompanha; abaixo de 135,
   o bloco não cabe no tempo.
3. **Ajustar por corte, nunca por velocidade.** Bloco longo se resolve tirando palavra.
4. **Ensaio conjunto, uma vez, na ordem do vídeo,** com um cronômetro só. Anotar em que
   segundo cada bloco começou de verdade e comparar com a tabela da seção 1.
5. **Meta do ensaio conjunto:** terminar entre 1:52 e 1:58. Terminar exatamente em 2:00 no
   ensaio significa estourar na gravação.

Planilha mínima do ensaio (uma linha por pessoa, três colunas de tempo):

| Bloco | Responsável | Orçamento | Tomada 1 | Tomada 2 | Tomada 3 | Palavras/min real |
|---|---|---|---|---|---|---|
| 1 | João | 15 s / 38 palavras | | | | |
| 2 | Lucas Zolla | 25 s / 60 palavras | | | | |
| 3 | Ana Luiza | 30 s / 75 palavras | | | | |
| 4 | Ronaldo | 15 s / 38 palavras | | | | |
| 5 | Lucas Baraldi | 10 s / 25 palavras | | | | |
| 6 | Vitor | 15 s / 38 palavras | | | | |
| 7 | João | 10 s / 26 palavras | | | | |

### 6.2 O que cortar primeiro, se estourar

Ordem de corte. Cortar de cima para baixo, uma linha por vez, medindo de novo depois de
cada corte.

| Ordem | O que sai | Ganho | Custo |
|---|---|---|---|
| 1 | "Vamos mostrar o projeto em dois minutos" (bloco 1) | ~3 s | Nenhum: é frase de anúncio, não de conteúdo |
| 2 | A enumeração "classes, estados, dados, sequência" (bloco 4) vira "sete diagramas" | ~2 s | Pequeno: o índice dos diagramas está na tela |
| 3 | "Ela descobre tarde, ou não descobre" (bloco 2) | ~2 s | Pequeno: a dor já ficou clara nas três frases anteriores |
| 4 | "Hoje os dados são simulados" (bloco 5) | ~2 s | Médio: perde o gancho para a pergunta sobre servidor real |
| 5 | "O ingresso tem QR Code" (bloco 3) | ~2 s | Alto: o check-in é diferencial; só cortar em último caso |

**O que nunca é cortado, em nenhuma hipótese:** os 6 nomes com os papéis; a frase de
alcance ("turma, do curso e da faculdade dela"); vagas e lista de espera; a menção ao
Trello e ao repositório; e o one-liner do fecho. São exatamente os itens com peso na
avaliação descrita em [`03-escopo.md`](03-escopo.md) §8.

### 6.3 Conferência final antes de exportar

- [ ] Duração entre 1:52 e 2:00.
- [ ] Os 6 integrantes falam, e cada um diz o próprio papel.
- [ ] Aparecem: protótipo, styleguide, diagrama de estados, diagrama de componentes,
      Trello e repositório.
- [ ] Nenhum editor de código, nenhum terminal, nenhuma notificação, nenhum dado pessoal.
- [ ] Áudio conferido com fone, do começo ao fim, uma vez.
- [ ] O fecho é o one-liner de [`07-pitch.md`](07-pitch.md) §1, palavra por palavra.
- [ ] Link não listado do YouTube testado em janela anônima, colado no `README.md` e
      entregue no Teams.
