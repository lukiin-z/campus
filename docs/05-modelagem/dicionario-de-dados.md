# Dicionário de dados

**Responsável:** Ronaldo Veloso Filho
**Modelo:** [`03-modelo-dados-er.md`](03-modelo-dados-er.md) · **Classes:** [`02-diagrama-classes.md`](02-diagrama-classes.md)

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | 13 tabelas campo a campo, 9 tipos enumerados e inventário de dados pessoais |
| 1.1 | 2026-09-02 | CP5 | `usuario.foto_url` sai, entra `avatar_seed` — e sai também do inventário LGPD, porque não é dado pessoal. `participacao.motivo_cancelamento` passa a tipo enumerado, com o quinto valor que o código tem. `pagamento` recebe as três colunas do resumo de cartão que o CP5 guarda, e a nota "nome do titular nunca existirá aqui" **foi corrigida: existe**. Tipos enumerados vão de 9 para 10. Nova seção 16 com os 20 tipos que **não** são tabela |
| 2.0 | 2026-09-02 | CP6 | Conferido contra `api/prisma/schema.prisma` e a migration `0001_init`. Entra a seção **4b `sessao`** — 14 tabelas. Em `usuario`: `senha_hash` deixa de ser "coluna do CP6" e passa a existir, `avatar_seed` vira `integer`, entra `atualizado_em`, e **`excluido_em` sai** porque o schema não a tem — com o registro de que RNF-021 segue não atendido nessa parte. Três `CHECK` que esta tabela descrevia em `usuario` também não existem, e isso está dito. A nota de tipo passa a citar `packages/shared/src/types.ts`, para onde os tipos migraram |

Especificação campo a campo das **14 entidades persistidas**. Tipos em PostgreSQL 16, agora
conferidos contra [`api/prisma/schema.prisma`](../../api/prisma/schema.prisma) e
[`api/prisma/migrations/0001_init/migration.sql`](../../api/prisma/migrations/0001_init/migration.sql)
— não mais contra a intenção. O equivalente em TypeScript está em
[`packages/shared/src/types.ts`](../../packages/shared/src/types.ts), para onde os tipos
migraram no CP6 ([ADR-0008](../adr/0008-monorepo-com-dominio-compartilhado.md));
`app/src/types/domain.ts` continua existindo como reexportação de uma linha.

Aquele arquivo declara 45 tipos, e só 14 são tabela. Os outros — projeções de leitura e
entradas de escrita — estão na **seção 16**, sem coluna, sem tipo de banco e sem restrição,
porque não têm. A distinção é a seção 0 de
[`02-diagrama-classes.md`](02-diagrama-classes.md).

> **Onde esta página pode divergir, e como se descobre.** A coluna **Constraint** é a mais
> frágil: ela descrevia `CHECK` que o modelo *deveria* ter, e a revisão do CP6 encontrou
> três em `usuario` que não existem na migration. Os que **existem** são 20, todos com nome
> `ck_*`, listados em
> [`03-modelo-dados-er.md` §3](03-modelo-dados-er.md#restrições-de-valor-check). Se uma
> linha desta tabela citar um `CHECK` que não esteja lá, é esta tabela que está errada.

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
| `senha_hash` | `varchar(255)` | Sim | — | Hash Argon2id. **Nunca** a senha (RNF-010). Existe desde o CP6; nenhuma projeção de leitura o inclui, e o único lugar que o lê é a verificação de credencial | — |
| `avatar_seed` | `integer` | Sim | aleatório | Semente da cor do avatar de iniciais. Não há *upload* de foto na v1, então não há URL nem storage | — |
| `faculdade_id` | `uuid` | Sim | — | Vínculo institucional | `FK faculdade(id) ON DELETE RESTRICT` |
| `curso_id` | `uuid` | Cond. | `NULL` | Preenchido ao concluir o onboarding | `FK curso(id) ON DELETE RESTRICT` |
| `turma_id` | `uuid` | Cond. | `NULL` | Preenchido ao informar código de turma válido | `FK turma(id) ON DELETE RESTRICT` |
| `papeis` | `papel_usuario[]` | Sim | `'{ALUNO}'` | Papéis administrativos cumulativos ([RN-024](../04-regras-de-negocio.md)) | — |
| `email_verificado` | `boolean` | Sim | `false` | Conta só opera após verificação (RF-001) | — |
| `visivel_entre_confirmados` | `boolean` | Sim | `true` | Opt-out de aparecer na lista pública de confirmados (RF-009) | — |
| `criado_em` | `timestamptz(3)` | Sim | `now()` | — | — |
| `atualizado_em` | `timestamptz(3)` | Sim | `@updatedAt` | Mantido pelo Prisma a cada escrita | — |

**Campos deliberadamente ausentes:** CPF, telefone, endereço, data de nascimento, gênero.
Minimização de dados pessoais (RNF-020) — nada disso é necessário para o produto funcionar,
e o que não é coletado não pode vazar.

**`excluido_em` foi projetado e não existe** (correção do CP6). O CP4 e o CP5 descreveram
aqui uma coluna de exclusão lógica sustentando RNF-021. `api/prisma/schema.prisma` não a tem
— reconferir com `grep -n "excluido" api/prisma/schema.prisma`, que não devolve nada. O
raciocínio segue registrado em
[`03-modelo-dados-er.md`](03-modelo-dados-er.md#2-o-que-o-diagrama-mostra-e-por-que-assim),
decisão 4, e **RNF-021 continua não atendido** nessa parte. Três `CHECK` que a versão
anterior desta tabela também descrevia (`length >= 2` em `nome`, o domínio de `email`,
`'ALUNO' = ANY(papeis)`) não estão na migration: as três colunas têm só tipo e nulidade. A
validação de domínio de e-mail acontece em `decideLogin` e no `ValidationPipe`, não no
banco.

**`curso_id` e `turma_id` são condicionais** porque a conta existe entre a verificação do
e-mail e a conclusão do onboarding. Enquanto forem nulos, o usuário só vê a tela de
onboarding.

---

## 4b. `sessao`

Sessão de refresh (RNF-020). **Tabela nova no CP6** — não existia no modelo do CP4 porque o
CP5 não tinha servidor: o token era opaco e a sessão morria com a aba.

| Campo | Tipo | Obrig. | Default | Descrição | Constraint |
|---|---|---|---|---|---|
| `id` | `uuid` | Sim | `gen_random_uuid()` | Identificador | `PK` |
| `usuario_id` | `uuid` | Sim | — | Titular da sessão | `FK usuario(id) ON DELETE CASCADE` |
| `refresh_hash` | `varchar(255)` | Sim | — | Hash do refresh token. **Nunca** o token | `UK` |
| `user_agent` | `varchar(400)` | Não | `NULL` | Para a pessoa reconhecer a sessão numa lista de dispositivos. Não participa de decisão de autorização | — |
| `expira_em` | `timestamptz(3)` | Sim | — | 30 dias por padrão (`JWT_REFRESH_TTL_DAYS`) | — |
| `revogada_em` | `timestamptz(3)` | Não | `NULL` | Nulo enquanto a sessão vale. É o que torna o refresh revogável | — |
| `criado_em` | `timestamptz(3)` | Sim | `now()` | — | Índice `(usuario_id, expira_em)` |

**Por que o hash, e não o token.** Mesma razão de `senha_hash`: um vazamento do banco não
dá sessão a ninguém, porque o que está lá não serve para autenticar. É a diferença entre
guardar um segredo e guardar a prova de que se conhece o segredo.

**Por que `CASCADE` e não `RESTRICT`.** É a única FK para `usuario` do modelo que apaga em
cascata, e é deliberado: não há nada a preservar numa sessão depois de o titular deixar de
existir. Participação, publicação e presença são `RESTRICT` porque carregam história;
sessão não carrega nenhuma.

**Não é dado pessoal**, e por isso não entra no inventário da seção 15 — `user_agent`
descreve o navegador, não a pessoa. O que a tabela liga a uma pessoa é o `usuario_id`, que
já está inventariado na linha de `usuario`.

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
| `motivo_cancelamento` | `motivo_cancelamento` | Não | `NULL` | Tipo enumerado, não texto livre: `ALUNO_DESISTIU`, `EVENTO_CANCELADO`, `VINCULO_PERDIDO`, `REMOVIDO_PELO_ORGANIZADOR`, `OFERTA_RECUSADA`. No CP5 só `ALUNO_DESISTIU` é escrito, por `DELETE /api/participacoes/:id` | — |
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
| `chave_idempotencia` | `varchar(80)` | Sim | — | Impede processar a mesma notificação duas vezes ([RN-014](../04-regras-de-negocio.md), RNF-014). Derivada por `domain/payment.ts#idempotencyKey(participacaoId, transacaoExternaId)` | `UK` |
| `ultimos_quatro` | `varchar(4)` | Cond. | `NULL` | Últimos 4 dígitos do cartão. Nulo quando `metodo = PIX`. Reduzido **no cliente** por `domain/pix.ts#resumirCartao` | `CHECK ~ '^[0-9]{4}$'`, `CHECK` coerência com `metodo` |
| `bandeira_cartao` | `varchar(24)` | Cond. | `NULL` | `Visa`, `Mastercard`, `Amex`, `Elo`, `Hipercard` ou `Cartão`. Derivada do prefixo, no cliente | `CHECK` coerência com `metodo` |
| `titular_cartao` | `varchar(120)` | Cond. | `NULL` | Nome impresso no cartão, em caixa alta. **Sem** número, sem CVV, sem validade | `CHECK` coerência com `metodo` |
| `criado_em` | `timestamptz` | Sim | `now()` | — | — |
| `confirmado_em` | `timestamptz` | Cond. | `NULL` | Obrigatório se `status = CONFIRMADO` | `CHECK` condicional |

**Campos que nunca existirão aqui:** número de cartão, CVV, validade e *token* de cartão. A
captura completa ocorre no ambiente do gateway (RNF-022) — o Campus fica fora do escopo de
PCI-DSS por não tocar no dado sensível.

> **Correção do CP5.** A versão do CP4 desta nota listava também "nome do titular" entre os
> campos que nunca existiriam. **Existe:** `domain/pix.ts#resumirCartao` devolve
> `{ ultimosQuatro, bandeira, titular }`, e `mocks/handlersCp5.ts` grava os três em
> `db.resumosCartao`, de onde `toPagamentoView` os lê de volta para a tela mostrar
> "Visa •••• 4242". As três colunas acima são a forma correta disso no CP6 — ver a decisão 9
> de [`02-diagrama-classes.md`](02-diagrama-classes.md). Documentar o que se guarda é o que
> torna o inventário da seção 15 auditável; a nota do CP4 estava, na prática, escondendo um
> dado pessoal do inventário.

**Nenhuma coluna para o payload Pix.** O BR Code é recalculado a cada leitura por
`gerarCobrancaPix`, determinístico sobre `(valor, referencia, expiraEm)`
([RN-028](../04-regras-de-negocio.md)). Guardá-lo seria manter dado derivado em duas cópias,
e a segunda passaria a discordar da primeira na alteração de preço.

**`chave_idempotencia`** é `UNIQUE` e não apenas indexada: a garantia de processamento único
vem do banco recusando o segundo `INSERT`, não de um `SELECT` prévio da aplicação (que teria
janela de corrida). No CP5, quem faz esse papel é a comparação de estado em
`domain/payment.ts#planWebhook`, que devolve `IGNORAR_DUPLICADA` sem escrever nada.

**No máximo uma cobrança `AGUARDANDO` por participação** ([RN-027](../04-regras-de-negocio.md)).
Trocar de método substitui a cobrança reaproveitando o mesmo `id` e o mesmo
`transacao_externa_id`, em vez de acumular duas.

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
| `motivo_cancelamento` | `ALUNO_DESISTIU`, `EVENTO_CANCELADO`, `VINCULO_PERDIDO`, `REMOVIDO_PELO_ORGANIZADOR`, `OFERTA_RECUSADA` | [RN-010](../04-regras-de-negocio.md), [RN-022](../04-regras-de-negocio.md) |

São **dez** tipos, e os dez existem em três lugares na mesma ordem: como *union type* em
[`packages/shared/src/types.ts`](../../packages/shared/src/types.ts), como `enum` do Prisma
em [`api/prisma/schema.prisma`](../../api/prisma/schema.prisma) (com `@@map` para o nome
snake_case) e como `CREATE TYPE` na migration. `motivo_cancelamento` era `text` no CP4 e o
código já o tipava como enumeração — o código venceu.

### As cinco enumerações do código que **não** são tipos do banco

| Enumeração em `types/domain.ts` | Onde aparece | Por que não é coluna |
|---|---|---|
| `MOTIVO_RECUSA_INSCRICAO` | campo `erro` do `409` e do `422` de `POST /api/eventos/:id/participacoes` | Recusa é dita, não guardada |
| `MOTIVO_RECUSA_LOGIN` | campo `erro` do `401` e do `422` de `POST /api/auth/login` | idem |
| `MOTIVO_RECUSA_ONBOARDING` | campo `erro` do `422` de `POST /api/auth/onboarding` | idem |
| `MOTIVO_RECUSA_CHECKIN` | campo `motivo` do `200 aceito: false` de `POST /api/eventos/:id/checkin` | idem |
| `DESFECHO_SIMULADO` | corpo de `POST /api/pagamentos/:id/simular` | É gatilho da demo, não estado. No CP6 quem chama é o gateway |

O valor delas nunca é persistido. Criar `CREATE TYPE` para elas confundiria vocabulário de
protocolo com estado — e a única consequência prática seria uma migração a cada mensagem de
erro nova.

## 15. Inventário de dados pessoais (LGPD)

Base para RNF-020 e RNF-021. Toda coluna com dado pessoal está listada — se um campo novo
não aparecer aqui, o PR que o criou está incompleto.

| Dado | Onde | Categoria | Base legal (premissa) | Retenção | Ação na exclusão do titular |
|---|---|---|---|---|---|
| Nome | `usuario.nome`, exibido em publicações e listas | Identificação | Execução de contrato (uso do app) | Enquanto a conta existir | Substituído por `Usuário removido` |
| E-mail institucional | `usuario.email` | Identificação e vínculo | Execução de contrato | Enquanto a conta existir | Substituído por hash irreversível (mantém unicidade) |
| Senha (hash) | `usuario.senha_hash` | Credencial | Execução de contrato | Enquanto a conta existir | Apagado |
| Vínculo acadêmico | `usuario.faculdade_id`, `.curso_id`, `.turma_id` | Dado acadêmico | Execução de contrato | Enquanto a conta existir | Mantido apenas de forma agregada |
| Histórico de participação | `participacao` | Comportamental | Execução de contrato | 5 anos (histórico do evento) | Anonimizado: `usuario_id` aponta para a linha anonimizada |
| Presença em evento | `presenca` | Comportamental | Execução de contrato | 5 anos | Anonimizada, preservando a contagem |
| Registro de pagamento | `pagamento` (`valor`, `status`, `transacao_externa_id`) | Financeiro | Obrigação legal e contratual | 5 anos | **Retido** por obrigação fiscal/contábil |
| **Resumo do cartão** | `pagamento.ultimos_quatro`, `.bandeira_cartao`, `.titular_cartao` | Financeiro e de identificação | Execução de contrato | 5 anos, junto do registro de pagamento | `titular_cartao` anonimizado; os 4 dígitos e a bandeira são **retidos** por obrigação fiscal |
| Fotos publicadas e comentários | `publicacao`, `comentario` | Conteúdo do titular | Consentimento | Enquanto a publicação existir | Apagados a pedido do titular |
| Notificações | `notificacao` | Comportamental | Execução de contrato | 90 dias | Apagadas |

**Não coletado, e por isso ausente do inventário:** CPF, RG, telefone, endereço, data de
nascimento, gênero, dado de saúde, geolocalização, **número de cartão, CVV e validade**.

**Não é dado pessoal, e por isso também está fora:** `usuario.avatar_seed` — um número que
escolhe a cor do avatar de iniciais. A entrada "foto de perfil" do CP4 saiu do inventário
porque `foto_url` nunca existiu no código: não há *upload*, não há storage, não há imagem.

> **Como o inventário mudou no CP5, e por quê.** Saiu uma linha que descrevia um campo
> inexistente (`foto_url`) e entrou uma linha que descreve três campos que existem
> (`ultimos_quatro`, `bandeira_cartao`, `titular_cartao`). O saldo é que o inventário passou
> a ser **verificável contra o código** — que é a única propriedade que faz um inventário
> LGPD valer algo. A regra desta seção continua a mesma: se um campo novo com dado pessoal
> não aparecer aqui, o PR que o criou está incompleto.

---

## 16. Tipos que **não** são tabela

`packages/shared/src/types.ts` declara 45 tipos. Treze deles são tabela, e a décima quarta
tabela — `sessao` — **não tem tipo compartilhado**, de propósito: o `refresh_hash` nunca
atravessa a rede, e tipo compartilhado é, por definição, tipo que os dois lados conhecem. Os
20 abaixo não têm coluna, não têm restrição e não viram `CREATE TABLE` — estão listados
porque **a tela conversa com eles**, e porque a tentação de "guardar" um deles é o erro mais
caro que este modelo pode sofrer.

### Projeções de leitura — o que a API devolve

| Tipo | Endpoint que o devolve | Por que não é tabela |
|---|---|---|
| `EventoView` | `GET /api/eventos`, `GET /api/eventos/:id`, `GET /api/eventos/destaque` | `extends Evento` e acrescenta 7 campos: 5 derivados (`availableSpots`, `enrollmentOpen`, `waitlistSize`, `alcanceRotulo`, e `taxaOcupacao` calculada em linha em `toEventoView` — `domain/capacity.ts#occupancyRate` existe e **não** é chamada ali) e 2 `JOIN` (`organizador`, `minhaParticipacao`) |
| `ParticipacaoView` | `GET /api/participacoes`, `GET /api/participacoes/:id` | `extends Participacao` com `evento`, `pagamento` e `presenca` resolvidos |
| `PagamentoView` | `GET` e `POST /api/participacoes/:id/pagamento`, `POST /api/pagamentos/:id/simular` | `extends Pagamento` com `pix` derivado, `cartao` lido das três colunas e `minutosRestantes` calculado pelo servidor |
| `PublicacaoView` | `GET /api/feed`, `POST /api/publicacoes` | `extends Publicacao` com autor, evento e comentários já resolvidos |
| `PresencaView` | dentro de `PainelCheckin` | `extends Presenca` com o participante resolvido |
| `SessaoUsuario` | `GET /api/sessao`, `POST /api/auth/onboarding` | Compõe `Usuario` + `Faculdade` + `Curso` + `Turma`. É `JOIN`, não tabela |
| `PainelCheckin` | `GET /api/eventos/:id/checkin` | Dois `COUNT` (`confirmados`, `presentes`), uma comparação de relógio (`abertoAgora`) e a janela de `checkInWindow`. Gravar isso seria gravar algo errado um segundo depois |
| `TokenIngresso` | `GET /api/participacoes/:id/token` | `valor` é assinado a cada emissão; `codigoNumerico` e `codigoLegivel` são derivados de `participacao.id`. Guardá-los criaria uma segunda verdade sobre o mesmo ingresso |
| `ResultadoLogin` | `POST /api/auth/login` | Token + sessão. O token vive em `sessionStorage`, no cliente |
| `ResultadoCheckin` | `POST /api/eventos/:id/checkin` | O **veredito** de uma leitura. O que fica gravado é a `presenca`, não o veredito |
| `ResultadoInscricao` | `POST /api/eventos/:id/participacoes` | União discriminada de 4 desfechos. O que fica gravado é a `participacao` |

### Objetos-valor

| Tipo | Situação |
|---|---|
| `PoliticaReembolso` | **Persistido**, como `participacao.politica_vigente` em `jsonb`. Objeto-valor imutável, congelado no pagamento ([RN-013](../04-regras-de-negocio.md)) |
| `ResumoCartao` | **Persistido**, como três colunas de `pagamento`. Ver a seção 7 e a decisão 9 de [`02-diagrama-classes.md`](02-diagrama-classes.md) |
| `CobrancaPix` | **Não persistido.** Derivado por `gerarCobrancaPix` a cada leitura ([RN-028](../04-regras-de-negocio.md)) |

### Entradas de escrita e filtros — o que a tela envia

| Tipo | Vai para | Validado por |
|---|---|---|
| `Credenciais` | `POST /api/auth/login` | `emailBemFormado`, `senhaAceitavel` no cliente; `decideLogin` no servidor |
| `EntradaOnboarding` | `POST /api/auth/onboarding` | `normalizaCodigo` no cliente; `decideOnboarding` no servidor |
| `NovoEvento` | `POST /api/eventos` | `eventFormSchema` (Zod, que **chama** `validateDeadlines`) no cliente; âncora do vínculo no servidor |
| `NovoPagamento` | `POST /api/participacoes/:id/pagamento` | `luhnValido`, `validadeNoFuturo`, `cvvValido`, `resumirCartao` no cliente |
| `NovaPublicacao` | `POST /api/publicacoes` | tamanho da legenda 2 a 500, alcance e participação no servidor |
| `NovoComentario` | `POST /api/publicacoes/:id/comentarios` | tamanho do texto 2 a 280 no servidor |
| `FiltroEventos` | *query string* de `GET /api/eventos` | `aplicarFiltros` em `mocks/support.ts` |

E os três tipos de filtro — `FiltroAlcance`, `FiltroPreco`, `FiltroPeriodo` — que são
uniões de literais de UI, não enumerações de domínio: `'TODOS' | 'MINHA_TURMA' | 'MEU_CURSO'
| 'FACULDADE'` descreve **botões de filtro**, e `TODOS` não é um alcance que um evento possa
ter. Confundi-los com `AlcanceEvento` colocaria um valor impossível na coluna `alcance`.
