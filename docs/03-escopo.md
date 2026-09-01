# Escopo

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

### Must — sem isso não existe produto (26 RFs)

O núcleo indivisível: **entrar (com vínculo) → ver o que é meu → reservar vaga → pagar
→ entrar no evento**.

`RF-001` `RF-002` `RF-003` `RF-005` `RF-006` `RF-007` `RF-010` `RF-011` `RF-013`
`RF-014` `RF-015` `RF-016` `RF-019` `RF-020` `RF-021` `RF-022` `RF-023` `RF-024`
`RF-025` `RF-026` `RF-028` `RF-029` `RF-030` `RF-033` `RF-034` `RF-036` `RF-037`
`RF-039`

> Teste do Must: se removido, algum dos três atores fica impedido de concluir seu
> objetivo principal. Exemplo — sem RF-025 (promoção FIFO), a lista de espera existe mas
> não funciona, e o organizador volta a preencher vaga na mão.

### Should — importante, mas há contorno (12 RFs)

Melhora significativamente a experiência; ausência dói mas não bloqueia.

`RF-004` `RF-008` `RF-009` `RF-012` `RF-027` `RF-031` `RF-032` `RF-035` `RF-040`
`RF-041` `RF-042`

> Contorno documentado, por exemplo: sem RF-035 (lista de presença), o organizador
> conta cabeça na porta — funciona, mas perde o dado histórico.

### Could — desejável se sobrar tempo (5 RFs)

`RF-017` (perguntas customizadas) · `RF-018` (duplicar evento) · `RF-038`
(comentários) · `RF-043` (gerenciar turmas do curso)

### Won't — declarado fora, para não voltar em reunião

Os 12 itens `RFX-01` a `RFX-12` de [`02-requisitos.md`](02-requisitos.md#4-requisitos-explicitamente-fora-de-escopo).

### Distribuição

| Prioridade | Qtd. | % dos RFs | Onde é entregue |
|---|---|---|---|
| Must | 26 | 60% | CP5 (18) + CP6 (8) |
| Should | 12 | 28% | CP6 |
| Could | 5 | 12% | CP6, se houver folga |
| Won't | 12 itens `RFX` | — | não entregue |

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

| Entrega | Detalhe |
|---|---|
| 18 RFs `Must` funcionando com dados mockados | Onboarding, feed, lista, detalhe, criação, inscrição, cancelamento, lista de espera, ingresso com QR |
| Ambiente de teste acessível por link | GitHub Pages com o app buildado (`/campus/`) |
| Diagramas de sequência e atividades atualizados conforme o implementado | Divergência entre diagrama e código é defeito, não detalhe |
| Testes: ≥ 8 unitários e 1 E2E do fluxo de inscrição | RNF-015 com limite de cobertura no CI |
| Validação com 5 alunos reais | RNF-005; resultado alimenta o backlog da Sprint 3 |
| Demonstração ao vivo do fluxo completo | Roteiro de demo definido na planning da Sprint 2 |

### CP6 — Persistência, integração e entrega final

**Sprint 3 · 06/10/2026 a 07/11/2026 · entrega 10/11/2026**

| Entrega | Detalhe |
|---|---|
| API real com persistência substituindo o mock | Só troca a implementação dos repositórios (RNF-016) |
| Pagamento em sandbox: Pix e cartão, com notificação idempotente | RF-028 a RF-031, RNF-014 |
| Check-in por leitura de QR com token assinado e uso único | RF-034, RNF-011 |
| Notificações e central de notificações | RF-039, RF-040 |
| Moderação e aprovação de evento de faculdade | RF-041, RF-042 |
| Build instalável (PWA) e manual de uso | Substitui a publicação em loja (RFX-05) |
| Registro da jornada do projeto | Retrospectivas, decisões (ADRs) e métricas das 3 sprints |

Detalhamento tarefa por tarefa em [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md).

## 9. Critérios de saída de cada checkpoint

Um checkpoint só é considerado entregue quando **todos** os itens abaixo são verdadeiros.

| # | Critério | CP4 | CP5 | CP6 |
|---|---|---|---|---|
| 1 | `npm run lint`, `npm run test` e `npm run build` verdes no CI | ✅ | ✅ | ✅ |
| 2 | Todo link relativo da documentação aponta para arquivo existente (`node scripts/validate-docs.mjs`) | ✅ | ✅ | ✅ |
| 3 | Todo bloco Mermaid renderiza sem erro | ✅ | ✅ | ✅ |
| 4 | Diagramas coerentes com o código entregue | ✅ | ✅ | ✅ |
| 5 | Quadro do Trello refletindo o estado real dos cards | ✅ | ✅ | ✅ |
| 6 | Link público acessível (Pages) | ✅ | ✅ | ✅ |
| 7 | Fluxo principal demonstrável ao vivo | — | ✅ | ✅ |
| 8 | Testes E2E cobrindo o fluxo de inscrição | — | ✅ | ✅ |
| 9 | Cobertura de domínio ≥ 60% | — | ✅ | ✅ |
| 10 | Manual de uso publicado | — | — | ✅ |

## 10. Como pedidos de mudança são tratados

1. Toda ideia nova entra como card no **Backlog** do Trello — nunca direto na sprint.
2. O PO classifica em MoSCoW e escreve o impacto em prazo.
3. Se for `Must` novo, algo de igual tamanho sai da sprint. Escopo não cresce de graça.
4. Mudança que afeta arquitetura, contrato ou modelo de dados exige ADR em
   [`adr/`](adr/README.md) antes de virar tarefa.
5. Mudança que afeta requisito exige atualização de [`02-requisitos.md`](02-requisitos.md)
   no mesmo PR — requisito desatualizado é o começo de todo retrabalho.
