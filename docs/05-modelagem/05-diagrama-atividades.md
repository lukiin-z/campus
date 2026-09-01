# Diagrama de atividades

**Responsável:** Ronaldo Veloso Filho · **Adianta requisito do CP5**

Fluxo completo de criação e publicação de evento (UC-001), do toque em "Criar evento" até
o evento visível para o alcance. Este é o fluxo com mais decisões do sistema — alcance,
cobrança e aprovação —, e é onde a maior parte dos erros de preenchimento acontece.

## 1. Criação e publicação de evento

```mermaid
flowchart TD
    START(["Organizador aciona<br/>Criar evento"]) --> CHK_AUTH{"Autenticado?"}
    CHK_AUTH -- "nao" --> LOGIN["Redireciona para login<br/>UC-007"]
    LOGIN --> CHK_AUTH
    CHK_AUTH -- "sim" --> CHK_VINC{"Tem vinculo<br/>de turma?"}
    CHK_VINC -- "nao" --> ONB["Redireciona para<br/>onboarding UC-008"]
    ONB --> CHK_VINC
    CHK_VINC -- "sim" --> FORM["Exibe formulario<br/>alcance TURMA por padrao<br/>prazos sugeridos"]

    FORM --> FILL["Preenche titulo, descricao,<br/>inicio, fim, local, capacidade"]
    FILL --> ESC{"Escolhe o alcance"}

    ESC -- "TURMA" --> ANC_T["Ancora = turma do organizador"]
    ESC -- "CURSO" --> ANC_C["Ancora = curso do organizador"]
    ESC -- "FACULDADE" --> ANC_F["Ancora = faculdade do organizador"]

    ANC_T --> COBRA
    ANC_C --> COBRA
    ANC_F --> COBRA

    COBRA{"Evento sera<br/>cobrado?"}
    COBRA -- "nao" --> GRAT["preco = 0<br/>inscricao nasce CONFIRMADA"]
    COBRA -- "sim" --> PAGO["Informa valor<br/>inscricao nasce PENDENTE_PAGAMENTO"]
    PAGO --> POL["Exibe politica de reembolso<br/>que valera para os inscritos"]

    GRAT --> PERG
    POL --> PERG

    PERG{"Adicionar perguntas<br/>customizadas?"}
    PERG -- "sim" --> PERG_ADD["Adiciona ate 5 perguntas<br/>RN-025"]
    PERG -- "nao" --> PRAZOS
    PERG_ADD --> PRAZOS

    PRAZOS["Ajusta prazo de inscricao<br/>e de cancelamento"]
    PRAZOS --> ACAO{"Acao do<br/>organizador"}

    ACAO -- "Salvar rascunho" --> V_TIT{"Titulo<br/>preenchido?"}
    V_TIT -- "nao" --> ERR_TIT["Marca o campo titulo"]
    ERR_TIT --> FILL
    V_TIT -- "sim" --> DRAFT[/"Cria evento<br/>status = RASCUNHO"/]
    DRAFT --> DRAFT_END(["Visivel so ao organizador<br/>ninguem e notificado"])

    ACAO -- "Publicar evento" --> V_OBR{"Campos obrigatorios<br/>completos?"}
    V_OBR -- "nao" --> ERR_OBR["Marca cada campo faltante<br/>excecao E1"]
    ERR_OBR --> FILL

    V_OBR -- "sim" --> V_CAP{"Capacidade entre<br/>2 e 2000?"}
    V_CAP -- "nao" --> ERR_CAP["Informa a faixa permitida<br/>excecao E5"]
    ERR_CAP --> FILL

    V_CAP -- "sim" --> V_PRZ{"Prazos coerentes?<br/>RN-011"}
    V_PRZ -- "nao" --> ERR_PRZ["Informa qual desigualdade<br/>falhou - excecao E2"]
    ERR_PRZ --> PRAZOS

    V_PRZ -- "sim" --> V_FUT{"inicio esta<br/>no futuro?"}
    V_FUT -- "nao" --> ERR_FUT["Escolha uma data futura<br/>excecao E3"]
    ERR_FUT --> FILL

    V_FUT -- "sim" --> V_ANC{"Ancora pertence ao<br/>vinculo do organizador?"}
    V_ANC -- "nao" --> ERR_ANC["403 e registra tentativa<br/>excecao E4 - RNF-012"]
    ERR_ANC --> FIM_ERR(["Nada e criado"])

    V_ANC -- "sim" --> APROV{"alcance = FACULDADE<br/>e nao e admin?"}

    APROV -- "sim" --> CREATE_AP[/"Cria evento<br/>status = EM_APROVACAO"/]
    CREATE_AP --> NOTIF_AD["Notifica Admins de Faculdade"]
    NOTIF_AD --> WAIT(["Aguarda decisao<br/>UC-020"])
    WAIT --> DEC{"Admin decide"}
    DEC -- "aprova" --> PUB
    DEC -- "recusa" --> REJ["status = RASCUNHO<br/>com motivo da recusa"]
    REJ --> NOTIF_ORG["Notifica organizador"]
    NOTIF_ORG --> DRAFT_END

    APROV -- "nao" --> PUB

    PUB[/"Cria evento<br/>status = PUBLICADO<br/>ocupadas = 0"/]
    PUB --> NOT_ORG["Registra organizadorId<br/>organizador NAO e inscrito - RN-016"]
    NOT_ORG --> NOTIF_AL["Enfileira notificacao<br/>NOVO_EVENTO para o alcance"]
    NOTIF_AL --> IDX["Evento entra na lista e no feed<br/>de quem tem permissao - RN-001"]
    IDX --> FIM_OK(["Exibe detalhe do evento<br/>com confirmacao de sucesso"])
```

### O que o diagrama mostra e por que assim

**Três decisões do organizador, e apenas três.** Alcance, cobrança e perguntas. Tudo o
mais é validação. Isso é deliberado: o organizador de turma (persona Rafael) desiste se o
formulário parecer trabalho. As sugestões automáticas de prazo (`inicio - 2h` para
inscrição, `inicio - 24h` para cancelamento) existem para que os dois campos mais
esquecidos nunca fiquem em branco.

**O padrão é o menor alcance.** O formulário abre com `TURMA` selecionado. Errar para
menos gera um evento pouco divulgado; errar para mais expõe um churrasco de 40 pessoas à
faculdade inteira — que é literalmente o problema descrito em
[`../01-problema-e-personas.md`](../01-problema-e-personas.md). Padrão seguro é o que
falha para o lado barato.

**Validação em cascata, com retorno ao passo certo.** Cada exceção volta para o ponto
específico do formulário (`ERR_PRZ` → `PRAZOS`, não → `FILL`), preservando o resto do
preenchimento. Formulário longo que apaga tudo em um erro é a forma mais eficiente de
perder o organizador.

**A aprovação é um desvio, não uma etapa.** O ramo `APROV` só existe para
`alcance = FACULDADE` de aluno comum ([RN-003](../04-regras-de-negocio.md)). Admin de
Faculdade publica direto. Modelar a aprovação como etapa obrigatória de todo evento
adicionaria fricção em 90% dos casos para resolver um risco que existe em 10%.

**A recusa devolve ao rascunho, não descarta.** No ramo `DEC -- recusa`, o evento volta a
`RASCUNHO` com o motivo. O organizador ajusta e submete de novo, sem redigitar nada.

**Uma trilha só termina em evento visível: `PUB`.** Rascunho e recusa terminam em
`DRAFT_END` (só o organizador vê) e a violação de alcance em `FIM_ERR` (nada criado).
Nenhum caminho publica sem passar por todas as validações.

---

## 2. Fluxo de decisão da inscrição

Complemento menor, mas denso: é a decisão que o app toma **ao renderizar o botão
principal** do detalhe do evento. Todos os estados do botão saem daqui — e é por isso que
o botão nunca é só "Inscrever-se".

```mermaid
flowchart TD
    A(["Aluno abre o detalhe<br/>do evento"]) --> V{"Evento visivel<br/>pelo alcance?"}
    V -- "nao" --> R404(["404 sem revelar<br/>que o evento existe"])
    V -- "sim" --> ST{"status do<br/>evento"}

    ST -- "CANCELADO" --> BTN_CANC(["Sem acao<br/>exibe motivo do cancelamento"])
    ST -- "REALIZADO" --> BTN_REAL(["Sem acao<br/>exibe fotos do feed"])
    ST -- "PUBLICADO" --> P{"Aluno tem<br/>participacao ativa?"}

    P -- "sim" --> PST{"status da<br/>participacao"}
    PST -- "PENDENTE_PAGAMENTO" --> B1(["Pagar agora<br/>com contagem do prazo"])
    PST -- "CONFIRMADA" --> B2(["Ver meu ingresso<br/>e Cancelar inscricao"])
    PST -- "LISTA_ESPERA" --> B3(["Voce e o No da fila<br/>e Sair da lista"])
    PST -- "OFERTA_PENDENTE" --> B4(["Confirmar vaga<br/>com prazo da oferta"])
    PST -- "PRESENTE" --> B5(["Publicar foto<br/>no feed do evento"])

    P -- "nao" --> PRZ{"agora dentro do<br/>prazo de inscricao?"}
    PRZ -- "nao" --> B6(["Inscricoes encerradas<br/>botao desabilitado"])
    PRZ -- "sim" --> CAP{"vagasDisponiveis<br/>maior que zero?"}
    CAP -- "sim" --> PRECO{"Evento e<br/>gratuito?"}
    PRECO -- "sim" --> B7(["Quero participar<br/>confirma na hora"])
    PRECO -- "nao" --> B8(["Quero participar<br/>valor e politica visiveis"])
    CAP -- "nao" --> B9(["Entrar na lista de espera<br/>mostra tamanho da fila"])
```

Nove estados de botão, cada um com rótulo próprio. O ganho é direto: o aluno nunca toca
em um botão para descobrir que não podia. E o `B9` é o desvio de
[RN-006](../04-regras-de-negocio.md) — "lotado" não é erro, é outro caminho.

Este diagrama é a especificação da função `resolvePrimaryAction()` em
`app/src/domain/eventAction.ts`, e cada ramo tem um teste unitário correspondente.
