# Manual de uso

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-02 | CP6 | Versão inicial: as 12 telas, o manual por perfil (aluno, organizador, admin de curso, admin de faculdade), as mensagens literais de recusa e as duas divergências entre texto e regra |

Este documento é o **manual do usuário final**. Ele responde, por perfil: o que
você vê, o que consegue fazer, e — a parte que costuma faltar em manual — **o
que o sistema diz quando recusa**. A mensagem exata, não "erro".

Para *instalar*, veja [instalação](23-instalacao.md). Para *avaliar o protótipo
do CP5* com dados simulados, veja
[ambiente de teste](18-ambiente-de-teste.md).

Toda mensagem de recusa citada aqui foi **copiada do código**, com arquivo e
linha. Quando o texto da tela contradiz a regra que o próprio sistema aplica, o
manual registra a contradição em vez de escolher um lado — são os dois itens da
seção 8.

**Responsável:** Lucas Baraldi (Tech Lead / Arquiteto) · RM555407

---

## 1. Antes de tudo: papel não é o que você pensa

Três coisas se confundem e mudam o manual inteiro. A distinção está escrita no
código, em `packages/shared/src/domain/permissions.ts`:

| Conceito | O que é | Como se ganha |
|---|---|---|
| **Papel** | Atributo do **usuário**. Vale sobre um escopo inteiro | Concedido: `ALUNO`, `ADMIN_CURSO`, `ADMIN_FACULDADE` |
| **Organizador** | Relação entre **um usuário e um evento** | Criando o evento. Não é papel, não é cargo |
| **Vínculo** | Curso e turma do usuário | No onboarding, com código de convite |

Consequência prática: **não existe "o organizador" como tipo de usuário.** No
seed, Rafael Souza tem papel `ALUNO` e é organizador de quatro eventos, porque
os criou. Qualquer aluno é organizador do que criar.

E o vínculo é o que decide o que você vê — mais que o papel.

---

## 2. As telas

12 telas. A navegação inferior tem **quatro** destinos, na ordem: **Início**,
**Eventos**, **Criar**, **Perfil**. A barra superior tem o logo, o botão
**+ Criar evento**, o **sino** de avisos e o **avatar**.

**Nenhum item de menu é condicional por papel.** Todo mundo vê os mesmos quatro
destinos e os mesmos botões, inclusive **Criar**.

| Tela | Endereço | Cabeçalho na tela | Como se chega |
|---|---|---|---|
| Login | `/login` | `Entre com o e-mail da faculdade` | Abrindo o app sem sessão |
| Onboarding | `/onboarding` | `Falta o seu vínculo` | Sozinho, ao entrar sem curso ou turma |
| Início (feed) | `/` | `Bom dia / Boa tarde / Boa noite, <nome>` | Aba **Início** |
| Eventos | `/eventos` | `Eventos` | Aba **Eventos** |
| Detalhe do evento | `/eventos/<id>` | O título do evento | Tocando um evento |
| Painel de check-in | `/eventos/<id>/checkin` | O título do evento | Botão **Abrir o check-in** |
| Criar evento | `/criar` | `Criar evento` | Aba **Criar** ou **+ Criar evento** |
| Perfil | `/perfil` | O seu nome | Aba **Perfil** ou o avatar |
| Notificações | `/notificacoes` | `Notificações` | O **sino** |
| Ingresso | `/ingresso/<id>` | O título do evento | Perfil → participação confirmada |
| Pagamento | `/pagamento/<id>` | O título do evento | Perfil → participação com pagamento pendente |
| Página inexistente | qualquer outra | `Página não existe` | Endereço errado |

O primeiro elemento focável de toda tela é o atalho **Pular para o conteúdo** —
está lá para quem navega por teclado ou leitor de tela.

### A única guarda de acesso

Há **uma** guarda, e ela não olha papel: ou você tem sessão, ou vai para o
login. Tendo sessão sem curso e turma, vai para o onboarding.

Nenhuma tela é restrita por papel no roteador — nem `/criar`, nem
`/eventos/<id>/checkin`. A recusa do check-in acontece **no servidor**, e a
tela a exibe (seção 5.3).

---

## 3. Perfil: aluno

O perfil de todo mundo. Os dois administradores do sistema também são alunos, e
usam o app assim na maior parte do tempo.

### 3.1. Entrar

Na tela de login há a seção **Entrar como · demonstração**, com cinco cartões:
Marina Alves, Rafael Souza, Henrique Lima, Isabela Duarte e Lucas Tavares. Um
toque preenche e entra. A senha de todos é `campus123`.

O rodapé dos cartões avisa: os quatro primeiros já têm turma e caem direto no
feed. O quinto, não.

**Quando o login recusa:**

| Situação | Mensagem exata na tela |
|---|---|
| E-mail que não é da instituição | `Use seu e-mail institucional (@fiap.com.br).` |
| Senha errada, ou e-mail que não existe | `E-mail ou senha não conferem.` |
| E-mail ainda não confirmado | `Confirme o e-mail que enviamos antes de entrar.` |

A segunda mensagem é a mesma para senha errada e para usuário inexistente, de
propósito: dizer "este e-mail não existe" entrega ao atacante a lista de quem
tem conta.

### 3.2. Onboarding: curso e turma

Entrando sem vínculo, o app leva ao onboarding sozinho — `Falta o seu vínculo`,
com o aviso de que curso e turma definem quais eventos você vê, e que sem eles
o feed abriria vazio.

Dois passos: escolher o curso, e digitar o código da turma.

| Código | Turma | Curso |
|---|---|---|
| `3ESPX-26` | 3ESPX | Engenharia de Computação |
| `2ESPA-26` | 2ESPA | Engenharia de Computação |
| `4SIA-26` | 4SIA | Sistemas de Informação |
| `1CCB-26` | 1CCB | Ciência da Computação |

O código é tolerante: ` 3espx 26 ` entra igual a `3ESPX-26`. Caixa, espaço e
hífen não reprovam um código certo.

**Quando o onboarding recusa** — e cada recusa tem texto próprio, porque dizer
"código inválido" para quatro situações diferentes não ajuda ninguém:

| Situação | Mensagem exata na tela |
|---|---|
| Não escolheu curso da lista | `Escolha um curso da lista.` |
| Código que não existe | `Esse código de turma não existe. Confira com quem te passou.` |
| Código de um período antigo | `Esse código foi desativado. Peça o código do período atual.` |
| Código certo, curso errado | `Esse código é de outro curso. Volte e escolha o curso da turma 4SIA.` |

A quarta merece atenção: ela **diz de qual turma é o código**. É a diferença
entre uma recusa que resolve e uma que trava.

### 3.3. Início: o feed

O cabeçalho cumprimenta pela hora e mostra, acima do nome, o seu curso e a sua
turma. Isso não é decoração: é o que define o feed.

Abaixo, o compositor de publicação e as publicações dos eventos.

**Você só publica sobre evento em que esteve.** Não existe post solto: toda
publicação pertence a um evento e herda o alcance dele. Sem evento elegível, o
compositor é substituído por:

> `Nenhum evento seu para publicar`
>
> `Só quem participou de um evento publica no feed dele — e quem organiza, no
> que organizou. Garanta sua vaga, faça o check-in na porta, e o evento aparece
> aqui.`

Regra por trás: publica quem tem presença registrada no evento, e o
organizador. O organizador pode publicar antes do evento começar; os demais,
só depois. Em evento cancelado, ninguém publica.

**Quando a publicação recusa:**

| Situação | Mensagem exata |
|---|---|
| Legenda com menos de duas letras | `Escreva pelo menos duas letras na legenda.` |
| Legenda longa demais | `A legenda cabe em 500 caracteres.` |
| Evento ainda não começou, e você não organiza | `O feed guarda o que aconteceu: só o organizador publica antes do evento começar.` |
| Você não esteve no evento | `Só quem esteve no evento publica no feed dele (RN-019).` |
| Comentário com menos de duas letras | `Escreva pelo menos duas letras.` |
| Comentário longo demais | `O comentário cabe em 280 caracteres.` |

### 3.4. Eventos: encontrar

O subtítulo diz a regra: você vê o que é da sua turma, do seu curso e da
faculdade.

Dois grupos de filtros:

- **Filtrar por alcance** — `Todos`, `Minha turma`, `Meu curso`, `Faculdade`.
  Um por vez.
- **Outros filtros** — `Gratuitos`, `Pagos`, `Próximos 7 dias`, `Este mês`.

Sem resultado, a tela distingue as duas causas — e a distinção importa:
`Nenhum evento com esses filtros` (afrouxe os filtros) contra
`Nenhum evento no seu alcance` (não há o que afrouxar).

### 3.5. O que você vê, e o que nem sabe que existe

Esta é a regra central do produto, e ela é silenciosa por decisão.

| Alcance do evento | Quem vê |
|---|---|
| **Turma** | Quem é da turma |
| **Curso** | Quem é do curso |
| **Faculdade** | Todo mundo da faculdade |

Três exceções, todas deliberadas:

1. **Quem organiza vê sempre**, inclusive rascunho.
2. **Quem já tem vaga continua vendo**, mesmo que perca o vínculo — trocou de
   turma, o ingresso continua valendo. Perder acesso ao próprio ingresso seria
   pior que a inconsistência.
3. **Rascunho é invisível para todos**, exceto quem o criou. Nem administrador
   vê rascunho alheio.

Evento fora do seu alcance responde `Evento não encontrado.` — o mesmo que um
evento que não existe, **mesmo se você digitar o endereço direto**. Não é
descuido de mensagem: dizer "existe, mas você não pode ver" já vaza a
existência da festa da outra turma.

### 3.6. Inscrever-se

No detalhe do evento, o botão de inscrição. O que acontece depende de duas
coisas: se há vaga, e se é pago.

| Situação | O que acontece | Aviso na tela |
|---|---|---|
| Gratuito, com vaga | Confirma na hora | `Inscrição confirmada.` |
| Pago, com vaga | Reserva e abre cobrança | `Vaga reservada. Você tem 60 min para pagar.` |
| Lotado | Oferece a fila | `Evento lotado: 7 na fila. Entre na lista de espera.` |
| Entrou na fila | Mostra a posição | `Você é o 7º da fila.` |

**Lotado não é erro.** O sistema não recusa: desvia para a lista de espera e diz
quantas pessoas estão na frente.

**Quando a inscrição recusa de verdade:**

| Situação | Mensagem exata |
|---|---|
| Evento cancelado | `Este evento foi cancelado pelo organizador.` |
| Evento em rascunho ou aguardando aprovação | `Este evento ainda não está aberto para inscrição.` |
| Fora do seu alcance | `Este evento não está no seu alcance.` |
| Você já tem inscrição ativa | `Você já tem uma inscrição ativa neste evento.` |
| Prazo de inscrição vencido | `As inscrições deste evento já encerraram.` |

**Ao entrar na lista de espera**, quatro recusas próprias:
`Este evento não está aberto.`, `Você já tem uma inscrição ativa neste
evento.`, `As inscrições deste evento já encerraram.` e — a que confunde — 
`Ainda há vaga: inscreva-se normalmente.`

### 3.7. Pagar

A tela de pagamento tem duas abas, **Pix** e **Cartão**, e um prazo de **60
minutos**. Vencido o prazo, a vaga volta para a fila.

Não há gateway de verdade: a confirmação é simulada por botão. Em compensação,
dá para demonstrar o que um gateway real esconde — notificação duplicada sendo
ignorada em vez de cobrar duas vezes.

| Desfecho simulado | Aviso na tela |
|---|---|
| Confirmado | `Pagamento confirmado. Sua vaga está garantida.` |
| Recusado | `O pagamento foi recusado. Tente outro método.` |
| Expirou antes de pagar | `A vaga expirou antes do pagamento: o valor será estornado.` |
| Notificação repetida | `Nada mudou: essa notificação já havia sido processada.` |

Confirmado, nasce uma notificação: **Pagamento confirmado** ·
`Sua vaga está garantida. O ingresso já está no seu perfil.`

**Quando a tela de pagamento não abre**, ela diz por quê, e a razão é sempre o
estado da inscrição:

| Estado da inscrição | Mensagem exata |
|---|---|
| Na lista de espera | `Você está na lista de espera. O pagamento só abre quando uma vaga é oferecida e você a confirma.` |
| Vaga oferecida, não confirmada | `Há uma vaga oferecida para você. Confirme-a na tela do evento e o pagamento abre em seguida.` |
| Cancelada | `Esta inscrição foi cancelada, então não há cobrança em aberto.` |
| Marcada como ausente | `Esta inscrição foi marcada como ausente no evento.` |
| Já confirmada | `Esta inscrição já está confirmada.` |

Prazo vencido, a tela é categórica:

> `Vaga expirada`
>
> `O prazo para pagar terminou e a vaga voltou para a fila, para quem estava
> esperando. É a regra que impede uma vaga de ficar presa em pagamento que
> nunca chega.`

### 3.8. A fila de espera

Abrindo vaga, o primeiro da fila recebe a notificação **Abriu uma vaga para
você**, com `Confirme sua vaga em <evento> dentro de 24 h.`

Confirmando dentro da janela, a vaga é sua. Deixando passar, ela vai para o
próximo — e a tentativa de confirmar depois responde
`O prazo para confirmar esta vaga já passou.`

Outras duas recusas: `Não há vaga oferecida para esta inscrição.` e
`Inscrição não encontrada.`

### 3.9. O ingresso

Perfil → uma participação confirmada → **ingresso**. A tela mostra o QR
desenhado, um código legível (`CMP-3ESPX-9696`) e um código numérico de 8
dígitos, para digitar quando a câmera falha. O texto diz a que hora o check-in
abre.

Usado, o ingresso não volta a valer:

> `Ingresso utilizado às 19:13. Cada ingresso vale uma entrada: este QR não abre
> a porta de novo.`

| Situação | Mensagem exata |
|---|---|
| Ingresso de outra pessoa, ou inexistente | `Este ingresso não existe ou não é seu. Cada ingresso vale para uma pessoa e um evento.` |
| Inscrição não confirmada | `Só participação confirmada gera ingresso.` |
| Pagamento venceu | `O prazo para pagar terminou e a vaga voltou para a fila.` |

### 3.10. Cancelar a própria inscrição

Perfil → a participação → cancelar. O sistema explica **quanto volta**, e a
faixa depende da antecedência:

| Antecedência | Reembolso | Explicação na tela |
|---|---|---|
| Evento gratuito | — | `Evento gratuito: não há valor a devolver.` |
| Mais de 7 dias | Integral | `Cancelamento com mais de 7 dias de antecedência: reembolso integral.` |
| Entre 7 dias e 48 h | 50% | `Cancelamento entre 7 dias e 48 horas antes do evento: reembolso de 50%.` |
| Menos de 48 h | Nenhum | `Cancelamento com menos de 48 horas de antecedência: sem reembolso. A vaga é liberada para a fila de espera.` |

Duas situações em que **o reembolso é integral independentemente da
antecedência** — porque a causa não foi você:

- `O evento foi cancelado pelo organizador: você recebe o valor integral de volta.`
- `O organizador alterou data, local ou preço: você recebe o valor integral de volta.`

**Quando o cancelamento recusa:**

| Situação | Mensagem exata |
|---|---|
| Inscrição de outra pessoa | `Você só pode cancelar a sua própria inscrição.` |
| Já cancelada ou expirada | `Esta inscrição já estava encerrada.` |
| Você já entrou no evento | `Você já fez check-in neste evento.` |

Cancelando, a vaga não fica vazia: `Inscrição cancelada. A vaga foi oferecida ao
primeiro da fila.`

### 3.11. Notificações

O sino no topo mostra o número de avisos não lidos, e o rótulo para leitor de
tela diz o número em texto — `Avisos, 3 não lidos` —, não só a bolinha
vermelha. Cada aviso diz o motivo dele: vaga aberta, pagamento confirmado,
evento aprovado, evento cancelado.

---

## 4. Perfil: organizador

Você é organizador **do evento que criou**. Não é um cargo, e ninguém concede.

### 4.1. Criar

Aba **Criar**, ou **+ Criar evento** no topo. O campo que muda tudo é o
**Alcance**, e a tela explica o efeito de cada opção em texto, não em jargão:

| Alcance | O que a tela diz | Precisa de aprovação? |
|---|---|---|
| **Turma** | Só a sua turma vê e pode se inscrever | Não |
| **Curso** | Todo o curso vê | Não |
| **Faculdade** | `Toda a faculdade vê. Precisa de aprovação antes de publicar.` | **Sim**, salvo se você for admin de faculdade |

O rodapé mostra os prazos aplicados automaticamente: inscrição fecha 2 h antes
do início, cancelamento 24 h antes.

Dois botões: **Publicar evento** e salvar rascunho.

| O que você faz | Aviso na tela | Status do evento |
|---|---|---|
| Salvar rascunho | `Rascunho salvo. Só você vê este evento.` | `RASCUNHO` |
| Publicar, alcance turma ou curso | `Evento publicado.` | `PUBLICADO` |
| Publicar, alcance faculdade (aluno) | `Evento enviado para aprovação da faculdade.` | `EM_APROVACAO` |
| Publicar, alcance faculdade (admin de faculdade) | `Evento publicado.` | `PUBLICADO` |

**Quando a criação recusa:**

| Situação | Mensagem exata |
|---|---|
| Alcance acima do seu vínculo | `Você não tem vínculo com esse nível de alcance. Conclua o onboarding.` |
| Alcance não escolhido | `Escolha quem vê o evento: turma, curso ou faculdade.` |
| Data no passado | `Escolha uma data e hora futuras.` |
| Fim antes do início | `O fim do evento tem de ser depois do início.` |
| Mais de 7 dias de duração | `Um evento de mais de 7 dias provavelmente está com a data errada.` |
| Inscrição fechando depois do início | `As inscrições não podem fechar depois do evento começar.` |
| Cancelamento depois do início | `O prazo de cancelamento não pode ser depois do evento começar.` |
| Preço com três casas decimais | `Use no máximo duas casas decimais.` |
| Pergunta de escolha com uma opção | `Pergunta de escolha única precisa de pelo menos 2 opções.` |

Capacidade vai de 2 a 2000; no máximo 5 perguntas customizadas.

### 4.2. Acompanhar

Perfil → aba **Criados**. A aba existe para todos; sem nada organizado, ela
mostra:

> `Você ainda não organizou nada`
>
> `Quem organiza define alcance, capacidade e prazo — e valida o check-in na
> porta.`

Cada evento traz o status como etiqueta em texto — `em aprovação`, `publicado`,
`cancelado`, `realizado`, `rascunho` — e o link **Abrir check-in**.

### 4.3. Validar check-in na porta

Perfil → aba **Criados** → **Abrir check-in**. Ou, no detalhe de um evento que
você organiza, a seção **Você cuida deste evento**:

> `O painel da porta valida ingresso por QR Code e mostra quem já entrou.`

O painel mostra confirmados, presentes e a lista de quem falta. Cole o código do
ingresso, ou digite o numérico de 8 dígitos.

**A janela de check-in abre 4 h antes do início e fecha 2 h depois do fim.** Fora
dela, o painel abre e recusa toda leitura:

> `Janela de check-in fechada`
>
> `Fora da janela toda leitura é recusada, com o motivo na tela. O check-in abre
> 4 h antes do início e fecha 2 h depois do fim.`

Aceito, o painel mostra **Aceito**, o nome de quem passou e a turma, com
`Check-in confirmado.`

**As sete recusas, com o motivo nomeado na tela.** O painel imprime o código do
motivo em maiúsculas junto da mensagem — é feio de propósito: quem está na porta
com fila esperando precisa do motivo em uma palavra.

| Motivo | Mensagem exata |
|---|---|
| `TOKEN_INVALIDO` | `Ingresso inválido.` |
| `OUTRO_EVENTO` | `Este ingresso é de outro evento.` |
| `EVENTO_CANCELADO` | `Este evento foi cancelado: o check-in está encerrado.` |
| `AINDA_NAO_ABRIU` | `O check-in abre às 13:00.` |
| `JA_ENCERROU` | `O check-in encerrou às 21:00.` |
| `JA_UTILIZADO` | `Ingresso já utilizado às 19:13.` |
| `SEM_PERMISSAO` | `Você não tem permissão para validar check-in neste evento.` |

`NAO_CONFIRMADA` é o oitavo, e ele se desdobra conforme o estado da inscrição —
porque "não confirmada" não diz à pessoa na porta o que fazer:

| Estado da inscrição | Mensagem exata |
|---|---|
| Pagamento pendente | `Pagamento pendente: a inscrição ainda não está confirmada.` |
| Na lista de espera | `Esta pessoa está na lista de espera, sem vaga confirmada.` |
| Vaga oferecida, não confirmada | `Há uma vaga oferecida, mas ainda não confirmada.` |
| Cancelada | `Inscrição cancelada.` |
| Expirada | `A vaga expirou e foi liberada para a fila.` |
| Marcada como ausente | `Esta inscrição foi marcada como ausente.` |
| Já presente | `Check-in já registrado.` |

Antes de validar, o campo avisa sobre formato estranho:
`Formato não reconhecido — validar vai recusar como ingresso inválido.`

### 4.4. O que o organizador **não** consegue fazer pela tela

Registrado porque a ausência engana mais que a presença. Estas ações existem na
regra e na API, e **não têm tela no app**:

| Ação | Onde existe | Onde não existe |
|---|---|---|
| Editar evento publicado | Regra e API | Sem tela |
| Cancelar evento | Regra e API | Sem tela |
| Ver a lista de confirmados como lista | Regra e API | Só dentro do painel de check-in |
| Registrar presença manualmente | Regra e API | Sem tela |
| Remover publicação do feed do seu evento | Regra e API | Sem tela |
| Devolver dinheiro | Regra e API | Sem tela |

Duas regras que valem quando essas telas existirem, e que já estão escritas:

- **Alcance não amplia depois de publicar.**
  `O alcance não pode ser ampliado depois da publicação: quem já se inscreveu
  concordou com outro público. Cancele o evento e crie outro.`
- **Alcance não reduz deixando gente de fora.**
  `Reduzir o alcance agora deixaria de fora pessoas que já têm vaga. Cancele o
  evento e crie outro.`

E sobre capacidade:
`Já há 233 vagas ocupadas. A capacidade não pode ficar abaixo disso.`

---

## 5. Perfil: admin de curso

Usuário de demonstração: **Henrique Lima** (`henrique.lima@fiap.com.br`), turma
2ESPA, Engenharia de Computação. Papéis: `ALUNO` e `ADMIN_CURSO`.

### 5.1. O que muda na tela: quase nada

Ele **não** tem aba própria, menu próprio nem tela própria. Usa o app como
aluno. Duas coisas mudam, e as duas são discretas:

1. **Ele vê qualquer evento de turma da instituição**, não só os da 2ESPA. É a
   regra de alcance ampliada para quem administra curso.
2. **Ele abre o painel de check-in de eventos do curso dele** sem ser o
   organizador. No detalhe desses eventos aparece a seção **Você cuida deste
   evento**, igual à do organizador.

Fora isso, a tela dele é a tela de um aluno.

### 5.2. O que ele **não** faz

| O que muita gente supõe | O que o código faz |
|---|---|
| Aprova evento de curso | **Evento de curso nunca precisa de aprovação.** Não há o que aprovar |
| Aprova evento de faculdade | Não. Só admin de faculdade aprova |
| Vê a fila de aprovação | Não. E a fila não tem tela nenhuma no app |
| Vê evento aguardando aprovação | **Não.** Só admin de faculdade vê |
| Remove publicação | A regra permite, no escopo dele. Não há tela |
| Regera código de convite da turma | A regra permite. Não há tela |

A tela de login descreve o Henrique como quem "aprova evento de alcance de
curso". **Esse texto está errado** — a seção 8 explica.

### 5.3. Abrindo o check-in de um evento alheio

Sem competência sobre o evento, o painel recusa antes de abrir:

> `Você não valida o check-in deste evento`
>
> `Quem valida é Rafael Souza, que organiza o evento, e os administradores do
> curso ou da faculdade. Peça para ser incluído na organização.`

O texto nomeia quem organiza — é o que transforma a recusa em próximo passo.

---

## 6. Perfil: admin de faculdade

Usuário de demonstração: **Isabela Duarte** (`isabela.duarte@fiap.com.br`),
turma 4SIA, Sistemas de Informação. Papéis: `ALUNO` e `ADMIN_FACULDADE`. Ela
organiza a Feira de Carreiras e a Semana de Recepção.

### 6.1. O que muda na tela

Três diferenças, todas verificáveis:

1. **Publica evento de faculdade sem aprovação.** Onde um aluno recebe
   `Evento enviado para aprovação da faculdade.`, ela recebe
   `Evento publicado.` — quem aprova não espera por si mesmo.
2. **Vê evento aguardando aprovação.** É a única que vê. Nem o admin de curso
   vê.
3. **Abre o painel de check-in de qualquer evento da faculdade dela.**

E uma diferença que **não** é dela: por ser de Sistemas de Informação, Isabela
**não vê** os eventos de turma e de curso da Engenharia. Papel administrativo
de faculdade dá acesso ao que é de alcance de faculdade e ao que está em
aprovação — não a tudo. Isso é a prova visual mais clara de como o alcance
funciona.

### 6.2. A aprovação: existe a regra, não existe a tela

Sendo honesto sobre o estado do produto: o ciclo de aprovação **está pela
metade na interface**.

| Etapa | Estado |
|---|---|
| Aluno cria evento de faculdade e publica | Funciona |
| Evento nasce `EM_APROVACAO` | Funciona |
| O organizador vê a etiqueta `em aprovação` no perfil | Funciona |
| Isabela vê o evento | Funciona |
| Isabela **aprova** | **Não há tela nem botão no app** |
| Aprovado, o organizador é notificado | A notificação existe |

Na API a aprovação está completa — há rota para aprovar, rota para listar a fila
e recusa nomeada para quem não pode:

| Situação | Mensagem exata da API |
|---|---|
| Não é admin de faculdade, e pede a fila | `Só Admin de Faculdade vê a fila de aprovação.` |
| Não é admin de faculdade, e tenta aprovar | `Só Admin de Faculdade aprova evento de alcance faculdade.` |
| Evento já publicado | `Este evento já está publicado.` |
| Evento não está aguardando aprovação | `Este evento não está aguardando aprovação.` |

No protótipo com dados simulados, a tentativa de aprovar responde com a
mensagem que diz exatamente o que fazer:
`"aprovação de evento (POST /eventos/{id}/aprovacao)" só existe contra a API
real. Suba a API e use VITE_DATA_SOURCE=api.`

Nem o organizador aprova o próprio evento — se ele pudesse, a aprovação não
existiria.

### 6.3. Como demonstrar a aprovação

Nenhum evento dos dados de demonstração está em aprovação. Para ver o estado, é
preciso criá-lo:

1. Entre como **Marina Alves** (aluna comum).
2. **Criar evento** → alcance **Faculdade** → **Publicar evento**.
3. O aviso é `Evento enviado para aprovação da faculdade.`
4. Perfil → aba **Criados**: a etiqueta é `em aprovação`.
5. Saia e entre como **Isabela Duarte**: o evento aparece para ela.
6. **Aqui o caminho termina na interface.** Aprovar exige a API.

---

## 7. Quando algo não carrega

Nenhuma destas mensagens é culpa do que você fez.

| Situação | Mensagem exata na tela |
|---|---|
| Sem conexão com o servidor | `Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.` |
| Erro sem causa conhecida | `Algo não funcionou. Tente de novo.` |
| Falha ao carregar uma seção | `Não carregou`, com o botão `Tentar de novo` |
| Os dados de demonstração não subiram | `Os dados de demonstração não carregaram.` |
| Cobrança não abriu | `Não conseguimos abrir a cobrança.` |
| Publicação não saiu | `Não conseguimos publicar agora.` |
| Endereço que não existe | `Página não existe` |

---

## 8. Duas divergências entre o texto e a regra — encontradas e corrigidas

Registradas aqui porque um manual que as esconde faz o leitor confiar no texto
errado. As duas foram encontradas conferindo **mensagem por mensagem contra a
regra que as dispara** — que é um jeito de revisar que nenhum teste substitui, e
que nenhuma das duas teria sido pega por lint, tipo ou suíte: as duas mensagens
eram sintaticamente perfeitas e semanticamente falsas.

As duas **já estão corrigidas no código**. O que segue é o registro do que era e
do que virou, porque é isso que dá para conferir.

### 8.1. A tela de login prometia autoridade que a regra nega

O cartão do Henrique Lima dizia que ele "administra o curso: **aprova evento de
alcance de curso**".

A regra não é essa, e por duas razões independentes: evento de alcance de curso
**nunca** precisa de aprovação — `requiresApproval` só é verdadeiro em alcance
`FACULDADE` —, e admin de curso **não aprova nada** — `canApproveCollegeEvent`
exige `ADMIN_FACULDADE`. Há teste para as duas afirmações em
`packages/shared/src/domain/permissions.test.ts`.

O que o admin de curso tem é **competência de escopo** (`isAdminOfScope`):
editar, cancelar e validar check-in dos eventos do curso dele.

| | Texto |
|---|---|
| Antes | `Administra o curso: aprova evento de alcance de curso.` |
| Agora | `Competência de escopo no curso: edita, cancela e valida check-in.` |

### 8.2. A recusa do check-in era mais restritiva que a autorização

Ao recusar o painel de check-in, o servidor de demonstração respondia
`Só o organizador valida check-in deste evento.`

A regra que ele **acabou de aplicar** dizia outra coisa: `canValidateCheckIn`
admite o organizador **ou** o administrador do escopo. A consequência prática é
a pior de uma mensagem errada — um admin de curso lia que não podia validar um
evento do próprio curso, quando podia, e desistiria de tentar.

| | Mensagem |
|---|---|
| Antes | `Só o organizador valida check-in deste evento.` |
| Agora | `Quem valida o check-in é o organizador do evento ou um administrador do curso ou da faculdade.` |

A tela já dizia o certo (`Quem valida é <nome>, que organiza o evento, e os
administradores do curso ou da faculdade.`) — era o servidor que contradizia a
si mesmo.

---

## 9. O que este manual não cobre

Para não haver dúvida sobre o alcance dele:

| Não coberto | Por quê |
|---|---|
| Screenshots das telas | **Pendente.** As telas estão descritas em texto — o que aparece, em que ordem, o que é tocável. As capturas precisam ser tiradas em navegador real, e ficaram pendentes |
| Cadastro de conta nova | Não existe. Os usuários vêm dos dados de demonstração |
| Recuperação de senha | Não existe |
| Uso sem internet | Não existe cache offline. O motivo está em [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) |
| Edição e cancelamento de evento, reembolso, moderação, presença manual | Existem na regra e na API, sem tela (seção 4.4) |
| Aprovação de evento pela interface | Seção 6.2 |

Cada ausência com destino está no [roadmap](13-roadmap-cp5-cp6.md).
