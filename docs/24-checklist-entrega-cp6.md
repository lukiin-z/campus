# Checklist de entrega — Checkpoint 6

**Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)
**Data-alvo de entrega:** 24/11/2026 (premissa do grupo, ajustar ao calendário oficial)
**Estado apurado em:** 2026-09-02 · **reapurado em 2026-09-10** (ver
[seção 3](#3-estado-real-das-verificações))

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
| 2 | **Qualidade técnica** — organização, boas práticas, sem erro crítico | **20%** | Monorepo de 3 workspaces, 5 verificadores próprios, 5 jobs de CI | `npm run lint` — **0 erro, 0 aviso** nos dois workspaces (`--max-warnings 0`). `node scripts/check-contrato.mjs` — a fronteira de `@campus/shared` é **executável**: 30 arquivos, 73 imports analisados, e a mensagem de erro diz o motivo. Cobertura **96,68%** de linhas no app e **99,32%** no pacote (remedido em 2026-09-10; a §3.1 tem os três eixos). Arquitetura e trade-offs em [`08-arquitetura.md`](08-arquitetura.md), decisões em [`adr/`](adr/README.md) — **8 ADRs** com alternativas recusadas e como reverter. ~~**Ressalva: o `build` reprova neste momento**~~ — **corrigido.** Em 2026-09-10 o `build` passa nos três workspaces (seção 3.1); os seis imports entraram. "Sem erro crítico" é verdade **desde que** `prisma generate` tenha rodado (seção 3.2) |
| 3 | **Instalabilidade** — pacote instalável funcionando fora do ambiente do grupo | **20%** | [`docker-compose.yml`](../docker-compose.yml), [`Dockerfile.api`](../Dockerfile.api), [`Dockerfile.web`](../Dockerfile.web), [`23-instalacao.md`](23-instalacao.md) | **Um comando**: `docker compose up`. Três serviços em cadeia, com `depends_on: service_healthy` e `pg_isready` como *healthcheck* — não `depends_on` solto, que espera o container iniciar e não o banco aceitar conexão. A API aplica `prisma migrate deploy`, roda o seed e sobe. App em `:8080`, API em `:3000/api`. PWA instalável (RNF-006) — o manifest é verificado no CI |
| 4 | **Documentação final** — completa, atualizada, coerente | **15%** | [`docs/README.md`](README.md) — **25 documentos**, 8 ADRs, 21 diagramas | `node scripts/validate-docs.mjs` verifica **todo link relativo, toda âncora, todo bloco Mermaid e todo SVG** de 54 arquivos, e reprova marcador de trabalho inacabado. Novos no CP6: [`21-api-contrato.md`](21-api-contrato.md), [`22-manual-de-uso.md`](22-manual-de-uso.md), [`23-instalacao.md`](23-instalacao.md), este checklist e [`25-video-cp6-roteiro.md`](25-video-cp6-roteiro.md). Cada documento revisado abre com **histórico de revisões** datado |
| 5 | **Evolução do projeto** — coerência entre CP4 → CP5 → CP6 | **15%** | [`17-jornada.md`](17-jornada.md) | Linha do tempo por tag com **decisão, commit e defeito encontrado por verificação**. A evolução é rastreável nos artefatos, não narrada: as **30 rotas do CP5 continuam todas no contrato do CP6** (nenhuma renomeada), o domínio **migrou** para `packages/shared` em vez de ser copiado ([ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md)), e a serialização de RN-004 saiu da fila do mock para o `SELECT ... FOR UPDATE` — comparada linha a linha em [`05-modelagem/04-diagrama-sequencia.md` §3.1](05-modelagem/04-diagrama-sequencia.md#31-a-mesma-inscrição-contra-a-api-real) |

**Total: 100%.** Os cinco critérios e os pesos são os do enunciado do CP6.

> **Uma ressalva que vale mais que a tabela, e por isso vem antes dela ser lida.** A tabela
> acima descreve o que os artefatos entregam; a
> [seção 3](#3-estado-real-das-verificações) descreve o que foi **medido**. **Quando as duas
> discordarem, a seção 3 está certa.**
>
> **Estado em 2026-09-10** ([seção 3.1](#31-reapuração-de-2026-09-10--medição-completa)):
> `npm run build` **passa** nos três workspaces **depois de `prisma generate`** — sem esse
> passo ele reprova, ver "o que continua aberto" logo abaixo —, `npm run format:check` **passa**, e os três
> números da linha 1 que antes vinham de execuções antigas foram **remedidos agora** — 9 de
> 9 casos E2E, 96 de 96 de integração e 22 de 22 restrições. O texto anterior desta ressalva
> dizia que o build reprovava com seis `TS2304`; isso foi corrigido por commits posteriores a
> 02/09 e está registrado, não apagado.
>
> **O que continua aberto:** `npm ci && npm run build` reprova em árvore limpa se
> `prisma generate` não rodar antes — o `npm` desta máquina bloqueia o `preinstall` do
> Prisma. Não é defeito de código; é um passo que faltava na
> [seção 7](#7-conferência-final-para-rodar-antes-de-enviar), e foi acrescentado. Ver
> [seção 3.2](#32-o-que-a-reapuração-encontrou-de-novo-npm-ci--npm-run-build-reprova-sozinho).
> E `docker compose up` em máquina **sem cache de imagem** segue **não verificado** — é o
> único item da seção 3.1 que nenhuma máquina do grupo pode medir.

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
| Cobertura alta onde importa | **96,68%** de linhas e **90,97%** de funções no app; **99,32%** e **97,97%** no pacote. O limite de RNF-015 é 60% |
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

> ### Reapuração de 2026-09-10 — o que mudou desde 02/09
>
> A tabela abaixo é da apuração de **02/09** e está preservada como registro. **Tudo o que
> ela marcava como ❌ ou ⚪ foi executado em 10/09, na mesma máquina, e o resultado está na
> [seção 3.1](#31-reapuração-de-2026-09-10--medição-completa). Em resumo: as duas reprovações
> foram corrigidas por commits posteriores a 02/09 e hoje passam, e os quatro itens não
> executados foram executados e passam.**
>
> Uma coisa nova apareceu, e é a única que continua aberta: **`npm ci && npm run build`
> reprova em máquina limpa**, e o motivo não é código. Ver
> [seção 3.2](#32-o-que-a-reapuração-encontrou-de-novo-npm-ci--npm-run-build-reprova-sozinho).

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

### 3.1 Reapuração de 2026-09-10 — medição completa

Rodado na mesma máquina, **17 comandos, nenhum item deixado como "não executado" por falta
de ferramenta**: o Docker Desktop foi iniciado, o `db-teste` subiu, as migrations foram
aplicadas e o Chromium do Playwright já estava instalado. É a primeira passagem em que a
suíte de integração, o E2E completo e as 22 restrições são medidos **juntos**.

| Verificação | Comando | Resultado em 2026-09-10 |
|---|---|---|
| Documentação | `node scripts/validate-docs.mjs` | ✅ **54 arquivos markdown, 1.106 links relativos resolvidos, 25 blocos Mermaid, 34 SVGs — documentação válida** |
| Diagramas | `node scripts/render-diagrams.mjs --check` | ✅ **25/25 blocos Mermaid renderizados** (modo `--check`, nada gravado) |
| Fronteira do pacote | `node scripts/check-contrato.mjs` | ✅ **30 arquivos, 73 imports analisados — fronteira preservada.** Cresceu de 28/68 desde 02/09 |
| Lint (app + API) | `npm run lint` | ✅ **0 erro, 0 aviso** nos dois workspaces |
| Escala de espaçamento | `npm run check:scale` | ✅ **486 utilitários**, todos na escala de 4 px. Eram 478 em 02/09 |
| Formatação | `npm run format:check` | ✅ **"All matched files use Prettier code style!"** — a reprovação de `app/src/main.tsx` de 02/09 foi corrigida |
| Schema do Prisma | `npx prisma validate --schema api/prisma/schema.prisma` | ✅ **"The schema at api\prisma\schema.prisma is valid"** (com `DATABASE_URL` placeholder; nada conecta) |
| Testes do pacote | `npm run test:dominio` | ✅ **308 de 308**, em 14 arquivos |
| Testes do app | `npm run test -w campus-app` | ✅ **525 de 525**, em 28 arquivos |
| Testes da API | `npm run test -w campus-api` | ✅ **83 de 83**, em 7 arquivos |
| **Integração contra PostgreSQL** | `npm run test:int -w campus-api` | ✅ **96 de 96**, em 11 arquivos. **Era o item declarado "não executado" com maior efeito na nota do critério 1** — inclui `concorrencia.int.test.ts`, que é o que prova o `SELECT … FOR UPDATE` de RNF-013 |
| Cobertura do pacote | `npm run test:coverage -w @campus/shared` | ✅ Linhas **99,32%**, funções **97,97%**, branches **94,62%** — limite 60%. Subiu de 91,93% de linhas |
| Cobertura do app | `npm run test:coverage -w campus-app` | ✅ Linhas **96,68%**, funções **90,97%**, branches **85,04%**. **Funções caíram de 97,87%** — passa o limite, mas a direção é de piora, e está dito aqui em vez de omitido |
| **Build** | `npm run build` | ✅ **Passa nos três workspaces** — `@campus/shared`, `campus-app` (418 módulos, 8,49 s) e `campus-api`. Os 6 erros `TS2304` de 02/09 **não existem mais**: os seis tipos estão no bloco `import type` de `app/src/services/index.ts`. **Com uma condição, ver [3.2](#32-o-que-a-reapuração-encontrou-de-novo-npm-ci--npm-run-build-reprova-sozinho)** |
| Orçamento de pacote | `npm run check:size` | ✅ **JS 237,41 / 250 KB gzip**, CSS **5,10 / 40**, maior chunk **106,70 / 130**. A folga é de **12,59 KB** |
| Contrato × rotas servidas | `npm run check:rotas` | ✅ **38 caminhos declarados no `openapi.yaml`, 38 registrados pela aplicação.** Exige `DATABASE_URL`, `JWT_SECRET` e `WEBHOOK_SECRET`; sem elas o script recusa com a lista dos nomes que faltam, e os placeholders estão no `ci.yml` |
| **Restrições do banco** | `psql -f api/prisma/verificar-restricoes.sql` | ✅ **22 `ok`, 0 falha**, contra PostgreSQL 16 no container. Rodado por `docker exec` porque não há `psql` no host — o `-v ON_ERROR_STOP=0` é proposital: os blocos esperam recusa |
| **E2E** | `npm run test:e2e` | ✅ **9 de 9 verdes em 1,1 min**, 6 workers. `mock-mobile-chromium`: 6 casos. `api-mobile-chromium`: 3 casos contra a API real com PostgreSQL — login e alcance, inscrição → cobrança → pagamento → ingresso, e evento lotado → fila com posição |
| `docker compose up` em máquina **sem cache** | `docker compose up` | ⚪ **Não verificado.** As imagens já estão em cache nesta máquina, então rodar aqui **não** mede o que o critério de instalabilidade pede. Continua dependendo de outra máquina — [`entrega/README.md` §4](entrega/README.md#4-o-que-depende-de-pessoa-mas-não-é-entregável) |

**Total de testes automatizados executados nesta passagem: 1.021 execuções, 713 casos
distintos.** A subtração é a mesma da [seção abaixo](#o-que-o-total-de-testes-soma-e-por-que-não-é-1-021):
308 do pacote + 217 exclusivos do app (525 − 308) + 83 unitários da API + 96 de integração +
9 E2E = **713**. É a primeira vez que os cinco números são medidos na mesma passagem, e eles
fecham — o que antes era aritmética sobre execuções separadas.

### 3.2 O que a reapuração encontrou de novo: `npm ci && npm run build` reprova sozinho

**É o único achado novo, e ele não é código.** Numa árvore limpa, a sequência que a
[seção 7](#7-conferência-final-para-rodar-antes-de-enviar) manda rodar **reprova**:

```
npm ci          # exit 0, mas com: "npm warn allow-scripts ... prisma@6.19.3 (preinstall)"
npm run build   # exit 1 — 182 erros em campus-api
```

**Os 182 foram reproduzidos em 2026-09-10**, com exatamente as duas linhas acima e nada
mais. Eles **não** são todos do mesmo código — a contagem por código é esta, e a soma dá 182:

| Código | Nº | Código | Nº |
|---|---|---|---|
| `TS7006` | 40 | `TS2345` | 20 |
| `TS2339` | 40 | `TS1804` | 4 |
| `TS2694` | 39 | `TS2347` | 3 |
| `TS2305` | 33 | `TS2344` | 2 |
| | | `TS2322` | 1 |

Nove códigos, não dois. `type 'never'` aparece em **29** das linhas, não em todas. O que é
comum a todas é a **causa**, não a mensagem — e é por isso que a amostra abaixo basta para
diagnosticar, mas não serve para descrever o conjunto:

```
src/seed/run.ts:104:12 - error TS2339: Property 'comentario' does not exist on type 'never'.
src/seed/run.ts:170:14 - error TS7006: Parameter 'tx' implicitly has an 'any' type.
```

`type 'never'` para toda propriedade de *delegate* do Prisma significa **cliente do Prisma
não gerado**. O `npm` desta máquina bloqueia scripts de ciclo de vida por padrão e avisa em
vez de executar, então o `preinstall` do `prisma` não roda — e nada mais no repositório
regenera o cliente.

**Depois de `npx prisma generate`, `npm run build -w campus-api` passa com exit 0.** Não há
defeito de código: há um passo obrigatório fora da sequência documentada.

| Onde o passo **está** documentado | Onde **faltava** |
|---|---|
| [`23-instalacao.md` §4](23-instalacao.md) — `npm run prisma:generate -w campus-api`, com o comentário "não é versionado" | A [seção 7](#7-conferência-final-para-rodar-antes-de-enviar) desta página |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) — no roteiro de primeira execução | — |
| [`ci.yml`](../.github/workflows/ci.yml) — passo explícito "Gera o cliente do Prisma" nos jobs `api`, `integracao` e `e2e` | — |

**O CI nunca sofreu disso**, porque tem o passo. Quem sofre é a pessoa que segue a seção 7
deste checklist — e isso importa agora, porque **instalabilidade vale 20%** e a primeira
coisa que um avaliador faz é copiar o bloco de comandos. A seção 7 foi corrigida.

O modo de falha é irmão do que a seção seguinte descreve: **lint e teste passam com o build
quebrado**, porque nenhum dos dois roda `tsc`. Aqui é mais um degrau — `npm ci` também
**passa** (exit 0) enquanto deixa o projeto sem poder compilar, e o único sinal é um `npm
warn` no meio da saída de instalação.

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
| Cobertura de linhas | 79,03% (app) | **96,68%** app · **99,32%** pacote | O domínio saiu para o pacote e passou a ser medido lá, com limite próprio |
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

> **Atualizado em 2026-09-10.** Quatro das sete linhas desta tabela saíram dela: foram
> **medidas**, e o resultado está na
> [seção 3.1](#31-reapuração-de-2026-09-10--medição-completa). Ficam com o estado novo, para
> que a comparação com 02/09 continue possível.

| Item | Estado em 02/09 | Estado em 10/09 |
|---|---|---|
| **A suíte de integração da API** — inclui a concorrência de RNF-013 | ⚪ Não medido: exigia o `db-teste` de pé (perfil `teste`, porta 5433) e as migrations aplicadas, e não havia PostgreSQL nesta máquina | ✅ **96 de 96, em 11 arquivos, contra PostgreSQL 16.** `concorrencia.int.test.ts` cobre o `SELECT … FOR UPDATE`. RNF-013 sai de "provado só contra o mock" para **provado com execução registrada** |
| **E2E** | ⚪ Não medido: exigia Chromium e um build de produção, que reprovava | ✅ **9 de 9 verdes em 1,1 min** — 6 no mock, 3 contra a stack real |
| **As 22 restrições do banco** | ⚪ Não medido nesta máquina (executado pela frente de banco em 02/09) | ✅ **22 `ok`, 0 falha.** Rodado por `docker exec … psql` porque não há `psql` no host |
| **`docker compose up` em máquina limpa** | ⚪ Escrito e não executado | ⚪ **Continua não verificado, e não é verificável aqui:** as imagens estão em cache nesta máquina, então rodar mediria a máquina e não o critério. É o item que **precisa de outra máquina** |
| Latência com tráfego real (RNF-008) | ⚪ Não há carga | ⚪ **Não verificado.** Falta medir `p95` contra a API com dado de volume |
| Os 6 breakpoints de RNF-018 | ⚪ Não há teste de layout | ⚪ **Não verificado.** O E2E prova **um** (390×844) |
| Validação com 5 alunos reais (RNF-005) | ⚪ Depende de pessoas | ⚪ **Não verificado.** 5 pessoas, 15 min cada — [`entrega/README.md` §4](entrega/README.md#4-o-que-depende-de-pessoa-mas-não-é-entregável) |

**Três continuam não verificados, e nenhum dos três se resolve com um comando nesta
máquina.** É uma lista menor e mais honesta que a de 02/09: antes havia sete itens, dos quais
quatro só precisavam de execução. Executar resolveu quatro; os três que sobraram precisam de
outra máquina, de carga ou de pessoas.

**A primeira linha é a que mais pesa no critério 1, e ela atravessou três estados — vale
seguir os três, porque é a lição de processo desta entrega.** Primeiro a pendência era "não
existe teste de integração": o `api/package.json` declarava `npm run test:int` apontando para
um `vitest.int.config.ts` inexistente, e o script falhava se rodado. Depois a suíte foi
entregue — 11 arquivos, 96 casos — e a pendência virou **"escrita e não executada"**, que é
uma lacuna de operação, não de engenharia. **Em 10/09 ela foi executada: 96 de 96.**

O CP5 já tinha mostrado que a lacuna de operação também precisa de dono — foi assim que o
E2E atravessou dois checkpoints escrito e nunca executado. A diferença agora é que os dois
casos têm **job próprio no `ci.yml`** (`integracao` com `services: postgres`, e `e2e` com
banco e Chromium), então nenhum dos dois volta a depender de alguém lembrar.

O `vitest.int.config.ts` declara por que **não** usa Testcontainers, e a razão é a mesma
lógica do resto do projeto: o pacote não está instalado, o CP6 não abre dependência nova, e
o `db-teste` já existe com porta, volume e nome de banco distintos do `db` de
desenvolvimento — que é a propriedade que importa.

---

## 4. Checklist operacional de submissão

Na ordem em que deve ser executado. 🔧 é de código e pode ser feito por qualquer integrante;
👤 depende de pessoa e não de comando.

### Bloqueadores — nesta ordem

**Os cinco bloqueadores de 02/09 estão fechados**, e a medição de cada um está na
[seção 3.1](#31-reapuração-de-2026-09-10--medição-completa). Ficam riscados, não apagados:
lista de bloqueadores que perde o histórico não deixa aprender nada.

- [x] 🔧 ~~**Consertar o build** — 6 erros `TS2304` em `app/src/services/index.ts`~~ →
      **fechado.** Os seis tipos estão no bloco `import type`; `npm run build` passa nos três
      workspaces **desde que `npm run prisma:generate -w campus-api` tenha rodado antes** —
      sem ele, reprova com 182 erros de tipo em árvore limpa (bloqueador logo abaixo)
- [x] 🔧 ~~`npm run format` (`app/src/main.tsx`)~~ → **fechado.** `format:check` limpo
- [x] 🔧 ~~`npx playwright install chromium && npm run test:e2e`~~ → **fechado.** **9 de 9
      verdes**, 6 no mock e 3 contra a stack real, e o `ci.yml` instala o Chromium em job
      próprio
- [x] 🔧 ~~`psql -f api/prisma/verificar-restricoes.sql`~~ → **fechado.** **22 `ok`, 0
      falha** contra PostgreSQL 16
- [x] 🔧 ~~Acrescentar `env: DATABASE_URL` ao job `api` do `ci.yml`~~ → **fechado.** O
      `ci.yml` define o placeholder e `prisma validate` responde "the schema is valid"

**Bloqueador que a reapuração de 10/09 encontrou, e já corrigido:**

- [x] 🔧 **`prisma generate` faltava na [seção 7](#7-conferência-final-para-rodar-antes-de-enviar).**
      Sem ele, `npm ci && npm run build` reprova com 182 erros em árvore limpa — ver
      [seção 3.2](#32-o-que-a-reapuração-encontrou-de-novo-npm-ci--npm-run-build-reprova-sozinho)

### Depois dos bloqueadores

- [x] 🔧 ~~**Executar a suíte de integração**~~ → **fechado em 2026-09-10: 96 de 96, em 11
      arquivos, contra PostgreSQL 16.** Era o item com maior efeito na nota do critério 1, e
      é o que transforma o `SELECT … FOR UPDATE` de código escrito em garantia provada. A
      sequência, com uma linha a menos do que esta lista trazia até 2026-09-10:

      docker compose --profile teste up -d db-teste
      npm run test:int -w campus-api

      O `cd api && npx prisma migrate deploy` que ficava no meio **saiu**: reprova com
      `P1012` (`Environment variable not found: DATABASE_URL`), porque nada exporta a
      variável aqui, e é **redundante** — o `globalSetup` de `api/vitest.int.config.ts`
      sobe o `db-teste` e aplica a migration sozinho. Medido em 2026-09-10.

- [ ] 👤 `docker compose up` numa máquina sem imagem em cache, e percorrer o fluxo do aluno
      no `:8080` contra o `:3000/api`. **O único item que nenhuma máquina do grupo mede** —
      aqui a imagem já está em cache, então rodar não prova o que o critério pede
- [x] 🔧 ~~Acrescentar um job de integração ao `ci.yml`, com `services: postgres`~~ →
      **fechado.** O `ci.yml` tem o job `integracao` com `services:` e o job `e2e` com banco
      e Chromium próprios. A suíte deixou de depender de alguém lembrar de rodá-la — que era
      exatamente como o E2E atravessou dois checkpoints sem executar

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
                                       Cobertura 96,68% no app e 99,32% no pacote.
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
  O build passa nos tres workspaces SOB UMA CONDICAO, e ela e o unico ponto que ainda exige
  atencao de quem instala: o cliente do Prisma nao e versionado e o npm bloqueia o preinstall
  que o geraria (npm warn allow-scripts). Em arvore limpa, `npm ci && npm run build` reprova
  com 182 erros de tipo na API; com `npm run prisma:generate -w campus-api` antes, passa. Nao
  e defeito de codigo, e um passo de instalacao, e ele esta na secao 7, no CONTRIBUTING e no
  ci.yml. Vale registrar POR QUE nem o lint nem os testes pegam essa classe de falha: nenhum
  dos dois faz verificacao de tipo — o Vitest transpila com esbuild, que remove anotacao de
  tipo sem checar. O unico passo que roda tsc e o build, e o CI o roda.
  check:rotas tem a mesma forma: ele SOBE a aplicacao, entao exige DATABASE_URL, JWT_SECRET e
  WEBHOOK_SECRET. Sem elas reprova por ambiente, nao por rota; com os placeholders do ci.yml,
  os 38 caminhos do contrato batem com os 38 registrados.
  A suite de integracao da API FOI executada: 11 arquivos, 96 casos, 96 verdes contra
  PostgreSQL, com a concorrencia entre processos coberta. A garantia de "uma confirmacao para
  a ultima vaga" deixou de estar provada so contra o mock.
  O docker compose sobe os tres servicos em cadeia NESTA maquina e COM cache de imagem: db e
  api saudaveis pelo healthcheck, front em 8080 respondendo 200, /api/health 200 com
  banco ok, e um GET autenticado em /api/eventos devolvendo 24 eventos do PostgreSQL. Zero
  linha de erro no log dos tres. Em maquina SEM cache de imagem continua NAO verificado — e
  a unica pendencia de medicao que sobra.
  As tres divergencias entre o contrato e a implementacao que o CP6 declarava estao
  FECHADAS em 2026-09-11, e o registro de cada uma ficou em docs/21-api-contrato.md §6:
  a rota do codigo de convite (o YAML dizia GET, a API implementa POST — o YAML mudou),
  o status do webhook de pagamento (o YAML dizia 201, a API responde 200 — o YAML mudou)
  e o tipo ResultadoLogin (o codigo mudou: ResultadoLoginApi foi removido e a API importa
  TokensDeSessao do pacote). Seguem abertas outras duas, menores e nomeadas: 429 ausente
  em duas rotas de escrita do feed, e excluido_em fora do schema.
  Tudo isso esta em docs/24-checklist-entrega-cp6.md com o comando que reproduz.
```

---

## 6. O que ainda depende de ação humana

Nada nesta seção pode ser feito por comando. Em ordem de risco para a nota.

**Os insumos dos três checkpoints estão consolidados em
[`docs/entrega/README.md`](entrega/README.md)** — roteiros de vídeo, arquivos de importação do
Trello e o texto de submissão do Teams, com o que já está pronto e o que falta em cada um.

| # | Ação | Por que depende de pessoa | Risco se não for feito |
|---|---|---|---|
| 1 | **Gravar o vídeo de 3 minutos** | Precisa de 6 pessoas falando e de tela compartilhada, com a stack subindo ao vivo | O vídeo é a única evidência de que o produto **roda**; sem ele, os 30% de funcionalidade dependem de o avaliador subir o compose. **Roteiro e deck prontos** — [`entrega/README.md` §1](entrega/README.md#1-gravar-os-vídeos) |
| 2 | **Rodar `docker compose up` em máquina limpa** | Precisa de uma máquina sem cache de imagem — não é reproduzível na do grupo. **O que já foi medido em 2026-09-10, e não fecha o item:** na máquina do grupo, **com** cache, `docker compose up -d` sobe `db`, `api` e `web` em cadeia por `service_healthy`; front em `:8080` responde **200**, `/api/health` responde **200** com `banco: ok`, e um `GET /api/eventos` autenticado devolve **24 eventos** do PostgreSQL, com **zero** linha de erro no log dos três. Isso prova o **compose**; não prova o **build a frio** | O critério de instalabilidade vale 20% e é o único que **só** se prova fora do ambiente do grupo |
| ~~3~~ | ~~**Decidir as três correções de contrato**~~ | ✅ **Fechado em 2026-09-11.** Regra aplicada: o OpenAPI é o contrato publicado, alinhe o código ao YAML — exceto quando alinhar o código quebraria teste existente, e aí o YAML é que estava errado. Duas caíram na exceção (o YAML mudou) e uma na regra (o código mudou). Veredito e medição de cada uma em [`21-api-contrato.md` §6](21-api-contrato.md#6-divergências-abertas-entre-o-contrato-e-o-resto) | — |
| 4 | **Criar e usar o quadro do Trello** | O critério fala em uso real: mover cards, comentar link de PR | Já era pendência no CP4 e no CP5; repetir pela terceira vez é pior por ser repetido. **Insumo pronto e conferido** em [`entrega/README.md` §2](entrega/README.md#2-criar-e-usar-o-quadro-do-trello) |
| ~~5~~ | ~~**Escrever o teste de integração de concorrência**~~ | ✅ **Fechado.** `concorrencia.int.test.ts` existe e foi **executado** em 2026-09-10, dentro dos 96 de 96 da suíte de integração contra PostgreSQL 16 | — |
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

# OBRIGATORIO ANTES DO BUILD, e o passo que faltava aqui ate 2026-09-10.
# O cliente do Prisma nao e versionado, e o `npm` pode bloquear o `preinstall`
# que o geraria (`npm warn allow-scripts`). Sem esta linha, `npm run build`
# reprova com 182 erros de tipo em campus-api, espalhados por NOVE codigos
# (TS7006 e TS2339 lideram com 40 cada). A assinatura de cliente nao gerado e
# "does not exist on type 'never'", em 29 das linhas. Ver secao 3.2.
npm run prisma:generate -w campus-api

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

# Banco: as restrições recusam dado impossível.
# Vai pelo `docker compose exec` e não por um `psql` do host: o cliente do
# PostgreSQL não é pré-requisito deste projeto (não está em `23-instalacao.md`),
# e a imagem já o traz. `PGPASSWORD` é obrigatório porque o serviço sobe com
# `POSTGRES_HOST_AUTH_METHOD: scram-sha-256`; o valor é o padrão de
# desenvolvimento declarado no próprio `docker-compose.yml`, não um segredo.
docker compose up -d db
docker compose exec -T -e PGPASSWORD=campus_dev_local db \
  psql -U campus -d campus -v ON_ERROR_STOP=0 -f - \
  < api/prisma/verificar-restricoes.sql

# Integração: o que só um banco prova — FOR UPDATE, CHECK, transação que reverte.
# NÃO chame `prisma migrate deploy` aqui: o `globalSetup` de
# `api/vitest.int.config.ts` sobe o `db-teste` e aplica a migration sozinho.
# A chamada manual era redundante E reprovava com `P1012` (`Environment variable
# not found: DATABASE_URL`), porque nada exporta a variável nesta sequência.
docker compose --profile teste up -d db-teste
npm run test:int -w campus-api

# O produto inteiro, em um comando
docker compose up
```

O resultado de cada um destes comandos em 2026-09-02 está na
[seção 3](#3-estado-real-das-verificações), separado em três: medido agora, reprovou agora, e
**não executado nesta passagem**.

**Em 02/09, dois reprovavam** — `npm run build` (seis tipos usados e não importados) e
`npm run format:check` (um arquivo) — **e quatro não foram executados**: a suíte de
integração, o E2E, as 22 verificações do banco e o `docker compose up` em máquina limpa.

**Em 10/09 a conta é outra, e está na [seção 3.1](#31-reapuração-de-2026-09-10--medição-completa):
17 verificações medidas, 17 passam.** As duas reprovações foram corrigidas por commits
posteriores a 02/09; três dos quatro não-executados foram executados (o Docker foi iniciado,
o `db-teste` subiu, o Chromium já estava instalado) e passam: **96 de 96** de integração,
**9 de 9** E2E e **22 `ok`** de restrições.

**Sobra um, e ele é honesto:** `docker compose up` em máquina **sem cache de imagem**
continua **não verificado**, e não dá para verificá-lo aqui — a imagem já está em cache nesta
máquina, então rodar o comando mediria a máquina, não o critério.

A distinção entre "reprovou" e "não executado" é o que faz esta página valer alguma coisa. As
duas dão a mesma cor de sinal numa entrega, e exigem ações opostas: reprovação se conserta,
não-execução se executa. **A reapuração de 10/09 é a prova disso:** dos seis itens que não
eram verdes, cinco viraram verdes sem uma linha de código nova — bastou executar.
