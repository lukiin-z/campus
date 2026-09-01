# Regras de negócio

Regras que o sistema faz valer **independentemente da tela**. Diferente de requisito
funcional (que descreve uma capacidade), regra de negócio descreve uma **restrição
invariante do domínio**: se o código permitir violá-la, é defeito.

Toda regra aqui é implementada na camada de domínio (`app/src/domain/`) e verificada por
teste automatizado, não por validação de formulário. Validação de formulário é
conveniência; regra de negócio é garantia.

**Responsável:** Lucas Zolla · **Aprovação:** Ronaldo Veloso Filho (modelagem)

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

**Estados que ocupam vaga:** `PENDENTE_PAGAMENTO`, `CONFIRMADA`, `PRESENTE`.
**Estados que não ocupam:** `LISTA_ESPERA`, `OFERTA_PENDENTE`, `CANCELADA`, `EXPIRADA`,
`AUSENTE`.

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

**Condições para o check-in ser aceito** — todas obrigatórias:

1. Assinatura válida (token não adulterado);
2. `eventoId` do token igual ao evento em que a leitura está sendo feita;
3. Momento da leitura dentro de
   `[inicio - CHECKIN_OPENS_HOURS_BEFORE, fim + CHECKIN_CLOSES_HOURS_AFTER]`;
4. Participação em estado `CONFIRMADA` (não `CANCELADA`, não `EXPIRADA`);
5. **Nenhuma presença já registrada** para essa participação;
6. Quem lê é o organizador do evento ou um administrador do escopo.

Falha em qualquer condição → check-in recusado com **motivo específico** ("ingresso já
utilizado às 20h14", "ingresso de outro evento", "check-in ainda não abriu"). Mensagem
genérica de erro na porta de um evento é problema operacional, não detalhe de UX.

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
  publicação.
- Não há publicação sem evento associado. Feed geral solto seria rede social — está
  fora de escopo (RFX-01, RFX-02).

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

## Rastreabilidade: regra → requisito → teste

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
