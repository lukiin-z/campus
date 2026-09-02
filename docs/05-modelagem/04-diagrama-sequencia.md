# Diagramas de sequência

**Responsável:** Ronaldo Veloso Filho · **Exigido no CP5**

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Três sequências desenhadas a partir da **intenção** do produto: Pix com webhook, lista de espera e check-in por QR. Participantes genéricos (`App`, `API`, `Dominio`, `BD`, `Gateway`, `Notif`) e nomes de função hipotéticos |
| 2.0 | 2026-09-02 | CP5 | Sete sequências desenhadas a partir do **código que existe**. Participantes passam a ser os arquivos reais; toda função citada existe em `app/src/domain/`; todo endpoint e todo código de status são os de `app/src/mocks/`. Novas: login, onboarding com a guarda de três estados, inscrição com vaga, pagamento simulado, check-in e publicação no feed |

## O que estas sequências descrevem

Cada diagrama mostra **a cadeia inteira, de ponta a ponta**:

```
tela  ->  hook  ->  repositorio  ->  endpoint  ->  funcao de dominio  ->  transacao
```

e a volta, com o **código de status real** e a **resposta de desvio real**. Nome de
arquivo, de hook, de função e de endpoint aparecem exatamente como estão no código —
divergência entre este documento e `app/src/` é defeito, não detalhe.

Foram escolhidos os fluxos em que **a ordem das mensagens é a regra de negócio**, e onde
inverter dois passos produz overbooking, cobrança dupla ou entrada franqueada. Listar
eventos e editar perfil não ganham nada com sequência e por isso não estão aqui.

### Participantes e o que cada um é no código

| Participante | Arquivo | Papel |
|---|---|---|
| `Tela` | `app/src/pages/*.tsx` | Componente de página. Não conhece HTTP nem o mock |
| `Hook` | `app/src/hooks/*.ts` | Ponte tela → dados. Política de cache e de invalidação |
| `Svc` | `app/src/services/http/index.ts` | Implementação dos repositórios. Monta `Authorization: Bearer`, converte erro em `ApiError` |
| `API` | `app/src/mocks/handlers.ts` e `handlersCp5.ts` | "API" do CP5 sobre MSW. Devolve os mesmos status da API do CP6 |
| `Sup` | `app/src/mocks/support.ts` | Fronteira do mock: `usuarioAtual`, `eventosVisiveis`, `erro`, projeções |
| `Dom` | `app/src/domain/*.ts` | Funções puras de decisão. Nenhuma escreve nada |
| `BD` | `app/src/mocks/db.ts` | Estado em memória + `transaction()` serializada + `assertInvariants()` |

Duas propriedades do `BD` valem para **todas** as sequências abaixo:

- **`transaction()` serializa as escritas.** É a versão em memória do `SELECT ... FOR UPDATE`
  de [RN-004](../04-regras-de-negocio.md): duas inscrições simultâneas para a última vaga
  produzem exatamente uma confirmação (RNF-013, CT-020).
- **`assertInvariants()` roda ao fim de cada transação** e estoura se `ocupadas > capacidade`,
  se houver duas participações ativas do mesmo aluno no mesmo evento (RN-015) ou duas
  presenças para a mesma participação (RN-018).

---

## 1. Login

Cobre UC-007 · Regras: RN-002 · Requisitos: RF-002, RF-003
Código: `LoginPage`, `useEntrar`, `AuthRepository.entrar`, `POST /api/auth/login`, `decideLogin`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant Tela as LoginPage
    participant Hook as useEntrar<br/>hooks/useAuth.ts
    participant Svc as httpRepositories.auth<br/>services/http
    participant API as MSW<br/>mocks/handlersCp5.ts
    participant Dom as domain/auth.ts
    participant BD as mocks/db.ts

    Note over Tela,BD: A tela precisa dos dominios aceitos antes de validar qualquer coisa
    Tela->>Svc: useFaculdade
    Svc->>API: GET /api/faculdade
    API->>BD: getDb().faculdade
    BD-->>API: dominiosEmail
    API-->>Svc: 200 Faculdade
    Svc-->>Tela: exemploDeEmail monta a dica do campo

    Aluno->>Tela: digita e-mail e senha
    Tela->>Dom: loginSchema chama emailBemFormado,<br/>dominioInstitucional e senhaAceitavel
    Dom-->>Tela: feedback imediato, sem nenhuma requisicao
    Note over Tela,Dom: as MESMAS funcoes que o servidor aplica.<br/>Duplicar a regra em Zod seria criar duas verdades
    Aluno->>Tela: envia o formulario
    Tela->>Hook: entrar.mutate com Credenciais
    Hook->>Svc: repositories.auth.entrar
    Svc->>API: POST /api/auth/login
    API->>BD: db.usuarios.find por email
    BD-->>API: Usuario ou null
    API->>Dom: decideLogin email, senhaConfere, usuario, dominios

    alt dominio nao institucional - RN-002
        Dom-->>API: recusa DOMINIO_NAO_INSTITUCIONAL
        API-->>Svc: 422 erro DOMINIO_NAO_INSTITUCIONAL
        Svc-->>Hook: ApiError status 422
        Hook-->>Tela: onError - toast "Use seu e-mail institucional"
    else e-mail ou senha nao conferem
        Dom-->>API: recusa CREDENCIAL_INVALIDA
        API-->>Svc: 401 erro CREDENCIAL_INVALIDA
        Svc-->>Hook: ApiError status 401
        Hook-->>Tela: onError - toast "E-mail ou senha nao conferem"
    else e-mail ainda nao verificado
        Dom-->>API: recusa EMAIL_NAO_VERIFICADO
        API-->>Svc: 422 erro EMAIL_NAO_VERIFICADO
        Svc-->>Hook: ApiError status 422
        Hook-->>Tela: onError - toast pedindo a confirmacao do e-mail
    else aceito
        Dom-->>API: aceito
        API->>API: tokenDeSessao usuarioId e montarSessao usuarioId
        API-->>Svc: 200 ResultadoLogin com token e sessao
        Svc->>Svc: definirToken - sessionStorage campus.token
        Note over Svc: o token para AQUI. Nem a tela nem a store o guardam:<br/>duas verdades sobre "estou autenticado" seria bug garantido
        Svc-->>Hook: ResultadoLogin
        Hook->>Hook: definirSessao, setQueryData sessao, invalidateQueries
        Hook->>Dom: onboardingPendente sessao.usuario
        alt cursoId ou turmaId nulo
            Dom-->>Hook: true
            Hook-->>Aluno: navegar /onboarding replace
        else vinculo resolvido
            Dom-->>Hook: false
            Hook-->>Aluno: navegar / replace
        end
    end
```

### Leitura do diagrama

`decideLogin` decide **as três recusas e a ordem delas**; o handler decide apenas o
**status HTTP** de cada uma. Essa separação é o motivo de a mesma função servir ao
formulário (feedback imediato, sem rede) e ao servidor (autoridade) sem duplicar a regra.

A ordem das verificações é a ordem do que a pessoa consegue corrigir: domínio errado é
"conta errada", credencial inválida é "erro de digitação", e-mail não verificado é
"pendência de ação anterior".

**Na prática, `422 DOMINIO_NAO_INSTITUCIONAL` quase nunca chega à tela** —
`features/auth/loginSchema.ts` chama `dominioInstitucional` no `refine` do Zod e barra antes
do envio. O ramo continua no diagrama porque a autoridade é o servidor (RNF-012): um `curl`
direto tem de receber a mesma recusa, e é isso que o desenho documenta.

### Por que esta ordem

**`401` para credencial e `422` para domínio, e não `401` para tudo.** Um é "tente de
novo", o outro é "esta conta nunca vai servir" — e a tela reage diferente: no primeiro
caso mantém o e-mail e limpa a senha, no segundo explica quais domínios são aceitos.
Colapsar os dois em `401` apagaria a informação de que o aluno usou o Gmail pessoal.

**O token é guardado pela camada de serviço, dentro de `entrar` (passo 24).** Quem chama
`entrar` recebe a sessão pronta e não precisa saber que existe cabeçalho `Authorization`.
No CP6 o valor passa a ser um JWT assinado e **nada acima desta camada muda**
([ADR-0003](../adr/0003-camada-de-repositorio-com-msw.md)).

**`sessionStorage`, não `localStorage`.** Fechar a aba encerra a sessão — o comportamento
certo para app usado em computador de laboratório compartilhado, que é o cenário real das
personas (RNF-020).

**O destino depois do login é decidido por `onboardingPendente`, não pela tela.** Mandar
para o feed quem não tem turma produziria uma tela vazia sem explicação: sem vínculo,
`canSee` não deixa nenhum evento de turma ou de curso passar (RF-004).

---

## 2. Onboarding do primeiro acesso e a guarda de três estados

Cobre UC-008 · Regras: RN-003 · Requisitos: RF-004, RF-005
Código: `ExigeSessao` em `App.tsx`, `useSessao`, `OnboardingPage`, `useConcluirOnboarding`,
`POST /api/auth/onboarding`, `decideOnboarding`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant Guarda as ExigeSessao<br/>App.tsx
    participant Store as useSessionStore<br/>store/session.ts
    participant Sess as useSessao<br/>hooks/useCampusData.ts
    participant Tela as OnboardingPage
    participant Hook as useConcluirOnboarding<br/>hooks/useAuth.ts
    participant Svc as httpRepositories.auth
    participant API as MSW<br/>mocks/handlersCp5.ts
    participant Dom as domain/auth.ts
    participant BD as mocks/db.ts

    Note over Guarda,Store: A guarda tem TRES estados, nao dois

    Aluno->>Guarda: F5 direto em /eventos
    Guarda->>Svc: obterToken

    alt 1 - sem token
        Svc-->>Guarda: null
        Guarda-->>Aluno: Navigate /login com state.de = /eventos
    else 2 - com token, sessao ainda em voo
        Svc-->>Guarda: campus.sess.usr-001
        Guarda->>Store: sessao e resolvida
        Store-->>Guarda: sessao null, resolvida false
        Guarda-->>Aluno: SkeletonLista - o login NAO pisca
        Sess->>Svc: repositories.auth.obterSessao
        Svc->>API: GET /api/sessao com Authorization Bearer
        API->>API: usuarioAtual resolve o id a partir do token
        API-->>Svc: 200 SessaoUsuario
        Svc-->>Sess: sessao
        Sess->>Store: definirSessao - resolvida passa a true
    else 3 - com token, sessao resolvida como ausente
        Store-->>Guarda: sessao null, resolvida true
        Guarda-->>Aluno: Navigate /login com state.de
    end

    Guarda->>Dom: onboardingPendente sessao.usuario
    Dom-->>Guarda: true - cursoId ou turmaId nulo
    Guarda-->>Tela: Navigate /onboarding replace
    Note over Guarda,Tela: /onboarding e a UNICA rota com permitirSemVinculo:<br/>sem isso a guarda redirecionaria a propria tela de onboarding

    Tela->>Svc: useCursos
    Svc->>API: GET /api/cursos
    API-->>Tela: 200 lista de Curso
    Aluno->>Tela: escolhe o curso e digita o codigo da turma
    Tela->>Dom: onboardingSchema chama normalizaCodigo<br/>e o PROPRIO decideOnboarding
    Dom-->>Tela: mesmo motivo de recusa, antes de qualquer requisicao
    Aluno->>Tela: confirma
    Tela->>Hook: concluir.mutate com EntradaOnboarding
    Hook->>Svc: repositories.auth.concluirOnboarding
    Svc->>API: POST /api/auth/onboarding
    API->>API: usuarioAtual request - Bearer campus.sess
    API->>Dom: decideOnboarding cursoId, codigoConvite, cursos, turmas

    alt recusa - CURSO_INEXISTENTE, CODIGO_INVALIDO, CODIGO_INATIVO ou CODIGO_DE_OUTRO_CURSO
        Dom-->>API: recusa com motivo especifico
        API-->>Svc: 422 erro com o motivo
        Svc-->>Hook: ApiError
        Hook-->>Tela: onError - toast com a mensagem daquele motivo
    else aceito
        Dom-->>API: aceito com a Turma resolvida
        API->>BD: transaction - usuario.turmaId e usuario.cursoId
        Note over API,BD: o cursoId gravado e o da TURMA provada pelo codigo,<br/>nao o que veio no corpo da requisicao
        BD-->>API: assertInvariants ok
        API-->>Svc: 200 SessaoUsuario com curso e turma resolvidos
        Svc-->>Hook: sessao
        Hook->>Store: definirSessao e setQueryData sessao
        Hook-->>Aluno: invalida eventos e feed, toast da turma, navegar /
    end
```

### Leitura do diagrama

Os três ramos do primeiro `alt` **são** a guarda `ExigeSessao`. O ramo 2 é o que não
existia no CP4: tratar "carregando" como "não autenticado" fazia o F5 em qualquer rota
profunda piscar o login e perder o destino.

`state.de` é o que devolve a pessoa para onde ela estava — e é por isso que o redirecionamento
carrega `pathname` em vez de mandar todo mundo para a raiz.

`resolvida` na store separa **"ainda não sei"** de **"sei que não há sessão"**. Sem essa
distinção, a guarda não tem como escolher entre esqueleto e redirecionamento.

### Por que esta ordem

**A invalidação do cache acontece depois de `definirSessao`, não antes.** O onboarding
muda o vínculo, e o vínculo muda o que `canSee` deixa passar: a lista de eventos e o feed
que estavam em cache foram calculados para um usuário **sem turma**. Invalidar antes de a
sessão nova estar na store recarregaria com o vínculo velho.

**Quatro motivos de recusa, não um.** "Código de outro curso" é o erro que o aluno comete
quando escolhe o curso errado na tela anterior — e a mensagem genérica o deixaria preso
tentando o mesmo código. O motivo específico diz para onde voltar
([RN-003](../04-regras-de-negocio.md)).

**Todos os quatro motivos são `422`, nenhum é `404`.** Código inexistente não é "recurso
não encontrado": é entrada inválida em um formulário. `404` faria a tela mostrar
"não encontrado" em vez de marcar o campo.

**`/onboarding` exige sessão e mesmo assim é permitida sem vínculo.** É o único destino
autorizado enquanto curso e turma não estão resolvidos. Sem o `permitirSemVinculo`, a
guarda entraria em laço: `/onboarding` → vínculo pendente → `/onboarding`.

---

## 3. Inscrição com vaga disponível

Cobre UC-002 · Regras: RN-001, RN-004, RN-009, RN-012, RN-013, RN-015 · Requisitos: RF-019, RF-020
Código: `EventoDetalhePage`, `resolvePrimaryAction`, `useInscrever`,
`POST /api/eventos/:id/participacoes`, `transaction`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant Tela as EventoDetalhePage
    participant Acao as domain/eventAction.ts
    participant Hook as useInscrever<br/>hooks/useCampusData.ts
    participant Svc as httpRepositories.participations
    participant API as MSW<br/>mocks/handlers.ts
    participant Dom as domain - capacity, deadlines,<br/>visibility, participation, payment, refund
    participant BD as transaction<br/>mocks/db.ts

    Aluno->>Tela: abre /eventos/evt-001
    Tela->>Svc: useEvento id
    Svc->>API: GET /api/eventos/evt-001
    API->>Dom: canSee usuario, evento, temParticipacaoAtiva
    alt fora do alcance - RN-001
        Dom-->>API: false
        API-->>Svc: 404 NAO_ENCONTRADO
        Note over API,Svc: 404 e nao 403: a API nao revela nem a existencia do evento - RNF-012
        Svc-->>Tela: null - a tela mostra "nao encontrado"
    else visivel
        Dom-->>API: true
        API-->>Svc: 200 EventoView com vagasDisponiveis e minhaParticipacao
        Svc-->>Tela: EventoView
    end

    Tela->>Acao: resolvePrimaryAction evento, agora
    Acao-->>Tela: INSCREVER_PAGO com o valor no rotulo
    Aluno->>Tela: toca no botao principal
    Tela->>Hook: inscrever.mutate
    Hook->>Svc: participations.inscrever evt-001
    Svc->>API: POST /api/eventos/evt-001/participacoes
    API->>BD: transaction - entra na fila de escrita

    Note over BD: writeQueue serializa: a segunda requisicao pela<br/>ultima vaga so comeca quando a primeira termina - RN-004
    BD->>Dom: status PUBLICADO, canSee, findActiveParticipation,<br/>enrollmentOpen, isFull
    Dom-->>BD: tem vaga, prazo aberto, nenhuma inscricao ativa
    BD->>Dom: paymentDeadline evento, agora
    Dom-->>BD: min de agora+60min, prazoInscricao, inicio-1h
    BD->>Dom: currentPolicy agora
    Dom-->>BD: PoliticaReembolso congelada
    BD->>BD: push Participacao PENDENTE_PAGAMENTO e ocupadas 18 -> 19
    BD->>BD: assertInvariants
    BD-->>API: ResultadoInscricao PENDENTE_PAGAMENTO
    API-->>Svc: 201 com tipo e participacao
    Svc-->>Hook: ResultadoInscricao
    Hook->>Hook: invalida evento, eventos, minhasParticipacoes, notificacoes
    Hook-->>Aluno: toast "Vaga reservada. Voce tem 60 min para pagar."
    Tela->>Acao: resolvePrimaryAction de novo, com minhaParticipacao
    Acao-->>Aluno: botao vira PAGAR com os minutos restantes

    Note over Svc,BD: Desvios que a MESMA chamada pode devolver
    alt evento gratuito
        BD-->>API: tipo CONFIRMADA - sem janela e sem politica
        API-->>Svc: 201 CONFIRMADA
    else ja tem inscricao ativa - RN-015
        BD-->>API: RECUSADA JA_INSCRITO
        API-->>Svc: 409 JA_INSCRITO
        Svc-->>Hook: tipo RECUSADA - nao lanca excecao
    else prazo encerrado, fora do alcance, cancelado ou nao publicado
        BD-->>API: RECUSADA com motivo
        API-->>Svc: 422 com o motivo
        Svc-->>Hook: tipo RECUSADA
    else lotado - RN-006
        BD-->>API: SEM_VAGA acao LISTA_ESPERA
        API-->>Svc: 409 SEM_VAGA com acao e totalFila
        Svc-->>Hook: tipo SEM_VAGA - continua na sequencia 4
    end
```

### Leitura do diagrama

**Tudo o que decide a inscrição acontece DENTRO da transação.** As cinco verificações
(`status`, `canSee`, `findActiveParticipation`, `enrollmentOpen`, `isFull`), o cálculo dos
prazos e as duas escritas — `push` da participação e `ocupadas += 1` — estão no mesmo
`transaction()`. Verificar fora e escrever dentro reabriria a corrida que RN-004 fecha.

**A camada de serviço converte recusa em resultado, não em exceção.** `inscrever` captura
`ApiError` e devolve `{ tipo: 'SEM_VAGA' }` ou `{ tipo: 'RECUSADA' }`. Exceção fica reservada
ao que a tela não sabe tratar: falha de rede, `500`, `401`. É essa separação que permite a
tela mostrar a mensagem certa em vez de "algo deu errado".

**`resolvePrimaryAction` é chamada duas vezes:** antes e depois da mutação. O botão não é
"inscrever-se" com estados — ele é **derivado** do estado atual da participação, e por isso
muda sozinho quando o cache é invalidado.

### Por que esta ordem

**A vaga é reservada antes da cobrança.** Se a cobrança viesse primeiro, dois alunos
poderiam pagar pela mesma última vaga e um deles teria de ser estornado — transformando
um problema de contagem em um problema de dinheiro. Reservar primeiro converte o pior caso
em "vaga presa por 60 minutos", que a janela de [RN-012](../04-regras-de-negocio.md) limita
e a fila de espera aproveita.

**`PENDENTE_PAGAMENTO` ocupa vaga de propósito.** `occupiesSpot` inclui esse estado:
reservar sem segurar a vaga permitiria vender a mesma vaga duas vezes.

**A política de reembolso é congelada na criação da participação, não lida do evento.**
`politicaVigente` guarda `currentPolicy(agora)`. Se o organizador mudar a política depois,
quem já se inscreveu mantém a que aceitou ([RN-013](../04-regras-de-negocio.md)).

**`409` para "já inscrito" e `422` para o resto.** `409` é conflito com o estado atual do
recurso — existe uma inscrição sua ali. Prazo encerrado e fora do alcance não são conflito:
são entrada inválida.

---

## 4. Evento lotado: lista de espera, oferta e confirmação

Cobre UC-004 · Regras: RN-006, RN-007, RN-008 · Requisitos: RF-024, RF-025, RF-027
Código: `useEntrarNaListaEspera`, `useCancelarParticipacao`, `useConfirmarOferta`,
`nextWaitlistPosition`, `planPromotion`, `offerDeadline`, `recomputePositions`

```mermaid
sequenceDiagram
    autonumber
    actor Marina as Marina - entra na fila
    actor Diego as Diego - confirmado, vai cancelar
    participant Hook as useEntrarNaListaEspera<br/>useCancelarParticipacao<br/>useConfirmarOferta
    participant Svc as httpRepositories.participations
    participant API as MSW<br/>mocks/handlers.ts
    participant Dom as domain/waitlist.ts<br/>domain/capacity.ts
    participant BD as transaction<br/>mocks/db.ts

    Note over Marina,BD: evt-002 Hackathon - 80 de 80 ocupadas, 7 na fila

    Marina->>Svc: inscrever evt-002
    Svc->>API: POST /api/eventos/evt-002/participacoes
    API->>BD: transaction
    BD->>Dom: isFull evento
    Dom-->>BD: true
    BD->>Dom: waitlistSize participacoes
    Dom-->>BD: 7
    BD-->>API: SEM_VAGA acao LISTA_ESPERA totalFila 7
    API-->>Svc: 409 SEM_VAGA acao LISTA_ESPERA totalFila 7
    Svc-->>Hook: tipo SEM_VAGA
    Hook-->>Marina: toast "Evento lotado: 7 na fila. Entre na lista de espera."

    Marina->>Hook: entrarNaFila.mutate
    Hook->>Svc: participations.entrarNaListaEspera evt-002
    Svc->>API: POST /api/eventos/evt-002/lista-espera
    API->>BD: transaction
    BD->>Dom: canSee, findActiveParticipation, enrollmentOpen, isFull
    Dom-->>BD: pode entrar na fila
    BD->>Dom: nextWaitlistPosition participacoes
    Dom-->>BD: 8
    BD->>BD: push Participacao LISTA_ESPERA posicaoFila 8
    Note over BD: ocupadas NAO muda - fila nao ocupa vaga - RN-004
    BD-->>API: participacao
    API-->>Svc: 201 Participacao
    Svc-->>Hook: Participacao
    Hook-->>Marina: toast "Voce e o 8o da fila"

    Note over Marina,BD: Desvios - AINDA_TEM_VAGA, PRAZO_ENCERRADO,<br/>EVENTO_NAO_PUBLICADO e FORA_DO_ALCANCE devolvem 422.<br/>JA_INSCRITO devolve 409

    Note over Diego,BD: Dias depois - Diego cancela e libera uma vaga

    Diego->>Hook: cancelar.mutate participacaoId
    Hook->>Svc: participations.cancelar par-055
    Svc->>API: DELETE /api/participacoes/par-055
    API->>BD: transaction - uma unica transacao para tudo abaixo
    BD->>Dom: isActive status e occupiesSpot status
    Dom-->>BD: ativa e ocupava vaga
    BD->>Dom: withinCancellationWindow evento, agora
    Dom-->>BD: dentro do prazo - canceladaAposPrazo false
    BD->>BD: status CANCELADA, motivo ALUNO_DESISTIU, posicaoFila null
    BD->>BD: ocupadas 80 -> 79
    BD->>Dom: recomputePositions restantes
    Dom-->>BD: so quem mudou de posicao
    BD->>Dom: planPromotion evento, restantes, agora

    alt PROMOVER - fila tem gente e a janela cabe
        Dom->>Dom: offerDeadline - min de agora+24h e inicio-1h
        Dom-->>BD: participacaoId par-070, ofertaExpiraEm
        BD->>BD: par-070 vira OFERTA_PENDENTE com ofertaExpiraEm
        BD->>BD: ocupadas 79 -> 80 - a vaga fica reservada para a oferta
        BD->>Dom: recomputePositions de novo
        Dom-->>BD: Marina passa de 8 para 7
        BD->>BD: push Notificacao VAGA_LIBERADA para o promovido
    else JANELA_INVIAVEL - falta menos que MIN_OFFER_WINDOW_MINUTES
        Dom-->>BD: nenhuma oferta e emitida
        Note over BD: ocupadas fica em 79: a vaga volta ao pool<br/>e vale por ordem de chegada - RN-007
    else FILA_VAZIA - ninguem na fila ou evento nao publicado
        Dom-->>BD: nada a promover
    end

    BD->>BD: assertInvariants
    BD-->>API: cancelada true, promovido usuarioId ou null
    API-->>Svc: 200
    Svc-->>Hook: resultado
    Hook-->>Diego: toast "A vaga foi oferecida ao primeiro da fila."

    Note over Hook,BD: O promovido abre o app e confirma

    Hook->>Svc: participations.confirmarOferta par-070
    Svc->>API: POST /api/participacoes/par-070/confirmar
    API->>BD: transaction
    alt status nao e OFERTA_PENDENTE
        BD-->>API: SEM_OFERTA
        API-->>Svc: 422 SEM_OFERTA
    else ofertaExpiraEm ja passou
        BD-->>API: OFERTA_EXPIRADA
        API-->>Svc: 422 OFERTA_EXPIRADA
    else dentro da janela e evento pago
        BD->>Dom: paymentDeadline e currentPolicy
        Dom-->>BD: nova janela de 60 min
        BD->>BD: status PENDENTE_PAGAMENTO, ofertaExpiraEm null
        Note over BD: ocupadas nao muda: a vaga ja estava reservada
        API-->>Svc: 200 Participacao - segue na sequencia 5
    else dentro da janela e evento gratuito
        BD->>BD: status CONFIRMADA
        API-->>Svc: 200 Participacao
    end
```

### Leitura do diagrama

**A promoção acontece na mesma transação do cancelamento.** Se fosse um trabalho
assíncrono posterior, existiria uma janela em que a vaga está livre e ninguém foi avisado —
exatamente a "vaga que evapora" que o produto promete resolver.

**`recomputePositions` é chamada duas vezes.** Uma vez depois do cancelamento (porque quem
saiu pode ter estado na fila) e outra depois da promoção (porque o promovido deixa a fila).
Devolve **só quem muda**, e não a fila inteira.

**`planPromotion` tem três desfechos, não um.** `JANELA_INVIAVEL` é o que o CP4 não previa:
oferta com menos de `MIN_OFFER_WINDOW_MINUTES` não é emitida, e a vaga volta a valer por
ordem de chegada. Emitir uma oferta de 3 minutos seria oferecer o que ninguém consegue aceitar.

### Por que esta ordem

**A vaga é reservada para a oferta — `ocupadas` volta a 80.** Contraintuitivo, mas
necessário: durante as 24 h da oferta ninguém mais pode tomar aquela vaga. Sem essa reserva,
quem confirmasse a oferta poderia descobrir que a vaga já era de outro, e o overbooking de
[RN-004](../04-regras-de-negocio.md) voltaria pela janela.

**Uma oferta por vaga liberada.** O caminho "ofereço a três para garantir que um confirme"
foi recusado: geraria três pessoas com direito à mesma vaga.

**`planPromotion` não escreve nada.** É função pura de decisão; quem aplica é o handler,
na mesma transação. É o que a torna testável exaustivamente (CT-004 a CT-006) sem montar
banco nem servidor.

**Confirmar oferta em evento pago devolve `PENDENTE_PAGAMENTO`, não `CONFIRMADA`.** Aceitar
a vaga não paga a vaga: abre a janela de [RN-012](../04-regras-de-negocio.md) de novo, com
`paymentDeadline` recontado a partir de agora.

### Divergência do CP4 anotada aqui

O CP4 desenhava um ramo `else` com **rotina periódica** expirando a oferta
(`OFERTA_PENDENTE → EXPIRADA`) e devolvendo a vaga. **No CP5 esse ramo não existe.**
`offerExpired()` e `paymentExpired()` existem em `domain/`, são testadas, e **nenhum
handler as chama**: não há processo agendado no navegador. Por isso ele não está no
diagrama — ver a seção "Transições que o CP5 ainda não executa" em
[`06-diagrama-estados.md`](06-diagrama-estados.md).

---

## 5. Pagamento simulado: cobrança, webhook e os quatro desfechos

Cobre UC-003 · Regras: RN-012, RN-014, **RN-026, RN-027, RN-028** · Requisitos: RF-026 a RF-030
Decisões: [ADR-0006](../adr/0006-abstracao-de-gateway-de-pagamento.md)
Código: `PagamentoPage`, `usePagamento`, `useIniciarPagamento`, `useSimularDesfecho`,
`POST /api/participacoes/:id/pagamento`, `POST /api/pagamentos/:id/simular`,
`gerarCobrancaPix`, `paymentDeadline`, `minutesLeftToPay`, `planWebhook`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant Tela as PagamentoPage
    participant Hook as usePagamento<br/>useIniciarPagamento<br/>useSimularDesfecho
    participant Svc as httpRepositories.payments
    participant API as MSW<br/>mocks/handlersCp5.ts
    participant Pix as domain/pix.ts
    participant Pay as domain/payment.ts
    participant BD as transaction<br/>mocks/db.ts

    Aluno->>Tela: abre /pagamento/par-101
    Tela->>Svc: usePagamento participacaoId
    Svc->>API: GET /api/participacoes/par-101/pagamento
    alt ainda nao existe cobranca
        API-->>Svc: 404 NAO_ENCONTRADO
        Svc-->>Tela: null - a tela oferece Pix e cartao
    else cobranca aberta
        API->>Pay: minutesLeftToPay participacao, agora
        Pay-->>API: minutos restantes
        API-->>Svc: 200 PagamentoView
    end

    Aluno->>Tela: escolhe cartao e digita os dados
    Tela->>Pix: luhnValido, bandeiraDoCartao, validadeNoFuturo, cvvValido
    Pix-->>Tela: aprovado ou reprovado no proprio formulario
    Tela->>Pix: resumirCartao numero, titular
    Pix-->>Tela: ResumoCartao com ultimosQuatro e bandeira
    Note over Tela,Pix: numero completo e CVV NAO entram no corpo da requisicao - RNF-022

    Aluno->>Tela: confirma
    Tela->>Hook: iniciar.mutate NovoPagamento
    Hook->>Svc: payments.iniciar par-101, entrada
    Svc->>API: POST /api/participacoes/par-101/pagamento

    alt participacao inexistente
        API-->>Svc: 404 NAO_ENCONTRADA
    else participacao de outra pessoa
        API-->>Svc: 403 SEM_PERMISSAO
    else status nao e PENDENTE_PAGAMENTO
        API-->>Svc: 409 NAO_AGUARDA_PAGAMENTO
    else ja existe cobranca AGUARDANDO no mesmo metodo
        API-->>Svc: 200 a MESMA PagamentoView
        Note over API,Svc: idempotente por participacao: duplo toque no botao<br/>nao gera dois Pix para a mesma vaga
    else abre a cobranca
        API->>Pay: idempotencyKey participacaoId, transacaoExternaId
        Pay-->>API: chave estavel derivada dos dois ids
        API->>BD: transaction
        BD->>BD: upsert Pagamento AGUARDANDO e resumosCartao do pagamento
        BD->>Pay: paymentDeadline evento, agora
        Pay-->>BD: nova expiracao
        BD->>BD: participacao.pagamentoExpiraEm recontado
        Note over BD: o relogio da vaga comeca quando a COBRANCA abre,<br/>nao quando a inscricao foi criada - RN-012
        BD-->>API: pagamento salvo
        API->>Pix: gerarCobrancaPix valor, referencia, expiraEm
        Pix-->>API: CobrancaPix chave, brCode com CRC16, expiraEm
        Note over API,Pix: o brCode nao e armazenado: gerarCobrancaPix e deterministico,<br/>guardar o QR seria guardar dado derivado
        API-->>Svc: 201 PagamentoView com pix e minutosRestantes
        Svc-->>Hook: PagamentoView
        Hook-->>Aluno: QR, copia-e-cola e contagem explicita dos minutos
    end

    Note over Aluno,BD: O webhook do gateway - na demo, o botao "simular"

    Aluno->>Hook: simular.mutate pagamentoId, desfecho
    Hook->>Svc: payments.simularDesfecho pag-1001, desfecho
    Svc->>API: POST /api/pagamentos/pag-1001/simular

    alt desfecho RECUSAR - atalho da demo, nao passa por planWebhook
        API->>BD: transaction - pagamento.status RECUSADO
        API-->>Svc: 200 PagamentoView RECUSADO
        Hook-->>Aluno: toast "O pagamento foi recusado. Tente outro metodo."
    else desfecho CONFIRMAR ou DUPLICAR
        API->>Pay: planWebhook pagamento, participacao, notificacao
        alt CONFIRMAR - pagamento AGUARDANDO, valor bate, vaga ainda pendente
            Pay-->>API: CONFIRMAR
            API->>BD: transaction
            BD->>BD: pagamento CONFIRMADO com confirmadoEm
            BD->>BD: participacao CONFIRMADA e pagamentoExpiraEm null
            BD->>BD: push Notificacao PAGAMENTO_CONFIRMADO
            BD->>BD: assertInvariants
            API-->>Svc: 200 PagamentoView com desfecho CONFIRMAR
            Hook-->>Aluno: toast "Pagamento confirmado. Sua vaga esta garantida."
        else IGNORAR_DUPLICADA - pagamento JA estava CONFIRMADO
            Pay-->>API: IGNORAR_DUPLICADA
            Note over API,BD: NENHUMA escrita. Nem transicao, nem notificacao - RN-014
            API-->>Svc: 200 PagamentoView inalterada com desfecho IGNORAR_DUPLICADA
            Hook-->>Aluno: toast "Nada mudou: essa notificacao ja havia sido processada."
        else DIVERGENCIA_DE_VALOR - valorPago difere do valor cobrado
            Pay-->>API: DIVERGENCIA_DE_VALOR com esperado e recebido
            Note over API,BD: NENHUMA escrita. Nunca confirma automaticamente<br/>um pagamento de valor diferente do cobrado
            API-->>Svc: 200 PagamentoView inalterada com desfecho DIVERGENCIA_DE_VALOR
        else ESTORNAR - participacao nao esta mais PENDENTE_PAGAMENTO
            Pay-->>API: ESTORNAR com motivo
            API->>BD: transaction
            BD->>BD: pagamento ESTORNADO e valorReembolsado igual ao valor
            Note over BD: a participacao NAO e tocada: a vaga pode ja ser de outro
            API-->>Svc: 200 PagamentoView ESTORNADO com desfecho ESTORNAR
            Hook-->>Aluno: toast "A vaga expirou antes do pagamento: o valor sera estornado."
        end
    end

    Hook->>Hook: invalida pagamento, participacao, minhasParticipacoes,<br/>notificacoes e eventos
```

### Leitura do diagrama

**Quatro desfechos de `planWebhook`, e dois deles não escrevem nada.**
`IGNORAR_DUPLICADA` e `DIVERGENCIA_DE_VALOR` devolvem `200` com a projeção **inalterada**.
Isso não é um caminho de erro: é exatamente o comportamento que
[RN-014](../04-regras-de-negocio.md) exige. Gateway reenvia notificação; sem a checagem, o
aluno receberia duas notificações e o organizador contaria o pagamento duas vezes.

**A ordem das verificações dentro de `planWebhook` não é acidental:**

1. duplicada → não repete transição nem notificação;
2. valor divergente → nunca confirma automaticamente;
3. participação já encerrada → estorna, porque a vaga pode já ser de outro.

**Nenhum desfecho devolve `201`.** A cobrança (`POST .../pagamento`) devolve `201` quando
cria e `200` quando reaproveita a existente. O webhook devolve sempre `200`: ele não cria
recurso, só relata um fato externo.

**A cobrança Pix é derivada, não armazenada.** `gerarCobrancaPix` é determinística sobre
`(valor, referencia, expiraEm)`. Guardar o `brCode` desalinharia o QR do valor na primeira
alteração de preço. `PagamentoView.pix` só é preenchido quando `metodo === 'PIX'` **e**
`status === 'AGUARDANDO'` — QR de cobrança já paga é convite a pagar duas vezes.

### Por que esta ordem

**A janela de RN-012 é recontada quando a cobrança abre, não quando a inscrição nasce.**
`paymentDeadline` é chamada nos dois momentos, e a segunda chamada sobrescreve a primeira.
O relógio da vaga começa quando o aluno de fato tem um QR na tela — caso contrário, quem
demorasse cinco minutos para escolher o método receberia 55.

**A idempotência vive em dois lugares diferentes, de propósito.** Na abertura da cobrança
ela é por **participação** (mesma cobrança devolvida em vez de duas criadas); no webhook
ela é por **estado do pagamento** (`status === 'CONFIRMADO'` → ignora). São defeitos
diferentes: duplo toque no botão versus reenvio do gateway.

**A confirmação vem do webhook, nunca da tela.** O app do aluno não é fonte confiável para
dizer "paguei". A única transição para `CONFIRMADO` passa por `planWebhook`, e é por isso
que o fluxo continua correto se o aluno fechar o app depois de escanear o QR.

**O cartão é reduzido no cliente, antes de qualquer requisição.** `resumirCartao` roda na
tela: número completo e CVV não entram no corpo, não passam pelo MSW e não existem no
`db.ts` (RNF-022).

### Duas honestidades sobre a simulação

- **`DESFECHO_SIMULADO` tem três valores** (`CONFIRMAR`, `RECUSAR`, `DUPLICAR`), e
  `planWebhook` tem **quatro** desfechos mais `DESCONHECIDO`. Não é o mesmo conjunto:
  o enum é o **gatilho** da demo, os desfechos são a **decisão** do domínio.
- `CONFIRMAR` e `DUPLICAR` entram no **mesmo caminho** do handler. A idempotência aparece
  porque a segunda chamada encontra o pagamento já `CONFIRMADO`, não porque o corpo disse
  "duplicar" — o que é mais fiel ao gateway real, que também não avisa que está reenviando.
  `DIVERGENCIA_DE_VALOR` é, hoje, alcançável apenas pelo teste unitário de `planWebhook`:
  o handler envia `valorPago = pagamento.valor`.

---

## 6. Check-in na porta do evento

Cobre UC-005, UC-017 · Regras: RN-017, RN-018, **RN-029** · Requisitos: RF-033, RF-034, RF-035
Código: `IngressoPage`, `useTokenIngresso`, `CheckinPage`, `usePainelCheckin`,
`useValidarCheckin`, `GET /api/participacoes/:id/token`, `GET` e `POST /api/eventos/:id/checkin`,
`classificarLeitura`, `emitirToken`, `lerToken`, `decideCheckIn`, `canValidateCheckIn`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    actor Org as Organizador
    participant TelaA as IngressoPage
    participant TelaO as CheckinPage
    participant Hook as useTokenIngresso<br/>usePainelCheckin<br/>useValidarCheckin
    participant Svc as httpRepositories.checkin
    participant API as MSW<br/>mocks/handlersCp5.ts
    participant Tok as domain/ticketToken.ts
    participant Dec as domain/checkin.ts<br/>domain/deadlines.ts<br/>domain/permissions.ts
    participant BD as transaction<br/>mocks/db.ts

    Aluno->>TelaA: abre /ingresso/par-101
    TelaA->>Hook: useTokenIngresso participacaoId
    Hook->>Svc: checkin.obterTokenDoIngresso par-101
    Svc->>API: GET /api/participacoes/par-101/token
    alt nao e sua ou nao existe
        API-->>Svc: 404 NAO_ENCONTRADO
    else status nao e CONFIRMADA nem PRESENTE
        API-->>Svc: 409 NAO_CONFIRMADA
        Note over API,Svc: ingresso so e emitido depois da inscricao confirmada
    else emite
        API->>Tok: emitirToken participacaoId, eventoId, usuarioId, emitidoEm
        Tok-->>API: campus.v1.payload.assinatura
        API->>Dec: numericCheckInCode participacaoId
        Dec-->>API: 8 digitos deterministicos
        API-->>Svc: 200 TokenIngresso valor, codigoNumerico, codigoLegivel, emitidoEm
        Svc-->>Aluno: QR, codigo de 8 digitos e codigo legivel CMP-3ESPX-0184
    end

    Org->>TelaO: abre /eventos/evt-001/checkin
    TelaO->>Hook: usePainelCheckin eventoId
    Hook->>Svc: checkin.obterPainel evt-001
    Svc->>API: GET /api/eventos/evt-001/checkin
    API->>Dec: canValidateCheckIn atual, evento
    alt nao e organizador nem admin do escopo
        Dec-->>API: false
        API-->>Svc: 403 SEM_PERMISSAO
    else pode validar
        Dec-->>API: true
        API->>Dec: checkInWindow evento
        Dec-->>API: abreEm inicio-4h, fechaEm fim+2h
        API-->>Svc: 200 PainelCheckin abertoAgora, confirmados, presentes, presencas
        Svc-->>Org: contador e lista, com refetch a cada 15 s
    end

    Aluno->>Org: apresenta o ingresso
    Org->>TelaO: le o QR, ou digita o codigo quando a camera falha
    TelaO->>Hook: validar.mutate leitura
    Hook->>Svc: checkin.validar evt-001, leitura
    Svc->>API: POST /api/eventos/evt-001/checkin
    API->>Tok: classificarLeitura bruto

    alt TOKEN - camera leu o QR
        Tok-->>API: tipo TOKEN
        API->>Tok: lerToken token
        Tok-->>API: payload ou null se a assinatura nao confere
        API->>BD: findParticipacao payload.participacaoId
    else CODIGO_NUMERICO - 8 digitos digitados
        Tok-->>API: tipo CODIGO_NUMERICO
        API->>BD: participacoesDoEvento e compara numericCheckInCode
        BD-->>API: participacao encontrada por derivacao
        API->>Tok: emitirToken para a participacao achada
    else CODIGO_LEGIVEL - CMP-TURMA-0184 impresso
        Tok-->>API: tipo CODIGO_LEGIVEL
        API->>BD: compara os 4 ultimos digitos de numericCheckInCode
        BD-->>API: participacao encontrada por derivacao
        API->>Tok: emitirToken para a participacao achada
    else INDECIFRAVEL
        Tok-->>API: tipo INDECIFRAVEL
        Note over API,Tok: assinaturaValida entra como false: cai em TOKEN_INVALIDO
    end

    Note over API,Dec: As tres formas convergem para a MESMA decisao
    API->>Dec: decideCheckIn token, assinaturaValida, evento,<br/>participacao, presencaExistente, operadorTemPermissao, now

    alt recusado - SEM_PERMISSAO, TOKEN_INVALIDO, OUTRO_EVENTO,<br/>EVENTO_CANCELADO, AINDA_NAO_ABRIU, JA_ENCERROU,<br/>NAO_CONFIRMADA ou JA_UTILIZADO
        Dec-->>API: aceito false com o motivo e a mensagem
        API-->>Svc: 200 ResultadoCheckin aceito false
        Note over API,Svc: 200, nao 4xx: na porta do evento "ingresso ja usado"<br/>e resposta do sistema, nao falha dele
        Svc-->>Hook: ResultadoCheckin em onSuccess
        Hook-->>Org: aviso vermelho com o motivo especifico, sem invalidar cache
    else aceito
        Dec-->>API: aceito true
        API->>BD: transaction
        BD->>BD: push Presenca com metodo QR_CODE ou CODIGO_NUMERICO
        BD->>BD: participacao.status PRESENTE
        BD->>BD: assertInvariants - uma presenca por participacao - RN-018
        BD-->>API: gravado
        API-->>Svc: 201 ResultadoCheckin aceito true com participante e registradoEm
        Svc-->>Hook: ResultadoCheckin
        Hook->>Hook: invalida painelCheckin e evento
        Hook-->>Org: confirmacao verde com nome e turma, contador sobe
    end
```

### Leitura do diagrama

**As sete condições de [RN-017](../04-regras-de-negocio.md) estão em `decideCheckIn`, na
ordem em que ficam mais baratas e mais informativas:**

| Ordem no código | Motivo devolvido | Condição de RN-017 |
|---|---|---|
| 1 | `SEM_PERMISSAO` | 1 — quem lê é organizador ou admin do escopo |
| 2 | `TOKEN_INVALIDO` | 2 — assinatura válida |
| 3 | `OUTRO_EVENTO` | 3 — `eventoId` do token igual ao da leitura |
| 4 | `EVENTO_CANCELADO` | 4 — condição **acrescentada no CP5** pelo código |
| 5 | `AINDA_NAO_ABRIU` / `JA_ENCERROU` | 5 — janela temporal |
| 6 | `TOKEN_INVALIDO` | 2 — token íntegro, mas a participação não existe |
| 7 | `JA_UTILIZADO` | 6 — nenhuma presença já registrada |
| 8 | `NAO_CONFIRMADA` | 7 — participação em `CONFIRMADA` |

A permissão vem **primeiro** porque é a única verificação que não depende de nada lido:
recusar sem tocar em token nem em banco não dá pista nenhuma a quem tenta fraudar.

**`EVENTO_CANCELADO` não estava no CP4.** O código a acrescentou, e o código está certo:
sem ela, um evento cancelado com ingressos já emitidos aceitaria presença. RN-017 foi
corrigida de 6 para 7 condições por causa disto.

**A unicidade vem antes do status, e isso foi corrigido no CP5.** O aceite grava a
`Presenca` **e** muda a participação para `PRESENTE` na mesma transação — logo, na segunda
leitura do mesmo ingresso as duas condições estão violadas ao mesmo tempo. Com a ordem
anterior (status antes de unicidade), a resposta era `NAO_CONFIRMADA` com a mensagem
"Check-in já registrado.", e **`JA_UTILIZADO` era ramo morto**: o motivo que RN-018 existe
para produzir, e o único que carrega o **horário do primeiro uso**, nunca chegava a quem
consome a API.

O defeito foi visto na porta simulada, no navegador, e a ordem foi invertida em
[`domain/checkin.ts`](../../app/src/domain/checkin.ts). Hoje a segunda leitura devolve
`JA_UTILIZADO` com "Ingresso já utilizado às 19:13." — que é o que o operador precisa ler.
A troca é segura porque a presença tem relação 1:1 com a participação: existir presença já
implica que a entrada aconteceu, e `PRESENTE` sem linha de presença continua caindo na
condição de status. Teste de regressão nomeado em `checkin.test.ts`, "unicidade responde
ANTES do status".

**`200` na recusa, `201` no aceite.** O aceite cria um recurso (`Presenca`); a recusa não
cria nada. Devolver `4xx` na recusa mandaria a resposta para `onError` do hook, onde a
tela mostraria "erro ao validar" — e na porta de um evento com fila isso não é resposta:
o operador precisa saber se chama o próximo ou o segurança.

**As três formas de leitura não têm tabela de códigos.** `codigoNumerico` e `codigoLegivel`
são **derivados** do id da participação por `numericCheckInCode`. Não há armazenamento para
dessincronizar, e a busca é por derivação. O preço é uma varredura em
`participacoesDoEvento` — aceitável no volume real e substituível por índice no CP6.

### Por que esta ordem

**A unicidade é verificada por `decideCheckIn` e garantida por `assertInvariants`.** A
verificação existe para dar a **mensagem certa** — "ingresso já utilizado às 20h14" —
antes de tentar escrever. A garantia é estrutural: `assertInvariants` estoura se houver
duas presenças para a mesma participação, e no CP6 é o índice único em
`presenca.participacao_id` que fecha a janela de corrida entre dois operadores lendo QRs
em paralelo ([RN-018](../04-regras-de-negocio.md)).

**A leitura é classificada antes de ser resolvida.** `classificarLeitura` não consulta
nada: é um `switch` sobre a forma do texto. Texto vazio ou lixo vira `INDECIFRAVEL` e
recebe `TOKEN_INVALIDO` sem uma consulta ao banco.

**O token é reemitido quando a entrada é código digitado.** As três formas precisam chegar
a `decideCheckIn` com o mesmo `CheckInTokenPayload`; reemitir a partir da participação
encontrada é o que unifica os caminhos sem duplicar a decisão.

**A recusa não invalida cache.** `useValidarCheckin` só invalida `painelCheckin` e `evento`
quando `resultado.aceito` é verdadeiro. Recusa não mudou nada — refazer as duas consultas
custaria latência na fila da porta sem trazer dado novo.

---

## 7. Publicar no feed do evento

Cobre UC-013, UC-014 · Regras: RN-001, RN-019 · Requisitos: RF-036, RF-037, RF-038
Código: `FeedPage`, `useFeed`, `useEventosPublicaveis`, `usePublicar`, `useComentar`,
`POST /api/publicacoes`, `POST /api/publicacoes/:id/comentarios`, `eventosVisiveis`, `canSee`, `isActive`

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant Tela as FeedPage
    participant Hook as useFeed<br/>useEventosPublicaveis<br/>usePublicar
    participant Svc as httpRepositories.feed
    participant API as MSW<br/>mocks/handlersCp5.ts
    participant Sup as mocks/support.ts
    participant Dom as domain/visibility.ts<br/>domain/participation.ts
    participant BD as transaction<br/>mocks/db.ts

    Aluno->>Tela: abre o feed
    Tela->>Hook: useFeed
    Hook->>Svc: feed.listar
    Svc->>API: GET /api/feed
    API->>Sup: eventosVisiveis usuarioId
    Sup->>Dom: canSee para cada evento, com temParticipacaoAtiva
    Dom-->>Sup: conjunto de eventos visiveis
    Sup-->>API: ids visiveis
    API-->>Svc: 200 PublicacaoView filtrada pelo alcance e sem removidas
    Svc-->>Tela: feed segmentado

    Tela->>Hook: useEventosPublicaveis
    Hook->>Svc: feed.eventosPublicaveis
    Svc->>API: GET /api/feed/eventos-publicaveis
    API->>BD: participacoesDoUsuario filtradas por CONFIRMADA ou PRESENTE
    BD-->>API: eventos de que ele participou
    API->>Sup: eventosVisiveis, filtrando organizadorId igual ao atual
    Sup-->>API: eventos que ele organiza
    API-->>Svc: 200 uniao sem duplicatas, so id e titulo
    Svc-->>Aluno: o seletor de evento so lista o que ele pode publicar

    Aluno->>Tela: escreve a legenda e envia
    Tela->>Hook: publicar.mutate NovaPublicacao
    Hook->>Svc: feed.publicar entrada
    Svc->>API: POST /api/publicacoes

    alt legenda com menos de 2 caracteres
        API-->>Svc: 422 LEGENDA_CURTA
    else legenda com mais de 500 caracteres
        API-->>Svc: 422 LEGENDA_LONGA
    else primeira verificacao - alcance
        API->>Sup: eventosVisiveis usuarioId
        Sup->>Dom: canSee usuario, evento
        Dom-->>Sup: evento nao esta no alcance
        Sup-->>API: nao encontrado entre os visiveis
        API-->>Svc: 404 NAO_ENCONTRADO
        Note over API,Svc: 404 e nao 403: um POST direto nao pode nem confirmar<br/>que o evento existe - RNF-012
    else segunda verificacao - participacao
        API->>BD: participacoesDoUsuario neste evento
        BD-->>API: participacoes do aluno
        API->>Dom: isActive status de cada uma
        Dom-->>API: nenhuma ativa
        API->>API: e organizadorId diferente do atual
        API-->>Svc: 403 SEM_PARTICIPACAO
        Note over API,Svc: "So quem participou do evento publica no feed dele" - RN-019
    else aceito
        API->>BD: transaction - push Publicacao com imagemSeed 1..24
        BD-->>API: gravada
        API-->>Svc: 201 PublicacaoView com autor, evento e comentarios
        Svc-->>Hook: PublicacaoView
        Hook->>Hook: invalida o feed INTEIRO, nao costura o item no cache
        Hook-->>Aluno: toast "Publicado no feed do evento."
    end

    Aluno->>Tela: comenta em uma publicacao
    Tela->>Svc: feed.comentar publicacaoId, texto
    Svc->>API: POST /api/publicacoes/pub-1001/comentarios
    alt texto com menos de 2 ou mais de 280 caracteres
        API-->>Svc: 422 TEXTO_CURTO ou TEXTO_LONGO
    else publicacao removida, inexistente ou de evento fora do alcance
        API-->>Svc: 404 NAO_ENCONTRADA
    else aceito
        API->>BD: transaction - push Comentario
        API-->>Svc: 201 Comentario
        Svc-->>Hook: Comentario
        Hook->>Hook: invalida o feed
    end
```

### Leitura do diagrama

**A verificação é dupla e as duas metades devolvem status diferentes.**

| Verificação | Função | Falha devolve |
|---|---|---|
| Alcance — o evento existe **para você**? | `eventosVisiveis` → `canSee` | `404 NAO_ENCONTRADO` |
| Participação — você **esteve** nele? | `isActive` sobre `participacoesDoUsuario`, ou `organizadorId` | `403 SEM_PARTICIPACAO` |

A ordem importa: verificar participação primeiro revelaria, pelo `403`, que o evento
existe. Com alcance primeiro, quem não pode ver recebe `404` e não aprende nada.

**A mesma verificação de alcance serve leitura e escrita.** `eventosVisiveis` é a função
que filtra o `GET /api/feed` **e** a que autoriza o `POST /api/publicacoes`. Sem isso, um
POST direto publicaria em evento invisível — o defeito clássico de esconder na UI e
esquecer no servidor (RNF-012).

**O comentário devolve `404` para "fora do alcance", nunca `403`.** Publicação de evento
que você não pode ver não é "proibido comentar": é "não existe para você".

### Por que esta ordem

**Publicar invalida o feed inteiro em vez de costurar o item novo no cache.** O feed é
segmentado por alcance, e quem decide se a publicação aparece — e em que posição — é o
servidor, não a tela. Inserir localmente mostraria a publicação para quem o `canSee` do
servidor excluiria.

**`eventosPublicaveis` existe para o seletor não oferecer o impossível.** Ele é a união de
"eventos de que participei com `CONFIRMADA` ou `PRESENTE`" e "eventos que eu organizo".
Sem ele, o aluno escolheria um evento na lista para receber `403` depois de escrever a
legenda.

### Divergência anotada aqui

Existem hoje **três** critérios de "quem pode publicar", e eles não coincidem:

| Onde | Critério |
|---|---|
| `POST /api/publicacoes` (autoridade) | `isActive(status)` **ou** ser o organizador |
| `GET /api/feed/eventos-publicaveis` (o que o seletor oferece) | `CONFIRMADA` ou `PRESENTE`, **ou** ser o organizador |
| `domain/permissions.ts#canPostToEvent` | `PRESENTE` **e** evento já começado, ou ser o organizador — **função não chamada por nenhum handler** |

`canPostToEvent` é a versão mais restrita e a mais fiel a
[RN-019](../04-regras-de-negocio.md); o handler é o que está no ar. **O código venceu no
diagrama** — está desenhado o que o handler faz. A convergência é dívida registrada para o
CP6, quando `canPostToEvent` passa a ser chamada pelo serviço de aplicação.

---

## 8. Como estas sequências viram teste

Tabela levantada dos arquivos de teste que **existem** hoje — os identificadores `CT-` foram
lidos dos próprios `it(...)`, não do plano de testes.

| Sequência | Caso de teste | Arquivo |
|---|---|---|
| 1 — login e as três recusas | CT-032 — `decideLogin` com domínio pessoal, senha errada e e-mail não verificado | `app/src/domain/auth.test.ts` |
| 2 — onboarding e os quatro motivos | CT-033 — `decideOnboarding` com código inválido, inativo, de outro curso e curso inexistente | `app/src/domain/auth.test.ts` |
| 3 — quem ocupa vaga | CT-001 — `occupiesSpot` para os oito estados | `app/src/domain/capacity.test.ts` |
| 3 — vaga e lotação a partir do seed | CT-002 — 18/40 tem 22 livres; 80/80 está lotado | `app/src/domain/capacity.test.ts` |
| 3 — janela de pagamento | CT-007 — `paymentDeadline` truncado pelo prazo e por `inicio - 1h` | `app/src/domain/payment.test.ts` |
| 3 — a inscrição pelo endpoint, com desvios | CT-002, CT-018, CT-003, CT-012, CT-027 — contra os handlers do MSW | `app/src/services/inscricao.test.ts` |
| 3 — concorrência pela última vaga | **CT-020 — 50 inscrições simultâneas confirmam exatamente uma** (RNF-013) | `app/src/services/inscricao.test.ts` |
| 3 — botão principal por estado | CT-003, CT-015, CT-027 — `resolvePrimaryAction` | `app/src/domain/eventAction.test.ts` |
| 4 — fila FIFO e posição de entrada | CT-003 — `orderedWaitlist`, `nextWaitlistPosition` | `app/src/domain/waitlist.test.ts` |
| 4 — promoção e janela da oferta | CT-004 — promove só o primeiro; janela truncada; janela inviável não emite oferta | `app/src/domain/waitlist.test.ts` |
| 4 — posições avançam | CT-005 — `recomputePositions` depois da promoção | `app/src/domain/waitlist.test.ts` |
| 4 — cancelar promove na mesma operação | CT-004, CT-005 — pelo endpoint `DELETE /api/participacoes/:id` | `app/src/services/inscricao.test.ts` |
| 5 — quatro desfechos do webhook | **CT-010 — `planWebhook` exaustivo, incluindo os dois que não escrevem** | `app/src/domain/payment.test.ts` |
| 5 — cobrança Pix e redução do cartão | CT-034, CT-035 — `gerarCobrancaPix`, CRC16, `resumirCartao` | `app/src/domain/pix.test.ts` |
| 6 — token do ingresso e as três leituras | CT-036, CT-037 — `emitirToken`, `lerToken`, `classificarLeitura` | `app/src/domain/ticketToken.test.ts` |
| 6 — as recusas de `decideCheckIn` e a ordem entre elas | CT-022, CT-023, CT-024 — cada condição com seu motivo, a ordem das verificações, a mensagem por status e os códigos de contingência | `app/src/domain/checkin.test.ts` |
| 7 — alcance como autoridade | CT-011 a CT-014 — `canSee` por turma, curso, faculdade e participação ativa | `app/src/domain/visibility.test.ts` |
| 7 — alcance na escrita do feed | ❌ **sem teste.** `POST /api/publicacoes` não é exercitado por nenhum teste de integração | — |
| 3 — fluxo ponta a ponta | E2E: abrir feed, abrir evento, inscrever-se, ver confirmação | `app/e2e/inscricao.spec.ts` |

**A lacuna que resta é a escrita no feed.** `POST /api/publicacoes` é o endpoint com a
verificação dupla mais delicada do CP5 — alcance com `404` e participação com `403` — e é o
único fluxo desenhado neste documento sem teste que exercite o handler. A sequência 7 é,
hoje, a especificação mais completa daquele comportamento, e é por isso que ela está
desenhada ramo por ramo, com os três critérios divergentes de "quem pode publicar"
tabelados. Ver [`../11-plano-de-testes.md`](../11-plano-de-testes.md).
