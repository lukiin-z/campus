# Registro de decisões arquiteturais (ADR)

**Responsável técnico:** Lucas Baraldi (Tech Lead / Arquiteto)
**Escopo:** decisões técnicas do projeto Campus, das três sprints (CP4, CP5, CP6).

## 1. O que é uma ADR neste projeto

Uma **ADR** (*Architecture Decision Record*) é o registro de uma decisão técnica que já foi
tomada, com o contexto em que foi tomada, as alternativas que foram descartadas e o preço
que se paga por ela.

Neste projeto a ADR existe para resolver um problema concreto: somos **seis pessoas em
papéis acumulados**, o projeto atravessa **três checkpoints** e cada integrante toca o
código em janelas diferentes. Sem registro, a pergunta "por que o mock fala HTTP em vez de
devolver objeto?" volta a cada sprint e é respondida de novo, às vezes de forma diferente —
e uma decisão respondida de forma diferente duas vezes deixa de ser decisão.

Três coisas que uma ADR **não** é:

| Não é | Por quê |
|---|---|
| Documentação de arquitetura | Arquitetura descreve o **estado atual** — isso está em [`../08-arquitetura.md`](../08-arquitetura.md). A ADR descreve o **momento da escolha**, e não é reescrita quando o código evolui |
| Proposta ou discussão em aberto | Uma ADR só entra no repositório com decisão tomada. Discussão acontece antes, no card do Trello e na revisão do PR |
| Propaganda da solução escolhida | Toda ADR deste projeto tem seção de consequências negativas preenchida. ADR sem custo declarado é sinal de que o custo não foi procurado |

Uma ADR aceita **não é editada** para mudar de opinião. Se a decisão cair, escreve-se uma
ADR nova que a substitui, e a antiga passa a `Substituída por ADR-000Y`. O histórico é o
produto: o registro da jornada do projeto é entregável do CP6
([`../03-escopo.md`](../03-escopo.md), seção 8).

## 2. Quando criar uma ADR

Crie uma ADR quando a mudança se encaixa em **pelo menos um** destes quatro casos:

| # | Gatilho | Exemplo real do projeto |
|---|---|---|
| 1 | **Altera a stack** — adiciona, remove ou substitui uma tecnologia de base | Trocar Tailwind por CSS Modules; adotar Next.js; incluir uma biblioteca de componentes |
| 2 | **Altera contrato público** — rota, formato de request/response, código de erro, assinatura de interface consumida por outra camada | Mudar `POST /eventos/{id}/participacoes` para responder `200` em vez de `201`; alterar a interface `PaymentGateway` |
| 3 | **Altera o modelo de dados** — entidade, relacionamento, cardinalidade, chave, restrição de integridade | Transformar `Participacao` em tabela de junção; trocar as três âncoras de alcance por uma coluna sem tipo |
| 4 | **Altera fronteira de camada** — quem pode importar quem, onde vive a regra de negócio, o que é autoridade de decisão | Permitir que `pages/` chame `fetch` direto; mover regra de capacidade para o componente de UI |

Isso está formalizado como regra de processo em [`../03-escopo.md`](../03-escopo.md)
(seção 10, item 4): **mudança que afeta arquitetura, contrato ou modelo de dados exige ADR
antes de virar tarefa** — não depois de o código estar escrito.

### Quando **não** criar

- Escolha local e revertida em minutos: nome de variável, ordem de props, extrair um
  componente, trocar um `map` por `for`.
- Escolha já coberta por uma ADR existente. Adicionar um terceiro método à interface
  `PaymentGateway` segue a [ADR-0006](0006-abstracao-de-gateway-de-pagamento.md); não é
  decisão nova.
- Padrão de código e formatação: isso é lint e Prettier
  ([`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)), não arquitetura.

Regra prática de corte: **se um integrante que entra no projeto na Sprint 3 conseguir
inferir o motivo lendo o código, não precisa de ADR.** Se ele fosse "corrigir" o código por
não entender o motivo, precisa.

## 3. Formato padrão

Toda ADR deste repositório segue exatamente esta estrutura, nesta ordem:

```markdown
# ADR-000X — Titulo curto, afirmativo

- **Status:** Proposta | Aceita | Substituída por ADR-000Y | Descontinuada
- **Data:** AAAA-MM-DD
- **Decisores:** nomes reais
- **Requisitos afetados:** RF/RNF/RN

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
### Positivas
### Negativas
## Como reverter
## Verificação
```

Convenções obrigatórias:

| Seção | Regra |
|---|---|
| Título do arquivo | `000X-slug-em-kebab-case.md`, numeração sequencial, **nunca renomeado** — outros documentos linkam pelo nome |
| Data | Data em que a decisão foi aceita, não a data em que o texto foi escrito |
| Decisores | Nomes reais de quem decidiu. O Tech Lead é responsável técnico de todas, mas não decide sozinho o que afeta requisito, modelo ou visual |
| Contexto | Restrições concretas e verificáveis (prazo, equipe, orçamento, requisito), não preferência estética |
| Decisão | Voz ativa e afirmativa: "adotamos X", não "foi decidido que talvez X" |
| Alternativas | **Mínimo duas alternativas reais**, cada uma com prós, contras e motivo objetivo da recusa. Alternativa que ninguém consideraria de verdade não conta |
| Consequências negativas | **Obrigatória e específica.** "Pode aumentar a complexidade" não é consequência; "o índice único parcial lista os cinco status ativos e quebra silenciosamente se um status novo for adicionado" é |
| Como reverter | O que seria necessário para desfazer e o custo estimado. Decisão irreversível deve dizer que é irreversível |
| Verificação | Como se descobre que a decisão está sendo violada: regra de lint, teste, item de checklist de PR. Verificação que depende de boa vontade do revisor é fraca — declare isso quando for o caso |

## 4. ADRs registradas

| # | Título | Status | Data | Decisão em uma linha |
|---|---|---|---|---|
| [0001](0001-react-vite-em-vez-de-react-native.md) | React + Vite em vez de React Native | Aceita | 2026-08-19 | Entregamos web mobile-first instalável como PWA, porque publicar em loja não cabe no semestre |
| [0002](0002-tailwind-com-design-tokens.md) | Tailwind com design tokens | Aceita | 2026-08-21 | Todo valor visual vem de token nomeado no `tailwind.config.ts`, com o mesmo nome do Figma |
| [0003](0003-camada-de-repositorio-com-msw.md) | Camada de repositório com MSW | Aceita | 2026-08-24 | O app fala HTTP desde o CP4; o MSW responde no lugar da API, e no CP6 só muda quem responde |
| [0004](0004-participacao-como-entidade-propria.md) | `Participacao` como entidade própria | Aceita | 2026-08-26 | A relação aluno–evento é entidade com identidade e história, não tabela de junção com status |
| [0005](0005-alcance-como-enum-com-ancora-condicional.md) | Alcance como enum com âncora condicional | Aceita | 2026-08-27 | `alcance` é enum de três valores + três FKs opcionais com `CHECK` de exclusividade |
| [0006](0006-abstracao-de-gateway-de-pagamento.md) | Abstração de gateway de pagamento | Aceita | 2026-08-31 | Pagamento é consumido por uma interface de quatro métodos, com simulador no CP5 e provedor real no CP6 |

Nenhuma ADR foi substituída ou descontinuada até a entrega do CP4.

### Onde cada ADR é citada

Rastreabilidade nos dois sentidos — a ADR aponta para o requisito, e o documento de
requisito aponta para a ADR:

| ADR | Citada em |
|---|---|
| 0001 | [`../02-requisitos.md`](../02-requisitos.md) (RFX-05), [`../03-escopo.md`](../03-escopo.md) (fora de escopo, restrições) |
| 0002 | [`../08-arquitetura.md`](../08-arquitetura.md) (§4, a regra de lint); os tokens que a decisão governa estão em [`../06-marca/identidade-visual.md`](../06-marca/identidade-visual.md) e [`../06-marca/design-system.md`](../06-marca/design-system.md) |
| 0003 | [`../03-escopo.md`](../03-escopo.md) (restrições), [`../05-modelagem/07-diagrama-componentes.md`](../05-modelagem/07-diagrama-componentes.md), [`../08-arquitetura.md`](../08-arquitetura.md), [`../11-plano-de-testes.md`](../11-plano-de-testes.md) |
| 0004 | [`../04-regras-de-negocio.md`](../04-regras-de-negocio.md) (RN-015), [`../05-modelagem/02-diagrama-classes.md`](../05-modelagem/02-diagrama-classes.md), [`../05-modelagem/dicionario-de-dados.md`](../05-modelagem/dicionario-de-dados.md), [`../14-glossario.md`](../14-glossario.md) |
| 0005 | [`../04-regras-de-negocio.md`](../04-regras-de-negocio.md) (RN-001), [`../05-modelagem/02-diagrama-classes.md`](../05-modelagem/02-diagrama-classes.md), [`../05-modelagem/03-modelo-dados-er.md`](../05-modelagem/03-modelo-dados-er.md) |
| 0006 | [`../14-glossario.md`](../14-glossario.md), [`../03-escopo.md`](../03-escopo.md) (D-02), [`../11-plano-de-testes.md`](../11-plano-de-testes.md), [`../12-riscos.md`](../12-riscos.md) (R-04) |

## 5. Como propor uma ADR nova

1. **Abra um card no Backlog do Trello** ([`../09-trello/quadro.md`](../09-trello/quadro.md))
   com o título no formato `ADR: <assunto>`. Card de ADR é tarefa como qualquer outra e
   consome ponto da sprint — decisão arquitetural sem tempo alocado não é escrita.
2. **Verifique se já existe ADR sobre o assunto.** Se existir e você discorda, a proposta é
   de *substituição*: cite a ADR antiga no título e explique o que mudou no contexto (não o
   que mudou na sua opinião).
3. **Escreva o arquivo** em `docs/adr/`, com o próximo número livre, `Status: Proposta` e o
   formato da seção 3 inteiro — inclusive as consequências negativas e a seção de
   verificação. Proposta sem alternativas preenchidas é devolvida.
4. **Abra o PR** seguindo [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md). Commit no
   padrão `docs(adr): propoe ADR-000X <assunto>`. O PR toca **apenas** a ADR — código da
   decisão vem depois, em PR separado, referenciando a ADR aceita.
5. **Revisores obrigatórios:** o Tech Lead (Lucas Baraldi) sempre; mais o responsável pela
   área afetada — Analista de Requisitos (Lucas Zolla) se mexe em RF/RNF, Modelagem
   (Ronaldo Veloso Filho) se mexe em entidade ou diagrama, UX/UI (Ana Luiza Dourado) se
   mexe em token, componente ou fluxo de tela, PO (João Viviani Baldini) se mexe em escopo
   ou prazo, Scrum Master/QA (Vitor Pantarotto) se mexe na estratégia de teste.
6. **Ao aprovar**, mude `Status` para `Aceita`, preencha a `Data` com o dia da aprovação e
   **adicione a linha na tabela da seção 4** no mesmo PR. Tabela desatualizada é o começo
   do índice inútil.
7. **Depois de aceita**, atualize o que a decisão afeta no mesmo ciclo: requisito
   ([`../02-requisitos.md`](../02-requisitos.md)), regra
   ([`../04-regras-de-negocio.md`](../04-regras-de-negocio.md)), diagrama
   ([`../05-modelagem/README.md`](../05-modelagem/README.md)) ou arquitetura
   ([`../08-arquitetura.md`](../08-arquitetura.md)). ADR aceita que contradiz o documento de
   arquitetura é defeito, não detalhe.

### Rejeitar também se registra

Se a proposta é recusada, o arquivo **não** é apagado: entra com `Status: Descontinuada` e
uma linha em `Contexto` dizendo por que foi recusada. Ideia recusada sem registro volta na
sprint seguinte com o mesmo argumento.
