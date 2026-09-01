# Equipe e papéis

**Disciplina:** Engenharia de Software · **Curso:** Engenharia de Computação (3º ano) ·
**Instituição:** FIAP · **Professor:** Hercules Ramos
**Projeto:** Campus — aplicativo de eventos universitários · **Checkpoint:** CP4

## 1. Quadro da equipe

| Integrante | RM | Papel no projeto | Responsabilidades no CP4 |
|---|---|---|---|
| Ana Luiza Dourado | RM558793 | UX/UI Designer | Identidade visual, protótipo Figma, design system, personas |
| João Viviani Baldini | RM558596 | Product Owner | Visão de produto, backlog, pitch, priorização MoSCoW |
| Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | Arquitetura, stack, repositório, CI/CD, padrões de código |
| Lucas Zolla | RM557952 | Analista de Requisitos | RF/RNF, escopo, regras de negócio, critérios de aceite |
| Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | Diagramas UML, modelo de dados, dicionário de dados |
| Vitor Pantarotto | RM554961 | Scrum Master / QA | Trello, sprints, cerimônias, plano de testes, riscos |

## 2. O que cada papel entrega, em detalhe

### Ana Luiza Dourado — UX/UI Designer

Dona da experiência e da marca. No CP4 responde por:

- Marca: nome aplicado, logo em todas as variações, paleta com escala completa,
  tipografia e regras de uso — [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md).
- Design system: inventário de componentes com anatomia, variantes e estados —
  [`06-marca/design-system.md`](06-marca/design-system.md).
- Arquivo Figma "Campus — Design System & App (CP4)": Foundations, Components,
  Screens (8 telas, 390×844) e Prototype navegável —
  [`06-marca/guia-figma.md`](06-marca/guia-figma.md).
- Personas e jornada do usuário, junto com o PO —
  [`01-problema-e-personas.md`](01-problema-e-personas.md).
- Revisora obrigatória de PR que toca `app/src/components/ui/`.

### João Viviani Baldini — Product Owner

Dono do "por quê" e da ordem das coisas. No CP4 responde por:

- Declaração de problema, proposta de valor e diferencial —
  [`07-pitch.md`](07-pitch.md).
- Pitch de 1 minuto, one-liner, elevator pitch e modelo de negócio.
- Priorização MoSCoW dos requisitos e definição do MVP —
  [`03-escopo.md`](03-escopo.md).
- Ordem do backlog no Trello e aceite dos cards concluídos.
- Métricas de sucesso do produto (ativação, comparecimento, eventos/turma/mês).

### Lucas Baraldi — Tech Lead / Arquiteto

Dono da viabilidade técnica. No CP4 responde por:

- Arquitetura de referência e contrato da API planejada —
  [`08-arquitetura.md`](08-arquitetura.md).
- Decisões registradas em ADR — [`adr/`](adr/README.md).
- Repositório: estrutura, `.gitignore`, `CONTRIBUTING.md`, templates, higiene de
  commits.
- Base do app React (`app/`) com tokens, camada de repositório e mocks — a fundação
  que o CP5 consome.
- CI/CD: [`ci.yml`](../.github/workflows/ci.yml) e
  [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml).
- Revisor obrigatório de PR que muda camada de dados, tipos de domínio ou pipeline.

### Lucas Zolla — Analista de Requisitos

Dono da precisão do escopo. No CP4 responde por:

- 30 requisitos funcionais e 15 não funcionais, com prioridade, ator e critério de
  aceite — [`02-requisitos.md`](02-requisitos.md).
- Matriz de rastreabilidade RF → caso de uso → tela → sprint.
- Regras de negócio numeradas — [`04-regras-de-negocio.md`](04-regras-de-negocio.md).
- Escopo explícito de fora de escopo, com justificativa.
- Glossário de domínio para linguagem ubíqua —
  [`14-glossario.md`](14-glossario.md).

### Ronaldo Veloso Filho — Modelagem / Analista UML

Dono da coerência estrutural. No CP4 responde por:

- Diagrama de casos de uso com 20 casos e relações `include`/`extend`, mais as
  especificações textuais de UC-001 a UC-005 —
  [`05-modelagem/01-casos-de-uso.md`](05-modelagem/01-casos-de-uso.md).
- Diagrama de classes com atributos tipados, multiplicidades e enums —
  [`05-modelagem/02-diagrama-classes.md`](05-modelagem/02-diagrama-classes.md).
- Modelo ER e dicionário de dados —
  [`05-modelagem/03-modelo-dados-er.md`](05-modelagem/03-modelo-dados-er.md).
- Diagramas de sequência, atividades, estados e componentes.
- Garantia de que `app/src/types/domain.ts` espelha o diagrama de classes.

### Vitor Pantarotto — Scrum Master / QA

Dono do processo e da qualidade percebida. No CP4 responde por:

- Quadro do Trello: listas, labels, 32 cards distribuídos em 3 sprints, DoR e DoD —
  [`09-trello/quadro.md`](09-trello/quadro.md).
- Cerimônias: planning, daily assíncrona, review e retrospectiva.
- Plano de testes: estratégia, pirâmide e casos em Gherkin —
  [`11-plano-de-testes.md`](11-plano-de-testes.md).
- Matriz de riscos com resposta e responsável —
  [`12-riscos.md`](12-riscos.md).
- Checklist de entrega e conferência final contra os critérios de avaliação —
  [`16-checklist-entrega-cp4.md`](16-checklist-entrega-cp4.md).

## 3. Matriz de responsabilidade (RACI) dos artefatos do CP4

`R` = responsável (faz) · `A` = aprova · `C` = consultado · `I` = informado

| Artefato | Ana | João | Baraldi | Zolla | Ronaldo | Vitor |
|---|---|---|---|---|---|---|
| Problema e personas | R | A | I | C | I | C |
| Requisitos RF/RNF | C | A | C | R | C | C |
| Escopo e MoSCoW | I | R | C | A | I | C |
| Regras de negócio | I | C | C | R | A | C |
| Diagramas UML | I | I | C | C | R | A |
| Modelo de dados | I | I | A | C | R | I |
| Identidade visual e logo | R | A | I | I | I | I |
| Design system | R | C | A | I | I | C |
| Arquivo Figma | R | C | C | I | I | A |
| Styleguide HTML | R | I | A | I | I | C |
| Pitch e proposta de valor | C | R | I | C | I | A |
| Roteiro e slides do vídeo | C | R | I | I | C | A |
| Quadro do Trello | C | A | I | C | I | R |
| Plano de testes | I | I | C | C | I | R |
| Matriz de riscos | I | C | C | I | I | R |
| Arquitetura e ADRs | I | I | R | C | C | A |
| App React (base) | C | I | R | I | C | A |
| CI/CD e GitHub Pages | I | I | R | I | I | C |
| README e checklist | C | C | R | C | C | A |

## 4. Cerimônias e cadência

| Cerimônia | Quando | Duração | Facilitador |
|---|---|---|---|
| Sprint Planning | Início de cada sprint | 60 min | Vitor Pantarotto |
| Daily assíncrona | Diária, no canal do grupo | 5 min por pessoa | Vitor Pantarotto |
| Refinamento de backlog | Meio da sprint | 45 min | João Viviani Baldini |
| Design review | Sob demanda, antes de codar tela | 30 min | Ana Luiza Dourado |
| Arquitetura / ADR review | Sob demanda | 30 min | Lucas Baraldi |
| Sprint Review (demo) | Fim da sprint | 30 min | João Viviani Baldini |
| Retrospectiva | Fim da sprint | 30 min | Vitor Pantarotto |

Cada sprint fecha em um checkpoint da disciplina: Sprint 1 → CP4, Sprint 2 → CP5,
Sprint 3 → CP6. O detalhamento de datas e cards está em
[`09-trello/quadro.md`](09-trello/quadro.md).

## 5. Regras de convivência do time

1. Ninguém revisa o próprio PR. Aprovação cruzada conforme a área (seção 2).
2. Bloqueio dura no máximo 24h em silêncio: passou disso, o card vai para
   **Bloqueado** com o motivo escrito e o Scrum Master reorganiza.
3. Decisão técnica discutida em reunião só vale se virar ADR ou comentário no card.
4. Quem escreve o requisito não é quem aprova o teste dele — QA valida contra o texto
   do critério de aceite, não contra a intenção.
5. Toda entrega de checkpoint tem revisão final conjunta contra
   [`16-checklist-entrega-cp4.md`](16-checklist-entrega-cp4.md) antes da submissão.
