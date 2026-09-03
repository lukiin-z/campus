# Checklist de entrega — Checkpoint 5

**Responsável pela conferência:** Vitor Pantarotto (Scrum Master / QA)
**Data-alvo de entrega:** 06/10/2026 (premissa do grupo, ajustar ao calendário oficial)
**Estado apurado em:** 2026-09-02

Este documento existe para uma coisa: **provar que cada critério exigido foi atendido, e
apontar exatamente onde**. A coluna "evidência" não diz "está pronto" — diz o que a pessoa
que corrige pode abrir, contar ou rodar para verificar.

Segue a estrutura do [checklist do CP4](16-checklist-entrega-cp4.md), com uma diferença
deliberada: a [seção 3](#3-estado-real-das-verificações) traz o **resultado medido** de
cada comando, incluindo o que ainda não foi executado e o que reprovou durante a sprint
antes de ser corrigido. Checklist que só lista sucesso não é checklist — é folheto.

---

## 1. Os 5 critérios de avaliação do CP5

| # | Critério | Peso | Artefato que atende | Evidência verificável |
|---|---|---|---|---|
| 1 | **Funcionalidade do protótipo** | **30%** | [`app/`](../app) — **12 rotas** em [`App.tsx`](../app/src/App.tsx), todas com tela escrita | **25 dos 43 RF completos e 3 parciais**, com status e evidência requisito por requisito em [`02-requisitos.md` §1.1](02-requisitos.md#11-status-de-implementação-no-cp5). **30 endpoints** na API simulada (14 em [`handlers.ts`](../app/src/mocks/handlers.ts) + 16 em [`handlersCp5.ts`](../app/src/mocks/handlersCp5.ts)), **16 módulos de domínio**, **293 testes passando** (`cd app && npm run test`) e **6 casos E2E** contra o build de produção (`npm run test:e2e`) |
| 2 | **Ambiente de teste** | **20%** | [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) | Link público do app, roteiro de 3 comandos para rodar local, usuários de teste do seed e roteiro de 5 minutos por fluxo. Build verificado: `cd app && npm run build` termina sem erro e o pacote fica em **232,97 KB gzip de um orçamento de 250** (`npm run check:size`) |
| 3 | **Documentação atualizada** | **20%** | [`02-requisitos.md`](02-requisitos.md), [`03-escopo.md`](03-escopo.md), [`04-regras-de-negocio.md`](04-regras-de-negocio.md), [`17-jornada.md`](17-jornada.md) | Cada documento abre com **histórico de revisões** datado. Os 43 RF têm status lido do código; os 22 RNF têm **valor medido** ou a marca "não medido no CP5"; as 29 RN apontam **arquivo, função e teste**. `node scripts/validate-docs.mjs` verifica links e âncoras |
| 4 | **Diagramas UML atualizados** | **15%** | [`05-modelagem/`](05-modelagem/README.md) | Diagramas conferidos contra o código entregue no CP5. `node scripts/render-diagrams.mjs --check` valida a sintaxe de cada bloco; o validador de docs percorre os **24 blocos Mermaid** e reprova bloco aberto |
| 5 | **Qualidade da simulação / demo** | **15%** | [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md) + [`20-video-cp5-slides.html`](20-video-cp5-slides.html) | Roteiro de 2 minutos cronometrado bloco por bloco, com storyboard, escalação dos 6 integrantes, usuário de teste por cena, preparo obrigatório da demo e **plano B por fluxo** se algo travar na gravação |

**Total: 100%.** Os cinco critérios e os pesos são os do enunciado do CP5.

---

## 2. Como cada critério se sustenta

### Funcionalidade do protótipo — 30%

*Observado: o protótipo faz o que a documentação diz que ele faz.*

| Sub-item | Evidência |
|---|---|
| Fluxo completo do aluno | Login → onboarding → feed → detalhe → inscrição → pagamento → ingresso → check-in. As 12 rotas estão declaradas em [`App.tsx`](../app/src/App.tsx), com guarda de rota de **três estados** (sem token, sessão em voo, sessão resolvida) para o F5 em rota profunda não piscar o login |
| Fluxo do organizador | Criar evento com alcance derivado do vínculo, acompanhar ocupação e validar check-in pelo painel |
| Regra de negócio no "servidor", não na tela | Inscrição fora do alcance é recusada pela API, e `obter()` por ID direto devolve `null` — [`inscricao.test.ts`](../app/src/services/inscricao.test.ts) CT-012. Esconder na UI não conta (RNF-012) |
| Capacidade sem estouro | **50 inscrições concorrentes na última vaga confirmam exatamente uma** — `inscricao.test.ts` CT-020. É o teste que prova RNF-013 |
| Lista de espera que anda sozinha | Cancelar libera a vaga, promove o primeiro da fila e recalcula as posições **na mesma transação** — CT-004 e CT-005 |
| Pagamento simulado com idempotência | A mesma notificação do gateway repetida não produz segunda confirmação — [`payment.test.ts`](../packages/shared/src/domain/payment.test.ts) CT-010. A cobrança também é idempotente por participação (RN-027) |
| Camada de dados trocável | Nenhuma tela importa `fetch`, `axios`, `msw` ou `mocks/` — garantido por `no-restricted-imports` em [`.eslintrc.cjs`](../app/.eslintrc.cjs), verificado pelo CI. O container concreto é **uma linha** em [`services/index.ts`](../app/src/services/index.ts) |
| Status honesto por requisito | [`02-requisitos.md` §1.1](02-requisitos.md#11-status-de-implementação-no-cp5) classifica os 43 RF em `implementado` (21), `mockado` (4), `parcial` (3) e `adiado` (15), com o arquivo que sustenta cada classificação |

### Ambiente de teste — 20%

*Observado: quem corrige consegue rodar e avaliar sem ajuda.*

| Sub-item | Evidência |
|---|---|
| Acesso por link | GitHub Pages, publicado por [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) com a `base` do Vite em `/campus/` |
| Rodar local | Três comandos, descritos em [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) e no [`README.md`](../README.md) |
| Dados de teste previsíveis | Seed canônico em [`mocks/seed.ts`](../app/src/mocks/seed.ts): usuários com papéis diferentes, eventos nos três alcances, um evento lotado com fila, um cancelado e um pago |
| Build que de fato roda | `npm run build` sem erro (`tsc -b` + `vite build`), 410 módulos transformados |
| Orçamento de pacote respeitado | **232,97 KB gzip de 250** — e 105,81 KB disso é o MSW, que sai no CP6 ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)). A margem atual é de 17 KB gzip |

### Documentação atualizada — 20%

*Observado: coerência entre o documentado e o implementado.*

| Sub-item | Evidência |
|---|---|
| Documentação é viva, não reescrita | Os quatro documentos revisados abrem com **histórico de revisões** com versão, data, checkpoint e o que mudou. A tabela de rastreabilidade do CP4 em [`04-regras-de-negocio.md`](04-regras-de-negocio.md#rastreabilidade-como-estava-no-cp4) foi **preservada ao lado da nova** — a diferença entre as duas é o resultado da revisão |
| Status real dos 43 RF | [`02-requisitos.md` §1.1](02-requisitos.md#11-status-de-implementação-no-cp5) — status lido do código, com endpoint, função de domínio e teste citados por requisito |
| Requisitos que a implementação corrigiu | [`02-requisitos.md` §1.2](02-requisitos.md#12-requisitos-corrigidos-pelo-que-a-implementação-mostrou) — RF-006 e RF-012 tinham critério de aceite que a API não conseguia satisfazer, e foram corrigidos. Cada correção cita o arquivo que provou |
| Requisito em que o **código** cedeu, não o documento | [`02-requisitos.md` §1.2](02-requisitos.md#o-caso-em-que-o-código-cedeu-e-não-o-requisito) — RF-034 estava certo em pedir o horário do primeiro check-in; `decideCheckIn` verificava o status antes da unicidade e nunca chegava lá. **A ordem foi corrigida no código**, com teste de regressão nomeado. Nem toda divergência se resolve mudando o documento |
| RNF com valor medido | Os 22 RNF ganharam a coluna **Valor medido (2026-09-02)**: **10 cumpridos e medidos**, 4 parcialmente medidos e 8 declarados "não medido no CP5" com o que falta para medir. Nenhum número estimado |
| Regras de negócio rastreadas até a função | [`04-regras-de-negocio.md`](04-regras-de-negocio.md#rastreabilidade-regra--requisito--código--teste) — as 29 RN com arquivo, função, quem chama e qual teste. **16 têm teste próprio, 6 têm teste parcial e 7 não têm nenhum** — e a tabela diz quais |
| Contradições encontradas e resolvidas | A [contradição de RN-019](04-regras-de-negocio.md#contradição-encontrada-no-cp5--três-regras-para-a-mesma-coisa): três critérios diferentes de quem pode publicar no feed, em vigor ao mesmo tempo. Resolvida no documento, com o defeito de código registrado |
| Escopo com a troca declarada | [`03-escopo.md` §8.1](03-escopo.md#81-o-que-o-cp5-fechou-e-o-que-escorregou-para-o-cp6) — 7 requisitos entraram, 3 saíram, com o motivo de cada um e o aprendizado de escopo |
| Jornada entre checkpoints | [`17-jornada.md`](17-jornada.md) — decisões, mudanças de requisito que a implementação provocou e os defeitos que a verificação encontrou |
| Links e âncoras verificados por ferramenta | `node scripts/validate-docs.mjs` — links relativos, âncoras internas, blocos Mermaid fechados, SVGs bem formados e ausência de marcador de trabalho inacabado |

### Diagramas UML atualizados — 15%

*Observado: diagrama coerente com o código entregue, não com a intenção do CP4.*

| Sub-item | Evidência |
|---|---|
| Diagramas conferidos contra o CP5 | [`05-modelagem/`](05-modelagem/README.md) — responsabilidade da lane de UML nesta sprint |
| Sintaxe validada por ferramenta | `node scripts/render-diagrams.mjs --check` renderiza cada bloco e falha se algum não renderizar |
| Blocos fechados | O validador de docs percorre todos os blocos Mermaid (**23** em 2026-09-02) e reprova bloco aberto, que quebraria a renderização do arquivo inteiro no GitHub |
| Coerência tipo ↔ diagrama | [`app/src/types/domain.ts`](../app/src/types/domain.ts) espelha o diagrama de classes entidade por entidade e enum por enum |

### Qualidade da simulação / demo — 15%

*Observado: a demonstração mostra software rodando, e não slide sobre software.*

| Sub-item | Evidência |
|---|---|
| Roteiro cronometrado | [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md) — storyboard em blocos com contagem de tempo e de palavras, e a divisão entre tela do app e material de apoio |
| Escalação dos 6 integrantes | Quem fala cada bloco, com a fala combinando com o papel de cada um |
| Preparo da demo declarado | O que já vem pronto no seed, o que **não** vem e por quê, e o preparo obrigatório do evento do dia |
| Plano B por fluxo | O que fazer se um fluxo travar durante a gravação — demo ao vivo sem plano B é aposta |
| Deck de apoio | [`20-video-cp5-slides.html`](20-video-cp5-slides.html), página única e autossuficiente |

---

## 3. Estado real das verificações

Rodado em **2026-09-02**, na raiz e em `app/`. **Um item reprova**, e está aqui com o
número medido — esconder reprovação em checklist de entrega é o oposto da função dele.

| Verificação | Comando | Resultado medido |
|---|---|---|
| Documentação | `node scripts/validate-docs.mjs` | ✅ **48 arquivos markdown, 885 links relativos resolvidos, 24 blocos Mermaid, 33 SVGs — sem falha, sem aviso de âncora.** Os totais crescem conforme os documentos do CP5 entram; o que importa é o veredito |
| Lint | `cd app && npm run lint` | ✅ **0 erro, 0 aviso** (`--max-warnings 0`) |
| Escala de espaçamento | `npm run check:scale` | ✅ **478 utilitários**, todos na escala de 4px |
| Formatação | `npm run format:check` | ✅ **"All matched files use Prettier code style!"** — chegou a reprovar 26 arquivos no meio da sprint |
| Testes | `npm run test` | ✅ **240 de 240 passando**, em 14 arquivos |
| Cobertura | `npm run test:coverage` | ✅ **Passa nos quatro limites.** Linhas e statements **79,03%** (limite 60), funções **63,38%** (limite 60), branches **88,80%** (limite 55). Por pasta: `domain` 81,73% de linhas e 76,41% de funções, `services` 100%, `services/http` 60,59% de linhas e 22,85% de funções |
| Build | `npm run build` | ✅ **Sem erro** — `tsc -b` + `vite build`, 410 módulos |
| Orçamento de pacote | `npm run check:size` | ✅ **234,00 KB gzip de 250**. CSS 5,02 de 40. Maior chunk 106,58 de 130 |
| E2E | `npm run test:e2e` | ✅ **6 casos, 6 verdes**, contra o build de produção em 390×844. Primeira execução do projeto — reprovou 6 de 6 e expôs três divergências do teste e uma do comportamento esperado |

> **Estes números são de um dia de trabalho em paralelo, e se moveram muito.** No meio da
> construção do CP5 havia 157 testes e a cobertura de linhas estava em **54,54%**,
> reprovando o limite, e 26 arquivos fora do padrão do Prettier; ao fim do dia, **293
> testes, 83,59% de linhas e formatação limpa**. Os valores da tabela são os do **estado
> final** medido. Para reconferir:
> `cd app && npm run test:coverage && npm run test:e2e && npm run format:check`.

### O pipeline está verde, e o item que faltava desde o CP4 foi fechado

**Todos os passos do [`ci.yml`](../.github/workflows/ci.yml) passam:** validação de
documentação, verificação do manifest do PWA, lint, escala de espaçamento, formatação,
cobertura, build, orçamento de pacote — e agora **E2E**, em job próprio.

O E2E era o único item da lista nunca executado, e a primeira execução reprovou 6 de 6. As
causas estão detalhadas em [`13-roadmap-cp5-cp6.md` §6.1](13-roadmap-cp5-cp6.md); o resumo
é que "escrito e configurado" não era evidência de nada. Com o job no CI, a execução deixa
de depender da máquina de alguém. O **critério de saída 8** do
[`03-escopo.md`](03-escopo.md#9-critérios-de-saída-de-cada-checkpoint) está atendido.

O parágrafo abaixo registra o estado anterior, que era este:

> O `ci.yml` não rodava o E2E, então isso não deixava o CI vermelho; deixava o critério de
> saída em aberto pelo
segundo checkpoint seguido, o que é pior por ser repetido.

Correção: `npx playwright install chromium && npm run test:e2e`, dentro de `app/`.

### Onde a cobertura ainda é fina, mesmo passando

O limite passou, mas passar o limite não é o mesmo que estar coberto. Estes são os módulos
em que o teste ainda falta, em ordem de importância:

| Módulo | Linhas | Funções | O que fica sem prova |
|---|---|---|---|
| `domain/permissions.ts` | 18,18% | **0%** | RN-024, a matriz de permissões inteira. **12 funções exportadas, nenhuma coberta.** São funções puras de decisão booleana — o tipo mais barato de testar que existe |
| `domain/eventSchema.ts` | **0%** | **0%** | RN-011 pelo formulário de criação de evento |
| `services/http/index.ts` | 60,59% | 22,85% | Os caminhos de erro da camada de transporte |
| `domain/deadlines.ts` | 35,8% | 57,14% | `validateDeadlines` e `defaultDeadlines` (RN-011) |
| `domain/format.ts` | 54,92% | 37,5% | Formatação de data e de vagas para a UI |

### O que a cobertura conta sobre o CP5

Duas coisas que valem mais que o número final.

**O limite reprovou de verdade, e por isso serviu.** No meio da sprint, com as telas e os
módulos novos escritos antes dos testes, a cobertura caiu para 54,54% e o build passou a
falhar. Foi visto, e vieram `auth.test.ts`, `pix.test.ts`, `ticketToken.test.ts` e
`checkin.test.ts`. Métrica que nunca reprova é enfeite.

**O módulo de check-in saiu de 3,7% para 99,07%, e trouxe um defeito com ele.**
`domain/checkin.ts` era a maior lacuna do CP5 — `decideCheckIn` decide se um ingresso entra
na porta do evento, sustenta **RNF-011** (`Must` de segurança) e não tinha um único teste.
Hoje tem **99,07% de linhas e 100% de funções**, com as 7 condições, a ordem entre elas e a
mensagem de cada status testadas. E escrever esse teste expôs um defeito de ordem: a
segunda leitura do mesmo QR devolvia `NAO_CONFIRMADA` em vez de `JA_UTILIZADO` com o
horário do primeiro check-in. Foi corrigido, com teste de regressão nomeado. Ver
[`02-requisitos.md` §1.2](02-requisitos.md#o-caso-em-que-o-código-cedeu-e-não-o-requisito).

**A ressalva de fundo sobre RNF-011 continua.** Passar as duas medições do "como medir" não
torna RNF-011 cumprido no CP5.
[ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md) declara que a assinatura do token
é calculada **no cliente** e **não é controle de segurança** — o teste prova a integridade
da forma do token, não a impossibilidade de forjá-lo. Isso é do CP6, e está dito assim em
[`02-requisitos.md`](02-requisitos.md#quadro-resumo-dos-22-rnf) em vez de marcado como
resolvido.

---

## 4. Checklist operacional de submissão

Na ordem em que deve ser executado. Os itens marcados com 🔧 são de código e podem ser
feitos por qualquer integrante; os marcados com 👤 dependem de pessoa e não de comando.

### Antes de qualquer outra coisa

- [ ] 🔧 `cd app && npx playwright install chromium && npm run test:e2e` — a **única**
      pendência técnica aberta, e a única que atravessou o CP4 inteiro sem andar
- [ ] 🔧 `npm run lint && npm run format:check && npm run test:coverage && npm run build`
      — reconfirmar o pipeline verde imediatamente antes de gravar o vídeo, porque os
      números desta página se moveram várias vezes durante a sprint

### Ganho fácil de qualidade, se houver tempo

- [ ] 🔧 Escrever `packages/shared/src/domain/permissions.test.ts` — 12 funções puras exportadas com **0%**
      de cobertura. RN-024 é a regra com mais superfície e menos prova do projeto, e são
      funções de decisão booleana: o tipo mais barato de testar que existe
- [ ] 🔧 Escrever teste para `src/domain/eventSchema.ts` (0% hoje) — é o que valida o
      formulário de criação de evento contra RN-011

### Conferência final

- [ ] 🔧 `node scripts/validate-docs.mjs` — sem falha
- [ ] 🔧 `node scripts/render-diagrams.mjs --check` — todos os blocos renderizam
- [ ] 🔧 `cd app && npm ci && npm run lint && npm run check:scale && npm run format:check`
- [ ] 🔧 `npm run test:coverage && npm run build && npm run check:size`
- [ ] 🔧 Conferir que o Pages publicou a versão nova (aba Actions → `deploy-pages`)
- [ ] 👤 Abrir o link público em um celular de verdade e percorrer o fluxo do aluno

### Trello

- [ ] 👤 Mover para **Done** os cards da Sprint 2 que foram concluídos
- [ ] 👤 Mover de volta ao Backlog, com comentário, os cards do que escorregou para o CP6
      (RF-001, e a escrita de RF-006 e RF-012)
- [ ] 👤 Criar os cards do que o CP5 descobriu: teste de `checkin.ts`/`ticketToken.ts`,
      teste de `permissions.ts` e a correção de RN-019 nos dois endpoints do feed
- [ ] 👤 Comentar em pelo menos 5 cards com o link do commit ou do PR
- [ ] 👤 Salvar o print do quadro **em uso** em `docs/09-trello/evidencia.png`

### Vídeo

- [ ] 👤 Executar o preparo obrigatório da demo descrito em
      [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md)
- [ ] 👤 Ensaiar cada bloco cronometrado antes de gravar
- [ ] 👤 Gravar bloco por bloco, não em uma tomada
- [ ] 👤 Confirmar que os **6 integrantes** aparecem
- [ ] 👤 Subir como link não listado e colar a URL no README e neste checklist

### Submissão

- [ ] 👤 Colar os dois links pendentes no texto da seção 5 e enviar no Teams

---

## 5. O que entregar no Teams

Preencha os dois links marcados com `⟨…⟩` e envie. **Antes de enviar**, confirme que os
números da seção "Estado das verificações" abaixo continuam verdadeiros — se o CI foi
consertado, atualize-os; se não foi, deixe-os como estão. Número errado a favor do grupo é
pior que número honesto contra.

```
Checkpoint 5 — Campus (app de eventos universitários)
Engenharia de Software · Engenharia de Computação, 3º ano · Prof. Hercules Ramos

Equipe
  Ana Luiza Dourado      RM558793  UX/UI Designer
  João Viviani Baldini   RM558596  Product Owner
  Lucas Baraldi          RM555407  Tech Lead / Arquiteto
  Lucas Zolla            RM557952  Analista de Requisitos
  Ronaldo Veloso Filho   RM556445  Modelagem / Analista UML
  Vitor Pantarotto       RM554961  Scrum Master / QA

Entregas
  Repositório .......... https://github.com/lukiin-z/campus
  App rodando .......... https://lukiin-z.github.io/campus/
  Ambiente de teste .... https://github.com/lukiin-z/campus/blob/main/docs/18-ambiente-de-teste.md
  Documentação ......... https://github.com/lukiin-z/campus/blob/main/docs/README.md
  Styleguide da marca .. https://lukiin-z.github.io/campus/styleguide/
  Figma ................ https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp
  Trello ............... ⟨colar o link do quadro⟩
  Vídeo (2 min) ........ ⟨colar o link não listado⟩

Onde encontrar cada critério
  Funcionalidade do protótipo (30%) .. app/ e docs/02-requisitos.md §1.1
                                       25 dos 43 RF completos e 3 parciais, com o
                                       endpoint, a função de domínio e o teste de cada um.
                                       293 testes e 6 casos E2E passando, incluindo 50
                                       inscricoes concorrentes na ultima vaga que
                                       confirmam exatamente uma
  Ambiente de teste (20%) ............ docs/18-ambiente-de-teste.md
                                       link público, 3 comandos para rodar local,
                                       usuários de teste do seed e roteiro por fluxo
  Documentação atualizada (20%) ...... docs/02, docs/03, docs/04 e docs/17-jornada.md
                                       histórico de revisões em cada documento; 43 RF com
                                       status lido do código; 22 RNF com valor medido ou
                                       "não medido"; 29 regras de negócio rastreadas até
                                       arquivo, função e teste
  Diagramas UML atualizados (15%) .... docs/05-modelagem/
                                       diagramas conferidos contra o código do CP5,
                                       validados por scripts/render-diagrams.mjs
  Qualidade da demo (15%) ............ docs/20-video-cp5-roteiro.md e os slides
                                       roteiro de 2 min cronometrado, escalação dos 6,
                                       preparo da demo e plano B por fluxo

Como o CP5 foi construído
  O contrato veio primeiro: os endpoints da API simulada, as interfaces dos repositórios e
  as funções de domínio foram definidos antes das telas, o que permitiu construir as telas
  em paralelo sem conflito. Nenhuma tela conhece a origem dos dados — é regra de lint, não
  de boa vontade, e é o que faz a troca do mock pela API real no CP6 mudar só quem responde
  ao HTTP. O registro dessa evolução está em docs/17-jornada.md.

O que mudou de escopo, e por quê
  Sete requisitos que estavam no CP6 entraram no CP5 (pagamento simulado, check-in, escrita
  no feed e central de notificações) porque a demonstração ao vivo precisa deles. Três que
  estavam no CP5 foram para o CP6 (cadastro de conta, edição de perfil e publicação de
  rascunho): são operações de escrita que não aparecem na demonstração, e ficaram por
  último. A troca está declarada item por item em docs/03-escopo.md §8.1.

Pendências declaradas
  O teste E2E do Playwright continua escrito e não executado: o navegador nunca foi
  instalado nesta máquina. É a única pendência que atravessou dois checkpoints sem andar.
  Duas coberturas seguem finas, e estão nomeadas: domain/permissions.ts tem 12 funções
  exportadas e nenhuma coberta por teste, e domain/eventSchema.ts está em 0% — o limite
  global de 60% passa (79,03% de linhas, 63,38% de funções), mas esses dois módulos não
  têm prova própria. Vale registrar que o limite REPROVOU de verdade no meio da sprint,
  com 54,54%: as telas entraram antes dos testes, o build falhou, e os testes vieram
  depois. Tudo está em docs/19-checklist-entrega-cp5.md com o número medido e a correção.

O que a conferência de documentação encontrou
  Conferir os 43 requisitos e as 29 regras de negócio contra o código expôs três coisas
  que já foram corrigidas: um defeito de ORDEM no check-in, que fazia a segunda leitura do
  mesmo QR responder "não confirmada" em vez de "ingresso já utilizado às 20h14" — o
  requisito estava certo e o código foi corrigido, com teste de regressão; quatro arquivos
  citados pela documentação do CP4 que nunca existiram; e uma contradição ativa sobre quem
  pode publicar no feed, em que dois endpoints aplicam critérios diferentes da regra
  escrita. Os três achados estão em docs/02-requisitos.md e docs/04-regras-de-negocio.md.
```

---

## 6. O que ainda depende de ação humana

Nada nesta seção pode ser feito por comando. Em ordem de risco para a nota.

| # | Ação | Por que depende de pessoa | Risco se não for feito |
|---|---|---|---|
| 1 | **Gravar o vídeo de 2 minutos** | Precisa de 6 pessoas falando e de tela sendo compartilhada | Perde os 15% do critério de demo inteiros |
| 2 | **Criar e usar o quadro do Trello** | O critério fala em uso real: mover cards, comentar link de PR | Já era pendência no CP4; repetir a omissão é pior que tê-la |
| 3 | **Instalar o navegador do Playwright e rodar o E2E** | Um comando, mas exige rede e permissão de instalação | Critério de saída 8 continua `⚠️` pelo **segundo checkpoint seguido** |
| 4 | **Escrever teste para `permissions.ts`** | É código, mas ninguém decide sozinho **quais** casos importam sem ler RN-024 | RN-024 segue sendo a regra com mais superfície e menos prova do projeto |
| 5 | **Decidir a correção de RN-019** | É decisão de produto, não de código: quem pode publicar no feed? | Um aluno em `LISTA_ESPERA`, que nunca teve vaga, publica por requisição direta |
| 6 | **Validação com 5 alunos reais (RNF-005)** | Precisa de 5 pessoas e de 15 minutos cada | RNF-001 e RNF-005 seguem "não medido"; perde a chance de achado real de usabilidade |
| 7 | **Verificar os 6 breakpoints de RNF-018** | Não há teste de layout; é olhar tela | Quebra de layout na correção, em critério que vale 30% |
| 8 | **Preencher os dois links no texto do Teams** | Trello e vídeo só existem depois dos itens 1 e 2 | Entrega sem link é entrega incompleta |

---

## 7. Conferência final, para rodar antes de enviar

```bash
# Documentação: links, âncoras, blocos Mermaid e SVGs
node scripts/validate-docs.mjs

# Diagramas: valida a sintaxe de todos os blocos Mermaid renderizando cada um
node scripts/render-diagrams.mjs --check

# Aplicação
cd app
npm ci
npm run lint
npm run check:scale
npm run format:check
npm run test:coverage
npm run build
npm run check:size
npx playwright install chromium
npm run test:e2e
```

O resultado medido de cada um destes comandos em 2026-09-02 está na
[seção 3](#3-estado-real-das-verificações). Dois reprovam, e a correção de cada um está
dita ali.
