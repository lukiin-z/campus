# Ambiente de teste

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-02 | CP5 | Versão inicial: acesso online, execução local, instalação como PWA, usuários do seed, roteiro de 5 minutos, reset de estado e limitações |
| 1.1 | 2026-09-02 | CP5 | Acrescenta o usuário sem vínculo (`lucas.tavares`) e o evento em andamento (`evt-013`), que tornaram o onboarding e o **check-in aceito** demonstráveis; corrige os ids de participação do estado inicial |

Este documento é para **quem vai avaliar o CP5**, não para quem escreveu o código. Ele
responde três perguntas na ordem em que elas aparecem: onde clico, o que vou ver, e o que
não funciona.

Tudo aqui foi executado. Onde há bloco `comando → saída esperada`, a saída é a que a
máquina devolveu, não a que se espera que ela devolva. Onde algo **não** foi verificado,
está escrito que não foi.

**Responsável:** Lucas Baraldi (Tech Lead / Arquiteto) · RM555407

---

## 1. Acesso online

O site é publicado pelo GitHub Actions a cada push em `main`
([`deploy-pages.yml`](../.github/workflows/deploy-pages.yml)). Cinco endereços saem do
mesmo deploy:

| Endereço | O que é |
|---|---|
| `https://lukiin-z.github.io/campus/` | O app React, com dados mockados. É o entregável principal |
| `https://lukiin-z.github.io/campus/styleguide/` | A marca inteira em uma página, com contraste medido |
| `https://lukiin-z.github.io/campus/prototipo/` | O protótipo estático original, preservado |
| `https://lukiin-z.github.io/campus/slides/` | Deck de apoio do vídeo do CP4 |
| `https://lukiin-z.github.io/campus/slides-cp5/` | Deck de apoio do vídeo do CP5 |

### O que depende de uma ação do dono do repositório

O workflow de publicação está pronto e validado, mas **o GitHub Pages ainda não foi
ativado no repositório**. Enquanto não for, os cinco endereços acima retornam 404 — e é
por isso que este documento não afirma que o site está no ar.

A ativação exige permissão de administrador e é feita uma única vez, pelo dono do
repositório:

1. Abrir `https://github.com/lukiin-z/campus/settings/pages`
2. Em **Build and deployment → Source**, escolher **GitHub Actions**
3. Em **Actions → Deploy GitHub Pages**, disparar **Run workflow** na branch `main`
   (ou dar qualquer push em `main`)

Depois do primeiro deploy verde, os cinco endereços passam a responder. Até lá, use a
execução local da seção 2 — ela exercita exatamente o mesmo código, com os mesmos dados.

O deck do CP5 (`/slides-cp5/`) é copiado de forma condicional: se o arquivo do deck ainda
não estiver no commit, o deploy publica as outras quatro entregas e registra um aviso, em
vez de falhar inteiro.

---

## 2. Rodar local em 3 comandos

Pré-requisito: **Node 22.17.0** (fixado em [`.nvmrc`](../.nvmrc)). Não há backend, banco,
container, chave de API nem arquivo `.env` para configurar — o mock sobe junto com o app.

```bash
git clone https://github.com/lukiin-z/campus.git
cd campus/app
npm ci && npm run dev
```

Abra `http://localhost:5173`.

### comando → saída esperada

```
$ npm run dev

  VITE v6.4.3  ready in 412 ms
  ➜  Local:   http://localhost:5173/
```

Aberto o endereço, a primeira tela é o login. O console do navegador não mostra erro; o
MSW sobe em modo silencioso (`quiet: true` em `src/main.tsx`), então **ausência de
mensagem é o sinal de sucesso**. O que confirma que o mock está de pé é a tela carregar
dados — e a verificação direta:

```
$ # no console do navegador
$ await (await fetch('/api/eventos', {headers:{'x-usuario-id':'usr-001'}})).json()
→ Array(8)   // 8 eventos visíveis para a Marina, em application/json
```

Se isso devolver HTML em vez de JSON, o service worker do mock não assumiu o controle:
recarregue a página uma vez (é normal o MSW recarregar sozinho no primeiro acesso).

### Build de produção, se quiser servir o pacote final

```bash
npm run build && npm run preview
```

```
$ GITHUB_PAGES=true npm run build

  vite v6.4.3 building for production...
  ✓ 390 modules transformed.
  dist/index.html                  4.74 kB │ gzip:   2.07 kB
  dist/assets/index-DpQwzrQa.css  22.12 kB │ gzip:   5.05 kB
  dist/assets/react-D0Kh0zaq.js  157.31 kB │ gzip:  51.58 kB
  ✓ built in 3.70s
```

`GITHUB_PAGES=true` é o que faz o Vite usar a base `/campus/`, igual à do Pages. Sem a
variável, a base é `/` — que é o certo para rodar local.

### Um comando só, para demonstração

Há um atalho para subir o app já no pacote de produção, que é o estado mais próximo do
que a banca vê no Pages:

```bash
npm run demo
```

Ele faz build e serve o resultado em `http://localhost:4173`, abrindo o navegador. A
diferença prática em relação ao `npm run dev`: o pacote servido é o mesmo que o deploy
publica, com o manifest e os ícones nos caminhos definitivos — é nesse modo que a
instalação como app (seção 3) deve ser demonstrada.

---

## 3. Instalar como app (PWA)

O app declara um [Web App Manifest](../app/public/manifest.webmanifest) com nome, ícones,
cor de tema e `display: standalone`. Instalado, ele abre em janela própria, sem barra de
endereço, com ícone na gaveta de aplicativos.

Requisito comum a todas as plataformas: **origem segura**. Vale `https://` (o Pages) e
`http://localhost` (a execução local). Não vale abrir por IP da rede local em `http://` —
o navegador recusa a instalação, e não há como contornar sem certificado.

| Plataforma | Como instalar | O que funciona | O que não funciona |
|---|---|---|---|
| **Android / Chrome** | Menu **⋮ → Instalar aplicativo** (ou a faixa que o Chrome oferece) | Ícone na gaveta, janela sem barra de endereço, splash com a cor de fundo, ícone recortado na forma do sistema (usa o ícone `maskable`) | Sem uso offline: aberto sem rede, o app não carrega |
| **Desktop Chrome / Edge** | Ícone de instalação na barra de endereço, ou menu **⋮ → Instalar** | Janela própria, ícone na área de trabalho e no menu iniciar | Sem uso offline |
| **iOS / Safari** | **Compartilhar → Adicionar à Tela de Início** | Abre em tela cheia sem a interface do Safari (as metas `apple-mobile-web-app-*` estão declaradas) | O ícone da tela de início: o Safari **ignora ícone em SVG** e usa uma miniatura da página no lugar do símbolo do Campus |
| **Firefox (desktop)** | Não instala | — | O Firefox desktop não implementa instalação de PWA |

### Por que os ícones são SVG, e o que isso custa

Os ícones são SVG, declarados no manifest como `"type": "image/svg+xml"`. Foi decisão
consciente, não descuido: gerar PNG nos tamanhos 192, 512 e maskable exigiria adicionar
uma dependência de rasterização ao projeto (`sharp`, `resvg`, `puppeteer` ou similar) só
para produzir três arquivos estáticos — e o CP5 não adiciona dependência sem necessidade
real. Os SVGs são derivados dos arquivos da marca em
[`06-marca/assets`](06-marca/assets) e escalam para qualquer tamanho sem perda.

O preço está medido:

- **Chrome e Edge aceitam** ícone SVG no manifest, em desktop e Android.
- **Safari no iOS não aceita.** O `apple-touch-icon` aponta para o SVG, o Safari o
  descarta e usa uma captura da página como ícone da tela de início. Instalar funciona; o
  ícone sai errado.
- A correção é um PNG de 192 e um de 512 em `app/public/icons/`. Nada além disso: a tag
  `apple-touch-icon` já está no `index.html` e passa a valer sozinha.

### Não há cache offline, e a razão é o mock

O app **não registra service worker próprio**, então não há app shell em cache e não há
uso offline. Isso não é omissão — é o resultado de um conflito real, medido no navegador.

O MSW registra o worker `mockServiceWorker.js` no escopo raiz da base. É ele que
intercepta `fetch('/api/...')` e devolve os dados do mock: sem ele, o app não tem dado
nenhum. E **um escopo de service worker admite uma única registração** — registrar outro
script no mesmo escopo substitui o anterior.

A medição, feita no navegador com um worker de teste registrado no mesmo escopo:

```
antes                → 1 registro, escopo '/', ativo: mockServiceWorker.js
registra sw de teste → 1 registro, escopo '/', ativo: sw-experimento.js
GET /api/eventos     → 200 text/html  ("<!doctype html>...")   ← mock morto
```

A requisição da API passou a devolver a página HTML em vez de JSON, ou seja: o app
inteiro quebraria. Depois de remover o worker de teste e recarregar, o estado volta:

```
GET /api/eventos     → 200 application/json, 8 eventos
```

Existe um jeito suportado de conviver — empacotar o worker do MSW dentro do nosso
(`importScripts`) e passar a opção `findWorker` no `worker.start()`. Ele não está
disponível aqui: o padrão do MSW compara o `scriptURL` por igualdade estrita e, não
achando o worker dele, registra de novo e derruba o nosso; e `worker.start()` fica em
`app/src/main.tsx`, fora do escopo desta entrega.

Conclusão registrada: **PWA instalável pelo manifest, sem cache offline.** Um offline que
derruba os dados da demonstração vale menos que nenhum offline. O service worker próprio
entra no CP6, junto com a saída do mock — quando o conflito deixa de existir.

### O que foi medido, e o que não foi

Separando o verificado da expectativa, porque a diferença importa na hora de avaliar:

| Verificado no navegador | Não verificado |
|---|---|
| O manifest é buscado pelo navegador na carga da página: `GET /manifest.webmanifest → 200 application/manifest+json` | O **clique em "Instalar"** de ponta a ponta. O navegador embutido usado na verificação não expôs o evento `beforeinstallprompt`, então a instalação em si não foi exercitada |
| Os quatro arquivos servem com o tipo certo: manifest em `application/manifest+json`, os três SVGs em `image/svg+xml` | O ícone na tela de início do **iOS** — a limitação do SVG está documentada por especificação do Safari, não por medição nossa |
| Há um service worker ativo com manipulador de `fetch` (o do MSW), e o contexto é seguro (`isSecureContext: true`) | O comportamento do pacote de produção sob a base `/campus/` **dentro de um navegador**: o ambiente de verificação recusou registrar service worker em porta que ele não gerencia. O artefato foi conferido por HTTP (todos os caminhos com status e tipo corretos) e por auditoria do `dist/` |
| Os campos obrigatórios do manifest, o par 192/512 e o ícone `maskable` — em todo push, pelo CI | — |

Ou seja: **os pré-requisitos de instalação estão todos satisfeitos e medidos**; o gesto de
instalar precisa de uma conferência em navegador real, e é um clique.

---

## 4. Usuários de teste do seed

A senha é a mesma para todos: **`campus123`**. Ela está declarada em
`app/src/mocks/support.ts` (`SENHA_DEMO`) e em `app/src/features/auth/perfis.ts`. Não há
cadastro nem recuperação de senha no CP5.

**Atalho:** a tela de login tem uma seção **"Entrar como · Demonstração"** com cinco
cartões. Um toque preenche o formulário e entra — não é preciso digitar e-mail.

| E-mail | Papéis | Curso / turma | O que permite demonstrar |
|---|---|---|---|
| `marina.alves@fiap.com.br` | aluno | Eng. de Computação · 3ESPX | **A persona participante.** É o perfil mais rico do seed: começa com uma vaga confirmada com ingresso, um pagamento pendente, uma oferta de vaga da lista de espera e dois eventos passados publicáveis no feed |
| `rafael.souza@fiap.com.br` | aluno | Eng. de Computação · 3ESPX | **A persona organizador.** Criou o churrasco da 3ESPX (`evt-001`) e tem um rascunho não publicado (`evt-011`): painel de check-in, lista de confirmados e o estado rascunho |
| `henrique.lima@fiap.com.br` | aluno · admin do curso | Eng. de Computação · 2ESPA | Papel administrativo de **curso**. Está em duas listas de espera, o que mostra a fila do ponto de vista de quem espera |
| `isabela.duarte@fiap.com.br` | aluno · admin da faculdade | Sistemas de Informação · 4SIA | Papel administrativo de **faculdade**. Organiza a Feira de Carreiras (`evt-004`) e a Semana de Recepção (`evt-010`). Por ser de outro curso, **não vê** os eventos de turma e de curso da Engenharia — é a prova visual do alcance |
| `lucas.tavares@fiap.com.br` | aluno | **sem curso e sem turma** | **Conta nova.** É o único usuário com `cursoId` e `turmaId` nulos: entrar com ele cai no onboarding em vez do feed. Use o código `3ESPX-26` |

O seed tem 13 usuários; os oito restantes existem para dar volume às listas de
confirmados e às filas, e não têm cartão na tela de login. A lista completa está em
`app/src/mocks/seed.ts`.

### O onboarding, e o usuário que existe para demonstrá-lo

Entre com **Lucas Tavares** (`lucas.tavares@fiap.com.br`). Ele é o único usuário do seed
com `cursoId` e `turmaId` nulos, então o redirect para `/onboarding` dispara sozinho — não
é preciso digitar URL.

```
Entrar como Lucas Tavares
→ redireciona para /onboarding
→ "Falta o seu vínculo" · passo 1 de 2 · escolha do curso + código de convite
```

Este usuário foi acrescentado ao seed depois de a primeira versão deste documento
registrar que ele não existia: sem ele, o fluxo de RF-004/RF-005 só era alcançável
digitando a URL à mão, e o redirect automático — que é metade da regra — nunca era
exercitado.

**Códigos de convite válidos do seed:**

| Código | Turma | Curso |
|---|---|---|
| `3ESPX-26` | 3ESPX | Engenharia de Computação |
| `2ESPA-26` | 2ESPA | Engenharia de Computação |
| `4SIA-26` | 4SIA | Sistemas de Informação |
| `1CCB-26` | 1CCB | Ciência da Computação |

Vale demonstrar as três recusas, porque cada uma tem mensagem própria:

```
código inexistente  → 422 CODIGO_INVALIDO
                      "Esse código de turma não existe. Confira com quem te passou."
código de outro curso (escolher Engenharia e digitar 4SIA-26)
                    → 422 CODIGO_DE_OUTRO_CURSO
                      "Esse código é de outro curso. Volte e escolha o curso da turma 4SIA."
e-mail pessoal no login → 422 DOMINIO_NAO_INSTITUCIONAL
                      "Use seu e-mail institucional (@fiap.com.br)."
```

O código é normalizado: ` 3espx 26 ` entra igual a `3ESPX-26` (espaço, hífen e caixa não
reprovam um código certo).

---

## 5. Roteiro de 5 minutos

Nove passos, cerca de 5 minutos. Entre como **Marina Alves** pelo cartão de demonstração.
Cada passo diz o que clicar, quanto tempo leva e **o que observar** — o que observar é a
parte que importa, porque é ali que a regra de negócio aparece na tela.

| # | Tempo | O que clicar | O que observar |
|---|---|---|---|
| 1 | 20 s | Na tela de login, o cartão **Marina Alves** | Entra sem digitar. O cabeçalho passa a mostrar `ENGENHARIA DE COMPUTAÇÃO · TURMA 3ESPX`: o vínculo é o que define o feed |
| 2 | 30 s | Sair e entrar como **Lucas Tavares** | Cai em `/onboarding` sozinho, porque ele não tem vínculo. Escolha Engenharia e digite `4SIA-26`: a recusa diz **de qual turma é o código**, não "erro". Depois `3ESPX-26` conclui e o feed abre. Volte a entrar como Marina |
| 3 | 40 s | Aba **Eventos** e os filtros de alcance | 10 eventos visíveis para a Marina, e o filtro **Minha turma / Meu curso / Faculdade** muda a lista. O churrasco da 3ESPX só aparece porque a Marina é da 3ESPX |
| 4 | 35 s | **+ Criar evento** | O campo **Alcance** explica o efeito em texto ("Só a sua turma vê e pode se inscrever. Alcance: 3ESPX"), e o rodapé mostra os prazos aplicados automaticamente. Dá para publicar ou salvar rascunho |
| 5 | 30 s | Evento **Roda de conversa: mercado de dados** → inscrever | 19 vagas, gratuito: a inscrição **confirma na hora**, sem pagamento. A contagem de vagas cai na tela |
| 6 | 40 s | Evento **Hackathon Campus 48h** | Lotado (80/80). Não há recusa: a tela mostra **"Você é o 7º da fila"**, quantas pessoas há na frente e a regra da janela de 24 h para confirmar quando abrir vaga |
| 7 | 60 s | Aba **Perfil** → inscrição **Festa Junina Fora de Época** (pagamento pendente) → **Pix** → simular confirmação | Cobrança de R$ 45 com prazo de 60 min. Simulada a confirmação, a inscrição vira **CONFIRMADA** e nasce uma notificação. **Simule duas vezes**: a segunda é ignorada como duplicada, em vez de cobrar de novo |
| 8 | 45 s | Aba **Perfil** → **Feira de Carreiras 2026.2** → ingresso | QR desenhado na tela, código legível (`CMP-3ESPX-9696`) e código numérico de 8 dígitos. O texto diz a que hora o check-in abre |
| 8b | 50 s | Sair, entrar como **Rafael Souza** → **Perfil** → **Maratona de estudos** → **Abrir check-in** | A janela está **aberta** (o evento começou há 1 h). Cole um dos códigos da caixa "códigos deste evento para testar": **✓ ACEITO** com o nome de quem passou. Cole o de quem já entrou: **✕ RECUSADO · JA_UTILIZADO**, com a hora do primeiro uso (RN-018) |
| 9 | 45 s | Como Marina: **Perfil** → evento passado → publicar no feed; depois o **sino** no topo | A publicação **herda o alcance do evento** (não existe post solto). O sino lista as notificações não lidas com o motivo de cada uma |

### O check-in aceito, e por que ele precisou de um evento próprio

A primeira versão deste documento registrava que **o check-in não podia ser concluído**:
todos os eventos publicados começavam entre 9 e 39 dias à frente, e a janela de RN-017
abre 4 h antes do início. O painel abria, reconhecia o QR e recusava — sempre com
`AINDA_NAO_ABRIU`.

Isso era a regra funcionando, mas deixava o caminho de sucesso de RF-034 sem demonstração,
e a recusa por uso único de RN-018 **inalcançável** (ela só existe depois de um check-in
aceito). Então entrou no seed a **Maratona de estudos para a prova de Algoritmos**
(`evt-013`), com o horário derivado de `Date.now()`: começou 1 h atrás e termina em 3 h, em
qualquer dia e a qualquer hora em que a demonstração seja feita.

```
GET /api/eventos/evt-013/checkin      (como Rafael, organizador)
→ 200 { "abertoAgora": true, "confirmados": 4, "presentes": 1,
        "aguardando": [ { "nome": "Caio Ferreira", "codigoNumerico": "84110627", … } ] }

POST /api/eventos/evt-013/checkin     { "leitura": "84110627" }
→ 201 { "aceito": true, "participante": { "nome": "Caio Ferreira", "turma": "3ESPX" },
        "mensagem": "Check-in confirmado." }

POST /api/eventos/evt-013/checkin     { "leitura": "84110629" }   ← já entrou
→ 200 { "aceito": false, "motivo": "JA_UTILIZADO",
        "mensagem": "Ingresso já utilizado às 19:13." }
```

Um dos participantes já entrou de propósito (`par-133`, com presença registrada meia hora
atrás), para a recusa por ingresso repetido poder ser mostrada sem validar duas vezes na
frente de quem avalia.

As outras recusas continuam demonstráveis, cada uma com causa nomeada: `AINDA_NAO_ABRIU`
em qualquer outro evento, `OUTRO_EVENTO` colando o código de um ingresso de outro evento,
`TOKEN_INVALIDO` colando texto qualquer, e `403 SEM_PERMISSAO` ao abrir o painel de um
evento alheio.

---

## 6. Como resetar o estado da demonstração

**Recarregar a página (F5) devolve tudo ao seed.** O banco do mock vive em memória, em uma
variável de módulo (`app/src/mocks/db.ts`); recarregar recria o módulo e, com ele, os
dados. Não há IndexedDB, não há banco no navegador, e nada do que você escreveu sobrevive.

Verificado: criei duas inscrições (`par-1001` na Festa Junina e `par-1002` no Torneio) e
uma publicação (`pub-1001`), recarreguei e conferi o que sobrou.

```
$ # depois da recarga, no console do navegador
$ (await (await fetch('/api/participacoes',
    {headers:{'x-usuario-id':'usr-001'}})).json()).map(p => p.id)
→ ["par-026","par-052","par-122","par-040","par-130","par-001","par-090","par-100"]
      // as 7 do seed; par-1001 e par-1002 não existem mais

$ (await (await fetch('/api/feed',
    {headers:{'x-usuario-id':'usr-001'}})).json()).map(p => p.id)
→ ["pub-001","pub-002","pub-006","pub-004","pub-003","pub-005"]
      // pub-1001 não está aqui

$ (await (await fetch('/api/eventos/evt-005',
    {headers:{'x-usuario-id':'usr-001'}})).json()).ocupadas
→ 287     // valor do seed; a inscrição que eu criei não conta mais
```

### O que **não** volta ao estado inicial

Uma coisa sobrevive à recarga: **a sessão**. O token fica em `sessionStorage`, sob a chave
`campus.token`:

```
$ sessionStorage.getItem('campus.token')
→ "campus.sess.usr-001"     // continua lá depois do F5
```

Ou seja: depois do F5 você continua logado como o mesmo usuário, com os dados zerados.
Para começar do zero de verdade, incluindo o login:

| Quero | Faço |
|---|---|
| Zerar os dados, seguir logado | **F5** |
| Zerar os dados e o login | **Fechar a aba e abrir de novo** (`sessionStorage` é por aba), ou sair pelo Perfil |
| Zerar tudo, inclusive o service worker do mock | Janela anônima nova |

### O estado inicial é sempre este

Recarregar não devolve um app vazio: devolve um app com trabalho em andamento. A Marina
começa toda sessão com as sete participações abaixo, e é por isso que o roteiro da seção 5
não precisa criar nada para chegar a cada fluxo:

| Participação | Evento | Estado | Serve para demonstrar |
|---|---|---|---|
| `par-052` | Festa Junina (R$ 45) | pagamento pendente | Cobrança, prazo de 60 min e webhook simulado |
| `par-122` | Visita técnica à fábrica da Bosch | oferta de vaga pendente | Vaga oferecida pela fila, com janela de 24 h correndo |
| `par-130` | Maratona de estudos (em andamento) | confirmada | O ingresso que o check-in aceita, com a janela aberta |
| `par-026` | Hackathon Campus 48h | lista de espera | Posição na fila (7ª) em evento lotado |
| `par-040` | Feira de Carreiras | confirmada | Ingresso com QR e código de check-in |
| `par-001` | Churrasco da 3ESPX | confirmada | Evento de alcance de turma, pago e confirmado |
| `par-090` | Churrasco 1CCB | presente | Evento passado, publicável no feed |
| `par-100` | Semana de Recepção | presente | Evento passado, publicável no feed |

Os dois estados pendentes (`par-052` e `par-122`) têm prazo. Se a aba ficar aberta muito
tempo, eles expiram — e aí o F5 é o que os traz de volta.

---

## 7. Verificações que você pode rodar

Nada aqui pede confiança. Da raiz do repositório, sem instalar dependência (os dois
scripts usam só a stdlib do Node):

```bash
node scripts/validate-docs.mjs
node scripts/render-diagrams.mjs --check
```

De dentro de `app/`, com as dependências instaladas:

| Comando | O que prova |
|---|---|
| `npm run lint` | ESLint com zero aviso tolerado |
| `npm run test:coverage` | Testes com o piso de 60% de cobertura no domínio |
| `GITHUB_PAGES=true npm run build` | O pacote publicável, com a base `/campus/` |
| `npm run check:size` | O pacote dentro do orçamento de tamanho |

O manifest e os ícones do PWA também são verificados, em todo push e PR, por um passo do
[`ci.yml`](../.github/workflows/ci.yml): ele exige JSON válido, os campos obrigatórios,
um ícone de 192, um de 512, um `maskable`, e que **todo ícone referenciado exista em
disco**. O passo roda antes do `npm ci`, porque não depende de dependência nenhuma:

```
$ npm run build  &&  # o passo equivalente do CI:
manifest ok: 4 ícones, todos presentes; tamanhos 192x192, 512x512, any;
purposes any, maskable
```

Removido um dos ícones, ele falha e diz qual:

```
manifest inválido:
  ícone inexistente: ./icons/icon-maskable.svg -> public\icons\icon-maskable.svg
exit=1
```

---

## 8. Limitações do ambiente de teste

Honestidade primeiro: esta é a lista do que **não** funciona, ou funciona pela metade.

| Limitação | Detalhe | Onde isso muda |
|---|---|---|
| **O Pages não está ativado** | Os cinco endereços da seção 1 só respondem depois de uma ação de administrador no repositório. O workflow está pronto e foi validado a seco, mas nenhum deploy real aconteceu | Ação do dono do repositório (seção 1) |
| **Sem uso offline** | Não há service worker próprio nem app shell em cache: sem rede, o app não abre. O escopo do service worker é do MSW, e dividir escopo mata o mock (medição na seção 3) | CP6, quando o mock sai |
| **Ícone errado no iOS** | O Safari ignora ícone SVG e usa uma captura da página na tela de início. Instalar funciona, o ícone sai errado | Dois arquivos PNG em `app/public/icons/` |
| **Firefox desktop não instala** | Não implementa instalação de PWA. Nada a fazer do nosso lado | — |
| **Instalação exige origem segura** | `https://` ou `localhost`. Abrir por IP da rede local em `http://` não instala, o que impede testar no celular contra o servidor de desenvolvimento | Usar o site do Pages, depois de ativado |
| **Check-in não pode ser aceito** | Nenhum evento do seed está dentro da janela de check-in hoje; a recusa é correta e nomeada, mas é recusa | Um evento com início nas próximas horas |
| **Os dados são do mock, em memória** | Nada persiste entre recargas, e cada aba tem seu próprio banco. Dois navegadores lado a lado **não** compartilham estado, então cenário multiusuário de verdade não é observável pela tela | CP6, com API e banco reais |
| **Autenticação é simulada** | Senha única `campus123`, sem hash, e token opaco legível pelo mock. Não há cadastro nem recuperação de senha | CP6 |
| **O e-mail não sai** | Notificação existe como registro e aparece no sino; não há envio real | CP6 |
| **Pagamento é simulado** | Não há gateway: o webhook é disparado por botão. Em compensação, dá para demonstrar o que um gateway real esconde — confirmação duplicada sendo ignorada | CP6 |
| **`npm ci` não foi reexecutado nesta rodada** | As dependências já estavam instaladas quando este documento foi escrito, então `npm run dev` e `npm run build` foram verificados, mas a instalação limpa não | — |
| **A instalação como app não foi clicada** | Todos os pré-requisitos foram medidos (seção 3), mas o gesto de instalar não foi exercitado: o navegador usado na verificação não expôs o evento de instalação. É um clique para confirmar em Chrome ou Edge real | Conferência manual |

Cada item que tem destino ("CP6") está no [roadmap](13-roadmap-cp5-cp6.md). O histórico
das decisões e dos defeitos encontrados pela verificação está no
[registro da jornada](17-jornada.md).
