# Roteiro do vídeo do CP5 — 2 minutos de software rodando

**Responsável pelo roteiro:** João Viviani Baldini (RM558596), Product Owner ·
**Duração alvo:** 2:00 (tolerância −5 s / +0 s) ·
**Deck de apoio:** [`20-video-cp5-slides.html`](20-video-cp5-slides.html) ·
**Ambiente e usuários de teste:** [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) ·
**Antecessor:** [`15-video-roteiro.md`](15-video-roteiro.md) — mesmo formato, conteúdo
oposto: o CP4 vendia a ideia, o CP5 mostra o software funcionando.

---

## 1. Premissa e objetivo

**Premissa:** o vídeo é uma gravação de tela do aplicativo rodando, não uma apresentação
sobre o aplicativo. Fala serve a clique; slide serve a corte.

**O que o avaliador tem de concluir em 2:00:** que existe um aplicativo funcionando ponta
a ponta — entrar com e-mail institucional, ver só o que alcança a própria turma, esperar
na fila de um evento lotado, receber uma vaga liberada com prazo, pagar, receber ingresso
e passar na porta uma única vez — e que as regras que ele viu na tela são as mesmas
escritas nos documentos dos checkpoints anteriores.

---

## 2. Regras de escrita do texto falado

Herdadas de [`15-video-roteiro.md`](15-video-roteiro.md), com duas mudanças que o CP5
impõe.

1. **Orçamento de 2,5 palavras por segundo.** Fala clara em português. Bloco de 20 s tem
   50 palavras, não 80. A conferência linha por linha está na seção 5.
2. **Ritmo de demonstração é mais lento que ritmo de pitch.** O texto deste roteiro fica
   em 2,15 palavras por segundo de propósito: a folga é o tempo do clique aterrissar. Quem
   fala rápido demais narra o que a tela ainda não mostrou.
3. Frase curta. Uma ideia por frase. Nenhuma oração subordinada longa.
4. **Nenhum número de requisito, de regra ou de tela é dito em voz alta.** "RF-024",
   "RN-007" e "MSW" aparecem em documento, nunca na boca. `QR Code` e `check-in` ficam,
   porque é assim que o público chama.
5. **Nenhuma frase lida do slide ou da tela.** O que está escrito é diferente do que é
   falado.
6. **Todo número falado vem do seed** —
   [`../app/src/mocks/seed.ts`](../app/src/mocks/seed.ts), conferido item por item na
   seção 6.1. Os que este roteiro usa: 80 de 80 vagas, sétima posição com seis pessoas na
   frente, janela de 24 h da oferta, R$ 45,00 da Festa Junina e 12 rotas do aplicativo.
7. **Número que o seed deixa correndo não é dito, é mostrado.** O relógio do pagamento
   abre em torno de 42 min e o da oferta em torno de 18 h, porque o seed já gastou parte
   das janelas de propósito (seção 6.1). A fala diz "o prazo está correndo na tela"; o
   número exato fica na tela, onde não pode divergir.
8. **Arquitetura cabe em uma frase.** Ela está no bloco 5, dentro do fluxo de pagamento, e
   em nenhum outro lugar. Não há bloco de camadas, nem diagrama, nem editor de código.

---

## 3. Storyboard cronometrado

Legenda de captura: **[T]** gravação de tela do app · **[X]** corte seco · **[Z]** zoom ou
recorte na gravação · **[S]** slide do deck de apoio.

Blocos de 12 a 20 s. A soma das durações é exatamente **120 s** (conferência na seção 5).

| Tempo | Quem fala | O que diz (fala literal) | O que aparece na tela (captura) |
|---|---|---|---|
| 0:00–0:12 | João Viviani Baldini | "Boa tarde. Somos o grupo do Campus. Na entrega anterior mostramos a ideia; agora o aplicativo roda. Em dois minutos: login, fila, vaga liberada, pagamento, ingresso e porta." | **[S]** capa do deck por 3 s, **[X]** e já a tela de login em `/login`, com o campo "E-mail institucional" e a faixa "Entrar como · demonstração" |
| 0:12–0:28 | Lucas Zolla | "Lucas Zolla, requisitos. Marina entra com o e-mail da faculdade: sem ele, não existe conta. O topo da tela diz o vínculo dela — Engenharia de Computação, turma 3ESPX. O feed mostra só o que alcança esse vínculo." | **[T]** toque no cartão **Marina Alves**; cai no feed `/` com a linha "ENGENHARIA DE COMPUTAÇÃO · TURMA 3ESPX", a saudação com o primeiro nome, a faixa "Em destaque" e as publicações |
| 0:28–0:46 | Ana Luiza Dourado | "Ana Luiza, design. O Hackathon está lotado: oitenta de oitenta vagas. A tela não recusa, ela informa — Marina é a sétima da fila, seis pessoas na frente, e vinte e quatro horas para confirmar quando abrir vaga." | **[T]** "ver tudo" → `/eventos` com os chips Minha turma · Meu curso · Faculdade; toque no Hackathon → `/eventos/evt-002` com **[Z]** na barra "80/80 · 7 na fila", no bloco "Você é o 7º da fila" e no botão com o mesmo rótulo |
| 0:46–1:04 | Ronaldo Veloso Filho | "Ronaldo, modelagem. Aqui a vaga abriu: alguém desistiu e a fila andou. A oferta é da Marina, com prazo na tela. Participação não é campo do evento, é entidade com estado — e o estado acabou de virar confirmada." | **[X]** para `/eventos/evt-012` (Visita técnica, 25/25): bloco coral **"Abriu uma vaga para você"** com o relógio da oferta; toque em **"Confirmar vaga"**; **[Z]** no selo de estado que passa a confirmada e no botão que vira "Ver meu ingresso" |
| 1:04–1:22 | Lucas Baraldi | "Lucas Baraldi, arquitetura. Outra inscrição espera pagamento: quarenta e cinco reais, prazo correndo na tela. A cobrança é simulada, e a tela diz isso. Aviso repetido não cobra de novo. No próximo checkpoint entra o provedor real, sem mudar tela." | **[X]** para `/eventos/evt-005` (Festa Junina, R$ 45,00): bloco "Sua vaga está reservada" com relógio; **"Pagar agora"** → `/pagamento/par-052`; aba **Pix** → "Gerar cobrança Pix"; **[Z]** no painel tracejado "Simulação do gateway" e nos botões **Confirmar** e **Duplicar** |
| 1:22–1:42 | Vitor Pantarotto | "Vitor, qualidade e processo. O ingresso tem QR e código legível. Na porta, quem valida é o organizador: código da Marina, check-in confirmado, com nome e turma. Agora o teste que importa — o mesmo código de novo. Ingresso já utilizado, com a hora." | **[T]** `/ingresso/par-130` (Maratona de estudos) com QR, `CMP-3ESPX-0626` e o numérico `84110626`; **[X]** para o login, cartão **Rafael Souza**, `/eventos/evt-013` → **"Abrir o check-in"**; "Janela de check-in aberta"; cola o código → aceito, com nome e turma; cola de novo → **[Z]** em "Ingresso já utilizado às HH:MM" |
| 1:42–2:00 | João Viviani Baldini | "Doze rotas, testes automatizados verdes, pacote dentro do orçamento. O Campus já nasce sabendo para quem o evento é: sua turma, seu curso, sua faculdade. Falta o servidor de verdade — é o próximo checkpoint. Obrigado." | **[S]** slide "O que está funcionando" por 6 s, **[X]** slide de próximos passos por 6 s, **[X]** slide de encerramento com a marca e o endereço do repositório, parado até 2:00 |

### 3.1 Direção, bloco por bloco

**Bloco 1 (0:00–0:12).** A capa do deck fica 3 s e sai. Se a capa durar mais, o vídeo
começa como apresentação — e o critério avaliado é demonstração. Não leia a capa.

**Bloco 2 (0:12–0:28).** O cartão de demonstração entra e sai em um toque, mas a frase
sobre o e-mail institucional é dita com o campo em quadro: é a regra de cadastro
aparecendo. Diga "3ESPX" letra por letra, sem pressa. Não narre o clique; narre o
resultado.

**Bloco 3 (0:28–0:46).** O zoom vem preparado, não durante. A frase "a tela não recusa,
ela informa" precisa cair junto com o bloco da fila em quadro — é o único sincronismo
exigido no vídeo. Ensaie esse par.

**Bloco 4 (0:46–1:04).** O bloco da oferta tem relógio próprio: espere o quadro estabilizar
antes de tocar em "Confirmar vaga", senão o corte pega a tela em transição. Não leia o
prazo em voz alta.

**Bloco 5 (1:04–1:22).** É o bloco mais denso: quatro toques em 18 s. A mão fica no mouse
e cada frase corresponde a um toque. O painel de simulação é mostrado de propósito — ele
diz na própria tela que não existe provedor de pagamento no CP5. Se o tempo apertar, toque
só em **Confirmar** e deixe **Duplicar** para a pergunta da banca.

**Bloco 6 (1:22–1:42).** Copie o código numérico do ingresso antes da tomada (seção 6.3):
na gravação são dois `Ctrl+V` e dois envios. A segunda recusa é o clímax do vídeo — faça
meio segundo de pausa antes de "de novo".

**Bloco 7 (1:42–2:00).** Volta ao deck, três slides de 6 s. O one-liner é o de
[`07-pitch.md`](07-pitch.md) §1, sem trocar palavra. Corte seco em 2:00.

---

## 4. Escalação — quem fala cada bloco

Todos os 6 integrantes falam. A regra é a mesma do CP4: **quem responde pelo artefato
apresenta o artefato.** Papéis conforme
[`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) §1.

| Bloco | Tempo | Duração | Quem fala | RM | Papel real | Por que essa pessoa fala isso |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:12 | 12 s | João Viviani Baldini | RM558596 | Product Owner | Abre declarando o que mudou do CP4 para o CP5 — é decisão de produto, não técnica |
| 2 | 0:12–0:28 | 16 s | Lucas Zolla | RM557952 | Analista de Requisitos | Escreveu o requisito de e-mail institucional e a regra de alcance; fala do que especificou aparecendo na tela |
| 3 | 0:28–0:46 | 18 s | Ana Luiza Dourado | RM558793 | UX/UI Designer | O bloco é sobre o que a interface comunica: ocupação, posição na fila e o botão que muda de rótulo em vez de recusar depois |
| 4 | 0:46–1:04 | 18 s | Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | Modelou `Participacao` como entidade com estados; narra a transição de oferta para confirmada acontecendo na tela |
| 5 | 1:04–1:22 | 18 s | Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | Cobrança simulada, aviso idempotente e a fronteira de troca por provedor real são decisão dele |
| 6 | 1:22–1:42 | 20 s | Vitor Pantarotto | RM554961 | Scrum Master / QA | É verificação: o caso de teste de uso único do ingresso, executado ao vivo |
| 7 | 1:42–2:00 | 18 s | João Viviani Baldini | RM558596 | Product Owner | Fecha com o one-liner, que é artefato dele |

Seis integrantes, sete blocos (João abre e fecha). Cada pessoa começa dizendo **primeiro
nome e papel em duas palavras** — resolve o critério de divisão de trabalho sem gastar
tempo com apresentação formal.

---

## 5. Conferência de tempo e de palavras

Contagem de palavras: sequências separadas por espaço que contenham letra ou número.
"e-mail" e "check-in" contam como uma palavra, que é como se lê em voz alta.

| Bloco | Tempo | Duração | Orçamento (2,5 pal/s) | Palavras escritas | Folga | Ritmo real |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:12 | 12 s | 30 | 28 | 2 | 2,33 pal/s |
| 2 | 0:12–0:28 | 16 s | 40 | 37 | 3 | 2,31 pal/s |
| 3 | 0:28–0:46 | 18 s | 45 | 37 | 8 | 2,06 pal/s |
| 4 | 0:46–1:04 | 18 s | 45 | 38 | 7 | 2,11 pal/s |
| 5 | 1:04–1:22 | 18 s | 45 | 40 | 5 | 2,22 pal/s |
| 6 | 1:22–1:42 | 20 s | 50 | 43 | 7 | 2,15 pal/s |
| 7 | 1:42–2:00 | 18 s | 45 | 35 | 10 | 1,94 pal/s |
| **Total** | **0:00–2:00** | **120 s** | **300** | **258** | **42** | **2,15 pal/s** |

Soma das durações: 12 + 16 + 18 + 18 + 18 + 20 + 18 = **120 segundos**.
Soma das palavras: 28 + 37 + 37 + 38 + 40 + 43 + 35 = **258**, ou 129 palavras por minuto.

Nenhum bloco estoura o orçamento, e a folga total de 42 palavras (cerca de 16 s) é o tempo
das transições de tela. Em vídeo de demonstração essa folga é obrigatória: sem ela a fala
termina antes de o clique aparecer.

### 5.1 Divisão do tempo entre tela do app e apoio

| O que está em quadro | Segundos | Onde |
|---|---|---|
| Tela do app em uso | **99 s** | 0:03–1:42 |
| Slide do deck | 21 s | 0:00–0:03 (capa) e 1:42–2:00 (números, próximos passos, encerramento) |

99 dos 120 segundos são o aplicativo rodando — acima do mínimo de 90 s que o grupo fixou.
Nenhum segundo é editor de código, terminal, diagrama ou quadro de tarefas.

---

## 6. Estado da demo: o que o seed já entrega e o que exige cuidado

**Nenhum estado precisa ser preparado com cliques.** Os quatro momentos difíceis do vídeo
— fila com posição, oferta de vaga com prazo, cobrança pendente e evento com janela de
check-in aberta — já existem no seed, cada um em um evento próprio. O que exige cuidado é
outro: **em que conta cada bloco é gravado** (seção 6.2) e **não recarregar a página no
meio de uma tomada** (seção 6.4).

### 6.1 O que o vídeo mostra, e onde isso está no seed

Tudo conferido em [`../app/src/mocks/seed.ts`](../app/src/mocks/seed.ts).

| Bloco | O que aparece | Dado real do seed | Identificador |
|---|---|---|---|
| 2 | Usuária da demo | Marina Alves, `marina.alves@fiap.com.br`, turma 3ESPX, Engenharia de Computação | `usr-001`, `tur-001`, `cur-001` |
| 2 | Senha de todos os usuários de teste | `campus123` | `SENHA_DEMO` em [`../app/src/mocks/support.ts`](../app/src/mocks/support.ts) |
| 3 | Evento lotado | Hackathon Campus 48h, 80 de 80 vagas, gratuito, alcance de faculdade | `evt-002` |
| 3 | Fila de 7 e a posição da Marina | 7 participações em lista de espera, posições 1 a 7; a 7ª é dela | `par-020` a `par-026` |
| 4 | Oferta de vaga em curso | Visita técnica à fábrica da Bosch, 25 de 25 vagas; Gabriela desistiu e a vaga foi oferecida à Marina | `evt-012`, `par-121` (cancelada), `par-122` (oferta) |
| 4 | Quem continua na fila | Caio Ferreira, posição 1 | `par-123` |
| 5 | Cobrança pendente | Festa Junina Fora de Época, R$ 45,00, 287 de 300 vagas | `evt-005`, `par-052` |
| 6 | Evento **em andamento**, com janela de check-in aberta | Maratona de estudos para a prova de Algoritmos, turma 3ESPX, 12 de 20 vagas, gratuito, começou 1 h atrás e termina em 3 h | `evt-013` |
| 6 | Ingresso da Marina nesse evento | Confirmada; código legível `CMP-3ESPX-0626`, numérico `84110626` | `par-130` |
| 6 | Alguém que já passou pela porta | Rafael Souza, presente; é a recusa por ingresso repetido, se você usar o código dele | `par-133`, numérico `84110629` |

Três conferências rápidas antes de gravar, porque são exatamente os números que a fala
diz: `/eventos/evt-002` mostra **80/80** e **7 na fila**; o bloco da fila diz **"Você é o
7º da fila"** com **"6 pessoas na sua frente"**; e `/eventos/evt-013` abre com **"Janela de
check-in aberta"**.

**Dois relógios que o seed deixa correndo, e por isso não são falados.** A janela de
pagamento de `par-052` nasce com cerca de **42 min** restantes, não com os 60 min da regra;
a oferta de `par-122` nasce com cerca de **18 h**, não com as 24 h da regra. É deliberado —
uma janela cheia parece congelada, e o objetivo é mostrar prazo correndo. A regra completa
aparece no texto da própria tela; a fala só diz que o prazo está correndo.

### 6.2 Uma troca de conta, e por que ela é obrigatória

Os blocos 2 a 5 são gravados como **Marina Alves**. O bloco 6 precisa das duas pontas:

1. **Como Marina**, para abrir o ingresso — só o dono da participação obtém o próprio
   ingresso.
2. **Como Rafael Souza**, para validar na porta. Validar check-in exige ser organizador do
   evento ou administrador do escopo
   ([`../app/src/domain/permissions.ts`](../app/src/domain/permissions.ts)). `evt-013` é de
   alcance **turma**, então não tem administrador de curso nem de faculdade competente:
   **só Rafael**, que o organiza, abre aquele painel. Entrar como outra pessoa devolve
   "Você não valida o check-in deste evento".

A troca custa pouco porque a tela de login tem a faixa **"Entrar como · demonstração"**:
é um toque no cartão do Rafael, sem digitar. Fora do bloco 6, o vídeo não troca de conta.

### 6.3 Preparo de 2 minutos, antes de gravar o bloco 6

1. Como Marina, abra `/perfil` e toque na Maratona de estudos, ou vá direto a
   `/ingresso/par-130`.
2. **Selecione e copie o código numérico de 8 dígitos** impresso sob o código legível
   (`84110626`).
3. Deixe a tela de login pronta em outra aba, se preferir cortar sem mostrar a saída.

Na tomada, são dois `Ctrl+V` e dois envios: o primeiro devolve o check-in aceito com nome
e turma, o segundo devolve "Ingresso já utilizado às HH:MM".

O painel também traz a lista **"Códigos deste evento para testar"**, com um toque para
preencher o campo. Use-a como reserva se a área de transferência falhar: ela mostra o
código de quem já entrou, com o efeito esperado escrito ao lado. O leitor aceita as três
formas do mesmo ingresso — token do QR, numérico de 8 dígitos e legível
`CMP-3ESPX-<4 dígitos>` ([`../app/src/domain/ticketToken.ts`](../app/src/domain/ticketToken.ts)).

### 6.4 A regra de ouro: não recarregue no meio de uma tomada

O banco do mock vive em memória ([`../app/src/mocks/db.ts`](../app/src/mocks/db.ts)):
**recarregar a página devolve o seed exato**. Isso tem duas consequências opostas e
igualmente importantes.

- Dentro de uma tomada, um F5 desfaz o que acabou de ser demonstrado — a oferta volta a
  pendente, o pagamento volta a aguardando, o check-in desaparece.
- Entre tomadas, um F5 é o botão de "recomeçar do zero", e é ele que faz o plano B da
  seção 8 funcionar.

Uma coisa **não** volta: a sessão, que fica no `sessionStorage`. Para voltar à tela de
login, saia pelo aplicativo em vez de recarregar.

### 6.5 Nota de divergência entre documentos

A seção 5 de [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) afirma que o check-in não
pode ser concluído porque todo evento do seed começa a 11 dias ou mais. **Isso valia antes
de `evt-013` entrar no seed.** Com o evento em andamento, o check-in é aceito, e é o que o
bloco 6 grava. Quem for atualizar aquele documento tem aqui o dado conferido; quem gravar
o vídeo segue este roteiro.

---

## 7. Instruções de gravação

### 7.1 Imagem e som

- Resolução **1920 × 1080**, **30 fps**, arquivo `.mp4`.
- Navegador em tela cheia (`F11`), **zoom da página em 125%**. O app é desenhado para
  celular e usa coluna centralizada no desktop: a 100% o texto fica pequeno em projeção.
- Cursor grande e realce de clique ligados (Windows: Configurações → Acessibilidade →
  Ponteiro do mouse).
- Modo de foco ligado. Nenhuma notificação pode entrar em quadro.
- Tema claro. Os tokens de cor foram auditados em tema claro —
  [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) §4.
- Fone **com microfone**, teste de 10 s antes de cada bloco, um bloco por arquivo
  (`bloco-5-pagamento.mp4`).

### 7.2 O que abrir antes, e nada além disso

1. O app em `http://localhost:5173` (porta padrão do Vite; `npm run dev` em `app/` —
   procedimento completo em [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) §2).
2. [`20-video-cp5-slides.html`](20-video-cp5-slides.html) em uma segunda aba, na capa.
3. Nada mais. Sem editor, sem terminal, sem e-mail, sem mensageiro, sem aba pessoal.

### 7.3 Qual conta em qual bloco

Todas usam a senha `campus123`, e todas têm cartão na faixa de demonstração do login.

| Bloco | Conta | E-mail | Por que essa conta |
|---|---|---|---|
| 2 a 5 e início do 6 | Marina Alves | `marina.alves@fiap.com.br` | É a persona participante: fila do Hackathon, oferta na Visita técnica, cobrança na Festa Junina e ingresso na Maratona |
| Fim do bloco 6 | Rafael Souza | `rafael.souza@fiap.com.br` | Organiza a Maratona (`evt-013`): é a única conta que abre aquele painel de check-in |

### 7.4 Ordem de gravação

Por bloco, nunca em tomada única. Do mais difícil para o mais fácil:

1. **Bloco 6** (ingresso e porta). É o clímax e o único que troca de conta. Grave primeiro,
   com o estado do seed intacto.
2. **Bloco 5** (pagamento). Quatro toques em 18 s.
3. **Bloco 4** (oferta de vaga).
4. **Bloco 3** (evento lotado e fila).
5. **Bloco 2** (login e feed).
6. **Blocos 1 e 7** (capa e fecho) — os que não dependem de estado.

Regra que economiza tomada: **um F5 antes de cada bloco**. Como cada bloco usa um evento
diferente, recarregar entre blocos devolve o estado exato que aquele bloco espera, sem
arrastar o efeito do bloco anterior.

Máximo de **3 tomadas** por bloco. Se precisar da quarta, o texto está longo — corte
palavra, não grave de novo.

---

## 8. Plano B — se um fluxo travar durante a gravação

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Botão principal com rótulo inesperado | O estado da participação mudou numa tomada anterior | **F5.** A página recarregada devolve o seed exato, e o bloco recomeça |
| "Abriu uma vaga para você" não aparece em `evt-012` | A oferta foi confirmada ou recusada numa tomada anterior | **F5.** A oferta é recriada com prazo cheio a cada carga da página |
| "Janela de check-in fechada" em `evt-013` | A tomada demorou mais que a janela, ou o relógio da máquina está errado | **F5**: o início de `evt-013` é recalculado a partir de agora, e a janela reabre |
| "Você não valida o check-in deste evento" | O painel foi aberto na conta errada | Saia e entre pelo cartão do **Rafael Souza**: `evt-013` é de turma, e só o organizador valida |
| "Ingresso não encontrado" ao abrir `/ingresso/par-130` | O ingresso foi aberto em outra conta | Só o dono vê o próprio ingresso: volte para a Marina |
| A cobrança simulada não confirma | O pagamento já havia sido confirmado antes | Aproveite: é a idempotência funcionando. Grave a tela como está, ou dê F5 e recomece o bloco |
| Nada carrega, tela em esqueleto | O servidor de desenvolvimento caiu | Pare a gravação. Reinicie `npm run dev`, aguarde a primeira tela e recomece o bloco |
| Um fluxo inteiro indisponível na hora da gravação | Defeito descoberto no dia | Corte o bloco e redistribua os segundos entre os vizinhos, mantendo os 120 s. A ordem de sacrifício é: bloco 4 (oferta), depois bloco 5 (pagamento). Fila e check-in **não** saem: são o diferencial do produto |

Regra geral do plano B: **nunca conserte estado na frente da câmera.** Corte, dê F5, grave
de novo. Vídeo com tentativa e erro em quadro custa mais nota que vídeo com um fluxo a
menos.

---

## 9. Checklists

### 9.1 Pré-gravação

- [ ] `npm test` em `app/` passa, e o número de testes do slide "O que está funcionando" é
      o número que acabou de aparecer no terminal. Medição no fecho do CP5: **293 testes em
      17 arquivos, todos verdes**, mais **6 casos E2E** (`npm run test:e2e`).
- [ ] `npm run check:size` em `app/` passa, e o valor do pacote no slide é o medido.
      Medição no fecho do CP5: **234,00 de 250 KB gzip**.
- [ ] `npm run test:coverage` em `app/` roda, e a cobertura do slide é a medida. Medição
      desta redação: **81,73% das instruções na camada de domínio**.
- [ ] `node scripts/validate-docs.mjs` na raiz passa.

> O número de testes, o tamanho do pacote e a cobertura mudam a cada entrega de lane. Se
> qualquer um dos três divergir do terminal na hora de gravar, **corrija o slide**, não a
> medição: é o único número do vídeo que não vem do seed.
- [ ] App rodando, aba única, página recarregada agora (estado igual ao seed).
- [ ] `/eventos/evt-002` conferido: 80/80, 7 na fila, "Você é o 7º da fila".
- [ ] `/eventos/evt-012` conferido: bloco "Abriu uma vaga para você" com relógio.
- [ ] `/eventos/evt-013` conferido: "Janela de check-in aberta".
- [ ] Código numérico `84110626` copiado do ingresso `par-130`.
- [ ] Deck aberto na segunda aba, na capa, navegando com as setas.
- [ ] Zoom em 125%, tela cheia, cursor realçado, modo de foco ligado.
- [ ] Fone com microfone testado com 10 s de gravação, ouvido com fone.
- [ ] Cada integrante ensaiou o próprio bloco três vezes com cronômetro, e o tempo real
      está dentro do orçamento da seção 5.

### 9.2 Pós-produção

- [ ] Duração final entre **1:52 e 2:00**. Acima de 2:00 o corte é do avaliador, e cai no
      fecho.
- [ ] Os 6 integrantes falam, e cada um diz o próprio papel.
- [ ] Legenda em português em todo o vídeo, incluindo os números falados. Legenda
      automática revisada à mão: "3ESPX", "check-in" e "QR" saem errados por padrão.
- [ ] Corte seco entre blocos. Nenhuma transição animada, nenhuma música de fundo.
- [ ] Áudio normalizado, mesmo volume percebido nos 7 blocos, ouvido do começo ao fim uma
      vez com fone.
- [ ] Nenhum quadro com editor de código, terminal, notificação ou dado pessoal real.
- [ ] Nenhum número na fala que não esteja na seção 6.1.
- [ ] Publicado no YouTube como **"Não listado"**, título
      `Campus — Engenharia de Software CP5 — FIAP 3º ano`, descrição com o one-liner, os 6
      nomes com RM e o link do repositório.
- [ ] Link testado em janela anônima, sem login, e colado no `README.md` da raiz e na
      entrega da disciplina.

---

## 10. O que o vídeo não mostra, e por que

Declarar o limite vale mais que fingir que ele não existe. Estes quatro itens estão no
roadmap de [`13-roadmap-cp5-cp6.md`](13-roadmap-cp5-cp6.md) e não aparecem no vídeo do CP5.

| Não aparece | Por quê | Quando |
|---|---|---|
| **Persistência real** | Os dados vivem em memória no navegador. Recarregar a página devolve o seed — no vídeo isso é vantagem, mas não é banco de dados | CP6: API própria e banco relacional |
| **Pagamento de verdade** | A cobrança é simulada: o próprio aplicativo dispara o aviso que, no CP6, vem do provedor. Nenhum Pix é gerado em instituição real e nenhum dado de cartão sai da tela | CP6: provedor em ambiente de teste |
| **Câmera lendo o QR** | O check-in do vídeo é feito colando o código. O QR está na tela e o leitor aceita o token, mas usar a câmera exige permissão do navegador e uma segunda pessoa em quadro | CP6: leitura por câmera e modo sem conexão |
| **Assinatura forte do ingresso** | A assinatura do token é calculada no navegador — segredo dentro do pacote não é segredo, e o roteiro não afirma o contrário | CP6: assinatura no servidor, com chave fora do código |

Se a banca perguntar por qualquer um dos quatro, a resposta é o quadro acima, com a palavra
"simulado" dita sem rodeio. O que o vídeo prova é que **a regra já está implementada e
testada**; o que falta é onde o dado mora.
