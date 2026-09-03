# Roteiro do vídeo do CP6 — 3 minutos de produto rodando

**Responsável pelo roteiro:** João Viviani Baldini (RM558596), Product Owner ·
**Duração alvo:** 3:00 (tolerância −5 s / +0 s) ·
**Deck de apoio:** [`25-video-cp6-slides.html`](25-video-cp6-slides.html) ·
**Como subir a stack:** [`23-instalacao.md`](23-instalacao.md) ·
**Como usar o produto:** [`22-manual-de-uso.md`](22-manual-de-uso.md) ·
**Antecessor:** [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md) — mesmo formato,
**um minuto a mais** e uma exigência nova: o CP6 é avaliado como produto, então o vídeo
mostra a stack subindo e a evolução entre os checkpoints.

---

## 1. Premissa e objetivo

**Premissa:** o vídeo é uma gravação de tela do produto rodando contra banco de verdade, não
uma apresentação sobre ele. Fala serve a clique; slide serve a corte.

**O que o avaliador tem de concluir em 3:00**, e são três coisas, não uma:

| # | Conclusão | Bloco que a entrega |
|---|---|---|
| 1 | **Isto instala e sobe em máquina limpa**, com um comando | 2 |
| 2 | **Isto funciona ponta a ponta com dado real** — entrar, ver só o que alcança a própria turma, esperar na fila, pagar, receber ingresso, passar na porta uma única vez — e o dado sobrevive ao F5 | 3 a 6 |
| 3 | **Isto é o mesmo projeto dos checkpoints anteriores, que cresceu** — o mesmo fluxo, do mock ao banco, sem a tela saber | **7** |

A terceira é a que separa este vídeo dos dois anteriores, e por isso tem bloco próprio de
**26 segundos**. Um vídeo que só mostrasse o produto funcionando estaria completo como demo e
incompleto como CP6.

---

## 2. Regras de escrita do texto falado

Herdadas de [`20-video-cp5-roteiro.md`](20-video-cp5-roteiro.md), com uma mudança.

1. **Orçamento de 2,5 palavras por segundo.** Fala clara em português. Bloco de 24 s tem 60
   palavras, não 120. A conferência linha por linha está na seção 5.
2. **Ritmo de demonstração é mais lento que ritmo de pitch.** Este roteiro fica em **2,22
   palavras por segundo** de propósito: a folga é o tempo do clique aterrissar, e no bloco 2
   é o tempo de o terminal rolar.
3. Frase curta. Uma ideia por frase. Nenhuma oração subordinada longa.
4. **Nenhum número de requisito, de regra ou de tela é dito em voz alta.** "RF-024",
   "RN-007" e "MSW" aparecem em documento, nunca na boca. `check-in`, `API` e `Postgres`
   ficam, porque é assim que o público desta disciplina chama.
5. **Nenhuma frase lida do slide ou da tela.** O que está escrito é diferente do que é falado.
6. **Todo número falado vem do seed ou de uma medição desta entrega** —
   conferidos item por item na seção 6.1. Os que este roteiro usa: 80 de 80 vagas, sétima
   posição com seis pessoas na frente, janela de 24 h da oferta, R$ 45,00 da Festa Junina, 22
   restrições, 43 rotas e 460 testes.
7. **Número que o seed deixa correndo não é dito, é mostrado.** A fala diz "prazo correndo";
   o número exato fica na tela, onde não pode divergir.
8. **Mudança em relação ao CP5: arquitetura ganha espaço, porque o critério mudou.** No CP5 a
   arquitetura cabia em uma frase dentro do fluxo de pagamento. No CP6 ela tem dois blocos —
   o 2 (a stack subindo) e o 7 (as duas fontes) — porque "instalabilidade" e "evolução" valem
   35% juntos e nenhum dos dois se demonstra dentro de um fluxo de aluno.

---

## 3. Storyboard cronometrado

Legenda de captura: **[T]** gravação de tela do app · **[C]** terminal ·
**[X]** corte seco · **[Z]** zoom ou recorte · **[S]** slide do deck ·
**[D]** tela dividida em duas.

Oito blocos de 14 a 26 s. A soma das durações é exatamente **180 s** (conferência na
seção 5).

| Tempo | Quem fala | O que diz (fala literal) | O que aparece na tela (captura) |
|---|---|---|---|
| 0:00–0:14 | João Viviani Baldini | "Boa tarde. Somos o grupo do Campus. No checkpoint anterior o aplicativo rodava com dados de mentira. Agora ele roda com banco de verdade. Em três minutos: subir, usar, e o que mudou." | **[S]** capa do deck por 3 s, **[X]** e já um terminal limpo na raiz do repositório, com o cursor piscando |
| 0:14–0:38 | Lucas Baraldi | "Lucas Baraldi, arquitetura. Um comando sobe o produto inteiro. O banco sobe primeiro, e a API espera ele aceitar conexão — não espera o container ligar, que é diferente. Depois a API aplica as migrações, carrega os dados e responde. Máquina limpa, nenhum passo manual. Dez segundos, e o app está no ar." | **[C]** digita `docker compose up` e dá Enter. O log rola: `db` com `healthy`, a API com `migrate deploy` e o seed, o `web` subindo. **[Z]** na linha do *healthcheck*. **[X]** para uma aba em `localhost:3000/api/health`, mostrando o `ok` com o banco conectado |
| 0:38–1:00 | Lucas Zolla | "Lucas Zolla, requisitos. Marina entra com o e-mail da faculdade: a senha vai com hash forte, e a sessão pode ser revogada. O topo diz o vínculo dela. O feed mostra só o que alcança esse vínculo — e agora vem do banco, não da memória do navegador." | **[X]** para `localhost:8080`, tela de login. Digita `marina.alves@fiap.com.br` e a senha; **[Z]** no campo de e-mail enquanto fala do domínio. Cai no feed com a linha "ENGENHARIA DE COMPUTAÇÃO · TURMA 3ESPX", a saudação e as publicações |
| 1:00–1:22 | Ana Luiza Dourado | "Ana Luiza, design. O Hackathon está lotado: oitenta de oitenta vagas. A tela não recusa, ela informa — Marina é a sétima da fila, seis pessoas na frente, e vinte e quatro horas para confirmar quando abrir vaga. A posição é número, não adjetivo: quem espera sabe onde está." | **[T]** "ver tudo" → `/eventos` com os chips Minha turma · Meu curso · Faculdade; toque no Hackathon → **[Z]** na barra "80/80 · 7 na fila", no bloco "Você é o 7º da fila" e no botão com o mesmo rótulo |
| 1:22–1:46 | Ronaldo Veloso Filho | "Ronaldo, modelagem. Outra inscrição espera pagamento: quarenta e cinco reais, prazo correndo. Gero a cobrança, confirmo pelo provedor simulado, e o estado muda. Agora o teste que importa: recarrego a página. No checkpoint anterior isso apagava tudo. Aqui o pagamento continua confirmado. E o mesmo aviso, repetido, não cobra duas vezes." | **[X]** para a Festa Junina (R$ 45,00): "Pagar agora" → aba **Pix** → "Gerar cobrança Pix"; no painel tracejado de simulação, toque em **Confirmar**; o selo vira pago. **[Z]** no **F5** e no selo que **permanece**. Toque em **Duplicar**: nada muda, e o painel diz por quê |
| 1:46–2:10 | Vitor Pantarotto | "Vitor, qualidade. O ingresso tem código legível. Na porta, quem valida é o organizador: check-in confirmado, com nome e turma. O mesmo código de novo — ingresso já utilizado, com a hora. E isso não depende do código estar certo: o banco recusa a segunda presença. São vinte e duas restrições exercitadas contra o banco de verdade." | **[T]** `/ingresso/…` da Maratona com QR e `CMP-3ESPX-0626`; **[X]** login como **Rafael Souza** → "Abrir o check-in"; cola o código → aceito, com nome e turma; cola de novo → **[Z]** em "Ingresso já utilizado às HH:MM". **[X]** para **[C]** com a saída do `verificar-restricoes.sql`, rolando os `ok` |
| 2:10–2:36 | Lucas Baraldi | "Lucas Baraldi de novo. Aqui está o que separa esta entrega da anterior. Mesma tela, mesmo fluxo, duas fontes. À esquerda, o dado na memória do navegador. À direita, o mesmo dado no Postgres. A tela não sabe a diferença — é uma variável de ambiente. As regras não foram reescritas: foram movidas para um pacote que os dois lados usam." | **[D]** duas janelas lado a lado, na **mesma** rota de detalhe do evento: à esquerda a versão do CP5, à direita a do CP6. Toque em "entrar na fila" nas duas, e as duas respondem igual. **[Z]** no F5: à esquerda o estado **volta**, à direita **permanece**. **[X]** para **[S]** o slide das duas fontes por 6 s |
| 2:36–3:00 | João Viviani Baldini | "Quarenta e três rotas, quatrocentos e sessenta testes, e um comando para subir tudo. O Campus já nasce sabendo para quem o evento é: sua turma, seu curso, sua faculdade. O que faltava era onde o dado mora. Agora ele mora. Falta provar a concorrência com carga real — está declarado na entrega. Obrigado." | **[S]** slide "O que está medido" por 8 s, **[X]** slide do que falta por 6 s, **[X]** slide de encerramento com a marca e o endereço do repositório, parado até 3:00 |

### 3.1 Direção, bloco por bloco

**Bloco 1 (0:00–0:14).** A capa fica 3 s e sai. Se durar mais, o vídeo começa como
apresentação — e o critério avaliado é produto. Não leia a capa. O corte para o terminal
vazio é o gancho: a próxima coisa que acontece é o produto nascendo.

**Bloco 2 (0:14–0:38).** É o bloco mais arriscado do vídeo, e o único que **não** se resolve
com F5. Leia a seção 6.2 antes de gravar. Duas regras: o `docker compose up` roda com as
imagens **já construídas** (a construção leva minutos e não cabe em 24 s), e o log é
acelerado na edição se passar de 15 s, com o corte marcado por um *jump cut* visível — não
esconda a aceleração. A frase sobre esperar a conexão cai junto com a linha `healthy` em
quadro; é o único sincronismo exigido no bloco.

**Bloco 3 (0:38–1:00).** Digite o e-mail devagar, com o campo em quadro: é a regra de
cadastro aparecendo. Diga "3ESPX" letra por letra. Não narre o clique; narre o resultado.

**Bloco 4 (1:00–1:22).** O zoom vem preparado, não durante. A frase "a tela não recusa, ela
informa" precisa cair junto com o bloco da fila em quadro. Ensaie esse par — é herdado do
CP5 e continua sendo o momento de produto mais forte do vídeo.

**Bloco 5 (1:22–1:46).** O **F5 é o clímax deste bloco**, não o pagamento. Faça meio segundo
de pausa antes de "recarrego a página", e deixe o selo em quadro por um segundo inteiro
depois. É a prova de persistência, e ela é visual: sem a pausa, o avaliador não vê que a
página recarregou.

**Bloco 6 (1:46–2:10).** Copie o código antes da tomada (seção 6.3): na gravação são dois
`Ctrl+V` e dois envios. A segunda recusa é o clímax do fluxo. O corte para o terminal com os
`ok` do `verificar-restricoes.sql` é o que transforma "o app recusou" em "o banco recusa" —
sem ele, a última frase do bloco é afirmação sem imagem.

**Bloco 7 (2:10–2:36).** **O bloco da evolução, e o que este vídeo tem de novo.** Prepare as
duas janelas antes (seção 6.4), lado a lado, na mesma rota. A sequência é: os dois cliques
iguais, e então **um F5 nas duas**. À esquerda o estado volta ao seed; à direita permanece.
Não explique a diferença antes de ela aparecer — deixe a imagem chegar primeiro.

**Bloco 8 (2:36–3:00).** Volta ao deck, três slides. O one-liner é o de
[`07-pitch.md`](07-pitch.md) §1, sem trocar palavra. A frase sobre a concorrência é
obrigatória e não é opcional: é a pendência declarada em
[`24-checklist-entrega-cp6.md` §3](24-checklist-entrega-cp6.md#o-que-não-foi-medido-e-é-honesto-dizer),
e omiti-la no vídeo enquanto ela está escrita no checklist seria incoerência entre artefatos.
Corte seco em 3:00.

---

## 4. Escalação — quem fala cada bloco

Todos os 6 integrantes falam. A regra é a mesma dos dois checkpoints anteriores: **quem
responde pelo artefato apresenta o artefato.** Papéis conforme
[`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) §1.

| Bloco | Tempo | Duração | Quem fala | RM | Papel real | Por que essa pessoa fala isso |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:14 | 14 s | João Viviani Baldini | RM558596 | Product Owner | Abre declarando o que mudou do CP5 para o CP6 — é decisão de produto, não técnica |
| 2 | 0:14–0:38 | 24 s | Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | O `docker compose`, os dois `Dockerfile` e a ordem de inicialização com *healthcheck* são decisão dele |
| 3 | 0:38–1:00 | 22 s | Lucas Zolla | RM557952 | Analista de Requisitos | Escreveu o requisito de e-mail institucional e a regra de alcance; fala do que especificou aparecendo na tela |
| 4 | 1:00–1:22 | 22 s | Ana Luiza Dourado | RM558793 | UX/UI Designer | O bloco é sobre o que a interface comunica: ocupação, posição na fila e o botão que muda de rótulo em vez de recusar depois |
| 5 | 1:22–1:46 | 24 s | Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | Modelou a persistência. O F5 que não apaga o pagamento é o modelo de dados dele aparecendo na tela |
| 6 | 1:46–2:10 | 24 s | Vitor Pantarotto | RM554961 | Scrum Master / QA | É verificação: o caso de uso único do ingresso executado ao vivo, e as 22 restrições que ele conferiu contra o banco |
| 7 | 2:10–2:36 | 26 s | Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | A fronteira de duas fontes e a migração do domínio para um pacote são decisão dele ([ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md)) |
| 8 | 2:36–3:00 | 24 s | João Viviani Baldini | RM558596 | Product Owner | Fecha com o one-liner e com a pendência declarada — as duas coisas são dele |

Seis integrantes, oito blocos: João abre e fecha, Baraldi tem o bloco da stack e o da
evolução. Cada pessoa começa dizendo **primeiro nome e papel em duas palavras** — resolve o
critério de divisão de trabalho sem gastar tempo com apresentação formal.

**Por que Baraldi fala duas vezes, e não um sétimo integrante.** Os blocos 2 e 7 são o mesmo
assunto visto de dois ângulos: a stack subindo e a fronteira que permite duas fontes. Dar o
bloco 7 a outra pessoa quebraria a regra de "quem responde pelo artefato apresenta", e o
bloco 7 é o que vale 15% do checkpoint.

---

## 5. Conferência de tempo e de palavras

Contagem de palavras: sequências separadas por espaço que contenham letra ou número.
"e-mail" e "check-in" contam como uma palavra, que é como se lê em voz alta.

| Bloco | Tempo | Duração | Orçamento (2,5 pal/s) | Palavras escritas | Folga | Ritmo real |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:14 | 14 s | 35 | 33 | 2 | 2,36 pal/s |
| 2 | 0:14–0:38 | 24 s | 60 | 52 | 8 | 2,17 pal/s |
| 3 | 0:38–1:00 | 22 s | 55 | 47 | 8 | 2,14 pal/s |
| 4 | 1:00–1:22 | 22 s | 55 | 48 | 7 | 2,18 pal/s |
| 5 | 1:22–1:46 | 24 s | 60 | 51 | 9 | 2,13 pal/s |
| 6 | 1:46–2:10 | 24 s | 60 | 56 | 4 | 2,33 pal/s |
| 7 | 2:10–2:36 | 26 s | 65 | 60 | 5 | 2,31 pal/s |
| 8 | 2:36–3:00 | 24 s | 60 | 53 | 7 | 2,21 pal/s |
| **Total** | **0:00–3:00** | **180 s** | **450** | **400** | **50** | **2,22 pal/s** |

Soma das durações: 14 + 24 + 22 + 22 + 24 + 24 + 26 + 24 = **180 segundos**.
Soma das palavras: 33 + 52 + 47 + 48 + 51 + 56 + 60 + 53 = **400**, ou 133 palavras por
minuto.

**Nenhum bloco estoura o orçamento.** A folga total de 50 palavras (cerca de 20 s) é o tempo
das transições, e em vídeo de demonstração ela é obrigatória: sem ela a fala termina antes de
o clique aparecer. Os dois blocos mais apertados são o 6 (2,33) e o 7 (2,31); se algum
integrante não fechar no cronômetro, a palavra sai desses dois, nunca do 2 — o log do Docker
não acelera com a fala.

### 5.1 Divisão do tempo entre tela do produto e apoio

| O que está em quadro | Segundos | Onde |
|---|---|---|
| App em uso | **96 s** | 0:38–1:46 e 1:46–2:04 |
| Terminal com a stack ou com o banco | **30 s** | 0:14–0:38 e 2:04–2:10 |
| Tela dividida, as duas fontes | **20 s** | 2:10–2:30 |
| Slide do deck | 34 s | 0:00–0:03 (capa), 2:30–2:36 e 2:36–3:00 |

**146 dos 180 segundos são o produto rodando** — app, terminal e a comparação lado a lado.
Nenhum segundo é editor de código, diagrama ou quadro de tarefas.

O terminal entra em quadro, e no CP5 não entrava. É deliberado: no CP5 o critério era
protótipo, e terminal não é protótipo; no CP6 o critério é **instalabilidade**, e ela só se
demonstra em terminal.

---

## 6. Estado da demo: o que o seed entrega e o que exige preparo

O seed da API é **o mesmo dado do CP5**, traduzido para UUID de forma determinística por
[`api/src/seed/ids.ts`](../api/src/seed/ids.ts) — `evt-013` continua sendo `evt-013` na
última metade do identificador. É o que permite este roteiro citar um registro específico.

O que exige cuidado no CP6 é diferente do CP5, e é importante entender por quê: **o estado
agora persiste.** No CP5 um F5 devolvia o seed e consertava qualquer tomada errada. Aqui não:
uma cobrança confirmada continua confirmada, e um check-in registrado não se desfaz. O botão
de "recomeçar do zero" mudou de lugar — é a seção 6.5.

### 6.1 O que o vídeo mostra, e de onde vem cada número

| Bloco | O que aparece | Dado real | Onde conferir |
|---|---|---|---|
| 2 | A cadeia de serviços | `db` → `api` → `web`, com `pg_isready` como *healthcheck* | [`docker-compose.yml`](../docker-compose.yml) |
| 2 | App em `:8080`, API em `:3000/api` | portas mapeadas, ajustáveis por variável | idem |
| 3 | Usuária da demo | Marina Alves, `marina.alves@fiap.com.br`, turma 3ESPX, Engenharia de Computação | `usr-001` em [`api/src/seed/dados.ts`](../api/src/seed/dados.ts) |
| 3 | Senha de todos os usuários de teste | `campus123` — agora com hash Argon2id no banco, um salt por usuário | `SENHA_DEMO` no mesmo arquivo |
| 4 | Evento lotado | Hackathon Campus 48h, 80 de 80 vagas, gratuito, alcance de faculdade | `evt-002` |
| 4 | Fila de 7 e a posição da Marina | 7 participações em lista de espera, posições 1 a 7; a 7ª é dela | `par-020` a `par-026` |
| 5 | Cobrança pendente | Festa Junina Fora de Época, R$ 45,00 | `evt-005`, `par-052` |
| 6 | Evento **em andamento**, com janela de check-in aberta | Maratona de estudos, turma 3ESPX, começou 1 h atrás | `evt-013` |
| 6 | Ingresso da Marina nesse evento | Confirmada; código legível `CMP-3ESPX-0626`, numérico `84110626` | `par-130` |
| 6 | Quem valida na porta | Rafael Souza organiza a Maratona — é a única conta que abre aquele painel | `usr-002` |
| 6 | **22 restrições** | 11 blocos, 22 assertivas contra PostgreSQL 16 | [`api/prisma/verificar-restricoes.sql`](../api/prisma/verificar-restricoes.sql) |
| 8 | **43 rotas** | 43 operações no contrato e 43 decoradores nos controladores | [`api/openapi.yaml`](../api/openapi.yaml) e `api/src/*/*.controller.ts` |
| 8 | **460 testes** | 134 exclusivos do app + 243 do pacote + 83 da API, sem repetição | [`24-checklist-entrega-cp6.md` §3](24-checklist-entrega-cp6.md#3-estado-real-das-verificações) |

Duas conferências antes de gravar, porque são exatamente os números que a fala diz: o detalhe
de `evt-002` mostra **80/80** e **7 na fila**, e `evt-013` abre com **"Janela de check-in
aberta"**.

**Sobre os 460 testes.** É o total **sem repetição**, e a distinção importa porque a suíte do
app inclui a do pacote de propósito: `npm run test -w campus-app` imprime 377, e 243 desses
são os mesmos que `npm run test:dominio` imprime. Somar 377 + 243 + 83 daria 703 e contaria o
pacote duas vezes. A explicação está no checklist; o vídeo diz o número honesto.

### 6.2 O bloco 2 é o único que não se resolve com uma segunda tomada

Três coisas têm de estar prontas **antes** de a câmera ligar, e nenhuma delas é rápida.

1. **As imagens já construídas.** `docker compose build` leva minutos: instala as
   dependências do monorepo, compila o pacote compartilhado, gera o cliente do Prisma e
   compila a API. Rode isso antes. Na gravação, `docker compose up` só sobe.
2. **Os volumes limpos.** `docker compose down -v` antes da tomada. Sem isso o Postgres já
   tem os dados, o `migrate deploy` não faz nada visível e o log fica sem graça — e o que se
   quer mostrar é justamente a migração acontecendo.
3. **A porta 5432 livre.** Um Postgres local rodando na mesma porta faz o `up` falhar com uma
   mensagem que parece erro de configuração. O `docker-compose.yml` permite trocar por
   `DB_PORT`, mas trocar na hora da gravação é conserto em quadro — e a regra de ouro proíbe.

Se o `up` falhar na tomada: **pare a gravação**, resolva fora de quadro, `down -v`, e comece
de novo. Vídeo com terminal em vermelho custa mais nota que vídeo com um bloco a menos.

### 6.3 Preparo de 2 minutos, antes de gravar o bloco 6

1. Como Marina, abra o ingresso da Maratona de estudos.
2. **Selecione e copie o código numérico de 8 dígitos** impresso sob o código legível
   (`84110626`).
3. Deixe a tela de login pronta em outra aba.
4. Deixe um terminal aberto com o comando do `verificar-restricoes.sql` **já digitado**, sem
   Enter — o corte para ele é no meio do bloco, e digitar em quadro gastaria 5 s que o bloco
   não tem.

Na tomada, são dois `Ctrl+V` e dois envios: o primeiro devolve o check-in aceito com nome e
turma, o segundo devolve "Ingresso já utilizado às HH:MM".

O leitor aceita as três formas do mesmo ingresso — token do QR, numérico de 8 dígitos e
legível `CMP-3ESPX-<4 dígitos>`. Use o numérico, que é o mais fácil de colar.

### 6.4 Preparo do bloco 7, que é o mais elaborado do vídeo

O bloco compara as duas fontes lado a lado, e isso exige **duas instâncias do app rodando ao
mesmo tempo**:

| Janela | Como subir | O que ela é |
|---|---|---|
| Esquerda | `VITE_DATA_SOURCE=mock npm run dev -w campus-app` | A fonte do CP5: dado em memória, no navegador |
| Direita | `localhost:8080` do compose | A fonte do CP6: dado no PostgreSQL |

Deixe as duas na **mesma rota de detalhe de evento**, com a mesma conta, antes de gravar.
Redimensione para metade da tela cada uma. Em 26 s não há tempo de arrumar janela.

**A ordem da tomada, e ela é rígida:** clique em "entrar na fila" na esquerda, depois na
direita — as duas respondem igual, e é isso que prova que a regra é a mesma. **Então** F5 nas
duas. À esquerda o estado volta ao seed; à direita permanece. Se você der o F5 antes dos
cliques, a comparação perde o sentido: mostraria duas telas iguais e nada mais.

### 6.5 A regra de ouro mudou: agora o estado persiste

No CP5, um F5 era o botão de "recomeçar do zero". **No CP6 não é** — e essa é a diferença
que mais atrapalha quem grava com o hábito do checkpoint anterior.

| Situação | CP5 | CP6, fonte api |
|---|---|---|
| Recarregar a página | Devolve o seed exato | Não muda nada |
| Recomeçar do zero | F5 | `docker compose down -v && docker compose up` |
| Refazer só um fluxo | F5 | Usar outro registro do seed, ou recarregar o banco |

**Consequência prática:** cada fluxo do vídeo é gravável **uma vez** por carga do banco.
Confirmou o pagamento da Festa Junina? Ele está pago. Validou o ingresso da Maratona? Ele
está usado. Por isso a ordem de gravação da seção 7.4 vai do fluxo mais destrutivo para o
menos, e por isso o `down -v` está na lista de pré-gravação.

A sessão continua morrendo com a aba (`sessionStorage`, para o laboratório compartilhado que
é o cenário das personas). Para voltar à tela de login, saia pelo aplicativo.

---

## 7. Instruções de gravação

### 7.1 Imagem e som

- Resolução **1920 × 1080**, **30 fps**, arquivo `.mp4`.
- Navegador em tela cheia (`F11`), **zoom da página em 125%**. O app é desenhado para celular
  e usa coluna centralizada no desktop: a 100% o texto fica pequeno em projeção.
- **Terminal com fonte grande** — no mínimo 16 pt, tema claro, sem transparência. Log de
  Docker em fonte de 11 pt é ilegível em projeção, e o bloco 2 depende de o avaliador ler a
  palavra `healthy`.
- Cursor grande e realce de clique ligados.
- Modo de foco ligado. Nenhuma notificação pode entrar em quadro.
- Tema claro no app. Os tokens de cor foram auditados em tema claro —
  [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) §4.
- Fone **com microfone**, teste de 10 s antes de cada bloco, um bloco por arquivo
  (`bloco-7-evolucao.mp4`).

### 7.2 O que abrir antes, e nada além disso

1. Um terminal na raiz do repositório, com as imagens já construídas e os volumes limpos.
2. O app do compose em `http://localhost:8080`.
3. Um segundo terminal com `VITE_DATA_SOURCE=mock npm run dev -w campus-app`, **só para o
   bloco 7**.
4. Um terceiro terminal com o comando do `verificar-restricoes.sql` digitado, sem Enter.
5. [`25-video-cp6-slides.html`](25-video-cp6-slides.html) em uma aba, na capa.
6. Nada mais. Sem editor, sem e-mail, sem mensageiro, sem aba pessoal.

### 7.3 Qual conta em qual bloco

Todas usam a senha `campus123`.

| Bloco | Conta | E-mail | Por que essa conta |
|---|---|---|---|
| 3 a 5, início do 6 e o 7 | Marina Alves | `marina.alves@fiap.com.br` | É a persona participante: fila do Hackathon, cobrança na Festa Junina e ingresso na Maratona |
| Fim do bloco 6 | Rafael Souza | `rafael.souza@fiap.com.br` | Organiza a Maratona: é a única conta que abre aquele painel de check-in |

### 7.4 Ordem de gravação

Por bloco, nunca em tomada única. **Do mais destrutivo para o menos**, porque o estado
persiste (seção 6.5):

1. **Bloco 6** (ingresso e porta). Consome o ingresso `par-130` de forma irreversível.
2. **Bloco 5** (pagamento). Consome a cobrança de `par-052`.
3. **Bloco 7** (as duas fontes). Consome uma entrada na fila, e exige as duas janelas.
4. **Bloco 4** (evento lotado e fila) — só leitura, se você não tocar no botão.
5. **Bloco 3** (login e feed) — só leitura.
6. **Bloco 2** (a stack subindo). Exige `down -v`, o que **apaga tudo** — e por isso vem
   depois de todos os que dependem de dado.
7. **Blocos 1 e 8** (capa e fecho) — não dependem de estado.

Se precisar refazer um bloco destrutivo: `docker compose down -v && docker compose up`, e
regrave na mesma ordem a partir dali.

Máximo de **3 tomadas** por bloco. Se precisar da quarta, o texto está longo — corte palavra,
não grave de novo.

---

## 8. Plano B — se algo travar durante a gravação

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `docker compose up` falha com erro de porta | Um Postgres local ocupando a 5432 | **Pare a gravação.** Pare o serviço local, ou defina `DB_PORT`. Nunca conserte em quadro |
| A API morre logo depois do banco subir | O `healthcheck` não foi respeitado, ou falta variável de ambiente | Confira o `.env` contra [`api/.env.example`](../api/.env.example). A mensagem do boot diz **qual** variável falta |
| O log do `up` não mostra migração nenhuma | Os volumes não foram limpos | `docker compose down -v` e comece o bloco de novo |
| Botão principal com rótulo inesperado | O estado da participação mudou numa tomada anterior — **e não volta com F5** | Use outro registro do seed, ou recarregue o banco. Ver a seção 6.5 |
| "Ingresso já utilizado" na primeira leitura | O bloco 6 já foi gravado nesta carga do banco | `down -v`, `up`, e regrave na ordem da seção 7.4 |
| "Você não valida o check-in deste evento" | O painel foi aberto na conta errada | Saia e entre como **Rafael Souza**: a Maratona é de turma, e só o organizador valida |
| "Ingresso não encontrado" | O ingresso foi aberto em outra conta | Só o dono vê o próprio ingresso: volte para a Marina |
| A cobrança simulada não confirma | O pagamento já havia sido confirmado | Aproveite: é a idempotência funcionando. Grave a tela como está |
| Uma das duas janelas do bloco 7 não sobe | O `npm run dev` não subiu, ou a porta 5173 está ocupada | Corte o bloco 7 e redistribua os 26 s entre os vizinhos. **Mas leia o parágrafo abaixo antes** |
| Nada carrega, tela em esqueleto | A API caiu | Pare a gravação. `docker compose logs api` diz o motivo |

**Regra geral do plano B: nunca conserte estado na frente da câmera.** Corte, resolva fora de
quadro, grave de novo.

**E uma exceção à ordem de sacrifício do CP5.** No CP5, a ordem para cortar era: primeiro a
oferta, depois o pagamento. No CP6 a ordem é outra, porque os critérios são outros:

| Ordem de sacrifício | Bloco | Por quê |
|---|---|---|
| 1º a sair | 4 (fila) | É o mais bem coberto pelos outros artefatos: o deck e o manual mostram a fila com imagem |
| 2º | 5 (pagamento) | O F5 que prova persistência pode ser mostrado no bloco 7, que já o faz |
| **Nunca saem** | **2 e 7** | Instalabilidade e evolução valem **35% juntos** e não aparecem em nenhum outro bloco. Sem o 2, não há prova de que instala; sem o 7, não há prova de evolução |
| Nunca sai | 6 | O uso único do ingresso é o diferencial do produto |

---

## 9. Checklists

### 9.1 Pré-gravação

- [ ] `docker compose build` concluído, e `docker compose down -v` executado agora.
- [ ] Porta 5432 livre, ou `DB_PORT` definido.
- [ ] `docker compose up` testado uma vez **fora** de gravação, do começo ao fim.
- [ ] `npm run test -w campus-app`, `npm run test -w campus-api` e `npm run test:dominio`
      passam, e os números do slide são os que o terminal acabou de imprimir. Medição no
      fecho desta redação: **377, 83 e 243**, e **460 sem repetição**.
- [ ] `npm run check:size` passa, e o valor no slide é o medido. Medição desta redação:
      **236,90 de 250 KB gzip**.
- [ ] `psql -f api/prisma/verificar-restricoes.sql` imprime **22 `ok`** e nenhum `FALHOU`.
- [ ] `node scripts/validate-docs.mjs` passa.

> O número de testes, o tamanho do pacote e a contagem de rotas mudam a cada entrega de
> lane. Se qualquer um divergir do terminal na hora de gravar, **corrija o slide**, não a
> medição.

- [ ] App do compose respondendo em `:8080`, e `:3000/api/health` devolvendo `ok`.
- [ ] Detalhe de `evt-002` conferido: 80/80, 7 na fila, "Você é o 7º da fila".
- [ ] `evt-013` conferido: "Janela de check-in aberta".
- [ ] Código numérico `84110626` copiado do ingresso da Maratona.
- [ ] Segunda instância com `VITE_DATA_SOURCE=mock` subindo, para o bloco 7.
- [ ] Duas janelas do bloco 7 posicionadas lado a lado, na mesma rota.
- [ ] Deck aberto em outra aba, na capa, navegando com as setas.
- [ ] Zoom em 125%, tela cheia, cursor realçado, modo de foco ligado.
- [ ] Terminal em fonte ≥ 16 pt, tema claro.
- [ ] Fone com microfone testado com 10 s de gravação, ouvido com fone.
- [ ] Cada integrante ensaiou o próprio bloco três vezes com cronômetro, e o tempo real está
      dentro do orçamento da seção 5.

### 9.2 Pós-produção

- [ ] Duração final entre **2:52 e 3:00**. Acima de 3:00 o corte é do avaliador, e cai no
      fecho.
- [ ] Os 6 integrantes falam, e cada um diz o próprio papel.
- [ ] O log do Docker, se acelerado, tem o corte **visível**. Aceleração escondida é o único
      tipo de edição que este roteiro proíbe.
- [ ] Legenda em português em todo o vídeo, incluindo os números falados. Legenda automática
      revisada à mão: "3ESPX", "check-in", "Postgres" e "QR" saem errados por padrão.
- [ ] Corte seco entre blocos. Nenhuma transição animada, nenhuma música de fundo.
- [ ] Áudio normalizado, mesmo volume percebido nos 8 blocos, ouvido do começo ao fim uma vez
      com fone.
- [ ] Nenhum quadro com editor de código, notificação ou dado pessoal real.
- [ ] Nenhum quadro com o conteúdo de um `.env` real em tela.
- [ ] Nenhum número na fala que não esteja na seção 6.1.
- [ ] Publicado no YouTube como **"Não listado"**, título
      `Campus — Engenharia de Software CP6 — FIAP 3º ano`, descrição com o one-liner, os 6
      nomes com RM e o link do repositório.
- [ ] Link testado em janela anônima, sem login, e colado no `README.md` da raiz e em
      [`24-checklist-entrega-cp6.md`](24-checklist-entrega-cp6.md) §5.

---

## 10. O que o vídeo não mostra, e por que

Declarar o limite vale mais que fingir que ele não existe. Comparado com o quadro equivalente
do CP5, **três dos quatro itens saíram** — e é essa mudança que o critério de evolução mede.

| Item | Estado no CP5 | Estado no CP6 |
|---|---|---|
| **Persistência real** | Não aparecia: dado em memória, F5 devolvia o seed | ✅ **É o bloco 5.** O F5 é o clímax, e o pagamento continua confirmado |
| **Assinatura forte do ingresso** | Não aparecia: a assinatura era calculada no navegador | ✅ Resolvido no servidor, com a chave fora do código. Não tem bloco próprio porque não é visível na tela |
| **Câmera lendo o QR** | Não aparecia | ❌ **Continua fora.** O check-in do vídeo é feito colando o código: usar a câmera exige permissão do navegador e uma segunda pessoa em quadro |
| **Pagamento de verdade** | Simulado | ❌ **Continua simulado**, e o painel diz isso na própria tela. Nenhum Pix é gerado em instituição real, e nenhum dado de cartão sai da tela — o contrato não tem campo para número nem CVV |
| **Concorrência sob carga** | Não era testável sem servidor | ❌ **Não medida.** A trava de linha existe no código; a prova entre processos exige um teste de integração que ainda não foi escrito. Está declarada no fecho do vídeo e em [`24-checklist-entrega-cp6.md`](24-checklist-entrega-cp6.md) |

Se a banca perguntar por qualquer um dos três que continuam fora, a resposta é o quadro
acima, com a palavra "simulado" e a palavra "não medido" ditas sem rodeio. O que o vídeo
prova é que **a regra está implementada, testada e persistida**; o que falta está nomeado.
