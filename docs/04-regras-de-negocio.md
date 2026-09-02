# Regras de negócio

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Versão inicial: 25 regras `RN-001` a `RN-025` em 11 grupos, com os parâmetros do domínio centralizados, invariantes por regra e uma tabela final de rastreabilidade regra → requisito → caso de teste → arquivo de código |
| 1.1 | 2026-09-02 | CP5 | A tabela de rastreabilidade foi **refeita a partir do código**: agora aponta arquivo **e função**, e diz se existe teste. Quatro arquivos que ela citava **não existem** (`domain/event.ts`, `domain/feed.ts`, `domain/moderation.ts`, `domain/customQuestions.ts`) — as regras correspondentes foram reapontadas para onde de fato vivem, ou marcadas como sem implementação. Acrescentadas 4 regras que o CP5 criou (RN-026 a RN-029) e resolvida 1 contradição entre RN-019 e o código. A afirmação de abertura "toda regra aqui é verificada por teste automatizado" era falsa e foi corrigida: **16 das 29 regras têm teste próprio** e 6 têm teste parcial, e a tabela diz quais. RN-017 e RN-018 ganharam teste durante a própria conferência, e um defeito de **ordem** em `decideCheckIn` foi corrigido no código — a segunda leitura do mesmo QR devolvia `NAO_CONFIRMADA` em vez de `JA_UTILIZADO` com o horário |

Regras que o sistema faz valer **independentemente da tela**. Diferente de requisito
funcional (que descreve uma capacidade), regra de negócio descreve uma **restrição
invariante do domínio**: se o código permitir violá-la, é defeito.

Toda regra aqui **deve** ser implementada na camada de domínio (`app/src/domain/`) como
função pura, e não por validação de formulário — validação de formulário é conveniência,
regra de negócio é garantia. A cobertura por teste é o alvo, não o estado: a
[tabela de rastreabilidade](#rastreabilidade-regra--requisito--código--teste) diz, regra
por regra, o que tem teste hoje e o que não tem.

**Responsável:** Lucas Zolla · **Aprovação:** Ronaldo Veloso Filho (modelagem)
**Revisão de coerência com o código (CP5):** Lucas Baraldi

## Índice das regras

| Grupo | Regras |
|---|---|
| Alcance e visibilidade | RN-001, RN-002, RN-003 |
| Capacidade e vagas | RN-004, RN-005 |
| Lista de espera | RN-006, RN-007, RN-008 |
| Prazos | RN-009, RN-010, RN-011 |
| Pagamento e reembolso | RN-012, RN-013, RN-014 |
| Unicidade e integridade | RN-015, RN-016 |
| Check-in | RN-017, RN-018 |
| Feed e moderação | RN-019, RN-020 |
| Cancelamento de evento | RN-021, RN-022 |
| Papéis e permissões | RN-023, RN-024 |
| Perguntas customizadas | RN-025 |
| **Cobrança e leitura de ingresso** (acrescentado no CP5) | RN-026, RN-027, RN-028, RN-029 |

**Total: 29 regras.** As quatro últimas nasceram da implementação do CP5 — não estavam
previstas no CP4 porque só apareceram quando a cobrança e o leitor de QR foram
construídos. Ver [regras acrescentadas pelo CP5](#regras-acrescentadas-pelo-cp5).

### Parâmetros do domínio

Valores configuráveis por evento, com padrão do sistema. Estão centralizados em
`app/src/domain/policy.ts` para que nenhuma regra tenha número mágico espalhado.

| Parâmetro | Padrão | Faixa permitida |
|---|---|---|
| `PAYMENT_WINDOW_MINUTES` — janela para pagar após reservar | 60 min | 15 a 1440 min |
| `WAITLIST_OFFER_WINDOW_HOURS` — janela para confirmar vaga oferecida | 24 h | 2 a 72 h |
| `FULL_REFUND_DAYS_BEFORE` — antecedência para reembolso integral | 7 dias | 0 a 30 dias |
| `PARTIAL_REFUND_HOURS_BEFORE` — antecedência para reembolso parcial | 48 h | 0 a 168 h |
| `PARTIAL_REFUND_RATE` — percentual do reembolso parcial | 50% | 0 a 100% |
| `CHECKIN_OPENS_HOURS_BEFORE` — abertura do check-in | 4 h antes | 1 a 24 h |
| `CHECKIN_CLOSES_HOURS_AFTER` — encerramento do check-in | 2 h depois do fim | 0 a 12 h |
| `MAX_CUSTOM_QUESTIONS` — perguntas customizadas por evento | 5 | 0 a 5 |
| `MIN_CAPACITY` / `MAX_CAPACITY` | 2 / 2000 | — |

---

## Alcance e visibilidade

### RN-001 — O alcance do evento determina, sozinho, quem pode vê-lo

Um evento tem exatamente um `alcance` ∈ {`TURMA`, `CURSO`, `FACULDADE`} e exatamente
uma âncora coerente com ele:

| Alcance | Âncora obrigatória | Quem enxerga |
|---|---|---|
| `TURMA` | `turmaId` | Alunos vinculados àquela turma |
| `CURSO` | `cursoId` | Alunos de qualquer turma daquele curso |
| `FACULDADE` | `faculdadeId` | Todos os alunos verificados daquela faculdade |

**Invariantes.**

1. Preenchida exatamente uma âncora; as outras duas são nulas.
2. A âncora precisa pertencer à hierarquia do organizador: um aluno da turma 3ESPX não
   cria evento de `CURSO` de Sistemas de Informação.
3. A verificação de visibilidade acontece **no servidor**, em lista, detalhe, feed e
   acesso por ID direto. Esconder na UI não é cumprir a regra (RNF-012).
4. O organizador e os administradores do escopo sempre enxergam o próprio evento,
   mesmo em `rascunho`.

**Exceção deliberada:** participante que já tem participação ativa continua enxergando o
evento mesmo se perder o vínculo (ex.: trocou de turma). Perder acesso ao próprio
ingresso seria pior que a inconsistência.

> Requisitos: RF-011, RF-015, RF-016, RF-036 · Ver [ADR-0005](adr/0005-alcance-como-enum-com-ancora-condicional.md)

### RN-002 — Alcance não aumenta depois de publicado

Enquanto `rascunho`, o alcance é livre. Após a publicação:

- **Não pode ser ampliado** (`TURMA` → `CURSO` → `FACULDADE`). Ampliar expõe a
  inscritos um público diferente daquele com que concordaram, e no caso de evento pago
  altera a concorrência pelas vagas que já foram pagas.
- **Não pode ser reduzido** se existir participação ativa de alguém que ficaria fora do
  novo alcance. Reduzir significaria expulsar quem já tem vaga.
- Reduzir sem participação ativa incompatível é permitido, e notifica os inscritos.

Para mudar de alcance na prática, o caminho é cancelar o evento (RN-021) e criar outro.

> Requisitos: RF-011, RF-013

### RN-003 — Evento de alcance `FACULDADE` exige aprovação antes de publicar

Evento com alcance `FACULDADE` criado por um aluno comum nasce em `EM_APROVACAO` e só vai
para `PUBLICADO` após aprovação de um Admin de Faculdade. Enquanto isso, é visível apenas
para o organizador e para os administradores.

Motivo: alcance amplo é o único que permite atingir toda a instituição — sem freio, é
vetor de spam e de uso indevido do nome da faculdade.

**Não exige aprovação:** evento criado por quem já tem papel `ADMIN_FACULDADE`, e
eventos de alcance `TURMA` ou `CURSO` (o próprio alcance limita o dano).

> Requisitos: RF-041

---

## Capacidade e vagas

### RN-004 — A capacidade nunca é excedida

Seja `capacidade` a capacidade máxima do evento e `ocupadas` o número de participações em
estado que ocupa vaga (`PENDENTE_PAGAMENTO`, `CONFIRMADA`, `PRESENTE`):

```
ocupadas <= capacidade    (invariante que nunca pode ser violado)
vagasDisponiveis = capacidade - ocupadas
```

**Estados que ocupam vaga:** `PENDENTE_PAGAMENTO`, `CONFIRMADA`, `OFERTA_PENDENTE`,
`PRESENTE`.
**Estados que não ocupam:** `LISTA_ESPERA`, `CANCELADA`, `EXPIRADA`, `AUSENTE`.

`OFERTA_PENDENTE` ocupa vaga porque a vaga fica **reservada** para quem recebeu a oferta
durante toda a janela de confirmação (RN-007, item 3). Se não ocupasse, a vaga voltaria ao
pool e alguém poderia tomá-la antes de o primeiro da fila responder — recriando exatamente
o overbooking que esta regra proíbe. Implementado em `occupiesSpot()` de
`app/src/domain/capacity.ts`.

`PENDENTE_PAGAMENTO` ocupa vaga de propósito: reservar sem segurar a vaga permitiria
vender a mesma vaga duas vezes. O custo dessa escolha é a vaga presa até expirar, que a
janela curta de RN-012 limita.

A verificação e a criação da participação acontecem em **uma única operação atômica** —
transação no banco (CP6) ou seção crítica na camada mockada (CP5). Duas inscrições
simultâneas para a última vaga produzem exatamente uma confirmação (RNF-013).

> Requisitos: RF-019, RF-020

### RN-005 — Capacidade só diminui até o número de ocupadas

O organizador pode alterar a capacidade de evento publicado, com dois limites:

- **Aumentar** é sempre permitido; e dispara imediatamente a promoção da lista de espera
  (RN-006) para as vagas criadas.
- **Diminuir** é permitido apenas até `ocupadas`. Nunca se remove participação já
  aceita para caber na nova capacidade.

> Requisitos: RF-013, RF-025

---

## Lista de espera

### RN-006 — Evento lotado direciona para a lista de espera, não recusa

Quando `vagasDisponiveis = 0` e as inscrições estão abertas, a ação de inscrição vira
**entrar na lista de espera**. A participação nasce `LISTA_ESPERA` com
`posicaoFila = (maior posição atual) + 1`.

A fila é **FIFO por instante de entrada**. Não existe prioridade por perfil, por turma
nem por ter pagado antes.

> Requisitos: RF-024

### RN-007 — Vaga liberada é oferecida ao primeiro da fila, com janela de confirmação

Toda liberação de vaga (cancelamento, expiração de pagamento, aumento de capacidade)
dispara o processo:

1. Se a fila está vazia → a vaga fica disponível para inscrição normal.
2. Se há fila → a participação de menor `posicaoFila` passa de `LISTA_ESPERA` para
   `OFERTA_PENDENTE`, com `ofertaExpiraEm = agora + WAITLIST_OFFER_WINDOW_HOURS`, e o
   aluno é notificado.
3. A vaga fica **reservada** para essa oferta — não volta ao pool nem é oferecida a
   outra pessoa durante a janela.
4. As demais posições avançam em 1.
5. Se `ofertaExpiraEm` é posterior ao início do evento, a janela é truncada para
   `inicio - 1h`. Oferta que expira depois do evento não serve para nada.

**Confirmação** dentro da janela → `CONFIRMADA` (gratuito) ou `PENDENTE_PAGAMENTO`
(pago, iniciando a janela de RN-012).
**Não confirmação** → `EXPIRADA`, e o processo recomeça do passo 1 para o próximo da
fila (RN-008).

Apenas **uma** oferta por vaga liberada. Oferecer a mesma vaga a duas pessoas para
"garantir" o preenchimento cria overbooking — e é exatamente o problema que RN-004
proíbe.

> Requisitos: RF-025, RF-026

### RN-008 — Expiração da oferta passa a vez sem punição

Oferta expirada não elimina o aluno da fila por castigo, mas também não o devolve ao
início: sua participação fica `EXPIRADA` e, se quiser, ele entra na fila novamente — no
fim dela. Isso mantém a ordem justa para quem esperou.

Sair da fila voluntariamente (`CANCELADA`) faz as posições seguintes avançarem em 1.

> Requisitos: RF-026, RF-027

---

## Prazos

### RN-009 — Prazo de inscrição encerra as entradas, inclusive na fila

Cada evento tem `prazoInscricao` (data-hora). Depois dele:

- nenhuma nova participação é criada, nem `CONFIRMADA`, nem `LISTA_ESPERA`;
- ofertas **já emitidas** continuam válidas até sua própria expiração — quem estava na
  fila antes do prazo não perde o direito porque a fila andou depois;
- promoção da lista de espera **continua funcionando** após o prazo. O prazo limita
  entrada, não movimentação interna.

**Invariante:** `prazoInscricao <= inicio` do evento. Padrão, se não informado:
`inicio - 2h`.

> Requisitos: RF-023

### RN-010 — Prazo de cancelamento separa desistência de no-show

`prazoCancelamento` (padrão: `inicio - 24h`) delimita o cancelamento sem consequência.

- Antes do prazo: cancelamento livre, vaga liberada, reembolso conforme RN-013.
- Depois do prazo: o aluno **pode** cancelar (a vaga é liberada para a fila, o que é bom
  para o evento), mas **sem reembolso** e a participação é marcada com
  `canceladaAposPrazo = true` para o histórico do organizador.

**Invariante:** `prazoCancelamento <= inicio`.

> Requisitos: RF-021, RF-031

### RN-011 — Prazos são coerentes entre si

Validação obrigatória na criação e na edição do evento:

```
criadoEm < prazoInscricao <= inicio < fim
prazoCancelamento <= inicio
fim - inicio <= 7 dias
inicio > agora   (na criação; edição pode manter evento em andamento)
```

Evento que viola qualquer uma dessas desigualdades não é publicado.

> Requisitos: RF-010, RF-013

---

## Pagamento e reembolso

### RN-012 — Reserva paga tem janela curta e liberação automática

Em evento pago, a participação nasce `PENDENTE_PAGAMENTO` com
`pagamentoExpiraEm = min(agora + PAYMENT_WINDOW_MINUTES, prazoInscricao, inicio - 1h)`.

- A vaga fica ocupada durante a janela (RN-004).
- Pagamento confirmado dentro da janela → `CONFIRMADA`.
- Janela vencida sem confirmação → `EXPIRADA`, vaga liberada, fila acionada (RN-007).
- Pagamento que chega **depois** da expiração é automaticamente estornado; a vaga não é
  devolvida ao pagador porque pode já ter sido dada a outra pessoa. O aluno é notificado
  com o motivo e o valor do estorno.
- **A janela é recontada quando a cobrança é aberta** — ver RN-026, que o CP5 acrescentou.

> Requisitos: RF-028, RF-030

### RN-013 — Política de reembolso é conhecida antes da compra

Escala aplicada sobre o valor pago, tomando como referência a antecedência do
cancelamento em relação ao **início** do evento:

| Quando o aluno cancela | Reembolso | Estado do pagamento |
|---|---|---|
| Antes de `FULL_REFUND_DAYS_BEFORE` (padrão: 7 dias) | **100%** | `REEMBOLSO_SOLICITADO` → `REEMBOLSADO` |
| Entre 7 dias e `PARTIAL_REFUND_HOURS_BEFORE` (padrão: 48 h) | **50%** (`PARTIAL_REFUND_RATE`) | `REEMBOLSO_SOLICITADO` → `REEMBOLSADO_PARCIAL` |
| Menos de 48 h antes do início | **0%** | `CONFIRMADO` (sem alteração) |
| Qualquer momento, se o **organizador** cancelou o evento | **100%** | `REEMBOLSO_SOLICITADO` → `REEMBOLSADO` |
| Qualquer momento, se o organizador **alterou data, local ou preço** | **100%**, por opção do aluno, em até 48 h da notificação | `REEMBOLSO_SOLICITADO` → `REEMBOLSADO` |

A política é exibida na tela de pagamento **antes** da cobrança. Alterar a política de um
evento com pagamento confirmado é proibido — vale a política vigente no momento do
pagamento, gravada na participação.

> Requisitos: RF-031, RF-014, RF-013

### RN-014 — Confirmação de pagamento é idempotente e só o gateway confirma

1. Nenhuma ação de usuário marca pagamento como `CONFIRMADO`. Só a notificação do
   gateway (ou consulta ativa ao gateway) confirma.
2. A notificação carrega o identificador da transação. Reprocessar a mesma notificação N
   vezes produz **um** único pagamento confirmado e **uma** única transição de
   participação (RNF-014).
3. Notificação para participação em estado incompatível (já `CANCELADA`, `EXPIRADA`) não
   confirma nada: dispara o estorno de RN-012.
4. O Campus armazena apenas identificador da transação, método, valor e status. **Nenhum
   dado de cartão** entra no nosso banco (RNF-022).

> Requisitos: RF-029

---

## Unicidade e integridade

### RN-015 — Um aluno, uma participação ativa por evento

Existe no máximo uma participação em estado ativo (`PENDENTE_PAGAMENTO`, `CONFIRMADA`,
`LISTA_ESPERA`, `OFERTA_PENDENTE`, `PRESENTE`) para cada par (aluno, evento).

Estados terminais (`CANCELADA`, `EXPIRADA`, `AUSENTE`) não bloqueiam nova participação:
quem cancelou pode se inscrever de novo se houver vaga e prazo. O histórico é preservado
— não se apaga participação, cria-se outra.

No banco: índice único parcial sobre (`evento_id`, `usuario_id`) `WHERE status IN (...)`.

> Requisitos: RF-022

### RN-016 — Organizador não é participante automático

Criar um evento não inscreve o organizador. Se quiser participar, ele se inscreve como
qualquer outro e ocupa vaga — do contrário, o contador de vagas mentiria e o custo do
evento pago seria contornável por quem cria.

O organizador aparece na lista de presença apenas se tiver participação com check-in.

> Requisitos: RF-010, RF-019

---

## Check-in

### RN-017 — O QR Code é assinado, tem janela de validade e vale uma vez

O ingresso de uma participação `CONFIRMADA` carrega um token com:

```
payload  = participacaoId + eventoId + usuarioId + emitidoEm
assinatura = HMAC-SHA256(payload, chave do servidor)
```

**Condições para o check-in ser aceito** — todas obrigatórias, na ordem em que
`decideCheckIn` as verifica:

1. Quem lê é o organizador do evento ou um administrador do escopo;
2. Assinatura válida (token não adulterado);
3. `eventoId` do token igual ao evento em que a leitura está sendo feita;
4. **Evento não cancelado** — condição acrescentada no CP5 (ver abaixo);
5. Momento da leitura dentro de
   `[inicio - CHECKIN_OPENS_HOURS_BEFORE, fim + CHECKIN_CLOSES_HOURS_AFTER]`;
6. **Nenhuma presença já registrada** para essa participação (RN-018);
7. Participação em estado `CONFIRMADA` (não `CANCELADA`, não `EXPIRADA`).

Falha em qualquer condição → check-in recusado com **motivo específico** ("ingresso de
outro evento", "o check-in abre às 18h00", "ingresso já utilizado às 20h14"). Mensagem
genérica de erro na porta de um evento é problema operacional, não detalhe de UX.

**Correção do CP5 — eram 6 condições, são 7.** A implementação em
[`app/src/domain/checkin.ts`](../app/src/domain/checkin.ts) recusa também o evento
`CANCELADO`, com o motivo `EVENTO_CANCELADO` e a mensagem "Este evento foi cancelado: o
check-in está encerrado." A condição não estava no CP4 e **o código está certo**: sem ela,
um evento cancelado com ingressos já emitidos aceitaria presença.

**A ordem desta lista não é decorativa, e uma inversão nela foi corrigida no CP5.** A
permissão do operador vem primeiro porque é a checagem mais barata e a que não deve revelar
nada sobre o ingresso a quem não pode ler. A assinatura vem antes da janela para que token
forjado receba "ingresso inválido", e não "o check-in abre às 18h00" — que entregaria
informação do evento a quem apresentou um token falso.

E a **unicidade (6) precisa vir antes do status (7)**. A conferência de documentação do CP5
encontrou o inverso: como o check-in aceito muda a participação para `PRESENTE` na mesma
transação, verificar o status primeiro fazia a segunda leitura do mesmo QR devolver
`NAO_CONFIRMADA` — "Check-in já registrado." — em vez de `JA_UTILIZADO` com o horário do
primeiro check-in. O ramo que carrega o horário era inalcançável, e o horário é justamente
o que o organizador precisa saber na porta. **A ordem foi invertida no código**, e o teste
de regressão está nomeado como tal: `checkin.test.ts`, "unicidade responde ANTES do status
— regressão do defeito de RN-018".

> Requisitos: RF-033, RF-034 · RNF-011

### RN-018 — Presença é fato registrado uma vez, e imutável

Ao aceitar o check-in, cria-se uma `Presenca` com `checkinEm`, `registradoPorId` e
`participacaoId`, e a participação vai para `PRESENTE`.

- Relação 1:1 estrita com participação — restrição única no banco.
- Presença não é editada nem apagada. Erro operacional é corrigido por uma nova
  presença com `motivoCorrecao` registrado, preservando a trilha.
- Participação `CONFIRMADA` sem presença até `fim + CHECKIN_CLOSES_HOURS_AFTER` vira
  `AUSENTE` — é o dado que alimenta a taxa de comparecimento.

> Requisitos: RF-034, RF-035

---

## Feed e moderação

### RN-019 — Publica no feed do evento quem esteve no evento

Direito de publicar em um evento: participações com presença registrada (`PRESENTE`) e o
organizador do evento. Isso mantém o feed como memória do que aconteceu, e não como
mural de quem só se inscreveu.

- Antes do início do evento, apenas o organizador publica (arte, aviso, chamada).
- A publicação herda a visibilidade do evento (RN-001): quem não vê o evento não vê a
  publicação. **A verificação de alcance vale também na escrita**, não só na leitura: sem
  ela, um `POST` direto publicaria em evento invisível.
- Não há publicação sem evento associado. Feed geral solto seria rede social — está
  fora de escopo (RFX-01, RFX-02).

#### Contradição encontrada no CP5 — três regras para a mesma coisa

Ao conferir esta regra contra o código, apareceram **três critérios diferentes** de quem
pode publicar, os três em vigor ao mesmo tempo:

| Onde | Critério aplicado |
|---|---|
| Este documento (CP4) e [`domain/permissions.ts#canPostToEvent`](../app/src/domain/permissions.ts) | Organizador sempre; qualquer outro só se `PRESENTE` **e** o evento já começou |
| `GET /feed/eventos-publicaveis` em [`handlersCp5.ts`](../app/src/mocks/handlersCp5.ts) | Organizador, ou participação `CONFIRMADA` **ou** `PRESENTE` |
| `POST /publicacoes` em `handlersCp5.ts` | Organizador, ou **qualquer participação ativa** — o que inclui `LISTA_ESPERA`, `PENDENTE_PAGAMENTO` e `OFERTA_PENDENTE`, via `isActive()` |

**Qual venceu, e por quê.** O critério normativo continua sendo o desta regra e de
`canPostToEvent`: **`PRESENTE` ou organizador**. Ele venceu por três razões: é o que
sustenta a proposta de valor declarada ("memória do evento", não mural de inscritos); é o
único dos três que está escrito como função pura de domínio, testável e reusável pelo
servidor do CP6; e é o mais restritivo — afrouxar depois é decisão de produto, apertar
depois é retirar direito de quem já publicou.

**Consequência: o código dos dois endpoints está errado**, e de duas formas diferentes.
A mais grave é a de `POST /publicacoes`, que aceita `LISTA_ESPERA`: alguém que **nunca
teve vaga** pode publicar no feed do evento por requisição direta, e o endpoint que lista
os eventos publicáveis nem oferece essa opção na interface. A correção é os dois endpoints
chamarem `canPostToEvent`, que já existe e é justamente a função que ninguém chamou —
`canPostToEvent` não tem nenhum consumidor em todo o `app/src/`. Registrado para a lane do
domínio decidir; este documento não muda a regra para acomodar o defeito.

> Requisitos: RF-036, RF-037

### RN-020 — Moderação tem autor, motivo e registro

Podem remover publicação ou comentário:

| Quem | Alcance da moderação |
|---|---|
| Autor da publicação | A própria publicação |
| Organizador do evento | Qualquer publicação daquele evento |
| Admin de Curso | Publicações de eventos de alcance `TURMA` e `CURSO` do seu curso |
| Admin de Faculdade | Qualquer publicação da faculdade |

Remoção exige **motivo** e grava autor e horário. Conteúdo removido não aparece no feed,
mas é retido por 90 dias para contestação, e depois eliminado — atende à necessidade de
apuração sem virar arquivo permanente de conteúdo removido (RNF-020, RNF-021).

> Requisitos: RF-042

---

## Cancelamento de evento

### RN-021 — Cancelar evento exige motivo e é irreversível

O organizador (ou admin do escopo) cancela um evento `PUBLICADO`, sempre com motivo
textual. `status` vai para `CANCELADO`, estado **terminal**: não existe "descancelar" —
o caminho é duplicar o evento (RF-018) e publicar de novo, para que ninguém fique
inscrito em um evento que ressuscitou com condições diferentes.

Após o cancelamento: sem novas inscrições, sem check-in, sem novas publicações. O evento
continua visível para quem participava, com o motivo do cancelamento — desaparecer sem
explicação é pior que aparecer cancelado.

> Requisitos: RF-014

### RN-022 — O que acontece com as participações quando o evento é cancelado

Efeito em cascata, aplicado em uma única operação:

| Estado antes | Estado depois | Pagamento | Notificação |
|---|---|---|---|
| `CONFIRMADA` | `CANCELADA` (`motivo = EVENTO_CANCELADO`) | `CONFIRMADO` → `REEMBOLSO_SOLICITADO` (100%, RN-013) | Sim, com motivo do organizador |
| `PENDENTE_PAGAMENTO` | `CANCELADA` | Cobrança pendente é invalidada no gateway; pagamento que chegar depois é estornado | Sim |
| `LISTA_ESPERA` | `CANCELADA` | — | Sim |
| `OFERTA_PENDENTE` | `CANCELADA` | — | Sim, oferta invalidada |
| `PRESENTE` | **preservada** | Sem reembolso automático | Sim |

Presença registrada nunca é revertida por cancelamento de evento: o fato aconteceu.
Cancelar um evento já ocorrido é operação de administrador, com justificativa, e não
apaga presenças — apenas encerra o evento para novas ações.

> Requisitos: RF-014

---

## Papéis e permissões

### RN-023 — "Organizador" é papel por evento, não tipo de usuário

Todo usuário é um `Usuario` com vínculo acadêmico. `Organizador` é a relação entre um
usuário e um evento que ele criou — não uma subclasse, não um cadastro à parte, não uma
permissão global.

Consequências: qualquer aluno pode organizar; ninguém "vira organizador" no sistema; e
as permissões de organizador só valem no evento em questão.

Papéis administrativos (`ADMIN_CURSO`, `ADMIN_FACULDADE`) são atribuições explícitas
sobre um escopo, cumulativas com o papel de aluno.

> Ver [ADR-0004](adr/0004-participacao-como-entidade-propria.md)

### RN-024 — Matriz de permissões

| Ação | Aluno | Aluno no alcance | Organizador do evento | Admin de Curso | Admin de Faculdade |
|---|---|---|---|---|---|
| Ver evento | — | ✅ | ✅ | ✅ (do seu curso) | ✅ |
| Criar evento `TURMA` / `CURSO` | ✅ (no próprio vínculo) | ✅ | ✅ | ✅ | ✅ |
| Criar evento `FACULDADE` | ✅ (vai para `EM_APROVACAO`) | ✅ | ✅ | ✅ (aprovação necessária) | ✅ (publica direto) |
| Editar / cancelar evento | — | — | ✅ | ✅ (do seu curso) | ✅ |
| Aprovar evento `FACULDADE` | — | — | — | — | ✅ |
| Inscrever-se | — | ✅ | ✅ (como qualquer um) | ✅ | ✅ |
| Cancelar inscrição de outro | — | — | — | ✅ (com motivo) | ✅ (com motivo) |
| Validar check-in | — | — | ✅ | ✅ | ✅ |
| Ver lista de presença | — | — | ✅ | ✅ | ✅ |
| Publicar no feed do evento | — | ✅ se `PRESENTE` | ✅ | ✅ | ✅ |
| Remover publicação | ✅ (a própria) | ✅ (a própria) | ✅ (do seu evento) | ✅ (do seu curso) | ✅ |
| Gerenciar turmas e códigos | — | — | — | ✅ (do seu curso) | ✅ |

> Requisitos: RF-041, RF-042, RF-043 · RNF-012

---

## Perguntas customizadas

### RN-025 — Pergunta customizada nunca bloqueia a reserva da vaga

O organizador define até `MAX_CUSTOM_QUESTIONS` (padrão: 5) perguntas respondidas na
inscrição. A ordem é obrigatória e não negociável:

1. a vaga é reservada (participação criada, RN-004);
2. **depois** as perguntas são apresentadas.

Se o aluno abandonar o formulário de perguntas, a vaga continua reservada e as respostas
ficam pendentes — o organizador vê "3 respostas pendentes" em vez de perder o inscrito.
Abandonar as perguntas não cancela a participação.

Respostas pendentes não impedem confirmação, pagamento nem check-in. Pergunta adicionada
depois que já existem inscritos só vale para inscrições novas: ninguém é reaberto para
responder.

**Invariantes.** Uma resposta por (participação, pergunta). Pergunta com
`obrigatoria = true` bloqueia apenas o envio do formulário de perguntas, nunca a reserva.

> Requisitos: RF-017 · Ver ponto de atrito 2 em [`01-problema-e-personas.md`](01-problema-e-personas.md)

---

## Regras acrescentadas pelo CP5

Quatro regras que **não estavam previstas no CP4**. Nenhuma delas é refinamento cosmético:
cada uma responde a uma pergunta que só apareceu quando a cobrança e o leitor de QR foram
construídos, e cada uma já está em vigor no código.

### RN-026 — A janela de pagamento conta a partir da abertura da cobrança

RN-012 diz que a participação nasce com `pagamentoExpiraEm`. O CP5 mostrou que isso, só,
pune o aluno: entre reservar a vaga e escolher Pix ou cartão passa tempo real — escolher o
método, ler a política de reembolso, decidir. Se o relógio começasse na reserva, parte da
janela de 60 minutos seria consumida antes de existir um código para pagar.

**Regra.** Ao abrir a cobrança, `pagamentoExpiraEm` é **recalculado** com
`paymentDeadline(evento, agora)` — os mesmos três limites de RN-012
(`min(agora + PAYMENT_WINDOW_MINUTES, prazoInscricao, inicio - 1h)`), aplicados no momento
da abertura. O relógio da vaga começa quando existe algo a pagar, não quando a vaga é
reservada.

**Limite deliberado.** Os outros dois termos do `min` não se movem: reabrir a cobrança não
estende a janela para além do prazo de inscrição nem para dentro do evento. Sem isso, um
aluno reabriria a cobrança indefinidamente e seguraria a vaga para sempre.

> Requisitos: RF-028 · Implementado em `POST /participacoes/:id/pagamento`
> ([`handlersCp5.ts`](../app/src/mocks/handlersCp5.ts)) sobre
> `domain/payment.ts#paymentDeadline`

### RN-027 — A cobrança é idempotente por participação

Abrir a cobrança duas vezes para a mesma participação, no mesmo método, devolve **a mesma
cobrança** — não cria a segunda.

Motivo concreto: um duplo toque no botão geraria dois códigos Pix para a mesma vaga, e o
aluno pagaria um dos dois. O outro ficaria `AGUARDANDO`, e a confirmação do gateway
chegaria para uma cobrança que ninguém pagou. Um pagamento de verdade e um fantasma
disputando a mesma vaga é pior que um erro visível.

**Invariantes.**

1. No máximo **uma** cobrança `AGUARDANDO` por participação.
2. Trocar de método (Pix → cartão) **substitui** a cobrança, reaproveitando o mesmo `id`
   e o mesmo `transacaoExternaId` — não acumula duas.
3. Cada cobrança carrega `chaveIdempotencia = idempotencyKey(participacaoId,
   transacaoExternaId)`, que é o que torna a notificação do gateway idempotente (RN-014).
4. Abrir cobrança para participação que não está `PENDENTE_PAGAMENTO` é recusado com
   `409` — e a mensagem distingue "já está confirmada" de "não aguarda pagamento".

> Requisitos: RF-028, RF-029 · RNF-014 · Implementado em
> `POST /participacoes/:id/pagamento` sobre `domain/payment.ts#idempotencyKey`

### RN-028 — O payload Pix é derivado, nunca armazenado

O BR Code (copia-e-cola e QR) **não é gravado**. Ele é recalculado a cada leitura por
`gerarCobrancaPix({ valor, referencia, expiraEm })`, que é determinístico sobre esses três
campos — a mesma entrada produz sempre o mesmo BR Code, com o mesmo CRC-16.

Motivo: BR Code armazenado é dado derivado. Na primeira alteração de preço ou de prazo,
o payload guardado passa a discordar do valor que o sistema cobra — e quem paga, paga o
valor errado com a bênção do banco de dados. Dado derivado que pode divergir da fonte não
deve existir em duas cópias.

**Consequência de projeto:** o Pix só é montado quando `metodo === 'PIX'` **e**
`status === 'AGUARDANDO'`. Cobrança confirmada, recusada ou estornada não tem payload — não
há como pagar de novo por acidente.

> Requisitos: RF-028 · RNF-022 · Implementado em `handlersCp5.ts#toPagamentoView` sobre
> `domain/pix.ts#gerarCobrancaPix`

### RN-029 — As três formas de leitura do ingresso convergem para a mesma decisão

O leitor do organizador aceita três entradas, porque na porta do evento as três aparecem:

| Forma | Origem | Exemplo |
|---|---|---|
| `TOKEN` | câmera lendo o QR | `campus.v1.<payload base64url>.<assinatura>` |
| `CODIGO_NUMERICO` | digitado, 8 dígitos | `40718204` |
| `CODIGO_LEGIVEL` | impresso no ingresso | `CMP-3ESPX-0184` |

**Regra.** `classificarLeitura` decide qual das três é (ou `INDECIFRAVEL`), e as três
desembocam **na mesma chamada a `decideCheckIn`**, com as mesmas 7 condições de RN-017.
Nenhuma forma de leitura tem caminho próprio de decisão, e nenhuma é privilegiada: o
código digitado não é um atalho que pula verificação.

**Por que os códigos são derivados, e não armazenados.** `numericCheckInCode(participacaoId)`
e o sufixo do código legível são funções do id da participação. Não existe tabela de
códigos para ficar dessincronizada, e a busca na porta é por derivação — não há como um
código válido apontar para participação errada.

**Invariante:** leitura `INDECIFRAVEL` é recusada como `TOKEN_INVALIDO`, nunca ignorada em
silêncio. Na porta, "não entendi o que você leu" e "este ingresso não vale" precisam ser a
mesma resposta visível.

> Requisitos: RF-034 · RNF-011 · Implementado em
> [`domain/ticketToken.ts#classificarLeitura`](../app/src/domain/ticketToken.ts) e no
> handler `POST /eventos/:id/checkin`

---

## Rastreabilidade: regra → requisito → código → teste

Refeita em **2026-09-02** lendo cada arquivo e cada teste. As colunas significam:

- **Vive em** — arquivo e função que implementam a regra. Onde diz "sem implementação", não
  existe código: nem arquivo, nem função.
- **Chamado por** — o que na aplicação executa a função. `—` significa que a função existe
  e não tem consumidor: a regra está pronta e ninguém a usa ainda.
- **Teste** — arquivo de teste real que exercita a regra, com o `CT` do
  [plano de testes](11-plano-de-testes.md). "Sem teste" é literal.

| Regra | Requisitos | Vive em | Chamado por | Teste |
|---|---|---|---|---|
| RN-001 | RF-011, RF-015, RF-036 | `domain/visibility.ts#canSee`, `#ancoraCoerente`, `#ancoraDoEvento` | `handlers.ts` (lista, detalhe, inscrição, fila), `support.ts#eventosVisiveis`, `handlersCp5.ts` (publicação, comentário) | ✅ `visibility.test.ts` — CT-011 e CT-012: 11 casos de `canSee` (incluindo acesso por ID direto e perda de vínculo com participação ativa) e 6 de `ancoraCoerente`; mais `inscricao.test.ts` CT-012 pela API |
| RN-002 | RF-011, RF-013 | Alcance: `domain/visibility.ts#canChangeScope`. Domínio institucional: `domain/auth.ts#dominioInstitucional` e `#decideLogin` | `canChangeScope`: — (RF-013 é CP6). `decideLogin`: `POST /auth/login` | ✅ `visibility.test.ts` CT-013 (5 casos) e `auth.test.ts` (11 casos, incluindo subdomínio aceito, sufixo parecido recusado e a ordem das recusas — domínio antes de senha) |
| RN-003 | RF-041 | Aprovação de evento `FACULDADE`: `domain/permissions.ts#requiresApproval` e `#canApproveCollegeEvent`. Vínculo por código de convite: `domain/auth.ts#decideOnboarding` e `#normalizaCodigo` | `requiresApproval`: `POST /eventos`. `decideOnboarding`: `POST /auth/onboarding`. `canApproveCollegeEvent`: — | ⚠️ Parcial: ✅ o vínculo por código está bem coberto — `auth.test.ts` testa código de outro curso, código inexistente, turma de período encerrado e tolerância a espaço/hífen/caixa; `visibility.test.ts` CT-014 cobre a **visibilidade** do `EM_APROVACAO`. ❌ `requiresApproval` e `canApproveCollegeEvent` não têm teste |
| RN-004 | RF-019, RF-020 | `domain/capacity.ts#occupiesSpot`, `#availableSpots`, `#isFull` | `handlers.ts` (inscrição e cancelamento, dentro de `transaction`), `support.ts` | ✅ `capacity.test.ts` — CT-001, CT-002 e `inscricao.test.ts` CT-020 (50 concorrentes) |
| RN-005 | RF-013, RF-025 | `domain/capacity.ts#canChangeCapacity`, `#spotsOpenedByCapacityChange` | — (RF-013 é CP6) | ✅ `capacity.test.ts` — CT-021 (5 casos) |
| RN-006 | RF-024 | `domain/waitlist.ts#nextWaitlistPosition`, `#orderedWaitlist`, `#waitlistSize` | `handlers.ts` (`POST /eventos/:id/lista-espera`), `support.ts` | ✅ `waitlist.test.ts` — CT-003 (4 casos) e `inscricao.test.ts` CT-003 |
| RN-007 | RF-025, RF-026 | `domain/waitlist.ts#planPromotion`, `#offerDeadline`, `#recomputePositions` | `handlers.ts` (`DELETE /participacoes/:id`) | ✅ `waitlist.test.ts` — CT-004, CT-005 (7 casos) e `inscricao.test.ts` CT-004, CT-005 |
| RN-008 | RF-026, RF-027 | `domain/waitlist.ts#offerExpired`, `#recomputePositions` | `recomputePositions`: `DELETE /participacoes/:id`. `offerExpired`: — | ✅ `waitlist.test.ts` — CT-006 (3 casos) |
| RN-009 | RF-023 | `domain/deadlines.ts#enrollmentOpen` | `handlers.ts` (inscrição e fila), `support.ts`, `domain/eventAction.ts` | ✅ `eventAction.test.ts` CT-015 e `inscricao.test.ts` (via handler) |
| RN-010 | RF-021, RF-031 | `domain/deadlines.ts#withinCancellationWindow` | `handlers.ts` (`DELETE`, grava `canceladaAposPrazo`) | ⚠️ Sem teste direto de `withinCancellationWindow`. O efeito é coberto indiretamente por `refund.test.ts` CT-008 |
| RN-011 | RF-010, RF-013 | `domain/deadlines.ts#validateDeadlines`, `#defaultDeadlines`; `domain/capacity.ts#isValidCapacity`; `domain/eventSchema.ts` **chama** `validateDeadlines` | `CriarEventoPage.tsx` (via `eventFormSchema`) | ⚠️ Parcial: `capacity.test.ts` cobre `isValidCapacity` no bloco "faixa permitida (RN-011)" — sem `CT` associado no plano de testes; `validateDeadlines` e `eventSchema.ts` **não têm teste** (`eventSchema.ts` tem 0% de cobertura) |
| RN-012 | RF-028, RF-030 | `domain/payment.ts#paymentDeadline`, `#paymentExpired`, `#minutesLeftToPay` | `paymentDeadline`: inscrição, confirmação de oferta e abertura de cobrança. `minutesLeftToPay`: `toPagamentoView`. `paymentExpired`: — | ✅ `payment.test.ts` — CT-007 (7 casos, incluindo os três limites do `min`) |
| RN-013 | RF-031, RF-014, RF-013 | `domain/refund.ts#computeRefund`, `#currentPolicy`, `#policySummary` | `currentPolicy`: inscrição e confirmação de oferta (congela a política). `policySummary`: `EventoDetalhePage.tsx`. `computeRefund`: — | ✅ `refund.test.ts` — CT-008, CT-009 (11 casos, incluindo arredondamento de centavo) |
| RN-014 | RF-029 | `domain/payment.ts#planWebhook`, `#idempotencyKey` | `handlersCp5.ts` (`POST /pagamentos/:id/simular`) | ✅ `payment.test.ts` — CT-010 (7 casos, incluindo notificação repetida e valor divergente) |
| RN-015 | RF-022 | `domain/participation.ts#isActive`, `#isTerminal`, `#findActiveParticipation` | `handlers.ts` (inscrição, fila, cancelamento), `handlersCp5.ts` (publicação), `support.ts` | ✅ `participation.test.ts` — CT-018 (6 casos: 3 de `isActive`/`isTerminal` e 3 de `findActiveParticipation`) e `inscricao.test.ts` CT-018 pela API |
| RN-016 | RF-010, RF-019 | `domain/participation.ts#organizerIsParticipant`; a garantia efetiva é `ocupadas: 0` no `POST /eventos` | `organizerIsParticipant`: — | ✅ `participation.test.ts` — CT-019 (3 casos) |
| RN-017 | RF-033, RF-034 | `domain/checkin.ts#decideCheckIn`; janela em `domain/deadlines.ts#checkInWindow` e `#checkInOpen`; assinatura em `domain/ticketToken.ts#assinaturaValida` e `#lerToken` | `handlersCp5.ts` (`POST /eventos/:id/checkin`), `IngressoPage.tsx` (janela), `CheckinPage.tsx` (leitor) | ✅ **Bem coberta, e foi a última a ficar.** `checkin.test.ts` testa o caminho aceito, **cada uma das 7 condições com o seu motivo**, a **ordem** entre elas (5 casos, incluindo a regressão da inversão corrigida) e a mensagem própria de cada status de participação. `ticketToken.test.ts` cobre a assinatura: corpo adulterado, assinatura trocada, outro emissor e payload incompleto. Cobertura: `checkin.ts` **99,07% de linhas e 100% de funções**, `ticketToken.ts` 98,44% |
| RN-018 | RF-034, RF-035 | Verificação em `domain/checkin.ts#decideCheckIn` (condição 6); escrita da `Presenca` em `handlersCp5.ts`; consulta em `mocks/db.ts#presencaDaParticipacao` | `handlersCp5.ts` (check-in e painel) | ⚠️ **Parcial.** ✅ A unicidade está testada, com teste de regressão nomeado: "unicidade responde ANTES do status — regressão do defeito de RN-018", e "ingresso já utilizado diz a que hora foi usado". ❌ A transição para `AUSENTE` **não tem implementação nenhuma**: nenhum código escreve esse estado, e a taxa de comparecimento depende dele. Fica para o CP6, junto com as outras rotinas de tempo |
| RN-019 | RF-036, RF-037 | `domain/permissions.ts#canPostToEvent` | ❌ **Nada.** `canPostToEvent` não tem nenhum consumidor; os dois endpoints do feed aplicam critérios próprios e divergentes — ver a [contradição](#contradição-encontrada-no-cp5--três-regras-para-a-mesma-coisa) | ⚠️ `eventAction.test.ts` cobre o **botão** "quem fez check-in pode publicar foto (RN-019)"; `canPostToEvent` em si não tem teste |
| RN-020 | RF-042 | `domain/permissions.ts#canRemovePost`; campos `removida`, `motivoRemocao`, `removidaPorId` em `types/domain.ts` | Filtro de conteúdo removido: `GET /feed` e `toPublicacaoView`. `canRemovePost`: — | ❌ Sem teste. RF-042 é CP6 |
| RN-021 | RF-014 | **Sem implementação.** O estado `CANCELADO` existe em `types/domain.ts` e é respeitado por `resolvePrimaryAction`, `decideCheckIn`, `canPostToEvent` e pela inscrição; a **ação** de cancelar não existe | Consumo do estado: inscrição, botão principal, check-in | ✅ do estado: `eventAction.test.ts` CT-027 e `inscricao.test.ts` CT-027. Da ação: não há o que testar |
| RN-022 | RF-014 | **Sem implementação.** Nenhum código aplica a cascata de estados do cancelamento de evento | — | ❌ Sem teste. RF-014 é CP6 |
| RN-023 | — | `types/domain.ts` (`Evento.organizadorId`, sem tipo de usuário "organizador"); `domain/permissions.ts#isOrganizer` | `isOrganizer`: `canValidateCheckIn`, `canPostToEvent`, `canRemovePost`, `canEditEvent`, `canCancelEvent` | ✅ Indireto: `participation.test.ts` CT-029 e `visibility.test.ts` CT-011 ("o organizador sempre vê o próprio evento") |
| RN-024 | RF-041, RF-042, RF-043 | `domain/permissions.ts` — **12 funções exportadas** (`isOrganizer`, `isCourseAdmin`, `isCollegeAdmin`, `isAdminOfScope`, `canEditEvent`, `canCancelEvent`, `canApproveCollegeEvent`, `canValidateCheckIn`, `canViewAttendanceList`, `requiresApproval`, `canRemovePost`, `canPostToEvent`) | Só **2 das 12** são chamadas pela aplicação: `canValidateCheckIn` (check-in e painel) e `requiresApproval` (`POST /eventos`). `isOrganizer` e `isAdminOfScope` rodam, mas chamadas por outras funções do próprio módulo — não por um handler | ❌ **Sem teste.** Não existe `permissions.test.ts`; cobertura medida de `permissions.ts`: 18,18%. A matriz de permissões é a regra com mais superfície e menos prova |
| RN-025 | RF-017 | **Sem implementação.** Só o parâmetro `POLICY.MAX_CUSTOM_QUESTIONS` existe | — | ❌ Sem teste. RF-017 é CP6 |
| RN-026 | RF-028 | `handlersCp5.ts` (`POST /participacoes/:id/pagamento`) sobre `domain/payment.ts#paymentDeadline` | O próprio handler | ⚠️ `payment.test.ts` CT-007 cobre `paymentDeadline`; o **recálculo na abertura** não tem teste |
| RN-027 | RF-028, RF-029 | `handlersCp5.ts` (`POST /participacoes/:id/pagamento`) sobre `domain/payment.ts#idempotencyKey` | O próprio handler | ⚠️ `payment.test.ts` cobre `idempotencyKey`; a **idempotência do endpoint** não tem teste |
| RN-028 | RF-028 | `handlersCp5.ts#toPagamentoView` sobre `domain/pix.ts#gerarCobrancaPix` | O próprio handler, em toda leitura de cobrança | ✅ `pix.test.ts` — o **determinismo** está testado ("a mesma entrada devolve o mesmo BR Code"), com o CRC-16 conferido contra o valor de referência do padrão EMV, o campo `6304` e a sanitização do `txid`. `pix.ts` em **100%** de linhas |
| RN-029 | RF-034 | `domain/ticketToken.ts#classificarLeitura`, `#emitirToken`, `#lerToken` e `#montarIngresso`; `domain/checkin.ts#numericCheckInCode`, `#ticketCode` | `handlersCp5.ts` (`POST /eventos/:id/checkin`), `IngressoPage.tsx`, `CheckinPage.tsx` | ✅ `ticketToken.test.ts` — as **três formas** são reconhecidas e a quarta (`INDECIFRAVEL`) também; `montarIngresso` "devolve as três formas do mesmo ingresso" e é estável entre emissões. O que **não** está testado é a convergência das três para a mesma decisão, porque essa parte vive no handler e em `decideCheckIn`, que não tem teste |

### Resumo da rastreabilidade

Duas perguntas independentes, cada uma com a sua contagem. Uma regra pode ter teste e não
ter consumidor, e vice-versa — por isso são dois quadros e não um.

**A regra tem teste que exercita a própria função?**

| Situação | Qtd. | Quais |
|---|---|---|
| ✅ Sim | 16 | RN-001, RN-002, RN-004, RN-005, RN-006, RN-007, RN-008, RN-009, RN-012, RN-013, RN-014, RN-015, RN-016, RN-017, RN-028, RN-029 |
| ⚠️ Parcial — testa parte da regra, não a regra toda | 6 | RN-003 (código de convite sim, aprovação de `FACULDADE` não), RN-011 (só `isValidCapacity`), RN-018 (unicidade sim, transição para `AUSENTE` sem implementação), RN-019 (só o botão), RN-021 (só o estado `CANCELADO`), RN-023 (só indiretamente) |
| ❌ Nenhum teste | 7 | RN-010, RN-020, RN-022, RN-024, RN-025, RN-026, RN-027 |
| **Total** | **29** | 16 + 6 + 7 = 29 |

**A regra é executada por algum código da aplicação?**

| Situação | Qtd. | Quais |
|---|---|---|
| ✅ Sim, um handler ou uma tela a chama | 25 | RN-001, RN-002, RN-003, RN-004, RN-006, RN-007, RN-008, RN-009, RN-010, RN-011, RN-012, RN-013, RN-014, RN-015, RN-016, RN-017, RN-018, RN-020, RN-021, RN-023, RN-024, RN-026, RN-027, RN-028, RN-029 |
| ❌ Não — a função existe e ninguém a chama, ou não existe função | 4 | RN-005 (`canChangeCapacity`), RN-019 (`canPostToEvent`), RN-022 e RN-025 (sem função) |
| **Total** | **29** | 25 + 4 = 29 |

> **A frase de abertura do CP4 era falsa.** Ela dizia que toda regra deste documento "é
> verificada por teste automatizado". São **16 de 29** com teste próprio, mais 6 com teste
> parcial. A frase foi reescrita no topo do documento para dizer o que é verdade: teste é o
> alvo, e esta tabela é o placar. Documentação que afirma cobertura que não existe é pior
> que documentação omissa, porque desencoraja quem iria conferir.
>
> Vale registrar que esta tabela **melhorou durante o próprio CP5**. Quando a conferência
> começou, RN-017 e RN-029 não tinham nenhum teste e `checkin.ts` estava em 3,7% de
> cobertura; ao fim, RN-017 tem as 7 condições e a ordem entre elas testadas, e `checkin.ts`
> está em 99,07%. Foi a tabela que mostrou onde faltava — e é para isso que ela existe.

### As quatro lacunas que este levantamento expôs

1. **Resolvida durante o CP5, e vale registrar como resolvida.** `domain/checkin.ts` e
   `domain/ticketToken.ts` começaram a conferência em **3,7%** e **6,81%** de cobertura,
   sem um único teste, sustentando RN-017, RN-018, RN-029 e RNF-011. Terminaram em
   **99,07%** e **98,44%**, com as 7 condições, a ordem entre elas e a assinatura testadas
   — e com um defeito de ordem corrigido no caminho. Era a lacuna que mais pesava.
2. **`domain/permissions.ts` não tem teste** — 18,18% de linhas e **0% de funções** — e só
   2 das suas 12 funções são chamadas pela aplicação. RN-024 é a regra com mais superfície
   e menos prova, e é o maior peso isolado no limite de funções de RNF-015. É a lacuna que
   mais pesa **agora**.
3. **`canPostToEvent` não tem consumidor**, e os dois endpoints do feed aplicam critérios
   diferentes entre si e diferentes de RN-019. É a única contradição *ativa* encontrada.
4. **Quatro regras citavam arquivos inexistentes** no CP4: `domain/event.ts`,
   `domain/feed.ts`, `domain/moderation.ts` e `domain/customQuestions.ts`. Nenhum foi
   criado; as regras foram reapontadas para onde vivem de fato (RN-002 e RN-003 em
   `visibility.ts` e `permissions.ts`, RN-019 e RN-020 em `permissions.ts`) ou marcadas
   como sem implementação (RN-021, RN-022, RN-025). Uma tabela de rastreabilidade que
   aponta para arquivo que não existe é pior que nenhuma, porque parece conferida.

<!-- Tabela original do CP4, preservada para comparação de revisão. -->

### Rastreabilidade como estava no CP4

Mantida abaixo, sem alteração, porque a diferença entre as duas tabelas **é** o resultado
desta revisão. A coluna "Implementação" é a que mais mudou.

| Regra | Requisitos | Caso de teste (Gherkin em [`11-plano-de-testes.md`](11-plano-de-testes.md)) | Implementação |
|---|---|---|---|
| RN-001 | RF-011, RF-015, RF-036 | CT-011, CT-012 | `domain/visibility.ts` |
| RN-002 | RF-011, RF-013 | CT-013 | `domain/event.ts` |
| RN-003 | RF-041 | CT-014 | `domain/event.ts` |
| RN-004 | RF-019, RF-020 | CT-001, CT-002, CT-020 | `domain/capacity.ts` |
| RN-005 | RF-013 | CT-021 | `domain/capacity.ts` |
| RN-006 | RF-024 | CT-003 | `domain/waitlist.ts` |
| RN-007 | RF-025 | CT-004, CT-005 | `domain/waitlist.ts` |
| RN-008 | RF-026, RF-027 | CT-006 | `domain/waitlist.ts` |
| RN-009 | RF-023 | CT-015 | `domain/deadlines.ts` |
| RN-010 | RF-021, RF-031 | CT-016 | `domain/deadlines.ts` |
| RN-011 | RF-010 | CT-017 | `domain/eventSchema.ts` |
| RN-012 | RF-028, RF-030 | CT-007 | `domain/payment.ts` |
| RN-013 | RF-031 | CT-008, CT-009 | `domain/refund.ts` |
| RN-014 | RF-029 | CT-010 | `domain/payment.ts` |
| RN-015 | RF-022 | CT-018 | `domain/participation.ts` |
| RN-016 | RF-010, RF-019 | CT-019 | `domain/participation.ts` |
| RN-017 | RF-033, RF-034 | CT-022, CT-023 | `domain/checkin.ts` |
| RN-018 | RF-034, RF-035 | CT-024 | `domain/checkin.ts` |
| RN-019 | RF-037 | CT-025 | `domain/feed.ts` |
| RN-020 | RF-042 | CT-026 | `domain/moderation.ts` |
| RN-021 | RF-014 | CT-027 | `domain/event.ts` |
| RN-022 | RF-014 | CT-028 | `domain/event.ts` |
| RN-023 | — | CT-029 | `types/domain.ts` |
| RN-024 | RF-041, RF-042, RF-043 | CT-030 | `domain/permissions.ts` |
| RN-025 | RF-017 | CT-031 | `domain/customQuestions.ts` |
