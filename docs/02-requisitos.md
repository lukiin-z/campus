# Requisitos

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Versão inicial: 43 RF em 10 módulos com critério de aceite `Dado/Quando/Então`, 22 RNF com métrica verificável, matriz de rastreabilidade RF → caso de uso → tela, 12 requisitos recusados (`RFX`) e 5 premissas |
| 1.1 | 2026-09-02 | CP5 | Acrescentada a seção [1.1 Status de implementação](#11-status-de-implementação-no-cp5) com o estado real dos 43 RF lido do código, e a seção [1.2 Requisitos corrigidos](#12-requisitos-corrigidos-pelo-que-a-implementação-mostrou). Coluna `CP` corrigida em 10 requisitos: RF-001, RF-006 e RF-012 saíram do CP5 (falta endpoint de escrita para cadastro, edição de perfil e publicação de rascunho) e RF-028, RF-029, RF-034, RF-035, RF-037, RF-038 e RF-040 entraram no CP5 (a API simulada já os atende). Critérios de aceite de RF-006 e RF-012 reescritos: os dois eram inverificáveis por falta de endpoint de escrita. RF-034 **não** foi reescrito — a conferência achou um defeito de ordem em `decideCheckIn`, e o **código** foi corrigido para atender ao requisito, que estava certo. RF-034 também ganhou as três formas de leitura na descrição. RNF ganharam a coluna **Valor medido**, com as medições de 2026-09-02; o que não foi medido está marcado como tal. O "como medir" de RNF-003 e RNF-018 ficou desatualizado ao falar de "8 telas": o CP5 tem 12 rotas, e a ressalva está anotada nas duas linhas |

Especificação de requisitos do **Campus**. Base para os diagramas em
[`05-modelagem/`](05-modelagem/README.md), para os cards do Trello em
[`09-trello/quadro.md`](09-trello/quadro.md) e para os testes em
[`11-plano-de-testes.md`](11-plano-de-testes.md).

**Responsável:** Lucas Zolla (Analista de Requisitos) · **Aprovação:** João Viviani
Baldini (PO) · **Revisão técnica:** Lucas Baraldi

## Como ler este documento

| Campo | Significado |
|---|---|
| **ID** | `RF-0xx` funcional, `RNF-0xx` não funcional. Imutável — requisito descontinuado é marcado, nunca renumerado |
| **Prioridade** | MoSCoW: **M**ust (sem isso não há produto), **S**hould (importante, contornável), **C**ould (desejável), **W**on't (fora da v1) |
| **Ator** | Quem dispara. `Sistema` = automático, sem ação humana |
| **Critério de aceite** | Formato `Dado / Quando / Então`. É o que o QA verifica — não a intenção, o texto |
| **CP** | Checkpoint em que o requisito é entregue: 4 (documentação/base), 5 (protótipo funcional), 6 (persistência real) |

Atores: **Aluno** (qualquer usuário autenticado com vínculo), **Organizador** (Aluno que
criou o evento — é papel, não tipo), **Admin de Curso**, **Admin de Faculdade**,
**Gateway de Pagamento** (ator externo), **Sistema**.

---

## 1. Requisitos Funcionais

### Módulo A — Autenticação e Onboarding

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-001 | Cadastrar-se com e-mail institucional | O usuário cria conta informando nome, e-mail institucional e senha. O e-mail é a identidade única da conta. | Must | Aluno | **Dado** que informo nome, e-mail `@fiap.com.br` e senha válida, **Quando** submeto o cadastro, **Então** a conta é criada em estado `pendente_verificacao` e recebo e-mail com link de confirmação. | 6 |
| RF-002 | Verificar domínio institucional | O sistema aceita cadastro apenas de domínios de e-mail previamente cadastrados como pertencentes à faculdade. | Must | Sistema | **Dado** que informo um e-mail de domínio não cadastrado (ex: `@gmail.com`), **Quando** submeto o cadastro, **Então** recebo a mensagem "use seu e-mail institucional" e a conta não é criada. | 5 |
| RF-003 | Autenticar e manter sessão | Login por e-mail e senha, com sessão persistida no dispositivo até logout ou expiração. | Must | Aluno | **Dado** que já verifiquei minha conta, **Quando** faço login com credenciais corretas, **Então** entro no feed e permaneço autenticado ao reabrir o app. | 5 |
| RF-004 | Recuperar acesso | Redefinição de senha por link de uso único enviado ao e-mail institucional. | Should | Aluno | **Dado** que solicitei recuperação, **Quando** abro o link recebido dentro da validade, **Então** consigo definir nova senha e o link deixa de funcionar. | 6 |
| RF-005 | Concluir onboarding de vínculo acadêmico | Após verificar a conta, o usuário escolhe faculdade e curso e entra em uma turma informando o código de convite. | Must | Aluno | **Dado** que estou no onboarding, **Quando** seleciono faculdade e curso e informo um código de turma válido, **Então** meu perfil passa a ter turma vinculada e o feed já mostra eventos dos três níveis de alcance. | 5 |

### Módulo B — Perfil e Turmas

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-006 | Visualizar e editar o próprio perfil | Nome de exibição, foto, curso, turma, e estatísticas (eventos criados, participando, publicações). | Must | Aluno | **Leitura (CP5):** **Dado** que estou em `/perfil`, **Quando** a tela carrega, **Então** vejo meu nome, avatar, curso, turma e as estatísticas de eventos criados e participando. **Escrita (CP6):** **Dado** que altero meu nome de exibição e salvo, **Então** o novo nome aparece no perfil e nas minhas publicações do feed. | 6 |
| RF-007 | Consultar as próprias participações por estado | Abas "Participando", "Criados" e "Anteriores", com o estado de cada participação visível. | Must | Aluno | **Dado** que tenho uma participação confirmada e uma em lista de espera, **Quando** abro a aba "Participando", **Então** vejo as duas com os rótulos "confirmado" e "lista de espera". | 5 |
| RF-008 | Trocar de turma | Registrar mudança de turma ao virar o período, informando o novo código, preservando o histórico de participações. | Should | Aluno | **Dado** que estou vinculado à turma 2ESPA, **Quando** informo o código válido da turma 3ESPX, **Então** minha turma atual passa a ser 3ESPX e meus eventos anteriores continuam no histórico. | 6 |
| RF-009 | Configurar privacidade e notificações | Escolher se aparece na lista pública de confirmados e quais notificações deseja receber. | Should | Aluno | **Dado** que desativei "aparecer entre os confirmados", **Quando** um colega abre um evento em que estou inscrito, **Então** meu avatar não aparece na lista de confirmados. | 6 |

### Módulo C — Eventos

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-010 | Criar evento | Formulário com título, descrição, data/hora de início e fim, local, capacidade, preço, alcance e prazos. | Must | Organizador | **Dado** que preenchi todos os campos obrigatórios com dados válidos, **Quando** toco em "Publicar evento", **Então** o evento é criado com status `publicado` e eu sou registrado como organizador. | 5 |
| RF-011 | Definir alcance do evento | O organizador escolhe entre `TURMA`, `CURSO` e `FACULDADE`; o alcance determina quem vê o evento. | Must | Organizador | **Dado** que criei um evento com alcance `TURMA` na turma 3ESPX, **Quando** um aluno de outra turma abre a lista de eventos, **Então** esse evento não aparece para ele — nem por link direto. | 5 |
| RF-012 | Salvar rascunho e publicar depois | Evento pode ser salvo incompleto como `rascunho`, visível apenas ao organizador, e publicado depois. | Should | Organizador | **Rascunho (CP5):** **Dado** que salvei um evento como rascunho, **Quando** outro aluno do mesmo alcance abre a lista de eventos, **Então** o rascunho não aparece; **e Quando** eu abro a lista, **Então** vejo o meu próprio rascunho. **Publicar depois (CP6):** **Quando** eu publico o rascunho, **Então** ele passa a aparecer para todo o alcance. | 6 |
| RF-013 | Editar evento publicado | Alterar dados do evento; mudanças sensíveis (data, local, preço) notificam os inscritos. | Must | Organizador | **Dado** que meu evento tem 18 inscritos, **Quando** altero a data, **Então** os 18 inscritos recebem notificação de alteração com o valor antigo e o novo. | 6 |
| RF-014 | Cancelar evento | O organizador cancela o evento com motivo obrigatório; participações são canceladas e pagamentos entram em reembolso. | Must | Organizador | **Dado** que meu evento pago tem 12 pagamentos confirmados, **Quando** cancelo com motivo, **Então** as 12 participações ficam `CANCELADA`, os pagamentos vão para `REEMBOLSO_SOLICITADO` e todos são notificados. | 6 |
| RF-015 | Listar eventos visíveis com filtros | Lista ordenada por data, filtrável por alcance (minha turma / meu curso / faculdade), preço (gratuito) e período. | Must | Aluno | **Dado** que estou em `/eventos`, **Quando** aplico o filtro "Minha turma", **Então** vejo apenas eventos de alcance `TURMA` da minha turma, ordenados pela data mais próxima. | 5 |
| RF-016 | Ver detalhe do evento | Capa, alcance, organizador, data, local, preço, descrição, barra de ocupação de vagas, prazo de inscrição e ação principal contextual. | Must | Aluno | **Dado** que abro o churrasco da 3ESPX com 18 de 40 vagas, **Quando** a tela carrega, **Então** vejo "18/40 vagas" e a barra preenchida proporcionalmente, e o botão diz "Quero participar · R$ 25,00". | 5 |
| RF-017 | Adicionar perguntas customizadas | O organizador define até 5 perguntas (texto curto ou escolha única) respondidas no momento da inscrição. | Could | Organizador | **Dado** que adicionei a pergunta "Vai levar acompanhante?", **Quando** um aluno se inscreve, **Então** a pergunta é exibida após a reserva da vaga e a resposta fica visível ao organizador. | 6 |
| RF-018 | Duplicar evento | Criar um novo evento a partir de um existente, copiando tudo menos data e inscritos. | Could | Organizador | **Dado** que organizei um churrasco no semestre passado, **Quando** escolho "duplicar", **Então** abre o formulário preenchido, sem data e sem participantes. | 6 |

### Módulo D — Inscrição e Vagas

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-019 | Inscrever-se em evento | Cria uma `Participacao` reservando uma vaga. Em evento gratuito nasce `CONFIRMADA`; em evento pago nasce `PENDENTE_PAGAMENTO`. | Must | Aluno | **Dado** que um evento gratuito tem vaga, **Quando** toco em "Quero participar", **Então** minha participação fica `CONFIRMADA` e o contador de vagas aumenta em 1. | 5 |
| RF-020 | Controlar capacidade sem estouro | O sistema garante que o número de participações que ocupam vaga nunca excede a capacidade, mesmo com inscrições simultâneas. | Must | Sistema | **Dado** que restam 1 vaga e dois alunos tocam em "Quero participar" ao mesmo tempo, **Quando** ambas as requisições são processadas, **Então** exatamente uma é confirmada e a outra recebe a oferta de lista de espera. | 5 |
| RF-021 | Cancelar a própria inscrição | O aluno cancela até o prazo de cancelamento; a vaga é liberada e a fila é acionada. | Must | Aluno | **Dado** que estou confirmado em um evento lotado com fila, **Quando** cancelo minha inscrição dentro do prazo, **Então** minha participação fica `CANCELADA` e o primeiro da fila recebe oferta da vaga. | 5 |
| RF-022 | Impedir inscrição duplicada | Um aluno tem no máximo uma participação ativa por evento. | Must | Sistema | **Dado** que já estou inscrito em um evento, **Quando** tento me inscrever de novo, **Então** a ação é recusada e a tela mostra meu estado atual em vez do botão de inscrição. | 5 |
| RF-023 | Encerrar inscrições por prazo | Após o prazo de inscrição, nenhuma nova participação é aceita. | Must | Sistema | **Dado** que o prazo de inscrição de um evento passou, **Quando** abro o detalhe, **Então** o botão principal está desabilitado com o texto "Inscrições encerradas". | 5 |

### Módulo E — Lista de Espera

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-024 | Entrar na lista de espera | Com o evento lotado, o aluno entra na fila e recebe uma posição. | Must | Aluno | **Dado** que o evento está com 80/80 vagas, **Quando** toco em "Entrar na lista de espera", **Então** minha participação fica `LISTA_ESPERA` com posição igual ao fim da fila, e a tela mostra "você é o 8º da fila". | 5 |
| RF-025 | Promover da lista de espera em ordem FIFO | Quando uma vaga é liberada, o primeiro da fila recebe uma oferta com janela de confirmação. | Must | Sistema | **Dado** que a fila tem 3 pessoas e uma vaga é liberada, **Quando** o sistema processa a liberação, **Então** apenas a 1ª pessoa recebe a oferta com prazo, e as posições das outras avançam de 3 para 2 e de 2 para 1. | 5 |
| RF-026 | Expirar oferta e passar para o próximo | Oferta não confirmada dentro da janela expira e a vaga vai ao próximo da fila. | Must | Sistema | **Dado** que recebi uma oferta com janela de 24h e não confirmei, **Quando** a janela expira, **Então** minha participação fica `EXPIRADA` e o próximo da fila recebe a oferta. | 6 |
| RF-027 | Sair da lista de espera | O aluno abandona a fila; as posições seguintes avançam. | Should | Aluno | **Dado** que sou o 2º de uma fila de 5, **Quando** saio da lista, **Então** quem era 3º passa a ser 2º e minha participação fica `CANCELADA`. | 5 |

### Módulo F — Pagamentos

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-028 | Iniciar pagamento da inscrição | Para evento pago, o aluno escolhe Pix ou cartão e o sistema cria uma cobrança no gateway. | Must | Aluno | **Dado** que minha participação está `PENDENTE_PAGAMENTO` em evento de R$ 25, **Quando** escolho Pix, **Então** recebo o código copia-e-cola e o QR na tela, e o pagamento fica `AGUARDANDO`. | 5 |
| RF-029 | Confirmar pagamento por notificação do gateway | O gateway notifica a confirmação; o sistema confirma a participação sem ação do usuário. | Must | Gateway de Pagamento | **Dado** que paguei o Pix, **Quando** o gateway envia a confirmação, **Então** meu pagamento fica `CONFIRMADO`, minha participação fica `CONFIRMADA` e recebo notificação. | 5 |
| RF-030 | Expirar reserva por falta de pagamento | Participação `PENDENTE_PAGAMENTO` que não é paga dentro da janela é cancelada e libera a vaga. | Must | Sistema | **Dado** que reservei uma vaga e não paguei dentro da janela de pagamento, **Quando** a janela expira, **Então** minha participação fica `EXPIRADA`, a vaga é liberada e a fila é acionada. | 6 |
| RF-031 | Solicitar e processar reembolso | Cancelamento dentro do prazo com pagamento confirmado gera reembolso conforme a política. | Should | Aluno | **Dado** que paguei R$ 25 e cancelo com 8 dias de antecedência, **Quando** confirmo o cancelamento, **Então** o pagamento fica `REEMBOLSO_SOLICITADO` com valor integral e vejo o prazo estimado de devolução. | 6 |
| RF-032 | Acompanhar recebimentos do evento | O organizador vê total arrecadado, pagos, pendentes e reembolsados do seu evento. | Should | Organizador | **Dado** que meu evento tem 18 inscritos e 15 pagos, **Quando** abro o painel do organizador, **Então** vejo "15 pagos · 3 pendentes" e o valor total confirmado. | 6 |

### Módulo G — Check-in

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-033 | Gerar ingresso com QR Code | Participação confirmada gera um ingresso com QR Code contendo token assinado e de uso único. | Must | Sistema | **Dado** que minha participação está `CONFIRMADA`, **Quando** abro `/ingresso/:id`, **Então** vejo o cartão-ingresso com QR Code, meu nome, o evento e o código de validação. | 5 |
| RF-034 | Validar check-in por leitura de QR | O organizador lê o QR e o sistema registra a presença, recusando QR inválido, de outro evento, fora da janela, sem permissão, de participação não confirmada ou já utilizado. A leitura aceita três formas do mesmo ingresso: token do QR, código numérico de 8 dígitos e código legível impresso. | Must | Organizador | **Dado** que um QR já foi usado no check-in, **Quando** leio o mesmo QR de novo, **Então** o sistema recusa com `JA_UTILIZADO` e a mensagem "ingresso já utilizado às 20h14" — com o horário do primeiro check-in — e **não** cria segunda presença. | 5 |
| RF-035 | Consultar lista de presença | O organizador vê inscritos, presentes e ausentes, com percentual de comparecimento. | Should | Organizador | **Dado** que 271 de 300 inscritos fizeram check-in, **Quando** abro a lista de presença, **Então** vejo "271 presentes · 29 ausentes · 90% de comparecimento". | 5 |

### Módulo H — Feed Social

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-036 | Ver feed segmentado por alcance | O feed mostra publicações de eventos que o aluno tem permissão de ver, mais recentes primeiro. | Must | Aluno | **Dado** que existe uma publicação em um evento de turma da qual não faço parte, **Quando** abro o feed, **Então** essa publicação não aparece. | 5 |
| RF-037 | Publicar foto em evento | Participante com presença registrada publica foto com legenda no evento. | Must | Aluno | **Dado** que fiz check-in em um evento, **Quando** publico foto com legenda, **Então** a publicação aparece no feed de quem enxerga aquele evento, com meu nome e horário. | 5 |
| RF-038 | Comentar publicação | Comentário em texto, com autor e horário, na publicação do feed. | Could | Aluno | **Dado** que existe uma publicação visível para mim, **Quando** envio um comentário, **Então** ele aparece abaixo da publicação com meu nome e o horário. | 5 |

### Módulo I — Notificações

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-039 | Notificar eventos relevantes | O sistema notifica: novo evento no meu alcance, vaga liberada, pagamento confirmado, alteração e cancelamento de evento, check-in realizado. | Must | Sistema | **Dado** que sou o 1º da fila de um evento, **Quando** uma vaga é liberada, **Então** recebo notificação com o prazo para confirmar. | 6 |
| RF-040 | Central de notificações | Lista de notificações com estado lida/não lida e link para o objeto referenciado. | Should | Aluno | **Dado** que tenho 3 notificações não lidas, **Quando** abro a central e toco em uma, **Então** ela é marcada como lida e o app navega para o evento correspondente. | 5 |

### Módulo J — Administração

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-041 | Aprovar evento de alcance faculdade | Evento com alcance `FACULDADE` só é publicado após aprovação de Admin de Faculdade. | Should | Admin de Faculdade | **Dado** que um aluno submeteu evento de alcance `FACULDADE`, **Quando** o admin aprova, **Então** o evento passa de `EM_APROVACAO` para `PUBLICADO` e o organizador é notificado. | 6 |
| RF-042 | Moderar publicações do feed | Organizador do evento, Admin de Curso e Admin de Faculdade podem remover publicação ou comentário, com motivo registrado. | Should | Organizador / Admin | **Dado** que uma publicação foi denunciada, **Quando** o organizador do evento a remove informando o motivo, **Então** ela deixa de aparecer no feed e a ação fica registrada com autor e horário. | 6 |
| RF-043 | Gerenciar turmas do curso | Admin de Curso cria turmas, gera e revoga códigos de convite. | Could | Admin de Curso | **Dado** que sou admin do curso de Engenharia de Computação, **Quando** crio a turma 1ESPA e gero o código, **Então** o código passa a permitir vínculo e pode ser revogado depois. | 6 |

**Total: 43 requisitos funcionais** — 28 `Must`, 11 `Should`, 4 `Could`.

---

## 1.1 Status de implementação no CP5

Levantado em **2026-09-02** lendo o código, não o planejamento. A coluna "evidência" cita
o arquivo que sustenta a afirmação: quem corrige pode abrir e conferir.

**Sobre a data.** Este levantamento foi feito enquanto as telas do CP5 eram construídas em
paralelo, e foi refeito ao final do dia, com as **12 telas escritas, 293 testes de unidade
e integração passando e o E2E do Playwright executado pela primeira vez** (6 casos, 6 verdes).
Os números abaixo são do **estado final** medido. Para reconferir a qualquer momento:
`cd app && npm run test:coverage && npm run check:size`.

### O que cada status significa

| Status | Significado exato |
|---|---|
| `implementado` | Existe rota em [`App.tsx`](../app/src/App.tsx), tela em `app/src/pages/`, hook em `app/src/hooks/`, endpoint na API simulada e regra em `app/src/domain/` — e o fluxo roda contra o mock. A única coisa que falta é persistência real, que é o que define o CP5 inteiro ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)) |
| `mockado` | **Funcional com dados simulados** — não "fingido". Tudo de `implementado`, **mais** uma dependência de **ator externo simulado**, declarada em ADR: o gateway de pagamento ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)) e a assinatura do token, que no CP5 é calculada no cliente ([ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md)). A regra, os códigos de status e as formas de erro são os que a API real vai devolver; o que é simulado é o **terceiro**, não o comportamento |
| `parcial` | Uma parte do requisito responde no CP5 e outra depende de endpoint que ainda não existe. A parte que falta está nomeada na evidência |
| `adiado` | Sem endpoint e sem consumidor no CP5. A coluna "CP alvo" diz para quando |

> **Por que existe um quarto status.** O CP5 planejava três (`implementado`, `mockado`,
> `adiado`). Três requisitos — RF-006, RF-012 e RF-039 — têm metade do comportamento
> respondendo e metade sem endpoint. Classificá-los como `implementado` seria afirmar o
> que não se sustenta; como `adiado`, apagaria trabalho entregue. `parcial` é o rótulo
> honesto, e a existência dele é justamente o tipo de coisa que documentação viva registra.

### Módulo A — Autenticação e Onboarding

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-001 | `adiado` | 6 | **Não existe endpoint de cadastro.** Nenhum `POST /auth/cadastro` em [`handlersCp5.ts`](../app/src/mocks/handlersCp5.ts), nenhum método de criação de conta em [`AuthRepository`](../app/src/services/index.ts) e nenhuma aba de cadastro em `LoginPage.tsx`. As primitivas de validação existem (`emailBemFormado`, `senhaAceitavel`, `SENHA_MINIMA` em `domain/auth.ts`), mas nada as chama para criar conta: a demo entra com os usuários do seed e a senha fixa `SENHA_DEMO` |
| RF-002 | `implementado` | 5 | `GET /faculdade` devolve `dominiosEmail`; `domain/auth.ts#dominioInstitucional` recusa domínio de fora, e `decideLogin` devolve `422 DOMINIO_NAO_INSTITUCIONAL` — status diferente do `401` de credencial, porque "esta conta nunca vai servir" e "tente de novo" não são a mesma resposta |
| RF-003 | `implementado` | 5 | `POST /auth/login` → `domain/auth.ts#decideLogin`; token em `services/http#definirToken`; sessão na store `store/session.ts`; guarda de rota `ExigeSessao` em `App.tsx` com os três estados (sem token, em voo, resolvida); `hooks/useAuth.ts#useEntrar` |
| RF-004 | `adiado` | 6 | Nenhum endpoint de recuperação de senha. Já estava planejado para o CP6 |
| RF-005 | `implementado` | 5 | `POST /auth/onboarding` → `domain/auth.ts#decideOnboarding` (código de convite como prova de vínculo); `GET /cursos` e `GET /cursos/:id/turmas`; `useConcluirOnboarding`; `domain/auth.ts#onboardingPendente` é o que a guarda de rota usa para forçar `/onboarding` |

### Módulo B — Perfil e Turmas

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-006 | `parcial` | 6 | **Leitura responde, escrita não existe.** `GET /sessao` devolve usuário, faculdade, curso e turma, e `PerfilPage.tsx` exibe nome, avatar, vínculo e estatísticas. Não há `PATCH /perfil` nem método de escrita em `AuthRepository` — logo, "altero meu nome e salvo" era inverificável (ver [1.2](#12-requisitos-corrigidos-pelo-que-a-implementação-mostrou)) |
| RF-007 | `implementado` | 5 | `GET /participacoes` → `toParticipacaoView`; abas em `PerfilPage.tsx`; `useMinhasParticipacoes`; rótulo em português por estado em `domain/participation.ts#STATUS_PARTICIPACAO_ROTULO`, com teste em `TicketCard.test.tsx` ("StatusBadge não expõe o nome do enum") |
| RF-008 | `adiado` | 6 | Nenhum endpoint de troca de turma |
| RF-009 | `adiado` | 6 | O campo `visivelEntreConfirmados` **existe** em `types/domain.ts#Usuario` e é preenchido pelo seed, mas nenhum código o lê ou escreve: não há endpoint de preferências nem lista pública de confirmados que o respeite. Modelo pronto, comportamento ausente |

### Módulo C — Eventos

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-010 | `implementado` | 5 | `POST /eventos` em [`handlers.ts`](../app/src/mocks/handlers.ts); `CriarEventoPage.tsx` com `domain/eventSchema.ts#eventFormSchema`, que **chama** `validateDeadlines` em vez de reimplementar RN-011; `useCriarEvento` |
| RF-011 | `implementado` | 5 | A âncora do evento vem do vínculo do organizador, **nunca do corpo da requisição** (`POST /eventos`, com recusa `422 ALCANCE_FORA_DO_VINCULO`); `domain/visibility.ts#canSee`; 25 testes em `visibility.test.ts` |
| RF-012 | `parcial` | 6 | **Salvar responde, publicar depois não.** `POST /eventos` com `publicar: false` cria o evento em `RASCUNHO`, e `canSee` mostra rascunho só ao organizador (`visibility.test.ts`: "rascunho de outra pessoa não aparece para ninguém"). Não existe endpoint que mude o status de `RASCUNHO` para `PUBLICADO` |
| RF-013 | `adiado` | 6 | Nenhum `PATCH /eventos/:id`. As regras de edição existem e são testadas sem consumidor: `domain/visibility.ts#canChangeScope` (RN-002) e `domain/capacity.ts#canChangeCapacity` (RN-005) |
| RF-014 | `adiado` | 6 | Nenhum endpoint de cancelamento de evento. O **estado** `CANCELADO` já é exercitado pelo seed e tratado na inscrição (`inscricao.test.ts` CT-027) e no botão principal (`eventAction.test.ts` CT-027) |
| RF-015 | `implementado` | 5 | `GET /eventos?alcance&preco&periodo&busca` → `mocks/support.ts#aplicarFiltros`; `EventosPage.tsx`; `useEventos`; testes de filtro "minha turma" e "gratuitos" em `inscricao.test.ts` |
| RF-016 | `implementado` | 5 | `GET /eventos/:id`; `EventoDetalhePage.tsx` com `domain/eventAction.ts#resolvePrimaryAction`; `ProgressBar` expõe vagas em texto e em `aria` (`TicketCard.test.tsx`) |
| RF-017 | `adiado` | 6 | Só o parâmetro `POLICY.MAX_CUSTOM_QUESTIONS` existe. Não há módulo de perguntas customizadas nem endpoint de respostas |
| RF-018 | `adiado` | 6 | Nenhum endpoint de duplicação |

### Módulo D — Inscrição e Vagas

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-019 | `implementado` | 5 | `POST /eventos/:id/participacoes`, toda a verificação dentro de `transaction`; gratuito nasce `CONFIRMADA`, pago nasce `PENDENTE_PAGAMENTO`; `useInscrever`; `inscricao.test.ts` CT-002 |
| RF-020 | `implementado` | 5 | `domain/capacity.ts#isFull` dentro da seção crítica de `mocks/db.ts#transaction`. **Teste de concorrência:** `inscricao.test.ts` CT-020 — 50 inscrições paralelas na última vaga confirmam exatamente uma |
| RF-021 | `implementado` | 5 | `DELETE /participacoes/:id`: libera a vaga, recalcula a fila e promove o primeiro **na mesma transação**; `useCancelarParticipacao`; `inscricao.test.ts` CT-004 |
| RF-022 | `implementado` | 5 | `domain/participation.ts#findActiveParticipation` + resposta `409 JA_INSCRITO`; `inscricao.test.ts` CT-018 (duas provas: segunda tentativa e usuário já no seed) |
| RF-023 | `implementado` | 5 | `domain/deadlines.ts#enrollmentOpen` + `422 PRAZO_ENCERRADO`, e o botão desabilitado com a data em `resolvePrimaryAction`; `eventAction.test.ts` CT-015 |

### Módulo E — Lista de Espera

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-024 | `implementado` | 5 | `POST /eventos/:id/lista-espera` → `domain/waitlist.ts#nextWaitlistPosition`; a fila **não** ocupa vaga (`inscricao.test.ts`: "entrar na lista de espera não muda o contador"); `useEntrarNaListaEspera` |
| RF-025 | `implementado` | 5 | `domain/waitlist.ts#planPromotion` + `recomputePositions` dentro do `DELETE`, com notificação `VAGA_LIBERADA`; `POST /participacoes/:id/confirmar` + `useConfirmarOferta`; `inscricao.test.ts` CT-004 e CT-005 |
| RF-026 | `adiado` | 6 | `domain/waitlist.ts#offerExpired` existe e é testado (CT-006), mas **não é chamado por nenhum handler**: nenhum caminho de código escreve o estado `EXPIRADA`. Expirar oferta exige rotina de tempo, que é do CP6. O endpoint de confirmação já recusa oferta vencida (`OFERTA_EXPIRADA`) — só não passa a vez ao próximo |
| RF-027 | `implementado` | 5 | O mesmo `DELETE /participacoes/:id` atende quem está em `LISTA_ESPERA` (via `isActive`) e faz as posições seguintes avançarem com `recomputePositions`; `waitlist.test.ts` CT-005 |

### Módulo F — Pagamentos

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-028 | `mockado` | 5 | **Entrou no CP5.** `POST /participacoes/:id/pagamento` — idempotente por participação, com o payload Pix derivado por `domain/pix.ts#gerarCobrancaPix` (BR Code com CRC-16 conferido contra o valor de referência do padrão EMV em `pix.test.ts`) e a janela recontada na abertura da cobrança; `PagamentoPage.tsx` com `usePagamento` e `useIniciarPagamento`. `mockado` porque o gateway é simulado ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)) |
| RF-029 | `mockado` | 5 | **Entrou no CP5.** `POST /pagamentos/:id/simular` → `domain/payment.ts#planWebhook`, que decide `CONFIRMAR`, `IGNORAR_DUPLICADA`, `DIVERGENCIA_DE_VALOR` ou `ESTORNAR`. 7 testes em `payment.test.ts` (CT-010), incluindo a mesma notificação repetida não produzindo segunda confirmação. A tela dispara o desfecho por `useSimularDesfecho` — no CP6 quem chama é o gateway, e é por isso que o método é nomeado como simulação |
| RF-030 | `adiado` | 6 | A janela é calculada (`paymentDeadline`) e exibida (`minutesLeftToPay`), e pagamento que chega depois dela é estornado por `planWebhook`. Mas `domain/payment.ts#paymentExpired` **não é chamado fora dos testes** e nenhum caminho escreve `EXPIRADA`: liberar a vaga por expiração exige rotina de tempo, do CP6 |
| RF-031 | `adiado` | 6 | `domain/refund.ts#computeRefund` está implementado e coberto por 11 testes (CT-008, CT-009), e `policySummary` já é exibido em `EventoDetalhePage.tsx` **antes** da cobrança. Falta o endpoint que registre `REEMBOLSO_SOLICITADO` |
| RF-032 | `adiado` | 6 | Nenhum endpoint de painel financeiro do organizador |

### Módulo G — Check-in

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-033 | `mockado` | 5 | `GET /participacoes/:id/token` → `domain/ticketToken.ts#emitirToken`, com base64url escrito à mão para não quebrar em acento (testado: "sobrevive a acento e caractere fora de Latin-1"); `IngressoPage.tsx` com `QrCode.tsx`, código numérico de 8 dígitos e código legível (`CMP-3ESPX-0184`); `useTokenIngresso`. Só o dono da participação obtém o seu (`404` para os outros). `mockado` porque a assinatura é calculada **no cliente** no CP5, e [ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md) declara explicitamente que ela não é controle de segurança — a **forma** do token é a final, a proteção é do CP6 |
| RF-034 | `mockado` | 5 | **Entrou no CP5.** `POST /eventos/:id/checkin` → `domain/checkin.ts#decideCheckIn`, que verifica 7 condições em ordem e devolve **motivo específico** em cada recusa; `domain/ticketToken.ts#classificarLeitura` aceita as três formas de leitura (testadas em `ticketToken.test.ts`); `canValidateCheckIn` barra quem não é organizador; `CheckinPage.tsx` com `useValidarCheckin`. `mockado` pelo mesmo motivo de RF-033 |
| RF-035 | `implementado` | 5 | **Entrou no CP5.** `GET /eventos/:id/checkin` devolve `PainelCheckin` com `confirmados`, `presentes`, a janela (`abertoAgora`, `abreEm`, `fechaEm`) e a lista de presenças ordenada da mais recente; `CheckinPage.tsx` com `usePainelCheckin` |

### Módulo H — Feed Social

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-036 | `implementado` | 5 | `GET /feed` filtra por `eventosVisiveis` — publicação de evento fora do alcance não aparece; `FeedPage.tsx`; `useFeed`; `PostCard.tsx` |
| RF-037 | `implementado` | 5 | **Entrou no CP5.** `POST /publicacoes` valida legenda (2 a 500 caracteres), exige alcance visível e participação, e recusa com `403 SEM_PARTICIPACAO`; `GET /feed/eventos-publicaveis` lista onde a pessoa pode publicar; `features/feed/Composer.tsx` com `usePublicar` e `useEventosPublicaveis`, montado por `FeedPage.tsx`, que aceita `/?evento=<id>` de quem tocou em "Publicar foto" no detalhe. ⚠️ **Mas o critério aplicado divergiu de RN-019** — ver a [contradição](04-regras-de-negocio.md#contradição-encontrada-no-cp5--três-regras-para-a-mesma-coisa): o endpoint aceita qualquer participação ativa, inclusive `LISTA_ESPERA` |
| RF-038 | `implementado` | 5 | **Entrou no CP5.** `POST /publicacoes/:id/comentarios` valida texto (2 a 280 caracteres) e devolve `404` — não `403` — para publicação de evento invisível, para não revelar que ela existe; `features/feed/PublicacaoCard.tsx` com `useComentar` |

### Módulo I — Notificações

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-039 | `parcial` | 6 | **2 dos 6 gatilhos emitem notificação no CP5:** `VAGA_LIBERADA`, criada no `DELETE /participacoes/:id`, e `PAGAMENTO_CONFIRMADO`, criada em `POST /pagamentos/:id/simular`. Os outros quatro (novo evento no alcance, alteração e cancelamento de evento, check-in realizado) dependem de endpoints que não existem no CP5. `types/domain.ts#TIPO_NOTIFICACAO` declara os 8 tipos e o seed traz `NOVO_EVENTO` e `EVENTO_CANCELADO` como dado pré-existente, não emitido por código |
| RF-040 | `implementado` | 5 | **Entrou no CP5.** `GET /notificacoes` (ordenada, só do destinatário), `POST /notificacoes/:id/lida` e `POST /notificacoes/lidas`; `NotificacoesPage.tsx` com `useNotificacoes`, `useMarcarNotificacaoLida` e `useMarcarTodasLidas` |

### Módulo J — Administração

| RF | Status no CP5 | CP alvo | Evidência verificada |
|---|---|---|---|
| RF-041 | `adiado` | 6 | O **estado** já funciona: `domain/permissions.ts#requiresApproval` é chamado no `POST /eventos` e faz o evento de alcance `FACULDADE` nascer em `EM_APROVACAO`, e `canSee` só o mostra a Admin de Faculdade (`visibility.test.ts` CT-014). Falta a **ação**: `canApproveCollegeEvent` existe sem consumidor e não há endpoint de aprovação |
| RF-042 | `adiado` | 6 | Os campos `removida`, `motivoRemocao` e `removidaPorId` existem e o feed já filtra conteúdo removido, e `domain/permissions.ts#canRemovePost` está implementado — sem consumidor. Falta o endpoint de moderação |
| RF-043 | `adiado` | 6 | Nenhum endpoint de gestão de turmas ou de códigos de convite |

### Quadro-resumo dos 43 RF

| Status no CP5 | Qtd. | % dos 43 | Quais |
|---|---|---|---|
| `implementado` | 21 | 48,8% | RF-002, RF-003, RF-005, RF-007, RF-010, RF-011, RF-015, RF-016, RF-019, RF-020, RF-021, RF-022, RF-023, RF-024, RF-025, RF-027, RF-035, RF-036, RF-037, RF-038, RF-040 |
| `mockado` | 4 | 9,3% | RF-028, RF-029 (gateway simulado, ADR-0006) · RF-033, RF-034 (assinatura no cliente, ADR-0007) |
| `parcial` | 3 | 7,0% | RF-006, RF-012, RF-039 |
| `adiado` | 15 | 34,9% | RF-001, RF-004, RF-008, RF-009, RF-013, RF-014, RF-017, RF-018, RF-026, RF-030, RF-031, RF-032, RF-041, RF-042, RF-043 |
| **Total** | **43** | **100%** | 21 + 4 + 3 + 15 = 43 |

**Leitura honesta do quadro.** 25 requisitos (58,1%) respondem por completo no CP5 e 3
respondem em parte — **28 requisitos com comportamento funcionando**, contra os 21
planejados. O CP5 não entregou os 21 planejados e mais 7: ele **trocou** parte do plano.
Entraram sete requisitos que estavam no CP6 (pagamento, check-in, escrita no feed e
central de notificações), e saíram três que estavam no CP5 (RF-001 inteiro, e a metade de
escrita de RF-006 e RF-012). A razão é a mesma nos três casos: **falta endpoint de
escrita**, e a lane que construiu a API simulada priorizou os fluxos que a demonstração
precisa mostrar ao vivo. Ver [`03-escopo.md`](03-escopo.md#8-marcos-cp4--cp5--cp6).

**O que "mockado" não significa.** Nenhum dos 4 requisitos `mockado` é maquete de tela.
Os 4 têm tela, hook e endpoint que aplicam a mesma função de domínio que a API real vai
aplicar no CP6, devolvem os mesmos códigos de status e as mesmas formas de erro do contrato
de [`08-arquitetura.md`](08-arquitetura.md), e a troca do mock pela API real muda apenas a
implementação dos repositórios ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md),
RNF-016). O que é simulado neles é o **ator externo** — o gateway que confirma o pagamento
e o servidor que assinaria o token — e cada simulação tem ADR declarando o que ela não é.

**Todas as 12 telas do CP5 estão escritas.** Nenhum arquivo em `app/src/pages/` é esqueleto:
as 12 rotas de [`App.tsx`](../app/src/App.tsx) apontam para telas de 24 a 491 linhas, todas
consumindo os hooks da camada de dados. Isso vale para a classificação acima — nenhum
`implementado` deste quadro depende de tela que ainda não existe.

---

## 1.2 Requisitos corrigidos pelo que a implementação mostrou

Dois requisitos estavam mal especificados, e a implementação provou. Um terceiro estava
**certo**, e a conferência provou que o **código** estava errado. A distinção importa: nem
toda divergência entre documento e código se resolve mudando o documento.

| RF | O que dizia | O que o código mostrou | Como ficou |
|---|---|---|---|
| RF-006 | Um requisito só, com critério de aceite sobre **editar** o nome | Não existe endpoint de escrita de perfil: nenhum `PATCH /perfil` em `handlersCp5.ts`, nenhum método em `AuthRepository`. O que existe e funciona é a leitura, por `GET /sessao` | **Requisito corrigido.** Virou dois critérios num requisito, um por checkpoint: leitura no CP5 (verificável hoje) e escrita no CP6. O ID não foi desdobrado para não renumerar nada — a regra de imutabilidade de ID vale |
| RF-012 | "**e Quando** eu o publico, **Então** ele passa a aparecer" | `POST /eventos` cria em `RASCUNHO` e `canSee` isola o rascunho corretamente, mas **nenhum endpoint muda o status para `PUBLICADO`**. A segunda metade do critério não tinha como passar | **Requisito corrigido.** Dividido em rascunho (CP5) e publicar depois (CP6), pelo mesmo motivo de RF-006 |

### O caso em que o código cedeu, e não o requisito

**RF-034 — "o sistema recusa com *ingresso já utilizado às 20h14*".**

A conferência encontrou uma versão de [`app/src/domain/checkin.ts`](../app/src/domain/checkin.ts)
em que `decideCheckIn` verificava `participacao.status !== 'CONFIRMADA'` **antes** de
`presencaExistente`. Como o handler grava a presença e muda a participação para `PRESENTE`
na mesma transação, a segunda leitura do mesmo QR caía sempre no ramo de status e devolvia
`NAO_CONFIRMADA` com "Check-in já registrado." O ramo `JA_UTILIZADO` — o único que carrega
o **horário** do primeiro check-in — era inalcançável pelo endpoint.

A tentação era reescrever o critério de aceite para descrever o que o sistema fazia. Seria
o erro: o horário do primeiro check-in é justamente a informação que o organizador precisa
na porta do evento, e o requisito estava certo em pedi-lo. **A ordem das duas verificações
foi invertida no código**, e a garantia agora é a que o requisito sempre descreveu — com
teste de regressão nomeado como tal: `checkin.test.ts`, "unicidade responde ANTES do
status — regressão do defeito de RN-018".

O critério de aceite de RF-034 **não mudou**. O que mudou foi o código, e é assim que
deveria ser sempre que o requisito estiver defensável. Ver RN-017 e RN-018 em
[`04-regras-de-negocio.md`](04-regras-de-negocio.md#rn-017--o-qr-code-é-assinado-tem-janela-de-validade-e-vale-uma-vez).

---

## 2. Requisitos Não Funcionais

Classificados pelas características de qualidade da **ISO/IEC 25010**. Cada RNF tem
métrica verificável: se não é medível, não é requisito — é desejo.

A coluna **Valor medido** foi preenchida em **2026-09-02**, rodando os comandos da própria
coluna "como medir". Onde a medição não foi feita, está escrito **"não medido no CP5"** e
o que falta para medir. Nenhum número desta coluna é estimativa.

### Usabilidade

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-001 | Inscrição em poucos toques | No máximo **3 toques** entre o feed e a confirmação de inscrição em evento gratuito | Contagem manual de toques no protótipo e no app, registrada no plano de testes | **Não medido no CP5** — a contagem manual não foi executada. O caminho no código tem **2 toques** (card em `FeedPage` → ação principal de `resolvePrimaryAction` em `EventoDetalhePage`), mas caminho de código não é medição de uso: medir na validação com alunos | Must | 5 |
| RNF-002 | Contraste acessível | Toda combinação texto/fundo da UI tem razão de contraste **≥ 4,5:1** (texto normal) e **≥ 3:1** (texto ≥ 24px e componentes de interface), conforme WCAG 2.1 AA | Tabela de contraste calculada em [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) + auditoria automatizada no CP5 | **28 pares calculados pela fórmula WCAG** no CP4, com 2 reprovas herdadas do protótipo e a correção documentada. A **auditoria automatizada não foi executada no CP5**: não há passo de acessibilidade em [`ci.yml`](../.github/workflows/ci.yml) | Must | 4 |
| RNF-003 | Operável por teclado | 100% das ações principais alcançáveis por `Tab`/`Enter`/`Espaço`, com indicador de foco visível de contraste ≥ 3:1 | Roteiro de navegação por teclado nas 8 telas, sem uso de mouse | **Não medido no CP5** — o roteiro de navegação por teclado não foi percorrido. ⚠️ **E o "como medir" ficou desatualizado:** o CP5 tem **12 rotas**, não 8. O roteiro precisa cobrir as 12 de `App.tsx`. Medir tela por tela antes da gravação da demo | Must | 5 |
| RNF-004 | Rótulo acessível em ícones | Nenhum controle apenas-ícone sem `aria-label`; nenhuma imagem de conteúdo sem `alt` | Teste automatizado que falha se `button` sem texto acessível existir | **Parcial: 0 erro e 0 aviso** em `npm run lint`, com `plugin:jsx-a11y/recommended` e `--max-warnings 0` ([`.eslintrc.cjs`](../app/.eslintrc.cjs)). O conjunto `recommended` cobre `alt-text` e conteúdo de âncora, mas **não** detecta botão apenas-ícone sem `aria-label` — essa parte segue por revisão, não por teste | Must | 5 |
| RNF-005 | Compreensão sem treinamento | Um aluno que nunca viu o app conclui a inscrição sem ajuda em **até 90 segundos** | Teste de usabilidade com 5 alunos reais no CP5 (premissa: 4 de 5 concluem) | **Não medido no CP5** — a validação com 5 alunos reais não foi realizada. Depende de ação humana, não de código | Should | 5 |

### Desempenho e eficiência

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-006 | Carregamento do feed | **p95 < 2,0s** para o feed interativo em conexão 4G típica (throttling "Fast 3G/4G" do DevTools, CPU 4× lenta) | Lighthouse mobile em CI sobre o build de produção; falha abaixo de 85 em Performance | **Não medido no CP5** — **não existe passo de Lighthouse em [`ci.yml`](../.github/workflows/ci.yml)**. O "como medir" descreve um job que ainda não foi criado. Criar o job é tarefa do CP6, ou rodar o Lighthouse à mão sobre `npm run preview` e registrar o número | Must | 5 |
| RNF-007 | Tamanho do pacote inicial | Bundle JS inicial **≤ 250 KB gzip**; nenhuma rota adicionando mais de 80 KB gzip | `vite build` + relatório de tamanho no CI | ✅ **232,97 KB gzip de 250** (`npm run check:size`). CSS: 5,02 de 40 KB. Maior chunk: 105,81 de 130 KB. **Ressalva:** 105,81 KB — 45% do pacote — é o bundle do MSW, que sai no CP6 ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)); a folga real é maior do que o número sugere. **Atenção:** o pacote cresceu 15,8 KB gzip com as telas do CP5 e a margem caiu para 17 KB. Sobra pouco para o CP6 acrescentar sem que a saída do MSW seja o que devolve o espaço | Should | 5 |
| RNF-008 | Latência de escrita | **p95 < 1,5s** para inscrição/cancelamento com API real; **< 300ms** com a camada mockada | Medição no E2E do Playwright e, no CP6, log do servidor | **Parcial:** a camada mockada responde com latência **fixa** de 180 ms (`LATENCIA_MS` em [`mocks/support.ts`](../app/src/mocks/support.ts)), dentro do alvo de < 300 ms — mas é constante declarada, não distribuição medida. p95 com API real: CP6 | Must | 6 |

### Segurança

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-009 | Transporte sempre cifrado | 100% do tráfego sobre **TLS 1.2+**; senha e token nunca em URL, log ou armazenamento em texto claro | Inspeção da configuração do host + revisão de log; teste que falha se `password` aparecer em log | **Não medido no CP5** — sem servidor próprio, não há configuração de TLS a auditar, e o teste que procura `password` em log não existe. Verificável hoje por leitura: o token vai no cabeçalho `Authorization`, nunca na URL ([`services/http/index.ts`](../app/src/services/http/index.ts)) | Must | 6 |
| RNF-010 | Senha com hash forte | Senha armazenada apenas como hash **Argon2id** (ou bcrypt custo ≥ 12), com salt por usuário | Revisão de código do serviço de autenticação no CP6 | **Não aplicável no CP5, e é preciso dizer por quê:** o Campus não armazena senha nenhuma. A demo compara o que foi digitado com a constante `SENHA_DEMO` em memória (`mocks/support.ts`). Não há hash porque não há persistência de credencial — o requisito passa a valer quando existir o serviço de autenticação do CP6 | Must | 6 |
| RNF-011 | QR de check-in não falsificável e de uso único | Token do QR **assinado** (HMAC), com validade limitada à janela do evento e **exatamente uma** presença por participação | Teste automatizado: token adulterado é recusado; segunda leitura do mesmo QR é recusada | ✅ **As duas medições do "como medir" foram feitas.** *Token adulterado é recusado:* `ticketToken.test.ts` recusa corpo adulterado, assinatura trocada, outro emissor e payload incompleto, e `lerToken` devolve `null` em vez de lançar para entrada lixo (98,44%). *Segunda leitura é recusada:* `checkin.test.ts` — "ingresso já utilizado diz a que hora foi usado", com teste de regressão da ordem (`checkin.ts` em **99,07% de linhas e 100% de funções**). **Mas a ressalva de fundo continua:** [ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md) declara que a assinatura do CP5 é calculada **no cliente** e **não é controle de segurança** — o teste prova a integridade da *forma* do token, não a impossibilidade de forjá-lo. "Não falsificável" só é cumprível com servidor, no CP6. Por isso `CP alvo` continua 6 | Must | 6 |
| RNF-012 | Autorização de alcance verificada no servidor | Nenhum evento de alcance restrito é retornado pela API a quem não pertence ao alcance — a regra vale no servidor, não só na UI | Teste de integração por ator: aluno de outra turma recebe `403`/lista vazia, inclusive por ID direto | ✅ **Cumprido e coberto por teste.** [`services/inscricao.test.ts`](../app/src/services/inscricao.test.ts) CT-012, em duas provas: inscrição em evento fora do alcance é recusada pela API, e `obter()` por ID direto devolve `null`. A verificação está no handler, não na tela | Must | 6 |

### Confiabilidade

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-013 | Reserva de vaga atômica | **Zero** casos de participações que ocupam vaga acima da capacidade, sob 50 inscrições concorrentes | Teste de concorrência: 50 requisições paralelas para 1 vaga → exatamente 1 confirmação | ✅ **Cumprido e coberto por teste.** `inscricao.test.ts` CT-020: 50 inscrições concorrentes na última vaga confirmam **exatamente uma**; as outras 49 recebem a oferta de lista de espera. É a atomicidade que impede a verificação de alcance de RNF-012 ser contornada por corrida | Must | 5 |
| RNF-014 | Notificação de pagamento idempotente | Reprocessar a mesma notificação do gateway **N vezes** produz o mesmo resultado e uma única confirmação | Teste que envia a mesma notificação 3× e verifica um único pagamento `CONFIRMADO` | ✅ **Cumprido e coberto por teste.** [`domain/payment.test.ts`](../app/src/domain/payment.test.ts) CT-010: "a MESMA notificação repetida é ignorada — nenhuma transição, nenhum aviso". `planWebhook` devolve `IGNORAR_DUPLICADA`, e o handler não escreve nada nesse caso | Must | 6 |

### Manutenibilidade

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-015 | Cobertura de testes no domínio | **≥ 60%** de cobertura de linhas nos módulos de domínio (`src/domain/`, `src/services/`) | `vitest run --coverage` no CI, com limite configurado que falha o build | ✅ **Cumprido nos quatro limites, com 293 testes passando em 17 arquivos.** Linhas e statements **83,59%** (limite 60), funções **77,46%** (limite 60), branches **90,04%** (limite 55). Por pasta: `domain` **85,97%** de linhas e 87,73% de funções; `services` 100%; `services/http` 67,48% de linhas e 45,71% de funções. **O limite provou seu valor durante o CP5:** reprovou em 54,54% no meio da sprint e voltou a passar depois dos testes de `auth`, `pix`, `ticketToken`, `checkin` e `permissions`. `permissions.ts` merece nota: estava em **0% de funções** com 12 funções exportadas — a regra com mais superfície e menos prova do projeto — e foi a **100%**. Onde ainda falta: `eventSchema.ts` (0%, é schema Zod que delega ao domínio já testado), `deadlines.ts` (35,8%) e `format.ts` (54,92%). Ver [`19-checklist-entrega-cp5.md`](19-checklist-entrega-cp5.md#3-estado-real-das-verificações) | Must | 5 |
| RNF-016 | Troca de fonte de dados sem tocar em tela | Substituir o mock pela API real exige alterar **apenas** a implementação dos repositórios — nenhuma alteração em `src/pages/` ou `src/components/` | Revisão do PR de integração no CP6; verificação de que nenhuma tela importa `fetch`/`axios` direto | ✅ **Cumprido, e verificado por ferramenta em vez de revisão.** `no-restricted-imports` em [`.eslintrc.cjs`](../app/.eslintrc.cjs) reprova import de `mocks/`, `msw` ou `axios` em `src/pages/` e `src/components/`, e reprova import de React ou de `services/` dentro de `src/domain/`. `npm run lint` passa com 0 aviso, o que **prova a fronteira** em vez de afirmá-la. O container concreto é uma única linha em [`services/index.ts`](../app/src/services/index.ts) | Must | 5 |
| RNF-017 | Padrão de código automatizado | `npm run lint` sem erro nem aviso; formatação garantida por Prettier; TypeScript em modo `strict` | Job de CI obrigatório em push e PR | ⚠️ **Dois de três.** `npm run lint`: **0 erro, 0 aviso** ✅. `tsc -b` dentro de `npm run build`: **sem erro** ✅. `npm run format:check`: **sem pendência** — "All matched files use Prettier code style!" ✅. Chegou a reprovar **26 arquivos** no meio da sprint, quando as telas e os módulos novos entraram antes do Prettier; o passo obrigatório do `ci.yml` cobrou, e foi corrigido | Must | 4 |

### Portabilidade

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-018 | Mobile-first funcional | Layout sem quebra e sem rolagem horizontal de **320px a 1440px** de largura | Verificação nos breakpoints 320, 375, 390, 768, 1024 e 1440 nas 8 telas | **Parcialmente medido.** O E2E do Playwright roda em **390×844** (`devices['Pixel 7']` em [`playwright.config.ts`](../app/playwright.config.ts)) e **foi executado**: 6 casos verdes, cobrindo feed, lista, detalhe, inscrição, cobrança e login. Isso prova um breakpoint, não seis: os outros 5 não foram percorridos e não há teste de layout automatizado. ⚠️ **Mesmo desalinhamento de RNF-003:** são **12 rotas** no CP5, não 8 — a verificação manual são 12 × 6 = 72 combinações, e convém priorizar as 6 telas do fluxo principal | Must | 5 |
| RNF-019 | Compatibilidade de navegador | Funciona nas duas últimas versões de Chrome, Safari e Firefox, e em Android 9+ / iOS 14+ | Matriz de compatibilidade preenchida no CP5; alvo de build `es2020` | **Parcial:** o alvo `es2020` está configurado e em uso (`build.target` em [`vite.config.ts`](../app/vite.config.ts)) ✅. A **matriz de compatibilidade não foi preenchida** — nenhum navegador foi testado nesta máquina além do Chromium do ambiente | Should | 5 |

### Privacidade e LGPD

| ID | Requisito | Métrica verificável | Como medir | Valor medido (2026-09-02) | MoSCoW | CP |
|---|---|---|---|---|---|---|
| RNF-020 | Minimização de dados pessoais | Coletar apenas nome, e-mail institucional, foto opcional e vínculo acadêmico. **Zero** coleta de CPF, telefone, endereço ou dado de saúde | Inventário de dados pessoais revisado a cada sprint; qualquer campo novo exige justificativa no PR | ✅ **Cumprido, verificado por inspeção do esquema.** `types/domain.ts#Usuario` tem exatamente: `nome`, `email`, `avatarSeed`, `faculdadeId`, `cursoId`, `turmaId`, `papeis`, `emailVerificado`, `visivelEntreConfirmados` e `criadoEm`. **Zero** ocorrência de CPF, telefone, endereço ou dado de saúde em `types/domain.ts` e em `mocks/db.ts`. Nem foto: o avatar é gerado de uma semente, sem upload | Must | 4 |
| RNF-021 | Controle do titular | O aluno consegue **exportar** seus dados e **excluir** a conta pelo próprio app; exclusão efetiva em **até 15 dias**, preservando apenas o agregado anonimizado do evento | Fluxo implementado e testado no CP6; texto de política publicado | **Não medido no CP5** — o fluxo não existe (nenhum endpoint de exportação ou exclusão) e a política não foi publicada. Estava previsto para o CP6 e continua no CP6 | Should | 6 |
| RNF-022 | Dado financeiro fora do nosso banco | **Nenhum** dado de cartão trafega ou é armazenado pelo Campus — a captura ocorre no ambiente do gateway (redirect/SDK), e guardamos apenas identificador da transação e status | Revisão de arquitetura + ausência de campos de cartão no esquema de dados | ✅ **Cumprido e coberto por teste.** `types/domain.ts#ResumoCartao` tem só `ultimosQuatro`, `bandeira` e `titular`, e `NovoPagamento.cartao` é desse tipo — **a API recebe o resumo, nunca o número**. `pix.test.ts` verifica que `resumirCartao` "não deixa nenhum outro dígito do cartão sobrar no resultado" — é o teste que transforma a afirmação em prova. `cvvValido` valida o CVV no formulário e o descarta: o CVV não entra em nenhuma requisição nem em `mocks/db.ts`. O que fica gravado é `transacaoExternaId`, `metodo`, `valor` e `status` | Must | 6 |

**Total: 22 requisitos não funcionais** distribuídos em 7 características de qualidade.

### Quadro-resumo dos 22 RNF

| Situação em 2026-09-02 | Qtd. | Quais |
|---|---|---|
| ✅ Cumprido e medido | 11 | RNF-002 (medido no CP4), RNF-007, RNF-011 (as duas medições do "como medir"), RNF-012, RNF-013, RNF-014, RNF-015, RNF-016, RNF-017, RNF-020, RNF-022 |
| ⚠️ Parcialmente medido | 3 | RNF-004, RNF-008, RNF-019 |
| ⬜ Não medido no CP5 | 8 | RNF-001, RNF-003, RNF-005, RNF-006, RNF-009, RNF-010, RNF-018, RNF-021 |
| **Total** | **22** | 11 + 3 + 8 = 22, conferido contra as listas |

**O que este quadro diz sobre o CP5.** As garantias que sustentam o produto — alcance
verificado no servidor (RNF-012), reserva atômica sob 50 requisições concorrentes
(RNF-013), idempotência de pagamento (RNF-014), fronteira de camadas verificada por lint
(RNF-016) e dado de cartão fora do banco (RNF-022) — estão cumpridas **e cobertas por
teste**, que é o padrão mais alto desta lista.

**Nenhum RNF está reprovando no fechamento.** Os passos automatizados do
[`ci.yml`](../.github/workflows/ci.yml) — lint, escala, formatação, cobertura, build e
orçamento de pacote — passam todos. A pendência que sobra não é de RNF, é de execução: o
**E2E do Playwright** nunca foi rodado, porque o navegador não está instalado.

**O item que merece atenção conceitual, e não de esforço, é RNF-011.** As duas medições que
o "como medir" pede foram feitas e passam. Ainda assim ele fica com `CP alvo` 6, porque
[ADR-0007](adr/0007-token-assinado-no-cliente-no-cp5.md) diz com todas as letras que a
assinatura do CP5 é calculada no cliente e **não é controle de segurança**: o teste prova a
integridade da *forma* do token, não a impossibilidade de forjá-lo. É o RNF em que a
diferença entre "está medido" e "está garantido" é maior, e vale dizer isso em voz alta em
vez de contar como resolvido.

**E o que o CP5 ensinou sobre medição:** RNF-015 reprovou de verdade no meio desta sprint,
com 54,54% de linhas, porque as telas e os módulos novos entraram antes dos testes. O
limite configurado para falhar o build fez exatamente o que devia — reprovou, foi visto, e
os testes de `auth`, `pix`, `ticketToken` e `checkin` vieram depois. Métrica que nunca
reprova não é métrica; é enfeite.

---

## 3. Matriz de rastreabilidade

`RF → Caso de uso → Tela / rota → Sprint`. Serve para responder duas perguntas de
auditoria: *"este requisito está coberto por alguma tela?"* e *"esta tela existe por
causa de qual requisito?"*.

| RF | Caso de uso | Tela / rota | Componente principal | Sprint |
|---|---|---|---|---|
| RF-001 | UC-006 Cadastrar-se | `/login` (aba cadastro) | `Input`, `Button` | 2 |
| RF-002 | UC-006 Cadastrar-se | `/login` | validação Zod de domínio | 2 |
| RF-003 | UC-007 Autenticar-se | `/login` | `Input`, `Button`, store de sessão | 2 |
| RF-004 | UC-007 Autenticar-se | `/login` (recuperar) | `Modal` | 3 |
| RF-005 | UC-008 Vincular-se a turma | `/onboarding` | `Select`, `Input`, `Chip` | 2 |
| RF-006 | UC-009 Editar perfil | `/perfil` | `Avatar`, `Input` | 2 |
| RF-007 | UC-009 Editar perfil | `/perfil` | `Tabs`, `EventListItem`, `Badge` | 2 |
| RF-008 | UC-008 Vincular-se a turma | `/perfil` → trocar turma | `Modal`, `Input` | 3 |
| RF-009 | UC-009 Editar perfil | `/perfil` → privacidade | `Switch`, `Toast` | 3 |
| RF-010 | UC-001 Criar evento | `/criar` | formulário Zod + RHF | 2 |
| RF-011 | UC-001 Criar evento | `/criar` | seletor de alcance | 2 |
| RF-012 | UC-001 Criar evento | `/criar` | `Button` secundário "salvar rascunho" | 2 |
| RF-013 | UC-015 Editar evento | `/eventos/:id/editar` | formulário reaproveitado | 3 |
| RF-014 | UC-016 Cancelar evento | `/eventos/:id` (painel do organizador) | `Modal` de confirmação | 3 |
| RF-015 | UC-010 Buscar e filtrar eventos | `/eventos` | `Chip` de filtro, `EventListItem` | 2 |
| RF-016 | UC-011 Ver detalhe do evento | `/eventos/:id` | `ProgressBar`, `Badge`, `Button` | 2 |
| RF-017 | UC-022 Responder perguntas | `/eventos/:id` → inscrição | `Modal`, `Input` | 3 |
| RF-018 | UC-001 Criar evento | `/eventos/:id` → duplicar | `Button` | 3 |
| RF-019 | UC-002 Inscrever-se | `/eventos/:id` | `Button` primário, `Toast` | 2 |
| RF-020 | UC-002 Inscrever-se | — (regra de domínio) | `capacity.ts` | 2 |
| RF-021 | UC-012 Cancelar inscrição | `/eventos/:id`, `/perfil` | `Modal`, `Toast` | 2 |
| RF-022 | UC-002 Inscrever-se | `/eventos/:id` | estado do botão | 2 |
| RF-023 | UC-002 Inscrever-se | `/eventos/:id` | `Button` desabilitado | 2 |
| RF-024 | UC-004 Entrar na lista de espera | `/eventos/:id` | `Button` variante `secondary`, `Badge` de posição | 2 |
| RF-025 | UC-004 Entrar na lista de espera | — (regra de domínio) | `waitlist.ts` | 2 |
| RF-026 | UC-004 Entrar na lista de espera | `/ingresso/:id` | `Toast`, contagem de prazo | 3 |
| RF-027 | UC-004 Entrar na lista de espera | `/eventos/:id`, `/perfil` | `Button` | 2 |
| RF-028 | UC-003 Pagar inscrição | `/pagamento/:participacaoId` | `Tabs` Pix/cartão, `Modal` | 3 |
| RF-029 | UC-003 Pagar inscrição | — (integração) | webhook do gateway | 3 |
| RF-030 | UC-003 Pagar inscrição | — (regra de domínio) | rotina de expiração | 3 |
| RF-031 | UC-018 Solicitar reembolso | `/perfil` → participação | `Modal` | 3 |
| RF-032 | UC-017 Gerenciar presença | `/eventos/:id` (painel) | painel do organizador | 3 |
| RF-033 | UC-005 Fazer check-in | `/ingresso/:id` | `TicketCard` + QR | 2 |
| RF-034 | UC-005 Fazer check-in | `/eventos/:id/checkin` | leitor de QR | 3 |
| RF-035 | UC-017 Gerenciar presença | `/eventos/:id/checkin` | painel de presença | 3 |
| RF-036 | UC-011 Ver detalhe / feed | `/` | `PostCard`, `TicketCard` | 2 |
| RF-037 | UC-013 Publicar no feed | `/eventos/:id` → publicar | `Modal`, upload | 3 |
| RF-038 | UC-014 Comentar publicação | `/` | `Input` inline | 3 |
| RF-039 | UC-021 Receber notificação | global | `Toast`, badge no `TopBar` | 3 |
| RF-040 | UC-021 Receber notificação | `/notificacoes` | lista | 3 |
| RF-041 | UC-020 Aprovar evento de faculdade | `/admin/aprovacoes` | tabela + ações | 3 |
| RF-042 | UC-019 Moderar publicação | `/` (menu da publicação) | `Modal` | 3 |
| RF-043 | UC-008 Vincular-se a turma | `/admin/turmas` | tabela + ações | 3 |

Sprint 1 é dedicada a documentação, modelagem e marca (CP4) e por isso não aparece na
coluna de sprint — nenhum RF é *implementado* na Sprint 1. Ver
[`09-trello/quadro.md`](09-trello/quadro.md).

**Rotas desta matriz que ainda não existem em [`App.tsx`](../app/src/App.tsx)** (as 12 do
CP5 estão listadas lá): `/eventos/:id/editar` (RF-013), `/admin/aprovacoes` (RF-041) e
`/admin/turmas` (RF-043). São rotas planejadas para o CP6, não rotas quebradas — mas a
matriz descreve o destino, e isso precisa estar dito.

### Cobertura dos requisitos por checkpoint

| Checkpoint | RFs planejados | RFs de fato | Observação |
|---|---|---|---|
| CP4 | — (base técnica + documentação) | — | RNF-002, RNF-017 e RNF-020 cumpridos: contraste calculado, lint no CI, inventário mínimo de dados |
| CP5 | 21 RFs — 19 `Must` + 2 `Should` | **25 completos + 3 parciais** — ver [1.1](#11-status-de-implementação-no-cp5) | Protótipo funcional com dados mockados. O conjunto não é superconjunto do plano: entraram RF-028, RF-029, RF-034, RF-035, RF-037, RF-038 e RF-040; saíram RF-001, e a escrita de RF-006 e RF-012 |
| CP6 | 22 RFs — 9 `Must` + 9 `Should` + 4 `Could` | **15 adiados + 3 metades** | Persistência real, cadastro de conta, escrita de perfil, expiração por tempo, reembolso, moderação e administração |

---

## 4. Requisitos explicitamente fora de escopo

Recusa registrada é decisão de projeto; recusa não registrada é dívida. Cada item abaixo
foi cogitado e descartado — com o motivo.

| ID | Requisito recusado | Por que fica fora da v1 | Reavaliar quando |
|---|---|---|---|
| RFX-01 | Chat / mensagens diretas entre alunos | Substituiria o WhatsApp, não o complementa. Traz moderação, denúncia e retenção de conteúdo — outro produto, com outro risco de LGPD | Nunca no escopo do semestre |
| RFX-02 | Stories efêmeros de 24h | Duplica o Instagram no seu ponto forte e contraria o valor "memória do evento" declarado no problema | Após o CP6, se houver validação com usuários |
| RFX-03 | Login social (Google / Apple / Instagram) | Conflita com RF-002: a garantia de que o usuário é aluno vem do domínio institucional. Login social reintroduz o problema que o produto resolve | CP6, apenas como *segundo fator* sobre e-mail institucional já verificado |
| RFX-04 | Múltiplas faculdades (multi-tenant) | Exigiria isolamento de dados por tenant, federação de identidade e migração do modelo — custo alto para valor zero na banca | Depois do CP6 |
| RFX-05 | App nativo iOS/Android publicado nas lojas | Publicação em loja tem custo, conta de desenvolvedor e prazo de revisão incompatíveis com o semestre. Ver [ADR-0001](adr/0001-react-vite-em-vez-de-react-native.md) | CP6 como PWA instalável; loja fora do escopo |
| RFX-06 | Venda de ingresso na porta / dinheiro em espécie | Reconciliação de caixa físico exige controle financeiro que o produto não tem, e abriria brecha de fraude sem auditoria | Fora do escopo |
| RFX-07 | Emissão de nota fiscal e repasse bancário automático ao organizador | Requer CNPJ, contrato com adquirente e regra fiscal — inviável para grupo acadêmico | Fora do escopo |
| RFX-08 | Recomendação por algoritmo de interesse | Sem volume de dados, recomendação vira aleatoriedade com aparência de inteligência. Ordenação cronológica dentro do alcance é mais honesta e mais útil | Depois de haver base de uso real |
| RFX-09 | Integração com sistema acadêmico da instituição para importar turmas | Depende de acesso e aprovação institucional que o grupo não controla. Código de convite resolve o problema com autonomia | CP6, se a instituição fornecer API |
| RFX-10 | Controle de presença com valor acadêmico | Presença com efeito em nota ou frequência tem implicação regulatória. Ver antipersona em [`01-problema-e-personas.md`](01-problema-e-personas.md) | Fora do produto |
| RFX-11 | Modo offline com sincronização | O único momento realmente sem rede é a porta do evento; será tratado no CP6 com cache do QR já emitido, não com sincronização geral | CP6, escopo reduzido |
| RFX-12 | Painel de BI com relatórios exportáveis | O organizador precisa de 4 números, não de um painel. Excesso de relatório na v1 é escopo disfarçado de valor | Depois do CP6 |

---

## 5. Premissas e dependências dos requisitos

| # | Premissa / dependência | Impacto se falhar |
|---|---|---|
| 1 | A instituição tem domínio de e-mail padronizado para alunos | RF-002 perde eficácia; seria necessário convite manual por turma |
| 2 | Existe gateway de pagamento com Pix e API de notificação em ambiente de teste (sandbox) | RF-028 a RF-031 ficam apenas mockados no CP6 |
| 3 | O aparelho do organizador tem câmera funcional para leitura de QR | RF-034 precisaria de fallback por código numérico digitado (previsto como exceção em UC-005) |
| 4 | Códigos de convite de turma são distribuídos por um canal confiável (representante) | RF-005 permitiria vínculo em turma errada; mitigado por revogação de código (RF-043) |
| 5 | O grupo tem 6 integrantes durante todo o semestre, sem orçamento de infraestrutura | Escopo `Should`/`Could` é o primeiro a sair; ver [`12-riscos.md`](12-riscos.md) |
