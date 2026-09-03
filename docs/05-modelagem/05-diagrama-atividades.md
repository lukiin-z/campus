# Diagramas de atividade

**Responsável:** Ronaldo Veloso Filho · **Exigido no CP5**

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Dois fluxos, desenhados a partir da **intenção**: criação e publicação de evento, e decisão do botão principal com nove estados |
| 2.0 | 2026-09-02 | CP5 | Cinco fluxos, desenhados a partir do **código**. O de criação passa a mostrar a guarda de três estados, os prazos automáticos e as duas etapas que o CP5 não implementou; o do botão passa a ter os **onze** `PrimaryActionKind` reais. Novos: pagamento com a janela de RN-012, check-in na porta com a contingência do código digitado, e onboarding do primeiro acesso |
| 2.1 | 2026-09-02 | CP6 | Conferido: os cinco fluxos de decisão continuam válidos contra o contrato do CP6, porque descrevem **decisões**, e nenhuma decisão mudou — o que mudou é quem as executa. Os caminhos citados no texto foram reapontados: as funções de regra vivem em `packages/shared/src/domain/`, e `resolvePrimaryAction` continua em `app/src/domain/eventAction.ts`, porque é rótulo de botão e não domínio ([ADR-0008](../adr/0008-monorepo-com-dominio-compartilhado.md)) |

O ciclo de vida da `Participacao` — os 8 estados de `STATUS_PARTICIPACAO` e as transições
que o código executa — está em [`06-diagrama-estados.md`](06-diagrama-estados.md), que é
onde uma máquina de estados pertence. Este documento é sobre **decisões em sequência**,
não sobre estados.

---

## 1. Criar e publicar evento

Cobre UC-001 · Regras: RN-001, RN-003, RN-011, RN-016 · Requisitos: RF-010 a RF-012
Código: `CriarEventoPage`, `eventFormSchema`, `defaultDeadlines`, `useCriarEvento`,
`POST /api/eventos`, `requiresApproval`

```mermaid
flowchart TD
    START(["Organizador abre /criar"]) --> G1{"ExigeSessao<br/>obterToken devolve token?"}
    G1 -- "nao" --> G_LOGIN(["Navigate /login<br/>state.de igual a /criar"])
    G1 -- "sim" --> G2{"store: sessao resolvida?"}
    G2 -- "nao, ainda em voo" --> G_SKEL["SkeletonLista<br/>o login nao pisca"]
    G_SKEL --> G2
    G2 -- "resolvida sem sessao" --> G_LOGIN
    G2 -- "resolvida com sessao" --> G3{"onboardingPendente<br/>do usuario?"}
    G3 -- "true" --> G_ONB(["Navigate /onboarding<br/>ver fluxo 5"])
    G3 -- "false" --> FORM["CriarEventoPage<br/>useForm com zodResolver<br/>de eventFormSchema"]

    FORM --> FILL["Preenche titulo, descricao, data,<br/>horaInicio, horaFim, local,<br/>capacidade, gratuito e preco"]
    FILL --> ESC{"Escolhe o alcance"}
    ESC -- "TURMA - padrao" --> ACAO
    ESC -- "CURSO" --> ACAO
    ESC -- "FACULDADE" --> ACAO

    ACAO{"Qual dos dois botoes?"}
    ACAO -- "Salvar rascunho<br/>publicar false" --> ZOD
    ACAO -- "Publicar evento<br/>publicar true" --> ZOD

    ZOD{"eventFormSchema aprova?<br/>titulo 3 a 120, local 3 a 200,<br/>capacidade entre MIN e MAX_CAPACITY,<br/>horas em HH:MM"}
    ZOD -- "nao" --> ERRZ["Marca o campo com a mensagem<br/>que veio do proprio schema"]
    ERRZ --> FILL

    ZOD -- "pago com preco menor ou igual a zero" --> ERRP["Informe um valor maior que zero<br/>ou marque como gratuito"]
    ERRP --> FILL

    ZOD -- "sim" --> REFINE{"superRefine chama<br/>validateDeadlines - RN-011"}
    REFINE -- "inicio no passado" --> ERRD["Escolha uma data e hora futuras"]
    REFINE -- "fim antes ou igual ao inicio" --> ERRF["O fim tem de ser depois do inicio"]
    REFINE -- "duracao acima de MAX_EVENT_DURATION_DAYS" --> ERRL["Evento nao pode durar mais que o limite"]
    ERRD --> FILL
    ERRF --> FILL
    ERRL --> FILL

    REFINE -- "sem violacao" --> COMB["combinarDataHora monta inicio e fim em ISO"]
    COMB --> PRZ["defaultDeadlines inicio<br/>prazoInscricao igual a inicio menos 2h<br/>prazoCancelamento igual a inicio menos 24h"]
    PRZ --> POST[/"useCriarEvento<br/>POST /api/eventos com NovoEvento"/]

    POST --> ANC{"Ancora do alcance<br/>vem do VINCULO do organizador"}
    ANC -- "turmaId, cursoId ou faculdadeId nulo" --> E422(["422 ALCANCE_FORA_DO_VINCULO<br/>nada e criado"])
    ANC -- "vinculo existe" --> TX["transaction em mocks/db.ts"]

    TX --> ST{"publicar?"}
    ST -- "false" --> S_RASC[/"status RASCUNHO"/]
    ST -- "true" --> APROV{"requiresApproval<br/>alcance FACULDADE e nao<br/>e ADMIN_FACULDADE?"}
    APROV -- "sim" --> S_APR[/"status EM_APROVACAO"/]
    APROV -- "nao" --> S_PUB[/"status PUBLICADO"/]

    S_RASC --> WRITE
    S_APR --> WRITE
    S_PUB --> WRITE

    WRITE["push Evento com ocupadas igual a zero - RN-016<br/>capaSeed derivado da quantidade de eventos<br/>assertInvariants ao fim da transacao"]
    WRITE --> R201[/"201 EventoView"/]
    R201 --> INV["invalidateQueries de eventos"]
    INV --> TOAST{"toast por status"}
    TOAST -- "RASCUNHO" --> T1(["Rascunho salvo. So voce ve este evento."])
    TOAST -- "EM_APROVACAO" --> T2(["Evento enviado para aprovacao da faculdade."])
    TOAST -- "PUBLICADO" --> T3(["Evento publicado.<br/>Entra na lista e no feed de quem canSee autoriza"])

    S_APR -.-> CP6A["CP6 - endpoint de aprovacao<br/>e notificacao aos admins"]
    S_PUB -.-> CP6B["CP6 - notificacao NOVO_EVENTO<br/>para o alcance"]
```

### Leitura do diagrama

**Duas decisões do organizador, não três.** Alcance e cobrança. O CP4 previa uma terceira
— perguntas customizadas — e um passo de ajuste manual dos prazos: **nenhum dos dois existe
no formulário do CP5**. `eventFormSchema` não tem campo de pergunta nem de prazo, e
`defaultDeadlines` calcula os dois a partir do início, sempre.

**A validação é em duas camadas do mesmo schema.** O `z.object` cobre forma e faixa; o
`superRefine` chama `validateDeadlines` do domínio em vez de reimplementar RN-011. É o que
garante que a mensagem que o formulário mostra é a mesma que o servidor mostraria.

**A âncora de alcance nunca vem do corpo da requisição.** O handler a lê do vínculo do
organizador (`usuario.turmaId`, `.cursoId`, `.faculdadeId`). Aceitar a âncora do cliente
permitiria publicar um evento na turma de outra pessoa com um `curl`
([RN-001](../04-regras-de-negocio.md), invariante 2, RNF-012).

**Os dois nós pontilhados são o que o CP5 não faz.** Não há endpoint de aprovação, e
`POST /api/eventos` **não** enfileira notificação `NOVO_EVENTO`. `EM_APROVACAO` é um estado
que o CP5 sabe **criar** e não sabe **resolver** — está no diagrama assim, pontilhado, porque
omitir seria fingir que o fluxo fecha.

### Por que esta ordem

**O padrão é o menor alcance.** O formulário abre com `TURMA`. Errar para menos gera um
evento pouco divulgado; errar para mais expõe um churrasco de 40 pessoas à faculdade
inteira — que é literalmente o problema descrito em
[`../01-problema-e-personas.md`](../01-problema-e-personas.md). Padrão seguro é o que falha
para o lado barato.

**Validação em cascata, com retorno ao passo certo.** Cada erro volta para `FILL`
preservando o resto do preenchimento — é o `useForm` que mantém os valores. Formulário
longo que apaga tudo em um erro é a forma mais eficiente de perder o organizador.

**A aprovação é um desvio, não uma etapa.** `requiresApproval` só devolve `true` para
`alcance = FACULDADE` de quem não é `ADMIN_FACULDADE`
([RN-003](../04-regras-de-negocio.md)). Modelar aprovação como etapa obrigatória de todo
evento adicionaria fricção em 90% dos casos para resolver um risco que existe em 10%.

**`ocupadas` nasce em zero, e o organizador não é inscrito.** Criar evento não é
participar dele ([RN-016](../04-regras-de-negocio.md)) — o que também é o motivo de
`canPostToEvent` e o handler do feed tratarem organizador como caso separado.

---

## 2. Decisão da ação principal do detalhe do evento

Cobre UC-011 · Requisitos: RF-016
Código: `resolvePrimaryAction` em `app/src/domain/eventAction.ts`, consumido por `EventoDetalhePage`

Este diagrama **é** a especificação de `resolvePrimaryAction`. Os onze destinos são os onze
valores de `PrimaryActionKind`, na ordem exata em que a função os testa.

```mermaid
flowchart TD
    A(["EventoDetalhePage renderiza<br/>com EventoView e agora"]) --> V{"O evento chegou?"}
    V -- "404 do GET /api/eventos/:id" --> R404(["Tela de nao encontrado<br/>sem revelar que o evento existe"])
    V -- "200 EventoView" --> ST{"event.status"}

    ST -- "CANCELADO" --> K1(["CANCELADO<br/>Evento cancelado<br/>desabilitado, variante ghost"])
    ST -- "REALIZADO" --> K2(["REALIZADO<br/>Evento encerrado<br/>desabilitado, variante ghost"])
    ST -- "PUBLICADO, RASCUNHO<br/>ou EM_APROVACAO" --> P{"minhaParticipacao<br/>existe?"}

    P -- "sim" --> PST{"minhaParticipacao.status"}
    PST -- "PENDENTE_PAGAMENTO" --> K3(["PAGAR<br/>Pagar agora<br/>hint com minutesLeftToPay"])
    PST -- "CONFIRMADA" --> K4(["VER_INGRESSO<br/>Ver meu ingresso"])
    PST -- "LISTA_ESPERA" --> K5(["VER_FILA<br/>Voce e o No da fila"])
    PST -- "OFERTA_PENDENTE" --> K6(["CONFIRMAR_OFERTA<br/>Confirmar vaga<br/>hint com ofertaExpiraEm"])
    PST -- "PRESENTE" --> K7(["PUBLICAR_FOTO<br/>Publicar foto"])
    PST -- "default - defesa" --> PRZ

    P -- "nao" --> PRZ{"enrollmentOpen<br/>status PUBLICADO e<br/>agora antes do prazoInscricao?"}
    PRZ -- "nao" --> K8(["ENCERRADO<br/>Inscricoes encerradas<br/>desabilitado, variante ghost"])
    PRZ -- "sim" --> CAP{"availableSpots<br/>igual a zero?"}
    CAP -- "sim" --> K9(["LISTA_ESPERA<br/>Entrar na lista de espera<br/>hint com totalListaEspera"])
    CAP -- "nao" --> PRECO{"event.preco<br/>maior que zero?"}
    PRECO -- "sim" --> K10(["INSCREVER_PAGO<br/>Quero participar com o valor<br/>hint dos 60 min"])
    PRECO -- "nao" --> K11(["INSCREVER<br/>Quero participar<br/>hint Confirmacao na hora"])
```

### Leitura do diagrama

**Onze destinos, cada um com rótulo, dica e variante próprios.** O ganho é direto: o aluno
nunca toca em um botão para descobrir que não podia. E `K9` é o desvio de
[RN-006](../04-regras-de-negocio.md) — "lotado" não é erro, é outro caminho.

**`minhaParticipacao` só chega com estado ATIVO.** `toEventoView` a preenche com
`findActiveParticipation`, que filtra por `isActive`. Consequência: `CANCELADA`, `EXPIRADA`
e `AUSENTE` **nunca** entram no `switch` — o ramo `default` existe como defesa, não como
caminho. É por isso que, depois de cancelar, o botão volta a `INSCREVER` em vez de mostrar
"cancelado".

**`RASCUNHO` e `EM_APROVACAO` caem em `ENCERRADO`.** Não há ramo próprio: `enrollmentOpen`
devolve `false` para qualquer status diferente de `PUBLICADO`, e o botão diz "Inscrições
encerradas". Só o organizador e os admins do escopo chegam a essa tela, porque `canSee`
barra os demais com `404`.

**A ordem `status do evento` → `minha participação` → `prazo` → `vaga` → `preço` não é
arbitrária.** Estado do evento vem primeiro porque cancela qualquer outra consideração;
participação vem antes de prazo porque quem já tem vaga não é afetado pelo prazo ter
encerrado — o ingresso continua valendo.

---

## 3. Pagar a inscrição, e a janela que expira

Cobre UC-003 · Regras: RN-012, RN-014, **RN-026, RN-027, RN-028** · Requisitos: RF-026 a RF-030
Código: `PagamentoPage`, `usePagamento`, `useIniciarPagamento`, `useSimularDesfecho`,
`paymentDeadline`, `minutesLeftToPay`, `gerarCobrancaPix`, `planWebhook`

```mermaid
flowchart TD
    A(["Aluno abre /pagamento/:participacaoId"]) --> GET[/"usePagamento<br/>GET /api/participacoes/:id/pagamento"/]
    GET -- "404 NAO_ENCONTRADO" --> ESC{"Escolhe o metodo"}
    GET -- "200 PagamentoView" --> JAN{"minutosRestantes<br/>de minutesLeftToPay"}

    ESC -- "PIX" --> POSTP
    ESC -- "CARTAO_CREDITO ou CARTAO_DEBITO" --> CARD["Digita numero, titular, validade e CVV"]

    CARD --> VC{"Validacao local em domain/pix.ts"}
    VC -- "luhnValido false" --> VE1["Numero de cartao invalido"]
    VC -- "validadeNoFuturo false" --> VE2["Cartao vencido ou mes invalido"]
    VC -- "cvvValido false" --> VE3["CVV com a quantidade errada de digitos"]
    VE1 --> CARD
    VE2 --> CARD
    VE3 --> CARD
    VC -- "tudo valido" --> RES["resumirCartao<br/>sobrevivem ultimosQuatro, bandeira e titular<br/>numero e CVV nunca saem do formulario - RNF-022"]
    RES --> POSTP

    POSTP[/"useIniciarPagamento<br/>POST /api/participacoes/:id/pagamento"/]
    POSTP --> P404{"Participacao existe?"}
    P404 -- "nao" --> E404(["404 NAO_ENCONTRADA"])
    P404 -- "sim" --> P403{"E do usuario autenticado?"}
    P403 -- "nao" --> E403(["403 SEM_PERMISSAO"])
    P403 -- "sim" --> P409{"status igual a<br/>PENDENTE_PAGAMENTO?"}
    P409 -- "nao" --> E409(["409 NAO_AGUARDA_PAGAMENTO<br/>mensagem propria se ja esta CONFIRMADA"])
    P409 -- "sim" --> IDEM{"Ja existe pagamento AGUARDANDO<br/>no MESMO metodo?"}

    IDEM -- "sim" --> R200(["200 com a MESMA cobranca<br/>duplo toque nao gera dois Pix"])
    IDEM -- "nao" --> TX["transaction<br/>upsert Pagamento AGUARDANDO<br/>substitui resumosCartao do pagamento"]
    TX --> RECONTA["participacao.pagamentoExpiraEm igual a<br/>paymentDeadline evento, agora<br/>o relogio comeca quando a COBRANCA abre"]
    RECONTA --> VIEW["toPagamentoView<br/>pix so se metodo PIX e status AGUARDANDO<br/>brCode derivado por gerarCobrancaPix, nao armazenado"]
    VIEW --> R201(["201 PagamentoView"])
    R201 --> JAN

    JAN -- "maior que zero" --> TELA["Tela mostra QR ou resumo do cartao<br/>e a contagem explicita de minutos"]
    JAN -- "igual a zero" --> VENC{"paymentExpired e true"}

    TELA --> SIM[/"useSimularDesfecho<br/>POST /api/pagamentos/:id/simular"/]
    SIM -- "desfecho RECUSAR" --> REC["pagamento.status RECUSADO<br/>atalho da demo, nao passa por planWebhook"]
    REC --> TR(["toast pedindo outro metodo<br/>a participacao segue PENDENTE_PAGAMENTO"])
    TR --> TELA

    SIM -- "desfecho CONFIRMAR ou DUPLICAR" --> PLAN{"planWebhook"}
    PLAN -- "CONFIRMAR" --> W1["pagamento CONFIRMADO com confirmadoEm<br/>participacao CONFIRMADA<br/>pagamentoExpiraEm nulo<br/>Notificacao PAGAMENTO_CONFIRMADO"]
    PLAN -- "IGNORAR_DUPLICADA" --> W2["NENHUMA escrita<br/>200 com a projecao inalterada"]
    PLAN -- "DIVERGENCIA_DE_VALOR" --> W3["NENHUMA escrita<br/>200 com a projecao inalterada"]
    PLAN -- "ESTORNAR" --> W4["pagamento ESTORNADO<br/>valorReembolsado igual ao valor<br/>a participacao NAO e tocada"]

    W1 --> FIM_OK(["Vaga garantida<br/>o ingresso passa a ser emitido - fluxo 4"])
    W2 --> FIM_ID(["toast: essa notificacao ja havia sido processada"])
    W3 --> FIM_DV(["Divergencia registrada<br/>nunca confirma automaticamente"])
    W4 --> FIM_ES(["toast: o valor sera estornado"])

    VENC -.-> CP6["CP6 - rotina de tempo<br/>participacao para EXPIRADA<br/>ocupadas menos 1 e planPromotion<br/>Notificacao PAGAMENTO_EXPIRADO"]
    VENC --> HOJE["CP5 - nenhum processo escreve EXPIRADA<br/>a contagem chega a zero e a tela avisa<br/>mas a cobranca continua aceitando pagamento"]
    HOJE --> TELA
```

### Leitura do diagrama

**A janela de [RN-012](../04-regras-de-negocio.md) é recontada quando a cobrança abre.**
`paymentDeadline` é chamada duas vezes na vida de uma participação paga: na inscrição e
aqui — e a segunda sobrescreve a primeira. Quem demora cinco minutos para escolher o método
não perde cinco minutos de janela.

**A idempotência tem duas formas diferentes no mesmo fluxo.** Na abertura da cobrança é por
**participação e método** (`IDEM`); no webhook é por **estado do pagamento** (`PLAN`). São
defeitos diferentes: duplo toque no botão versus reenvio do gateway.

**Dois dos quatro desfechos não escrevem nada.** `IGNORAR_DUPLICADA` e
`DIVERGENCIA_DE_VALOR` devolvem `200` com a projeção intacta. Não é caminho de erro: é o
comportamento que [RN-014](../04-regras-de-negocio.md) exige.

### O nó `VENC`: o que o CP5 faz e o que não faz

Esta é a divergência mais importante deste documento, e está desenhada de propósito:

| Aspecto | CP5 | CP6 |
|---|---|---|
| Cálculo da janela | `paymentDeadline` na escrita, `minutesLeftToPay` na leitura — **funciona** | igual |
| Exibição da contagem | `PagamentoView.minutosRestantes`, calculado pelo servidor — **funciona** | igual |
| Detecção do vencimento | `paymentExpired` existe e é testada — **nenhum handler a chama** | rotina agendada |
| Transição para `EXPIRADA` | **não acontece** | rotina agendada |
| Liberação da vaga e promoção da fila | **não acontece** | mesma transação da expiração |

Consequência observável hoje: a contagem chega a zero e a tela avisa, mas
`POST /api/participacoes/:id/pagamento` continua aceitando a cobrança, porque a única
verificação do handler é `status !== 'PENDENTE_PAGAMENTO'`. **O código venceu no diagrama** —
o ramo pontilhado é o único jeito honesto de mostrar isso.

---

## 4. Check-in na porta do evento, com a contingência do código digitado

Cobre UC-005, UC-017 · Regras: RN-017, RN-018, **RN-029** · Requisitos: RF-033 a RF-035
Código: `CheckinPage`, `usePainelCheckin`, `useValidarCheckin`, `classificarLeitura`,
`decideCheckIn`, `canValidateCheckIn`, `checkInWindow`

```mermaid
flowchart TD
    A(["Organizador abre<br/>/eventos/:id/checkin"]) --> PERM{"canValidateCheckIn<br/>organizador do evento ou<br/>admin do escopo?"}
    PERM -- "nao" --> E403(["403 SEM_PERMISSAO<br/>So o organizador valida check-in"])
    PERM -- "sim" --> PAINEL["usePainelCheckin<br/>GET /api/eventos/:id/checkin<br/>refetch a cada 15 s"]

    PAINEL --> JAN{"abertoAgora<br/>de checkInWindow"}
    JAN -- "antes de inicio menos 4h" --> J1["Painel mostra abreEm<br/>a leitura ainda e recusada"]
    JAN -- "depois de fim mais 2h" --> J2["Painel mostra fechaEm<br/>a leitura ja e recusada"]
    JAN -- "dentro da janela" --> LEIT
    J1 --> LEIT
    J2 --> LEIT

    LEIT{"Como a leitura entrou?"}
    LEIT -- "camera leu o QR" --> C1["texto comeca com campus.v1."]
    LEIT -- "camera falhou - contingencia UC-005 A1" --> DIG{"O que o aluno tem na tela?"}
    DIG -- "codigo de 8 digitos" --> C2["8 digitos"]
    DIG -- "codigo legivel impresso" --> C3["CMP-TURMA-0184"]
    LEIT -- "texto vazio ou lixo" --> C4["nada reconhecivel"]

    C1 --> CL["classificarLeitura"]
    C2 --> CL
    C3 --> CL
    C4 --> CL

    CL -- "TOKEN" --> T1["lerToken confere a assinatura<br/>e devolve o payload ou nulo"]
    CL -- "CODIGO_NUMERICO" --> T2["busca por DERIVACAO<br/>numericCheckInCode de cada participacao<br/>do evento e comparado ao codigo"]
    CL -- "CODIGO_LEGIVEL" --> T3["busca por DERIVACAO<br/>compara os 4 ultimos digitos"]
    CL -- "INDECIFRAVEL" --> T4["assinaturaValida entra como false"]

    T2 --> REEMIT["emitirToken para a participacao achada<br/>as tres formas chegam ao mesmo payload"]
    T3 --> REEMIT
    T1 --> DEC
    T4 --> DEC
    REEMIT --> DEC

    DEC{"decideCheckIn<br/>na ordem do codigo"}
    DEC -- "1 operador sem permissao" --> N1(["SEM_PERMISSAO"])
    DEC -- "2 assinatura invalida" --> N2(["TOKEN_INVALIDO<br/>Ingresso invalido"])
    DEC -- "3 eventoId do token diferente" --> N3(["OUTRO_EVENTO<br/>Este ingresso e de outro evento"])
    DEC -- "4 evento CANCELADO" --> N4(["EVENTO_CANCELADO"])
    DEC -- "5 fora da janela" --> N5(["AINDA_NAO_ABRIU ou JA_ENCERROU<br/>com o horario no texto"])
    DEC -- "6 participacao nao encontrada" --> N6(["TOKEN_INVALIDO"])
    DEC -- "7 presenca ja registrada" --> N7(["JA_UTILIZADO<br/>a segunda leitura do MESMO QR cai AQUI<br/>Ingresso ja utilizado as HH:MM"])
    DEC -- "8 status diferente de CONFIRMADA" --> N8(["NAO_CONFIRMADA<br/>mensagem por status:<br/>pagamento pendente, lista de espera,<br/>oferta pendente, cancelada, expirada"])
    DEC -- "todas as condicoes ok" --> OK

    N1 --> R200
    N2 --> R200
    N3 --> R200
    N4 --> R200
    N5 --> R200
    N6 --> R200
    N7 --> R200
    N8 --> R200

    R200[/"200 ResultadoCheckin com aceito false<br/>NAO e 4xx: recusa e resposta do sistema"/]
    R200 --> VERM["Aviso vermelho com o motivo especifico<br/>o cache NAO e invalidado"]
    VERM --> LEIT

    OK["transaction<br/>push Presenca com metodo QR_CODE ou CODIGO_NUMERICO<br/>participacao.status PRESENTE<br/>assertInvariants garante uma presenca por participacao"]
    OK --> R201[/"201 ResultadoCheckin com participante e registradoEm"/]
    R201 --> VERDE["Confirmacao verde com nome e turma<br/>invalida painelCheckin e evento<br/>o contador de presentes sobe"]
    VERDE --> LEIT
```

### Leitura do diagrama

**As três formas de leitura convergem para a mesma decisão.** É o ponto do diagrama: a
contingência do código digitado não é um fluxo paralelo com regras próprias — ela resolve a
participação por **derivação** e reemite o token, entrando em `decideCheckIn` pela mesma
porta. Uma segunda implementação da decisão seria uma segunda chance de divergir.

**Não existe tabela de códigos.** `codigoNumerico` e `codigoLegivel` são calculados de
`participacaoId` por `numericCheckInCode`. Nada armazenado, nada para dessincronizar.

**Oito recusas, oito mensagens.** Na porta de um evento com fila, "erro ao validar" não é
resposta: o operador precisa saber se chama o próximo ou o segurança. `NAO_CONFIRMADA` vai
além e tem **uma mensagem por status** — "pagamento pendente", "está na lista de espera",
"inscrição cancelada", "check-in já registrado".

**A ordem entre as condições 7 e 8 decide qual mensagem o operador lê — e ela foi
corrigida no CP5.** O aceite grava a `Presenca` **e** muda a participação para `PRESENTE` na
mesma transação, então a segunda leitura do mesmo ingresso viola as duas condições juntas.
Na ordem anterior (status antes de unicidade) a resposta era `NAO_CONFIRMADA`, "Check-in já
registrado.", e `JA_UTILIZADO` era **ramo morto** — o único motivo que traz o **horário do
primeiro uso** nunca era devolvido.

A unicidade passou para a frente. A garantia de recusa era idêntica nas duas ordens; o que
mudou é que o operador agora lê a que hora aquele ingresso já entrou, que é a informação de
que ele precisa para decidir. Ver RN-017 e RN-018 em
[`../04-regras-de-negocio.md`](../04-regras-de-negocio.md).

**A recusa volta para `LEIT`, não para o começo.** A câmera continua ativa e o operador lê
o próximo. Recusa não invalida cache porque nada mudou — e latência na fila da porta custa
mais que dado levemente velho.

### Por que esta ordem

**Permissão primeiro.** É a única verificação que não depende de nada lido. Recusar sem
tocar em token nem em banco não dá pista nenhuma a quem tenta fraudar, e é a mais barata.

**Janela temporal antes de status da participação.** "O check-in abre às 18h30" é uma
informação acionável; "inscrição não confirmada" às 6h da manhã não é. A ordem coloca
primeiro o motivo que resolve o problema do operador.

**Unicidade por último.** É a única condição que exige ter encontrado a participação e
consultado `presencas`. Verificá-la antes exigiria os dois passos anteriores de todo jeito.

---

## 5. Onboarding do primeiro acesso

Cobre UC-008 · Regras: RN-003 · Requisitos: RF-004, RF-005
Código: `ExigeSessao`, `OnboardingPage`, `useCursos`, `useConcluirOnboarding`,
`decideOnboarding`, `normalizaCodigo`, `POST /api/auth/onboarding`

```mermaid
flowchart TD
    A(["Login aceito<br/>useEntrar recebeu ResultadoLogin"]) --> PEND{"onboardingPendente<br/>cursoId ou turmaId nulo?"}
    PEND -- "false" --> FEED(["navegar / - feed"])
    PEND -- "true" --> NAV["navegar /onboarding replace"]

    NAV --> GUARD{"ExigeSessao com<br/>permitirSemVinculo true"}
    GUARD -- "sem token" --> LOGIN(["Navigate /login"])
    GUARD -- "com token e sessao" --> TELA["OnboardingPage"]
    GUARD -.-> NOTA["Sem permitirSemVinculo a guarda<br/>redirecionaria a propria tela de onboarding<br/>e entraria em laco"]

    TELA --> CURSOS[/"useCursos<br/>GET /api/cursos"/]
    CURSOS --> SEL["Aluno escolhe o curso na lista"]
    SEL --> COD["Aluno digita o codigo da turma"]
    COD --> NORM["onboardingSchema<br/>normalizaCodigo remove espaco e hifen e sobe a caixa<br/>e chama o PROPRIO decideOnboarding<br/>mesmo motivo de recusa, sem requisicao"]
    NORM -- "recusado no formulario" --> COD
    NORM -- "aprovado" --> POST[/"useConcluirOnboarding<br/>POST /api/auth/onboarding com EntradaOnboarding"/]

    POST --> WHO["usuarioAtual resolve o id<br/>pelo Authorization Bearer campus.sess"]
    WHO --> DEC{"decideOnboarding<br/>cursoId, codigoConvite, cursos, turmas"}

    DEC -- "curso nao esta na lista" --> M1(["422 CURSO_INEXISTENTE<br/>Escolha um curso da lista"])
    DEC -- "nenhuma turma com esse codigo" --> M2(["422 CODIGO_INVALIDO<br/>Confira com quem te passou"])
    DEC -- "turma existe mas codigoAtivo false" --> M3(["422 CODIGO_INATIVO<br/>Peca o codigo do periodo atual"])
    DEC -- "turma pertence a outro curso" --> M4(["422 CODIGO_DE_OUTRO_CURSO<br/>diz o nome da turma<br/>para o aluno saber qual curso escolher"])

    M1 --> COD
    M2 --> COD
    M3 --> COD
    M4 --> SEL

    DEC -- "aceito com a Turma resolvida" --> TX["transaction<br/>usuario.turmaId igual a turma.id<br/>usuario.cursoId igual a turma.cursoId"]
    TX --> NOTA2["o curso gravado e o da TURMA provada pelo codigo,<br/>nao o que veio no corpo da requisicao"]
    NOTA2 --> R200[/"200 SessaoUsuario com curso e turma"/]
    R200 --> STORE["definirSessao e setQueryData da sessao"]
    STORE --> INV["invalida eventos e feed<br/>o vinculo mudou, e canSee depende dele"]
    INV --> FIM(["toast com o nome da turma<br/>navegar / replace"])
```

### Leitura do diagrama

**Quatro recusas, quatro caminhos de volta diferentes.** `CODIGO_DE_OUTRO_CURSO` volta para
a **seleção de curso**, não para o campo de código: é o erro que o aluno comete quando
escolhe o curso errado na tela anterior, e mandá-lo digitar o código de novo o deixaria
preso tentando o mesmo código.

**A invalidação do cache vem depois de gravar a sessão.** A lista de eventos e o feed em
cache foram calculados para um usuário **sem turma** — `canSee` não deixava passar nenhum
evento de turma ou de curso. Invalidar antes de a sessão nova estar na store recarregaria
com o vínculo velho.

**O código é a prova de vínculo, não o seletor de curso.** O seletor existe para reduzir a
busca e dar a mensagem certa quando os dois discordam; a verdade gravada é
`turma.cursoId` ([RN-003](../04-regras-de-negocio.md)).

**`decideOnboarding` roda duas vezes, e isso é o desenho, não desperdício.** O
`onboardingSchema` da feature a chama para dar a recusa **antes** da requisição; o handler a
chama de novo porque a autoridade é o servidor (RNF-012). Como é a **mesma** função, as duas
respostas nunca divergem — e é isso que separa "validação de formulário" de "regra
duplicada".

---

## 6. Onde cada fluxo está implementado

| Fluxo | Decisão vive em | Autoridade vive em |
|---|---|---|
| 1 — criar e publicar | `domain/eventSchema.ts`, `domain/deadlines.ts`, `domain/permissions.ts#requiresApproval` | `POST /api/eventos` em `mocks/handlers.ts` |
| 2 — ação principal | `domain/eventAction.ts#resolvePrimaryAction` | a própria função — é decisão de UI derivada de dado do servidor |
| 3 — pagamento | `domain/payment.ts`, `domain/pix.ts` | `POST /api/participacoes/:id/pagamento` e `POST /api/pagamentos/:id/simular` em `mocks/handlersCp5.ts` |
| 4 — check-in | `domain/checkin.ts`, `domain/ticketToken.ts`, `domain/deadlines.ts`, `domain/permissions.ts` | `POST /api/eventos/:id/checkin` em `mocks/handlersCp5.ts` |
| 5 — onboarding | `domain/auth.ts#decideOnboarding` | `POST /api/auth/onboarding` em `mocks/handlersCp5.ts` |

Em todos os cinco, **a decisão é função pura e a escrita é do handler**. É o que permite
testar o fluxo inteiro sem DOM e sem servidor, e é o que faz a migração do CP6 mover a
autoridade sem reescrever a regra ([ADR-0003](../adr/0003-camada-de-repositorio-com-msw.md)).
