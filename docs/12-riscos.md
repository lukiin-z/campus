# Matriz de riscos

Risco aqui é **evento futuro e incerto que muda o resultado do projeto**. Problema que já
aconteceu não é risco: é defeito ou impedimento, e vai para a issue ou para o quadro. A
seção 4 registra os riscos que já se materializaram, porque risco tratado é a única
evidência de que a matriz serve para algo.

Este documento é operacional, não decorativo: cada risco tem **gatilho observável** — o
sinal que diz "aconteceu" — e um responsável entre os 6 integrantes. Risco sem gatilho é
opinião; risco sem responsável é ninguém.

**Responsável:** Vitor Pantarotto (Scrum Master / QA) ·
**Revisão vigente:** 01/09/2026 · **Próxima revisão:** 08/09/2026 (planning da Sprint 2).

Referências: [`03-escopo.md`](03-escopo.md) (premissas P-01 a P-07 e dependências D-01 a
D-06), [`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) (RACI e substitutos),
[`11-plano-de-testes.md`](11-plano-de-testes.md) (severidade de defeito e casos que
verificam riscos técnicos) e [`../CONTRIBUTING.md`](../CONTRIBUTING.md) (DoR, DoD, fluxo de
PR).

---

## 1. Método

### 1.1 Probabilidade (1 a 5)

Horizonte: até a entrega final, **10/11/2026**. As faixas percentuais são premissa do
grupo, calibradas para um projeto de 6 pessoas, 3 sprints e prazo fixo.

| Nível | Nome | Definição objetiva para este projeto |
|---|---|---|
| 1 | Improvável | Abaixo de 10%. Nenhum sinal observado e o cenário depende de fator externo raro |
| 2 | Pouco provável | 10% a 30%. Plausível, sem sinal atual; já vimos acontecer em outro trabalho da faculdade |
| 3 | Possível | 30% a 50%. Depende de fator que o grupo não controla por inteiro; esperado em uma das três sprints |
| 4 | Provável | 50% a 80%. Há sinal observável agora, ou é o comportamento comum de um grupo com prazo fixo se nada for feito |
| 5 | Quase certo | Acima de 80%. O sinal já apareceu nesta sprint e a causa continua ativa |

### 1.2 Impacto (1 a 5)

Medido no que a disciplina avalia (documentação 25%, modelagem 20%, identidade visual 20%,
pitch 15%, Trello 10%, GitHub 10%) e no que o produto promete.

| Nível | Nome | Definição objetiva para este projeto |
|---|---|---|
| 1 | Desprezível | Absorvido dentro da sprint sem replanejar; custa menos de meio dia de uma pessoa |
| 2 | Baixo | Até 1 dia de retrabalho, ou perde parte de um critério de peso 10% sem zerá-lo |
| 3 | Moderado | 2 a 3 dias de retrabalho, ou obriga a tirar item `Should` da sprint, ou compromete parcialmente um critério de peso 15% a 20% |
| 4 | Alto | Compromete um artefato avaliado por inteiro, ou obriga a replanejar a sprint, ou faz o produto violar uma regra de negócio na demo |
| 5 | Crítico | **Impede a entrega de um checkpoint na data**: nada publicável, nada demonstrável |

### 1.3 Exposição e classificação

```
exposição = probabilidade × impacto        (1 a 25)
```

| Faixa | Classificação | Resposta exigida |
|---|---|---|
| 1 a 4 | Baixa | Aceitar e monitorar. Sem ação planejada; revisão na planning |
| 5 a 9 | Média | Mitigar dentro da sprint corrente, com ação atribuída a um responsável |
| 10 a 14 | Alta | Mitigar já, e o plano de contingência precisa estar **escrito** antes de a sprint começar |
| 15 a 25 | Crítica | Mitigação entra antes de qualquer card novo; o risco é lido na daily até a exposição cair |

Respostas possíveis: **mitigar** (reduzir probabilidade ou impacto), **evitar** (mudar o
plano para o risco não existir), **transferir** (mover a consequência para fora — no nosso
caso, quase sempre para uma ferramenta ou fallback) e **aceitar** (conviver, com
justificativa escrita — seção 5).

---

## 2. Matriz probabilidade × impacto

Cada célula traz os IDs posicionados por probabilidade (linha) e impacto (coluna). O
asterisco marca risco já materializado, posicionado na **exposição residual** depois do
tratamento.

| P ↓ / I → | 1 Desprezível | 2 Baixo | 3 Moderado | 4 Alto | 5 Crítico |
|---|---|---|---|---|---|
| **5 Quase certo** | — | — | **R-02** (15) | — | — |
| **4 Provável** | — | **R-10**, **R-11** (8) | **R-01**, **R-06**, **R-16** (12) | — | — |
| **3 Possível** | — | — | **R-04**, **R-12**, **R-14** (9) | **R-03**, **R-07** (12) | **R-05** (15) |
| **2 Pouco provável** | — | **R-13** (4) | — | **R-08**, **R-09** (8) | — |
| **1 Improvável** | — | — | **R-15\*** (3) | — | — |

Leitura: nenhuma célula de exposição crítica está vazia por sorte — **R-02** e **R-05** são
os dois riscos que o grupo lê na daily. Nenhum risco vive nas colunas de impacto 5 além de
R-05, porque as dependências externas (Figma, gateway, Trello) todas têm contorno escrito em
[`03-escopo.md`](03-escopo.md), e contorno escrito é o que rebaixa impacto crítico para
alto.

---

## 3. Registro de riscos

### 3.1 Visão consolidada

| ID | Cat. | Risco | P | I | Exp. | Classe | Resposta | Responsável | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Escopo | Escopo infla com pedido novo sem nada sair | 4 | 3 | 12 | Alta | Mitigar | João Viviani Baldini | Ativo |
| R-02 | Equipe | 6 pessoas com papéis acumulados, ninguém dedicado | 5 | 3 | 15 | Crítica | Mitigar | Vitor Pantarotto | Ativo |
| R-03 | Equipe | Integrante indisponível na reta final | 3 | 4 | 12 | Alta | Mitigar | Vitor Pantarotto | Ativo |
| R-04 | Externo | Gateway de pagamento sem sandbox gratuito (D-02) | 3 | 3 | 9 | Média | Mitigar | Lucas Baraldi | Ativo |
| R-05 | Técnico | GitHub Pages ou CI quebra na véspera da entrega | 3 | 5 | 15 | Crítica | Mitigar | Lucas Baraldi | Ativo |
| R-06 | Qualidade | Diagrama e código divergem | 4 | 3 | 12 | Alta | Mitigar | Ronaldo Veloso Filho | Ativo |
| R-07 | Técnico | Bug de concorrência na reserva de vaga (overbooking) | 3 | 4 | 12 | Alta | Mitigar | Lucas Baraldi | Ativo |
| R-08 | Qualidade | Coleta de dado pessoal além do necessário (LGPD) | 2 | 4 | 8 | Média | Evitar | Lucas Zolla | Ativo |
| R-09 | Externo | Arquivo do Figma perdido ou sem acesso (D-03) | 2 | 4 | 8 | Média | Mitigar | Ana Luiza Dourado | Ativo |
| R-10 | Equipe | Quadro do Trello criado e nunca usado | 4 | 2 | 8 | Média | Mitigar | Vitor Pantarotto | Ativo |
| R-11 | Escopo | Vídeo de 2 minutos estoura o tempo | 4 | 2 | 8 | Média | Mitigar | João Viviani Baldini | Ativo |
| R-12 | Qualidade | CP5 fecha sem validação com usuário real | 3 | 3 | 9 | Média | Mitigar | Ana Luiza Dourado | Ativo |
| R-13 | Externo | Google Fonts indisponível no dia da apresentação | 2 | 2 | 4 | Baixa | Mitigar | Lucas Baraldi | Ativo |
| R-14 | Prazo | Cadeia serial requisito → UML → UI → código atrasa o último elo | 3 | 3 | 9 | Média | Mitigar | Vitor Pantarotto | Ativo |
| R-15 | Qualidade | Valor de cor herdado do protótipo reprova contraste AA | 1 | 3 | 3 | Baixa | Mitigado | Ana Luiza Dourado | **Materializado — resolvido** |
| R-16 | Técnico | Gate de validação da documentação não existe | 4 | 3 | 12 | Alta | Mitigar | Lucas Baraldi | **Materializado — em tratamento** |

### 3.2 R-01 — Escopo infla com pedido novo sem nada sair

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Escopo | 4 | 3 | 12 (alta) | Mitigar | João Viviani Baldini (PO) |

**Causa → evento → consequência.** É fácil imaginar funcionalidade nova para um app social
(chat do evento, ranking de presença, feed geral, integração com WhatsApp) **→** um card
novo entra na sprint corrente sem nada sair, porque "é rapidinho" **→** nenhum fluxo fecha:
o CP5 entrega 12 telas pela metade em vez dos 18 RF `Must` funcionando, e o critério de
documentação passa a descrever algo diferente do que existe.

**Ações de mitigação.**

1. Toda ideia nova entra como card no **Backlog**, nunca direto na sprint — regra já escrita
   na seção 10 de [`03-escopo.md`](03-escopo.md).
2. Troca de tamanho igual: `Must` novo só entra se algo equivalente sair, e a decisão é do
   PO na planning, registrada no card que saiu.
3. Os 12 requisitos recusados (`RFX-01` a `RFX-12` de [`02-requisitos.md`](02-requisitos.md))
   ficam citados na abertura do quadro como "já respondido, não reabrir" — a maior parte dos
   pedidos novos é uma dessas 12 ideias voltando com outro nome.
4. Limite de trabalho em andamento: 2 cards por pessoa. Card novo não cabe se ninguém tem
   espaço.
5. DoR obrigatório antes de entrar em sprint: sem RF/RN associado e sem critério de aceite,
   o card não é planejável.

**Gatilho.** Mais de 2 cards adicionados à sprint depois da planning, ou qualquer card em
"Fazendo" sem RF/RN no título ou na descrição.

**Contingência.** Congelar o escopo da sprint no mesmo dia; mover tudo que não é `Must`
para a Sprint 3; o PO anuncia o corte na review, com a lista do que saiu e por quê.

### 3.3 R-02 — 6 pessoas com papéis acumulados, ninguém dedicado

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Equipe | 5 | 3 | **15 (crítica)** | Mitigar | Vitor Pantarotto (SM) |

**Causa → evento → consequência.** São 6 integrantes cobrindo documentação, modelagem,
marca, pitch, quadro, repositório e código, cada um dono de um artefato e revisor de outro,
todos em paralelo com outras disciplinas **→** o dono de um artefato fica sem revisor real e
a revisão vira assinatura **→** erro passa direto (foi exatamente o que aconteceu com o
contraste, seção 4.1) e o mesmo integrante se torna gargalo de 3 PRs ao mesmo tempo.

Probabilidade 5 porque o sinal já existe: nenhum integrante é dedicado a um único papel, e a
matriz RACI de [`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) mostra pessoas aparecendo em
`R` e em `A` de artefatos vizinhos.

**Ações de mitigação.**

1. Revisor cruzado fixo por área, já definido em [`../CONTRIBUTING.md`](../CONTRIBUTING.md):
   front/arquitetura → Lucas Baraldi; requisitos → Lucas Zolla; UML/dados → Ronaldo;
   UI/design system → Ana Luiza; produto/escopo → João; teste/QA → Vitor. Ninguém aprova o
   próprio artefato.
2. Timebox de 24h para revisão de PR. Passou disso, o SM revisa ou o card volta para o
   planejamento.
3. Limite de 2 cards em andamento por pessoa, para que a fila fique visível no quadro em vez
   de na cabeça de alguém.
4. Daily assíncrona **escrita**: o que fiz, o que travou, risco observado. Conversa de voz
   não deixa rastro e não sobrevive a quem faltou.
5. Pareamento nos dois pontos de maior consequência: regra de vagas/fila (Lucas Baraldi +
   Vitor) e design system (Ana Luiza + Lucas Baraldi). São os lugares onde erro silencioso
   custa mais.
6. Todo artefato tem substituto nomeado — o mesmo mecanismo que atende R-03.

**Gatilho.** PR aberto há mais de 48h sem revisão, ou artefato cujo responsável e aprovador
sejam a mesma pessoa, ou integrante com 3 cards simultâneos em "Fazendo".

**Contingência.** O SM assume a revisão faltante no dia ou remove o item da sprint; na
retrospectiva, redistribuição explícita de artefatos, com o quadro aberto.

### 3.4 R-03 — Integrante indisponível na reta final

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Equipe | 3 | 4 | 12 (alta) | Mitigar | Vitor Pantarotto (SM) |

É o risco citado pela premissa **P-01** de [`03-escopo.md`](03-escopo.md).

**Causa → evento → consequência.** Prova de outra disciplina, trabalho, saúde ou imprevisto
familiar cai nas semanas de fechamento (02–08/09, 30/09–06/10, 03–10/11) **→** o dono único
de um artefato para de responder a 3 dias da entrega **→** o artefato fica sem dono e o
critério correspondente, que pode valer até 20% da nota, entra incompleto.

**Ações de mitigação.**

1. Nada mora só na máquina de uma pessoa: todo artefato vive no repositório, versionado.
   Arquivo em pasta pessoal não conta como entregue.
2. Substituto nomeado por artefato na matriz RACI, com a regra de que o substituto **leu** o
   artefato ao menos uma vez antes da semana da entrega.
3. Commits pequenos e diários: parcial no repositório vale mais que completo no laptop de
   alguém que não responde.
4. Congelamento de escopo 72h antes de cada entrega — nesse ponto o que falta é acabamento,
   não construção.
5. Documentação em texto, não em conversa: quem assume no meio encontra o estado do trabalho
   escrito (é a razão de artefatos como este terem seção de método, e não só resultado).

**Gatilho.** Integrante sem commit e sem mensagem por 48h na semana de entrega, ou pedido
explícito de afastamento.

**Contingência.** O substituto assume no mesmo dia; o escopo `Should` daquele artefato é
cortado e o `Must` é concluído; o SM comunica a redução com o que foi entregue, em vez de
prometer o que não vai chegar.

### 3.5 R-04 — Gateway de pagamento sem sandbox gratuito

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Externo | 3 | 3 | 9 (média) | Mitigar | Lucas Baraldi (Tech Lead) |

Materializa a dependência **D-02** de [`03-escopo.md`](03-escopo.md), sob a premissa P-02
(nenhum orçamento).

**Causa → evento → consequência.** Sandbox com Pix depende de aprovação de conta em
provedor externo, que costuma pedir dado de empresa, e não há orçamento para plano pago
**→** chega o CP6 sem sandbox utilizável **→** RF-028 a RF-032 não são demonstráveis com
provedor real e o pitch perde a parte de cobrança formal, que é justamente um dos quatro
problemas que o Campus resolve.

**Ações de mitigação.**

1. Interface `PaymentGateway` definida desde o CP4 ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)), com implementação
   `FakeGateway` que simula o ciclo real: cobrança criada, QR do Pix, expiração em 60 min e
   notificação assíncrona.
2. Os testes CT-007 (janela) e CT-010 (idempotência) exercitam **o nosso lado** do contrato.
   O que depende do provedor é a entrega da notificação, não a nossa reação a ela.
3. Nenhum dado de cartão no modelo (RNF-022): a captura acontece no ambiente do gateway.
   Isso remove a exigência de conformidade que costuma barrar conta de sandbox.
4. Investigação de provedor limitada a 1 dia no início da Sprint 3 — tempo caixa, para não
   virar buraco de pesquisa.

**Gatilho.** 13/10/2026 (primeira semana da Sprint 3) sem nenhuma conta de sandbox aprovada.

**Contingência.** Entregar o CP6 com o gateway simulado, rotulado como simulação na tela e
no vídeo, e mostrar no código que a troca é uma implementação de interface — a arquitetura
é a prova de que o risco foi antecipado, não escondido.

### 3.6 R-05 — GitHub Pages ou CI quebra na véspera da entrega

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Técnico | 3 | 5 | **15 (crítica)** | Mitigar | Lucas Baraldi (Tech Lead) |

**Causa → evento → consequência.** O deploy depende de `base` do Vite igual a `/campus/`,
de permissão do workflow, de cache do Actions e de merges de última hora **→** na véspera o
pipeline falha ou o Pages publica página branca **→** o critério "link público acessível"
fica sem prova e a demonstração ao vivo passa a depender da máquina de alguém, com a rede da
sala.

Impacto 5 porque este é o único risco da lista que **impede a entrega na data**: sem link
publicado nem build funcional, não há o que avaliar.

**Ações de mitigação.**

1. Congelamento de `main` 48h antes de cada entrega. Nessa janela entra só correção de
   defeito bloqueador.
2. Pipeline roda em **todo** PR, não só na `main`: a quebra aparece no PR de quem a causou.
3. Job de deploy separado do job de teste, para que falha de publicação não seja confundida
   com falha de código, e vice-versa.
4. Verificação humana do link publicado por **outra pessoa** logo após cada merge na `main`
   — o workflow verde não prova que a página abre.
5. `dist/` guardado como artefato do workflow, e build local verificado com
   `npm run build && npm run preview` na véspera.
6. Vídeo da demo gravado com antecedência (o contorno já previsto em D-04), de modo que a
   apresentação nunca dependa de rede ao vivo.

**Gatilho.** Qualquer execução vermelha do workflow na semana de entrega, ou `/campus/`
retornando 404 ou página em branco.

**Contingência.** Apresentar pelo `npm run preview` local com o `dist/` já construído e
exibir o vídeo gravado; abrir issue de severidade bloqueador e corrigir o pipeline depois da
entrega, não durante.

### 3.7 R-06 — Diagrama e código divergem

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Qualidade | 4 | 3 | 12 (alta) | Mitigar | Ronaldo Veloso Filho (Modelagem) |

**Causa → evento → consequência.** Os 7 diagramas foram fechados no CP4 e o código evolui
durante a Sprint 2 **→** o diagrama de classes ou de sequência passa a descrever um
comportamento que o código não tem **→** a modelagem, que vale 20%, é avaliada sobre um
documento falso, e quem implementar depois (pessoa ou agente) segue a figura errada.

**Ações de mitigação.**

1. Regra no DoD: mudou tipo de domínio, mudou o diagrama no **mesmo PR**. Já está escrita em
   [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
2. `app/src/types/domain.ts` é o espelho declarado do
   [diagrama de classes](05-modelagem/02-diagrama-classes.md), e Ronaldo é revisor
   obrigatório de qualquer PR que o toque.
3. `npm run diagrams` regenera os SVGs de `05-modelagem/exports/`, então divergência de
   modelagem aparece como diff no PR — fica difícil esquecer.
4. Revisão cruzada Ronaldo × Lucas Baraldi antes de cada entrega, cobrindo o critério de
   saída 4 de [`03-escopo.md`](03-escopo.md) ("diagramas coerentes com o código").
5. Divergência é classificada como defeito **médio**, e **alto** quando falta menos de uma
   semana para a entrega — a escala está na seção 8.1 de
   [`11-plano-de-testes.md`](11-plano-de-testes.md).

**Gatilho.** PR que altera `app/src/types/domain.ts` ou `app/src/domain/*.ts` sem tocar em
`docs/05-modelagem/`.

**Contingência.** Um dia de reconciliação de modelagem reservado na última semana de cada
sprint. Se o tempo acabar, o diagrama recebe nota de divergência datada, dizendo o que o
código faz diferente — documento honesto vale mais que documento bonito.

### 3.8 R-07 — Bug de concorrência na reserva de vaga (overbooking)

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Técnico | 3 | 4 | 12 (alta) | Mitigar | Lucas Baraldi (Tech Lead) |

**Causa → evento → consequência.** No CP5 não há banco: a reserva acontece em memória, e
duas operações concorrentes podem ler `ocupadas` antes de a primeira escrever **→** a 81ª
pessoa é confirmada em um evento de 80 vagas, ou a mesma vaga liberada é oferecida a duas
pessoas da fila **→** viola RN-004 e RNF-013, quebra a promessa central do produto
("controle de vagas que não estoura") e aparece na demo diante do avaliador.

**Ações de mitigação.**

1. Escrita serializada na camada mockada: uma fila de operações, uma por vez, espelhando o
   `SELECT ... FOR UPDATE` descrito no [modelo de dados](05-modelagem/03-modelo-dados-er.md).
   O comportamento observável é o mesmo do CP6 com banco.
2. **CT-020** no CI, prioridade P0: 50 inscrições simultâneas para 1 vaga têm de produzir
   exatamente 1 confirmação e 49 entradas na fila.
3. Invariante `ocupadas <= capacidade` verificado em toda operação de escrita, não só na
   leitura da tela.
4. Uma oferta por vaga liberada (RN-007), com a vaga marcada como reservada durante a
   janela — o caso de duas ofertas para a mesma vaga é testado em CT-004.
5. No CP6, restrição `CHECK` no banco como rede de segurança: se algo escapar da trava da
   aplicação, a escrita falha em vez de gerar overbooking silencioso.

**Gatilho.** CT-020 vermelho, ou qualquer evento do mock com `ocupadas > capacidade`, ou
duas participações com a mesma `posicaoFila` no mesmo evento.

**Contingência.** Desabilitar inscrição concorrente na demonstração (fila única de
operações) e tratar como defeito bloqueador: correção começa no mesmo dia e nada novo entra
antes.

### 3.9 R-08 — Coleta de dado pessoal além do necessário

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Qualidade | 2 | 4 | 8 (média) | Evitar | Lucas Zolla (Requisitos) |

**Causa → evento → consequência.** Sempre aparece um campo "que seria útil" — telefone para
o grupo de WhatsApp, CPF para a lista de presença, foto obrigatória **→** o campo entra no
modelo, no formulário ou num print de tela com dado real **→** viola RNF-020, contradiz o
próprio documento de requisitos e cria uma obrigação de exclusão (RNF-021) que o projeto não
tem como cumprir.

A resposta é **evitar**, não mitigar: o campo simplesmente não existe.

**Ações de mitigação.**

1. O [diagrama de classes](05-modelagem/02-diagrama-classes.md) tem seção dedicada aos
   atributos que **não** existem de propósito: `cpf`, `telefone`, `endereco`,
   `dataNascimento`, número e CVV de cartão. Ausência documentada é mais difícil de reverter
   por descuido.
2. PR que adiciona campo pessoal exige justificativa escrita e aprovação do analista de
   requisitos.
3. Inventário de dados pessoais revisado a cada sprint, conforme a verificação de RNF-020.
4. O seed canônico usa **nomes fictícios** (Marina Alves, Rafael Souza, Beatriz Nakamura) e
   nenhuma foto de aluno real — vale para app, slides e vídeo.
5. Nenhum print de tela com dado real de colega entra no repositório.

**Gatilho.** PR que adiciona campo em `Usuario` ou `Participacao`; qualquer captura de tela
com nome, e-mail ou foto de pessoa real.

**Contingência.** Reverter o campo, limpar o mock e registrar na retrospectiva. Se algo já
foi publicado (Pages, vídeo, slide), republicar sem o dado no mesmo dia.

### 3.10 R-09 — Arquivo do Figma perdido ou sem acesso

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Externo | 2 | 4 | 8 (média) | Mitigar | Ana Luiza Dourado (UX/UI) |

Materializa a dependência **D-03** de [`03-escopo.md`](03-escopo.md).

**Causa → evento → consequência.** O arquivo vive em conta gratuita e pessoal, com limite de
arquivos e de editores **→** no dia da entrega o link pede acesso, ou o arquivo estourou o
limite do plano **→** o critério de identidade visual (20%) fica sem o protótipo navegável,
que é a parte que o avaliador abre primeiro.

**Ações de mitigação.**

1. Os tokens (cor, tipografia, espaçamento, raio, sombra) estão versionados no repositório
   com **os mesmos nomes** usados no Figma. A fonte da verdade é o repositório; o Figma é
   apresentação.
2. Logo e símbolo em SVG em [`06-marca/assets/`](06-marca/assets/logo.svg), fora do Figma.
3. Tabela de contraste, escalas e regras de uso escritas em
   [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) — o design system
   sobrevive à perda do arquivo de design.
4. Permissão do arquivo em "qualquer pessoa com o link pode visualizar", conferida por um
   segundo integrante antes de cada entrega.
5. Exportação das 8 telas em PNG guardada no repositório, e styleguide navegável em HTML
   como prova visual equivalente (contorno previsto em D-03).

**Gatilho.** Link do Figma pedindo acesso para qualquer integrante, ou aviso de limite de
plano.

**Contingência.** Apresentar o styleguide HTML e os PNGs exportados; o protótipo navegável é
substituído pelo app real publicado em `/campus/`, que a partir do CP5 é mais forte que o
protótipo.

### 3.11 R-10 — Quadro do Trello criado e nunca usado

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Equipe | 4 | 2 | 8 (média) | Mitigar | Vitor Pantarotto (SM) |

**Causa → evento → consequência.** O quadro é criado de uma vez por importação e o trabalho
real acontece no chat e no repositório **→** os cards param no lugar: sem movimento, sem
comentário, sem data **→** o critério de organização (10%) avalia um quadro morto, e o
histórico do projeto existe só no `git log`, que não é o que a disciplina pede. O critério é
**uso real**, não existência.

**Ações de mitigação.**

1. Card só sai de "Fazendo" com link do PR no comentário — item 7 do DoD de
   [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
2. A daily assíncrona começa movendo o card e só depois escrevendo a mensagem. A mensagem é
   consequência do quadro, não substituta dele.
3. Planning e review acontecem **com o quadro aberto**, e as decisões são registradas nos
   cards, não em conversa.
4. Cada entrega da matriz de artefatos do CP4/CP5/CP6 tem card com responsável e data.
5. O SM confere o quadro contra o estado real do repositório antes de cada entrega — é o
   critério de saída 5 de [`03-escopo.md`](03-escopo.md).

**Gatilho.** Três dias sem nenhuma movimentação de card durante sprint ativa.

**Contingência.** Reconstruir o histórico no mesmo dia a partir dos commits e PRs, com as
datas reais, e retomar a rotina. Quadro atualizado com atraso é aceitável; movimentação
inventada não é — o avaliador cruza card com commit.

### 3.12 R-11 — Vídeo de 2 minutos estoura o tempo

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Escopo | 4 | 2 | 8 (média) | Mitigar | João Viviani Baldini (PO) |

**Causa → evento → consequência.** A vontade de mostrar tudo — problema, personas, 8 telas,
arquitetura, roadmap — em 120 segundos **→** o vídeo sai com 3 minutos, ou com corte abrupto
no fim **→** a ideia de venda (15%) perde exatamente o fecho, que é onde está o pedido de
ação.

**Ações de mitigação.**

1. Roteiro escrito com tempo por bloco e contagem de palavras. Premissa do grupo: fala
   confortável rende ~150 palavras por minuto, então o roteiro inteiro cabe em ~300 palavras.
2. Ordem fixa e cronometrada: problema (20 s) → solução em uma frase (15 s) → demonstração
   do fluxo de inscrição (55 s) → diferencial (20 s) → fecho (10 s).
3. Ensaio cronometrado **antes** de gravar, não depois.
4. Gravação em blocos, para refazer só o bloco que estourou.
5. A demonstração é captura de tela do app real com o seed canônico, sem narração
   improvisada — improviso é o que estoura o tempo.

**Gatilho.** Primeiro ensaio acima de 130 segundos.

**Contingência.** Cortar o bloco de diferencial e deixá-lo apenas nos slides. O fecho nunca
é o bloco sacrificado.

### 3.13 R-12 — CP5 fecha sem validação com usuário real

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Qualidade | 3 | 3 | 9 (média) | Mitigar | Ana Luiza Dourado (UX/UI) |

**Causa → evento → consequência.** RNF-005 exige 5 alunos concluindo a inscrição em até 90 s
no CP5, e recrutar gente em semana de prova é difícil **→** o CP5 fecha sem nenhuma sessão
**→** as decisões de UX ficam sem evidência, e o grupo descobre no CP6 que a lista de espera
não é entendida — quando já não há tempo de mudar o fluxo.

**Ações de mitigação.**

1. As 5 sessões são agendadas **na planning da Sprint 2**, com nome e horário. "Durante a
   sprint" não é agenda.
2. Sessões curtas, de 15 minutos, remotas ou no corredor, com 3 tarefas: achar um evento da
   sua turma, se inscrever, explicar o que acontece quando o evento está lotado.
3. Recrutamento na própria 3ESPX e em 2ESPA — o público-alvo está na sala.
4. O teste usa o app publicado, não o Figma: o que interessa é o fluxo real, com dados do
   seed.
5. Registro de falas literais e do tempo por tarefa; o resultado entra no backlog da Sprint 3
   como card, não como impressão.

**Gatilho.** 25/09/2026 com menos de 3 sessões agendadas.

**Contingência.** Reduzir para 3 sessões e registrar a redução como dívida no relatório do
CP5. Registrar 3 sessões reais é melhor que relatar 5 que não aconteceram.

### 3.14 R-13 — Google Fonts indisponível no dia da apresentação

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Externo | 2 | 2 | 4 (baixa) | Mitigar | Lucas Baraldi (Tech Lead) |

**Causa → evento → consequência.** Space Grotesk, Inter e JetBrains Mono vêm de CDN
externo; a rede da sala pode bloquear o domínio ou estar saturada **→** a página abre com
fonte de fallback **→** a identidade visual (20%) é apresentada errada no momento exato da
avaliação, e o layout muda de verdade: quebra de linha diferente, altura de cartão
diferente, contador de vagas desalinhado.

**Ações de mitigação.**

1. Pilha de fallback declarada em toda família
   (`"Space Grotesk", "Segoe UI", system-ui, sans-serif`) e `font-display: swap`, para que a
   página nunca fique sem texto.
2. Auto-hospedagem dos `.woff2` das três famílias no próprio bundle antes do CP5 — remove a
   dependência de rede em vez de mitigá-la, e conta a favor do RNF-007 (bundle ≤ 250 KB
   gzip) porque só os pesos usados entram.
3. Verificação do layout com as fontes bloqueadas no DevTools, incluída no roteiro de
   responsividade do plano de testes.
4. Captura de tela de referência com as fontes corretas versionada no repositório, para
   comparação.

**Gatilho.** Teste com `fonts.gstatic.com` bloqueado mostrando quebra de layout — troca de
fonte é esperada, quebra de layout não.

**Contingência.** Apresentar a partir do build local com as fontes embutidas.

### 3.15 R-14 — Cadeia serial requisito → UML → UI → código atrasa o último elo

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Prazo | 3 | 3 | 9 (média) | Mitigar | Vitor Pantarotto (SM) |

**Causa → evento → consequência.** Requisito alimenta diagrama, que alimenta tela, que
alimenta código e teste: quatro etapas em série, 6 pessoas, 3 semanas por sprint **→** um
atraso de 1 dia no primeiro elo empurra os outros três **→** o que sobra sem tempo é sempre
o fim da fila: teste automatizado e acessibilidade. Exatamente os dois itens que o CP5 cobra
(cobertura ≥ 60%, teclado, contraste).

**Ações de mitigação.**

1. Fatiar por **módulo**, não por artefato: "inscrição" inteira (RF → RN → diagrama → tela →
   teste) em vez de "todos os requisitos, depois todos os diagramas".
2. Contratos combinados cedo: enums, IDs do seed e nomes de token fechados no CP4, de modo
   que tela, teste e slide avancem em paralelo sem esperar o vizinho.
3. O **seed canônico** congelado é o mecanismo concreto disso: `evt-001` a `evt-011` com
   dados fixos permitem escrever o teste antes da tela existir.
4. Buffer de 2 dias antes de cada entrega, sem card planejado.
5. Ordem de corte declarada antes do aperto: corta-se módulo inteiro, nunca o teste de um
   módulo entregue.

**Gatilho.** Qualquer artefato da matriz de entregas ainda sem começar quando faltam 5 dias
para a entrega.

**Contingência.** Cortar um módulo completo (moderação, por exemplo) e entregar os demais
com teste e acessibilidade em ordem. Escopo menor e provado, em vez de maior e sem prova.

### 3.16 R-15 — Valor de cor herdado do protótipo reprova contraste AA

| Categoria | P | I | Exposição original | Exposição residual | Responsável |
|---|---|---|---|---|---|
| Qualidade | 4 → 1 | 4 → 3 | 16 (crítica) | 3 (baixa) | Ana Luiza Dourado (UX/UI) |

**Materializado no CP4 e resolvido.** Detalhamento na seção 4.1.

### 3.17 R-16 — Gate de validação da documentação não existe

| Categoria | P | I | Exposição | Resposta | Responsável |
|---|---|---|---|---|---|
| Técnico | 4 | 3 | 12 (alta) | Mitigar | Lucas Baraldi (Tech Lead) |

**Materializado, em tratamento.** Detalhamento na seção 4.2.

---

## 4. Riscos já materializados e como foram tratados

### 4.1 R-15 — A auditoria de contraste reprovou dois valores do protótipo

**O que aconteceu.** Ao transformar o protótipo legado em design system, Ana Luiza calculou
a razão de contraste de todas as combinações de texto e fundo previstas nas 8 telas. A
tabela de 25 linhas de [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md)
reprovou **dois** valores herdados:

| Combinação | Valor original | Razão | Exigência WCAG 2.1 | Resultado |
|---|---|---|---|---|
| Texto secundário de 11–13 px (metas de evento, legendas, contadores) sobre o fundo `#FBFBFA` | `#767D85` | **4,02:1** | 4,5:1 (1.4.3) | **Reprova AA** |
| Texto branco de 13 px sobre o botão primário coral | `#E8542E` | **3,66:1** | 4,5:1 (1.4.3) | **Reprova AA** |

**Por que era grave (impacto 4).** Não é detalhe estético: RNF-002 é `Must` e a identidade
visual vale 20% da avaliação. Os dois valores estavam no elemento mais repetido da interface
— o contador "18 de 40 vagas" e o botão "Inscrever-se" aparecem em todas as telas de evento.
Um design system publicado com essas cores propagaria a falha para cada componente novo, e o
custo de correção cresce a cada tela desenhada.

**Como foi tratado.**

1. **Texto secundário** passou a ser `neutral-600` `#5C6269` como `text-muted` → **5,95:1**
   sobre o fundo da tela e **6,17:1** sobre cartão branco. O `#767D85` continua na paleta
   como `text-subtle`, permitido só em texto grande (≥ 18,66 px em negrito ou ≥ 24 px) e em
   borda de campo, onde a exigência é 3:1.
2. **Botão primário** passou a usar `coral-600` `#C83A16` como `accent-strong` → **5,16:1**
   com texto branco. O `coral-500` `#E8542E` continua sendo a cor da marca, usada em
   preenchimento decorativo e em área grande, nunca atrás de texto pequeno.
3. Os dois valores reprovados **permanecem na tabela**, como linhas 7 e 10, marcados como
   REPROVA. Documentar o erro impede que alguém reintroduza o valor "porque é mais bonito".

**Exposição depois do tratamento:** probabilidade 1 (a causa foi removida da paleta) ×
impacto 3 (se voltasse, hoje seria pego na revisão) = **3, baixa**.

**Ação preventiva adotada — é o que importa daqui para frente.**

- A tabela de contraste de `identidade-visual.md` é a **fonte única**: cor que não tem linha
  na tabela não entra na interface.
- Valor de cor **hardcoded** em componente (`text-[#E8542E]`) é motivo de reprovação
  automática de PR — a regra já está em [`../CONTRIBUTING.md`](../CONTRIBUTING.md), e a cor
  vem sempre do token.
- Par proibido registrado explicitamente: `coral-500` com texto branco pequeno.
- O roteiro manual de acessibilidade (seção 5.1 de
  [`11-plano-de-testes.md`](11-plano-de-testes.md)) tem passo dedicado a procurar
  **combinação nova** na tela; cor sem linha na tabela é defeito de severidade **alto**.
- No CP5 entra auditoria automatizada de contraste no pipeline, fechando o ciclo: hoje a
  garantia é humana, e garantia humana falha em silêncio.

**Lição registrada:** o erro não foi escolher uma cor errada — foi herdar valor do protótipo
sem medir. O que mudou no processo é que **nenhum valor entra no design system sem número
calculado ao lado**.

### 4.2 R-16 — O gate de validação da documentação não existe

**O que aconteceu.** O comando `node scripts/validate-docs.mjs` é citado como obrigatório em
três lugares: a seção 8 de [`../CONTRIBUTING.md`](../CONTRIBUTING.md), o critério de saída 2
de [`03-escopo.md`](03-escopo.md) (válido para CP4, CP5 e CP6) e o script `validate:docs` do
`app/package.json`. O arquivo **não existe** em `scripts/`, que hoje contém apenas
`render-diagrams.mjs`.

**Consequência observável.** Nenhum link relativo entre documentos é verificado
automaticamente. Isso não é hipótese: documentos já escritos apontam para arquivos que ainda
estão em produção nesta mesma sprint. Na conferência manual de **01/09/2026**, as
referências pendentes eram `13-roadmap-cp5-cp6.md` e `16-checklist-entrega-cp4.md` (citados
por `03-escopo.md` e por `10-equipe-e-papeis.md`) e `06-marca/guia-figma.md` e
`06-marca/styleguide.html` (citados por `03-escopo.md`). Enquanto o gate não existe, essa
dívida é invisível — e link quebrado na entrega atinge diretamente o critério "GitHub
organizado".

**Tratamento.**

1. Escrever `scripts/validate-docs.mjs`: varre `docs/**/*.md` e os arquivos markdown da
   raiz, extrai todo link relativo, resolve o caminho e encerra com código diferente de zero
   listando as falhas. Sem dependência externa — Node puro, como `render-diagrams.mjs`.
2. Ligar o script ao CI como passo obrigatório, junto de `lint`, `test` e `build`.
3. Até o script existir, conferência manual da lista de links por dois integrantes, no
   fechamento do CP4.

**Gatilho.** Já acionado: `npm run validate:docs` falha por arquivo ausente.

**Contingência.** Se o script não estiver pronto em 05/09/2026, o critério de saída 2 do CP4
é marcado como **verificado manualmente**, com o checklist anexado — e não como verificado
automaticamente. A diferença é registrada, não maquiada.

---

## 5. Riscos aceitos conscientemente

Aceitar é decisão, não esquecimento. Cada linha diz o que estamos dispostos a perder e o que
faria o grupo reabrir a decisão.

| ID | O que aceitamos | Por quê | O que estamos dispostos a perder | O que reabre a decisão |
|---|---|---|---|---|
| A-01 | **Sem modo escuro na v1** | Dobra o número de tokens e o tamanho da auditoria de contraste, com benefício estético para um app usado em pé, de dia, no corredor | Pontos de "modernidade" na percepção de quem espera tema escuro | Auditoria automatizada de contraste no CI e design system estável — aí o custo cai |
| A-02 | **Sem backend próprio no CP5** | Sem orçamento (P-02) e sem tempo para servidor no mesmo semestre. MSW mais mock em memória dá comportamento de HTTP real desde já | Descobrir no CP6 que uma suposição de contrato estava errada | Se o CP6 exigir contrato que o mock não consegue representar (paginação real, transação distribuída) |
| A-03 | **Sem app nativo em loja** | Conta de desenvolvedor tem custo e prazo de revisão incompatíveis com o semestre (RFX-05) | Instalação pela loja e notificação push nativa | Nada dentro deste semestre; PWA instalável cobre o uso no CP6 |
| A-04 | **Sem teste de performance automatizado no CP5** | Medir p95 sobre dados mockados mede o mock, não o produto | Detecção precoce de regressão de desempenho | Entrada da API real no CP6 |
| A-05 | **Sem grade de navegadores automatizada** | Grade em CI gratuito é lenta e instável; o público é mobile e o app é uma SPA simples | Defeito específico de Safari antigo aparecer só na apresentação | Qualquer defeito de renderização relatado em navegador da matriz de RNF-019 |
| A-06 | **QR não é lido por câmera em teste automatizado** | Playwright não lê câmera; testar isso testaria o navegador. A dependência de aparelho é D-06 | Falha de leitura em condição real de luz e distância | Teste manual em aparelho real no CP6 já está previsto; falha lá vira card |
| A-07 | **Persistência em serviço de nível gratuito no CP6** | Premissa P-02: nenhum orçamento | Latência de partida a frio e limite de requisições na demonstração | Se a demo do CP6 ficar acima do p95 de RNF-006 por causa do plano gratuito |

Duas coisas que o grupo decidiu **não** aceitar, para deixar o contraste claro: overbooking
"raro" (R-07) e coleta de dado pessoal "só para facilitar" (R-08). Nos dois casos, o custo de
conviver é maior que o custo de evitar.

---

## 6. Rotina de revisão

### 6.1 Cerimônias

| Momento | Quando | Quem conduz | O que acontece |
|---|---|---|---|
| **Revisão completa** | Planning de cada sprint — 08/09/2026 (Sprint 2) e 06/10/2026 (Sprint 3) | Vitor Pantarotto | Reavaliar P e I de todos os riscos, fechar os que perderam causa, registrar novos, confirmar responsável e gatilho. Timebox de 20 min |
| **Checagem rápida** | Review de cada sprint | Vitor Pantarotto | Verificar quais gatilhos foram acionados na sprint e se a mitigação funcionou |
| **Retrospectiva** | Fim de cada sprint | Vitor Pantarotto | Todo risco materializado gera item de processo, como fizemos em 4.1 e 4.2 |
| **Daily assíncrona** | Diária, escrita | Cada integrante | Campo "risco observado" na mensagem. É onde o gatilho aparece primeiro, antes de doer |
| **Leitura na daily** | Diária, enquanto houver risco de exposição ≥ 15 | Vitor Pantarotto | Hoje: R-02 e R-05. Sai da leitura diária quando a exposição cair abaixo de 15 |

### 6.2 O que dispara revisão fora de hora

Qualquer um destes, no dia em que for observado — não na próxima cerimônia:

1. Um gatilho da seção 3 é acionado.
2. Um risco novo é identificado com exposição estimada ≥ 10.
3. Um risco se materializa, qualquer que seja a exposição.
4. Integrante sem sinal por 48h na semana de entrega (gatilho de R-03).
5. `main` vermelha por mais de 24h, ou Pages fora do ar (gatilho de R-05).
6. Card `Must` novo entra na sprint (gatilho de R-01) — escopo novo traz risco novo.
7. A disciplina muda data de entrega ou critério de avaliação: as datas do cronograma são
   premissa do grupo, e a matriz depende delas.
8. Defeito de severidade **bloqueador** aberto, conforme a escala de
   [`11-plano-de-testes.md`](11-plano-de-testes.md).

### 6.3 Como a mudança é registrada

- A alteração é feita **neste arquivo**, no mesmo PR da decisão que a causou. Não existe
  versão paralela em planilha: o histórico é o `git log`.
- Mudança de exposição precisa de duas assinaturas: o SM e o responsável do risco. Baixar
  probabilidade sem ação correspondente é o jeito mais comum de uma matriz de riscos virar
  ficção.
- Risco encerrado não é apagado: recebe status `Encerrado`, com a data e o motivo. A matriz
  precisa mostrar o que deixou de ser problema, e por que.

### 6.4 A única métrica acompanhada

**Quantos riscos foram detectados pelo gatilho antes de causar dano, sobre o total de riscos
materializados na sprint.** Meta do grupo: **acima de 70%**. Se um risco se materializa sem
o gatilho ter avisado, o problema é o gatilho — e corrigir o gatilho é item da retrospectiva,
com a mesma seriedade de um defeito bloqueador.
