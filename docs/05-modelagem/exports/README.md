# Exports SVG dos diagramas

Arquivos gerados — **não edite à mão**. Fonte de verdade é o bloco ```mermaid dentro do
`.md` correspondente.

Regenerar:

```bash
node scripts/render-diagrams.mjs      # da raiz do repositório
npm run diagrams                       # de dentro de app/
```

O script varre **todo** `docs/`, não só esta pasta, valida cada bloco renderizando de
verdade e falha com arquivo e linha se algum não compilar. É por isso que os exports de
`01-problema-e-personas.md` e de `08-arquitetura.md` também caem aqui.

Nomenclatura: `<arquivo-de-origem>-<n>-<tipo>.svg`, onde `<n>` é a ordem do bloco no
arquivo. Renomear um arquivo de origem, ou inserir um bloco no meio dele, **renumera** os
SVGs seguintes — o mapa abaixo é a única forma confiável de saber qual é qual.

**24 SVGs, 24 blocos Mermaid.** 20 vêm de [`../`](..) e 4 de outros documentos.

## Modelagem UML — 20 SVGs

| SVG | Origem | O que mostra |
|---|---|---|
| `01-casos-de-uso-01-flowchart.svg` | [`../01-casos-de-uso.md`](../01-casos-de-uso.md) | 23 casos de uso, 7 atores, `include`/`extend`, coloridos pelo estado no CP5 |
| `02-diagrama-classes-01-classDiagram.svg` | [`../02-diagrama-classes.md`](../02-diagrama-classes.md) | 13 entidades persistidas, 3 objetos-valor e 10 enumerações |
| `02-diagrama-classes-02-classDiagram.svg` | idem | 11 projeções de leitura, 7 entradas de escrita e as 5 enumerações de resposta |
| `03-modelo-dados-er-01-erDiagram.svg` | [`../03-modelo-dados-er.md`](../03-modelo-dados-er.md) | 13 tabelas, chaves, tipos e relacionamentos |
| `04-diagrama-sequencia-01-sequenceDiagram.svg` | [`../04-diagrama-sequencia.md`](../04-diagrama-sequencia.md) | **Login** — `decideLogin`, `401` vs. `422`, token na camada de serviço |
| `04-diagrama-sequencia-02-sequenceDiagram.svg` | idem | **Onboarding** — a guarda `ExigeSessao` de três estados e `decideOnboarding` |
| `04-diagrama-sequencia-03-sequenceDiagram.svg` | idem | **Inscrição com vaga** — a transação serializada e os quatro desvios |
| `04-diagrama-sequencia-04-sequenceDiagram.svg` | idem | **Lista de espera** — `409 SEM_VAGA`, `planPromotion` e a janela da oferta |
| `04-diagrama-sequencia-05-sequenceDiagram.svg` | idem | **Pagamento simulado** — cobrança idempotente e os 4 desfechos de `planWebhook` |
| `04-diagrama-sequencia-06-sequenceDiagram.svg` | idem | **Check-in** — emissão do token, as 3 formas de leitura e `decideCheckIn` |
| `04-diagrama-sequencia-07-sequenceDiagram.svg` | idem | **Publicar no feed** — verificação dupla de alcance e participação |
| `05-diagrama-atividades-01-flowchart.svg` | [`../05-diagrama-atividades.md`](../05-diagrama-atividades.md) | **Criar e publicar evento** — guarda, Zod, âncora do vínculo, `requiresApproval` |
| `05-diagrama-atividades-02-flowchart.svg` | idem | **Ação principal** — os 11 `PrimaryActionKind` de `resolvePrimaryAction` |
| `05-diagrama-atividades-03-flowchart.svg` | idem | **Pagamento** — a janela de RN-012 e o que expira só no CP6 |
| `05-diagrama-atividades-04-flowchart.svg` | idem | **Check-in na porta** — contingência do código digitado e as 8 recusas |
| `05-diagrama-atividades-05-flowchart.svg` | idem | **Onboarding** — os 4 motivos de recusa e para onde cada um volta |
| `06-diagrama-estados-01-stateDiagram-v2.svg` | [`../06-diagrama-estados.md`](../06-diagrama-estados.md) | `Participacao` — 8 estados, com o endpoint de cada transição |
| `06-diagrama-estados-02-stateDiagram-v2.svg` | idem | `Evento` — 5 estados, com o que o CP5 executa e o que fica para o CP6 |
| `07-diagrama-componentes-01-flowchart.svg` | [`../07-diagrama-componentes.md`](../07-diagrama-componentes.md) | Camadas, `features/`, a fronteira do mock em quatro peças e o alvo do CP6 |
| `README-01-flowchart.svg` | [`../README.md`](../README.md) | Encadeamento dos diagramas, com o código como fonte |

## Outros documentos — 4 SVGs

| SVG | Origem | O que mostra |
|---|---|---|
| `01-problema-e-personas-01-journey.svg` | [`../../01-problema-e-personas.md`](../../01-problema-e-personas.md) | Jornada do usuário |
| `08-arquitetura-01-flowchart.svg` | [`../../08-arquitetura.md`](../../08-arquitetura.md) | C4 nível 1 — contexto |
| `08-arquitetura-02-flowchart.svg` | idem | C4 nível 2 — contêineres |
| `08-arquitetura-03-flowchart.svg` | idem | Cadastro, verificação de domínio e vínculo acadêmico |
