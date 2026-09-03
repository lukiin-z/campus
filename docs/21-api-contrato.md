# Contrato da API — CP6

**Responsável técnico:** Lucas Baraldi (Tech Lead / Arquiteto)
**Fonte única:** [`api/openapi.yaml`](../api/openapi.yaml) — **38 caminhos, 43 operações,
44 schemas**, OpenAPI 3.1.0.

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-02 | CP6 | Documento criado: as 43 operações por módulo, as duas convenções de status com exemplo, o vocabulário de códigos estáveis e a reconciliação com as 30 rotas do mock do CP5 |

---

## 0. Este documento deriva do YAML, e o YAML vence

**Se este documento e [`api/openapi.yaml`](../api/openapi.yaml) discordarem, o YAML está
certo e este texto está errado.** Não há exceção, e a regra existe por causa de um defeito
concreto do projeto: entre o CP4 e o CP5, a tabela de endpoints escrita à mão em
[`08-arquitetura.md` §5](08-arquitetura.md#5-contrato-da-api) e as rotas de fato
implementadas divergiram em três nomes, e ninguém percebeu até alguém conferir arquivo por
arquivo. O registro está em [`17-jornada.md`](17-jornada.md).

A conclusão que o projeto tirou dali não foi "conferir com mais cuidado" — foi **parar de
ter duas fontes**. Então:

| Papel | Arquivo | O que ele é |
|---|---|---|
| **Fonte** | [`api/openapi.yaml`](../api/openapi.yaml) | Contrato executável. Serve o spec, valida requisição e resposta, gera cliente |
| **Leitura** | este documento | A mesma informação em prosa, com o **porquê** de cada escolha de status |
| **Runtime** | `/api/docs` (`@nestjs/swagger`) | Spec gerado do código **em execução**. Tem de concordar com o YAML na lista de caminhos |

O terceiro item é o que fecha o laço: um spec escrito e um spec gerado do código que
concordam provam que o contrato é o que roda. Divergir entre eles é defeito de entrega.

Como reconferir os números desta página:

```bash
grep -cE '^  /' api/openapi.yaml                      # 38 caminhos
grep -cE '^    (get|post|put|patch|delete):' api/openapi.yaml   # 43 operações
```

### Convenções válidas em todas as rotas

| Convenção | Valor |
|---|---|
| Base | `/api` — `http://localhost:3000/api` no `docker compose` |
| Autenticação | `Authorization: Bearer <accessToken>`, JWT de **15 min** |
| Renovação | `POST /auth/refresh` com o refresh no **corpo**, não em cookie |
| Corpo | `application/json; charset=utf-8` |
| Instantes | ISO 8601 com fuso (`timestamptz(3)` no banco) |
| Dinheiro | `numeric(10,2)` em **reais com centavos** — ver a nota na seção 5 |
| Erro | sempre a mesma forma: `{ erro, mensagem, acao?, detalhes? }` |

As quatro operações sem `Authorization`: `GET /health`, `POST /auth/cadastro`,
`POST /auth/login`, `POST /auth/refresh`, mais os três caminhos acadêmicos públicos
(`GET /faculdade`, `GET /cursos`, `GET /cursos/{id}/turmas`) — que a tela de onboarding
precisa antes de existir sessão. `POST /pagamentos/webhook` é a única superfície
autenticada por **assinatura HMAC** (`X-Assinatura`) em vez de token.

---

## 1. As duas convenções de status, com exemplo

Estas duas seções explicam a maior parte das escolhas de código do contrato. Elas estão
repetidas na `description` do próprio `openapi.yaml` e no cabeçalho de
[`api/src/comum/erros.ts`](../api/src/comum/erros.ts) — três lugares, de propósito: é a
regra que um endpoint novo erra primeiro.

### 1.1 `404` para invisível — revelar a existência já é vazamento

Um evento de alcance `TURMA` acessado por quem não é da turma responde **`404`**, nunca
`403`.

```http
GET /api/eventos/evt-014
Authorization: Bearer <token de aluno de OUTRA turma>

HTTP/1.1 404 Not Found
{ "erro": "NAO_ENCONTRADO", "mensagem": "Esse evento não existe ou não é do seu alcance." }
```

A resposta é **byte por byte igual** à de um `id` que nunca existiu. É deliberado:

- Um `403 "você não pode ver este evento"` confirma que `evt-014` existe. Quem quiser
  descobrir a agenda de outra turma só precisa varrer identificadores e separar `403` de
  `404` — o alcance de RN-001 vaza sem nenhuma leitura de dado.
- A mensagem é ambígua **de propósito** ("não existe **ou** não é do seu alcance"). Dizer
  qual dos dois casos é reintroduz a distinção que o status apagou.

**Onde o `403` aparece, então.** Só onde a existência do recurso **já** é conhecida por
quem pede. As 15 respostas `403` do contrato caem todas nesse padrão:

| Situação | Por que `403` e não `404` |
|---|---|
| `PATCH /eventos/{id}` por quem vê o evento mas não o organiza | Ele acabou de ler o evento por `GET`. Esconder agora seria incoerente |
| `GET /eventos/{id}/checkin` por participante | Ele está inscrito: sabe que o evento existe |
| `GET /participacoes/{id}/token` de participação de outra pessoa | O `id` veio de um link que ele tem |
| `GET /admin/eventos-pendentes` por aluno | O caminho é público na documentação; o que falta é papel |

**Consequência de teste, e é a parte que engana.** Um teste que espera `403` para "fora do
alcance" reprova contra este contrato, e está certo em reprovar. O `404` de invisibilidade
é comportamento verificado, não detalhe de implementação — RN-001 e RNF-012.

### 1.2 `409` versus `422` — o que pode deixar de acontecer, e o que não

| | `409 Conflict` | `422 Unprocessable Entity` |
|---|---|---|
| O que é | Conflito com o **estado atual** | **Regra de negócio** violada |
| Muda por espera? | **Pode.** A vaga pode abrir | **Não.** O prazo não desencerra |
| Traz `acao`? | Às vezes — é o próximo passo possível | Nunca |
| Quantas no contrato | 13 | 18 |

O caso que define a diferença é a última vaga:

```http
POST /api/eventos/evt-002/participacoes
Authorization: Bearer <token>

HTTP/1.1 409 Conflict
{
  "erro": "SEM_VAGA",
  "mensagem": "Este evento está lotado.",
  "acao": "LISTA_ESPERA",
  "totalFila": 7
}
```

O `409` **não é um beco sem saída**: `acao: "LISTA_ESPERA"` diz ao cliente que existe uma
operação legítima em seguida — `POST /eventos/{id}/lista-espera`. É por isso que o botão do
app troca de rótulo em vez de exibir erro. O campo `acao` só existe porque `409` é
recuperável; ele não aparece em nenhum `422`.

Compare com o prazo encerrado, no **mesmo endpoint**:

```http
POST /api/eventos/evt-007/participacoes

HTTP/1.1 422 Unprocessable Entity
{ "erro": "PRAZO_ENCERRADO", "mensagem": "As inscrições para este evento já fecharam." }
```

Nada que o cliente faça muda isso, e não há `acao` a oferecer. Esperar não ajuda — piora.

**Uma escolha do CP6 que vale registrar: `410 Gone` desapareceu.** O contrato planejado no
CP4 usava `410` para janela expirada (oferta vencida, cobrança fora do prazo). O
`openapi.yaml` do CP6 **não tem nenhum `410`**:

```bash
grep -c "'410'" api/openapi.yaml   # 0
```

O motivo é que `410` não acrescentava informação que o par `409`/`422` já não desse, e
custava uma terceira regra para o cliente aprender. Oferta vencida é `409 OFERTA_EXPIRADA`
— conflito com o estado atual, e o cliente pode voltar para a fila. Cobrança fora do prazo
é `422 PRAZO_ENCERRADO` — não muda por espera. Duas convenções cobrem os dois casos, e a
terceira ficava sem trabalho.

### 1.3 O campo `erro` é o contrato; `mensagem` não é

```jsonc
{
  "erro": "SEM_VAGA",              // contrato: SCREAMING_SNAKE_CASE, estável
  "mensagem": "Este evento está lotado.",  // para leitura humana; PODE mudar
  "acao": "LISTA_ESPERA",          // só em alguns 409
  "detalhes": [                    // só em 422 de validação
    { "campo": "capacidade", "mensagem": "Capacidade vai de 2 a 2000." }
  ]
}
```

**Cliente que decide tela comparando `mensagem` está errado**, e o contrato diz isso na
própria descrição do schema. `mensagem` é escrita no tom de voz da marca
([`06-marca/identidade-visual.md`](06-marca/identidade-visual.md)) e pode ser reescrita sem
quebrar ninguém. `erro` não pode.

O vocabulário de códigos estáveis tem duas origens, e as duas são código:

| Origem | Códigos |
|---|---|
| [`api/src/comum/erros.ts`](../api/src/comum/erros.ts) — transporte | `NAO_AUTENTICADO`, `SEM_PERMISSAO`, `NAO_ENCONTRADO`, `LIMITE_EXCEDIDO` |
| [`packages/shared/src/types.ts`](../packages/shared/src/types.ts) — domínio | as quatro uniões `MOTIVO_RECUSA_*`, listadas na seção 3 |

A segunda origem é o ponto: os motivos de recusa **não** são strings soltas no controlador.
São uniões de tipo que o app e a API importam do mesmo pacote, então um código novo aparece
no autocompletar dos dois lados no mesmo commit.

---

## 2. As 43 operações, por módulo

Legenda de autenticação: **pub** = sem token · **aut** = qualquer titular autenticado ·
**org** = organizador do evento ou admin com competência no escopo · **adm-f** = Admin de
Faculdade · **adm-c** = Admin de Curso · **hmac** = assinatura do gateway.

Os códigos na coluna "erros" são os **códigos estáveis** do campo `erro`; o número entre
parênteses é o status HTTP. `401 NAO_AUTENTICADO` vale em toda rota autenticada e por isso
não é repetido linha por linha.

### 2.1 Saúde — 1 operação

| Método | Rota | Aut. | Request | `200` | Erros |
|---|---|---|---|---|---|
| `GET` | `/health` | pub | — | `Saude` | — |

`Saude` traz o estado da conexão com o banco, não só "o processo está de pé". É o que o
`healthcheck` do `docker compose` consulta antes de considerar a API pronta — processo que
responde sem banco é o modo de falha que um `/ping` estático esconde.

### 2.2 Autenticação — 6 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `POST` | `/auth/cadastro` | pub | `Cadastro` | `201 ResultadoLogin` | `409` e-mail já cadastrado · `422 DOMINIO_NAO_INSTITUCIONAL` · `429 LIMITE_EXCEDIDO` |
| `POST` | `/auth/login` | pub | `Credenciais` | `201 ResultadoLogin` | `401 CREDENCIAL_INVALIDA` · `422 DOMINIO_NAO_INSTITUCIONAL`, `EMAIL_NAO_VERIFICADO` · `429 LIMITE_EXCEDIDO` |
| `POST` | `/auth/refresh` | pub | `Refresh` | `201 ResultadoLogin` | `401` refresh inválido, expirado ou revogado |
| `POST` | `/auth/logout` | aut | `Refresh` | `204` | `401` |
| `POST` | `/auth/onboarding` | aut | `EntradaOnboarding` | `201 SessaoUsuario` | `409` já vinculado · `422 CODIGO_INVALIDO`, `CODIGO_INATIVO`, `CODIGO_DE_OUTRO_CURSO`, `CURSO_INEXISTENTE` |
| `GET` | `/sessao` | aut | — | `200 SessaoUsuario` | `401` |

Quatro coisas que a tabela não diz:

**`401` e `422` no login carregam informações diferentes de propósito.** Senha errada é
`401 CREDENCIAL_INVALIDA` — a conta pode existir e a tela oferece "tentar de novo".
Domínio não institucional é `422 DOMINIO_NAO_INSTITUCIONAL` — essa conta nunca vai
funcionar, e a tela diz o que fazer. Um único status para os dois casos daria a mesma tela
para dois problemas opostos. A decisão é de `decideLogin`
([`packages/shared/src/domain/auth.ts`](../packages/shared/src/domain/auth.ts)), e o mesmo
`MOTIVO_RECUSA_LOGIN` tipa a resposta nos dois lados.

**`POST /auth/logout` exige o refresh no corpo**, e não só o access token no cabeçalho.
Motivo: logout revoga **uma sessão**, e é o refresh que identifica qual linha de `sessao`
apagar. Revogar "a sessão do access token" desconectaria a pessoa de todos os dispositivos
— comportamento diferente, que o produto não pede.

**`/auth/refresh` é `pub` no contrato, e isso não é descuido.** O access token pode estar
expirado — é exatamente por isso que se está renovando. Exigir `Authorization` válido no
endpoint de renovação faria a renovação depender do que ela existe para consertar. A
autenticação dela é o próprio refresh, que é opaco, revogável e tem só o **hash** guardado
em `sessao.refresh_hash` (RNF-020).

**`GET /sessao` devolve o vínculo resolvido**, não o usuário cru: usuário + faculdade +
curso + turma em um objeto. É o que toda tela consome junto, e foi a razão de o nome do
mock ter vencido `GET /me` no CP5 (seção 4).

### 2.3 Acadêmico — 3 operações

| Método | Rota | Aut. | Request | `200` | Erros |
|---|---|---|---|---|---|
| `GET` | `/faculdade` | pub | — | `Faculdade` | — |
| `GET` | `/cursos` | pub | — | `ListaCursos` | — |
| `GET` | `/cursos/{id}/turmas` | pub | — | `ListaTurmas` | `404 NAO_ENCONTRADO` |

São públicos porque o onboarding acontece **antes** de existir vínculo: a tela precisa
listar cursos para a pessoa escolher o dela. `Faculdade.dominiosEmail` é público de
propósito — é o que a tela de cadastro usa para dizer "use seu e-mail `@fiap.com.br`" antes
de o servidor recusar. Nenhum dos três expõe dado pessoal.

`ListaTurmas` traz `codigoConvite`. **Isso é dado de convite, não segredo**: é o código que
o aluno digita, e RN-003 não o trata como credencial — o vínculo se prova pelo par
(curso, código), e o código é revogável por `GET /admin/turmas/{id}/codigo`.

### 2.4 Eventos — 8 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `GET` | `/eventos` | aut | *query:* `alcance`, `preco`, `periodo`, `busca` | `200 ListaEventos` | `401` |
| `POST` | `/eventos` | aut | `NovoEvento` | `201 Evento` | `422` prazos incoerentes, capacidade fora da faixa, âncora fora do vínculo |
| `GET` | `/eventos/destaque` | aut | — | `200 ListaEventos` | `401` |
| `GET` | `/eventos/{id}` | aut | — | `200 Evento` | `404 NAO_ENCONTRADO` (inexistente **ou** invisível) |
| `PATCH` | `/eventos/{id}` | org | `EdicaoEvento` | `200 Evento` | `403 SEM_PERMISSAO` · `404` · `409` já cancelado ou realizado · `422` capacidade abaixo de `ocupadas` (RN-005) |
| `POST` | `/eventos/{id}/cancelamento` | org | `CancelamentoEvento` | `201 Evento` | `403` · `404` · `409` já cancelado · `422` motivo ausente |
| `POST` | `/eventos/{id}/aprovacao` | adm-f | — | `201 Evento` | `403` · `404` · `409` não está em aprovação |
| `GET` | `/eventos/{id}/participantes` | org | — | `200 ListaParticipantes` | `403` · `404` |

**Os quatro filtros de `GET /eventos` são enumerações fechadas**, e os valores são os mesmos
`FiltroAlcance`, `FiltroPreco` e `FiltroPeriodo` de
[`packages/shared/src/types.ts`](../packages/shared/src/types.ts) — conferido valor por
valor. `busca` tem `maxLength: 120`. Filtro fora do conjunto é `422` do
`ValidationPipe`, com `detalhes` apontando o campo.

**O filtro não é a autoridade de alcance.** `alcance=FACULDADE` não amplia o que a pessoa
vê: a consulta já sai filtrada pelo vínculo do titular antes de o filtro do cliente ser
aplicado. `alcance` escolhe **entre o que ela já podia ver**. Tratar o parâmetro como
autoridade seria oferecer ao cliente a chave do próprio cofre — RN-001, RNF-012.

**`GET /eventos/{id}/participantes` respeita o opt-out.** RNF-021 e RF-009: quem marcou
`visivelEntreConfirmados = false` não aparece na lista, e o **contador continua certo**. A
lista é do organizador; a privacidade é do aluno, e as duas coisas convivem porque o total
não depende de nomear ninguém.

**`POST /eventos/{id}/cancelamento` é um caminho próprio, e não `DELETE /eventos/{id}`.** O
cancelamento **não apaga**: muda status, cancela participações em cascata, marca reembolsos
e preserva presenças já registradas (RN-021, RN-022). `DELETE` prometeria remoção, e a FK
`participacao.evento_id` é `RESTRICT` exatamente para que remoção não aconteça. O corpo
carrega o motivo, que o `CHECK ck_evento_cancelado_tem_motivo` torna obrigatório no banco.

### 2.5 Participações — 6 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `POST` | `/eventos/{id}/participacoes` | aut | — | `201 Participacao` | `404` · `409 SEM_VAGA` + `acao: LISTA_ESPERA`, `409 JA_INSCRITO` · `422 PRAZO_ENCERRADO`, `EVENTO_CANCELADO`, `EVENTO_NAO_PUBLICADO` |
| `POST` | `/eventos/{id}/lista-espera` | aut | — | `201 Participacao` | `404` · `409` ainda tem vaga, já na fila · `422 PRAZO_ENCERRADO` |
| `GET` | `/participacoes` | aut | — | `200 ListaParticipacoes` | `401` |
| `GET` | `/participacoes/{id}` | aut | — | `200 Participacao` | `404` |
| `DELETE` | `/participacoes/{id}` | aut | — | `200 ResultadoCancelamento` | `404` · `422` evento já realizado |
| `POST` | `/participacoes/{id}/confirmar` | aut | — | `201 Participacao` | `404` · `409` oferta expirada, sem oferta · `422` |

**`SEM_VAGA` é `409` e `PRAZO_ENCERRADO` é `422`, no mesmo endpoint.** É o exemplo de
manual da seção 1.2, e é o par que um cliente aprende primeiro.

**`DELETE /participacoes/{id}` devolve corpo, não `204`.** `ResultadoCancelamento` diz se a
vaga foi liberada, se alguém foi promovido da fila e se há reembolso — três informações que
a tela precisa mostrar no mesmo instante. Um `204` obrigaria a recarregar o evento para
descobrir o efeito da própria ação.

**A promoção do primeiro da fila acontece na mesma transação do cancelamento.** Quem decide
é `planPromotion`
([`packages/shared/src/domain/waitlist.ts`](../packages/shared/src/domain/waitlist.ts)),
função pura: ela devolve `FILA_VAZIA`, `JANELA_INVIAVEL` ou `PROMOVER`, e quem escreve é o
serviço de aplicação. **Uma oferta por vaga liberada** — oferecer a mesma vaga a duas
pessoas recriaria o overbooking que RN-004 proíbe.

**`GET /participacoes/{id}` responde `404` para participação de outra pessoa**, não `403`.
Aqui a regra da seção 1.1 se aplica sem exceção: o identificador de uma participação alheia
não deveria confirmar nada a quem tenta.

### 2.6 Pagamentos — 5 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `POST` | `/participacoes/{id}/pagamento` | aut | `NovoPagamento` | `201 Pagamento` | `403` · `404` · `409` cobrança aberta (RN-027) · `422` evento gratuito, participação não pendente |
| `GET` | `/participacoes/{id}/pagamento` | aut | — | `200 Pagamento` | `403` · `404` |
| `POST` | `/pagamentos/webhook` | hmac | `WebhookPagamento` | `201 AceitePagamento` | `401` assinatura inválida · `422` corpo malformado |
| `POST` | `/pagamentos/{id}/simular` | aut | `DesfechoSimulado` | `201 Pagamento` | `404` · `409` |
| `POST` | `/participacoes/{id}/reembolso` | aut | — | `201 Pagamento` | `403` · `404` · `409` reembolso já solicitado · `422` fora da política, pagamento não confirmado |

**`NovoPagamento` não tem campo para número de cartão, validade ou CVV — nem opcional.**
RNF-022 se cumpre pela **forma** do contrato: `ResumoCartao` é
`additionalProperties: false` com exatamente `ultimosQuatro` (`^[0-9]{4}$`), `bandeira` e
`titular`. Um cliente que tentasse enviar o número recebe `422` do próprio validador, e a
regra deixa de depender de alguém lembrar. No banco, o
`CHECK ck_pagamento_pix_sem_cartao` fecha o outro lado: método `PIX` exige as três colunas
nulas.

**A cobrança é idempotente por participação (RN-027).** Duplo toque em "Pagar agora" não
gera dois Pix: a segunda chamada devolve a cobrança existente. E a garantia não é do
código, é do banco — `ux_pagamento_aguardando_por_participacao`, índice único **parcial**
em `participacao_id WHERE status = 'AGUARDANDO'`. O parcial é essencial: cobrança recusada
ou estornada pode conviver com uma tentativa nova.

**O webhook responde sucesso no reprocessamento, e isso é a definição de idempotência.**
A mesma notificação chegando duas vezes devolve `201 AceitePagamento` nas duas, e a segunda
não escreve nada. Responder erro faria o gateway reenviar indefinidamente — idempotência é
resposta de sucesso **sem efeito**, não recusa. A garantia é o
`UNIQUE (chave_idempotencia)` de `pagamento` (RN-014).

**`POST /pagamentos/{id}/simular` existe e é declarado no contrato**, com "só fora de
produção" na própria `summary`. Ele ocupa o lugar do gateway na demonstração
([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)) e aceita `CONFIRMAR`, `RECUSAR`
ou `DUPLICAR` — o terceiro serve para exercitar a idempotência ao vivo. Esconder do
contrato uma rota que existe seria pior do que declará-la com o limite escrito.

**Dinheiro é `numeric(10,2)` em reais, e o contrato diz `type: number`.** Divergência
declarada em relação ao [`08-arquitetura.md` §5](08-arquitetura.md#5-contrato-da-api), que
dizia "dinheiro sempre em centavos inteiros": o código do CP5 e o `schema.prisma`
convergiram em `Decimal(10,2)`, e o contrato do CP6 acompanhou o código. A precisão é
exata nos dois casos; o que muda é a unidade, e ela ficou sendo o real.

### 2.7 Check-in — 4 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `GET` | `/participacoes/{id}/token` | aut | — | `200 TokenIngresso` | `403` · `404` · `409 NAO_CONFIRMADA` |
| `GET` | `/eventos/{id}/checkin` | org | — | `200 PainelCheckin` | `403` · `404` |
| `POST` | `/eventos/{id}/checkin` | org | `LeituraCheckin` | `201 ResultadoCheckin` | `403` · `404` · `422` |
| `POST` | `/participacoes/{id}/presenca-manual` | org | `PresencaManual` | `201 ResultadoCheckin` | `403` · `404` · `409 JA_UTILIZADO` · `422` |

**Recusa de check-in não é erro HTTP.** `ResultadoCheckin` tem `aceito: boolean`, e uma
leitura recusada volta com `aceito: false` e o motivo em `MOTIVO_RECUSA_CHECKIN` —
`TOKEN_INVALIDO`, `OUTRO_EVENTO`, `AINDA_NAO_ABRIU`, `JA_ENCERROU`, `JA_UTILIZADO`,
`NAO_CONFIRMADA`, `SEM_PERMISSAO` ou `EVENTO_CANCELADO`. O motivo é operacional: na porta
de um evento, o operador lê **oito ingressos por minuto** e precisa da mesma tela em todos
os casos, com o nome de quem passou ou a razão da recusa. Um `4xx` faria o cliente cair no
tratamento genérico de erro e perder o nome, o horário e o contador.

> **Divergência real e não corrigida aqui.** A `summary` desta operação no `openapi.yaml`
> diz "recusa é 200 com aceito=false", mas o único status de sucesso declarado é **`201`** —
> não há `200` no spec. O texto e o código de status discordam **dentro do mesmo arquivo**. O
> controlador não tem `@HttpCode`, então a API responde o `201` padrão do NestJS: contrato e
> implementação concordam, e é a `summary` que está errada. Está reportado na seção 6,
> item 2; este documento registra o que o YAML **declara** (`201`).

**As três formas de leitura convergem para uma decisão.** `LeituraCheckin.leitura` é uma
string crua — token do QR, numérico de 8 dígitos ou código impresso `CMP-3ESPX-0626`. Quem
classifica é o servidor (`classificarLeitura`), e as três caem na **mesma**
`decideCheckIn`. Um caminho por forma seriam três caminhos para divergir; na porta, as três
aparecem.

**O uso único é garantia do banco.** `presenca.participacao_id` é `UNIQUE`: o segundo
check-in do mesmo ingresso falha no `INSERT`, mesmo com dois operadores lendo em paralelo,
mesmo se a aplicação tiver um furo (RN-018). A recusa `JA_UTILIZADO` traz o **horário do
primeiro uso** — que é o que o operador precisa ler, e que no CP5 era um ramo morto até o
defeito 9 de [`17-jornada.md`](17-jornada.md) ser corrigido.

**`presenca-manual` exige motivo com no mínimo 10 caracteres.** Presença registrada sem
leitura é exceção, e exceção sem justificativa escrita é auditoria sem responsável (RN-018).

### 2.8 Feed — 5 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `GET` | `/feed` | aut | — | `200 ListaPublicacoes` | `401` |
| `GET` | `/feed/eventos-publicaveis` | aut | — | `200 ListaEventosResumidos` | `401` |
| `POST` | `/publicacoes` | aut | `NovaPublicacao` | `201 Publicacao` | `403` · `404` · `422` |
| `POST` | `/publicacoes/{id}/comentarios` | aut | `NovoComentario` | `201 Comentario` | `404` · `422` texto vazio |
| `POST` | `/publicacoes/{id}/remocao` | org | `RemocaoPublicacao` | `201 Publicacao` | `403` · `404` · `422` motivo ausente |

**`GET /feed/eventos-publicaveis` existe para a tela não precisar adivinhar RN-019.** Quem
pode publicar é decidido por `canPostToEvent`, e a lista de eventos elegíveis vem do
servidor pronta. A alternativa — o cliente filtrar as próprias participações — foi
exatamente o defeito 11 do CP5: o handler usava `isActive`, então quem estava na **fila de
espera** publicava por requisição direta. Hoje `canPostToEvent` é a autoridade única, nos
dois endpoints.

**`POST /publicacoes/{id}/remocao`, e não `DELETE /publicacoes/{id}`.** Remoção registra
`motivo_remocao` e `removida_por_id`, e o `CHECK ck_publicacao_remocao_justificada` exige
os dois quando `removida = true` (RN-020). Moderação sem responsável nomeado não é
moderação. `DELETE` sem corpo não teria onde carregar o motivo.

**Nenhuma imagem trafega.** `NovaPublicacao` carrega legenda e uma semente; a imagem é
gerada localmente a partir de `imagem_seed`. Não há upload, storage nem moderação de
imagem na v1 — decisão de escopo, declarada em [`03-escopo.md`](03-escopo.md).

### 2.9 Notificações — 3 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `GET` | `/notificacoes` | aut | — | `200 ListaNotificacoes` | `401` |
| `POST` | `/notificacoes/{id}/lida` | aut | — | `204` | `404` |
| `POST` | `/notificacoes/lidas` | aut | — | `204` | `401` |

São as únicas três operações do contrato que respondem `204` — junto com `POST
/auth/logout`, quatro no total. O critério é uniforme: **`204` só quando não há nada que a
tela precise ler de volta.** "Foi lida" não produz informação nova; o contador de não lidas
vem da próxima leitura de `GET /notificacoes`.

`POST /notificacoes/{id}/lida` em vez de `PATCH /notificacoes/{id}` com `{lida: true}` é
decisão do CP5 mantida: "foi lida" é um **evento**, não edição parcial de recurso. O `PATCH`
genérico convida a aceitar qualquer campo do corpo, e `POST /notificacoes/lidas` (marcar
todas) não teria forma natural no modelo `PATCH`. Ver a seção 4.

### 2.10 Administração — 2 operações

| Método | Rota | Aut. | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| `GET` | `/admin/eventos-pendentes` | adm-f | — | `200 ListaEventos` | `403 SEM_PERMISSAO` |
| `GET` | `/admin/turmas/{id}/codigo` | adm-c | — | `200 Turma` | `403` · `404` |

Os dois usam `403` e não `404` porque o caminho `/admin/*` é público na documentação: o que
falta a um aluno é papel, não conhecimento da existência da rota. Esconder um caminho
documentado seria fingir um segredo que o próprio `openapi.yaml` já entrega.

> **Divergência real e não corrigida aqui.** `GET /admin/turmas/{id}/codigo` **muda
> estado**: a `summary` diz "Gera um código de convite novo e desativa o anterior". `GET`
> tem de ser seguro e idempotente — um *prefetch* do navegador, um crawler ou um duplo
> clique invalidariam o código de convite da turma sem ninguém pedir. Deveria ser
> `POST /admin/turmas/{id}/codigo`. Reportado na seção 6, item 1.

---

## 3. O vocabulário de códigos estáveis

As quatro uniões de motivo de recusa vivem em
[`packages/shared/src/types.ts`](../packages/shared/src/types.ts) e são importadas pelos
dois lados. **Não são tipos do banco** — descrevem resposta de API, não estado persistido,
e a distinção está em
[`05-modelagem/03-modelo-dados-er.md` §5](05-modelagem/03-modelo-dados-er.md#as-cinco-enumerações-que-não-são-tipos-do-banco).

| União | Valores | Onde aparece |
|---|---|---|
| `MOTIVO_RECUSA_LOGIN` | `DOMINIO_NAO_INSTITUCIONAL`, `CREDENCIAL_INVALIDA`, `EMAIL_NAO_VERIFICADO` | `POST /auth/login`, `POST /auth/cadastro` |
| `MOTIVO_RECUSA_ONBOARDING` | `CURSO_INEXISTENTE`, `CODIGO_INVALIDO`, `CODIGO_INATIVO`, `CODIGO_DE_OUTRO_CURSO` | `POST /auth/onboarding` |
| `MOTIVO_RECUSA_INSCRICAO` | `PRAZO_ENCERRADO`, `JA_INSCRITO`, `EVENTO_CANCELADO`, `FORA_DO_ALCANCE`, `EVENTO_NAO_PUBLICADO` | `POST /eventos/{id}/participacoes`, `POST /eventos/{id}/lista-espera` |
| `MOTIVO_RECUSA_CHECKIN` | `TOKEN_INVALIDO`, `OUTRO_EVENTO`, `AINDA_NAO_ABRIU`, `JA_ENCERROU`, `JA_UTILIZADO`, `NAO_CONFIRMADA`, `SEM_PERMISSAO`, `EVENTO_CANCELADO` | `POST /eventos/{id}/checkin` (em `aceito: false`) |

Mais o `SEM_VAGA` de RN-006, que não pertence a nenhuma das quatro porque não é recusa de
inscrição: é **conflito recuperável**, e é o único código do contrato que vem acompanhado
de `acao`.

Uma nota sobre `FORA_DO_ALCANCE`: ele existe em `MOTIVO_RECUSA_INSCRICAO` e é a decisão do
domínio, mas **não chega ao cliente como código de resposta** nas rotas de leitura — lá a
convenção da seção 1.1 transforma "fora do alcance" em `404 NAO_ENCONTRADO`. O domínio sabe
a diferença; o contrato não conta.

### `429` está declarado em duas operações, e não em cinco

`grep -c "'429'" api/openapi.yaml` devolve **2**: `POST /auth/cadastro` e
`POST /auth/login`. O plano do CP4 previa limite de taxa também em recuperação de senha,
exportação de dados, publicação de foto e comentário.

Duas das quatro **não existem no contrato do CP6** (recuperação de senha e exportação
ficaram fora do escopo, ver [`03-escopo.md`](03-escopo.md)). As outras duas —
`POST /publicacoes` e `POST /publicacoes/{id}/comentarios` — existem e **não declaram
`429`**. Isso é uma lacuna real do contrato, não uma decisão: os parâmetros
`RATE_LIMIT_TENTATIVAS` e `RATE_LIMIT_JANELA_SEGUNDOS` estão em
[`api/src/config/ambiente.ts`](../api/src/config/ambiente.ts) e a classe `LimiteExcedido`
existe em `api/src/comum/erros.ts`. Reportado na seção 6, item 4.

---

## 4. Reconciliação com o CP5

Esta seção é a razão de o documento existir. O contrato do CP4 e as rotas do mock do CP5
divergiram em três nomes, e [`08-arquitetura.md` §5.3](08-arquitetura.md#53-a-reconciliação-com-o-cp4-e-o-cp5)
registra a decisão que o CP5 tomou: **os nomes do mock prevalecem**. O CP6 aceita essa
decisão inteira e a torna executável — as três rotas abaixo entraram no `openapi.yaml` com
o nome que o código já usava.

| Rota do CP6 | O que o CP4 propunha | Por que o nome do mock venceu |
|---|---|---|
| `GET /sessao` | `POST /auth/sessao` + `GET /me` | O CP5 separou as duas operações de fato: `POST /auth/login` cria a sessão, `GET /sessao` lê o titular. E `GET /sessao` devolve usuário + faculdade + curso + turma **resolvidos**, que é o que toda tela consome junto |
| `GET /participacoes` | `GET /me/participacoes` | O titular sai do token, não do caminho. Repetir `/me` cria um segundo lugar para a autorização divergir |
| `POST /notificacoes/{id}/lida` | `PATCH /notificacoes/{id}` com `{lida: true}` | "Foi lida" é evento, não edição parcial. E `POST /notificacoes/lidas` (marcar todas) não teria forma natural com `PATCH` |

### 4.1 As 30 rotas do CP5 continuam todas no contrato

Conferido rota por rota contra os dois arquivos de handler do mock:

```bash
grep -hoE 'http\.(get|post|patch|delete)\(`\$\{BASE\}[^`]*' \
  app/src/mocks/handlers.ts app/src/mocks/handlersCp5.ts | wc -l   # 30
```

14 em [`handlers.ts`](../app/src/mocks/handlers.ts) (base do CP4) e 16 em
[`handlersCp5.ts`](../app/src/mocks/handlersCp5.ts). **Nenhuma foi removida, renomeada ou
teve o método trocado.** É o que faz a troca do mock pela API real não tocar em nenhuma
tela (RNF-016): a interface de repositório continua a mesma porque o contrato por baixo
dela continua o mesmo.

| Módulo | Rotas do CP5 mantidas no CP6 |
|---|---|
| Autenticação | `POST /auth/login` · `POST /auth/logout` · `POST /auth/onboarding` · `GET /sessao` |
| Acadêmico | `GET /faculdade` · `GET /cursos` · `GET /cursos/{id}/turmas` |
| Eventos | `GET /eventos` · `POST /eventos` · `GET /eventos/destaque` · `GET /eventos/{id}` |
| Participações | `POST /eventos/{id}/participacoes` · `POST /eventos/{id}/lista-espera` · `GET /participacoes` · `GET /participacoes/{id}` · `DELETE /participacoes/{id}` · `POST /participacoes/{id}/confirmar` |
| Pagamentos | `POST /participacoes/{id}/pagamento` · `GET /participacoes/{id}/pagamento` · `POST /pagamentos/{id}/simular` |
| Check-in | `GET /participacoes/{id}/token` · `GET /eventos/{id}/checkin` · `POST /eventos/{id}/checkin` |
| Feed | `GET /feed` · `GET /feed/eventos-publicaveis` · `POST /publicacoes` · `POST /publicacoes/{id}/comentarios` |
| Notificações | `GET /notificacoes` · `POST /notificacoes/{id}/lida` · `POST /notificacoes/lidas` |

### 4.2 As 13 operações que o CP6 acrescentou

30 + 13 = 43, que é o total do contrato. Cada uma existe por um requisito que o CP5 deixou
em aberto — nenhuma é enfeite de contrato.

| # | Operação | Por que ela não existia no CP5 |
|---|---|---|
| 1 | `GET /health` | Não havia processo para monitorar. Agora o `docker compose` depende dela para saber que a API subiu **com** banco |
| 2 | `POST /auth/cadastro` | RF-001 escorregou do CP5 para o CP6 ([`03-escopo.md` §8.1](03-escopo.md#81-o-que-o-cp5-fechou-e-o-que-escorregou-para-o-cp6)). No mock, contas só existiam no seed |
| 3 | `POST /auth/refresh` | O CP5 tinha **um** token opaco que morria com a aba. RNF-020 pede refresh revogável, e revogável exige estado no servidor — a tabela `sessao` |
| 4 | `PATCH /eventos/{id}` | RN-023 nunca foi implementada no mock. É a rota que RN-005 protege: capacidade só desce até `ocupadas` |
| 5 | `POST /eventos/{id}/cancelamento` | RN-021 e RN-022 existiam como regra escrita e função testada, sem endpoint |
| 6 | `POST /eventos/{id}/aprovacao` | RN-003: evento de alcance `FACULDADE` nascia `EM_APROVACAO` no mock e ficava lá — não havia quem aprovasse |
| 7 | `GET /eventos/{id}/participantes` | RF-009 e RNF-021: a lista com opt-out respeitado e contador correto |
| 8 | `POST /pagamentos/webhook` | No CP5 o próprio app disparava a confirmação por `simular`. Agora há uma **entrada** no sistema, autenticada por HMAC e idempotente por chave |
| 9 | `POST /participacoes/{id}/reembolso` | `computeRefund` e a política congelada existiam e eram testadas; nenhum endpoint as chamava |
| 10 | `POST /participacoes/{id}/presenca-manual` | RN-018 previa correção manual com motivo; o mock só tinha leitura |
| 11 | `POST /publicacoes/{id}/remocao` | RF-042 e RN-020: moderação com autor e motivo registrados |
| 12 | `GET /admin/eventos-pendentes` | RF-041. Sem ela, o item 6 não tem tela |
| 13 | `GET /admin/turmas/{id}/codigo` | RF-043: rotação do código de convite |

### 4.3 O que mudou de forma, e o que isso obriga o cliente a fazer

Duas rotas mantiveram o nome e trocaram o corpo. É a única quebra de compatibilidade do
CP5 para o CP6, e ela é intencional.

**`POST /auth/login` e `POST /auth/cadastro` devolvem `ResultadoLogin`, que mudou:**

```jsonc
// CP5 — app/src/mocks/handlersCp5.ts
{ "token": "campus.sess.usr-001", "sessao": { … } }

// CP6 — api/openapi.yaml, components/schemas/ResultadoLogin
{
  "accessToken":  "eyJhbGciOi…",   // JWT, 15 min
  "refreshToken": "…",             // opaco, revogável, hash em sessao.refresh_hash
  "expiraEm":     900,              // segundos de validade do access token
  "sessao":       { … }             // inalterado
}
```

O que a mudança obriga, e por que cada item é consequência dela e não escolha solta:

| Consequência | Por quê |
|---|---|
| O cliente guarda **dois** tokens, não um | Tempos de vida diferentes: 15 min contra a sessão inteira |
| `POST /auth/refresh` entra no cliente | Sem ele, a sessão morre em 15 min no meio da navegação |
| `POST /auth/logout` passa a exigir corpo | É o refresh que identifica **qual** linha de `sessao` revogar |
| `expiraEm` é **segundos**, não instante | O cliente agenda a renovação sem depender do relógio da máquina dele estar certo |

A decisão de onde os dois tokens moram está escrita em
[`app/src/services/sessao.ts`](../app/src/services/sessao.ts): os dois em
`sessionStorage`, em chaves separadas — porque fechar a aba tem de encerrar a sessão no
laboratório compartilhado que é o cenário das personas.

> **Divergência real e não corrigida aqui.** `packages/shared/src/types.ts` ainda declara
> `interface ResultadoLogin { token: string; sessao: SessaoUsuario }` — a forma do CP5. O
> contrato declara a forma nova. Como o pacote é a fonte única de tipos dos dois lados,
> **o tipo compartilhado está atrasado em relação ao contrato**. Reportado na seção 6,
> item 3; é código, e este documento não o altera.

**`POST /auth/login` responde `201`, e o mock do CP5 respondia `200`.** É parte de um padrão
mais amplo do contrato do CP6, tratado na seção 6, item 2.

---

## 5. O que o contrato não tem, e por quê

Declarar o limite vale mais que fingir que ele não existe.

| Não existe no contrato | Por quê |
|---|---|
| **Paginação por cursor** | `ListaEventos`, `ListaParticipacoes` e `ListaPublicacoes` devolvem a coleção inteira. A volumetria de [`05-modelagem/03-modelo-dados-er.md` §7](05-modelagem/03-modelo-dados-er.md#7-volumetria-estimada-premissa-do-grupo) é de 30 a 70 eventos por semestre. Cursor antes de existir a segunda página é complexidade sem demanda |
| **Versionamento em `/api/v1`** | Não há cliente externo para proteger. Seria uma constante a mais, sem consumidor |
| **`PATCH /me` e edição de perfil** | RF-006 e RF-012 escorregaram do CP5 e continuam fora ([`03-escopo.md`](03-escopo.md)) |
| **Exclusão e exportação de dados (RNF-021)** | Previstas no plano do CP4, fora do escopo do CP6. `usuario` nem tem a coluna `excluido_em` que o ER descrevia — ver a seção 6, item 5 |
| **Upload de imagem** | Capas e fotos do feed são geradas de uma semente. Sem storage, sem moderação de imagem, sem rede externa |
| **`410 Gone`** | Colapsado em `409`/`422`. Motivo na seção 1.2 |

---

## 6. Divergências abertas entre o contrato e o resto

Nenhuma destas cinco foi corrigida por este documento, porque as cinco são **código ou
contrato**, e este documento é leitura. Estão aqui para decisão de quem responde por eles.

**As duas primeiras têm o mesmo veredito, e ele é incomum: o código está certo e o contrato
está errado.** A implementação foi conferida, e nos dois casos ela já faz a coisa correta,
com o motivo escrito no próprio controlador. É o `openapi.yaml` que precisa mudar.

**1. `GET /admin/turmas/{id}/codigo` muda estado — e a API implementa como `POST`.** Um
`GET` que "gera um código novo e desativa o anterior" não é seguro nem idempotente:
*prefetch* do navegador, crawler ou duplo clique invalidam o convite da turma sem ninguém
pedir. O controlador acertou:

```ts
// api/src/academico/academico.controller.ts
@Post('admin/turmas/:id/codigo')
@HttpCode(200)
```

E o comentário acima da rota dá exatamente essa razão. **Correção: uma linha no
`openapi.yaml`** — trocar `get:` por `post:` naquele caminho. Enquanto isso não acontecer, um
cliente gerado a partir do YAML chama o método errado e recebe `404`.

**2. Todo `POST` do contrato declara `201` — inclusive os que não criam nada.** Oito
operações devolvem um recurso **modificado**, não criado, e `200` seria o código certo:
`/auth/onboarding`, `/eventos/{id}/cancelamento`, `/eventos/{id}/aprovacao`,
`/participacoes/{id}/confirmar`, `/pagamentos/{id}/simular`,
`/participacoes/{id}/reembolso`, `/publicacoes/{id}/remocao` e `/eventos/{id}/checkin` —
esta última com o agravante de a própria `summary` dizer `200`. O padrão sugere que o
gerador atribuiu `201` a todo `POST` sem olhar o efeito.

**E há uma divergência concreta dentro dessas oito, não só uma questão de estilo:**
`POST /pagamentos/webhook`. O contrato declara `201`; a API responde `200`, e o comentário
no controlador é a melhor justificativa do arquivo:

> `200`, e não o `201` padrão do `POST`: a notificação não cria recurso, e o reprocessamento
> de uma já vista é resposta de **sucesso sem efeito** (RN-014). `201` prometeria um recurso
> novo que não existe.

Um gateway que valide a resposta contra o contrato veria `200` onde o YAML promete `201`.
As outras sete são coerentes entre contrato e código (as duas dizem `201`), e ali a
pergunta é de projeto: `200` seria mais correto nas duas pontas.

**3. `ResultadoLogin` do pacote compartilhado está atrasado — e a API já contornou.**
`packages/shared/src/types.ts` declara `{ token, sessao }`, a forma do CP5. O contrato
declara `{ accessToken, refreshToken, expiraEm, sessao }`. A API, para não usar o tipo
desatualizado, **declarou um tipo local** com a forma certa:

```ts
// api/src/auth/tipos.ts
export interface ResultadoLoginApi {
  accessToken: string;
  refreshToken: string;
  expiraEm: number;   // segundos de validade do access token
  sessao: SessaoUsuario;
}
```

O contorno funciona e é a coisa pragmática a fazer sob prazo. Mas o resultado é que **existem
duas verdades sobre o mesmo corpo de resposta**: o `ResultadoLogin` do pacote, que o app
importa, e o `ResultadoLoginApi` da API, que descreve o que a API devolve de fato. É o exato
modo de falha que a [ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md) existe para
impedir — "duas cópias de um tipo é o jeito mais rápido de o front aceitar um valor que o
banco recusa" —, acontecendo antes de o pacote ser atualizado.

A correção é a que a ADR prescreve: atualizar `ResultadoLogin` no pacote e fazer a API
importá-lo, apagando `ResultadoLoginApi`. É de baixo risco: o app já lê os dois tokens por
`app/src/services/sessao.ts`, então o tipo é o único lugar que ficou atrás.

**4. `429` falta em `POST /publicacoes` e `POST /publicacoes/{id}/comentarios`.** O limite
de taxa está configurado (`RATE_LIMIT_TENTATIVAS` em `api/src/config/ambiente.ts`) e a
classe `LimiteExcedido` existe, mas as duas rotas de escrita no feed não declaram o status.
Contrato que omite um status que a implementação pode devolver é contrato incompleto.

**5. `usuario.excluido_em` não existe no `schema.prisma`.** O
[modelo ER](05-modelagem/03-modelo-dados-er.md) descrevia exclusão lógica com essa coluna,
sustentando RNF-021. O schema do CP6 tem `atualizado_em` e nenhuma coluna de exclusão. Está
corrigido **no diagrama**, que passou a descrever o que o schema tem; o requisito RNF-021
continua não atendido, e agora isso está visível em vez de suposto.

---

## 7. Como verificar este documento

```bash
# O YAML é bem formado e tem os números desta página
grep -cE '^  /' api/openapi.yaml                                  # 38
grep -cE '^    (get|post|put|patch|delete):' api/openapi.yaml     # 43

# As 30 rotas do mock do CP5, para conferir a seção 4.1
grep -hoE 'http\.(get|post|patch|delete)\(`\$\{BASE\}[^`]*' \
  app/src/mocks/handlers.ts app/src/mocks/handlersCp5.ts | wc -l   # 30

# A fronteira do pacote compartilhado, que sustenta os tipos citados aqui
node scripts/check-contrato.mjs

# Links e âncoras deste documento
node scripts/validate-docs.mjs
```

Documentos relacionados: [`08-arquitetura.md`](08-arquitetura.md) (por que a arquitetura é
assim), [`22-manual-de-uso.md`](22-manual-de-uso.md) (como usar o produto),
[`23-instalacao.md`](23-instalacao.md) (como subir a stack),
[`24-checklist-entrega-cp6.md`](24-checklist-entrega-cp6.md) (a evidência de entrega).
