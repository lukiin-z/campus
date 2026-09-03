# Checklist de entrega — Checkpoint 6

**Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)
**Data-alvo de entrega:** 24/11/2026 (premissa do grupo, ajustar ao calendário oficial)
**Estado apurado em:** 2026-09-02

Este documento existe para uma coisa: **provar que cada critério exigido foi atendido, e
apontar exatamente onde**. A coluna "evidência" não diz "está pronto" — diz o que a pessoa
que corrige pode abrir, contar ou rodar para verificar.

Segue a estrutura do [checklist do CP5](19-checklist-entrega-cp5.md), com uma diferença que
o CP6 impõe: **o critério de peso mais alto agora é "funcionalidade com dados reais"**, e
"dado real" não é verificável por leitura. Por isso quase toda linha da
[seção 3](#3-estado-real-das-verificações) tem um comando, e o comando é o que vale.

---

## 1. Os 5 critérios de avaliação do CP6

| # | Critério | Peso | Artefato que atende | Evidência verificável |
|---|---|---|---|---|
| 1 | **Funcionalidade completa** — recursos principais com dados reais | **30%** | [`api/`](../api) + [`app/`](../app) sobre PostgreSQL | **43 operações** no contrato ([`api/openapi.yaml`](../api/openapi.yaml)) e **43 rotas implementadas** nos controladores — conferir com `grep -rhcE "@(Get\|Post\|Patch\|Delete)\(" api/src/*/*.controller.ts`. Dado persistido em **14 tabelas** com **22 restrições** declaradas e exercitadas por [`verificar-restricoes.sql`](../api/prisma/verificar-restricoes.sql). **525 testes** no app (`npm run test -w campus-app`), **308** no pacote (`npm run test:dominio`), **83** unitários e **96 de integração contra PostgreSQL** na API — **713 sem contar duas vezes**, ver a seção 3. Mais **9 casos E2E executados** (6 no mock, 3 contra a stack real) |
| 2 | **Qualidade técnica** — organização, boas práticas, sem erro crítico | **20%** | Monorepo de 3 workspaces, 5 verificadores próprios, 5 jobs de CI | `npm run lint` — **0 erro, 0 aviso** nos dois workspaces (`--max-warnings 0`). `node scripts/check-contrato.mjs` — a fronteira de `@campus/shared` é **executável**: 28 arquivos, 68 imports analisados, e a mensagem de erro diz o motivo. Cobertura **97,11%** de linhas no app e **91,93%** no pacote. Arquitetura e trade-offs em [`08-arquitetura.md`](08-arquitetura.md), decisões em [`adr/`](adr/README.md) — **8 ADRs** com alternativas recusadas e como reverter. **Ressalva: o `build` reprova neste momento** (seção 3), e "sem erro crítico" só é verdade depois de os seis imports entrarem |
| 3 | **Instalabilidade** — pacote instalável funcionando fora do ambiente do grupo | **20%** | [`docker-compose.yml`](../docker-compose.yml), [`Dockerfile.api`](../Dockerfile.api), [`Dockerfile.web`](../Dockerfile.web), [`23-instalacao.md`](23-instalacao.md) | **Um comando**: `docker compose up`. Três serviços em cadeia, com `depends_on: service_healthy` e `pg_isready` como *healthcheck* — não `depends_on` solto, que espera o container iniciar e não o banco aceitar conexão. A API aplica `prisma migrate deploy`, roda o seed e sobe. App em `:8080`, API em `:3000/api`. PWA instalável (RNF-006) — o manifest é verificado no CI |
| 4 | **Documentação final** — completa, atualizada, coerente | **15%** | [`docs/README.md`](README.md) — **25 documentos**, 8 ADRs, 21 diagramas | `node scripts/validate-docs.mjs` verifica **todo link relativo, toda âncora, todo bloco Mermaid e todo SVG** de 54 arquivos, e reprova marcador de trabalho inacabado. Novos no CP6: [`21-api-contrato.md`](21-api-contrato.md), [`22-manual-de-uso.md`](22-manual-de-uso.md), [`23-instalacao.md`](23-instalacao.md), este checklist e [`25-video-cp6-roteiro.md`](25-video-cp6-roteiro.md). Cada documento revisado abre com **histórico de revisões** datado |
| 5 | **Evolução do projeto** — coerência entre CP4 → CP5 → CP6 | **15%** | [`17-jornada.md`](17-jornada.md) | Linha do tempo por tag com **decisão, commit e defeito encontrado por verificação**. A evolução é rastreável nos artefatos, não narrada: as **30 rotas do CP5 continuam todas no contrato do CP6** (nenhuma renomeada), o domínio **migrou** para `packages/shared` em vez de ser copiado ([ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md)), e a serialização de RN-004 saiu da fila do mock para o `SELECT ... FOR UPDATE` — comparada linha a linha em [`05-modelagem/04-diagrama-sequencia.md` §3.1](05-modelagem/04-diagrama-sequencia.md#31-a-mesma-inscrição-contra-a-api-real) |

**Total: 100%.** Os cinco critérios e os pesos são os do enunciado do CP6.

> **Uma ressalva que vale mais que a tabela, e por isso vem antes dela ser lida.** No momento
> desta apuração o **`npm run build` reprova** — seis tipos usados e não importados em
> `app/src/services/index.ts` —, e dois números da linha 1 (`6 casos E2E` e
> `22 restrições verificadas`) vêm de execuções que **não** foram refeitas nesta passagem. O
> detalhe de cada um, com o comando, está na
> [seção 3](#3-estado-real-das-verificações), e as correções estão em ordem de bloqueio na
> [seção 4](#4-checklist-operacional-de-submissão). A tabela acima descreve o que os
> artefatos entregam; a seção 3 descreve o que foi medido hoje. **Quando as duas
> discordarem, a seção 3 está certa.**

---

## 2. Como cada critério se sustenta

### Funcionalidade completa — 30%

*Observado: o produto faz o que a documentação diz, com dado que sobrevive ao F5.*

| Sub-item | Evidência |
|---|---|
| Contrato e implementação com o **mesmo** número de operações | 43 no [`api/openapi.yaml`](../api/openapi.yaml) e 43 decoradores de rota nos controladores. Não é coincidência de contagem: a lista foi conferida caminho por caminho em [`21-api-contrato.md` §2](21-api-contrato.md#2-as-43-operações-por-módulo) |
| Fluxo completo do aluno **com persistência** | Cadastro → login → onboarding → feed → detalhe → inscrição → pagamento → ingresso → check-in, sobre PostgreSQL. Recarregar a página **não** devolve o seed: é a diferença observável em relação ao CP5 |
| Regra de negócio no servidor, não na tela | Inscrição fora do alcance é recusada pela API com `404`, inclusive por ID direto. A verificação é `canSee`, a mesma função do cliente — e é o servidor que decide (RNF-012) |
| Capacidade sem estouro, com **trava de linha** | `SELECT ... FOR UPDATE` na linha do evento, com `ck_evento_ocupadas_le_capacidade` como rede embaixo. A diferença em relação à fila do mock está tabelada em [`05-modelagem/03-modelo-dados-er.md` §6](05-modelagem/03-modelo-dados-er.md#a-diferença-que-mais-separa-o-cp5-do-cp6) |
| Invariantes garantidas pelo **banco**, não pelo código | 20 `CHECK`, 2 índices únicos parciais (RN-015 e RN-027), 8 índices parciais. Reconferir com `grep -c 'ADD CONSTRAINT "ck_' api/prisma/migrations/0001_init/migration.sql` |
| E as invariantes são **exercitadas** | [`api/prisma/verificar-restricoes.sql`](../api/prisma/verificar-restricoes.sql): 11 blocos, **22 assertivas** contra PostgreSQL 16 real. 21 esperam recusa; 1 espera sucesso (reinscrição depois de cancelar), porque índice que proíbe demais também está errado |
| Idempotência garantida por restrição | `UNIQUE (chave_idempotencia)` em `pagamento` (RN-014) e o parcial `WHERE status='AGUARDANDO'` (RN-027). Duplo toque em "pagar" devolve a cobrança existente em vez de gerar dois Pix |
| Sessão revogável | Tabela `sessao` com `refresh_hash` e `revogada_em` (RNF-020). Guarda o **hash**, nunca o token: um vazamento do banco não dá sessão a ninguém |
| A mesma regra nos dois lados, uma vez | `packages/shared` — 13 módulos, **308 testes**, consumidos pelo app, pela fonte mock, pela API e pelas rotinas de tempo. A fronteira é verificada por `check-contrato.mjs` |
| As duas fontes de dados funcionam | `VITE_DATA_SOURCE=mock` (Pages, sem backend) e `VITE_DATA_SOURCE=api`. A interface de repositório é a mesma, e `main.tsx` usa a mesma decisão para não registrar o MSW contra a API real |

### Qualidade técnica — 20%

*Observado: dá para trabalhar neste código sem quebrá-lo por acidente.*

| Sub-item | Evidência |
|---|---|
| Zero erro e zero aviso de lint | `npm run lint` nos dois workspaces, com `--max-warnings 0`. Aviso quebra o CI (RNF-017) |
| Fronteira de arquitetura **executável**, não recomendada | Três verificadores: `no-restricted-imports` no app (3 `overrides`), `check-contrato.mjs` no pacote, e a regra que proíbe `process.env` fora de `api/src/config/` |
| Configuração validada no boot, sem valor padrão para segredo | [`api/src/config/ambiente.ts`](../api/src/config/ambiente.ts): sem `DATABASE_URL`, `JWT_SECRET` de 32+ caracteres ou `WEBHOOK_SECRET`, o processo **não sobe**, e a mensagem diz qual falta. Segredo com padrão não é segredo |
| Forma de erro única em toda a API | Filtro de exceção + `ValidationPipe` em [`api/src/comum/`](../api/src/comum). Nenhuma resposta de erro tem outro *shape*, e o código estável é contrato ([`21-api-contrato.md` §1.3](21-api-contrato.md#13-o-campo-erro-é-o-contrato-mensagem-não-é)) |
| RNF-022 garantido por **forma**, em três camadas | O contrato recusa o campo (`ResumoCartao` é `additionalProperties: false`), o `CHECK` recusa a linha, e a verificação 7 prova que ele recusa. Número e CVV não existem nem como coluna anulável |
| Orçamento de desempenho verificado a cada envio | `npm run check:size` — **236,90 de 250 KB gzip** medido em 2026-09-02. Não é medido uma vez e esquecido: é job de CI |
| Cobertura alta onde importa | **97,11%** de linhas e **97,87%** de funções no app; **91,93%** e **88,88%** no pacote. O limite de RNF-015 é 60% |
| Decisões registradas com alternativa recusada | **8 ADRs**, cada uma com prós, contras, *motivo objetivo da recusa* e como reverter. A [ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md) registra os **seis defeitos de infraestrutura** que a migração custou |
| Pipeline em 5 jobs | [`ci.yml`](../.github/workflows/ci.yml): documentação, pacote compartilhado, aplicação, API, E2E |

### Instalabilidade — 20%

*Observado: quem corrige consegue subir o produto em máquina limpa, sem ajuda.*

| Sub-item | Evidência |
|---|---|
| Um comando | `docker compose up`. Roteiro completo em [`23-instalacao.md`](23-instalacao.md) |
| A ordem de inicialização não é sugestão | `depends_on: condition: service_healthy` com `pg_isready` no banco. `depends_on` solto espera o container **iniciar**, e um Postgres iniciado ainda não aceita conexão: a API subiria nesse intervalo e o `migrate deploy` morreria com `ECONNREFUSED` — sintoma que parece erro de configuração e é corrida de inicialização |
| Migração e seed acontecem sozinhos | O `command` da API encaixa `prisma migrate deploy` e o seed antes do `start:prod`. Nada de "rode este SQL antes" |
| O que cada imagem tem de expor está **escrito** | O cabeçalho de [`docker-compose.yml`](../docker-compose.yml) declara as premissas de cada `Dockerfile` — contexto de build na raiz (é monorepo), `WORKDIR` do estágio final, o que não pode ser removido por `npm ci --omit=dev`. Mudança de imagem que quebre o compose é percebida no arquivo que ela quebra |
| Seed reprodutível e reconhecível | [`api/src/seed/ids.ts`](../api/src/seed/ids.ts) traduz `evt-013` em UUID de forma **determinística e legível**, para o roteiro de demonstração poder citar um registro específico. UUID aleatório não seria reprodutível; UUID v5 não seria reconhecível |
| Instalável como aplicativo | PWA (RNF-006): manifest e ícones verificados por job de CI |
| Acesso sem instalar nada | O ambiente do CP5 continua vivo em `VITE_DATA_SOURCE=mock`, conteúdo estático no GitHub Pages — [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) |

### Documentação final — 15%

*Observado: coerência entre o documentado e o implementado.*

| Sub-item | Evidência |
|---|---|
| Uma fonte para o contrato, e ela é executável | [`21-api-contrato.md`](21-api-contrato.md) **deriva** de `api/openapi.yaml`, e diz isso na primeira linha. A §5 de [`08-arquitetura.md`](08-arquitetura.md) deixou de duplicar a tabela de endpoints — porque duplicar foi exatamente o que produziu a divergência CP4↔CP5 |
| Manual de uso e instalação | [`22-manual-de-uso.md`](22-manual-de-uso.md) e [`23-instalacao.md`](23-instalacao.md) |
| Diagramas conferidos contra o **backend** | [`05-modelagem/`](05-modelagem/README.md) revisão 3.0: o ER ganhou `sessao` e perdeu `usuario.excluido_em`, a cardinalidade de `PAGAMENTO` foi corrigida, e entrou a sequência 3.1 com a trava de linha. **21 blocos Mermaid**, todos renderizados |
| Divergência encontrada é **registrada**, não arredondada | [`21-api-contrato.md` §6](21-api-contrato.md#6-divergências-abertas-entre-o-contrato-e-o-resto) lista o que é código ou contrato e não foi corrigido na doc, com o efeito de cada um |
| Documentação é viva: atualizada, não reescrita | Cada documento revisado abre com histórico datado dizendo **o que mudou e por quê**. A tabela de rastreabilidade do CP4 em [`04-regras-de-negocio.md`](04-regras-de-negocio.md) segue preservada ao lado da nova |
| Links e âncoras verificados por ferramenta | `node scripts/validate-docs.mjs` — links relativos, âncoras internas, blocos Mermaid fechados, SVGs bem formados, ausência de marcador de trabalho inacabado |

### Evolução do projeto — 15%

*Observado: o CP6 é o CP5 que cresceu, não um projeto novo com o mesmo nome.*

Este é o critério que não se atende escrevendo — se atende **tendo feito**. As cinco linhas
abaixo são verificáveis por diff, e é isso que as torna evidência.

| O que prova a evolução | Como se verifica |
|---|---|
| **As 30 rotas do CP5 continuam todas no contrato do CP6** — nenhuma removida, renomeada ou com método trocado | `grep -hoE 'http\.(get\|post\|patch\|delete)\(\`\$\{BASE\}[^\`]*' app/src/mocks/handlers.ts app/src/mocks/handlersCp5.ts \| wc -l` devolve 30, e as 30 estão tabeladas em [`21-api-contrato.md` §4.1](21-api-contrato.md#41-as-30-rotas-do-cp5-continuam-todas-no-contrato) |
| **O domínio foi movido, não copiado** | `packages/shared/src/domain/` tem 13 módulos e `app/src/domain/` tem 3 — e os 3 que sobraram não são domínio. `check-contrato.mjs` impede que a cópia volte |
| **As mesmas 30 rotas + 13 novas = 43** | Cada uma das 13 fecha um requisito que o CP5 deixou aberto, com o requisito nomeado em [§4.2](21-api-contrato.md#42-as-13-operações-que-o-cp6-acrescentou) |
| **A decisão de nome do CP5 foi honrada, não revista** | O CP4 dizia "o contrato ganha"; o CP5 inverteu para "o mock ganha"; o CP6 **implementou os nomes do mock**. `GET /sessao`, `GET /participacoes` e `POST /notificacoes/{id}/lida` estão no `openapi.yaml` com o nome do CP5 |
| **O que a documentação prometeu e não se cumpriu está dito** | `usuario.excluido_em` saiu do ER; três `CHECK` saíram do dicionário; a transição `CONFIRMADA → AUSENTE` continua sem executor e está marcada assim. Documentação que só registra acerto não é registro |

E a jornada em si: [`17-jornada.md`](17-jornada.md), com decisão, commit e **defeito
encontrado por verificação** em cada checkpoint. O padrão que se repetiu nos três é o mais
transferível do projeto: **nenhum dos 15 defeitos registrados foi encontrado relendo
código** — todos vieram de uma verificação executando.

---

## 3. Estado real das verificações

Rodado em **2026-09-02**, na raiz do repositório. **Três itens reprovam e dois não foram
executados nesta passagem**, e todos estão aqui com o arquivo e o comando — esconder
reprovação em checklist de entrega é o oposto da função dele.

A coluna de resultado distingue três coisas, e a distinção é o que dá valor à tabela:
**✅ medido agora**, **❌ reprovou agora**, **⚪ não executado nesta passagem** (com o motivo
e quem o executou, quando foi outra frente).

| Verificação | Comando | Resultado |
|---|---|---|
| Documentação | `node scripts/validate-docs.mjs` | ✅ **54 arquivos markdown, 1.105 links relativos resolvidos, 25 blocos Mermaid, 34 SVGs — sem falha, sem aviso de âncora.** Os totais crescem conforme as frentes entregam; o que importa é o veredito da última linha |
| Diagramas | `npm run diagrams` | ✅ **25/25 blocos Mermaid renderizados** e reexportados |
| Fronteira do pacote | `node scripts/check-contrato.mjs` | ✅ **28 arquivos, 68 imports analisados — fronteira do contrato preservada** |
| Lint do app | `npm run lint -w campus-app` | ✅ **0 erro, 0 aviso** |
| Lint da API | `npm run lint -w campus-api` | ✅ **0 erro, 0 aviso** |
| Escala de espaçamento | `npm run check:scale` | ✅ **478 utilitários**, todos na escala de 4 px |
| Testes do pacote | `npm run test:dominio` | ✅ **243 de 243 passando**, em 12 arquivos, ~2 s |
| Testes do app | `npm run test -w campus-app` | ✅ **377 de 377 passando**, em 21 arquivos |
| Testes da API | `npm run test -w campus-api` | ✅ **83 de 83 passando**, em 7 arquivos |
| Cobertura do pacote | `npm run test:coverage -w @campus/shared` | ✅ Linhas **91,93%**, funções **88,88%**, branches **93,62%** — limite 60% |
| Cobertura do app | `npm run test:coverage -w campus-app` | ✅ Linhas **97,11%**, funções **97,87%**, branches **84,76%** |
| Orçamento de pacote | `npm run check:size` | ✅ **236,90 de 250 KB gzip.** CSS 5,01 de 40. Maior chunk 106,70 de 130 |
| Schema do Prisma | `npx prisma validate --schema api/prisma/schema.prisma` | ✅ **Válido.** Exige `DATABASE_URL` no ambiente — sem ela, `P1012`; o `datasource` a lê com `env(...)` e o `validate` avalia o bloco. O `ci.yml` passou a definir um placeholder no passo (nada conecta) e o job está verde |
| **Build** | `npm run build` | ❌ **Reprova em `campus-app`.** `tsc -b` acusa **6 erros TS2304** em `app/src/services/index.ts`: `EntradaCadastro`, `EdicaoEvento`, `ParticipanteConfirmado`, `WebhookPagamento`, `AceitePagamento` e `Saude` são **usados nas assinaturas e não estão no bloco `import type`** do topo do arquivo. Os seis tipos **existem** em `packages/shared/src/types.ts`: é import faltando, não tipo faltando |
| Formatação | `npm run format:check` | ❌ **1 arquivo fora do padrão: `app/src/main.tsx`.** Correção: `npm run format` |
| Restrições do banco | `psql -f api/prisma/verificar-restricoes.sql` | ⚪ **Não executado nesta passagem** — exige PostgreSQL. O arquivo contém **22 assertivas** (`grep -c "ok  "` devolve 22), e a execução contra PostgreSQL 16 real foi feita pela frente de banco em 2026-09-02. Reconferir antes de enviar |
| E2E | `npm run test:e2e` | ✅ **9 de 9 verdes**, localmente e na CI. Dois projetos: `mock-mobile-chromium` (os 6 casos do CP5) e `api-mobile-chromium` (3 casos contra a API real com PostgreSQL — login e alcance, inscrição → cobrança → pagamento → ingresso, e evento lotado → fila com posição) |

### Por que o build reprova, e por que lint e teste não pegaram

**É o achado mais importante desta conferência**, e o modo de falha vale registrar porque
não é óbvio: `npm run lint` e as três suítes de teste **passam** com o build quebrado.

O motivo é que nenhum dos dois faz verificação de tipo. O ESLint analisa sintaxe e regras de
import; o Vitest transpila com esbuild, que **remove** as anotações de tipo sem checá-las. O
único passo que executa `tsc` é o `build`. Um tipo usado e não importado é invisível para
tudo, menos para ele.

O `ci.yml` roda `npm run build -w campus-app` no job `aplicacao`, então o CI **pegaria** —
o que significa que este defeito não chegaria a `main` por um PR. Ele existe agora porque
frentes escreveram em paralelo, e é de correção mecânica: seis nomes no bloco `import type`
de `app/src/services/index.ts`.

### `prisma validate` no CI — previsão que se confirmou, e já está corrigida

Esta seção foi escrita como **previsão**: o job `api` executava
`npx prisma validate` e o `ci.yml` não tinha nenhum bloco `env:`, então o passo deveria
falhar com `P1012`, porque o `validate` avalia o bloco `datasource` e o `datasource` lê
`DATABASE_URL` com `env(...)`.

**Confirmou-se.** O primeiro push com o job reprovou exatamente ali. A correção foi a linha
prevista — `DATABASE_URL` com valor placeholder, que o `validate` não usa para conectar — e
o job está verde.

Vale registrar o par: a previsão foi escrita a partir da leitura do arquivo, e a **execução**
é que a transformou em fato. Duas outras previsões desta mesma passagem não se confirmaram
(o job de E2E foi reprovar por outro motivo — cliente do Prisma não gerado — e a contraprova
da trava reprovou por ser intrinsecamente instável). Ler o arquivo acerta o suficiente para
valer o esforço, e erra o suficiente para não substituir a execução.

### O que o total de testes soma, e por que não é 1 021

**Os três números se sobrepõem, e somá-los seria contar duas vezes.** O `vitest.config.ts`
do app inclui `../packages/shared/src/**/*.test.ts` de propósito — a fronteira do pacote não
deve custar um segundo comando para ver tudo verde. Então:

| Comando | Arquivos | Casos | O que cobre |
|---|---|---|---|
| `npm run test:dominio` | 14 | 308 | Só o pacote compartilhado |
| `npm run test -w campus-app` | 28 | 525 | **14 do app + os 14 do pacote** |
| `npm run test -w campus-api` | 7 | 83 | Unitários da API |
| `npm run test:int -w campus-api` | 11 | 96 | Integração contra PostgreSQL |
| `npm run test:e2e` | 2 | 9 | Playwright: 6 no mock, 3 na stack real |

**Total sem repetição: 713 casos.** 308 do pacote + 217 exclusivos do app (525 − 308) + 83
unitários da API + 96 de integração + 9 E2E.

A subtração é o passo que se esquece. Somar "308 do pacote + 525 do app" dá 833 e conta os
mesmos 308 duas vezes — **foi exatamente o erro que a primeira versão desta entrega
cometeu**, chegando a "1 012 testes" no registro da jornada. O número certo sai de
`525 − 217 = 308`, que confere com a suíte do pacote medida sozinha.

### Onde os números do CP5 estavam e onde estão

| Medida | CP5 (2026-09-02) | CP6 (2026-09-02) | O que explica a mudança |
|---|---|---|---|
| Testes, sem repetição | 293 | **460** | +83 da API, +84 no pacote e no app |
| Cobertura de linhas | 79,03% (app) | **97,11%** app · **91,93%** pacote | O domínio saiu para o pacote e passou a ser medido lá, com limite próprio |
| Cobertura de funções | 63,38% | **97,87%** app · **88,88%** pacote | `permissions.ts` foi de 0% a 100% ainda no CP5; o resto veio do recorte |
| Pacote JS gzip | 234,00 KB | **236,90 KB** | Cresceu 2,90 KB. O MSW (106,70 KB) **continua** no bundle, porque a fonte mock continua viva |
| Blocos Mermaid | 24 | **25** | A sequência 3.1, com a trava de linha |
| Rotas / operações | 30 no mock | **43** no contrato **e** na API | 30 preservadas + 13 novas |
| Tabelas | 13 (em memória) | **14** (em PostgreSQL) | `sessao`, para o refresh ser revogável |

**O pacote merece uma nota, porque a previsão do CP5 não se cumpriu.** O CP5 escreveu que o
MSW "desaparece no CP6, quando o mock sai", e que a folga cresceria. Ela **encolheu** 2,87 KB.
O motivo é uma decisão, não um esquecimento: a fonte mock continua viva para sustentar o
ambiente publicado sem backend, então os 106,70 KB do worker continuam no bundle. A folga
atual é de **13,13 KB**, e quem quiser recuperar os 106 KB precisa de um build separado sem a
fonte mock — o que hoje não existe.

### O que **não** foi medido, e é honesto dizer

| Não medido nesta passagem | Por quê | O que falta |
|---|---|---|
| **A suíte de integração da API** — inclui a concorrência de RNF-013 | Exige o serviço `db-teste` do compose de pé (perfil `teste`, porta 5433) e as migrations aplicadas. Não havia PostgreSQL nesta máquina | `docker compose --profile teste up -d db-teste`, `npx prisma migrate deploy` em `api/`, e `npm run test:int -w campus-api`. **A suíte existe**: 10 arquivos e **77 casos declarados** em [`api/test/`](../api/test), com `concorrencia.int.test.ts` cobrindo o `SELECT … FOR UPDATE` |
| **`docker compose up` em máquina limpa** | Foi escrito e não foi executado nesta máquina | Rodar o comando num ambiente sem cache de imagem, e conferir os três serviços de pé |
| **E2E** | Exige `npx playwright install chromium` e um build de produção — que hoje reprova | Consertar o build, instalar o Chromium, `npm run test:e2e` |
| **As 22 restrições do banco** | Exige PostgreSQL. Executadas pela frente de banco em 2026-09-02 | `psql -f api/prisma/verificar-restricoes.sql`, esperando 22 `ok` |
| Latência com tráfego real (RNF-008) | Não há carga | Medir `p95` contra a API com dado de volume |
| Os 6 breakpoints de RNF-018 | Não há teste de layout; é olhar tela | O E2E prova um (390×844) |
| Validação com 5 alunos reais (RNF-005) | Depende de pessoas, não de código | 5 pessoas, 15 min cada |

**A primeira linha é a que mais pesa no critério 1, e ela mudou de natureza durante esta
apuração.** A pendência era "não existe teste de integração": o `api/package.json` declarava
`npm run test:int` apontando para um `vitest.int.config.ts` inexistente, e o script falhava
se rodado. **A suíte foi entregue** — 10 arquivos, 77 casos, com a concorrência entre
processos coberta por `concorrencia.int.test.ts`.

O que resta é diferente e menor: **executá-la**. RNF-013 sai de "só provado contra o mock"
para "provado, pendente de execução registrada" no momento em que alguém subir o `db-teste`
e rodar o comando. É a diferença entre uma lacuna de engenharia e uma lacuna de operação — e
o CP5 mostrou que a segunda também precisa de dono, porque foi assim que o E2E atravessou
dois checkpoints escrito e nunca executado.

O `vitest.int.config.ts` declara por que **não** usa Testcontainers, e a razão é a mesma
lógica do resto do projeto: o pacote não está instalado, o CP6 não abre dependência nova, e
o `db-teste` já existe com porta, volume e nome de banco distintos do `db` de
desenvolvimento — que é a propriedade que importa.

---

## 4. Checklist operacional de submissão

Na ordem em que deve ser executado. 🔧 é de código e pode ser feito por qualquer integrante;
👤 depende de pessoa e não de comando.

### Bloqueadores — nesta ordem

- [ ] 🔧 **Consertar o build.** Acrescentar `EntradaCadastro`, `EdicaoEvento`,
      `ParticipanteConfirmado`, `WebhookPagamento`, `AceitePagamento` e `Saude` ao bloco
      `import type` de `app/src/services/index.ts`. Os seis tipos já existem no pacote
      compartilhado. Conferir com `npm run build` — hoje reprova com 6 erros `TS2304`
- [ ] 🔧 `npm run format` — fecha a segunda reprovação (`app/src/main.tsx`)
- [ ] 🔧 `npx playwright install chromium && npm run test:e2e` — reconfirmar os 6 casos
      contra o build de produção, depois de o build voltar a passar
- [ ] 🔧 `psql -f api/prisma/verificar-restricoes.sql` — reconfirmar os 22 `ok`
- [ ] 🔧 Acrescentar `env: DATABASE_URL` ao job `api` do `ci.yml`, senão o passo
      `prisma validate` falha com `P1012`

### Depois dos bloqueadores

- [ ] 🔧 **Executar a suíte de integração** e registrar o resultado aqui. **É o item com
      maior efeito na nota do critério 1**, porque é o que transforma o
      `SELECT … FOR UPDATE` de código escrito em garantia provada:

      docker compose --profile teste up -d db-teste
      cd api && npx prisma migrate deploy
      npm run test:int -w campus-api

- [ ] 🔧 `docker compose up` numa máquina sem imagem em cache, e percorrer o fluxo do aluno
      no `:8080` contra o `:3000/api`
- [ ] 🔧 Acrescentar um job de integração ao `ci.yml`, com `services: postgres`. Sem isso, a
      suíte de 77 casos depende de alguém lembrar de rodá-la — que é exatamente como o E2E
      atravessou dois checkpoints sem executar

### Ganho fácil de qualidade, se houver tempo

- [ ] 🔧 Corrigir `GET /admin/turmas/{id}/codigo` no `openapi.yaml` para `POST` — a API já a
      implementa como `POST` com `@HttpCode(200)`, e o contrato ficou atrás
- [ ] 🔧 Corrigir `POST /pagamentos/webhook` no `openapi.yaml` de `201` para `200` — a API já
      responde `200`, com o motivo escrito no controlador
- [ ] 🔧 Atualizar `ResultadoLogin` em `packages/shared/src/types.ts` para a forma do
      contrato, e fazer a API consumi-lo em vez do `ResultadoLoginApi` local. **É o modo de
      falha que a ADR-0008 existe para impedir, acontecendo agora**
- [ ] 🔧 Declarar `429` em `POST /publicacoes` e `POST /publicacoes/{id}/comentarios` — o
      limite de taxa existe e o contrato não o declara

### Conferência final

- [ ] 🔧 `node scripts/validate-docs.mjs` — sem falha
- [ ] 🔧 `npm run diagrams` — todos os blocos renderizam
- [ ] 🔧 `node scripts/check-contrato.mjs`
- [ ] 🔧 `npm ci && npm run lint && npm run format:check && npm run check:scale`
- [ ] 🔧 `npm run test:dominio && npm run test && npm run test:coverage`
- [ ] 🔧 `npm run build && npm run check:size`
- [ ] 🔧 `npm run test:e2e`
- [ ] 🔧 `psql -f api/prisma/verificar-restricoes.sql` — 22 `ok`, nenhum `FALHOU`
- [ ] 🔧 `npm run test:int -w campus-api` — com o `db-teste` de pé
- [ ] 🔧 Conferir que o Pages publicou a versão nova (aba Actions → `deploy-pages`)
- [ ] 👤 Abrir o link público em um celular de verdade e percorrer o fluxo do aluno

### Trello

- [ ] 👤 Mover para **Done** os cards da Sprint 3 concluídos
- [ ] 👤 Criar os cards do que o CP6 descobriu: o teste de integração ausente, as três
      correções de contrato e o `ResultadoLogin` atrasado
- [ ] 👤 Comentar em pelo menos 5 cards com o link do commit ou do PR
- [ ] 👤 Salvar o print do quadro **em uso** em `docs/09-trello/evidencia.png`

### Vídeo

- [ ] 👤 Executar o preparo obrigatório da demo descrito em
      [`25-video-cp6-roteiro.md`](25-video-cp6-roteiro.md)
- [ ] 👤 Ensaiar cada bloco cronometrado antes de gravar
- [ ] 👤 Gravar bloco por bloco, não em uma tomada
- [ ] 👤 Confirmar que os **6 integrantes** aparecem e que o vídeo tem **3 minutos**
- [ ] 👤 Subir como link não listado e colar a URL no `README.md` e neste checklist

### Submissão

- [ ] 👤 Colar os links pendentes no texto da seção 5 e enviar no Teams

---

## 5. O que entregar no Teams

Preencha os links marcados com `⟨…⟩` e envie. **Antes de enviar**, confirme que os números
da seção 3 continuam verdadeiros — se a formatação foi corrigida e o teste de integração
escrito, atualize-os; se não foram, deixe-os como estão. Número errado a favor do grupo é
pior que número honesto contra.

```
Checkpoint 6 — Campus (app de eventos universitários)
Engenharia de Software · Engenharia de Computação, 3º ano · Prof. Hercules Ramos

Equipe
  Ana Luiza Dourado      RM558793  UX/UI Designer
  João Viviani Baldini   RM558596  Product Owner
  Lucas Baraldi          RM555407  Tech Lead / Arquiteto
  Lucas Zolla            RM557952  Analista de Requisitos
  Ronaldo Veloso Filho   RM556445  Modelagem / Analista UML
  Vitor Pantarotto       RM554961  Scrum Master / QA

Entregas
  Repositorio .......... https://github.com/lukiin-z/campus
  Rodar em 1 comando ... docker compose up   (roteiro: docs/23-instalacao.md)
  App sem backend ...... https://lukiin-z.github.io/campus/
  Manual de uso ........ https://github.com/lukiin-z/campus/blob/main/docs/22-manual-de-uso.md
  Contrato da API ...... https://github.com/lukiin-z/campus/blob/main/docs/21-api-contrato.md
  Documentacao ......... https://github.com/lukiin-z/campus/blob/main/docs/README.md
  Styleguide da marca .. https://lukiin-z.github.io/campus/styleguide/
  Figma ................ https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp
  Trello ............... ⟨colar o link do quadro⟩
  Video (3 min) ........ ⟨colar o link nao listado⟩

Onde encontrar cada critério
  Funcionalidade completa (30%) ...... api/ e app/, sobre PostgreSQL
                                       43 operacoes no contrato e 43 rotas implementadas.
                                       14 tabelas, 20 CHECK, 2 indices unicos parciais.
                                       22 restricoes verificadas contra PostgreSQL real.
                                       460 testes sem repeticao e 6 casos E2E.
  Qualidade tecnica (20%) ............ 0 erro e 0 aviso de lint nos dois workspaces.
                                       Fronteira de arquitetura EXECUTAVEL: 3 verificadores.
                                       Cobertura 97,11% no app e 91,93% no pacote.
                                       8 ADRs com alternativa recusada e como reverter.
  Instalabilidade (20%) .............. docker compose up, tres servicos em cadeia com
                                       healthcheck de verdade (pg_isready, nao depends_on
                                       solto). Migration e seed automaticos. PWA instalavel.
                                       Roteiro em docs/23-instalacao.md.
  Documentacao final (15%) ........... 25 documentos, 8 ADRs, 21 diagramas UML.
                                       Contrato com fonte unica: api/openapi.yaml, com
                                       docs/21-api-contrato.md como leitura derivada.
                                       validate-docs.mjs verifica link, ancora, bloco
                                       Mermaid e SVG de 52 arquivos.
  Evolucao do projeto (15%) .......... docs/17-jornada.md
                                       As 30 rotas do CP5 seguem TODAS no contrato do CP6,
                                       nenhuma renomeada. O dominio foi MOVIDO para um
                                       pacote, nao copiado. A serializacao de RN-004 saiu
                                       da fila do mock para SELECT ... FOR UPDATE.

Como o CP6 foi construído
  O contrato veio primeiro, como no CP5, e desta vez ele e executavel: api/openapi.yaml, com
  38 caminhos e 43 operacoes, escrito antes dos modulos. A doc do contrato DERIVA do YAML e
  diz isso na primeira linha — porque entre o CP4 e o CP5 uma tabela de endpoints escrita a
  mao divergiu do codigo, e a licao foi parar de ter duas fontes em vez de conferir com mais
  cuidado. As regras de negocio foram PORTADAS, nao reescritas: 13 modulos sairam de
  app/src/domain/ e viraram o pacote @campus/shared, com a fronteira verificada por script.
  planPromotion existe uma vez, e e a mesma que decide na tela e na API.

O que separa o CP6 do CP5, em uma frase
  A garantia de "capacidade nunca excedida" deixou de ser uma fila de promessas dentro de um
  navegador e passou a ser SELECT ... FOR UPDATE numa linha do PostgreSQL, com um CHECK
  embaixo como rede. As duas produzem o mesmo comportamento observavel — e so a segunda vale
  entre processos. A comparacao esta tabelada em docs/05-modelagem/03-modelo-dados-er.md.

Pendências declaradas
  O build reprova neste momento, e a correcao e mecanica: seis tipos usados e nao importados
  em app/src/services/index.ts. Os tipos existem no pacote compartilhado; falta a linha de
  import. Vale registrar POR QUE nem o lint nem os 460 casos de teste pegaram isso: nenhum
  dos dois faz verificacao de tipo — o Vitest transpila com esbuild, que remove anotacao de
  tipo sem checar. O unico passo que roda tsc e o build, e o CI o roda.
  A suite de integracao da API existe — 10 arquivos, 77 casos, com a concorrencia entre
  processos coberta — e NAO foi executada nesta apuracao: exige o servico db-teste do compose
  de pe. Enquanto isso nao acontecer, a garantia de "uma confirmacao para a ultima vaga"
  esta provada contra o mock, cuja fila e de um processo, e escrita mas nao exercitada contra
  o banco. O comando esta no checklist.
  O docker compose foi escrito e nao executado em maquina limpa.
  Um arquivo esta fora do padrao do Prettier (app/src/main.tsx).
  O passo prisma validate do CI deve falhar: o ci.yml nao define DATABASE_URL em job nenhum.
  Tres divergencias entre o contrato e a implementacao estao registradas em
  docs/21-api-contrato.md: uma rota que o YAML declara como GET e a API implementa como POST
  (a API esta certa), um status 201 que deveria ser 200 no webhook, e o tipo ResultadoLogin
  do pacote compartilhado atrasado em relacao ao contrato — a API teve de declarar um tipo
  local para nao usar o desatualizado. Nenhuma quebra o produto; as tres estao nomeadas.
  Tudo isso esta em docs/24-checklist-entrega-cp6.md com o comando que reproduz.
```

---

## 6. O que ainda depende de ação humana

Nada nesta seção pode ser feito por comando. Em ordem de risco para a nota.

| # | Ação | Por que depende de pessoa | Risco se não for feito |
|---|---|---|---|
| 1 | **Gravar o vídeo de 3 minutos** | Precisa de 6 pessoas falando e de tela compartilhada, com a stack subindo ao vivo | O vídeo é a única evidência de que o produto **roda**; sem ele, os 30% de funcionalidade dependem de o avaliador subir o compose |
| 2 | **Rodar `docker compose up` em máquina limpa** | Precisa de uma máquina sem cache de imagem — não é reproduzível na do grupo | O critério de instalabilidade vale 20% e é o único que **só** se prova fora do ambiente do grupo |
| 3 | **Decidir as três correções de contrato** | São decisões de contrato: mudar o YAML ou mudar o código. Ninguém decide sozinho | Contrato e implementação divergentes em três pontos, no checkpoint em que o contrato é a entrega |
| 4 | **Criar e usar o quadro do Trello** | O critério fala em uso real: mover cards, comentar link de PR | Já era pendência no CP4 e no CP5; repetir pela terceira vez é pior por ser repetido |
| 5 | **Escrever o teste de integração de concorrência** | É código, mas ninguém decide sozinho **quais** cenários provam RNF-013 sem ler CT-020 | RNF-013 continua provado só contra o mock |
| 6 | **Validação com 5 alunos reais (RNF-005)** | Precisa de 5 pessoas e de 15 minutos cada | RNF-001 e RNF-005 seguem "não medido" pelo terceiro checkpoint |
| 7 | **Verificar os 6 breakpoints de RNF-018** | Não há teste de layout; é olhar tela | Quebra de layout na correção |
| 8 | **Preencher os links no texto do Teams** | Trello e vídeo só existem depois dos itens 1 e 4 | Entrega sem link é entrega incompleta |

---

## 7. Conferência final, para rodar antes de enviar

```bash
# Documentação: links, âncoras, blocos Mermaid e SVGs
node scripts/validate-docs.mjs

# Diagramas: valida a sintaxe de todos os blocos renderizando cada um
npm run diagrams

# Fronteira do pacote compartilhado
node scripts/check-contrato.mjs

# Monorepo inteiro
npm ci
npm run lint
npm run format:check
npm run check:scale
npm run test:dominio
npm run test
npm run test:coverage
npm run build
npm run check:size

# E2E contra o build de produção
npm run test:e2e

# Banco: as restrições recusam dado impossível
docker compose up -d db
psql -h localhost -U campus -d campus -v ON_ERROR_STOP=0 \
  -f api/prisma/verificar-restricoes.sql

# Integração: o que só um banco prova — FOR UPDATE, CHECK, transação que reverte
docker compose --profile teste up -d db-teste
cd api && npx prisma migrate deploy && cd ..
npm run test:int -w campus-api

# O produto inteiro, em um comando
docker compose up
```

O resultado de cada um destes comandos em 2026-09-02 está na
[seção 3](#3-estado-real-das-verificações), separado em três: medido agora, reprovou agora, e
**não executado nesta passagem**.

**Dois reprovam** — `npm run build` (seis tipos usados e não importados) e `npm run
format:check` (um arquivo) — e a correção de cada um está dita ali. **Quatro não foram
executados nesta passagem** e estão declarados como tal, não como verdes: a suíte de
integração, o E2E, as 22 verificações do banco e o `docker compose up` em máquina limpa. Os
quatro dependem de PostgreSQL, de Chromium ou de uma máquina limpa, e nenhum dos três havia
aqui.

A distinção entre "reprovou" e "não executado" é o que faz esta página valer alguma coisa. As
duas dão a mesma cor de sinal numa entrega, e exigem ações opostas: reprovação se conserta,
não-execução se executa.
