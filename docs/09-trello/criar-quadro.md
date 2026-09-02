# Criar o quadro do Trello em 10 minutos

Roteiro operacional para **Vitor Pantarotto** (Scrum Master) executar uma vez. A
estrutura, as regras e o backlog completo estão em [`quadro.md`](quadro.md) — este
arquivo é só a execução.

**Antes de começar:** conta no Trello (plano free basta) e este repositório aberto ao
lado, porque os textos dos cards saem daqui.

> As seções 6 a 8 deste arquivo são geradas a partir de
> [`trello-import.json`](trello-import.json). Se um card mudar, mude o JSON e regere —
> não edite os dois à mão, porque é assim que quadro e documentação divergem.

## Cronometrado

| Minuto | Passo | Seção |
|---|---|---|
| 0 – 1 | Criar o quadro | §1 |
| 1 – 2 | Criar as 7 listas | §2 |
| 2 – 5 | Criar as 18 labels | §3 |
| 5 – 6 | Convidar os 5 colegas | §4 |
| 6 – 9 | Criar os 32 cards em lote (só títulos) | §5 e §6 |
| 9 – 10 | Aplicar labels, membros, due dates e pontos | §7 |
| depois | Colar a descrição de cada card | §8 |

Os 10 minutos entregam o quadro estruturado e populado. Colar as 32 descrições à mão
leva mais uns 35 minutos — é exatamente por isso que existem os caminhos de importação
da §9. Se você tem 10 minutos e só 10 minutos, faça §1 a §7 agora e §8 depois.

---

## 1. Criar o quadro

1. `+` no topo → **Criar quadro**.
2. **Título:** `Campus — Eventos Universitários (FIAP)`
3. **Fundo:** laranja (mais perto do `accent` #E8542E da marca).
4. **Visibilidade:** Espaço de trabalho. Ao final, gere um **link de leitura** para
   entregar ao professor (Menu → Compartilhar → Criar link).
5. Menu → **Sobre este quadro** → cole em Descrição:

```text
Quadro do projeto Campus — app de eventos universitários com alcance segmentado por
turma, curso e faculdade. Engenharia de Software, FIAP, Eng. de Computação, 3º ano.

Sprint 1 = CP4 (18/08 a 05/09/2026, entrega 08/09) · Sprint 2 = CP5 (08/09 a
03/10/2026, entrega 06/10) · Sprint 3 = CP6 (06/10 a 07/11/2026, entrega 10/11).

Regras do quadro, DoR, DoD, carga por integrante e métricas: docs/09-trello/quadro.md
Limite de WIP: Doing 4 · Code Review 3 · Bloqueado 3.
Todo card tem 1 label mod: e 1 label tipo:. Card não anda sem comentário com link de
commit e de PR.
```

---

## 2. Criar as 7 listas — nesta ordem

Digite o nome e pressione **Enter**; o Trello mantém o campo aberto e a próxima lista
entra à direita. Ordem exata (é o fluxo do trabalho, da esquerda para a direita):

```text
Backlog
Sprint Backlog
To Do
Doing
Code Review
Done
Bloqueado
```

Renomeie o limite de WIP no próprio nome da lista se quiser o lembrete visível:
`Doing (máx 4)` e `Code Review (máx 3)`. Se fizer isso, use o mesmo nome no
[`quadro.md`](quadro.md) — nome de lista diferente entre quadro e doc quebra o script
da §9.

---

## 3. Criar as 18 labels

Abra um card qualquer → **Etiquetas** → engrenagem → **Criar nova etiqueta**. Cole o
nome e escolha a cor. As 11 primeiras são módulo, as 7 últimas são tipo.

| # | Nome da label | Cor no seletor | Chave da cor na API |
|---|---|---|---|
| 1 | `mod: autenticação` | roxo | `purple` |
| 2 | `mod: eventos` | azul | `blue` |
| 3 | `mod: inscrição` | azul-claro | `sky` |
| 4 | `mod: pagamento` | verde | `green` |
| 5 | `mod: check-in` | verde-limão | `lime` |
| 6 | `mod: feed` | rosa | `pink` |
| 7 | `mod: notificações` | laranja | `orange` |
| 8 | `mod: administração` | vermelho | `red` |
| 9 | `mod: design` | roxo claro | `purple_light` |
| 10 | `mod: docs` | cinza-escuro | `black` |
| 11 | `mod: infra` | azul escuro | `blue_dark` |
| 12 | `tipo: feature` | verde escuro | `green_dark` |
| 13 | `tipo: bug` | vermelho escuro | `red_dark` |
| 14 | `tipo: docs` | azul-claro escuro | `sky_dark` |
| 15 | `tipo: modelagem` | roxo escuro | `purple_dark` |
| 16 | `tipo: design` | rosa escuro | `pink_dark` |
| 17 | `tipo: teste` | amarelo | `yellow` |
| 18 | `tipo: chore` | cinza claro | `black_light` |

Antes de sair, ligue **Menu → Power-Ups → Campos personalizados** e crie um campo
numérico chamado `Pontos`, exibido no card. Nenhum importador de CSV ou JSON carrega
campo personalizado — o valor vem da tabela da §7.

---

## 4. Convidar os 5 colegas

Menu → **Membros** → **Convidar**. Convide por nome de usuário do Trello ou pelo
e-mail que cada um informar no grupo — **não copie e-mail de ninguém para dentro deste
repositório.**

| Integrante | RM | Papel | Permissão no quadro |
|---|---|---|---|
| Ana Luiza Dourado | RM558793 | UX/UI Designer | Normal |
| João Viviani Baldini | RM558596 | Product Owner | Normal |
| Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | **Admin** |
| Lucas Zolla | RM557952 | Analista de Requisitos | Normal |
| Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | Normal |
| Vitor Pantarotto | RM554961 | Scrum Master / QA | **Admin** (criador) |

Dois admins de propósito: se o Scrum Master ficar sem acesso na véspera da entrega, o
Tech Lead resolve. Confira as iniciais que o Trello mostra no avatar — elas aparecem no
print de evidência e é assim que o professor vê a distribuição de tarefas.

---

## 5. Criar os 32 cards em lote

O Trello aceita **várias linhas coladas de uma vez** no campo de novo card: ele pergunta
se deve criar um card por linha. Responda que sim. É o que transforma 32 cards em 3
minutos.

Para cada lista da §6: clique em **Adicionar um cartão**, cole o bloco inteiro daquela
lista, confirme a criação em lote e passe para a próxima.

Depois disso os cards existem com o título certo, na lista certa, na ordem certa — e
faltam labels, membros, due dates e descrição.

---

## 6. Títulos por lista, para colar em lote

### Lista `Backlog` — 7 cards

```text
S3-01 · Substituir os mocks pela API real sem alterar nenhuma tela
S3-02 · Publicar o app como PWA instalável com manifest, ícones e cache do feed
S3-04 · Implementar o check-in por leitura de QR e a lista de presença
S3-05 · Implementar os 8 tipos de notificação e a central de notificações
S3-06 · Implementar a matriz de permissões, a aprovação de faculdade e a moderação
S3-07 · Escrever o manual de uso e aceitar os RF Must do CP6
S3-08 · Executar a bateria CT-001..CT-031 e fechar as métricas das 3 sprints
```

### Lista `Sprint Backlog` — 8 cards

```text
S2-03 · Implementar a criação de evento com seletor de alcance, prazos e rascunho
S2-05 · Implementar o cancelamento e a lista de espera FIFO com oferta de 24h
S2-06 · Implementar o feed segmentado por alcance com publicação de foto
S2-07 · Implementar o cartão-ingresso com QR Code e código de validação
S2-08 · Escrever 8 testes unitários do domínio de vagas e ligar o gate de cobertura
S2-09 · Automatizar o E2E de inscrição em evento lotado com entrada na fila
S2-11 · Conduzir teste de usabilidade com 5 alunos medindo os 90 segundos
S2-12 · Escrever o roteiro da demo do CP5 e refinar o backlog do CP6
```

### Lista `To Do` — 1 card

```text
S2-10 · Revisar os 18 RF Must implementados e especificar erros e estados vazios
```

### Lista `Doing` — 2 cards

```text
S2-02 · Implementar a lista de eventos com filtros e o detalhe com ocupação de vagas
S2-04 · Implementar a reserva de vaga sem estouro de capacidade e sem duplicidade
```

### Lista `Code Review` — 1 card

```text
S2-01 · Implementar o onboarding de vínculo com validação de domínio institucional
```

### Lista `Done` — 12 cards

```text
S1-01 · Escrever a declaração de problema, 3 personas e 6 antipersonas
S1-02 · Especificar 43 RF, 22 RNF e 25 regras de negócio com critério de aceite
S1-03 · Classificar os 43 RF em MoSCoW e definir premissas, dependências e marcos
S1-04 · Escrever o pitch de 1 minuto e o roteiro do vídeo de 2 minutos
S1-05 · Especificar os 23 casos de uso e o dicionário de dados das 13 entidades
S1-06 · Modelar os 12 diagramas Mermaid do CP4 e exportá-los em SVG
S1-07 · Definir paleta, tipografia, contraste AA e styleguide de componentes
S1-08 · Desenhar o kit de marca em SVG e montar o Figma com 8 telas navegáveis
S1-09 · Montar a base do app React com tokens, 7 rotas, MSW e Vitest
S1-10 · Organizar o repositório com CONTRIBUTING, templates, ADRs, CI verde e Pages
S1-11 · Escrever o plano de testes CT-001..CT-031 e a matriz de riscos
S1-12 · Montar o quadro do Trello com 7 listas, 18 labels e o pacote de importação
```

### Lista `Bloqueado` — 1 card

```text
S3-03 · Integrar Pix e cartão em sandbox com webhook idempotente e reembolso
```

---

## 7. Labels, membros, due date e pontos

Ordem que rende mais em menos tempo: abra o card, aplique as duas labels pelo atalho
`L`, atribua o membro pelo atalho `A` (espaço atribui você mesmo), a due date pelo `D`
e preencha o campo `Pontos`.

O **primeiro** membro é o responsável. Card com dois membros é trabalho em par: o
segundo revisa ou executa a parte do próprio papel.

| ID | Lista | Labels (atalho `L`) | Membros — 1º é o responsável (atalho `A`) | Due date (atalho `D`) | Pontos |
|---|---|---|---|---|---|
| S3-01 | `Backlog` | `mod: infra` + `tipo: chore` | Lucas Baraldi | 2026-10-17 | 8 |
| S3-02 | `Backlog` | `mod: infra` + `tipo: chore` | Lucas Baraldi | 2026-11-03 | 5 |
| S3-04 | `Backlog` | `mod: check-in` + `tipo: feature` | Ana Luiza Dourado | 2026-10-24 | 8 |
| S3-05 | `Backlog` | `mod: notificações` + `tipo: feature` | Ana Luiza Dourado | 2026-10-30 | 5 |
| S3-06 | `Backlog` | `mod: administração` + `tipo: feature` | Lucas Zolla | 2026-10-28 | 8 |
| S3-07 | `Backlog` | `mod: docs` + `tipo: docs` | João Viviani Baldini | 2026-11-06 | 8 |
| S3-08 | `Backlog` | `mod: docs` + `tipo: teste` | Vitor Pantarotto | 2026-11-07 | 8 |
| S2-03 | `Sprint Backlog` | `mod: eventos` + `tipo: feature` | Lucas Baraldi | 2026-09-19 | 8 |
| S2-05 | `Sprint Backlog` | `mod: inscrição` + `tipo: feature` | Ronaldo Veloso Filho | 2026-09-24 | 8 |
| S2-06 | `Sprint Backlog` | `mod: feed` + `tipo: feature` | Ana Luiza Dourado | 2026-09-26 | 8 |
| S2-07 | `Sprint Backlog` | `mod: check-in` + `tipo: feature` | Ana Luiza Dourado | 2026-09-26 | 5 |
| S2-08 | `Sprint Backlog` | `mod: inscrição` + `tipo: teste` | Vitor Pantarotto | 2026-09-30 | 8 |
| S2-09 | `Sprint Backlog` | `mod: inscrição` + `tipo: teste` | Vitor Pantarotto | 2026-10-01 | 5 |
| S2-11 | `Sprint Backlog` | `mod: design` + `tipo: teste` | João Viviani Baldini, Ana Luiza Dourado | 2026-10-02 | 5 |
| S2-12 | `Sprint Backlog` | `mod: docs` + `tipo: docs` | João Viviani Baldini | 2026-10-03 | 5 |
| S2-10 | `To Do` | `mod: docs` + `tipo: docs` | Lucas Zolla | 2026-09-29 | 8 |
| S2-02 | `Doing` | `mod: eventos` + `tipo: feature` | Lucas Baraldi | 2026-09-16 | 8 |
| S2-04 | `Doing` | `mod: inscrição` + `tipo: feature` | Ronaldo Veloso Filho | 2026-09-19 | 8 |
| S2-01 | `Code Review` | `mod: autenticação` + `tipo: feature` | Lucas Zolla, Lucas Baraldi | 2026-09-12 | 5 |
| S1-01 | `Done` | `mod: docs` + `tipo: docs` | Lucas Zolla, Ana Luiza Dourado | 2026-08-22 | 8 |
| S1-02 | `Done` | `mod: docs` + `tipo: docs` | Lucas Zolla, João Viviani Baldini | 2026-08-29 | 8 |
| S1-03 | `Done` | `mod: docs` + `tipo: docs` | João Viviani Baldini, Lucas Zolla | 2026-08-25 | 8 |
| S1-04 | `Done` | `mod: docs` + `tipo: docs` | João Viviani Baldini, Ana Luiza Dourado | 2026-09-03 | 8 |
| S1-05 | `Done` | `mod: docs` + `tipo: modelagem` | Ronaldo Veloso Filho | 2026-08-27 | 8 |
| S1-06 | `Done` | `mod: docs` + `tipo: modelagem` | Ronaldo Veloso Filho, Lucas Baraldi | 2026-09-02 | 8 |
| S1-07 | `Done` | `mod: design` + `tipo: design` | Ana Luiza Dourado | 2026-08-26 | 8 |
| S1-08 | `Done` | `mod: design` + `tipo: design` | Ana Luiza Dourado | 2026-09-04 | 8 |
| S1-09 | `Done` | `mod: infra` + `tipo: feature` | Lucas Baraldi | 2026-08-31 | 8 |
| S1-10 | `Done` | `mod: infra` + `tipo: chore` | Lucas Baraldi, Vitor Pantarotto | 2026-09-04 | 8 |
| S1-11 | `Done` | `mod: docs` + `tipo: teste` | Vitor Pantarotto, Lucas Zolla | 2026-09-01 | 8 |
| S1-12 | `Done` | `mod: docs` + `tipo: chore` | Vitor Pantarotto, João Viviani Baldini | 2026-09-05 | 5 |
| S3-03 | `Bloqueado` | `mod: pagamento` + `tipo: feature` | Ronaldo Veloso Filho | 2026-10-24 | 8 |

Cards com checklist (crie a checklist `Subtarefas` com os itens de `trello-import.json`): `S1-06`, `S1-08`, `S1-12`, `S2-02`, `S2-03`, `S2-04`, `S2-05`, `S2-06`, `S2-08`, `S3-03`, `S3-04` — 11 checklists, 57 itens.

---

## 8. Descrição pronta de cada card

Um bloco por card, agrupado por lista, na mesma ordem da §6. Abra o card, clique em
**Descrição**, cole o bloco inteiro — a formatação markdown (negrito, código) é
interpretada pelo Trello.

### Lista `Backlog`

#### S3-01 · Substituir os mocks pela API real sem alterar nenhuma tela

`mod: infra` + `tipo: chore` · Lucas Baraldi · due 2026-10-17

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** RNF-016, RNF-008, RNF-009

**Contexto.** A camada de repositório foi desenhada no CP4 exatamente para esta troca. Se uma tela precisar mudar, a arquitetura falhou.

**Critério de aceite.** Dado o PR da troca, Quando o diff é revisado, Então não há alteração em `src/pages/` nem em `src/components/`; só a implementação de `src/services/*Repository.ts` muda. Dado a suíte de testes, Quando ela roda contra a API real, Então passa sem alteração de asserção.

**Pronto quando.** p95 de escrita abaixo de 1,5s; TLS 1.2 ou superior; senha com Argon2id; nenhum segredo no repositório.
```

#### S3-02 · Publicar o app como PWA instalável com manifest, ícones e cache do feed

`mod: infra` + `tipo: chore` · Lucas Baraldi · due 2026-11-03

```markdown
**Sprint 3 · CP6** · **Pontos:** 5 · **Requisito:** RNF-006, RNF-007, RNF-019

**Contexto.** Publicar em loja está fora de escopo (`RFX-05`). O build instalável é a resposta equivalente: o aluno adiciona o Campus à tela inicial.

**Critério de aceite.** Dado um Android com Chrome, Quando abro o app publicado, Então recebo o prompt de instalação e o ícone da marca vai para a tela inicial. Dado que estou sem rede, Quando abro o app instalado, Então o feed mostra o último conteúdo em cache com aviso de conteúdo desatualizado.

**Pronto quando.** Manifest com nome, ícones e cor de tema da marca; bundle ainda dentro de 250 KB gzip; funcionamento verificado nos navegadores da lista de compatibilidade.
```

#### S3-04 · Implementar o check-in por leitura de QR e a lista de presença

`mod: check-in` + `tipo: feature` · Ana Luiza Dourado · due 2026-10-24 · tem checklist

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** RF-034, RF-035, RN-017, RN-018, RNF-011

**Contexto.** Substitui a lista em papel na porta do evento. Presença precisa ser única, imutável e auditável — é o que autoriza publicar no feed depois.

**Critério de aceite.** Dado um QR já utilizado, Quando o organizador o lê de novo, Então o sistema recusa informando o horário do primeiro uso e não cria segunda presença. Dado um QR de outro evento ou fora da janela de 4h antes a 2h depois, Quando é lido, Então é recusado com o motivo. Dado 271 de 300 inscritos presentes, Quando abro a lista, Então vejo presentes, ausentes e o percentual de comparecimento.

**Pronto quando.** `CT-022`, `CT-023` e `CT-024` verdes; token assinado de uso único; fallback por código numérico funcionando (dependência D-06); leitor acessível por teclado para entrada manual.
```

#### S3-05 · Implementar os 8 tipos de notificação e a central de notificações

`mod: notificações` + `tipo: feature` · Ana Luiza Dourado · due 2026-10-30

```markdown
**Sprint 3 · CP6** · **Pontos:** 5 · **Requisito:** RF-039, RF-040

**Contexto.** Vaga liberada com janela de 24h só serve se a pessoa souber. Notificação é o que fecha o ciclo da lista de espera e da alteração de evento.

**Critério de aceite.** Dado que sou o primeiro da fila de `evt-002`, Quando uma vaga é liberada, Então recebo notificação com o prazo para confirmar. Dado que tenho 3 notificações não lidas, Quando abro a central e toco em uma, Então ela é marcada como lida e o app navega para o evento correspondente.

**Pronto quando.** Os 8 valores de `TipoNotificacao` disparando no evento de domínio correto; alteração de data notificando os inscritos com valor antigo e novo; preferência de notificação do perfil respeitada.
```

#### S3-06 · Implementar a matriz de permissões, a aprovação de faculdade e a moderação

`mod: administração` + `tipo: feature` · Lucas Zolla · due 2026-10-28

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** RF-041, RF-042, RN-003, RN-020, RN-023, RN-024, RNF-012

**Contexto.** Evento de alcance FACULDADE atinge o campus inteiro; publicar sem aprovação é risco institucional. E feed sem moderação não sobrevive ao segundo semestre.

**Critério de aceite.** Dado um evento submetido com alcance FACULDADE, Quando o Admin de Faculdade aprova, Então o evento passa de EM_APROVACAO para PUBLICADO e o organizador é notificado. Dado uma publicação denunciada, Quando o organizador do evento a remove informando o motivo, Então ela sai do feed e a ação fica registrada com autor e horário.

**Pronto quando.** `CT-014`, `CT-026`, `CT-029` e `CT-030` verdes; matriz de permissões verificada no servidor, não na tela; organizador é papel por evento, não atributo do usuário.
```

#### S3-07 · Escrever o manual de uso e aceitar os RF Must do CP6

`mod: docs` + `tipo: docs` · João Viviani Baldini · due 2026-11-06

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** critério de saída 10 do CP6

**Contexto.** Manual publicado é critério de saída do CP6, e o aceite formal do PO é o que fecha o projeto — card em Done sem aceite não conta como entregue.

**Critério de aceite.** Dado o manual, Quando um aluno que nunca usou o app o segue, Então consegue se cadastrar, achar um evento, se inscrever, pagar, fazer check-in e publicar foto sem perguntar nada ao time. Dado cada RF Must do CP6, Quando o PO o avalia contra o critério de aceite do documento de requisitos, Então registra aceito ou recusado por escrito, com o motivo.

**Pronto quando.** Manual com as 8 telas, os 3 papéis e os 4 fluxos principais em passo a passo com captura de tela; planilha de aceite anexada ao card, sem RF Must pendente sem decisão.
```

#### S3-08 · Executar a bateria CT-001..CT-031 e fechar as métricas das 3 sprints

`mod: docs` + `tipo: teste` · Vitor Pantarotto · due 2026-11-07

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** CT-001..CT-031, RNF-015

**Contexto.** É a última verificação antes da entrega final e o fechamento do registro da jornada do projeto, que a disciplina pede junto com o produto.

**Critério de aceite.** Dado o plano de testes, Quando a bateria é executada, Então os 31 casos têm resultado passou ou falhou com evidência anexada, e cada falha gerou card `tipo: bug` com severidade e responsável. Dado o quadro, Quando a retrospectiva final acontece, Então pontos planejados versus entregues, cards bloqueados e tempo médio em Code Review estão registrados para as 3 sprints.

**Pronto quando.** Nenhum caso sem resultado; nenhuma falha de severidade alta aberta na entrega; 3 retrospectivas registradas com as ações e seus responsáveis.
```

### Lista `Sprint Backlog`

#### S2-03 · Implementar a criação de evento com seletor de alcance, prazos e rascunho

`mod: eventos` + `tipo: feature` · Lucas Baraldi · due 2026-09-19 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-010, RF-011, RF-012, RN-002, RN-011

**Contexto.** É o fluxo do organizador (Rafael, representante da 3ESPX). Alcance definido errado aqui vaza evento de turma para a faculdade inteira.

**Critério de aceite.** Dado que preencho o formulário com prazo de inscrição posterior ao início do evento, Quando tento publicar, Então o formulário recusa com mensagem no campo. Dado que escolho alcance FACULDADE, Quando publico, Então o evento nasce em EM_APROVACAO. Dado que salvo como rascunho, Quando outro aluno do mesmo alcance abre a lista, Então o rascunho não aparece.

**Pronto quando.** Validação Zod cobrindo capacidade de 2 a 2000 e coerência de prazos; teste unitário das regras de prazo; alcance não pode aumentar depois de publicado.
```

#### S2-05 · Implementar o cancelamento e a lista de espera FIFO com oferta de 24h

`mod: inscrição` + `tipo: feature` · Ronaldo Veloso Filho · due 2026-09-24 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-021, RF-024, RF-025, RF-026, RN-006, RN-007, RN-008, RN-010

**Contexto.** Evento lotado é a regra, não a exceção: `evt-002` tem 7 na fila e `evt-006` tem 4. A fila precisa ser justa e auditável.

**Critério de aceite.** Dado que a fila tem 3 pessoas e uma vaga é liberada, Quando o sistema processa a liberação, Então apenas a primeira recebe oferta com janela de 24h e as posições seguintes avançam. Dado que recebi oferta e não confirmei, Quando a janela expira, Então minha participação fica EXPIRADA e o próximo recebe a oferta.

**Pronto quando.** `CT-003`, `CT-004`, `CT-005`, `CT-006` e `CT-016` verdes; janela de 24h lida de `policy.ts`, nunca escrita na tela; cancelamento fora do prazo recusado com o prazo exibido.
```

#### S2-06 · Implementar o feed segmentado por alcance com publicação de foto

`mod: feed` + `tipo: feature` · Ana Luiza Dourado · due 2026-09-26 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-036, RF-037, RN-019

**Contexto.** O feed é a memória do que aconteceu — o quarto problema da declaração. Segmentação errada aqui é vazamento de conteúdo de turma.

**Critério de aceite.** Dado que existe publicação em evento de alcance TURMA 1CCB, Quando Marina (3ESPX) abre o feed, Então essa publicação não aparece. Dado que fiz check-in em `evt-009`, Quando publico foto com legenda, Então a publicação aparece para quem enxerga aquele evento, com meu nome e horário.

**Pronto quando.** Filtro de visibilidade verificado na camada de dados, não na tela; só quem tem presença registrada publica; feed sem rolagem horizontal de 320 a 1440px; imagem com texto alternativo.
```

#### S2-07 · Implementar o cartão-ingresso com QR Code e código de validação

`mod: check-in` + `tipo: feature` · Ana Luiza Dourado · due 2026-09-26

```markdown
**Sprint 2 · CP5** · **Pontos:** 5 · **Requisito:** RF-033, RNF-011

**Contexto.** O cartão-ingresso picotado é o elemento de assinatura da marca e a peça que o aluno mostra na porta do evento.

**Critério de aceite.** Dado que minha participação em `evt-001` está CONFIRMADA, Quando abro a rota do ingresso, Então vejo o cartão com borda tracejada e recortes laterais, QR Code, meu nome, o evento, a data e o código `CMP-3ESPX-0184`. Dado que a participação não está confirmada, Quando tento abrir o ingresso, Então recebo o estado atual da participação em vez do cartão.

**Pronto quando.** QR gerado a partir de token assinado de uso único (mock no CP5); cartão legível em tela de 320px; contraste do código monoespaçado em AA.
```

#### S2-08 · Escrever 8 testes unitários do domínio de vagas e ligar o gate de cobertura

`mod: inscrição` + `tipo: teste` · Vitor Pantarotto · due 2026-09-30 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RNF-015, CT-001..CT-006

**Contexto.** Sem gate no CI, cobertura cai na primeira semana de pressa. O domínio de vagas e fila é onde o defeito custa mais caro.

**Critério de aceite.** Dado o comando de cobertura, Quando ele roda no CI, Então a cobertura de `src/domain` é de no mínimo 60% e o job falha abaixo disso. Dado os 8 testes, Quando a suíte roda, Então cobre capacidade, duplicidade, prazo de inscrição, entrada na fila, promoção FIFO e expiração de oferta.

**Pronto quando.** 8 testes Vitest nomeados pelo `CT-0xx` que verificam; gate configurado no workflow; nenhum teste dependente de ordem de execução.
```

#### S2-09 · Automatizar o E2E de inscrição em evento lotado com entrada na fila

`mod: inscrição` + `tipo: teste` · Vitor Pantarotto · due 2026-10-01

```markdown
**Sprint 2 · CP5** · **Pontos:** 5 · **Requisito:** CT-003, CT-004, RNF-001, RNF-015

**Contexto.** É o critério de saída 8 do CP5: o fluxo principal precisa estar coberto por E2E, não por clique manual na véspera da demo.

**Critério de aceite.** Dado o app com o seed carregado, Quando o teste abre `evt-002` como Marina e entra na lista de espera, Então a inscrição acontece em no máximo 3 toques, a tela mostra a posição na fila e o estado persiste ao recarregar a página.

**Pronto quando.** Um teste Playwright rodando no CI em push e PR; sem espera fixa por tempo (só espera por elemento); falha do teste bloqueia o merge.
```

#### S2-11 · Conduzir teste de usabilidade com 5 alunos medindo os 90 segundos

`mod: design` + `tipo: teste` · João Viviani Baldini + Ana Luiza Dourado · due 2026-10-02

```markdown
**Sprint 2 · CP5** · **Pontos:** 5 · **Requisito:** RNF-005, RNF-001

**Contexto.** O requisito diz que um aluno se inscreve sem treinamento em 90 segundos. Isso é verificável com 5 pessoas de fora do time, não em reunião interna.

**Critério de aceite.** Dado 5 alunos que nunca viram o app, Quando cada um recebe a tarefa de achar um evento da própria turma e se inscrever, Então o tempo é cronometrado e comparado com os 90 segundos, sem nenhuma instrução do time durante a execução.

**Pronto quando.** 5 sessões registradas com tempo, trechos de fala e ponto de travamento; achados classificados por severidade; cada achado virou card no Backlog com responsável sugerido.
```

#### S2-12 · Escrever o roteiro da demo do CP5 e refinar o backlog do CP6

`mod: docs` + `tipo: docs` · João Viviani Baldini · due 2026-10-03

```markdown
**Sprint 2 · CP5** · **Pontos:** 5 · **Requisito:** critério de saída 7 do CP5

**Contexto.** Demo ao vivo sem roteiro trava no primeiro clique inesperado. E o backlog do CP6 precisa entrar na planning já ordenado pelo que a validação mostrou.

**Critério de aceite.** Dado o roteiro, Quando outra pessoa do time o executa sem ensaio, Então consegue demonstrar inscrição paga em `evt-001`, entrada na fila em `evt-002` e histórico em `evt-009` sem improvisar. Dado o backlog do CP6, Quando a planning da Sprint 3 começa, Então os cards estão ordenados e com os 6 itens do DoR.

**Pronto quando.** Roteiro em passos numerados com plano B gravado em vídeo; backlog reordenado com os achados dos cards S2-10 e S2-11.
```

### Lista `To Do`

#### S2-10 · Revisar os 18 RF Must implementados e especificar erros e estados vazios

`mod: docs` + `tipo: docs` · Lucas Zolla · due 2026-09-29

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-005..RF-037 (Must), RNF-005

**Contexto.** Requisito desatualizado é o começo de todo retrabalho. Ao fim do CP5 o documento tem de descrever o que existe, não o que se imaginou em agosto.

**Critério de aceite.** Dado cada RF Must do CP5, Quando a revisão termina, Então ele está marcado como atendido, parcial ou não atendido, com o print ou o teste que comprova; e toda divergência gerou card `tipo: bug` no Backlog.

**Pronto quando.** Documento de requisitos atualizado no mesmo PR da revisão; texto definitivo de mensagem de erro e de estado vazio das 8 telas entregue para a Ana aplicar.
```

### Lista `Doing`

#### S2-02 · Implementar a lista de eventos com filtros e o detalhe com ocupação de vagas

`mod: eventos` + `tipo: feature` · Lucas Baraldi · due 2026-09-16 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-015, RF-016, RNF-006

**Contexto.** São as duas telas mais visitadas do app e a porta de entrada da inscrição. É o que a demo do CP5 mostra primeiro.

**Critério de aceite.** Dado que estou logado como Marina (ECOMP · 3ESPX), Quando aplico o filtro Minha turma, Então vejo apenas eventos de alcance TURMA da 3ESPX ordenados pela data mais próxima, e `evt-003` (CURSO ECOMP) não aparece. Dado que abro `evt-002` com 80/80 vagas, Quando a tela carrega, Então vejo 80/80 vagas, a barra cheia e o botão de entrar na lista de espera.

**Pronto quando.** p95 de carga do feed abaixo de 2s em 4G simulado; layout sem rolagem horizontal de 320 a 1440px; estados de carregamento e lista vazia implementados.
```

#### S2-04 · Implementar a reserva de vaga sem estouro de capacidade e sem duplicidade

`mod: inscrição` + `tipo: feature` · Ronaldo Veloso Filho · due 2026-09-19 · tem checklist

```markdown
**Sprint 2 · CP5** · **Pontos:** 8 · **Requisito:** RF-019, RF-020, RF-022, RN-004, RN-015

**Contexto.** É o coração do domínio. Overbooking e inscrição duplicada são os dois defeitos que destroem a confiança no app inteiro.

**Critério de aceite.** Dado um evento gratuito com vaga, Quando toco em participar, Então a participação nasce CONFIRMADA e o contador sobe 1. Dado um evento pago, Quando me inscrevo, Então nasce PENDENTE_PAGAMENTO. Dado que resta 1 vaga e dois alunos se inscrevem ao mesmo tempo, Quando as duas requisições são processadas, Então exatamente uma é confirmada e a outra recebe oferta de lista de espera.

**Pronto quando.** `CT-001`, `CT-002`, `CT-019` e `CT-020` verdes; reserva atômica isolada em `src/domain`; segunda inscrição do mesmo aluno recusada com o estado atual na tela em vez do botão.
```

### Lista `Code Review`

#### S2-01 · Implementar o onboarding de vínculo com validação de domínio institucional

`mod: autenticação` + `tipo: feature` · Lucas Zolla + Lucas Baraldi · due 2026-09-12

```markdown
**Sprint 2 · CP5** · **Pontos:** 5 · **Requisito:** RF-002, RF-005, RN-001

**Contexto.** O vínculo com turma é o que faz o alcance segmentado funcionar. Sem onboarding correto, o feed mostra evento errado para a pessoa errada.

**Critério de aceite.** Dado que informo um e-mail de domínio não cadastrado, Quando submeto o cadastro, Então recebo a mensagem sobre usar o e-mail institucional e a conta não é criada. Dado que informo o código `3ESPX-26`, Quando concluo o onboarding, Então meu perfil passa a ter a turma 3ESPX e o feed mostra eventos dos três níveis de alcance.

**Pronto quando.** Validação Zod do domínio com teste unitário; código de turma inválido tratado com mensagem específica; navegação por teclado funcionando na tela.
```

### Lista `Done`

#### S1-01 · Escrever a declaração de problema, 3 personas e 6 antipersonas

`mod: docs` + `tipo: docs` · Lucas Zolla + Ana Luiza Dourado · due 2026-08-22

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** personas Marina Alves, Rafael Souza e Beatriz Nakamura

**Contexto.** A divulgação de evento na faculdade se espalha entre grupo de WhatsApp, story e lista em papel. Sem persona escrita, o time discute tela antes de entender o problema.

**Critério de aceite.** Dado o documento de problema e personas, Quando o professor o lê, Então encontra a declaração com os 4 efeitos (alcance errado nas duas direções, controle manual de vagas, cobrança na conta pessoal de um aluno, nenhuma memória do que aconteceu), 3 personas com idade, curso, turma, dor e critério de sucesso, e 6 antipersonas com o motivo da exclusão.

**Pronto quando.** `docs/01-problema-e-personas.md` na `main`, revisado pelo PO, sem persona sem dor mensurável.
```

#### S1-02 · Especificar 43 RF, 22 RNF e 25 regras de negócio com critério de aceite

`mod: docs` + `tipo: docs` · Lucas Zolla + João Viviani Baldini · due 2026-08-29

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** RF-001..RF-043, RNF-001..RNF-022, RN-001..RN-025

**Contexto.** É a base de rastreabilidade do projeto inteiro: caso de uso, diagrama, card e caso de teste apontam para esses IDs.

**Critério de aceite.** Dado o documento de requisitos, Quando qualquer RF é lido, Então ele tem prioridade MoSCoW, ator, descrição e critério de aceite em Dado/Quando/Então; e cada uma das 25 regras de negócio tem ao menos um caso de teste `CT-0xx` associado.

**Pronto quando.** `docs/02-requisitos.md` e `docs/04-regras-de-negocio.md` na `main`, 12 requisitos recusados registrados como `RFX-01..RFX-12` com motivo, e a seção de rastreabilidade fechando RN → CT sem lacuna.
```

#### S1-03 · Classificar os 43 RF em MoSCoW e definir premissas, dependências e marcos

`mod: docs` + `tipo: docs` · João Viviani Baldini + Lucas Zolla · due 2026-08-25

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** P-01..P-07, D-01..D-06

**Contexto.** Sem MoSCoW e sem critério de saída, CP5 e CP6 viram lista de desejos e o escopo cresce de graça.

**Critério de aceite.** Dado o documento de escopo, Quando o PO precisa decidir o que entra na sprint, Então encontra os 43 RF classificados em Must/Should/Could/Won't, as 7 premissas, as 6 dependências com plano B, os marcos CP4/CP5/CP6 datados e os 10 critérios de saída por checkpoint.

**Pronto quando.** `docs/03-escopo.md` na `main`; todo item fora de escopo tem justificativa escrita; datas de sprint iguais às deste quadro.
```

#### S1-04 · Escrever o pitch de 1 minuto e o roteiro do vídeo de 2 minutos

`mod: docs` + `tipo: docs` · João Viviani Baldini + Ana Luiza Dourado · due 2026-09-03

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** critério de avaliação Ideia de venda (15%)

**Contexto.** O pitch precisa vender a solução para quem nunca ouviu falar dela em 60 segundos, e o vídeo de 2 minutos é a entrega audiovisual do CP4.

**Critério de aceite.** Dado o pitch, Quando alguém de fora do time o lê em voz alta, Então cabe em 1 minuto e contém one-liner, problema, solução, diferencial e o comparativo com as alternativas atuais (grupo de WhatsApp, story, lista em papel, plataforma de ingresso comercial).

**Pronto quando.** Pitch e roteiro na `main`; roteiro com marcação de tempo cobrindo os 120 segundos e indicando a tela mostrada em cada bloco.
```

#### S1-05 · Especificar os 23 casos de uso e o dicionário de dados das 13 entidades

`mod: docs` + `tipo: modelagem` · Ronaldo Veloso Filho · due 2026-08-27

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** UC-001..UC-023

**Contexto.** Os casos de uso ligam requisito a comportamento e o dicionário de dados fixa tipo e restrição de cada campo antes de existir banco.

**Critério de aceite.** Dado um caso de uso qualquer, Quando ele é lido, Então tem ator primário, pré-condição, fluxo principal numerado, fluxos de exceção e pós-condição; e cada campo das 13 entidades tem tipo, obrigatoriedade, restrição e origem no dicionário.

**Pronto quando.** `docs/05-modelagem/01-casos-de-uso.md` e `docs/05-modelagem/dicionario-de-dados.md` na `main`, com os enums iguais aos de `app/src/types/domain.ts`.
```

#### S1-06 · Modelar os 12 diagramas Mermaid do CP4 e exportá-los em SVG

`mod: docs` + `tipo: modelagem` · Ronaldo Veloso Filho + Lucas Baraldi · due 2026-09-02 · tem checklist

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** casos de uso, classes, ER, sequência, atividades, estados, componentes

**Contexto.** Modelagem UML vale 20% da nota do CP4 e é o contrato estrutural que o CP5 implementa.

**Critério de aceite.** Dado o diretório de modelagem, Quando o renderizador roda, Então os 12 blocos Mermaid renderizam sem erro e existe um SVG correspondente em `docs/05-modelagem/exports/`; multiplicidades e enums batem com o diagrama de classes.

**Pronto quando.** `npm run diagrams` verde, nenhum rótulo acentuado dentro de bloco Mermaid, e o diagrama de estados de `Participacao` cobrindo os 8 valores de `StatusParticipacao`.
```

#### S1-07 · Definir paleta, tipografia, contraste AA e styleguide de componentes

`mod: design` + `tipo: design` · Ana Luiza Dourado · due 2026-08-26

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** RNF-002, RNF-003, RNF-004

**Contexto.** Identidade visual vale 20% da nota. Token com nome diferente no Figma e no Tailwind é o começo de toda divergência entre design e código.

**Critério de aceite.** Dado o documento de identidade visual, Quando um par texto/fundo qualquer é medido, Então o contraste é de no mínimo 4,5:1; e todo token de cor, tipografia, espaçamento, raio e sombra tem o mesmo nome no Tailwind e no Figma.

**Pronto quando.** Escalas coral, teal e neutral completas de 50 a 900; styleguide publicado com os estados (padrão, hover, foco, desabilitado, erro) de cada componente; elemento de assinatura (cartão-ingresso picotado) especificado.
```

#### S1-08 · Desenhar o kit de marca em SVG e montar o Figma com 8 telas navegáveis

`mod: design` + `tipo: design` · Ana Luiza Dourado · due 2026-09-04 · tem checklist

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** RNF-018

**Contexto.** A banca vê a marca antes de ver o código. Logo em variação única e protótipo sem navegação derrubam a nota de identidade visual.

**Critério de aceite.** Dado o arquivo do Figma, Quando o protótipo é aberto no celular, Então é possível navegar feed → lista → detalhe do evento → inscrição → ingresso sem sair do protótipo; e as 8 telas estão em 390×844 usando apenas componentes da página Components.

**Pronto quando.** `logo.svg`, `logo-horizontal.svg`, `logo-simbolo.svg`, `logo-mono.svg`, `favicon.svg` e `og-image.svg` no repo; link do Figma com permissão de leitura registrado na documentação da marca.
```

#### S1-09 · Montar a base do app React com tokens, 7 rotas, MSW e Vitest

`mod: infra` + `tipo: feature` · Lucas Baraldi · due 2026-08-31

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** RNF-007, RNF-016, RNF-017

**Contexto.** É a fundação que o CP5 consome. Se a camada de repositório não estiver isolada agora, trocar mock por API real no CP6 vira reescrita de tela.

**Critério de aceite.** Dado o app instalado, Quando `npm run dev` sobe, Então as 7 rotas respondem (`/`, `/eventos`, `/eventos/:id`, `/criar`, `/perfil`, `/ingresso/:id` e 404) com o seed de 11 eventos servido pelo MSW; e nenhuma tela chama `fetch` direto.

**Pronto quando.** `npm run lint`, `npm run test` e `npm run build` verdes; bundle ≤ 250 KB gzip; TypeScript strict sem `any` não justificado; tokens no `tailwind.config.ts` com os nomes do styleguide.
```

#### S1-10 · Organizar o repositório com CONTRIBUTING, templates, ADRs, CI verde e Pages

`mod: infra` + `tipo: chore` · Lucas Baraldi + Vitor Pantarotto · due 2026-09-04

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** RNF-017, critério de avaliação GitHub organizado (10%)

**Contexto.** Repositório desorganizado custa 10% da nota e some com a rastreabilidade de quem fez o quê.

**Critério de aceite.** Dado o repositório, Quando alguém tenta dar push direto na `main`, Então o push é recusado e o caminho é o PR com CI verde; e o histórico de commits segue Conventional Commits com os escopos do projeto.

**Pronto quando.** `CONTRIBUTING.md` com fluxo de branch, DoR e DoD; templates de PR e de issue; ADRs registradas em `docs/adr/`; workflow rodando lint, test e build em push e PR; GitHub Pages publicado e acessível.
```

#### S1-11 · Escrever o plano de testes CT-001..CT-031 e a matriz de riscos

`mod: docs` + `tipo: teste` · Vitor Pantarotto + Lucas Zolla · due 2026-09-01

```markdown
**Sprint 1 · CP4** · **Pontos:** 8 · **Requisito:** CT-001..CT-031, RN-001..RN-025

**Contexto.** Regra de negócio sem caso de teste é intenção. O plano de testes é o que transforma as 25 regras em verificação executável no CP5.

**Critério de aceite.** Dado o plano de testes, Quando a rastreabilidade é conferida, Então cada `RN-0xx` tem ao menos um `CT-0xx` conforme o mapa da documentação de regras, e cada caso está escrito em Gherkin com dado de entrada vindo do seed.

**Pronto quando.** Plano de testes e matriz de riscos na `main`; matriz com probabilidade, impacto, resposta e responsável por risco; nenhuma regra sem caso.
```

#### S1-12 · Montar o quadro do Trello com 7 listas, 18 labels e o pacote de importação

`mod: docs` + `tipo: chore` · Vitor Pantarotto + João Viviani Baldini · due 2026-09-05 · tem checklist

```markdown
**Sprint 1 · CP4** · **Pontos:** 5 · **Requisito:** D-05, critério de avaliação Organização no Trello (10%)

**Contexto.** O quadro precisa existir de verdade e refletir o estado real dos cards — é critério de saída de todos os três checkpoints.

**Critério de aceite.** Dado o quadro criado, Quando o professor abre o link, Então vê as 7 listas, as 18 labels coloridas, os 6 membros e os 32 cards nas listas corretas, com a Sprint 1 inteira em Done.

**Pronto quando.** Quadro no ar; `docs/09-trello/quadro.md`, `trello-import.json`, `trello-import.csv`, `criar-quadro.md` e `criar-quadro.sh` na `main`; print do quadro em uso salvo em `docs/09-trello/evidencia.png`.
```

### Lista `Bloqueado`

#### S3-03 · Integrar Pix e cartão em sandbox com webhook idempotente e reembolso

`mod: pagamento` + `tipo: feature` · Ronaldo Veloso Filho · due 2026-10-24 · tem checklist

```markdown
**Sprint 3 · CP6** · **Pontos:** 8 · **Requisito:** RF-028, RF-029, RF-030, RF-031, RN-012, RN-013, RN-014, RNF-014, RNF-022

**BLOQUEADO — dependência D-02:** sandbox de gateway com Pix. Credencial de teste solicitada ao provedor; sem resposta, o plano B é o gateway simulado próprio atrás da mesma interface `PaymentGateway`. Revisar em 48h.

**Contexto.** Cobrança informal na conta pessoal de um aluno é o terceiro problema da declaração. Pagamento é o que resolve, e é também o ponto onde erro custa dinheiro real.

**Critério de aceite.** Dado `evt-001` a R$ 25,00, Quando escolho Pix, Então recebo copia-e-cola e QR e o pagamento fica AGUARDANDO. Dado que o gateway envia a mesma confirmação duas vezes, Quando o webhook é processado, Então existe uma única confirmação e uma única participação CONFIRMADA. Dado que não pago em 60 minutos, Quando a janela expira, Então a participação fica EXPIRADA e a vaga é liberada para a fila.

**Pronto quando.** `CT-007`, `CT-008`, `CT-009` e `CT-010` verdes; reembolso integral com 7 dias ou mais de antecedência e 50% entre 48h e 7 dias; nenhum dado de cartão no nosso banco.
```

---

## 9. Três formas de popular o quadro

| Caminho | Como | Prós | Contras |
|---|---|---|---|
| **A. JSON** — [`trello-import.json`](trello-import.json) | Ferramenta de importação de board JSON, ou o script [`criar-quadro.sh`](criar-quadro.sh) que faz o mesmo pela API REST | Fidelidade total: listas, 18 labels com cor, membros, 32 cards, 11 checklists com 57 itens, due dates, posições e referências cruzadas. Fica versionado no git, então o quadro é reconstruível a qualquer momento | O Trello **não importa** board JSON nativamente: exige ferramenta de terceiro (que pede autorização na sua conta) ou o script com `TRELLO_KEY` e `TRELLO_TOKEN`. Atribuir membro por id sintético não funciona — os `idMembers` do JSON são de referência, o script atribui por username |
| **B. CSV** — [`trello-import.csv`](trello-import.csv) | Menu do quadro → Importar → CSV. Também é o formato aceito por Notion e Jira | Importador nativo, sem token e sem ferramenta externa. Uma linha por card com lista, responsável, labels, estimativa, sprint e due date. Serve de plano B se a conta do Trello travar: mesmo conteúdo no Notion ou no Jira (dependência D-05) | Não carrega checklist nem campo personalizado. O casamento de responsável depende de o nome bater com um membro do quadro. Em algumas contas a importação de CSV é recurso pago, e o formato de data segue a região da conta |
| **C. Manual** — §1 a §8 deste arquivo | Copiar e colar | Não depende de plano pago, token ou ferramenta externa. Quem cria aprende o quadro, e é o único caminho que funciona em 100% das contas | Leva ~45 minutos no total. Risco de o texto digitado divergir do documento — por isso as §6 a §8 são geradas do JSON, e não escritas à mão |

**Recomendação:** faça **C** para o esqueleto (§1 a §5, que é o que precisa de decisão
humana) e **A** pelo script para os cards, se houver token. Sem token, **C** inteiro.
Deixe **B** para reconstruir em outra ferramenta.

Ordem de importação importa em qualquer caminho: quadro → listas → labels → membros →
cards → checklists. Card criado antes da label nasce sem label e ninguém volta para
arrumar.

---

## 10. Validação final — 8 itens

Confira na tela, um por um. Item que falhar volta para o passo indicado.

| # | Verificação | Como conferir | Se falhar |
|---|---|---|---|
| 1 | 7 listas na ordem `Backlog → Sprint Backlog → To Do → Doing → Code Review → Done → Bloqueado` | Olhar o quadro da esquerda para a direita | §2 |
| 2 | 32 cards no total, distribuídos em 7 / 8 / 1 / 2 / 1 / 12 / 1 | Ligar Menu → Configurações → contagem de cartões por lista | §5 |
| 3 | 18 labels criadas, com as cores da tabela da §3 | Abrir o seletor de etiquetas em qualquer card | §3 |
| 4 | Todo card com exatamente 1 label `mod:` e 1 label `tipo:` | Filtrar por cada label `tipo:` e somar: tem de dar 32 (com `tipo: bug` em zero) | §7 |
| 5 | 6 membros no quadro e nenhum card sem responsável | Filtrar por **Sem membros**: o resultado tem de ser vazio | §4 e §7 |
| 6 | Pontos por integrante: Baraldi 45 · Ana 42 · Ronaldo 40 · Zolla 37 · João 34 · Vitor 34 (total 232) | Filtrar por membro e somar o campo `Pontos` | §7 |
| 7 | Due dates dentro da janela da sprint do card, nenhuma fora de 18/08 a 07/11/2026 | Menu → Calendário | §7 |
| 8 | Print do quadro em uso salvo em `docs/09-trello/evidencia.png`, mostrando os 8 elementos exigidos | Conferir contra a lista de [`quadro.md`](quadro.md) §7.6 | §7.6 do `quadro.md` |

Fechando os 8, o quadro está no estado descrito em [`quadro.md`](quadro.md) e atende ao
critério de saída 5 do checkpoint ([`../03-escopo.md`](../03-escopo.md) §9): quadro
refletindo o estado real dos cards.
