# Exports SVG dos diagramas

Arquivos gerados — **não edite à mão**. Fonte de verdade é o bloco ```mermaid dentro do
`.md` correspondente.

Regenerar:

```bash
node scripts/render-diagrams.mjs      # da raiz do repositório
npm run diagrams                       # de dentro de app/
```

Nomenclatura: `<arquivo-de-origem>-<n>-<tipo>.svg`, onde `<n>` é a ordem do bloco no
arquivo.

| SVG | Origem |
|---|---|
| `01-problema-e-personas-01-journey.svg` | [`../../01-problema-e-personas.md`](../../01-problema-e-personas.md) — jornada do usuário |
| `01-casos-de-uso-01-flowchart.svg` | [`../01-casos-de-uso.md`](../01-casos-de-uso.md) — casos de uso |
| `02-diagrama-classes-01-classDiagram.svg` | [`../02-diagrama-classes.md`](../02-diagrama-classes.md) |
| `03-modelo-dados-er-01-erDiagram.svg` | [`../03-modelo-dados-er.md`](../03-modelo-dados-er.md) |
| `04-diagrama-sequencia-01-sequenceDiagram.svg` | [`../04-diagrama-sequencia.md`](../04-diagrama-sequencia.md) — Pix |
| `04-diagrama-sequencia-02-sequenceDiagram.svg` | idem — lista de espera e promoção |
| `04-diagrama-sequencia-03-sequenceDiagram.svg` | idem — check-in por QR Code |
| `05-diagrama-atividades-01-flowchart.svg` | [`../05-diagrama-atividades.md`](../05-diagrama-atividades.md) — criar e publicar evento |
| `05-diagrama-atividades-02-flowchart.svg` | idem — decisão do botão principal |
| `06-diagrama-estados-01-stateDiagram-v2.svg` | [`../06-diagrama-estados.md`](../06-diagrama-estados.md) — `Participacao` |
| `06-diagrama-estados-02-stateDiagram-v2.svg` | idem — `Evento` |
| `07-diagrama-componentes-01-flowchart.svg` | [`../07-diagrama-componentes.md`](../07-diagrama-componentes.md) |
| `README-01-flowchart.svg` | [`../README.md`](../README.md) — encadeamento dos diagramas |
