# Escopo

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Versão inicial: objetivo da v1, 14 itens dentro e 8 recusas resumidas, MVP por MoSCoW (28 `Must` / 11 `Should` / 4 `Could`), 7 premissas, 7 restrições, 6 dependências, marcos CP4 → CP5 → CP6 e 10 critérios de saída |
| 1.1 | 2026-09-02 | CP5 | Acrescentada a seção [8.1 O que o CP5 fechou e o que escorregou](#81-o-que-o-cp5-fechou-e-o-que-escorregou-para-o-cp6), com a troca de escopo que de fato aconteceu. Os marcos do CP5 foram reescritos com o entregue, não com o planejado. **A distribuição MoSCoW não mudou** — nenhum requisito trocou de faixa; o que mudou foi o checkpoint de 10 deles, e a tabela de distribuição foi recalculada por isso. A coluna CP5 dos 10 critérios de saída foi substituída pelo **estado medido**: 9 atendidos e 1 (o E2E) pendente pelo segundo checkpoint. O critério 9 (cobertura) chegou a reprovar em 54,54% no meio da sprint e voltou a passar — o registro dessa oscilação ficou, porque é o que prova que a métrica está sendo medida |

Delimitação do que o **Campus** entrega no semestre. Este documento é o contrato entre o
que foi levantado em [`02-requisitos.md`](02-requisitos.md) e o que o time de 6 pessoas
consegue construir em 3 sprints sem orçamento.

**Responsável:** João Viviani Baldini (PO) · **Aprovação:** Lucas Zolla (Requisitos)

## 1. Objetivo do produto na v1

Provar, com um app funcionando, que **alcance segmentado pela estrutura acadêmica**
(turma → curso → faculdade) resolve simultaneamente três dores que hoje exigem três
ferramentas: divulgação com o público certo, controle de vagas com fila, e cobrança com
registro.

Critério de sucesso da v1 (premissa do grupo, verificável no CP6): um organizador cria
um evento de turma com cobrança, 100% dos inscritos são da turma, a fila de espera
promove sozinha ao menos uma vaga liberada, e o check-in por QR admite cada ingresso
uma única vez.

## 2. In scope — o que entra na v1

| # | Item | Por que entra | Requisitos |
|---|---|---|---|
| 1 | Conta com e-mail institucional e verificação de domínio | É o que garante que quem está lá é aluno. Sem isso, o alcance segmentado não tem base de confiança | RF-001, RF-002, RF-003 |
| 2 | Vínculo acadêmico: faculdade → curso → turma por código de convite | É a espinha dorsal do produto: sem vínculo, não há alcance | RF-005, RF-008 |
| 3 | Criação de evento com alcance turma / curso / faculdade | O diferencial declarado na proposta de valor | RF-010, RF-011, RF-012 |
| 4 | Visibilidade por alcance, aplicada em lista, detalhe e feed | Regra de negócio central. Se falhar, o produto perde a razão de existir | RF-015, RF-016, RF-036 |
| 5 | Inscrição com controle de capacidade sem estouro | A dor mais citada pelo organizador | RF-019, RF-020, RF-022, RF-023 |
| 6 | Lista de espera FIFO com promoção automática e janela de confirmação | Resolve a "vaga que evapora" — nenhuma alternativa atual faz isso | RF-024 a RF-027 |
| 7 | Cancelamento de inscrição com liberação de vaga | Sem isso a fila nunca é acionada e o item 6 fica decorativo | RF-021 |
| 8 | Pagamento por Pix e cartão via gateway, com confirmação por notificação | Separa o dinheiro do evento da conta pessoal do organizador | RF-028 a RF-032 |
| 9 | Ingresso com QR Code e check-in de uso único | Resolve porta travada e mede comparecimento real | RF-033, RF-034, RF-035 |
| 10 | Feed social por evento, com foto e comentário | É a "memória do evento" — o quarto problema do briefing | RF-036, RF-037, RF-038 |
| 11 | Notificações do que muda a decisão do aluno | Sem notificação, alcance segmentado não vira presença | RF-039, RF-040 |
| 12 | Perfil com participações por estado e configuração de privacidade | Onde o aluno encontra o próprio ingresso e controla exposição | RF-006, RF-007, RF-009 |
| 13 | Aprovação de evento de alcance faculdade e moderação do feed | Alcance amplo sem freio é vetor de abuso | RF-041, RF-042 |
| 14 | Design system implementado com tokens e acessibilidade AA | Requisito de avaliação (identidade visual, peso 20%) e base do CP5 | RNF-002 a RNF-004 |

## 3. Out of scope — o que **não** entra na v1

Cada recusa tem motivo. O catálogo completo, com IDs `RFX-xx`, está na seção 4 de
[`02-requisitos.md`](02-requisitos.md). Resumo dos oito descartes mais pedidos:

| Item | Justificativa da recusa |
|---|---|
| Chat / mensagem direta | Substituiria o WhatsApp no que ele faz bem e traria moderação de conversa privada — outro produto, outro risco de LGPD |
| Stories efêmeros | Contraria o valor "memória do evento": o produto existe justamente porque story expira |
| Login social (Google / Apple) | Reintroduz o problema que RF-002 resolve — a garantia de vínculo institucional vem do domínio do e-mail |
| Múltiplas faculdades | Exige multi-tenant e federação de identidade; custo alto, valor zero para a banca |
| App nativo publicado em loja | Conta de desenvolvedor, custo e prazo de revisão incompatíveis com o semestre. Ver [ADR-0001](adr/0001-react-vite-em-vez-de-react-native.md) |
| Nota fiscal e repasse bancário ao organizador | Exige CNPJ e contrato com adquirente |
| Recomendação algorítmica de eventos | Sem volume de dados, recomendação é aleatoriedade disfarçada |
| Painel de BI | O organizador precisa de quatro números, não de um dashboard |

## 4. MVP por MoSCoW

Priorização feita pelo PO com o Analista de Requisitos, aplicada sobre os 43 RFs.

### Must — sem isso não existe produto (28 RFs)

O núcleo indivisível: **entrar (com vínculo) → ver o que é meu → reservar vaga → pagar
→ entrar no evento**.

`RF-001` `RF-002` `RF-003` `RF-005` `RF-006` `RF-007` `RF-010` `RF-011` `RF-013`
`RF-014` `RF-015` `RF-016` `RF-019` `RF-020` `RF-021` `RF-022` `RF-023` `RF-024`
`RF-025` `RF-026` `RF-028` `RF-029` `RF-030` `RF-033` `RF-034` `RF-036` `RF-037`
`RF-039`

> Teste do Must: se removido, algum dos três atores fica impedido de concluir seu
> objetivo principal. Exemplo — sem RF-025 (promoção FIFO), a lista de espera existe mas
> não funciona, e o organizador volta a preencher vaga na mão.

### Should — importante, mas há contorno (11 RFs)

Melhora significativamente a experiência; ausência dói mas não bloqueia.

`RF-004` `RF-008` `RF-009` `RF-012` `RF-027` `RF-031` `RF-032` `RF-035` `RF-040`
`RF-041` `RF-042`

> Contorno documentado, por exemplo: sem RF-035 (lista de presença), o organizador
> conta cabeça na porta — funciona, mas perde o dado histórico.

### Could — desejável se sobrar tempo (4 RFs)

`RF-017` (perguntas customizadas) · `RF-018` (duplicar evento) · `RF-038`
(comentários) · `RF-043` (gerenciar turmas do curso)

### Won't — declarado fora, para não voltar em reunião

Os 12 itens `RFX-01` a `RFX-12` de [`02-requisitos.md`](02-requisitos.md#4-requisitos-explicitamente-fora-de-escopo).

### Distribuição

Recalculada em **2026-09-02**. As faixas MoSCoW **não mudaram** — nenhum requisito subiu
ou desceu de prioridade. O que mudou é a coluna "onde é entregue", porque 10 requisitos
trocaram de checkpoint (ver [8.1](#81-o-que-o-cp5-fechou-e-o-que-escorregou-para-o-cp6)).

| Prioridade | Qtd. | % dos RFs | Planejado no CP4 | Recalculado no CP5 |
|---|---|---|---|---|
| Must | 28 | 65% | CP5 (19) + CP6 (9) | CP5 (21) + CP6 (7) |
| Should | 11 | 26% | CP5 (2) + CP6 (9) | CP5 (3) + CP6 (8) |
| Could | 4 | 9% | CP6, se houver folga | CP5 (1) + CP6 (3) |
| Won't | 12 itens `RFX` | — | não entregue | não entregue |
| **Total entregue** | **43** | 100% | CP5 (21) + CP6 (22) | **CP5 (25) + CP6 (18)** |

O `Could` que entrou no CP5 é RF-038 (comentários no feed): a escrita no feed foi
construída de uma vez, e comentar custou pouco depois de publicar já existir. É folga
aproveitada, não escopo crescendo — nenhum `Must` saiu para ele entrar.

Os três requisitos que escorregaram do CP5 para o CP6 são dois `Must` — **RF-001**
(cadastro de conta) e a metade de escrita de **RF-006** (editar perfil) — e um `Should`, a
metade de "publicar depois" de **RF-012**. Os três pelo mesmo motivo: falta endpoint de
escrita. Ver
[`02-requisitos.md` §1.1](02-requisitos.md#11-status-de-implementação-no-cp5) para o
estado requisito por requisito, com a evidência de cada um.

## 5. Premissas

| # | Premissa | Consequência se não se confirmar |
|---|---|---|
| P-01 | A equipe permanece com 6 integrantes ativos até o CP6 | Escopo `Should` sai primeiro; ver risco R-03 em [`12-riscos.md`](12-riscos.md) |
| P-02 | Não há orçamento: só ferramentas gratuitas (GitHub, GitHub Pages, Figma free, Trello free) | Sem servidor pago no CP6 → persistência em serviço de nível gratuito |
| P-03 | Existe gateway de pagamento com Pix em ambiente de teste (sandbox) e sem custo | RF-028 a RF-031 ficam simulados; o contrato da interface de pagamento continua válido |
| P-04 | A instituição usa domínio de e-mail padronizado para alunos | RF-002 perde eficácia; alternativa é convite manual por turma |
| P-05 | Uma faculdade, com 3 cursos e 4 turmas, é amostra suficiente para demonstrar o alcance | Se a banca pedir multi-instituição, é escopo novo, não ajuste |
| P-06 | O grupo dedica entre 6 e 10 horas-pessoa por semana ao projeto (premissa do grupo) | Base do cálculo de capacidade das sprints |
| P-07 | O protótipo estático existente é a referência visual válida, aprovada pelo grupo | Redesenho completo custaria uma sprint inteira |

## 6. Restrições

| Tipo | Restrição | Efeito no projeto |
|---|---|---|
| Prazo | Três checkpoints dentro de um semestre, com datas fixas pela disciplina | Escopo é a variável de ajuste — nunca a qualidade da entrega documentada |
| Equipe | 6 pessoas, todas em papéis acumulados (ninguém é dedicado) | Cada artefato tem um responsável único; revisão é cruzada, não coletiva |
| Orçamento | Zero | Sem serviço pago: sem domínio próprio, sem servidor dedicado, sem conta de loja de app |
| Técnica | Não podemos publicar em App Store / Play Store no semestre | Entrega web mobile-first, PWA instalável no CP6. Ver [ADR-0001](adr/0001-react-vite-em-vez-de-react-native.md) |
| Técnica | Sem backend próprio no CP5 | Camada de repositório com mock + MSW, trocável por API real. Ver [ADR-0003](adr/0003-camada-de-repositorio-com-msw.md) |
| Legal | LGPD aplicável a dado de aluno | Minimização obrigatória (RNF-020) e dado de cartão nunca no nosso banco (RNF-022) |
| Institucional | Não temos acesso ao sistema acadêmico da instituição | Turma por código de convite, não por importação |

## 7. Dependências

| # | Dependência | De quem depende | Plano B |
|---|---|---|---|
| D-01 | Domínio de e-mail institucional confirmado | Instituição | Lista de convite por turma, mantida pelo representante |
| D-02 | Sandbox de gateway com Pix | Provedor de pagamento | Gateway simulado próprio atrás da mesma interface (`PaymentGateway`) |
| D-03 | Conta gratuita do Figma com espaço para o arquivo do projeto | Figma | Styleguide HTML em [`06-marca/styleguide.html`](06-marca/styleguide.html) como prova visual equivalente |
| D-04 | GitHub Pages habilitado no repositório | Configuração do repo (Settings → Pages) | Entrega por `npm run preview` local, gravada em vídeo |
| D-05 | Quadro do Trello criado a partir do pacote de importação | Um integrante executar [`09-trello/criar-quadro.md`](09-trello/criar-quadro.md) | CSV importado no Notion ou Jira — mesmo conteúdo |
| D-06 | Aparelho com câmera para leitura de QR no check-in | Organizador | Fallback por código numérico de 8 dígitos (exceção prevista em UC-005) |

## 8. Marcos: CP4 → CP5 → CP6

Datas são **premissa do grupo**, alinhadas ao calendário da disciplina; ajustar no
Trello se o cronograma oficial divergir.

### CP4 — Concepção, documentação e base técnica

**Sprint 1 · 18/08/2026 a 05/09/2026 · entrega 08/09/2026**

| Entrega | Artefato | Responsável |
|---|---|---|
| Documentação inicial completa (problema, personas, RF/RNF, escopo, regras) | [`01`](01-problema-e-personas.md), [`02`](02-requisitos.md), [`03`](03-escopo.md), [`04`](04-regras-de-negocio.md) | Lucas Zolla |
| Modelagem UML: 7 diagramas + especificações de caso de uso + dicionário de dados | [`05-modelagem/`](05-modelagem/README.md) | Ronaldo Veloso Filho |
| Marca: logo, paleta, tipografia, design system, styleguide | [`06-marca/`](06-marca/identidade-visual.md) | Ana Luiza Dourado |
| Arquivo Figma com Foundations, Components, 8 telas e protótipo navegável | [`06-marca/guia-figma.md`](06-marca/guia-figma.md) | Ana Luiza Dourado |
| Pitch de 1 minuto, one-liner, proposta de valor, comparativo | [`07-pitch.md`](07-pitch.md) | João Viviani Baldini |
| Quadro do Trello com 3 sprints e 32 cards distribuídos | [`09-trello/`](09-trello/quadro.md) | Vitor Pantarotto |
| Repositório organizado: README, estrutura, CI verde, Pages publicado | raiz + [`.github/workflows`](../.github/workflows) | Lucas Baraldi |
| Base do app React com tokens, rotas, mocks e testes | [`app/`](../app/) | Lucas Baraldi |
| Roteiro e slides do vídeo de 2 minutos | [`15-video-roteiro.md`](15-video-roteiro.md) | João Viviani Baldini |

**Não entra no CP4:** nenhuma funcionalidade com persistência real, nenhum pagamento
real, nenhuma notificação real.

### CP5 — Protótipo funcional com dados mockados

**Sprint 2 · 08/09/2026 a 03/10/2026 · entrega 06/10/2026**

Coluna "estado" preenchida em **2026-09-02**, com o que foi verificado — não com o que foi
planejado.

| Entrega | Detalhe | Estado em 2026-09-02 |
|---|---|---|
| ~~21 RFs~~ **25 RFs** — 21 `Must`, 3 `Should` e 1 `Could` — funcionando com dados mockados | Autenticação, onboarding, feed, lista, detalhe, criação, inscrição, cancelamento, lista de espera, ingresso com QR, **pagamento simulado, check-in, escrita no feed e central de notificações** | ✅ 25 completos + 3 parciais, com evidência por requisito em [`02-requisitos.md` §1.1](02-requisitos.md#11-status-de-implementação-no-cp5) |
| Ambiente de teste acessível por link | GitHub Pages com o app buildado (`/campus/`) | Ver [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) |
| Diagramas de sequência e atividades atualizados conforme o implementado | Divergência entre diagrama e código é defeito, não detalhe | Responsabilidade da lane de UML |
| Testes: ≥ 8 unitários e 1 E2E do fluxo de inscrição | RNF-015 com limite de cobertura no CI | ✅ **293 testes unitários e de integração** em 17 arquivos (muito acima dos 8) **e 6 casos E2E executados** — o Chromium foi instalado e a suíte roda contra o build de produção. A pendência herdada do CP4 está fechada, e o E2E entrou no `ci.yml` como job próprio para não voltar a depender de máquina |
| Cobertura de domínio ≥ 60% (RNF-015) | Limite configurado em `vite.config.ts`, falha o build | ✅ **Linhas 79,03%, funções 63,38%, branches 88,80% — passa nos quatro limites.** Reprovou de verdade no meio da sprint (54,54%) e voltou a passar com os testes de `auth`, `pix`, `ticketToken` e `checkin`. Onde ainda falta prova: `permissions.ts` (0% de funções) e `eventSchema.ts` (0%) |
| Validação com 5 alunos reais | RNF-005; resultado alimenta o backlog da Sprint 3 | ⬜ Não realizada — depende de ação humana |
| Demonstração ao vivo do fluxo completo | Roteiro de demo definido na planning da Sprint 2 | Ver [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md) |

#### 8.1 O que o CP5 fechou e o que escorregou para o CP6

O CP5 **não** entregou o plano mais um extra: ele **trocou** parte do plano. Sete
requisitos que estavam no CP6 entraram, três que estavam no CP5 saíram. O resultado é 25
requisitos completos em vez de 21 — mas com uma composição diferente da planejada, e a
diferença tem uma explicação só.

**Entraram no CP5 (estavam no CP6) — 7 requisitos**

| RF | O que é | Por que entrou |
|---|---|---|
| RF-028, RF-029 | Iniciar pagamento e confirmar por notificação do gateway | A demonstração ao vivo perde o sentido sem dinheiro: "separa o dinheiro do evento da conta pessoal do organizador" é a proposta de valor, e um protótipo que não cobra não a mostra. O gateway simulado ([ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md)) tornou isso possível sem sandbox externo — a dependência D-02 deixou de bloquear |
| RF-034, RF-035 | Validar check-in e painel de presença | O ingresso com QR (RF-033) já estava no CP5, e ingresso que ninguém valida é figura decorativa. Entregar a leitura junto custou pouco depois de o token existir |
| RF-037, RF-038 | Publicar foto e comentar no feed | O feed de leitura (RF-036) já estava no CP5. Sem escrita, o feed exibe só o que o seed plantou — e "memória do evento" não é demonstrável com dado de fábrica |
| RF-040 | Central de notificações | A promoção da lista de espera (RF-025) já emitia notificação no CP5. Emitir sem ter onde ler é notificação que não existe |

**Saíram do CP5 (foram para o CP6) — 3 requisitos, todos pelo mesmo motivo**

| RF | O que ficou de fora | Por quê |
|---|---|---|
| RF-001 | Cadastro de conta, inteiro | Não existe endpoint de criação de conta. A demonstração entra com os usuários do seed, o que basta para exercitar todos os outros fluxos — mas não é cadastro, e chamar de cadastro seria mentir no documento |
| RF-006 | A metade de **escrita** (editar o perfil) | Não existe endpoint de escrita de perfil. A leitura está entregue e verificável |
| RF-012 | A metade de **publicar depois** o rascunho | Salvar como rascunho funciona e o isolamento do rascunho é testado; não existe endpoint que mude o status para `PUBLICADO` |

**A explicação é uma só, e vale registrar como aprendizado de escopo.** Os três casos que
saíram são operações de **escrita sobre entidade que já existe** — criar conta, alterar
perfil, alterar status de evento. Os sete que entraram são fluxos **de ponta a ponta**, com
tela, regra e endpoint próprios. A lane que construiu a API simulada priorizou o que a
banca vê funcionando ao vivo, e o que ficou para trás foi justamente o que **não aparece na
demonstração**: ninguém demonstra "editar o próprio nome". A consequência para a Sprint 3 é
concreta — os endpoints de escrita adiados são pequenos e parecidos entre si, e convém
fazê-los em um bloco só, em vez de espalhados por três frentes.

**O que não escorregou e merece nota:** as quatro garantias que sustentam o produto ficaram
prontas **e cobertas por teste** — alcance verificado no servidor (RNF-012), reserva de
vaga atômica sob 50 requisições concorrentes (RNF-013), idempotência da notificação de
pagamento (RNF-014) e a fronteira de camadas que permite trocar o mock pela API real
(RNF-016). São as quatro que, se falhassem, não teriam correção barata no CP6.

### CP6 — Persistência, integração e entrega final

**Sprint 3 · 06/10/2026 a 07/11/2026 · entrega 10/11/2026**

Reescrito em 2026-09-02 para refletir o que o CP5 deixou de fato para trás — e não a
divisão planejada no CP4, que o CP5 mudou.

| Entrega | Detalhe |
|---|---|
| API real com persistência substituindo o mock | Só troca a implementação dos repositórios (RNF-016), verificada por regra de lint |
| **Endpoints de escrita adiados, em um bloco** | Cadastro de conta (RF-001), recuperação de acesso (RF-004), edição de perfil (RF-006), publicação de rascunho e edição de evento (RF-012, RF-013), troca de turma (RF-008), privacidade (RF-009) |
| **Rotinas de tempo** — o que o CP5 não pôde ter sem servidor | Expirar oferta da lista de espera (RF-026), expirar reserva não paga (RF-030) e marcar `AUSENTE` (RN-018). Nenhum código do CP5 escreve os estados `EXPIRADA` ou `AUSENTE`: eles exigem relógio no servidor |
| Pagamento em sandbox de verdade, substituindo o simulador | RF-031 (reembolso) e RF-032 (recebimentos) são novos; RF-028 e RF-029 já funcionam simulados no CP5 e passam a falar com o gateway real (RNF-014 já coberto por teste) |
| Cancelamento de evento com a cascata de participações | RF-014, RN-021 e RN-022 — hoje sem nenhuma implementação |
| Testes do que o CP5 entregou sem cobrir | `domain/checkin.ts`, `domain/ticketToken.ts` e `domain/permissions.ts` estão implementados e sem teste, o que mantém RNF-011 e RNF-015 em dívida. É pré-requisito, não melhoria |
| Moderação e aprovação de evento de faculdade | RF-041, RF-042 — as funções `canApproveCollegeEvent` e `canRemovePost` já existem, sem endpoint que as chame |
| Perguntas customizadas, duplicar evento e gestão de turmas | RF-017, RF-018, RF-043 — os três `Could` restantes |
| Build instalável (PWA) e manual de uso | Substitui a publicação em loja (RFX-05) |
| Registro da jornada do projeto | Retrospectivas, decisões (ADRs) e métricas das 3 sprints |

Detalhamento tarefa por tarefa em [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md).

## 9. Critérios de saída de cada checkpoint

Um checkpoint só é considerado entregue quando **todos** os itens abaixo são verdadeiros.
As colunas CP4 e CP6 dizem se o critério **se aplica** àquele checkpoint. A coluna CP5 foi
substituída pelo **estado medido em 2026-09-02** — critério de saída que não é verificado
não é critério.

| # | Critério | CP4 | CP5 — estado em 2026-09-02 | CP6 |
|---|---|---|---|---|
| 1 | `npm run lint`, `npm run test` e `npm run build` verdes no CI | ✅ | ✅ **Atendido — o pipeline inteiro passa.** `lint` 0 erro/0 aviso, `format:check` limpo, `test` 240/240, `test:coverage` nos quatro limites, `build` sem erro, `check:scale` 478 utilitários, `check:size` 232,97/250 KB | ✅ |
| 2 | Todo link relativo da documentação aponta para arquivo existente (`node scripts/validate-docs.mjs`) | ✅ | ✅ **885 links resolvidos, sem falha** — ver [`19-checklist-entrega-cp5.md`](19-checklist-entrega-cp5.md#3-estado-real-das-verificações) | ✅ |
| 3 | Todo bloco Mermaid renderiza sem erro | ✅ | ✅ **24 blocos, todos fechados** pelo validador; sintaxe por `render-diagrams.mjs --check` | ✅ |
| 4 | Diagramas coerentes com o código entregue | ✅ | Responsabilidade da lane de UML | ✅ |
| 5 | Quadro do Trello refletindo o estado real dos cards | ✅ | ⬜ Depende de ação humana | ✅ |
| 6 | Link público acessível (Pages) | ✅ | `npm run build` gera o `dist` sem erro; publicação por `deploy-pages.yml` | ✅ |
| 7 | Fluxo principal demonstrável ao vivo | — | Roteiro em `20-video-cp5-roteiro.md` | ✅ |
| 8 | Testes E2E cobrindo o fluxo de inscrição | — | ✅ **Executado: 6 casos, 6 verdes.** A primeira execução real reprovou 6 de 6 e expôs três divergências — um servidor de preview reusado servindo a base errada, a navegação direta para a cobrança depois de reservar vaga paga, e o reset do mock a cada recarga. As três foram corrigidas no teste; nenhuma era do app | ✅ |
| 9 | Cobertura de domínio ≥ 60% | — | ✅ **Atendido — 79,03% de linhas e 63,38% de funções.** Ver RNF-015 em [`02-requisitos.md`](02-requisitos.md#quadro-resumo-dos-22-rnf) | ✅ |
| 10 | Manual de uso publicado | — | — | ✅ |

**Nove dos dez critérios aplicáveis ao CP5 estão atendidos.** Sobra um:

- **Critério 8** continua `⚠️` pelo mesmo motivo do CP4: o teste E2E está escrito e
  configurado, e o navegador do Playwright nunca foi instalado. É a **única pendência que
  atravessou dois checkpoints sem andar**, e por isso merece ser a primeira tarefa da
  Sprint 3 — ou os dez minutos antes da entrega do CP5. Um comando resolve:
  `npx playwright install chromium && npm run test:e2e`.

E vale registrar o que aconteceu com os critérios 1 e 9 **durante** esta sprint, porque é a
parte que prova que eles estão sendo medidos e não apenas declarados. No meio do CP5 a
cobertura caiu para **54,54%** e a formatação reprovava **26 arquivos**: as telas e os
módulos de domínio novos entraram antes dos testes e antes do Prettier. Os dois passos
obrigatórios do `ci.yml` derrubaram o build, a falha foi vista, e vieram
`auth.test.ts`, `pix.test.ts`, `ticketToken.test.ts` e `checkin.test.ts` — que subiram a
cobertura para 79,03% e, no caminho, expuseram um defeito de ordem no check-in (ver
[`04-regras-de-negocio.md`](04-regras-de-negocio.md#rn-017--o-qr-code-é-assinado-tem-janela-de-validade-e-vale-uma-vez)).
Critério de saída que nunca reprova não está sendo medido.

## 10. Como pedidos de mudança são tratados

1. Toda ideia nova entra como card no **Backlog** do Trello — nunca direto na sprint.
2. O PO classifica em MoSCoW e escreve o impacto em prazo.
3. Se for `Must` novo, algo de igual tamanho sai da sprint. Escopo não cresce de graça.
4. Mudança que afeta arquitetura, contrato ou modelo de dados exige ADR em
   [`adr/`](adr/README.md) antes de virar tarefa.
5. Mudança que afeta requisito exige atualização de [`02-requisitos.md`](02-requisitos.md)
   no mesmo PR — requisito desatualizado é o começo de todo retrabalho.
