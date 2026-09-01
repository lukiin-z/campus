# Diagramas de sequência

**Responsável:** Ronaldo Veloso Filho · **Adianta requisito do CP5**

Três sequências, escolhidas porque são os fluxos onde **a ordem das mensagens é a regra
de negócio** — e onde inverter dois passos produz overbooking, cobrança dupla ou entrada
franqueada. Fluxos simples (listar eventos, editar perfil) não ganham nada com sequência
e por isso não estão aqui.

Participantes recorrentes:

| Participante | Papel |
|---|---|
| `Aluno` / `Organizador` | Ator humano |
| `App` | Front-end React (`app/`) |
| `API` | Camada de aplicação — no CP5, os repositórios com MSW |
| `Dominio` | Regras puras de `app/src/domain/` |
| `BD` | Persistência (mock em memória no CP5, PostgreSQL no CP6) |
| `Gateway` | Gateway de pagamento (externo) |
| `Notif` | Serviço de notificação (externo) |

---

## 1. Inscrição em evento pago, com Pix e confirmação assíncrona

Cobre UC-002 + UC-003 · Regras: RN-004, RN-012, RN-014 · Requisitos: RF-019, RF-028, RF-029

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App
    participant API
    participant Dominio
    participant BD
    participant Gateway
    participant Notif

    Aluno->>App: toca em "Quero participar"
    App->>API: POST /eventos/evt-001/participacoes
    API->>BD: BEGIN e SELECT evento FOR UPDATE
    BD-->>API: capacidade 40, ocupadas 18
    API->>Dominio: canEnroll(evento, usuario, agora)
    Dominio-->>API: ok, evento pago, vaga disponivel

    API->>BD: INSERT participacao PENDENTE_PAGAMENTO
    Note over API,BD: pagamentoExpiraEm = min(agora+60min, prazoInscricao, inicio-1h)
    API->>BD: UPDATE evento SET ocupadas = 19
    API->>BD: COMMIT
    BD-->>API: participacao par-101 criada
    API-->>App: 201 Created com participacao e prazo
    App-->>Aluno: mostra tela de pagamento e politica de reembolso

    Aluno->>App: escolhe Pix
    App->>API: POST /participacoes/par-101/pagamentos
    API->>Gateway: criarCobranca(valor 25.00, chaveIdempotencia)
    Gateway-->>API: txId gw-8842, codigo copia-e-cola, QR
    API->>BD: INSERT pagamento AGUARDANDO com txId
    API-->>App: 201 com dados do Pix
    App-->>Aluno: exibe QR, codigo e contagem do prazo

    Aluno->>Gateway: paga no app do banco (fora do Campus)

    Gateway->>API: POST /webhooks/pagamento txId gw-8842 pago
    API->>Dominio: verificarAssinatura e idempotencia
    Dominio-->>API: autentico e ainda nao processado

    API->>BD: BEGIN
    API->>BD: UPDATE pagamento SET status CONFIRMADO
    API->>BD: UPDATE participacao SET status CONFIRMADA
    API->>BD: COMMIT
    API->>Notif: notificar aluno "pagamento confirmado"
    API->>Notif: notificar organizador "novo pagamento"
    API-->>Gateway: 200 OK

    Notif-->>Aluno: aviso de pagamento confirmado
    Aluno->>App: abre "Meu ingresso"
    App->>API: GET /participacoes/par-101/ingresso
    API->>Dominio: gerarTokenCheckin(participacao)
    Dominio-->>API: token HMAC assinado
    API-->>App: 200 com QR de check-in
    App-->>Aluno: cartao-ingresso com QR Code

    rect rgb(242, 241, 238)
    Note over Gateway,API: Excecao E5 - notificacao repetida
    Gateway->>API: POST /webhooks/pagamento txId gw-8842 (2a vez)
    API->>Dominio: verificar idempotencia
    Dominio-->>API: chave ja processada
    API-->>Gateway: 200 OK sem alterar estado nem notificar
    end
```

### Por que esta ordem

**A vaga é reservada antes da cobrança (passos 3 a 11), não depois.** Se a cobrança viesse
primeiro, dois alunos poderiam pagar pela mesma última vaga e um deles teria de ser
estornado — transformando um problema de contagem em um problema de dinheiro. Reservar
primeiro converte o pior caso em "vaga presa por 60 minutos", que a janela de
[RN-012](../04-regras-de-negocio.md) limita e a fila de espera aproveita.

**A confirmação vem do gateway, nunca do app (passo 21).** O app do aluno não é fonte
confiável para dizer "paguei". A notificação assíncrona é a única transição para
`CONFIRMADO` ([RN-014](../04-regras-de-negocio.md)), e é por isso que o fluxo continua
funcionando se o aluno fechar o app no passo 20.

**A idempotência é verificada antes de qualquer escrita (passo 22).** O bloco destacado
mostra o caso real: gateways reenviam notificação. Sem a checagem, o aluno receberia duas
notificações e o organizador contaria o pagamento duas vezes.

**O token do QR é gerado na leitura do ingresso (passo 30), não na confirmação.** Assim
ele não precisa ser armazenado, e a validade temporal é sempre calculada contra o horário
atual (RNF-011).

---

## 2. Evento lotado: lista de espera, vaga liberada e promoção

Cobre UC-004 · Regras: RN-006, RN-007, RN-008 · Requisitos: RF-024, RF-025, RF-026

```mermaid
sequenceDiagram
    autonumber
    actor Marina as Marina (entra na fila)
    actor Diego as Diego (confirmado, vai cancelar)
    participant App
    participant API
    participant Dominio
    participant BD
    participant Notif

    Note over Marina,BD: Evento evt-002 - Hackathon - 80/80 vagas, fila com 7 pessoas

    Marina->>App: abre detalhe do evento
    App->>API: GET /eventos/evt-002
    API->>BD: SELECT evento e participacao do usuario
    BD-->>API: ocupadas 80 de 80, fila com 7
    API-->>App: 200 lotado, acao = lista de espera
    App-->>Marina: botao "Entrar na lista de espera" e "7 na fila"

    Marina->>App: toca em "Entrar na lista de espera"
    App->>API: POST /eventos/evt-002/lista-espera
    API->>Dominio: canJoinWaitlist(evento, usuario, agora)
    Dominio-->>API: ok, prazo de inscricao aberto
    API->>BD: SELECT MAX(posicao_fila) WHERE status LISTA_ESPERA
    BD-->>API: 7
    API->>BD: INSERT participacao LISTA_ESPERA posicao 8
    Note over API,BD: ocupadas NAO muda - fila nao ocupa vaga (RN-004)
    API-->>App: 201 posicao 8
    App-->>Marina: "voce e o 8o da fila"

    Note over Diego,Notif: Dias depois - uma vaga e liberada

    Diego->>App: cancela a propria inscricao
    App->>API: DELETE /participacoes/par-055
    API->>BD: BEGIN
    API->>BD: UPDATE participacao SET status CANCELADA
    API->>BD: UPDATE evento SET ocupadas = 79
    API->>Dominio: promoteFromWaitlist(evento)
    Dominio->>BD: SELECT participacao com menor posicao_fila
    BD-->>Dominio: par-070 (posicao 1, Elisa)
    Dominio-->>API: promover par-070

    API->>BD: UPDATE par-070 SET status OFERTA_PENDENTE
    Note over API,BD: ofertaExpiraEm = min(agora+24h, inicio-1h)
    API->>BD: UPDATE evento SET ocupadas = 80 (vaga reservada para a oferta)
    API->>BD: UPDATE fila SET posicao_fila = posicao_fila - 1 WHERE posicao > 1
    API->>BD: COMMIT
    Note over BD: Marina passa de 8 para 7
    API->>Notif: notificar Elisa "vaga liberada, 24h para confirmar"
    API->>Notif: notificar Diego "cancelamento confirmado"
    API-->>App: 200

    alt Elisa confirma dentro da janela
        Notif-->>API: (Elisa abre o app) POST /participacoes/par-070/confirmar
        API->>Dominio: canAcceptOffer(par-070, agora)
        Dominio-->>API: dentro da janela
        API->>BD: UPDATE par-070 SET status CONFIRMADA
        Note over API,BD: evento gratuito, entao vai direto para CONFIRMADA
        API->>Notif: notificar Elisa "inscricao confirmada"
    else Janela de 24h expira sem resposta
        Note over API,BD: rotina periodica detecta ofertaExpiraEm < agora
        API->>BD: UPDATE par-070 SET status EXPIRADA
        API->>BD: UPDATE evento SET ocupadas = 79 (vaga devolvida)
        API->>Dominio: promoteFromWaitlist(evento)
        Dominio-->>API: promover o proximo (Marina, agora posicao 1)
        API->>BD: UPDATE participacao de Marina SET status OFERTA_PENDENTE
        API->>BD: UPDATE evento SET ocupadas = 80
        API->>Notif: notificar Elisa "oferta expirada"
        API->>Notif: notificar Marina "vaga liberada, 24h para confirmar"
    end
```

### Por que esta ordem

**A promoção acontece na mesma transação do cancelamento (passos 19 a 28).** Se fosse um
trabalho assíncrono posterior, existiria uma janela em que a vaga está livre e ninguém foi
avisado — exatamente a "vaga que evapora" que o produto promete resolver.

**A vaga é reservada para a oferta (passo 25: `ocupadas` volta a 80).** Contraintuitivo,
mas necessário: durante as 24 h da oferta, ninguém mais pode tomar aquela vaga. Sem essa
reserva, um aluno que confirmasse a oferta poderia descobrir que a vaga já era de outro —
e o overbooking de [RN-004](../04-regras-de-negocio.md) voltaria pela janela.

**Uma oferta por vaga liberada.** O caminho "ofereço a três para garantir que um
confirme" foi recusado: geraria três pessoas com direito à mesma vaga.

**Expiração devolve a vaga e recomeça o processo (ramo `else`).** É o único ponto em que
`ocupadas` diminui sem cancelamento humano, e o motivo de o índice
`ix_participacao_oferta` existir no [modelo de dados](03-modelo-dados-er.md).

---

## 3. Check-in por QR Code na porta do evento

Cobre UC-005 · Regras: RN-017, RN-018 · Requisitos: RF-033, RF-034 · RNF-011

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    actor Org as Organizador
    participant AppA as App do aluno
    participant AppO as App do organizador
    participant API
    participant Dominio
    participant BD
    participant Notif

    Aluno->>AppA: abre "Meu ingresso"
    AppA->>API: GET /participacoes/par-101/ingresso
    API->>Dominio: gerarTokenCheckin(par-101)
    Note over Dominio: HMAC-SHA256(participacaoId + eventoId + usuarioId + emitidoEm)
    Dominio-->>API: token assinado
    API-->>AppA: 200 token e codigo numerico de 8 digitos
    AppA-->>Aluno: cartao-ingresso com QR Code

    Org->>AppO: abre tela de check-in do evento
    AppO->>API: GET /eventos/evt-001/checkin/resumo
    API->>BD: SELECT contagem de presentes e confirmados
    BD-->>API: 12 presentes de 19 confirmados
    API-->>AppO: 200 resumo
    AppO-->>Org: camera ativa e contador "12/19"

    Aluno->>Org: apresenta o QR Code
    Org->>AppO: enquadra e le o QR
    AppO->>API: POST /eventos/evt-001/checkin com token

    API->>Dominio: validarToken(token, evento, agora)
    Note over Dominio: 1 assinatura - 2 evento correto - 3 janela temporal
    Dominio-->>API: token valido

    API->>BD: BEGIN
    API->>BD: SELECT participacao par-101 FOR UPDATE
    BD-->>API: status CONFIRMADA, sem presenca
    API->>Dominio: canCheckIn(participacao, evento, agora)
    Dominio-->>API: ok
    API->>BD: INSERT presenca (unique participacao_id)
    API->>BD: UPDATE participacao SET status PRESENTE
    API->>BD: COMMIT
    API->>Notif: notificar aluno "check-in realizado"
    API-->>AppO: 200 nome, foto e horario
    AppO-->>Org: confirmacao verde e contador "13/19"

    rect rgb(242, 241, 238)
    Note over Org,BD: Excecao E1 - mesmo ingresso lido de novo
    Org->>AppO: le o mesmo QR
    AppO->>API: POST /eventos/evt-001/checkin com token
    API->>BD: INSERT presenca
    BD-->>API: violacao de unique em participacao_id
    API->>BD: ROLLBACK
    API-->>AppO: 409 Conflict "ingresso ja utilizado as 20h14"
    AppO-->>Org: aviso vermelho com nome de quem entrou
    end

    rect rgb(242, 241, 238)
    Note over Org,Dominio: Excecao E3 - ingresso de outro evento
    Org->>AppO: le QR de outro evento
    AppO->>API: POST /eventos/evt-001/checkin com token
    API->>Dominio: validarToken(token, evento, agora)
    Dominio-->>API: eventoId divergente
    API-->>AppO: 422 "este ingresso e do evento Feira de Carreiras"
    end
```

### Por que esta ordem

**A unicidade é garantida pelo banco (exceção E1, passo do `INSERT`), não por um `SELECT`
anterior.** Com dois operadores lendo QRs em paralelo, um `SELECT` "existe presença?"
seguido de `INSERT` tem janela de corrida — dois check-ins passariam. A restrição única em
`presenca.participacao_id` fecha essa janela: o segundo `INSERT` falha, o `ROLLBACK`
desfaz tudo e a resposta é `409` com o horário do check-in original.

**O token é validado antes de tocar o banco (passos 17 a 19).** Token adulterado ou de
outro evento é rejeitado sem consultar nada, o que mantém a leitura abaixo do limite de
2 s exigido na porta e evita usar o banco como oráculo para tentativa de fraude.

**Cada recusa tem código e mensagem próprios** — `409` para ingresso usado, `422` para
evento errado, `403` para operador sem permissão. Na porta de um evento com fila, "erro
ao validar" não é resposta: o operador precisa saber se deve chamar o próximo ou o
segurança.

---

## 4. Como estas sequências viram teste

| Sequência | Teste automatizado | Onde |
|---|---|---|
| 1 — inscrição com Pix | CT-007 (janela de pagamento), CT-010 (notificação idempotente) | `payment.test.ts` |
| 1 — reserva antes da cobrança | CT-001, CT-020 (concorrência pela última vaga) | `capacity.test.ts` |
| 2 — promoção FIFO | CT-004 (promove o primeiro), CT-005 (posições avançam) | `waitlist.test.ts` |
| 2 — expiração de oferta | CT-006 (passa ao próximo) | `waitlist.test.ts` |
| 3 — uso único do QR | CT-023 (segunda leitura recusada) | `checkin.test.ts` |
| 3 — token de outro evento | CT-022 (validação do token) | `checkin.test.ts` |
| 1 — fluxo ponta a ponta | E2E: abrir feed, abrir evento, inscrever-se, ver confirmação | `e2e/inscricao.spec.ts` |
