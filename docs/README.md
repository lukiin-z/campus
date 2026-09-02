# Documentação do Campus

Índice navegável de toda a documentação do projeto. **Comece pelo que você quer saber**,
não pela ordem dos arquivos.

| Quero… | Leia |
|---|---|
| entender o problema em 5 minutos | [`01-problema-e-personas.md`](01-problema-e-personas.md) |
| saber exatamente o que o produto faz | [`02-requisitos.md`](02-requisitos.md) |
| saber o que **não** entra e por quê | [`03-escopo.md`](03-escopo.md) |
| entender uma regra que o código faz valer | [`04-regras-de-negocio.md`](04-regras-de-negocio.md) |
| ver a estrutura do sistema | [`05-modelagem/`](05-modelagem/README.md) |
| aplicar a marca corretamente | [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) |
| apresentar o produto | [`07-pitch.md`](07-pitch.md) |
| entender a decisão técnica | [`08-arquitetura.md`](08-arquitetura.md) e [`adr/`](adr/README.md) |
| trabalhar no backlog | [`09-trello/quadro.md`](09-trello/quadro.md) |
| saber quem faz o quê | [`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) |
| testar | [`11-plano-de-testes.md`](11-plano-de-testes.md) |
| saber o que pode dar errado | [`12-riscos.md`](12-riscos.md) |
| saber o que vem no CP5 e CP6 | [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md) |
| conferir a entrega do CP4 | [`16-checklist-entrega-cp4.md`](16-checklist-entrega-cp4.md) |

---

## 1. Concepção e requisitos — peso 25%

| # | Documento | O que tem dentro |
|---|---|---|
| 01 | [Problema e personas](01-problema-e-personas.md) | Contexto, declaração de problema em uma frase, premissas de dimensionamento, 3 personas completas, antipersona, jornada em Mermaid e mapa de empatia |
| 02 | [Requisitos](02-requisitos.md) | **43 requisitos funcionais** com critério de aceite `Dado/Quando/Então`, **22 não funcionais** por característica da ISO/IEC 25010 com métrica verificável, matriz de rastreabilidade e **12 requisitos recusados** com justificativa |
| 03 | [Escopo](03-escopo.md) | In/out of scope item por item, MVP por MoSCoW, premissas P-01 a P-07, restrições, dependências D-01 a D-06, marcos CP4→CP5→CP6 e critérios de saída |
| 04 | [Regras de negócio](04-regras-de-negocio.md) | **25 regras invariantes** `RN-001` a `RN-025`, com os parâmetros do domínio centralizados e rastreabilidade regra → requisito → teste → arquivo |
| 14 | [Glossário](14-glossario.md) | Linguagem ubíqua: termo em português, identificador em inglês, definição, "não confundir com" — e uma lista de **termos proibidos** |

## 2. Modelagem UML — peso 20%

Índice completo, com o que cada diagrama responde:
**[`05-modelagem/README.md`](05-modelagem/README.md)**

| # | Diagrama | Tipo | Arquivo |
|---|---|---|---|
| 1 | Casos de uso — 23 UCs, 7 atores, `include`/`extend` e especificação textual de UC-001 a UC-005 | `flowchart` | [`01-casos-de-uso.md`](05-modelagem/01-casos-de-uso.md) |
| 2 | Classes — 14 classes, 9 enumerações, multiplicidades e 7 decisões de modelagem explicadas | `classDiagram` | [`02-diagrama-classes.md`](05-modelagem/02-diagrama-classes.md) |
| 3 | Modelo ER — restrições, índices e a transação que sustenta RN-004 | `erDiagram` | [`03-modelo-dados-er.md`](05-modelagem/03-modelo-dados-er.md) |
| 4 | Sequência — Pix assíncrono, promoção da lista de espera, check-in por QR | `sequenceDiagram` ×3 | [`04-diagrama-sequencia.md`](05-modelagem/04-diagrama-sequencia.md) |
| 5 | Atividades — criação e publicação de evento, decisão do botão principal | `flowchart` ×2 | [`05-diagrama-atividades.md`](05-modelagem/05-diagrama-atividades.md) |
| 6 | Estados — ciclo de vida de `Participacao` e de `Evento`, com as transições **proibidas** | `stateDiagram-v2` ×2 | [`06-diagrama-estados.md`](05-modelagem/06-diagrama-estados.md) |
| 7 | Componentes — camadas do app, fronteira mock→API, dependências proibidas | `flowchart` | [`07-diagrama-componentes.md`](05-modelagem/07-diagrama-componentes.md) |
| — | Dicionário de dados — 14 entidades campo a campo + inventário LGPD | tabelas | [`dicionario-de-dados.md`](05-modelagem/dicionario-de-dados.md) |

Exports em SVG: [`05-modelagem/exports/`](05-modelagem/exports/README.md) ·
Regenerar: `node scripts/render-diagrams.mjs`

## 3. Marca e identidade visual — peso 20%

| Documento | O que tem dentro |
|---|---|
| [Identidade visual](06-marca/identidade-visual.md) | Racional da marca, 3 escalas de 10 passos com HEX/RGB/HSL, **verificação de contraste WCAG 2.1 AA de 28 pares com razão calculada**, tipografia, espaçamento, usos incorretos e tom de voz |
| [Design system](06-marca/design-system.md) | Inventário de 20 componentes com anatomia, variantes, estados, tokens e acessibilidade |
| [Guia do Figma](06-marca/guia-figma.md) | O que foi construído no arquivo, o mapa styles↔tokens, como o grupo edita — e os limites do plano Starter que interromperam a construção |
| [Styleguide HTML](06-marca/styleguide.html) | **Prova visual**: página única e autossuficiente com a marca inteira. Abra no navegador |
| [Assets](06-marca/assets) | 6 SVGs escritos à mão: símbolo, lockup, mono, horizontal, favicon e og-image |

## 4. Pitch e vídeo — peso 15%

| Documento | O que tem dentro |
|---|---|
| [Pitch](07-pitch.md) | One-liner, elevator pitch de 30s, **pitch de 1 minuto palavra por palavra**, canvas de proposta de valor, comparativo honesto com Instagram / WhatsApp / Sympla / Google Forms, modelo de negócio e métricas de sucesso |
| [Roteiro do vídeo](15-video-roteiro.md) | Roteiro de 2 minutos cronometrado, escalação dos 6 integrantes, storyboard, checklist de gravação |
| [Slides de apoio](15-video-slides.html) | Deck estático navegável por setas, na identidade do Campus, para compartilhar a tela na gravação |

## 5. Organização no Trello — peso 10%

| Documento | Para quê |
|---|---|
| [Quadro](09-trello/quadro.md) | Estrutura de 7 listas, labels, DoR/DoD e o backlog completo com responsável, pontos e sprint |
| [Criar o quadro](09-trello/criar-quadro.md) | Roteiro manual de 10 minutos, com o texto pronto de cada card |
| [`trello-import.json`](09-trello/trello-import.json) | Importação por JSON no formato de board export |
| [`trello-import.csv`](09-trello/trello-import.csv) | Importação por CSV — serve também para Notion e Jira |
| [`criar-quadro.sh`](09-trello/criar-quadro.sh) | Criação via API REST do Trello, com key e token lidos de variável de ambiente |

## 6. Arquitetura e engenharia

| Documento | O que tem dentro |
|---|---|
| [Arquitetura](08-arquitetura.md) | C4 nível 1 e 2, decisões de stack com trade-offs, camadas do front, **contrato da API planejada endpoint por endpoint**, autenticação, token de check-in e como o mock é substituído |
| [ADRs](adr/README.md) | 6 decisões arquiteturais registradas com contexto, alternativas recusadas, consequências negativas e como reverter |
| [Plano de testes](11-plano-de-testes.md) | Estratégia, pirâmide, **CT-001 a CT-031 em Gherkin**, teste E2E, roteiros manuais de acessibilidade e critérios de aceite do CP5 |
| [Riscos](12-riscos.md) | Escalas definidas, matriz 5×5, **16 riscos** com gatilho, contingência e responsável, e os riscos já materializados |
| [Roadmap CP5–CP6](13-roadmap-cp5-cp6.md) | O que falta para cada checkpoint, em tarefas com responsável e estimativa, e as pendências técnicas conhecidas |
| [Equipe e papéis](10-equipe-e-papeis.md) | Os 6 integrantes com RM, responsabilidades detalhadas, matriz RACI dos artefatos e cerimônias |
| [Checklist de entrega](16-checklist-entrega-cp4.md) | Cada item do enunciado e cada critério de avaliação mapeado ao artefato que o cumpre, com evidência |

## 7. Como verificar esta documentação

Nada aqui é "confia": há dois scripts que verificam a documentação, e o CI roda os dois.

```bash
node scripts/validate-docs.mjs
```

Verifica que todo link relativo aponta para arquivo existente, que toda âncora `#secao`
existe no destino, que todo bloco ```mermaid está fechado, que todo SVG é XML bem formado
e que nenhum documento contém marcador de trabalho inacabado.

```bash
node scripts/render-diagrams.mjs --check
```

Valida a sintaxe de **todos** os blocos Mermaid renderizando cada um, e aponta arquivo e
linha do que falhar. Sem `--check`, gera os SVGs em `05-modelagem/exports/`.

## 8. Convenções da documentação

| Convenção | Motivo |
|---|---|
| Identificadores estáveis: `RF-0xx`, `RNF-0xx`, `RN-0xx`, `RFX-xx`, `UC-00x`, `CT-0xx`, `R-xx`, `ADR-000x` | Requisito descontinuado é marcado, nunca renumerado — senão toda rastreabilidade quebra |
| Todo número que não vem do seed é rotulado como **premissa do grupo** | Não há estatística de mercado inventada nem fonte falsa em nenhum documento |
| Rótulos dentro de bloco Mermaid sem acento | Alguns renderizadores quebram com acento em rótulo não citado; o texto explicativo acentuado fica fora do bloco |
| Domínio em português, código em inglês | Ver [`14-glossario.md`](14-glossario.md) |
| Divergência entre documento e código: **o código vence**, e a divergência é reportada | Documentação desatualizada é o começo de todo retrabalho |
| Toda decisão arquitetural relevante tem ADR | Reunião não registrada não aconteceu |
