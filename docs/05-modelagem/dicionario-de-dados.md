# Dicionário de dados

**Responsável:** Ronaldo Veloso Filho
**Modelo:** [`03-modelo-dados-er.md`](03-modelo-dados-er.md) · **Classes:** [`02-diagrama-classes.md`](02-diagrama-classes.md)

Especificação campo a campo das 14 entidades. Tipos em PostgreSQL 16 (alvo do CP6); o
equivalente em TypeScript está em [`app/src/types/domain.ts`](../../app/src/types/domain.ts).

## Convenções

| Coluna | Significado |
|---|---|
| **Obrig.** | `Sim` = `NOT NULL`; `Cond.` = obrigatório sob condição descrita; `Não` = aceita nulo |
| **Default** | Valor aplicado quando não informado. `—` = sem default |
| **Constraint** | Restrição além de tipo e nulidade: `PK`, `FK`, `UK`, `CHECK`, índice |

Padrões válidos para todas as tabelas:

- **Identificador:** `uuid`, gerado por `gen_random_uuid()`, imutável. Nunca sequencial —
  ID sequencial em URL pública (`/eventos/42`) permite enumerar eventos e inferir volume.
- **Data e hora:** `timestamptz` sempre, gravado em UTC. `timestamp` sem *timezone* seria
  bug garantido em horário de verão e em evento que cruza a meia-noite.
- **Dinheiro:** `numeric(10,2)`. `float` para dinheiro produz `R$ 24,999999`.
- **Nomes:** `snake_case` no banco, `camelCase` no TypeScript. A tradução acontece na
  borda (`services/http/`), em um lugar só.

---

## 1. `faculdade`

Instituição de ensino. Raiz da hierarquia acadêmica e do alcance. Na v1 há exatamente uma
linha.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `nome` | `varchar(160)` | Sim | — | Nome completo da instituição | `CHECK length >= 3` |
| `sigla` | `varchar(16)` | Sim | — | Sigla usada na UI e nos códigos de turma | `UK` |
| `dominios_email` | `text[]` | Sim | `'{}'` | Domínios aceitos no cadastro, sem `@` (ex.: `{fiap.com.br}`). Base do RF-002 | `CHECK array_length >= 1` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |

**Nota.** `dominios_email` é *array* e não tabela filha porque nunca é consultado
isoladamente, só verificado na validação do e-mail. Tabela própria só se aparecer
metadado por domínio (ativo desde, tipo de vínculo).

---

## 2. `curso`

Programa de graduação. Nível intermediário de alcance.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `faculdade_id` | `uuid` | Sim | — | Faculdade proprietária | `FK faculdade(id) ON DELETE CASCADE` |
| `nome` | `varchar(120)` | Sim | — | Ex.: `Engenharia de Computação` | — |
| `codigo` | `varchar(16)` | Sim | — | Ex.: `ECOMP` | `UK` |
| `duracao_semestres` | `smallint` | Sim | `8` | Usado para validar o período da turma | `CHECK BETWEEN 2 AND 14` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |

---

## 3. `turma`

Conjunto de alunos de um curso em um período. Nível mais específico de alcance e ponto de
entrada do onboarding.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `curso_id` | `uuid` | Sim | — | Curso proprietário | `FK curso(id) ON DELETE CASCADE` |
| `nome` | `varchar(32)` | Sim | — | Ex.: `3ESPX` | — |
| `periodo` | `varchar(8)` | Sim | — | Ano e semestre, ex.: `2026.1` | `CHECK ~ '^\d{4}\.[12]$'` |
| `codigo_convite` | `varchar(12)` | Sim | — | Código que vincula o aluno à turma (RF-005). Alfanumérico, sem caracteres ambíguos (`0`/`O`, `1`/`I`) | `UK` |
| `codigo_ativo` | `boolean` | Sim | `true` | Permite revogar o código sem apagá-lo (RF-043) | — |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |

**Nota.** `total_alunos` do diagrama de classes **não** é coluna: é `COUNT` sobre
`usuario`. Diferente de `evento.ocupadas`, não é lido em caminho crítico nem serve de base
para trava, então denormalizar só criaria risco de divergência.

---

## 4. `usuario`

Pessoa com conta verificada e vínculo acadêmico. Entidade única de pessoa — não há
subclasse por papel ([RN-023](../04-regras-de-negocio.md)).

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `nome` | `varchar(120)` | Sim | — | Nome de exibição, editável (RF-006) | `CHECK length >= 2` |
| `email` | `varchar(180)` | Sim | — | E-mail institucional; identidade da conta | `UK`, `CHECK` domínio pertence a `faculdade.dominios_email` |
| `senha_hash` | `varchar(255)` | Sim | — | Hash Argon2id. **Nunca** a senha (RNF-010) | — |
| `foto_url` | `varchar(400)` | Não | `NULL` | Avatar. Nulo gera iniciais com cor derivada do `id` | — |
| `faculdade_id` | `uuid` | Sim | — | Vínculo institucional | `FK faculdade(id) ON DELETE RESTRICT` |
| `curso_id` | `uuid` | Cond. | `NULL` | Preenchido ao concluir o onboarding | `FK curso(id) ON DELETE RESTRICT` |
| `turma_id` | `uuid` | Cond. | `NULL` | Preenchido ao informar código de turma válido | `FK turma(id) ON DELETE RESTRICT` |
| `papeis` | `papel_usuario[]` | Sim | `'{ALUNO}'` | Papéis administrativos cumulativos ([RN-024](../04-regras-de-negocio.md)) | `CHECK 'ALUNO' = ANY(papeis)` |
| `email_verificado` | `boolean` | Sim | `false` | Conta só opera após verificação (RF-001) | — |
| `visivel_entre_confirmados` | `boolean` | Sim | `true` | Opt-out de aparecer na lista pública de confirmados (RF-009) | — |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |
| `excluido_em` | `timestamptz` | Não | `NULL` | Exclusão lógica LGPD (RNF-021): dados pessoais anonimizados, linha mantida para integridade | Índice parcial `WHERE excluido_em IS NULL` |

**Campos deliberadamente ausentes:** CPF, telefone, endereço, data de nascimento, gênero.
Minimização de dados pessoais (RNF-020) — nada disso é necessário para o produto funcionar,
e o que não é coletado não pode vazar.

**`curso_id` e `turma_id` são condicionais** porque a conta existe entre a verificação do
e-mail e a conclusão do onboarding. Enquanto forem nulos, o usuário só vê a tela de
onboarding.

---

## 5. `evento`

Encontro criado por um usuário. Entidade central.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `organizador_id` | `uuid` | Sim | — | Quem criou. Define o papel de organizador ([RN-023](../04-regras-de-negocio.md)) | `FK usuario(id) ON DELETE RESTRICT` |
| `titulo` | `varchar(120)` | Sim | — | — | `CHECK length BETWEEN 3 AND 120` |
| `descricao` | `text` | Não | `NULL` | Texto livre, exibido no detalhe | `CHECK length <= 4000` |
| `alcance` | `alcance_evento` | Sim | `'TURMA'` | `TURMA`, `CURSO` ou `FACULDADE`. Padrão é o menor alcance | — |
| `turma_id` | `uuid` | Cond. | `NULL` | Âncora se `alcance = TURMA` | `FK turma(id) RESTRICT`, `CHECK` de coerência |
| `curso_id` | `uuid` | Cond. | `NULL` | Âncora se `alcance = CURSO` | `FK curso(id) RESTRICT`, `CHECK` de coerência |
| `faculdade_id` | `uuid` | Cond. | `NULL` | Âncora se `alcance = FACULDADE` | `FK faculdade(id) RESTRICT`, `CHECK` de coerência |
| `inicio` | `timestamptz` | Sim | — | Início do evento | `CHECK inicio < fim` |
| `fim` | `timestamptz` | Sim | — | Fim do evento | `CHECK fim - inicio <= interval '7 days'` |
| `local` | `varchar(200)` | Sim | — | Texto livre (ex.: `Quadra do campus 2`). Sem geolocalização na v1 | — |
| `capacidade` | `integer` | Sim | — | Máximo de participações que ocupam vaga | `CHECK BETWEEN 2 AND 2000` |
| `ocupadas` | `integer` | Sim | `0` | Contagem materializada de participações que ocupam vaga | `CHECK ocupadas >= 0 AND ocupadas <= capacidade` |
| `preco` | `numeric(10,2)` | Sim | `0` | `0` = gratuito | `CHECK preco >= 0` |
| `status` | `status_evento` | Sim | `'RASCUNHO'` | Ciclo de vida ([`06-diagrama-estados.md`](06-diagrama-estados.md)) | — |
| `motivo_cancelamento` | `text` | Cond. | `NULL` | Obrigatório se `status = CANCELADO` ([RN-021](../04-regras-de-negocio.md)) | `CHECK` condicional |
| `prazo_inscricao` | `timestamptz` | Sim | `inicio - 2h` | Encerra novas participações ([RN-009](../04-regras-de-negocio.md)) | `CHECK prazo_inscricao <= inicio` |
| `prazo_cancelamento` | `timestamptz` | Sim | `inicio - 24h` | Separa desistência de no-show ([RN-010](../04-regras-de-negocio.md)) | `CHECK prazo_cancelamento <= inicio` |
| `capa_seed` | `smallint` | Sim | aleatório 1–12 | Semente da capa gerada localmente em SVG. Evita *upload* e storage no CP4/CP5 | `CHECK BETWEEN 1 AND 12` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |
| `atualizado_em` | `timestamptz` | Sim | `now()` | Atualizado por *trigger* em cada `UPDATE` | — |

**`ocupadas` é o único campo derivado materializado do modelo.** Existe porque é lido em
toda listagem e porque a verificação atômica de [RN-004](../04-regras-de-negocio.md) precisa
de um valor sobre o qual travar (`SELECT ... FOR UPDATE`). O `CHECK
ocupadas <= capacidade` é a rede de segurança: mesmo com bug na aplicação, o banco recusa o
estouro.

---

## 6. `participacao`

Relação entre usuário e evento, com ciclo de vida próprio. Entidade, não tabela de junção
([ADR-0004](../adr/0004-participacao-como-entidade-propria.md)).

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador. É também o identificador do ingresso | `PK` |
| `evento_id` | `uuid` | Sim | — | Evento | `FK evento(id) ON DELETE RESTRICT` |
| `usuario_id` | `uuid` | Sim | — | Participante | `FK usuario(id) ON DELETE RESTRICT` |
| `status` | `status_participacao` | Sim | — | Um dos 8 estados ([`06-diagrama-estados.md`](06-diagrama-estados.md)) | — |
| `posicao_fila` | `integer` | Cond. | `NULL` | Posição na lista de espera. Obrigatório se `status = LISTA_ESPERA` | `CHECK >= 1`, `CHECK` condicional |
| `pagamento_expira_em` | `timestamptz` | Cond. | `NULL` | Fim da janela de pagamento. Obrigatório se `status = PENDENTE_PAGAMENTO` ([RN-012](../04-regras-de-negocio.md)) | `CHECK` condicional |
| `oferta_expira_em` | `timestamptz` | Cond. | `NULL` | Fim da janela da oferta. Obrigatório se `status = OFERTA_PENDENTE` ([RN-007](../04-regras-de-negocio.md)) | `CHECK` condicional |
| `motivo_cancelamento` | `text` | Não | `NULL` | Enum textual: `ALUNO_DESISTIU`, `EVENTO_CANCELADO`, `VINCULO_PERDIDO`, `REMOVIDO_PELO_ORGANIZADOR` | — |
| `cancelada_apos_prazo` | `boolean` | Sim | `false` | Cancelamento depois de `prazo_cancelamento` — sem reembolso, e visível no histórico do organizador ([RN-010](../04-regras-de-negocio.md)) | — |
| `politica_vigente` | `jsonb` | Não | `NULL` | Política de reembolso **congelada** no momento do pagamento. Preenchido só em evento pago | — |
| `criado_em` | `timestamptz` | Sim | `now()` | Instante de entrada — define a ordem FIFO da fila | — |
| `atualizado_em` | `timestamptz` | Sim | `now()` | — | — |

**Unicidade parcial** — a restrição mais importante da tabela:

```sql
CREATE UNIQUE INDEX ux_participacao_ativa ON participacao (evento_id, usuario_id)
  WHERE status IN ('PENDENTE_PAGAMENTO','CONFIRMADA','LISTA_ESPERA','OFERTA_PENDENTE','PRESENTE');
```

Garante [RN-015](../04-regras-de-negocio.md) (uma participação ativa por aluno/evento) sem
impedir o histórico: participações terminais podem se acumular para o mesmo par.

**Formato de `politica_vigente`:**

```json
{
  "reembolsoIntegralDiasAntes": 7,
  "reembolsoParcialHorasAntes": 48,
  "reembolsoParcialTaxa": 0.5,
  "congeladaEm": "2026-09-03T14:22:10Z"
}
```

---

## 7. `pagamento`

Cobrança de uma participação. Relação 1:0..1.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `participacao_id` | `uuid` | Sim | — | Participação cobrada | `FK participacao(id) RESTRICT`, `UK` |
| `metodo` | `metodo_pagamento` | Sim | — | `PIX`, `CARTAO_CREDITO` ou `CARTAO_DEBITO` | — |
| `valor` | `numeric(10,2)` | Sim | — | Valor cobrado, copiado de `evento.preco` no momento da cobrança | `CHECK valor > 0` |
| `valor_reembolsado` | `numeric(10,2)` | Sim | `0` | Total já devolvido ([RN-013](../04-regras-de-negocio.md)) | `CHECK BETWEEN 0 AND valor` |
| `status` | `status_pagamento` | Sim | `'AGUARDANDO'` | Um dos 8 estados | — |
| `transacao_externa_id` | `varchar(120)` | Não | `NULL` | Identificador da transação no gateway. Único dado do gateway que guardamos | Índice |
| `chave_idempotencia` | `varchar(80)` | Sim | — | Impede processar a mesma notificação duas vezes ([RN-014](../04-regras-de-negocio.md), RNF-014) | `UK` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |
| `confirmado_em` | `timestamptz` | Cond. | `NULL` | Obrigatório se `status = CONFIRMADO` | `CHECK` condicional |

**Campos que nunca existirão aqui:** número de cartão, CVV, validade, nome do titular,
*token* de cartão. A captura ocorre no ambiente do gateway (RNF-022) — o Campus fica fora
do escopo de PCI-DSS por não tocar no dado.

**`chave_idempotencia`** é `UNIQUE` e não apenas indexada: a garantia de processamento único
vem do banco recusando o segundo `INSERT`, não de um `SELECT` prévio da aplicação (que teria
janela de corrida).

---

## 8. `presenca`

Fato imutável de que a pessoa entrou no evento. Relação 1:0..1 com participação — é a
expressão estrutural do uso único do QR Code.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `participacao_id` | `uuid` | Sim | — | Participação que fez check-in | `FK participacao(id) RESTRICT`, **`UK`** |
| `registrado_por_id` | `uuid` | Sim | — | Quem validou (organizador ou admin) | `FK usuario(id) ON DELETE RESTRICT` |
| `metodo` | `metodo_checkin` | Sim | `'QR_CODE'` | `QR_CODE`, `CODIGO_NUMERICO` ou `MANUAL` — distingue o check-in auditável do manual | — |
| `checkin_em` | `timestamptz` | Sim | `now()` | Instante do check-in | — |
| `motivo_correcao` | `text` | Não | `NULL` | Preenchido apenas em registro de correção ([RN-018](../04-regras-de-negocio.md)) | — |
| `sincronizado` | `boolean` | Sim | `true` | `false` quando registrado offline na porta, pendente de reconciliação (CP6) | — |

**A `UK` em `participacao_id` é a regra de negócio, não uma otimização.** Dois operadores
lendo o mesmo QR em paralelo: o segundo `INSERT` viola a restrição, o `ROLLBACK` desfaz e a
API responde `409` com o horário do check-in original. Sem essa restrição, a verificação por
`SELECT` prévio teria janela de corrida — e é justamente na porta de um evento cheio que a
concorrência acontece.

---

## 9. `pergunta_customizada`

Pergunta definida pelo organizador, respondida após a reserva da vaga.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `evento_id` | `uuid` | Sim | — | Evento | `FK evento(id) ON DELETE CASCADE` |
| `enunciado` | `varchar(200)` | Sim | — | Texto da pergunta | `CHECK length >= 5` |
| `tipo` | `tipo_pergunta` | Sim | `'TEXTO_CURTO'` | `TEXTO_CURTO` ou `ESCOLHA_UNICA` | — |
| `opcoes` | `text[]` | Cond. | `NULL` | Alternativas. Obrigatório se `tipo = ESCOLHA_UNICA` | `CHECK array_length >= 2` se `ESCOLHA_UNICA` |
| `obrigatoria` | `boolean` | Sim | `false` | Bloqueia apenas o envio do formulário de perguntas — **nunca** a reserva da vaga ([RN-025](../04-regras-de-negocio.md)) | — |
| `ordem` | `smallint` | Sim | — | Ordem de exibição, 1 a 5 | `CHECK BETWEEN 1 AND 5`, `UK (evento_id, ordem)` |

---

## 10. `resposta_pergunta`

Resposta de uma participação a uma pergunta.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `pergunta_id` | `uuid` | Sim | — | Pergunta respondida | `FK pergunta_customizada(id) CASCADE` |
| `participacao_id` | `uuid` | Sim | — | Quem respondeu | `FK participacao(id) CASCADE` |
| `valor` | `text` | Sim | — | Texto livre ou opção escolhida | `CHECK length <= 500` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | `UK (pergunta_id, participacao_id)` |

---

## 11. `publicacao`

Foto com legenda associada a um evento. Herda a visibilidade do evento
([RN-001](../04-regras-de-negocio.md), [RN-019](../04-regras-de-negocio.md)).

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `evento_id` | `uuid` | Sim | — | Evento. **Não existe publicação sem evento** | `FK evento(id) ON DELETE RESTRICT` |
| `autor_id` | `uuid` | Sim | — | Autor (organizador ou participante presente) | `FK usuario(id) ON DELETE RESTRICT` |
| `legenda` | `text` | Não | `NULL` | Texto da publicação | `CHECK length <= 600` |
| `imagem_seed` | `smallint` | Sim | aleatório 1–24 | Semente da imagem gerada localmente no CP4/CP5. No CP6 dá lugar a `imagem_url` do storage | `CHECK BETWEEN 1 AND 24` |
| `removida` | `boolean` | Sim | `false` | Remoção lógica por moderação | Índice parcial `WHERE removida = false` |
| `motivo_remocao` | `text` | Cond. | `NULL` | Obrigatório se `removida = true` ([RN-020](../04-regras-de-negocio.md)) | `CHECK` condicional |
| `removida_por_id` | `uuid` | Cond. | `NULL` | Quem removeu. Obrigatório se `removida = true` | `FK usuario(id) RESTRICT`, `CHECK` condicional |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |

**Remoção é lógica, com autoria e motivo.** Conteúdo removido é retido por 90 dias para
contestação e depois eliminado por rotina — o que atende à necessidade de apuração sem
manter arquivo permanente de conteúdo removido (RNF-020, RNF-021).

---

## 12. `comentario`

Texto de resposta a uma publicação.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `publicacao_id` | `uuid` | Sim | — | Publicação comentada | `FK publicacao(id) ON DELETE CASCADE` |
| `autor_id` | `uuid` | Sim | — | Autor | `FK usuario(id) ON DELETE RESTRICT` |
| `texto` | `text` | Sim | — | Conteúdo | `CHECK length BETWEEN 1 AND 500` |
| `removido` | `boolean` | Sim | `false` | Remoção lógica por moderação | — |
| `criado_em` | `timestamptz` | Sim | `now()` | — | Índice `(publicacao_id, criado_em)` |

---

## 13. `notificacao`

Aviso dirigido a um usuário sobre algo que afeta a decisão dele.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `destinatario_id` | `uuid` | Sim | — | Quem recebe | `FK usuario(id) ON DELETE CASCADE` |
| `tipo` | `tipo_notificacao` | Sim | — | Um dos 8 tipos | — |
| `titulo` | `varchar(120)` | Sim | — | Linha principal | — |
| `mensagem` | `text` | Sim | — | Corpo | `CHECK length <= 400` |
| `referencia_id` | `uuid` | Não | `NULL` | ID do objeto citado (evento, participação). Sem FK: aponta para tabelas diferentes conforme o tipo | — |
| `lida` | `boolean` | Sim | `false` | — | Índice parcial `WHERE lida = false` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | Índice `(destinatario_id, criado_em DESC)` |

**`referencia_id` sem FK é decisão consciente.** Uma FK polimórfica exigiria coluna de
discriminador e restrição por tipo; como a notificação é transitória (expurgo em 90 dias) e
o pior caso de um ID órfão é uma navegação que cai em "não encontrado", o custo de garantir
integridade referencial aqui não se paga.

---

## 14. Tipos enumerados

| Tipo | Valores | Definido em |
|---|---|---|
| `alcance_evento` | `TURMA`, `CURSO`, `FACULDADE` | [RN-001](../04-regras-de-negocio.md) |
| `status_evento` | `RASCUNHO`, `EM_APROVACAO`, `PUBLICADO`, `CANCELADO`, `REALIZADO` | [`06-diagrama-estados.md`](06-diagrama-estados.md) |
| `status_participacao` | `PENDENTE_PAGAMENTO`, `CONFIRMADA`, `LISTA_ESPERA`, `OFERTA_PENDENTE`, `PRESENTE`, `AUSENTE`, `CANCELADA`, `EXPIRADA` | [`06-diagrama-estados.md`](06-diagrama-estados.md) |
| `status_pagamento` | `AGUARDANDO`, `CONFIRMADO`, `RECUSADO`, `EM_ANALISE`, `REEMBOLSO_SOLICITADO`, `REEMBOLSADO`, `REEMBOLSADO_PARCIAL`, `ESTORNADO` | [RN-013](../04-regras-de-negocio.md), [RN-014](../04-regras-de-negocio.md) |
| `metodo_pagamento` | `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO` | RF-028 |
| `papel_usuario` | `ALUNO`, `ADMIN_CURSO`, `ADMIN_FACULDADE` | [RN-024](../04-regras-de-negocio.md) |
| `metodo_checkin` | `QR_CODE`, `CODIGO_NUMERICO`, `MANUAL` | UC-005 A1, A4 |
| `tipo_pergunta` | `TEXTO_CURTO`, `ESCOLHA_UNICA` | RF-017 |
| `tipo_notificacao` | `NOVO_EVENTO`, `VAGA_LIBERADA`, `PAGAMENTO_CONFIRMADO`, `PAGAMENTO_EXPIRADO`, `EVENTO_ALTERADO`, `EVENTO_CANCELADO`, `CHECKIN_REALIZADO`, `EVENTO_APROVADO` | RF-039 |

## 15. Inventário de dados pessoais (LGPD)

Base para RNF-020 e RNF-021. Toda coluna com dado pessoal está listada — se um campo novo
não aparecer aqui, o PR que o criou está incompleto.

| Dado | Onde | Categoria | Base legal (premissa) | Retenção | Ação na exclusão do titular |
|---|---|---|---|---|---|
| Nome | `usuario.nome`, exibido em publicações e listas | Identificação | Execução de contrato (uso do app) | Enquanto a conta existir | Substituído por `Usuário removido` |
| E-mail institucional | `usuario.email` | Identificação e vínculo | Execução de contrato | Enquanto a conta existir | Substituído por hash irreversível (mantém unicidade) |
| Senha (hash) | `usuario.senha_hash` | Credencial | Execução de contrato | Enquanto a conta existir | Apagado |
| Foto de perfil | `usuario.foto_url` | Identificação | Consentimento (campo opcional) | Enquanto a conta existir | Apagada |
| Vínculo acadêmico | `usuario.faculdade_id`, `.curso_id`, `.turma_id` | Dado acadêmico | Execução de contrato | Enquanto a conta existir | Mantido apenas de forma agregada |
| Histórico de participação | `participacao` | Comportamental | Execução de contrato | 5 anos (histórico do evento) | Anonimizado: `usuario_id` aponta para a linha anonimizada |
| Presença em evento | `presenca` | Comportamental | Execução de contrato | 5 anos | Anonimizada, preservando a contagem |
| Registro de pagamento | `pagamento` | Financeiro (sem dado de cartão) | Obrigação legal e contratual | 5 anos | **Retido** por obrigação fiscal/contábil |
| Fotos publicadas e comentários | `publicacao`, `comentario` | Conteúdo do titular | Consentimento | Enquanto a publicação existir | Apagados a pedido do titular |
| Notificações | `notificacao` | Comportamental | Execução de contrato | 90 dias | Apagadas |

**Não coletado, e por isso ausente do inventário:** CPF, RG, telefone, endereço, data de
nascimento, gênero, dado de saúde, geolocalização, dado de cartão de crédito.
