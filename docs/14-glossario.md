# Glossário

Linguagem ubíqua do Campus. Cada termo tem **um** nome em português (usado em
documentação, UI e conversa) e **um** nome em inglês (usado em código), e nada mais.
Sinônimo é fonte de bug: se a mesma coisa é "inscrição" em um lugar e "reserva" em
outro, alguém vai modelar duas.

**Responsável:** Lucas Zolla · **Guardião no código:** Ronaldo Veloso Filho

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Linguagem ubíqua: 10 seções, termo em português, identificador em inglês, "não confundir com" e a lista de termos proibidos |
| 1.1 | 2026-09-02 | CP6 | Nova seção **9b** com os termos que o CP6 acrescentou ao vocabulário: monorepo, workspace, pacote compartilhado, migração, `SELECT … FOR UPDATE`, `CHECK`, índice único parcial, Argon2id, access e refresh token, healthcheck e GHCR. `Repositório (camada)` passa a dizer que há **duas** implementações, e entra `Fonte de dados` (`VITE_DATA_SOURCE`). `Seed` deixa de ser um e passa a ser dois, com o mesmo conteúdo |

Os termos novos do CP6 estão na seção 9b, e cada um tem a mesma exigência dos outros: a
coluna "não confundir com" existe porque **quase todo termo de infraestrutura tem um vizinho
que parece a mesma coisa e não é** — transação e trava, monorepo e monólito, expirar e
revogar, `depends_on` e healthcheck. É onde o vocabulário costuma escorregar.

## Como usar

| Coluna | Significado |
|---|---|
| **Termo** | O nome oficial em português. Use exatamente este na UI e na documentação |
| **Em código** | Identificador em inglês. Use exatamente este em tipos, funções e rotas |
| **Definição** | O que é, de forma que dispense contexto |
| **Não confundir com** | O erro mais comum sobre aquele termo |

---

## 1. Estrutura acadêmica

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Faculdade** | `College` | Instituição de ensino à qual todo usuário verificado pertence. Na v1 existe exatamente uma. Raiz da hierarquia de alcance | "Campus" (nome do produto) e "campus" (unidade física, que não é modelada na v1) |
| **Curso** | `Course` | Programa de graduação da faculdade (ex.: Engenharia de Computação). Agrupa turmas | Disciplina/matéria — não existe no modelo |
| **Turma** | `ClassGroup` | Conjunto de alunos que cursam juntos um curso em um ano/período (ex.: 3ESPX, 2026.1). Nível mais específico de alcance | "Sala" ou "grupo": turma é vínculo acadêmico, não agrupamento social livre |
| **Código de convite** | `inviteCode` | Cadeia curta que vincula um aluno a uma turma no onboarding. Pode ser revogada pelo Admin de Curso | Senha: o código identifica a turma, não autentica a pessoa |
| **Vínculo acadêmico** | `academicLink` | Trinca faculdade + curso + turma de um usuário. Sem vínculo, o alcance não se aplica e o feed fica vazio | Matrícula: não há integração com sistema acadêmico (RFX-09) |
| **E-mail institucional** | `institutionalEmail` | Endereço em domínio pertencente à faculdade. É a identidade única da conta e a prova de vínculo | E-mail pessoal, que não é aceito (RF-002) |

## 2. Pessoas e papéis

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Usuário** | `User` | Qualquer pessoa com conta verificada e vínculo acadêmico. Entidade única de pessoa no sistema | "Aluno" como tipo separado: não existe subclasse de usuário |
| **Aluno** | — (é o próprio `User`) | Modo de falar de um usuário quando o assunto é participar de eventos | Não é uma classe. Ver [RN-023](04-regras-de-negocio.md#rn-023--organizador-é-papel-por-evento-não-tipo-de-usuário) |
| **Organizador** | `organizer` | Papel de um usuário **em relação a um evento** que ele criou. Não é cadastro, não é permissão global | Perfil de conta: qualquer aluno pode organizar, e ninguém "é organizador" no sistema |
| **Admin de Curso** | `CourseAdmin` (`PapelUsuario.ADMIN_CURSO`) | Papel administrativo com escopo em um curso: gerencia turmas, códigos e modera eventos do curso | Coordenador acadêmico da instituição — o papel é do produto, não do organograma |
| **Admin de Faculdade** | `CollegeAdmin` (`PapelUsuario.ADMIN_FACULDADE`) | Papel administrativo com escopo na faculdade: aprova evento de alcance faculdade e modera qualquer conteúdo | Superusuário técnico: não tem acesso a dado de pagamento nem a senha |
| **Participante** | `attendee` | Usuário com participação ativa em um evento | Inscrito: no Campus, "inscrito" e "participante" são o mesmo — quem tem `Participacao` ativa |

## 3. Evento

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Evento** | `Event` | Encontro criado por um usuário, com data, local, capacidade, preço e alcance. Unidade central do produto | Publicação do feed, que é conteúdo *sobre* um evento |
| **Alcance** | `EventScope` / `AlcanceEvento` | Nível de visibilidade do evento: `TURMA`, `CURSO` ou `FACULDADE`. Determina, sozinho, quem enxerga | Privacidade de perfil (RF-009), que é sobre a pessoa, não sobre o evento |
| **Âncora do alcance** | `scopeAnchorId` (`turmaId` / `cursoId` / `faculdadeId`) | O identificador concreto do grupo alcançado, coerente com o alcance escolhido | Organizador: o alcance não é "quem criou", é "qual grupo vê" |
| **Rascunho** | `StatusEvento.RASCUNHO` | Evento salvo incompleto, visível somente ao organizador | Evento em aprovação, que já foi submetido |
| **Em aprovação** | `StatusEvento.EM_APROVACAO` | Evento de alcance `FACULDADE` submetido, aguardando Admin de Faculdade | Rascunho: aqui o organizador já terminou |
| **Publicado** | `StatusEvento.PUBLICADO` | Evento visível para o alcance, aceitando inscrições conforme prazo | "Ativo": termo evitado por ser ambíguo entre publicado e em andamento |
| **Capacidade** | `capacity` | Número máximo de participações que podem ocupar vaga simultaneamente | Número de inscritos, que é o valor atual |
| **Vagas ocupadas** | `occupiedSpots` | Contagem de participações em `PENDENTE_PAGAMENTO`, `CONFIRMADA` ou `PRESENTE` | Confirmados: pendente de pagamento ocupa vaga mas não está confirmado |
| **Vagas disponíveis** | `availableSpots` | `capacity - occupiedSpots` | Vagas restantes na fila — fila não tem limite |
| **Prazo de inscrição** | `enrollmentDeadline` | Instante após o qual nenhuma participação nova é criada, nem na fila ([RN-009](04-regras-de-negocio.md)) | Início do evento, que pode ser depois |
| **Prazo de cancelamento** | `cancellationDeadline` | Instante que separa desistência (com reembolso conforme política) de no-show | Prazo de inscrição |
| **Pergunta customizada** | `CustomQuestion` | Pergunta definida pelo organizador, respondida **após** a reserva da vaga (máx. 5) | Campo obrigatório do cadastro: pergunta nunca bloqueia a vaga ([RN-025](04-regras-de-negocio.md)) |

## 4. Participação e vagas

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Participação** | `Participation` | Entidade que liga um usuário a um evento e guarda todo o ciclo de vida da relação: estado, posição na fila, respostas, prazos. Não é tabela de junção — tem identidade e história | "Inscrição" como ação. A ação cria a participação; a participação é a coisa. Ver [ADR-0004](adr/0004-participacao-como-entidade-propria.md) |
| **Inscrever-se** | `enroll` | Ação de criar uma participação ocupando vaga | Confirmar: em evento pago, inscrever-se não confirma |
| **Pendente de pagamento** | `StatusParticipacao.PENDENTE_PAGAMENTO` | Vaga reservada, aguardando pagamento dentro da janela. **Ocupa vaga** | Lista de espera, que não ocupa vaga |
| **Confirmada** | `StatusParticipacao.CONFIRMADA` | Participação válida com direito a ingresso e check-in | Presente, que exige check-in realizado |
| **Lista de espera** | `waitlist` / `StatusParticipacao.LISTA_ESPERA` | Fila FIFO de quem quer entrar em evento lotado. Não ocupa vaga | "Fila de espera do pagamento": não existe |
| **Posição na fila** | `waitlistPosition` | Inteiro ≥ 1 indicando a ordem na lista de espera. Avança quando alguém à frente sai | Ordem de inscrição no evento |
| **Oferta pendente** | `StatusParticipacao.OFERTA_PENDENTE` | Vaga liberada e oferecida ao primeiro da fila, com janela de confirmação. A vaga fica reservada | Pendente de pagamento: aqui o aluno ainda não aceitou |
| **Promoção** | `promoteFromWaitlist` | Processo automático que oferece uma vaga liberada ao primeiro da fila ([RN-007](04-regras-de-negocio.md)) | Promoção comercial / desconto — não existe no produto |
| **Expirada** | `StatusParticipacao.EXPIRADA` | Participação encerrada por prazo vencido (pagamento não feito ou oferta não confirmada) | Cancelada, que é ação humana |
| **Cancelada** | `StatusParticipacao.CANCELADA` | Participação encerrada por ação do aluno, do organizador ou por cancelamento do evento | Recusada — o Campus não recusa inscrição, direciona para a fila |
| **Ausente** | `StatusParticipacao.AUSENTE` | Participação confirmada sem check-in até o fim da janela. Base da taxa de comparecimento | Cancelada: ausente é quem tinha vaga e não apareceu |
| **No-show** | — (usar **ausente**) | Termo em inglês evitado na UI e na documentação | — |

## 5. Pagamento

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Pagamento** | `Payment` | Registro da cobrança de uma participação: método, valor, status e identificador da transação no gateway | Preço do evento, que é atributo do evento |
| **Gateway de pagamento** | `PaymentGateway` | Serviço externo que processa Pix e cartão. Ator externo nos casos de uso. Abstraído por interface ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)) | Banco: o Campus não movimenta conta |
| **Janela de pagamento** | `paymentWindow` | Intervalo entre reservar a vaga e o pagamento expirar (padrão 60 min) | Prazo de inscrição do evento |
| **Notificação do gateway** | `paymentWebhook` | Aviso assíncrono do gateway de que a cobrança mudou de status. **Única** fonte de confirmação de pagamento ([RN-014](04-regras-de-negocio.md)) | Notificação do app ao usuário |
| **Idempotência** | `idempotency` | Propriedade de uma operação que, repetida com a mesma entrada, produz o mesmo resultado. Exigida no processamento de notificação de pagamento (RNF-014) | Retentativa: idempotência é o que torna a retentativa segura |
| **Reembolso** | `refund` | Devolução total ou parcial do valor pago, conforme [RN-013](04-regras-de-negocio.md) | Estorno técnico de pagamento que chegou fora da janela ([RN-012](04-regras-de-negocio.md)) |

## 6. Check-in e ingresso

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Ingresso** | `ticket` | Representação visual da participação confirmada, com QR Code de check-in. É a materialização do cartão-ingresso picotado da marca | Comprovante de pagamento |
| **Check-in** | `checkIn` | Ação de validar o ingresso na entrada do evento, registrando presença | Confirmação de inscrição, que acontece antes |
| **Presença** | `Attendance` | Fato registrado de que a pessoa entrou no evento: horário e quem validou. Imutável, 1:1 com participação | Participação confirmada, que é direito de entrar, não prova de que entrou |
| **Token do QR** | `checkInToken` | Cadeia assinada (HMAC) contida no QR Code, com validade limitada e uso único ([RN-017](04-regras-de-negocio.md)) | ID da participação, que não é secreto |
| **Taxa de comparecimento** | `attendanceRate` | `presentes / (confirmadas + presentes)` no fim do evento. Métrica de sucesso do produto | Taxa de ocupação (`ocupadas / capacidade`), que é sobre vagas |

## 7. Feed social

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Feed** | `feed` | Lista cronológica de publicações dos eventos que o usuário tem permissão de ver | Lista de eventos (`/eventos`), que mostra eventos, não conteúdo |
| **Publicação** | `Post` | Foto com legenda associada a um evento, publicada por quem esteve nele ([RN-019](04-regras-de-negocio.md)) | Evento; e não é "post" na UI em português |
| **Comentário** | `Comment` | Texto de resposta a uma publicação, com autor e horário | Avaliação do evento — não existe na v1 |
| **Moderação** | `moderation` | Remoção de publicação ou comentário por quem tem competência, com motivo registrado ([RN-020](04-regras-de-negocio.md)) | Exclusão pelo autor, que não exige motivo |
| **Memória do evento** | — (conceito) | Efeito de ter as fotos e comentários de um evento reunidos e permanentes. Um dos quatro problemas do briefing | Arquivo/backup de mídia |

## 8. Notificações

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Notificação** | `Notification` | Aviso dirigido a um usuário sobre algo que mudou e afeta a decisão dele: vaga liberada, pagamento confirmado, evento alterado ou cancelado | Notificação do gateway (`paymentWebhook`), que é máquina para máquina |
| **Central de notificações** | `notificationCenter` | Tela que lista as notificações com estado lida/não lida | Feed, que é conteúdo social |

## 9. Design e front-end

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Design token** | token | Valor nomeado de design (cor, fonte, raio, sombra, espaçamento) declarado uma vez em `tailwind.config.ts` e consumido por nome. Fonte única de verdade visual | Variável CSS solta: token tem nome semântico e equivalente no Figma |
| **Cartão-ingresso picotado** | `TicketCard` | Componente de assinatura da marca: borda tracejada com recortes circulares laterais, imitando ingresso destacável | `EventListItem`, que é a linha compacta da lista de eventos |
| **Badge de alcance** | `ScopeBadge` | Etiqueta que mostra o alcance do evento (minha turma / meu curso / faculdade) | `Chip`, que é filtro clicável |
| **Repositório (camada)** | `EventsRepository`, `AuthRepository`... | Interface que isola as telas da origem dos dados. No CP6 tem **duas** implementações — mock e API real — e nenhuma tela sabe qual está em uso (RNF-016) | Repositório Git |
| **MSW** | Mock Service Worker | Biblioteca que intercepta chamadas HTTP no navegador, para o app "falar HTTP" desde o CP5 ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)) | Mock em memória: o MSW é a camada de rede acima dele |
| **Fonte de dados** | `VITE_DATA_SOURCE` | Qual implementação de repositório responde: `mock` (em memória, no navegador) ou `api` (a API real sobre PostgreSQL). É uma variável de ambiente, e o valor é declarado como união de dois literais para erro de digitação não passar pelo `tsc` | Ambiente (`NODE_ENV`): a fonte é *de onde vem o dado*, não *onde o código roda* |

## 9b. Monorepo, build e operação — termos do CP6

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Monorepo** | — | Um repositório com vários pacotes versionados juntos. Aqui são três: `packages/shared`, `app` e `api` ([ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md)) | Monólito: monorepo é sobre **onde o código mora**; monólito é sobre **como ele é implantado**. O Campus é um monorepo com três artefatos implantáveis |
| **Workspace** | `workspaces` no `package.json` da raiz | Um pacote dentro do monorepo, com `package.json` próprio, resolvido por nome (`@campus/shared`) e instalado por um único `npm ci` na raiz | Pasta comum: workspace tem identidade de pacote, e ferramenta usada por mais de um **não** pode ser declarada em dois |
| **Pacote compartilhado** | `@campus/shared` | O workspace com os tipos, as 13 funções de regra e os schemas Zod que o app e a API usam. Única dependência de runtime: `zod`. A fronteira é verificada por `scripts/check-contrato.mjs` | Biblioteca utilitária: aqui só entra o que **atravessa a rede** ou é regra de negócio |
| **Migração** | `migration` | Arquivo SQL versionado que leva o banco de um estado ao seguinte. A `0001_init` tem a primeira metade gerada e a segunda **escrita à mão**, com os `CHECK` e os índices parciais que o Prisma não declara | *Migrate* de dados: aqui migração é mudança de **esquema**, não de conteúdo |
| **Seed** | `seed` | Carga de dados fictícios coerentes. No CP6 são **dois**, com o mesmo conteúdo: `app/src/mocks/seed.ts` para a fonte mock e `api/src/seed/` para o banco | Dado de teste unitário, que é construído por caso |
| **`SELECT … FOR UPDATE`** | — | Leitura que **trava a linha** até o fim da transação. É o que serializa quem disputa a última vaga: a segunda requisição espera, lê `ocupadas` já atualizado e vai para a fila (RN-004, RNF-013) | Transação: transação delimita o conjunto de escritas; a trava é o que impede a corrida **dentro** dela. Também não confundir com travar a **tabela** — a trava é da linha do evento, e eventos diferentes não se bloqueiam |
| **Restrição `CHECK`** | `ck_*` | Condição que o PostgreSQL exige de toda linha, recusando a escrita quando ela falha. São 20, e a de `ocupadas <= capacidade` é a última linha de defesa contra vender vaga que não existe | Validação de entrada: o `CHECK` vale mesmo quando o código está errado. É por isso que ele existe |
| **Índice único parcial** | `ux_*` | `UNIQUE` com cláusula `WHERE`. É o que torna "uma participação **ativa** por aluno e evento" verdadeiro sem proibir a reinscrição depois de cancelar (RN-015, RN-027) | `UNIQUE` total, que proibiria o histórico |
| **Argon2id** | `argon2` | Função de derivação de senha, com salt por usuário e parâmetros gravados junto do hash. É o que `usuario.senha_hash` guarda (RNF-010) | Criptografia: hash de senha não é reversível, e não existe "descriptografar a senha" |
| **Access token** | `accessToken` | JWT de vida curta (15 min) que autentica cada requisição no cabeçalho `Authorization: Bearer` | Refresh token, que não autentica requisição nenhuma |
| **Refresh token** | `refreshToken` | Cadeia opaca e de vida longa (30 dias) que serve **só** para obter um par novo em `POST /auth/refresh`. É **revogável**, e o banco guarda o hash dele — nunca o token (RNF-020) | Access token; e não confundir "revogável" com "expirável": expirar é o tempo passar, revogar é alguém decidir |
| **Healthcheck** | `healthcheck` | Comando que o Docker executa para decidir se um serviço está **pronto**, e não apenas iniciado. No banco é `pg_isready`; na API é uma chamada a `/api/health` | `depends_on` sozinho, que espera o container **iniciar** — e um Postgres iniciado ainda não aceita conexão |
| **GHCR** | — | *GitHub Container Registry* (`ghcr.io`): registro de imagens de container do GitHub, alternativa ao Docker Hub para publicar as imagens do projeto | Registro npm, que publica pacote e não imagem |

## 10. Processo e avaliação

| Termo | Em código | Definição | Não confundir com |
|---|---|---|---|
| **Checkpoint (CP4/CP5/CP6)** | — | Entrega avaliada da disciplina. Cada uma fecha uma sprint | Sprint: a sprint é o período, o checkpoint é a entrega |
| **MoSCoW** | — | Priorização em Must / Should / Could / Won't ([`03-escopo.md`](03-escopo.md)) | Estimativa em pontos, que é esforço |
| **Definition of Ready (DoR)** | — | Condições para um card entrar na sprint ([`CONTRIBUTING.md`](../CONTRIBUTING.md)) | DoD |
| **Definition of Done (DoD)** | — | Condições para um card ir para Done | Critério de aceite, que é específico do card |
| **Critério de aceite** | — | Condição verificável em `Dado / Quando / Então` que prova que um requisito foi cumprido | Regra de negócio, que é invariante do domínio |
| **ADR** | — | *Architecture Decision Record*: registro de decisão arquitetural com contexto, alternativas e consequências ([`adr/`](adr/README.md)) | Documentação de arquitetura ([`08-arquitetura.md`](08-arquitetura.md)), que descreve o estado, não a decisão |
| **RF / RNF / RN / RFX** | — | Requisito funcional / não funcional / regra de negócio / requisito recusado | — |
| **UC** | — | Caso de uso ([`05-modelagem/01-casos-de-uso.md`](05-modelagem/01-casos-de-uso.md)) | RF: um caso de uso normalmente cobre vários RFs |
| **CT** | — | Caso de teste ([`11-plano-de-testes.md`](11-plano-de-testes.md)) | Critério de aceite, que vive no requisito |

## 11. Termos proibidos

Palavras que **não** devem aparecer em documentação, UI nem código deste projeto, e o
que usar em vez delas.

| Não use | Use | Por quê |
|---|---|---|
| "Inscrição" como entidade | **Participação** (`Participation`) | A entidade tem ciclo de vida, não é um registro de ato |
| "Reserva" | **Participação** em `PENDENTE_PAGAMENTO` | "Reserva" sugere entidade separada da participação |
| "Fila de pagamento" | **Janela de pagamento** | Não existe fila para pagar |
| "Evento privado" | **Evento de alcance turma** (ou curso) | Todo evento tem alcance; nenhum é privado no sentido de convite individual |
| "Post" na UI | **Publicação** | UI em português |
| "Ticket" na UI | **Ingresso** (o componente em código é `TicketCard`) | UI em português; código em inglês |
| "No-show" | **Ausente** | UI em português |
| "Usuário premium" / "plano" | — | Não existe monetização de usuário na v1 ([`07-pitch.md`](07-pitch.md) trata como hipótese futura) |
| "Admin" sem escopo | **Admin de Curso** ou **Admin de Faculdade** | Escopo é parte do papel ([RN-024](04-regras-de-negocio.md)) |
