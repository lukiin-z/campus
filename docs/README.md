# Documentação do Campus

Índice navegável de toda a documentação do projeto — **25 documentos, 8 ADRs e 21 diagramas
UML**. Comece pelo que você quer saber, não pela ordem dos arquivos.

| Quero… | Leia |
|---|---|
| **subir o produto agora** | [`23-instalacao.md`](23-instalacao.md) — `docker compose up` |
| **usar o produto** | [`22-manual-de-uso.md`](22-manual-de-uso.md) |
| **chamar a API** | [`21-api-contrato.md`](21-api-contrato.md), derivado de [`api/openapi.yaml`](../api/openapi.yaml) |
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
| ver o que estava planejado para o CP5 e o CP6 | [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md) |
| avaliar o app sem instalar nada | [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) |
| **entender como o projeto evoluiu entre os checkpoints** | [`17-jornada.md`](17-jornada.md) |
| conferir a entrega do CP4 | [`16-checklist-entrega-cp4.md`](16-checklist-entrega-cp4.md) |
| conferir a entrega do CP5 | [`19-checklist-entrega-cp5.md`](19-checklist-entrega-cp5.md) |
| **conferir a entrega do CP6** | [`24-checklist-entrega-cp6.md`](24-checklist-entrega-cp6.md) |

---

## 1. Concepção e requisitos — peso 25%

| # | Documento | O que tem dentro |
|---|---|---|
| 01 | [Problema e personas](01-problema-e-personas.md) | Contexto, declaração de problema em uma frase, premissas de dimensionamento, 3 personas completas, antipersona, jornada em Mermaid e mapa de empatia |
| 02 | [Requisitos](02-requisitos.md) | **43 requisitos funcionais** com critério de aceite `Dado/Quando/Então`, **22 não funcionais** por característica da ISO/IEC 25010 com métrica verificável, matriz de rastreabilidade e **12 requisitos recusados** com justificativa |
| 03 | [Escopo](03-escopo.md) | In/out of scope item por item, MVP por MoSCoW, premissas P-01 a P-07, restrições, dependências D-01 a D-06, marcos CP4→CP5→CP6 e critérios de saída |
| 04 | [Regras de negócio](04-regras-de-negocio.md) | **29 regras invariantes** `RN-001` a `RN-029`, com os parâmetros do domínio centralizados e rastreabilidade regra → requisito → teste → arquivo |
| 14 | [Glossário](14-glossario.md) | Linguagem ubíqua: termo em português, identificador em inglês, definição, "não confundir com" — e uma lista de **termos proibidos**. A seção 9b traz os termos do CP6: monorepo, workspace, migração, `SELECT … FOR UPDATE`, índice único parcial, refresh token, healthcheck |

## 2. Modelagem UML — 21 diagramas

Índice completo, com o que cada diagrama responde:
**[`05-modelagem/README.md`](05-modelagem/README.md)**

Revisão 3.0 no CP6: conferidos contra o **backend**, e não mais só contra o front.

| # | Diagrama | Tipo | Arquivo |
|---|---|---|---|
| 1 | Casos de uso — 23 UCs, 7 atores, `include`/`extend` e especificação textual de UC-001 a UC-005 | `flowchart` | [`01-casos-de-uso.md`](05-modelagem/01-casos-de-uso.md) |
| 2 | Classes — 13 entidades persistidas + as projeções de leitura em diagrama próprio, 15 enumerações, multiplicidades e 9 decisões de modelagem | `classDiagram` ×2 | [`02-diagrama-classes.md`](05-modelagem/02-diagrama-classes.md) |
| 3 | Modelo ER — **14 tabelas**, 20 `CHECK`, 2 únicos parciais, 8 índices parciais, o `SELECT … FOR UPDATE` de RN-004 e as 22 verificações que provam que o banco recusa | `erDiagram` | [`03-modelo-dados-er.md`](05-modelagem/03-modelo-dados-er.md) |
| 4 | Sequência — login, onboarding, inscrição, **a mesma inscrição contra a API real com trava de linha**, lista de espera e oferta, pagamento, check-in nas três leituras, publicar no feed | `sequenceDiagram` ×8 | [`04-diagrama-sequencia.md`](05-modelagem/04-diagrama-sequencia.md) |
| 5 | Atividades — criar evento, ação principal com os 11 estados do botão, pagamento com a expiração, check-in na porta, onboarding | `flowchart` ×5 | [`05-diagrama-atividades.md`](05-modelagem/05-diagrama-atividades.md) |
| 6 | Estados — ciclo de vida de `Participacao` e de `Evento`, com as transições **proibidas** e o que ainda não tem executor | `stateDiagram-v2` ×2 | [`06-diagrama-estados.md`](05-modelagem/06-diagrama-estados.md) |
| 7 | Componentes — o monorepo de três workspaces, `@campus/shared` como fronteira verificada, as duas fontes de dados, os módulos da API, o Prisma e o Postgres | `flowchart` | [`07-diagrama-componentes.md`](05-modelagem/07-diagrama-componentes.md) |
| — | Dicionário de dados — **14 entidades** campo a campo, os 20 tipos que não são tabela e o inventário LGPD | tabelas | [`dicionario-de-dados.md`](05-modelagem/dicionario-de-dados.md) |

Exports em SVG: [`05-modelagem/exports/`](05-modelagem/exports/README.md) ·
Regenerar: `npm run diagrams`

## 3. Marca e identidade visual — peso 20%

| Documento | O que tem dentro |
|---|---|
| [Identidade visual](06-marca/identidade-visual.md) | Racional da marca, 3 escalas de 10 passos com HEX/RGB/HSL, **verificação de contraste WCAG 2.1 AA de 28 pares com razão calculada**, tipografia, espaçamento, usos incorretos e tom de voz |
| [Design system](06-marca/design-system.md) | Inventário de 20 componentes com anatomia, variantes, estados, tokens e acessibilidade |
| [Guia do Figma](06-marca/guia-figma.md) | O que foi construído no arquivo, o mapa styles↔tokens, como o grupo edita — e os limites do plano Starter que interromperam a construção |
| [Styleguide HTML](06-marca/styleguide.html) | **Prova visual**: página única e autossuficiente com a marca inteira. Abra no navegador |
| [Assets](06-marca/assets) | 6 SVGs escritos à mão: símbolo, lockup, mono, horizontal, favicon e og-image |

## 4. Pitch e vídeo

| Documento | O que tem dentro |
|---|---|
| [Pitch](07-pitch.md) | One-liner, elevator pitch de 30s, **pitch de 1 minuto palavra por palavra**, canvas de proposta de valor, comparativo honesto com Instagram / WhatsApp / Sympla / Google Forms, modelo de negócio e métricas de sucesso |
| [Roteiro do vídeo — CP4](15-video-roteiro.md) | Roteiro de 2 minutos cronometrado, escalação dos 6 integrantes, storyboard, checklist de gravação |
| [Slides do CP4](15-video-slides.html) | Deck estático navegável por setas, na identidade do Campus |
| [Roteiro do vídeo — CP5](20-video-cp5-roteiro.md) | Roteiro de 2 minutos do **protótipo rodando**: storyboard cronometrado, usuário de teste por cena e plano B de gravação |
| [Slides do CP5](20-video-cp5-slides.html) | Deck de apoio da gravação do CP5 |
| [**Roteiro do vídeo — CP6**](25-video-cp6-roteiro.md) | Roteiro de **3 minutos do produto rodando contra banco**: a stack subindo em um comando, o fluxo com dado persistido, e um bloco de 26 s comparando as **duas fontes** lado a lado. 8 blocos somando exatamente 180 s, com conferência de palavras |
| [Slides do CP6](25-video-cp6-slides.html) | Deck de 9 slides: a cadeia de serviços, a fila, a prova de persistência, as 22 restrições, a evolução do mock ao banco e os números medidos |

## 5. Organização no Trello — peso 10%

| Documento | Para quê |
|---|---|
| [Quadro](09-trello/quadro.md) | Estrutura de 7 listas, labels, DoR/DoD e o backlog completo com responsável, pontos e sprint |
| [Criar o quadro](09-trello/criar-quadro.md) | Roteiro manual de 10 minutos, com o texto pronto de cada card |
| [`trello-import.json`](09-trello/trello-import.json) | Importação por JSON no formato de board export |
| [`trello-import.csv`](09-trello/trello-import.csv) | Importação por CSV — serve também para Notion e Jira |
| [`criar-quadro.sh`](09-trello/criar-quadro.sh) | Criação via API REST do Trello, com key e token lidos de variável de ambiente |

## 6. Produto: contrato, uso e instalação — novos no CP6

| Documento | O que tem dentro |
|---|---|
| [Contrato da API](21-api-contrato.md) | As **43 operações** por módulo, com método, rota, autenticação exigida, request, response e os **códigos de erro estáveis**. As duas convenções que explicam quase todo status — `404` para invisível e `409` versus `422` — com exemplo. E a **reconciliação com o CP5**: as 30 rotas preservadas, as 13 novas e a única quebra de compatibilidade. **Deriva de [`api/openapi.yaml`](../api/openapi.yaml)**, que vence em caso de divergência |
| [Manual de uso](22-manual-de-uso.md) | Como usar o produto, fluxo por fluxo |
| [Instalação](23-instalacao.md) | Como subir a stack inteira em um comando, e o que fazer quando algo falha |
| [Checklist do CP6](24-checklist-entrega-cp6.md) | Os 5 critérios do CP6 com peso, artefato e **evidência verificável**, o estado medido de cada verificação com o comando ao lado, e o que **não** foi medido |

## 7. Arquitetura e engenharia

| Documento | O que tem dentro |
|---|---|
| [Arquitetura](08-arquitetura.md) | C4 nível 1 e 2 com o monorepo, decisões de stack com trade-offs, camadas do front, autenticação com **JWT + refresh revogável**, token de check-in e como as duas fontes de dados convivem. A §5 **não duplica** o contrato: referencia [`21-api-contrato.md`](21-api-contrato.md) e explica por que essa separação existe |
| [ADRs](adr/README.md) | **8 decisões** arquiteturais registradas com contexto, alternativas recusadas, consequências negativas e como reverter. A [ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md) é a do CP6: o monorepo com o domínio em pacote compartilhado, e os seis defeitos de infraestrutura que a migração custou |
| [Plano de testes](11-plano-de-testes.md) | Estratégia, pirâmide, **CT-001 a CT-037 em Gherkin**, teste E2E e roteiros manuais de acessibilidade |
| [Riscos](12-riscos.md) | Escalas definidas, matriz 5×5, **16 riscos** com gatilho, contingência e responsável, e os riscos já materializados |
| [Roadmap CP5–CP6](13-roadmap-cp5-cp6.md) | O que estava planejado para cada checkpoint, em tarefas com responsável e estimativa, e as pendências técnicas conhecidas |
| [Equipe e papéis](10-equipe-e-papeis.md) | Os 6 integrantes com RM, responsabilidades detalhadas, matriz RACI dos artefatos e cerimônias |
| [Registro da jornada](17-jornada.md) | Linha do tempo por tag (`cp4`, `cp5`, `cp6`): decisões, mudanças de requisito que a implementação provocou e **os defeitos que a verificação encontrou** — é a evidência do critério de evolução do CP6 |
| [Ambiente de teste](18-ambiente-de-teste.md) | Como acessar o app publicado sem backend, rodar local, instalar como PWA, os usuários de teste do seed e um roteiro de 5 minutos por fluxo |
| [Checklist do CP4](16-checklist-entrega-cp4.md) | Cada item do enunciado e cada critério de avaliação mapeado ao artefato que o cumpre, com evidência |
| [Checklist do CP5](19-checklist-entrega-cp5.md) | Os 5 critérios do CP5 com peso, artefato e evidência verificável |

## 8. Como verificar esta documentação

Nada aqui é "confia": há **quatro** scripts que verificam o repositório, e o CI roda os quatro.

```bash
node scripts/validate-docs.mjs
```

Verifica que todo link relativo aponta para arquivo existente, que toda âncora `#secao`
existe no destino, que todo bloco ```mermaid está fechado, que todo SVG é XML bem formado
e que nenhum documento contém marcador de trabalho inacabado.

```bash
npm run diagrams          # ou: node scripts/render-diagrams.mjs --check
```

Valida a sintaxe de **todos** os blocos Mermaid renderizando cada um, e aponta arquivo e
linha do que falhar. Com `--check` nada é gravado; sem ele, gera os SVGs em
`05-modelagem/exports/`.

```bash
node scripts/check-contrato.mjs
```

Verifica a fronteira do pacote compartilhado: nenhum arquivo de `packages/shared/` pode
importar algo que não seja `zod` ou um caminho relativo, e a mensagem de erro diz **o
motivo** — "a API não roda React", "o app não tem banco". Também confere que o `alias` do
Vite e o `paths` do TypeScript resolvem `@campus/shared` para o mesmo lugar, porque divergir
entre os dois faz o `tsc` passar e o app servir código velho.

```bash
npm run check:rotas
```

Sobe a aplicação, pede o documento ao Swagger — que lê os decoradores em execução, e por
isso é a única fonte que não pode mentir sobre quais rotas existem — e compara a lista de
caminhos com [`api/openapi.yaml`](../api/openapi.yaml). Divergência para o build nos dois
sentidos: caminho declarado e não servido é `404` na cara de quem escreveu o cliente;
rota servida e não declarada é rota que ninguém sabe que existe.

Este script nasceu de uma frase. `api/src/main.ts` afirmava que essa comparação era "a
verificação que impede o contrato escrito e as rotas servidas divergirem" — e a
verificação não existia. É o mesmo padrão que o [registro da jornada](17-jornada.md)
documentou cinco vezes no CP5: aquilo que *parece* coberto porque alguém escreveu que
estava.

E, para as garantias que só o banco pode dar:

```bash
psql -f api/prisma/verificar-restricoes.sql
```

**22 verificações** que tentam gravar dado impossível e esperam que o PostgreSQL recuse.
Uma restrição declarada e nunca exercitada é uma restrição que ninguém sabe se funciona.

## 9. Convenções da documentação

| Convenção | Motivo |
|---|---|
| Identificadores estáveis: `RF-0xx`, `RNF-0xx`, `RN-0xx`, `RFX-xx`, `UC-00x`, `CT-0xx`, `R-xx`, `ADR-000x` | Requisito descontinuado é marcado, nunca renumerado — senão toda rastreabilidade quebra |
| Todo número que não vem do seed é rotulado como **premissa do grupo** | Não há estatística de mercado inventada nem fonte falsa em nenhum documento |
| **Todo número medido vem com o comando que o reproduz** | Número sem comando envelhece em silêncio. É a regra que o [checklist do CP6](24-checklist-entrega-cp6.md) segue linha por linha |
| Rótulos dentro de bloco Mermaid sem acento | Alguns renderizadores quebram com acento em rótulo não citado; o texto explicativo acentuado fica fora do bloco |
| Domínio em português, código em inglês | Ver [`14-glossario.md`](14-glossario.md) |
| Divergência entre documento e código: **o código vence**, e a divergência é reportada | Documentação desatualizada é o começo de todo retrabalho |
| **Documentação é viva: atualiza-se, não se reescreve** | Cada documento revisado abre com histórico dizendo o que mudou e por quê. O que continua verdadeiro é preservado; o que deixou de ser é corrigido **com o registro da correção** |
| **Uma informação, um dono** | O contrato mora em `api/openapi.yaml`; os números medidos, no checklist; as decisões, nas ADRs. Duplicar uma delas é combinar que as duas cópias vão divergir — foi o que aconteceu entre o CP4 e o CP5 |
| Toda decisão arquitetural relevante tem ADR | Reunião não registrada não aconteceu |
