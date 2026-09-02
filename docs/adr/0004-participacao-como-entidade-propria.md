# ADR-0004 — `Participacao` como entidade própria, não tabela de junção

- **Status:** Aceita
- **Data:** 2026-08-26
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Ronaldo Veloso Filho (Modelagem / Analista UML), Lucas Zolla (Analista de Requisitos)
- **Requisitos afetados:** RN-004, RN-006, RN-007, RN-008, RN-010, RN-012, RN-013, RN-015, RN-018, RN-025 · RF-019, RF-021, RF-022, RF-024, RF-025, RF-026, RF-028, RF-030, RF-031, RF-033, RF-034 · RNF-013

## Contexto

A relação entre `Usuario` e `Evento` é, à primeira vista, o exemplo de manual de
**muitos-para-muitos**: um aluno participa de vários eventos, um evento tem vários alunos. A
solução de manual é uma tabela de junção `evento_usuario` com chave primária composta
`(evento_id, usuario_id)` e, se necessário, uma coluna de status.

O domínio do Campus recusa esse desenho por acúmulo de evidência, não por preferência:

- O ciclo de vida tem **oito estados** (`StatusParticipacao`: `PENDENTE_PAGAMENTO`,
  `CONFIRMADA`, `LISTA_ESPERA`, `OFERTA_PENDENTE`, `PRESENTE`, `AUSENTE`, `CANCELADA`,
  `EXPIRADA`) e transições com ator, prazo e efeito colateral — está desenhado em
  [`../05-modelagem/06-diagrama-estados.md`](../05-modelagem/06-diagrama-estados.md).
- Três dessas transições **não têm ator humano**: expiração de pagamento (RN-012),
  expiração de oferta da fila (RN-008) e marcação de ausente. Uma rotina agendada precisa
  varrer "quais participações vencem agora", o que exige que o prazo esteja *na linha*.
- A fila de espera é **FIFO com posição** (RN-006, RN-007): promover o primeiro implica ler
  a menor posição e decrementar as demais.
- O reembolso depende da política **vigente no momento do pagamento** (RN-013), não da
  política atual do evento.
- Três outras entidades penduram-se nessa relação: `Pagamento` (1:0..1), `Presenca` (1:0..1)
  e `RespostaPergunta` (1:N, RN-025).
- O histórico importa: no seed canônico, **Marina Alves** tem `evt-009` com status
  `PRESENTE` — um evento já `REALIZADO`. Participação passada é dado do produto (aba
  "Anteriores", RF-007), não lixo a ser sobrescrito.
- A API já tem rota por identidade: `GET /participacoes/par-101/ingresso`,
  `POST /participacoes/par-101/pagamentos`, `DELETE /participacoes/par-055`,
  `POST /participacoes/par-070/confirmar` (ver
  [`../05-modelagem/04-diagrama-sequencia.md`](../05-modelagem/04-diagrama-sequencia.md)).

Ou seja: existe uma coisa com identidade, estado, prazos, história e filhos. A pergunta é se
essa coisa é modelada como tal.

## Decisão

**`Participacao` é uma entidade de primeira classe, com identidade própria (`uuid`, exposta
como `par-101`), e é o ponto de ancoragem de `Pagamento`, `Presenca` e `RespostaPergunta`.**

A unicidade exigida por RN-015 ("uma participação **ativa** por aluno/evento") é garantida
por **índice único parcial**, não por chave primária composta:

```sql
CREATE UNIQUE INDEX ux_participacao_ativa
  ON participacao (evento_id, usuario_id)
  WHERE status IN ('PENDENTE_PAGAMENTO','CONFIRMADA','LISTA_ESPERA','OFERTA_PENDENTE','PRESENTE');
```

### Os cinco atributos que provam a decisão

Nenhum deles pertence a `Usuario` (não é característica da pessoa) nem a `Evento` (não é
característica do evento). Todos pertencem **à relação**, e é isso que a torna uma entidade:

| Atributo | Por que só existe aqui | Regra |
|---|---|---|
| `posicaoFila` | Posição do aluno na fila **deste** evento. O mesmo aluno pode ser 7º em `evt-002` e não estar em fila nenhuma em `evt-003` | RN-006, RN-007 |
| `pagamentoExpiraEm` | Instante em que **esta** reserva morre: `min(agora + 60min, prazoInscricao, inicio - 1h)`. Depende de quando o aluno se inscreveu, não do evento | RN-012, RF-030 |
| `ofertaExpiraEm` | Instante em que **esta** oferta de vaga vence: `min(agora + 24h, inicio - 1h)`. Cada promoção da fila gera o seu | RN-007, RN-008, RF-026 |
| `canceladaAposPrazo` | Registra se o cancelamento ocorreu depois do prazo — decide se a vaga volta para a fila e como o reembolso é calculado | RN-010, RN-013 |
| `politicaVigente` | Congela a política de reembolso **do momento do pagamento**. Se o organizador mudar a política depois, quem já pagou mantém a que aceitou | RN-013 |

### E os três filhos que precisam de um pai com identidade

`Pagamento`, `Presenca` e `RespostaPergunta` referenciam `participacao.id`. Isso torna
possível:

- **`UNIQUE (participacao_id)` em `presenca`** — que é o mecanismo real de RN-018 e do uso
  único do ingresso (RN-017): o segundo `INSERT` viola a restrição e a API responde `409`,
  sem janela de corrida entre dois operadores lendo QR em paralelo.
- **`UNIQUE (participacao_id)` em `pagamento`** — a cardinalidade 1:0..1 vira restrição de
  banco, não convenção.
- **`UNIQUE (pergunta_id, participacao_id)` em `resposta_pergunta`** — uma resposta por
  pergunta por participação (RN-025).

## Alternativas consideradas

### A. Tabela de junção `evento_usuario` com PK composta `(evento_id, usuario_id)` + coluna `status`

| | |
|---|---|
| **Prós** | Uma tabela a menos; nenhum join extra para "os participantes deste evento"; nenhum id a gerar; o modelo cabe no diagrama sem explicação — é o que qualquer revisor espera ver |
| **Contras** | (1) Os cinco atributos acima ficam sem lugar natural: ou poluem a junção (que deixa de ser junção), ou vazam para `Evento`, onde estariam errados. (2) **A PK composta implementa a regra errada:** RN-015 fala de *uma ativa*, não *uma na história*. Um aluno que cancela e volta a se inscrever — caso previsto e permitido — violaria a chave primária, e a única saída seria `UPDATE` sobre a linha antiga, apagando o histórico e a data original de entrada na fila. (3) `Pagamento`, `Presenca` e `RespostaPergunta` teriam de referenciar a chave composta, propagando duas colunas em três tabelas e tornando `UNIQUE (participacao_id)` — o mecanismo de RN-017/RN-018 — impossível de escrever de forma simples. (4) Sem id estável, `GET /participacoes/par-101/ingresso` não existe: a rota viraria `/eventos/{eventoId}/participantes/{usuarioId}/ingresso`, expondo o id do usuário na URL e contrariando a minimização do RNF-020 |
| **Motivo objetivo da recusa** | A PK composta impede o histórico que o produto exige (aba "Anteriores", RF-007; Marina com `evt-009` `PRESENTE`) e implementa uma regra de unicidade mais forte do que a regra de negócio escrita |

### B. Sem coluna de `status`: estado derivado da existência dos filhos

Ideia: não guardar status; inferir — se existe `Presenca`, é presente; se existe `Pagamento`
confirmado, é confirmada; se tem posição de fila, está na fila.

| | |
|---|---|
| **Prós** | Uma verdade só, sem risco de status divergir dos filhos; nenhuma transição para manter em duplicidade |
| **Contras** | `LISTA_ESPERA`, `OFERTA_PENDENTE`, `EXPIRADA`, `CANCELADA` e `AUSENTE` **não têm filho para inferir** — quatro dos oito estados ficariam sem representação, e seriam recriados como colunas booleanas, o que é a coluna de status de volta, pior. Toda listagem exigiria dois ou três `LEFT JOIN` mais `CASE`; a consulta mais frequente do sistema — "quantos confirmados neste evento", usada no contador de capacidade (RN-004) e no painel de check-in — passaria de contagem indexada a agregação com joins. O [diagrama de estados](../05-modelagem/06-diagrama-estados.md) deixaria de ter correspondência direta no banco, e a rotina de expiração não teria coluna para filtrar |
| **Motivo objetivo da recusa** | Custa a consulta mais quente do produto e não cobre metade dos estados do domínio |

### C. Duas entidades separadas: `Inscricao` e `ItemListaEspera`

| | |
|---|---|
| **Prós** | Cada tabela com seus campos, sem coluna nula: `posicaoFila` só na fila, `pagamentoExpiraEm` só na inscrição; modelo mais "limpo" numa leitura estática |
| **Contras** | Promover da fila (RN-007) viraria "apagar de uma tabela, inserir na outra" — e junto se perderiam o id, o `criadoEm` que **define a ordem FIFO** e o histórico da tentativa. A transação passaria a atravessar duas tabelas para uma operação que é logicamente uma mudança de estado. E o pior: nada impediria a mesma pessoa de existir nas duas ao mesmo tempo — RN-015 exigiria uma restrição *entre* tabelas, que o PostgreSQL não expressa declarativamente |
| **Motivo objetivo da recusa** | Transforma uma transição de estado (que o diagrama de estados descreve como uma seta) em migração de linha entre tabelas, enfraquecendo RN-007, RN-008 e RN-015 de uma vez |

## Consequências

### Positivas

- **Os oito estados do domínio têm uma coluna só.** O diagrama de estados e o banco têm
  correspondência 1:1, e a rotina de expiração é um `SELECT` com filtro por status e prazo,
  servido por índice.
- **RN-015 fica correta, não aproximada.** Índice único parcial permite histórico
  (`CANCELADA`, `EXPIRADA`, `AUSENTE` fora do índice) e proíbe duplicidade ativa — que é
  exatamente o que a regra diz.
- **RN-017 e RN-018 são garantidos pelo banco.** `UNIQUE (participacao_id)` em `presenca`
  fecha a corrida de dois operadores lendo o mesmo QR: o segundo `INSERT` falha e a API
  responde `409` com o horário do check-in original.
- **A API ganha recursos com identidade.** `/participacoes/{id}` e seus subrecursos
  (`/pagamentos`, `/ingresso`, `/confirmar`) são REST direto, sem id de usuário na URL.
- **O reembolso é auditável.** `politicaVigente` congelada na linha responde "por que este
  aluno recebeu 50% e aquele 100%" sem arqueologia de histórico do evento.
- **A fila é reordenável sem perder história.** `posicaoFila` mais `criadoEm` na mesma linha
  tornam RN-007 e RN-008 implementáveis dentro de uma transação.

### Negativas

- **Mais uma tabela e mais um join.** Praticamente toda consulta de evento com informação de
  participante passa por `participacao`, e a listagem do organizador exige
  `evento → participacao → usuario`. Custo real, ainda que baixo na escala do projeto
  (o maior evento do seed tem 500 vagas).
- **O índice único parcial lista os cinco status ativos explicitamente — e essa é a
  armadilha mais perigosa do modelo.** Se alguém adicionar um valor a `StatusParticipacao`
  que também deva ocupar vaga, e não incluí-lo no `WHERE` do índice, a duplicidade passa a
  ser possível **em silêncio**: nenhum erro, nenhum teste vermelho, só dados errados
  aparecendo semanas depois. Mitigação: item obrigatório no checklist de PR que altere o
  enum, e teste dedicado (CT-018).
- **Três colunas quase sempre nulas.** `posicaoFila` é nula para quem não está em fila;
  `pagamentoExpiraEm` é nula em evento gratuito; `ofertaExpiraEm` é nula até haver oferta.
  O tipo em TypeScript fica opcional, e cada leitura precisa tratar `undefined`.
- **A entidade acumula responsabilidade.** `Participacao` responde por inscrição, fila,
  prazos, política e vínculo com pagamento/presença/respostas. É o registro que mais cresce
  no modelo, e há risco real de ela virar o depósito de qualquer campo novo relacionado a
  "aluno em evento". Contenção: campo novo em `Participacao` exige justificativa explícita no
  PR.
- **`UPDATE` frequente em linha quente.** Confirmação, promoção de fila e check-in escrevem
  na mesma linha; com `SELECT … FOR UPDATE` na reserva de vaga (RNF-013), essa linha é ponto
  de contenção sob concorrência. Aceitável na escala do projeto, mas é onde um gargalo
  apareceria primeiro.

## Como reverter

**Praticamente irreversível, e está registrado justamente por isso.**

Colapsar `Participacao` em uma tabela de junção exigiria:

1. Reescrever as FKs de `pagamento`, `presenca` e `resposta_pergunta` — que apontam para
   `participacao.id` — para a chave composta, propagando duas colunas em três tabelas.
2. Descartar ou reencaixar os cinco atributos de relação.
3. Perder o histórico de participações não ativas, ou inventar uma tabela de arquivo — que
   seria `Participacao` com outro nome.
4. Reescrever as rotas `/participacoes/{id}/*` e todo o cliente que as consome.
5. Reescrever os testes de RN-006 a RN-018.

Custo estimado pelo grupo: **maior que o de reimplementar o módulo de inscrição inteiro**, e
com perda de dados no caminho. É uma decisão de via única: o momento de discuti-la é agora,
no CP4, e é para isso que serve esta ADR.

## Verificação

| Como se verifica | Onde |
|---|---|
| Inserir duas participações **ativas** para o mesmo `(evento_id, usuario_id)` viola `ux_participacao_ativa`; inserir uma ativa quando a anterior está `CANCELADA` é permitido | **CT-018** (RN-015) no plano de testes; teste de integração de banco no CP6 e teste da camada mockada no CP5 |
| Segunda leitura do mesmo ingresso responde `409`, e a violação vem do `UNIQUE` de `presenca`, não de um `SELECT` prévio | **CT-022 / CT-023** (RN-017) e **CT-024** (RN-018) |
| Nenhuma FK do esquema referencia o par `(evento_id, usuario_id)` — todas apontam para `participacao.id` | Revisão do PR de migração de esquema no CP6; inspeção do DDL |
| Alterar `StatusParticipacao` obriga a revisar `ux_participacao_ativa` | Item bloqueador no checklist de PR ([`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)); teste de regressão que conta os status listados no índice |
| Os cinco atributos de relação não aparecem em `Usuario` nem em `Evento` | Revisão cruzada Ronaldo Veloso Filho × Lucas Baraldi contra [`../05-modelagem/dicionario-de-dados.md`](../05-modelagem/dicionario-de-dados.md) |
| `politicaVigente` é escrita na confirmação do pagamento e **nunca** atualizada depois | Teste de RN-013 (**CT-008 / CT-009**): mudar a política do evento não altera reembolso de quem já pagou |
