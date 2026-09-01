# Requisitos

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
| RF-001 | Cadastrar-se com e-mail institucional | O usuário cria conta informando nome, e-mail institucional e senha. O e-mail é a identidade única da conta. | Must | Aluno | **Dado** que informo nome, e-mail `@fiap.com.br` e senha válida, **Quando** submeto o cadastro, **Então** a conta é criada em estado `pendente_verificacao` e recebo e-mail com link de confirmação. | 5 |
| RF-002 | Verificar domínio institucional | O sistema aceita cadastro apenas de domínios de e-mail previamente cadastrados como pertencentes à faculdade. | Must | Sistema | **Dado** que informo um e-mail de domínio não cadastrado (ex: `@gmail.com`), **Quando** submeto o cadastro, **Então** recebo a mensagem "use seu e-mail institucional" e a conta não é criada. | 5 |
| RF-003 | Autenticar e manter sessão | Login por e-mail e senha, com sessão persistida no dispositivo até logout ou expiração. | Must | Aluno | **Dado** que já verifiquei minha conta, **Quando** faço login com credenciais corretas, **Então** entro no feed e permaneço autenticado ao reabrir o app. | 5 |
| RF-004 | Recuperar acesso | Redefinição de senha por link de uso único enviado ao e-mail institucional. | Should | Aluno | **Dado** que solicitei recuperação, **Quando** abro o link recebido dentro da validade, **Então** consigo definir nova senha e o link deixa de funcionar. | 6 |
| RF-005 | Concluir onboarding de vínculo acadêmico | Após verificar a conta, o usuário escolhe faculdade e curso e entra em uma turma informando o código de convite. | Must | Aluno | **Dado** que estou no onboarding, **Quando** seleciono faculdade e curso e informo um código de turma válido, **Então** meu perfil passa a ter turma vinculada e o feed já mostra eventos dos três níveis de alcance. | 5 |

### Módulo B — Perfil e Turmas

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-006 | Visualizar e editar o próprio perfil | Nome de exibição, foto, curso, turma, e estatísticas (eventos criados, participando, publicações). | Must | Aluno | **Dado** que estou em `/perfil`, **Quando** altero meu nome de exibição e salvo, **Então** o novo nome aparece no perfil e nas minhas publicações do feed. | 5 |
| RF-007 | Consultar as próprias participações por estado | Abas "Participando", "Criados" e "Anteriores", com o estado de cada participação visível. | Must | Aluno | **Dado** que tenho uma participação confirmada e uma em lista de espera, **Quando** abro a aba "Participando", **Então** vejo as duas com os rótulos "confirmado" e "lista de espera". | 5 |
| RF-008 | Trocar de turma | Registrar mudança de turma ao virar o período, informando o novo código, preservando o histórico de participações. | Should | Aluno | **Dado** que estou vinculado à turma 2ESPA, **Quando** informo o código válido da turma 3ESPX, **Então** minha turma atual passa a ser 3ESPX e meus eventos anteriores continuam no histórico. | 6 |
| RF-009 | Configurar privacidade e notificações | Escolher se aparece na lista pública de confirmados e quais notificações deseja receber. | Should | Aluno | **Dado** que desativei "aparecer entre os confirmados", **Quando** um colega abre um evento em que estou inscrito, **Então** meu avatar não aparece na lista de confirmados. | 6 |

### Módulo C — Eventos

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-010 | Criar evento | Formulário com título, descrição, data/hora de início e fim, local, capacidade, preço, alcance e prazos. | Must | Organizador | **Dado** que preenchi todos os campos obrigatórios com dados válidos, **Quando** toco em "Publicar evento", **Então** o evento é criado com status `publicado` e eu sou registrado como organizador. | 5 |
| RF-011 | Definir alcance do evento | O organizador escolhe entre `TURMA`, `CURSO` e `FACULDADE`; o alcance determina quem vê o evento. | Must | Organizador | **Dado** que criei um evento com alcance `TURMA` na turma 3ESPX, **Quando** um aluno de outra turma abre a lista de eventos, **Então** esse evento não aparece para ele — nem por link direto. | 5 |
| RF-012 | Salvar rascunho e publicar depois | Evento pode ser salvo incompleto como `rascunho`, visível apenas ao organizador, e publicado depois. | Should | Organizador | **Dado** que salvei um evento como rascunho, **Quando** outro aluno do mesmo alcance abre a lista de eventos, **Então** o rascunho não aparece; **e Quando** eu o publico, **Então** ele passa a aparecer. | 5 |
| RF-013 | Editar evento publicado | Alterar dados do evento; mudanças sensíveis (data, local, preço) notificam os inscritos. | Must | Organizador | **Dado** que meu evento tem 18 inscritos, **Quando** altero a data, **Então** os 18 inscritos recebem notificação de alteração com o valor antigo e o novo. | 6 |
| RF-014 | Cancelar evento | O organizador cancela o evento com motivo obrigatório; participações são canceladas e pagamentos entram em reembolso. | Must | Organizador | **Dado** que meu evento pago tem 12 pagamentos confirmados, **Quando** cancelo com motivo, **Então** as 12 participações ficam `CANCELADA`, os pagamentos vão para `REEMBOLSO_SOLICITADO` e todos são notificados. | 6 |
| RF-015 | Listar eventos visíveis com filtros | Lista ordenada por data, filtrável por alcance (minha turma / meu curso / faculdade), preço (gratuito) e período. | Must | Aluno | **Dado** que estou em `/eventos`, **Quando** aplico o filtro "Minha turma", **Então** vejo apenas eventos de alcance `TURMA` da minha turma, ordenados pela data mais próxima. | 5 |
| RF-016 | Ver detalhe do evento | Capa, alcance, organizador, data, local, preço, descrição, barra de ocupação de vagas, prazo de inscrição e ação principal contextual. | Must | Aluno | **Dado** que abro um evento com 72 de 80 vagas, **Quando** a tela carrega, **Então** vejo "72/80 vagas" e a barra preenchida proporcionalmente, e o botão diz "Quero participar". | 5 |
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
| RF-028 | Iniciar pagamento da inscrição | Para evento pago, o aluno escolhe Pix ou cartão e o sistema cria uma cobrança no gateway. | Must | Aluno | **Dado** que minha participação está `PENDENTE_PAGAMENTO` em evento de R$ 25, **Quando** escolho Pix, **Então** recebo o código copia-e-cola e o QR na tela, e o pagamento fica `AGUARDANDO`. | 6 |
| RF-029 | Confirmar pagamento por notificação do gateway | O gateway notifica a confirmação; o sistema confirma a participação sem ação do usuário. | Must | Gateway de Pagamento | **Dado** que paguei o Pix, **Quando** o gateway envia a confirmação, **Então** meu pagamento fica `CONFIRMADO`, minha participação fica `CONFIRMADA` e recebo notificação. | 6 |
| RF-030 | Expirar reserva por falta de pagamento | Participação `PENDENTE_PAGAMENTO` que não é paga dentro da janela é cancelada e libera a vaga. | Must | Sistema | **Dado** que reservei uma vaga e não paguei dentro da janela de pagamento, **Quando** a janela expira, **Então** minha participação fica `EXPIRADA`, a vaga é liberada e a fila é acionada. | 6 |
| RF-031 | Solicitar e processar reembolso | Cancelamento dentro do prazo com pagamento confirmado gera reembolso conforme a política. | Should | Aluno | **Dado** que paguei R$ 25 e cancelo com 8 dias de antecedência, **Quando** confirmo o cancelamento, **Então** o pagamento fica `REEMBOLSO_SOLICITADO` com valor integral e vejo o prazo estimado de devolução. | 6 |
| RF-032 | Acompanhar recebimentos do evento | O organizador vê total arrecadado, pagos, pendentes e reembolsados do seu evento. | Should | Organizador | **Dado** que meu evento tem 18 inscritos e 15 pagos, **Quando** abro o painel do organizador, **Então** vejo "15 pagos · 3 pendentes" e o valor total confirmado. | 6 |

### Módulo G — Check-in

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-033 | Gerar ingresso com QR Code | Participação confirmada gera um ingresso com QR Code contendo token assinado e de uso único. | Must | Sistema | **Dado** que minha participação está `CONFIRMADA`, **Quando** abro `/ingresso/:id`, **Então** vejo o cartão-ingresso com QR Code, meu nome, o evento e o código de validação. | 5 |
| RF-034 | Validar check-in por leitura de QR | O organizador lê o QR e o sistema registra a presença, recusando QR inválido, de outro evento ou já utilizado. | Must | Organizador | **Dado** que um QR já foi usado no check-in, **Quando** leio o mesmo QR de novo, **Então** o sistema recusa com "ingresso já utilizado às 20h14" e não cria segunda presença. | 6 |
| RF-035 | Consultar lista de presença | O organizador vê inscritos, presentes e ausentes, com percentual de comparecimento. | Should | Organizador | **Dado** que 271 de 300 inscritos fizeram check-in, **Quando** abro a lista de presença, **Então** vejo "271 presentes · 29 ausentes · 90% de comparecimento". | 6 |

### Módulo H — Feed Social

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-036 | Ver feed segmentado por alcance | O feed mostra publicações de eventos que o aluno tem permissão de ver, mais recentes primeiro. | Must | Aluno | **Dado** que existe uma publicação em um evento de turma da qual não faço parte, **Quando** abro o feed, **Então** essa publicação não aparece. | 5 |
| RF-037 | Publicar foto em evento | Participante com presença registrada publica foto com legenda no evento. | Must | Aluno | **Dado** que fiz check-in em um evento, **Quando** publico foto com legenda, **Então** a publicação aparece no feed de quem enxerga aquele evento, com meu nome e horário. | 6 |
| RF-038 | Comentar publicação | Comentário em texto, com autor e horário, na publicação do feed. | Could | Aluno | **Dado** que existe uma publicação visível para mim, **Quando** envio um comentário, **Então** ele aparece abaixo da publicação com meu nome e o horário. | 6 |

### Módulo I — Notificações

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-039 | Notificar eventos relevantes | O sistema notifica: novo evento no meu alcance, vaga liberada, pagamento confirmado, alteração e cancelamento de evento, check-in realizado. | Must | Sistema | **Dado** que sou o 1º da fila de um evento, **Quando** uma vaga é liberada, **Então** recebo notificação com o prazo para confirmar. | 6 |
| RF-040 | Central de notificações | Lista de notificações com estado lida/não lida e link para o objeto referenciado. | Should | Aluno | **Dado** que tenho 3 notificações não lidas, **Quando** abro a central e toco em uma, **Então** ela é marcada como lida e o app navega para o evento correspondente. | 6 |

### Módulo J — Administração

| ID | Requisito | Descrição | MoSCoW | Ator | Critério de aceite | CP |
|---|---|---|---|---|---|---|
| RF-041 | Aprovar evento de alcance faculdade | Evento com alcance `FACULDADE` só é publicado após aprovação de Admin de Faculdade. | Should | Admin de Faculdade | **Dado** que um aluno submeteu evento de alcance `FACULDADE`, **Quando** o admin aprova, **Então** o evento passa de `EM_APROVACAO` para `PUBLICADO` e o organizador é notificado. | 6 |
| RF-042 | Moderar publicações do feed | Organizador do evento, Admin de Curso e Admin de Faculdade podem remover publicação ou comentário, com motivo registrado. | Should | Organizador / Admin | **Dado** que uma publicação foi denunciada, **Quando** o organizador do evento a remove informando o motivo, **Então** ela deixa de aparecer no feed e a ação fica registrada com autor e horário. | 6 |
| RF-043 | Gerenciar turmas do curso | Admin de Curso cria turmas, gera e revoga códigos de convite. | Could | Admin de Curso | **Dado** que sou admin do curso de Engenharia de Computação, **Quando** crio a turma 1ESPA e gero o código, **Então** o código passa a permitir vínculo e pode ser revogado depois. | 6 |

**Total: 43 requisitos funcionais** — 26 `Must`, 12 `Should`, 5 `Could`.

---

## 2. Requisitos Não Funcionais

Classificados pelas características de qualidade da **ISO/IEC 25010**. Cada RNF tem
métrica verificável: se não é medível, não é requisito — é desejo.

### Usabilidade

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-001 | Inscrição em poucos toques | No máximo **3 toques** entre o feed e a confirmação de inscrição em evento gratuito | Contagem manual de toques no protótipo e no app, registrada no plano de testes | Must | 5 |
| RNF-002 | Contraste acessível | Toda combinação texto/fundo da UI tem razão de contraste **≥ 4,5:1** (texto normal) e **≥ 3:1** (texto ≥ 24px e componentes de interface), conforme WCAG 2.1 AA | Tabela de contraste calculada em [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) + auditoria automatizada no CP5 | Must | 4 |
| RNF-003 | Operável por teclado | 100% das ações principais alcançáveis por `Tab`/`Enter`/`Espaço`, com indicador de foco visível de contraste ≥ 3:1 | Roteiro de navegação por teclado nas 8 telas, sem uso de mouse | Must | 5 |
| RNF-004 | Rótulo acessível em ícones | Nenhum controle apenas-ícone sem `aria-label`; nenhuma imagem de conteúdo sem `alt` | Teste automatizado que falha se `button` sem texto acessível existir | Must | 5 |
| RNF-005 | Compreensão sem treinamento | Um aluno que nunca viu o app conclui a inscrição sem ajuda em **até 90 segundos** | Teste de usabilidade com 5 alunos reais no CP5 (premissa: 4 de 5 concluem) | Should | 5 |

### Desempenho e eficiência

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-006 | Carregamento do feed | **p95 < 2,0s** para o feed interativo em conexão 4G típica (throttling "Fast 3G/4G" do DevTools, CPU 4× lenta) | Lighthouse mobile em CI sobre o build de produção; falha abaixo de 85 em Performance | Must | 5 |
| RNF-007 | Tamanho do pacote inicial | Bundle JS inicial **≤ 250 KB gzip**; nenhuma rota adicionando mais de 80 KB gzip | `vite build` + relatório de tamanho no CI | Should | 5 |
| RNF-008 | Latência de escrita | **p95 < 1,5s** para inscrição/cancelamento com API real; **< 300ms** com a camada mockada | Medição no E2E do Playwright e, no CP6, log do servidor | Must | 6 |

### Segurança

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-009 | Transporte sempre cifrado | 100% do tráfego sobre **TLS 1.2+**; senha e token nunca em URL, log ou armazenamento em texto claro | Inspeção da configuração do host + revisão de log; teste que falha se `password` aparecer em log | Must | 6 |
| RNF-010 | Senha com hash forte | Senha armazenada apenas como hash **Argon2id** (ou bcrypt custo ≥ 12), com salt por usuário | Revisão de código do serviço de autenticação no CP6 | Must | 6 |
| RNF-011 | QR de check-in não falsificável e de uso único | Token do QR **assinado** (HMAC), com validade limitada à janela do evento e **exatamente uma** presença por participação | Teste automatizado: token adulterado é recusado; segunda leitura do mesmo QR é recusada | Must | 6 |
| RNF-012 | Autorização de alcance verificada no servidor | Nenhum evento de alcance restrito é retornado pela API a quem não pertence ao alcance — a regra vale no servidor, não só na UI | Teste de integração por ator: aluno de outra turma recebe `403`/lista vazia, inclusive por ID direto | Must | 6 |

### Confiabilidade

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-013 | Reserva de vaga atômica | **Zero** casos de participações que ocupam vaga acima da capacidade, sob 50 inscrições concorrentes | Teste de concorrência: 50 requisições paralelas para 1 vaga → exatamente 1 confirmação | Must | 5 |
| RNF-014 | Notificação de pagamento idempotente | Reprocessar a mesma notificação do gateway **N vezes** produz o mesmo resultado e uma única confirmação | Teste que envia a mesma notificação 3× e verifica um único pagamento `CONFIRMADO` | Must | 6 |

### Manutenibilidade

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-015 | Cobertura de testes no domínio | **≥ 60%** de cobertura de linhas nos módulos de domínio (`src/domain/`, `src/services/`) | `vitest run --coverage` no CI, com limite configurado que falha o build | Must | 5 |
| RNF-016 | Troca de fonte de dados sem tocar em tela | Substituir o mock pela API real exige alterar **apenas** a implementação dos repositórios — nenhuma alteração em `src/pages/` ou `src/components/` | Revisão do PR de integração no CP6; verificação de que nenhuma tela importa `fetch`/`axios` direto | Must | 5 |
| RNF-017 | Padrão de código automatizado | `npm run lint` sem erro nem aviso; formatação garantida por Prettier; TypeScript em modo `strict` | Job de CI obrigatório em push e PR | Must | 4 |

### Portabilidade

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-018 | Mobile-first funcional | Layout sem quebra e sem rolagem horizontal de **320px a 1440px** de largura | Verificação nos breakpoints 320, 375, 390, 768, 1024 e 1440 nas 8 telas | Must | 5 |
| RNF-019 | Compatibilidade de navegador | Funciona nas duas últimas versões de Chrome, Safari e Firefox, e em Android 9+ / iOS 14+ | Matriz de compatibilidade preenchida no CP5; alvo de build `es2020` | Should | 5 |

### Privacidade e LGPD

| ID | Requisito | Métrica verificável | Como medir | MoSCoW | CP |
|---|---|---|---|---|---|
| RNF-020 | Minimização de dados pessoais | Coletar apenas nome, e-mail institucional, foto opcional e vínculo acadêmico. **Zero** coleta de CPF, telefone, endereço ou dado de saúde | Inventário de dados pessoais revisado a cada sprint; qualquer campo novo exige justificativa no PR | Must | 4 |
| RNF-021 | Controle do titular | O aluno consegue **exportar** seus dados e **excluir** a conta pelo próprio app; exclusão efetiva em **até 15 dias**, preservando apenas o agregado anonimizado do evento | Fluxo implementado e testado no CP6; texto de política publicado | Should | 6 |
| RNF-022 | Dado financeiro fora do nosso banco | **Nenhum** dado de cartão trafega ou é armazenado pelo Campus — a captura ocorre no ambiente do gateway (redirect/SDK), e guardamos apenas identificador da transação e status | Revisão de arquitetura + ausência de campos de cartão no esquema de dados | Must | 6 |

**Total: 22 requisitos não funcionais** distribuídos em 7 características de qualidade.

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
| RF-028 | UC-003 Pagar inscrição | `/eventos/:id/pagamento` | `Tabs` Pix/cartão, `Modal` | 3 |
| RF-029 | UC-003 Pagar inscrição | — (integração) | webhook do gateway | 3 |
| RF-030 | UC-003 Pagar inscrição | — (regra de domínio) | rotina de expiração | 3 |
| RF-031 | UC-018 Solicitar reembolso | `/perfil` → participação | `Modal` | 3 |
| RF-032 | UC-017 Gerenciar presença | `/eventos/:id` (painel) | painel do organizador | 3 |
| RF-033 | UC-005 Fazer check-in | `/ingresso/:id` | `TicketCard` + QR | 2 |
| RF-034 | UC-005 Fazer check-in | `/eventos/:id/checkin` | leitor de QR | 3 |
| RF-035 | UC-017 Gerenciar presença | `/eventos/:id/presenca` | tabela de presença | 3 |
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

### Cobertura dos requisitos por checkpoint

| Checkpoint | RFs entregues | Observação |
|---|---|---|
| CP4 | — (base técnica + documentação) | RNF-002, RNF-017, RNF-020 já cumpridos: contraste calculado, lint no CI, inventário mínimo de dados |
| CP5 | 22 RFs (todos os `Must` dos módulos B, C, D, E, G-parcial, H-parcial) | Protótipo funcional com dados mockados |
| CP6 | 21 RFs restantes | Persistência real, pagamento, notificação, moderação, administração |

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
