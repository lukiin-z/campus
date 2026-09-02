# Quadro do Trello — Campus

**Quadro:** `Campus — Eventos Universitários (FIAP)` · **Responsável pelo quadro:**
Vitor Pantarotto (Scrum Master / QA) · **Visibilidade:** workspace da equipe, link de
leitura para o professor.

Este documento é a fonte da verdade do quadro. Quem cria o quadro segue
[`criar-quadro.md`](criar-quadro.md) (roteiro manual de 10 minutos) ou importa
[`trello-import.json`](trello-import.json) / [`trello-import.csv`](trello-import.csv).
Se quadro e documento divergirem, o quadro é corrigido — não o documento.

Estado descrito aqui: **08/09/2026, após a planning da Sprint 2** — Sprint 1 (CP4)
fechada, Sprint 2 comprometida, Sprint 3 no backlog. Datas das sprints e marcos vêm de
[`../03-escopo.md`](../03-escopo.md); papéis e cerimônias de
[`../10-equipe-e-papeis.md`](../10-equipe-e-papeis.md); DoR/DoD e fluxo de PR de
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## 1. Estrutura do quadro

Sete listas, nesta ordem, da esquerda para a direita. O card só anda para a direita —
exceção única: reprovação em Code Review volta para `Doing`.

| # | Lista | O que entra | Quem move para cá | Limite de WIP |
|---|---|---|---|---|
| 1 | `Backlog` | Toda ideia, requisito ainda não comprometido e defeito recém-descoberto. Ordenado por prioridade MoSCoW, não por data de criação. | João (PO), na criação ou no refinamento | Sem limite |
| 2 | `Sprint Backlog` | Cards comprometidos na planning da sprint, com **DoR 100%** e responsável atribuído. | Vitor (SM), na planning | Capacidade da sprint (ver §9): 12 cards / 81 pts na Sprint 2 |
| 3 | `To Do` | Os próximos 1 ou 2 cards de cada pessoa dentro da sprint corrente. É a fila de puxada. | O próprio responsável, ao terminar o card anterior | **6 cards** (1 por integrante) |
| 4 | `Doing` | Card com branch criada e pelo menos 1 commit. | O responsável, no primeiro commit da branch | **4 cards** (ver justificativa abaixo) |
| 5 | `Code Review` | Card com PR aberto e revisor marcado. | O autor, ao abrir o PR | **3 cards** |
| 6 | `Done` | Card com os 6 itens do DoD (§4) satisfeitos e merge na `main`. | O revisor, depois do merge; aceite do PO em comentário | Sem limite |
| 7 | `Bloqueado` | Card parado por dependência externa, decisão pendente ou impedimento técnico, com o motivo escrito em comentário. | Qualquer integrante — obrigatório após 24h de bloqueio silencioso (regra 2 de convivência, [`../10-equipe-e-papeis.md`](../10-equipe-e-papeis.md)) | **3 cards**; acima disso a planning é reaberta |

### Por que `Doing` é limitado a 4, e não a 6

O time tem 6 pessoas, mas o gargalo não é escrever código: é **revisar**. O
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) exige revisor da área (front/arquitetura →
Baraldi; dados/tipos → Baraldi ou Ronaldo; UI → Ana; requisitos → Zolla; QA → Vitor),
ou seja, 2 a 3 pessoas concentram a revisão. Com 6 cards em `Doing`, os 6 PRs chegam
juntos em `Code Review`, ficam 4 ou 5 dias parados e a sprint termina com meia dúzia de
cards em 80%.

Com o limite em 4:

- ninguém tem mais de **1** card em `Doing` (o limite do time é menor que o número de
  pessoas de propósito);
- quem termina e não pode puxar outro card faz, nesta ordem: revisar PR em
  `Code Review` → destravar card em `Bloqueado` → puxar card de `tipo: teste`;
- card 3 dias em `Doing` sem commit novo é pauta obrigatória da daily.

`Code Review` limitado a 3 fecha o laço: com a fila cheia, revisar passa a ser a única
ação possível.

---

## 2. Labels

Dois eixos independentes. **Todo card tem exatamente 1 label `mod:` e 1 label `tipo:`** —
é item verificável do DoR. Módulo responde "onde mexe", tipo responde "que trabalho é".

### Eixo módulo (11 labels)

| Label | Cor no Trello | Escopo | Requisitos cobertos |
|---|---|---|---|
| `mod: autenticação` | `purple` (roxo) | Cadastro, login, sessão, onboarding de vínculo acadêmico | RF-001..RF-009 |
| `mod: eventos` | `blue` (azul) | Criação, edição, listagem, detalhe, alcance, cancelamento | RF-010..RF-018 |
| `mod: inscrição` | `sky` (azul-claro) | Participação, capacidade, prazos, lista de espera | RF-019..RF-027 |
| `mod: pagamento` | `green` (verde) | Pix, cartão, webhook, reembolso, painel de recebimentos | RF-028..RF-032 |
| `mod: check-in` | `lime` (verde-limão) | Ingresso com QR, validação de presença, lista de presença | RF-033..RF-035 |
| `mod: feed` | `pink` (rosa) | Feed segmentado, publicação de foto, comentário | RF-036..RF-038 |
| `mod: notificações` | `orange` (laranja) | Disparo por evento de domínio e central de notificações | RF-039, RF-040 |
| `mod: administração` | `red` (vermelho) | Aprovação de evento de faculdade, moderação, turmas, permissões | RF-041..RF-043 |
| `mod: design` | `purple_light` (lilás) | Marca, tokens, design system, Figma, acessibilidade | RNF-002..RNF-004, RNF-018 |
| `mod: docs` | `black` (cinza-escuro) | Requisitos, escopo, UML, pitch, plano de testes, manual | — |
| `mod: infra` | `blue_dark` (azul-escuro) | Repositório, CI/CD, Pages, build, PWA, camada de dados | RNF-007, RNF-016, RNF-017 |

### Eixo tipo (7 labels)

| Label | Cor no Trello | Quando aplicar |
|---|---|---|
| `tipo: feature` | `green_dark` (verde-escuro) | Comportamento novo visível para o usuário |
| `tipo: bug` | `red_dark` (vermelho-escuro) | Defeito em algo já entregue. Título no formato `Corrigir <sintoma> em <tela/regra>` |
| `tipo: docs` | `sky_dark` (azul-escuro claro) | Documento, requisito, ADR, manual |
| `tipo: modelagem` | `purple_dark` (roxo-escuro) | Diagrama UML, modelo de dados, dicionário |
| `tipo: design` | `pink_dark` (rosa-escuro) | Marca, tela, componente, token, protótipo |
| `tipo: teste` | `yellow` (amarelo) | Teste unitário, E2E, bateria de casos `CT-0xx`, auditoria |
| `tipo: chore` | `black_light` (cinza-claro) | Build, CI, dependência, configuração, refatoração sem mudança de comportamento |

`tipo: bug` não tem card no pacote inicial — nenhum defeito estava aberto no fechamento
do CP4. Ele existe porque a Sprint 3 é planejada com reserva para os defeitos da
validação com 5 alunos (§8); esses cards nascem direto no `Backlog` com essa label.

---

## 3. Membros

| Integrante | RM | Papel | Iniciais no card | Revisor obrigatório de |
|---|---|---|---|---|
| Ana Luiza Dourado | RM558793 | UX/UI Designer | AD | PR que toca `app/src/components/ui/` |
| João Viviani Baldini | RM558596 | Product Owner | JB | Escopo, prioridade, aceite de card |
| Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | LB | Camada de dados, tipos de domínio, pipeline |
| Lucas Zolla | RM557952 | Analista de Requisitos | LZ | Requisitos e regras de negócio |
| Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | RV | Modelo de dados e diagramas |
| Vitor Pantarotto | RM554961 | Scrum Master / QA | VP | Teste, plano de testes, quadro |

Cards de trabalho conjunto têm 2 membros atribuídos. O **primeiro** membro do card é o
responsável — quem move o card, quem responde na daily e quem aparece na coluna
`Responsável` da §5.

Os `username` usados no pacote de importação (`analuizadourado`, `joaobaldini`,
`lucasbaraldi`, `lucaszolla`, `ronaldoveloso`, `vitorpantarotto`) são **provisórios**:
quem cria o quadro substitui pelo handle real de cada conta no momento do convite.

---

## 4. Definition of Ready e Definition of Done

Versão operacional das listas do [`CONTRIBUTING.md`](../../CONTRIBUTING.md), com a
verificação escrita ao lado. Sem a verificação, DoR e DoD viram slogan.

### Definition of Ready — sai do `Backlog` para o `Sprint Backlog`

| # | Item | Como verificar no card |
|---|---|---|
| 1 | Contexto e valor para o usuário na descrição | Bloco `**Contexto.**` preenchido, citando persona ou ator (Marina, Rafael, Beatriz, organizador, admin) |
| 2 | Critério de aceite em `Dado / Quando / Então` | Bloco `**Critério de aceite.**` com as três palavras presentes |
| 3 | Requisito rastreado | Descrição cita ao menos um `RF-0xx`, `RNF-0xx`, `RN-0xx` ou `CT-0xx` existente em [`../02-requisitos.md`](../02-requisitos.md) / [`../04-regras-de-negocio.md`](../04-regras-de-negocio.md) |
| 4 | Estimativa em pontos Fibonacci (1, 2, 3, 5, 8) | Linha `**Pontos:**` na descrição e campo `Pontos` do Custom Fields |
| 5 | Responsável definido | Ao menos 1 membro atribuído; o primeiro é o responsável |
| 6 | Dependências identificadas e desbloqueadas | Nenhuma dependência `D-0x` de [`../03-escopo.md`](../03-escopo.md) pendente; se houver, o card fica em `Bloqueado`, não no `Sprint Backlog` |

Card sem os 6 itens não entra na sprint. Na planning, o card é devolvido ao `Backlog`
com o item que falta escrito em comentário — não é "quase pronto", é não pronto.

### Definition of Done — sai de `Code Review` para `Done`

| # | Item | Como verificar no card |
|---|---|---|
| 1 | Merge na `main` por PR aprovado por 1 revisor da área, sem `TODO`, `console.log` ou código comentado | Link do PR com selo `Merged` e 1 aprovação; `npm run lint` cobre o resto |
| 2 | `npm run lint`, `npm run test` e `npm run build` verdes no CI do PR | Print ou link do check verde do workflow no comentário |
| 3 | Critério de aceite verificado na branch e o resultado registrado | Comentário com o `Dado/Quando/Então` executado e o que se viu na tela |
| 4 | Teste automatizado cobrindo a regra, quando o card tocar em `RN-0xx` | Nome do teste e o `CT-0xx` correspondente no comentário |
| 5 | Documentação afetada atualizada no mesmo PR | Arquivo de `docs/` na lista de arquivos do PR, ou a frase "nenhuma doc afetada" justificada |
| 6 | Card com link do commit e do PR e checklist 100% | Comentário no formato da §6 e checklist sem item aberto |

**Equivalência com o `CONTRIBUTING.md`:** os 7 itens do documento raiz estão todos aqui —
o item 6 de lá ("sem `TODO`, `console.log` ou código comentado") foi absorvido pelo item
1 desta tabela, porque é verificado no mesmo gate (revisão + lint). Nada foi removido.

---

## 5. Backlog completo — 32 cards em 3 sprints

Sprints alinhadas aos checkpoints ([`../03-escopo.md`](../03-escopo.md) §8):

| Sprint | Checkpoint | Janela | Entrega | Cards | Pontos |
|---|---|---|---|---|---|
| Sprint 1 | CP4 | 18/08/2026 – 05/09/2026 | 08/09/2026 | 12 | 93 |
| Sprint 2 | CP5 | 08/09/2026 – 03/10/2026 | 06/10/2026 | 12 | 81 |
| Sprint 3 | CP6 | 06/10/2026 – 07/11/2026 | 10/11/2026 | 8 | 58 |

### Sprint 1 · CP4 — concepção, documentação e base técnica

Os 12 cards estão em `Done`: o CP4 foi entregue e cada artefato está no repositório.

| ID | Card | Lista inicial | Responsável | Pontos | Sprint | Labels | Requisito | Critério de pronto (DoD específico do card) |
|---|---|---|---|---|---|---|---|---|
| S1-01 | Escrever a declaração de problema, 3 personas e 6 antipersonas | Done | Lucas Zolla (+Ana) | 8 | 1 | `mod: docs`, `tipo: docs` | Personas Marina/Rafael/Beatriz | `01-problema-e-personas.md` no repo com as 3 personas nomeadas (idade, curso, turma, dor, critério de sucesso), 6 antipersonas justificadas e a jornada atual com os 4 problemas da declaração |
| S1-02 | Especificar 43 RF, 22 RNF e 25 regras de negócio com critério de aceite | Done | Lucas Zolla (+João) | 8 | 1 | `mod: docs`, `tipo: docs` | RF-001..RF-043, RNF-001..RNF-022, RN-001..RN-025 | `02-requisitos.md` e `04-regras-de-negocio.md` com todo RF em `Dado/Quando/Então`, prioridade MoSCoW, ator, e as 25 RN rastreadas para `CT-001..CT-031` |
| S1-03 | Classificar os 43 RF em MoSCoW e definir premissas, dependências e marcos | Done | João Viviani Baldini (+Zolla) | 8 | 1 | `mod: docs`, `tipo: docs` | P-01..P-07, D-01..D-06 | `03-escopo.md` com MoSCoW dos 43 RF, 12 recusados `RFX-01..RFX-12` com motivo, marcos CP4/CP5/CP6 datados e os 10 critérios de saída |
| S1-04 | Escrever o pitch de 1 minuto e o roteiro do vídeo de 2 minutos | Done | João Viviani Baldini (+Ana) | 8 | 1 | `mod: docs`, `tipo: docs` | Declaração de problema | Pitch com one-liner, proposta de valor, comparativo com as alternativas atuais (grupo de WhatsApp, stories, lista em papel) e roteiro do vídeo com marcação de tempo cobrindo os 2 minutos |
| S1-05 | Especificar os 23 casos de uso e o dicionário de dados das 13 entidades | Done | Ronaldo Veloso Filho | 8 | 1 | `mod: docs`, `tipo: modelagem` | UC-001..UC-023 | `05-modelagem/01-casos-de-uso.md` com ator, pré-condição, fluxo principal, exceções e pós-condição, e `dicionario-de-dados.md` com tipo, obrigatoriedade e restrição de cada campo das 13 entidades |
| S1-06 | Modelar os 12 diagramas Mermaid do CP4 e exportá-los em SVG | Done | Ronaldo Veloso Filho (+Baraldi) | 8 | 1 | `mod: docs`, `tipo: modelagem` | UC/classes/ER/sequência/atividades/estados/componentes | 12 blocos Mermaid renderizando sem erro, SVG correspondente em `05-modelagem/exports/`, enums e multiplicidades iguais aos de `app/src/types/domain.ts` |
| S1-07 | Definir paleta, tipografia, contraste AA e styleguide de componentes | Done | Ana Luiza Dourado | 8 | 1 | `mod: design`, `tipo: design` | RNF-002, RNF-003, RNF-004 | Escalas coral/teal/neutral completas, tokens com nome idêntico no Tailwind e no Figma, contraste de todo par texto/fundo medido e ≥ 4,5:1, styleguide publicado com os estados de cada componente |
| S1-08 | Desenhar o kit de marca em SVG e montar o Figma com 8 telas navegáveis | Done | Ana Luiza Dourado | 8 | 1 | `mod: design`, `tipo: design` | RNF-018 | `logo.svg`, `logo-horizontal.svg`, `logo-simbolo.svg`, `logo-mono.svg`, `favicon.svg` e `og-image.svg` no repo; Figma com Foundations, Components, 8 telas 390×844 e protótipo navegável ligando feed → detalhe → inscrição → ingresso |
| S1-09 | Montar a base do app React com tokens, 7 rotas, MSW e Vitest | Done | Lucas Baraldi | 8 | 1 | `mod: infra`, `tipo: feature` | RNF-007, RNF-016, RNF-017 | `npm run dev` sobe as 7 rotas (`/`, `/eventos`, `/eventos/:id`, `/criar`, `/perfil`, `/ingresso/:id`, `*`), tokens no `tailwind.config.ts`, MSW servindo o seed de 11 eventos, TS strict sem `any` não justificado, bundle ≤ 250 KB gzip |
| S1-10 | Organizar o repositório com CONTRIBUTING, templates, ADRs, CI verde e Pages | Done | Lucas Baraldi (+Vitor) | 8 | 1 | `mod: infra`, `tipo: chore` | RNF-017 | `main` protegida, `CONTRIBUTING.md` com Conventional Commits/DoR/DoD, templates de PR e issue, ADRs registradas, workflow rodando lint+test+build em push e PR, Pages publicado e acessível |
| S1-11 | Escrever o plano de testes CT-001..CT-031 e a matriz de riscos | Done | Vitor Pantarotto (+Zolla) | 8 | 1 | `mod: docs`, `tipo: teste` | CT-001..CT-031, RN-001..RN-025 | 31 casos em Gherkin, cada `RN-0xx` com ao menos 1 `CT-0xx` conforme a rastreabilidade de `04-regras-de-negocio.md`, e matriz de riscos com probabilidade, impacto, resposta e responsável |
| S1-12 | Montar o quadro do Trello com 7 listas, 18 labels e o pacote de importação | Done | Vitor Pantarotto (+João) | 5 | 1 | `mod: docs`, `tipo: chore` | D-05 | Quadro com as 7 listas, 18 labels coloridas, 6 membros convidados, 32 cards nas listas da coluna "Lista inicial", e `quadro.md` + `trello-import.json` + `trello-import.csv` + `criar-quadro.md` no repo |

### Sprint 2 · CP5 — protótipo funcional com dados mockados

| ID | Card | Lista inicial | Responsável | Pontos | Sprint | Labels | Requisito | Critério de pronto (DoD específico do card) |
|---|---|---|---|---|---|---|---|---|
| S2-01 | Implementar o onboarding de vínculo com validação de domínio institucional | Code Review | Lucas Zolla (+Baraldi) | 5 | 2 | `mod: autenticação`, `tipo: feature` | RF-002, RF-005, RN-001 | E-mail fora de `fiap.com.br` recusado com a mensagem "use seu e-mail institucional"; código `3ESPX-26` vincula a turma; após o vínculo o feed já mostra eventos dos 3 alcances; teste unitário do validador Zod |
| S2-02 | Implementar a lista de eventos com filtros e o detalhe com ocupação de vagas | Doing | Lucas Baraldi | 8 | 2 | `mod: eventos`, `tipo: feature` | RF-015, RF-016, RNF-006 | Filtro "Minha turma" com Marina (3ESPX) mostra só `evt-001` e esconde `evt-003`; `/eventos/evt-002` mostra "80/80 vagas" com a barra cheia e o botão "Entrar na lista de espera"; ordenação por data mais próxima; p95 de carga do feed < 2s |
| S2-03 | Implementar a criação de evento com seletor de alcance, prazos e rascunho | Sprint Backlog | Lucas Baraldi | 8 | 2 | `mod: eventos`, `tipo: feature` | RF-010, RF-011, RF-012, RN-002, RN-011 | Formulário Zod + React Hook Form rejeita prazo de inscrição depois do início e capacidade fora de 2..2000; alcance `FACULDADE` cria em `EM_APROVACAO`; rascunho `evt-011` visível só para o organizador |
| S2-04 | Implementar a reserva de vaga sem estouro de capacidade e sem duplicidade | Doing | Ronaldo Veloso Filho | 8 | 2 | `mod: inscrição`, `tipo: feature` | RF-019, RF-020, RF-022, RN-004, RN-015 | Evento gratuito com vaga nasce `CONFIRMADA` e incrementa o contador; evento pago nasce `PENDENTE_PAGAMENTO`; 2 inscrições simultâneas na última vaga resultam em 1 confirmada + 1 oferta de fila (`CT-001`, `CT-002`, `CT-020`); segunda inscrição do mesmo aluno recusada (`CT-019`) |
| S2-05 | Implementar o cancelamento e a lista de espera FIFO com oferta de 24h | Sprint Backlog | Ronaldo Veloso Filho | 8 | 2 | `mod: inscrição`, `tipo: feature` | RF-021, RF-024, RF-025, RF-026, RN-006, RN-007, RN-008, RN-010 | Cancelar dentro do prazo libera a vaga e oferta ao 1º da fila com janela de 24h (`CT-004`); oferta expirada passa a vez e reordena a fila (`CT-006`); em `evt-002` a posição de Marina cai de 7 para 6 quando alguém sai |
| S2-06 | Implementar o feed segmentado por alcance com publicação de foto | Sprint Backlog | Ana Luiza Dourado | 8 | 2 | `mod: feed`, `tipo: feature` | RF-036, RF-037, RN-019 | Publicação de evento `TURMA 1CCB` não aparece para Marina (3ESPX); só quem tem presença registrada publica (`evt-009`); publicação mostra autor, horário e legenda; feed responsivo de 320 a 1440px sem rolagem horizontal |
| S2-07 | Implementar o cartão-ingresso com QR Code e código de validação | Sprint Backlog | Ana Luiza Dourado | 5 | 2 | `mod: check-in`, `tipo: feature` | RF-033, RNF-011 | `/ingresso/:id` com participação `CONFIRMADA` mostra o cartão picotado (borda tracejada + recortes laterais), QR, nome, evento e o código `CMP-3ESPX-0184`; participação não confirmada não gera ingresso |
| S2-08 | Escrever 8 testes unitários do domínio de vagas e ligar o gate de cobertura | Sprint Backlog | Vitor Pantarotto | 8 | 2 | `mod: inscrição`, `tipo: teste` | RNF-015, CT-001..CT-006 | 8 testes Vitest cobrindo capacidade, duplicidade, prazo, entrada na fila, promoção FIFO e expiração de oferta; `npm run test:coverage` com ≥ 60% em `src/domain` e o CI falhando abaixo disso |
| S2-09 | Automatizar o E2E de inscrição em evento lotado com entrada na fila | Sprint Backlog | Vitor Pantarotto | 5 | 2 | `mod: inscrição`, `tipo: teste` | CT-003, CT-004, RNF-001, RNF-015 | Playwright: Marina abre `/eventos/evt-002`, entra na lista de espera em ≤ 3 toques, vê "você é o 8º da fila" e o estado persiste ao recarregar; roda no CI em push e PR |
| S2-10 | Revisar os 18 RF Must implementados e especificar erros e estados vazios | To Do | Lucas Zolla | 8 | 2 | `mod: docs`, `tipo: docs` | RF-005..RF-037 (Must), RNF-005 | Cada RF Must do CP5 marcado como atendido/parcial/não atendido com o print ou o teste que comprova; divergência abre card `tipo: bug`; texto definitivo de erro e estado vazio de cada uma das 8 telas entregue à Ana |
| S2-11 | Conduzir teste de usabilidade com 5 alunos medindo os 90 segundos | Sprint Backlog | João Viviani Baldini | 5 | 2 | `mod: design`, `tipo: teste` | RNF-005, RNF-001 | 5 alunos de fora do time executam "achar um evento da sua turma e se inscrever" sem treinamento; tempo de cada um cronometrado contra os 90s; achados registrados com severidade e cada um vira card no `Backlog` |
| S2-12 | Escrever o roteiro da demo do CP5 e refinar o backlog do CP6 | Sprint Backlog | João Viviani Baldini | 5 | 2 | `mod: docs`, `tipo: docs` | Critério de saída 7 do CP5 | Roteiro de demo ao vivo em passos numerados usando o seed (`evt-001` inscrição paga, `evt-002` fila, `evt-009` histórico), com plano B gravado; backlog do CP6 reordenado com os achados de S2-11 e S2-10 |

### Sprint 3 · CP6 — persistência, integração e entrega final

| ID | Card | Lista inicial | Responsável | Pontos | Sprint | Labels | Requisito | Critério de pronto (DoD específico do card) |
|---|---|---|---|---|---|---|---|---|
| S3-01 | Substituir os mocks pela API real sem alterar nenhuma tela | Backlog | Lucas Baraldi | 8 | 3 | `mod: infra`, `tipo: chore` | RNF-016, RNF-008, RNF-009 | O diff do PR não toca `src/pages/` nem `src/components/`; só a implementação de `src/services/*Repository.ts` muda; suíte que passava no mock passa na API; p95 de escrita < 1,5s; TLS 1.2+ |
| S3-02 | Publicar o app como PWA instalável com manifest, ícones e cache do feed | Backlog | Lucas Baraldi | 5 | 3 | `mod: infra`, `tipo: chore` | RNF-006, RNF-007, RNF-019 | Manifest com nome, ícones e cor de tema da marca; prompt de instalação no Android; feed abre com o último conteúdo em cache sem rede; bundle ainda ≤ 250 KB gzip |
| S3-03 | Integrar Pix e cartão em sandbox com webhook idempotente e reembolso | **Bloqueado** | Ronaldo Veloso Filho | 8 | 3 | `mod: pagamento`, `tipo: feature` | RF-028, RF-029, RF-030, RF-031, RN-012, RN-013, RN-014, RNF-022 | Pix em `evt-001` (R$ 25) devolve copia-e-cola e QR; webhook repetido não cria segunda confirmação (`CT-010`); não pagar em 60 min expira e libera a vaga (`CT-007`); reembolso integral ≥ 7 dias e 50% entre 48h e 7 dias (`CT-008`, `CT-009`); nenhum dado de cartão no nosso banco |
| S3-04 | Implementar o check-in por leitura de QR e a lista de presença | Backlog | Ana Luiza Dourado | 8 | 3 | `mod: check-in`, `tipo: feature` | RF-034, RF-035, RN-017, RN-018, RNF-011 | QR de outro evento, fora da janela (4h antes / 2h depois) ou já usado é recusado com o motivo e o horário do primeiro uso (`CT-022`, `CT-023`); presença é 1:1 e imutável (`CT-024`); lista mostra "presentes · ausentes · % de comparecimento"; fallback por código numérico funcionando (D-06) |
| S3-05 | Implementar os 8 tipos de notificação e a central de notificações | Backlog | Ana Luiza Dourado | 5 | 3 | `mod: notificações`, `tipo: feature` | RF-039, RF-040 | Os 8 valores de `TipoNotificacao` disparam no evento de domínio correspondente; central lista com estado lida/não lida, contador e navegação para o objeto; alteração de data notifica os inscritos com valor antigo e novo |
| S3-06 | Implementar a matriz de permissões, a aprovação de faculdade e a moderação | Backlog | Lucas Zolla | 8 | 3 | `mod: administração`, `tipo: feature` | RF-041, RF-042, RN-003, RN-020, RN-023, RN-024, RNF-012 | Evento `FACULDADE` só publica após aprovação de Admin de Faculdade (`CT-014`); remoção de publicação registra autor, motivo e horário (`CT-026`); matriz de permissões de `RN-024` verificada no servidor, não na tela (`CT-030`) |
| S3-07 | Escrever o manual de uso e aceitar os RF Must do CP6 | Backlog | João Viviani Baldini | 8 | 3 | `mod: docs`, `tipo: docs` | Critério de saída 10 do CP6 | Manual com as 8 telas, os 3 papéis (aluno, organizador, admin) e os 4 fluxos principais em passo a passo com captura de tela; todo RF Must do CP6 aceito ou recusado por escrito pelo PO contra o critério de aceite de `02-requisitos.md` |
| S3-08 | Executar a bateria CT-001..CT-031 e fechar as métricas das 3 sprints | Backlog | Vitor Pantarotto | 8 | 3 | `mod: docs`, `tipo: teste` | CT-001..CT-031, RNF-015 | 31 casos executados com resultado passou/falhou e evidência; falha vira card `tipo: bug` com severidade; planilha final de pontos planejados vs entregues, cards bloqueados e tempo médio em `Code Review` das 3 sprints; 3 retrospectivas registradas |

### Distribuição inicial pelas listas

| Lista | Cards | IDs |
|---|---|---|
| `Backlog` | 7 | S3-01, S3-02, S3-04, S3-05, S3-06, S3-07, S3-08 |
| `Sprint Backlog` | 8 | S2-03, S2-05, S2-06, S2-07, S2-08, S2-09, S2-11, S2-12 |
| `To Do` | 1 | S2-10 |
| `Doing` | 2 | S2-02 (Baraldi), S2-04 (Ronaldo) — 2/4 |
| `Code Review` | 1 | S2-01 (PR aberto, revisor Baraldi) — 1/3 |
| `Done` | 12 | S1-01 .. S1-12 |
| `Bloqueado` | 1 | S3-03 (dependência D-02: sandbox de gateway com Pix) |

Total: 7 + 8 + 1 + 2 + 1 + 12 + 1 = **32 cards**.

---

## 6. Carga por integrante e balanceamento

| Integrante | Sprint 1 | Sprint 2 | Sprint 3 | Total de pontos | Cards |
|---|---|---|---|---|---|
| Ana Luiza Dourado | 16 | 13 | 13 | **42** | 6 |
| João Viviani Baldini | 16 | 10 | 8 | **34** | 5 |
| Lucas Baraldi | 16 | 16 | 13 | **45** | 6 |
| Lucas Zolla | 16 | 13 | 8 | **37** | 5 |
| Ronaldo Veloso Filho | 16 | 16 | 8 | **40** | 5 |
| Vitor Pantarotto | 13 | 13 | 8 | **34** | 5 |
| **Total** | **93** | **81** | **58** | **232** | **32** |

### Leitura do balanceamento

**Amplitude total: 34 a 45 pontos, média 38,7.** O maior (Baraldi, 45) está 16% acima da
média e o menor (João e Vitor, 34) 12% abaixo — amplitude de 1,32× entre extremos. Para
um time de 6 pessoas com papéis fixos, isso é aceitável; acima de 1,5× seria sinal de
card mal distribuído.

**Por que a Sprint 1 é plana (16 pontos para 5 dos 6).** O CP4 é sprint de artefato:
cada integrante fechou 2 entregas do seu domínio. Vitor fica em 13 porque o card do
quadro (S1-12, 5 pontos) é menor — em troca ele carrega as 4 cerimônias da sprint, que
não são pontuadas.

**Por que Baraldi e Ronaldo concentram a Sprint 2.** É a sprint de implementação: 6 dos
12 cards são tela ou regra de domínio, e o `CONTRIBUTING.md` põe os dois como revisores
obrigatórios de camada de dados e tipos. Mitigações já aplicadas na planning:

1. **S2-01 saiu de Baraldi para Zolla** (+Baraldi como par). O onboarding é validação Zod
   do domínio institucional e do código de turma — a regra que Zolla escreveu em
   `RF-002`/`RN-001`. Tirou 5 pontos do Tech Lead e deu trabalho de código a quem
   especificou a regra.
2. **S3-03 ficou com Ronaldo e o reembolso entrou no mesmo card**, em vez de abrir um
   segundo card de pagamento para Baraldi.
3. **Nenhum card novo de `mod: infra` entra na Sprint 3** sem que outro saia.

**Por que os pontos caem de 93 para 81 e depois para 58.** É planejamento com reserva,
não perda de ritmo:

- Sprint 2 = **87%** da velocidade medida na Sprint 1. Documentação fecha mais rápido que
  código, e o time nunca mediu velocidade em código (premissa do grupo).
- Sprint 3 = **72%** da Sprint 2. Os 28% restantes são reserva explícita para os defeitos
  da validação com 5 alunos (S2-11) e da revisão de RF (S2-10), que entram como cards
  `tipo: bug` durante a sprint, mais o período de provas no calendário da disciplina.

**Ninguém sem card em nenhuma sprint.** Menor participação por sprint: 8 pontos
(1 card grande). Se na retrospectiva alguém aparecer com menos de 8 pontos entregues,
a planning seguinte redistribui antes de comprometer escopo novo.

---

## 7. Uso real da ferramenta na semana

Quadro que só é preenchido na véspera da entrega não vale nota e não organiza nada. As
regras abaixo são o que faz o quadro virar registro de trabalho.

### 7.1 Como mover card

| Situação | Ação no quadro |
|---|---|
| Peguei o card | Arrasto de `To Do` para `Doing` **no mesmo momento em que crio a branch** — nunca depois |
| Abri o PR | Arrasto para `Code Review`, marco o revisor da área no card e no GitHub |
| Revisor pediu mudança | O **revisor** devolve para `Doing` e escreve o que falta em comentário |
| PR aprovado e merge feito | O **revisor** move para `Done`; o PO comenta "aceito" |
| Travou | Arrasto para `Bloqueado` com o motivo em comentário (§7.3) |

Regra dura: **card não anda sem comentário**. Movimento sem comentário é desfeito pelo
Scrum Master na daily.

### 7.2 O que comentar no card

Um comentário por evento relevante. Formato fixo, para o histórico ficar legível:

```text
[branch] feat/inscricao-lista-espera criada
[commit] https://github.com/lukiin-z/campus/commit/<sha-de-7-a-40-chars>
         feat(inscricao): promove primeiro da fila quando uma vaga é liberada
[PR]     https://github.com/lukiin-z/campus/pull/<n> — revisor: @lucasbaraldi
[CI]     lint OK · test 24/24 · build 238 KB gzip
[aceite] RF-025: fila de 3 em evt-002, liberada 1 vaga -> só o 1º recebeu oferta,
         posições 3->2 e 2->1 conferidas na tela. CT-005 verde.
[review] mudanças pedidas: extrair a janela de 24h para policy.ts
[merge]  mergeado em 2026-09-24, movido para Done
```

O que **não** entra em comentário: "feito", "ok", "subi", print sem contexto, discussão
de arquitetura (isso vira ADR, regra 3 de convivência).

### 7.3 Quando usar `Bloqueado`

Só há três motivos legítimos:

1. **Dependência externa** de [`../03-escopo.md`](../03-escopo.md) §7 — é o caso de
   S3-03, parado em D-02 (sandbox de gateway com Pix). Comentário obrigatório com a
   dependência, a data em que foi pedida e o plano B previsto.
2. **Decisão pendente** que muda contrato, modelo de dados ou fronteira de camada —
   fica bloqueado até a ADR ser mergeada.
3. **Impedimento técnico** que o responsável não resolve sozinho em 24h.

Procedimento: 24h de bloqueio silencioso é o teto (regra 2 de convivência). Passou disso,
o card **vai** para `Bloqueado` — quem move pode ser qualquer um. Somente o Scrum Master
tira card de `Bloqueado`, e só depois de o motivo estar resolvido por escrito no card.
Cada card bloqueado ganha uma **due date de revisão** de 48h; vencida, entra na pauta da
daily. Bloqueado não é estacionamento: 3 cards ali reabrem a planning.

### 7.4 Checklist dentro do card

Card de 8 pontos sem checklist é card mal fatiado. Padrão do time:

- **1 checklist por card de 8 pontos**, chamada `Subtarefas`, com 3 a 6 itens que
  representem trabalho de meio dia ou menos;
- itens escritos como **resultado verificável** ("filtro Minha turma esconde evt-003"),
  não como atividade ("mexer no filtro");
- cards de 5 pontos ganham checklist quando cruzam camadas (tela + domínio + mock);
- item de checklist marcado é o sinal de progresso na daily; **checklist 100% é item 6
  do DoD** e pré-requisito de `Done`.

O pacote de importação já traz as checklists dos 11 cards que precisam
([`trello-import.json`](trello-import.json)).

### 7.5 Due date

- Todo card em sprint tem due date **dentro da janela da sprint** — nunca no dia da
  entrega do checkpoint, sempre com 3 dias úteis de folga antes.
- Due date é do **card**, não do PR: significa "revisado e mergeado".
- Card vencido fica vermelho no Trello e é o **primeiro item da daily**. Duas
  prorrogações no mesmo card = replanejar ou fatiar, decisão do SM com o PO.
- Cards de `Bloqueado` têm due date de revisão de 48h (§7.3).

### 7.6 Evidência obrigatória: print do quadro em uso

Ao fim da semana, antes da entrega, **tire um print do quadro em uso e salve em**
`docs/09-trello/evidencia.png`. Esse arquivo é item do checklist de entrega
(`docs/16-checklist-entrega-cp4.md`) e é a única prova de que o quadro foi usado, e não
montado na véspera.

Para valer como evidência, o print precisa mostrar, na mesma imagem:

1. as **7 listas** visíveis com seus nomes;
2. a lista `Done` com os **12 cards da Sprint 1**, com as labels coloridas aparecendo;
3. pelo menos **1 card em `Doing`** e **1 em `Code Review`**, mostrando que o fluxo está
   em movimento;
4. o card de `Bloqueado` (S3-03) visível — quadro sem impedimento registrado não é
   quadro real;
5. os **avatares dos 6 membros** distribuídos nos cards, não concentrados em um só;
6. ao menos um card com **badge de checklist** (ex.: `3/5`) e um com **due date**;
7. o **nome do quadro** e a contagem de cards por lista legíveis;
8. sem informação pessoal de terceiros na imagem (nenhum e-mail, nenhum telefone).

Print de detalhe recomendado como segundo arquivo, `docs/09-trello/evidencia-card.png`:
um card aberto mostrando descrição com critério de aceite, labels, membros, checklist e
o comentário com link de commit e PR no formato da §7.2. É o que separa "quadro
estruturado" de "quadro usado".

---

## 8. Cerimônias

Mesma cadência de [`../10-equipe-e-papeis.md`](../10-equipe-e-papeis.md) §4, com o efeito
de cada cerimônia no quadro.

| Cerimônia | Quando | Duração | Facilitador | O que muda no quadro |
|---|---|---|---|---|
| Sprint Planning | 1º dia da sprint (08/09 e 06/10) | 60 min | Vitor Pantarotto | Cards com DoR 100% vão de `Backlog` para `Sprint Backlog`; pontos e responsáveis fixados; due dates preenchidas |
| Daily assíncrona | Todo dia útil, até 10h, no canal do grupo | 5 min por pessoa | Vitor Pantarotto | Cada um comenta no **próprio card** em `Doing`: o que andou, o que trava, se a due date se mantém. Card vencido e card bloqueado são lidos primeiro |
| Refinamento de backlog | Meio da sprint (18/09 e 21/10) | 45 min | João Viviani Baldini | Cards do `Backlog` recebem os 6 itens do DoR, são estimados e reordenados; card grande é fatiado |
| Design review | Sob demanda, antes de codar tela | 30 min | Ana Luiza Dourado | Comentário de aprovação visual no card; sem isso o card de tela não entra em `Doing` |
| Arquitetura / ADR review | Sob demanda | 30 min | Lucas Baraldi | Card que exige ADR fica em `Bloqueado` até a ADR ser mergeada |
| Sprint Review (demo) | Último dia da sprint (03/10 e 07/11) | 30 min | João Viviani Baldini | PO aceita ou recusa cada card de `Done` em comentário; card recusado volta para `To Do` da sprint seguinte |
| Retrospectiva | Após a review | 30 min | Vitor Pantarotto | Métricas da §9 registradas; ações da retro entram como cards `tipo: chore` no `Backlog` com responsável |

Cerimônia sem efeito no quadro é reunião. Se uma delas terminar sem card movido,
comentado ou criado, ela foi mal conduzida.

---

## 9. Métricas da sprint

Três números por sprint. Medidos pelo Scrum Master, registrados na retrospectiva.

| Métrica | Como é medida | Onde é registrada |
|---|---|---|
| Pontos planejados | Soma dos pontos do `Sprint Backlog` no fechamento da planning | Tabela abaixo + descrição do quadro no Trello |
| Pontos entregues | Soma dos pontos dos cards em `Done` com aceite do PO na review | Tabela abaixo + comentário no card da retrospectiva |
| Cards bloqueados | Quantos cards passaram por `Bloqueado` e quantas horas cada um ficou lá | Tabela abaixo, com o motivo e a dependência `D-0x` |
| Cards não concluídos | Cards que voltaram para o `Backlog` no fim da sprint, com o motivo | Comentário no card + reordenação pelo PO |
| Tempo médio em `Code Review` | Data de entrada em `Code Review` até o merge, por card | Tabela abaixo — é o indicador do limite de WIP da §1 |

### Registro

| Sprint | Pontos planejados | Pontos entregues | Cards planejados | Cards entregues | Cards bloqueados | Tempo médio em Code Review |
|---|---|---|---|---|---|---|
| Sprint 1 (CP4) | 93 | 93 | 12 | 12 | 0 | 1,5 dia (medido) |
| Sprint 2 (CP5) | 81 | a medir na review de 03/10 | 12 | — | 1 previsto (S3-03 é da Sprint 3) | meta ≤ 2 dias |
| Sprint 3 (CP6) | 58 | a medir na review de 07/11 | 8 + defeitos do CP5 | — | 1 aberto (S3-03, D-02) | meta ≤ 2 dias |

Como registrar, na prática:

1. **Pontos** ficam na descrição do card (linha `**Pontos:**`) e no campo numérico
   `Pontos` do Power-Up **Custom Fields** — os importadores de JSON e CSV não carregam
   campo customizado, então quem criar o quadro preenche o campo a partir da descrição.
2. Na review, o SM soma os pontos de `Done` **filtrando pela label da sprint no filtro do
   Trello** e escreve o resultado nesta tabela, no mesmo PR da retrospectiva.
3. Card que passou por `Bloqueado` recebe comentário final com quantas horas ficou parado
   e qual dependência causou. Esse número alimenta a matriz de riscos.
4. Divergência entre planejado e entregue **maior que 20%** obriga a revisar a velocidade
   usada na planning seguinte — é o que aconteceria se a Sprint 2 fechasse abaixo de
   65 pontos.

---

## 10. Arquivos deste diretório

| Arquivo | Para que serve |
|---|---|
| `quadro.md` | Este documento: estrutura, labels, membros, DoR/DoD, 32 cards, carga, processo, métricas |
| [`criar-quadro.md`](criar-quadro.md) | Roteiro manual de 10 minutos, com o texto pronto de cada card e as 3 alternativas de importação |
| [`trello-import.json`](trello-import.json) | Board export no formato do Trello: listas, labels, membros, 32 cards e 11 checklists |
| [`trello-import.csv`](trello-import.csv) | Uma linha por card, aceito pelos importadores CSV do Trello, do Notion e do Jira |
| [`criar-quadro.sh`](criar-quadro.sh) | Script opcional que cria quadro, listas, labels e cards pela API REST do Trello |
| `evidencia.png` | Print do quadro em uso — **a criar** conforme §7.6 |
