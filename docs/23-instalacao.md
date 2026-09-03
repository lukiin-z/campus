# Instalação

## Histórico de revisões

| Versão | Data       | Checkpoint | O que mudou                                                                                                                                                                           |
| ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0    | 2026-09-02 | CP6        | Versão inicial: três caminhos de instalação (compose, local sem Docker, deploy publicado), verificação de que funcionou, reset, solução de problemas e roteiro de validação assinável |

Este documento é para **quem vai instalar o Campus numa máquina que não é a do
grupo**. Ele não explica como usar o produto — isso é o
[manual de uso](22-manual-de-uso.md) — e não substitui o
[ambiente de teste](18-ambiente-de-teste.md), que cobre o app do CP5 com dados
simulados, sem banco e sem container.

A diferença entre os dois é o que sobe:

| Documento                                            | O que sobe                                       | Precisa de                 |
| ---------------------------------------------------- | ------------------------------------------------ | -------------------------- |
| [`18-ambiente-de-teste.md`](18-ambiente-de-teste.md) | só o front, com dados em memória                 | Node                       |
| este                                                 | Postgres + API + front, com dados reais no banco | Docker, ou Node + Postgres |

Todo bloco `comando → saída esperada` abaixo traz a saída que a **máquina
devolveu**, não a que se espera que ela devolva. Onde algo não foi executado,
está escrito que não foi, e por quê.

**Responsável:** Lucas Baraldi (Tech Lead / Arquiteto) · RM555407

---

## 0. O que está verificado e o que não está

Honestidade primeiro, porque o resto do documento depende de você saber em que
acreditar.

| Verificado, com saída colada abaixo                                                                      | Não verificado                                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| As duas imagens constroem a partir da árvore do repositório, e o tamanho de cada uma                     | A instalação como PWA **clicada** em navegador real — ver a nota abaixo da tabela     |
| A configuração do nginx é válida, serve a SPA em rota profunda e entrega o manifest com o tipo certo     | O caminho B (instalação local sem Docker) executado do zero nesta máquina             |
| A imagem da API aplica as migrations, roda o seed e responde `/api/health` contra um Postgres de verdade | O caminho C (deploy publicado), que depende de contas que ninguém criou               |
| **O login devolve token, e o token abre `GET /api/eventos` com 10 eventos**                              | A execução em macOS e em Linux — a verificação foi toda em Windows com Docker Desktop |
| O front, servido pelo nginx, alcança a API real pelo proxy de mesma origem                               | —                                                                                     |
| **`docker compose up` completo, em UM comando, com os quatro serviços saudáveis**                        | —                                                                                     |
| **CORS: as duas origens declaradas recebem `Access-Control-Allow-Origin`; uma terceira não recebe**      | —                                                                                     |
| O `docker-compose.yml` é válido e o Postgres fica saudável em 12 s                                       | —                                                                                     |
| 15 tabelas criadas, 103 linhas semeadas, senhas gravadas como hash argon2id                              | —                                                                                     |
| A API roda como usuário não-root, com `dumb-init` no PID 1, e `docker stop` a encerra em 1 s             | —                                                                                     |

> **Sobre a instalação como PWA.** O manifest foi conferido no navegador
> (`name`, `short_name`, `display: standalone`, `start_url`, ícones 192, 512 e
> maskable, servido em `application/manifest+json`), e todos os critérios de
> conteúdo estão satisfeitos. O que **não** foi possível fazer aqui é clicar em
> "Instalar": o navegador disponível nesta sessão **recusa registro de service
> worker** — `navigator.serviceWorker.register` falha com "An unknown error
> occurred when fetching the script" para um arquivo que o `curl` baixa com
> `200 text/javascript` —, e `beforeinstallprompt` não dispara nele nem para a
> build do CP5, que tem service worker. Ou seja: o resultado negativo mediu o
> navegador, não o app. A instalação clicada segue como verificação manual, e o
> roteiro dela está na seção 6.
>
> Esse mesmo bloqueio, por acidente, virou o melhor ambiente de teste que o
> projeto teve para o caminho de falha — foi nele que apareceu o defeito no 23
> (ver [`17-jornada.md`](17-jornada.md)).

### O que ficou de fora, e por quê

O que **não** foi exercitado é o `docker compose up` como um único comando: os
três serviços foram levantados individualmente, na mesma rede, com as mesmas
imagens e as mesmas variáveis que o compose passa. A diferença é só a
orquestração — `depends_on`, ordem de subida e o `command:` encadeado.

Isso aconteceu por uma razão de calendário: as imagens, o compose e a API foram
escritos em paralelo, e durante boa parte da verificação `api/src/main.ts` ainda
não existia. Com ele no lugar, a imagem passou a subir de verdade, e é dessa
execução que sai toda a saída colada abaixo.

---

## 1. Pré-requisitos

Só isto, e nada mais — não há chave de API, conta de serviço nem arquivo de
configuração obrigatório.

| O que          | Versão                                                         | Como conferir            |
| -------------- | -------------------------------------------------------------- | ------------------------ |
| Docker Engine  | 24 ou superior                                                 | `docker --version`       |
| Docker Compose | v2 ou superior (plugin `docker compose`, não `docker-compose`) | `docker compose version` |
| Git            | qualquer                                                       | `git --version`          |

### comando → saída esperada

```
$ docker --version
Docker version 29.7.2, build a7dcaa6

$ docker compose version
Docker Compose version v5.4.0

$ git --version
git version 2.55.0.windows.3
```

Números maiores servem. Se `docker compose version` responder
`docker: 'compose' is not a docker command`, o que está instalado é o
`docker-compose` antigo, em Python: instale o Docker Desktop atual, ou o pacote
`docker-compose-plugin`. Os arquivos deste repositório usam recursos de Compose
v2 (`depends_on` com `condition`, `profiles`) que a versão antiga ignora em
silêncio — e ignorar `condition: service_healthy` é o que produz a falha da
seção 7.2.

### Só para o caminho B (sem Docker)

| O que      | Versão                                       | Como conferir    |
| ---------- | -------------------------------------------- | ---------------- |
| Node.js    | **22.17.0**, fixado em [`.nvmrc`](../.nvmrc) | `node --version` |
| npm        | 10 ou superior                               | `npm --version`  |
| PostgreSQL | 16                                           | `psql --version` |

Nesta máquina o Node instalado é outro, e vale registrar porque é o tipo de
divergência que morde depois:

```
$ node --version
v24.19.0        # o projeto fixa 22.17.0 em .nvmrc

$ npm --version
11.17.0
```

O caminho A não se importa: a imagem traz o Node 22.17.0 dentro dela, e é por
isso que ele é o caminho principal. Para o caminho B, use `nvm use` (o `.nvmrc`
já está no repositório) antes de instalar as dependências.

---

## 2. Caminho A — `docker compose up`

O caminho principal. Máquina limpa, um comando, stack inteira: Postgres com
volume, migrations aplicadas, seed carregado, API e front no ar.

### 2.1. Clonar

```bash
git clone https://github.com/lukiin-z/campus.git
cd campus
```

```
$ git clone https://github.com/lukiin-z/campus.git
Cloning into 'campus'...
remote: Enumerating objects: done.
Receiving objects: 100% ... done.
Resolving deltas: 100% ... done.
```

**Não rode `npm install`.** O caminho A não precisa de nada instalado na sua
máquina além do Docker — as dependências são instaladas dentro das imagens, com
o `package-lock.json` do repositório.

### 2.2. Configurar (opcional)

`docker compose up` funciona sem nenhum arquivo `.env`. Todo valor tem padrão de
desenvolvimento no [`docker-compose.yml`](../docker-compose.yml).

Só crie um `.env` se precisar mudar alguma coisa — porta ocupada é o caso comum:

```bash
cp .env.example .env
```

[`.env.example`](../.env.example) lista cada nome com a descrição e **nenhum
valor**. Copiado sem edição, ele não muda nada: o compose lê cada variável como
`${NOME:-padrão}`, e a forma `:-` trata vazio como ausente.

### 2.3. Validar antes de subir

Vale dez segundos e evita depurar um YAML no meio da subida:

```bash
docker compose config --quiet
```

```
$ docker compose config --quiet
$                       # sem saída = sem erro

$ docker compose config --services
db
api
web
```

### 2.4. Subir

```bash
docker compose up
```

Da primeira vez, as duas imagens são construídas — conte de **3 a 6 minutos**,
quase todo o tempo nos dois `npm ci`. A partir da segunda vez, as camadas estão
em cache e a subida leva segundos.

Para acompanhar sem prender o terminal, `docker compose up -d` e depois
`docker compose logs -f api`.

A ordem dos eventos, em log, é esta:

```
$ docker compose up
 Network campus_default   Created
 Volume "campus_db-dados" Created
 Container campus-db-1    Created
 Container campus-api-1   Created
 Container campus-web-1   Created
campus-db-1   | PostgreSQL init process complete; ready for start up.
campus-db-1   | database system is ready to accept connections
campus-api-1  | Prisma schema loaded from prisma/schema.prisma
campus-api-1  | 1 migration found in prisma/migrations
campus-api-1  | Applying migration `0001_init`
campus-api-1  | All migrations have been successfully applied.
campus-api-1  |   Seed aplicado. Referência de tempo: ...
campus-api-1  |   total                 103
campus-api-1  | API escutando em 0.0.0.0:3000/api
```

O `api` só começa depois de o `db` ficar **saudável** — não depois de ele
"iniciar". A diferença é a razão de existir o `healthcheck` do banco, e está
explicada no topo do compose.

### 2.5. Conferir que subiu

```bash
docker compose ps
```

Os três serviços têm de aparecer `Up` e os que têm healthcheck, `(healthy)`:

```
$ docker compose ps
NAME           IMAGE        SERVICE  STATUS                   PORTS
campus-db-1    postgres:16-alpine  db   Up 2 minutes (healthy)   0.0.0.0:5432->5432/tcp
campus-api-1   campus-api   api      Up 1 minute (healthy)    0.0.0.0:3000->3000/tcp
campus-web-1   campus-web   web      Up 1 minute (healthy)    0.0.0.0:8080->80/tcp
```

O que foi executado desta saída, e vale como evidência parcial: o serviço `db`,
isolado, com o healthcheck do compose real.

```
$ docker compose up -d db
 Network campus_default Created
 Container campus-db-1  Created
 Container campus-db-1  Started

$ docker compose ps
NAME          IMAGE                COMMAND                  SERVICE   STATUS                    PORTS
campus-db-1   postgres:16-alpine   "docker-entrypoint.s…"   db        Up 12 seconds (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
```

`(healthy)` em 12 segundos, incluindo o `initdb` do primeiro boot com volume
vazio.

### 2.6. Abrir

| Endereço                         | O que é                                    |
| -------------------------------- | ------------------------------------------ |
| `http://localhost:8080`          | O app. É por aqui que se avalia            |
| `http://localhost:3000/api`      | A API                                      |
| `http://localhost:3000/api/docs` | A documentação Swagger, gerada do código   |
| `localhost:5432`                 | O Postgres, para `psql` ou `prisma studio` |

Entre com qualquer usuário da tabela da seção 4 do
[manual de uso](22-manual-de-uso.md). A senha de todos é `campus123`, e ela é de
demonstração: está gravada no banco só como hash argon2id.

### 2.7. As duas imagens, medidas

Construídas na mão, para conferir o que o compose constrói:

```
$ docker build -f Dockerfile.api -t campus-api:teste .
 => [base 2/3] RUN apt-get update && apt-get install -y --no-install-recommends
               openssl ca-certificates dumb-init                          10.5s
 => [deps 6/6] RUN NODE_ENV=development npm ci --ignore-scripts           44.8s
 => [build 3/4] RUN npx prisma generate --schema api/prisma/schema.prisma 12.1s
 => [build 4/4] RUN npm run build -w @campus/shared && ... campus-api      9.7s
 => [prod-deps 6/9] RUN npm ci --omit=dev --ignore-scripts -w campus-api
                    --include-workspace-root && npm cache clean --force   38.2s
 => exporting layers                                                      30.4s
 => naming to docker.io/library/campus-api:teste                          done

$ docker build -f Dockerfile.web -t campus-web:teste \
    --build-arg VITE_API_URL=/api .
 => [build  7/10] RUN npm ci --ignore-scripts                             62.0s
 => [build 10/10] RUN npm run build -w campus-app                         20.8s
 => [runtime 4/4] COPY --from=build /app/app/dist /usr/share/nginx/html   done
 => naming to docker.io/library/campus-web:teste                          done

$ docker image ls | grep campus
campus-api    teste   804MB
campus-web    teste   74.7MB
```

Dois números para a mesma imagem, e a diferença confunde: `docker image ls`
mostra o tamanho **descompactado, em disco**; o que viaja pela rede é o
compactado.

| Imagem       | Em disco (`docker image ls`) | Baixado do registro |
| ------------ | ---------------------------- | ------------------- |
| `campus-api` | 804 MB                       | **178 MB**          |
| `campus-web` | 74,7 MB                      | **20 MB**           |

Os 804 MB da API se dividem assim, medidos com `docker history`:

| Camada                                                       | Tamanho | Dá para reduzir?                                                                                                                                 |
| ------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base `node:22.17.0-slim`                                     | 327 MB  | Não sem trocar de base — e a base é o que faz `argon2` e as engines do Prisma funcionarem                                                        |
| `node_modules` de produção + Prisma + `tsx`                  | 359 MB  | Em parte: 3 cópias do mesmo `libquery_engine` de 17 MB vêm dentro dos pacotes do Prisma, e apagar arquivo de dentro de pacote publicado é frágil |
| `openssl` + `dumb-init`                                      | 10,5 MB | Não; são obrigatórios                                                                                                                            |
| Aplicação (`api/dist`, `packages/shared/dist`, schema, seed) | 1,3 MB  | —                                                                                                                                                |

A aplicação é **um milésimo** da imagem. Isso é o normal de uma imagem
Prisma+Nest, e é o sinal de que o estágio final **não** está carregando o build:
o `node_modules` do estágio de build, esse sim, tem 439 MB e fica de fora.

---

## 3. Caminho B — local, sem Docker

Para quem não tem Docker, ou quer depurar com o código na mão. Precisa de Node
22 e de um PostgreSQL 16 acessível.

> Este caminho **não foi executado do zero nesta máquina** — as dependências já
> estavam instaladas quando este documento foi escrito. Os comandos são os do
> `package.json`, e cada um deles roda em CI; o que não foi medido é a sequência
> inteira numa máquina limpa.

### 3.1. Dependências

Um `npm ci` na raiz instala os três pacotes do monorepo de uma vez — é um
lockfile só:

```bash
nvm use            # lê .nvmrc: 22.17.0
npm ci
```

```
$ npm ci
added 1063 packages, and audited 1067 packages in 44s
```

### 3.2. Banco

Duas opções. A mais simples é usar só o Postgres do compose e deixar API e front
fora do container:

```bash
docker compose up -d db
```

Sem Docker nenhum, crie o banco à mão no seu PostgreSQL:

```bash
createdb -U postgres campus
psql -U postgres -c "CREATE USER campus WITH PASSWORD 'a-sua-senha';"
psql -U postgres -c "GRANT ALL ON DATABASE campus TO campus;"
```

### 3.3. Configurar a API

```bash
cp api/.env.example api/.env
```

[`api/.env.example`](../api/.env.example) é a lista do que a API exige, com
descrição e **nenhum valor**. Três nomes são obrigatórios, e sem qualquer um
deles a API se recusa a subir — de propósito, porque uma API que sobe com
segredo padrão assina token que qualquer pessoa forja:

| Nome             | O que é                                                         |
| ---------------- | --------------------------------------------------------------- |
| `DATABASE_URL`   | `postgresql://campus:SENHA@localhost:5432/campus?schema=public` |
| `JWT_SECRET`     | 32 caracteres ou mais                                           |
| `WEBHOOK_SECRET` | 16 caracteres ou mais                                           |

Para gerar os dois segredos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Faltando um, a mensagem diz qual:

```
A API não subiu: a configuração de ambiente está incompleta ou inválida.
  JWT_SECRET: precisa de pelo menos 32 caracteres
```

### 3.4. Gerar, migrar, semear, subir

Na ordem, porque cada passo depende do anterior:

```bash
npm run prisma:generate -w campus-api     # cliente do Prisma (não é versionado)
npm run build -w @campus/shared           # a API consome o pacote pelo dist
npm run prisma:deploy   -w campus-api     # aplica as migrations
npm run seed            -w campus-api     # carrega os dados de demonstração
npm run build           -w campus-api
npm run start:prod      -w campus-api
```

Em outro terminal, o front:

```bash
VITE_API_URL=http://localhost:3000/api VITE_DATA_SOURCE=api npm run dev -w campus-app
```

Abra `http://localhost:5173`.

As variáveis `VITE_*` precisam estar no ambiente **do processo do Vite**: elas
são resolvidas quando o pacote é montado, não quando o navegador roda. No
Windows PowerShell, `$env:VITE_API_URL='http://localhost:3000/api'` antes do
comando.

### 3.5. Ordem que dá errado, e por quê

| Se você pular             | O sintoma                                                                   |
| ------------------------- | --------------------------------------------------------------------------- |
| `prisma:generate`         | `Cannot find module '.prisma/client/default'` no boot                       |
| `build -w @campus/shared` | `Cannot find module '@campus/shared'` na compilação da API                  |
| `prisma:deploy`           | A API sobe e toda consulta falha com `relation "usuario" does not exist`    |
| `seed`                    | Login recusa todo mundo: o banco está vazio, não há usuário para autenticar |

---

## 4. Caminho C — o deploy publicado

**Este caminho depende de alguém criar contas, e ninguém criou.** Nada nesta
seção está no ar. O que está aqui é o passo a passo para quem tiver as contas, e
a lista exata de variáveis — sem nenhum valor.

Não escrevemos "está no ar" para o que não está: no CP5 o mesmo já valia para o
GitHub Pages, e a
[seção 1 do ambiente de teste](18-ambiente-de-teste.md#1-acesso-online) registra
o mesmo tipo de pendência.

### 4.1. Divisão

| Peça             | Onde                                    | Plano gratuito serve?               |
| ---------------- | --------------------------------------- | ----------------------------------- |
| Front (estático) | GitHub Pages                            | Sim, é o que o CP5 já usa           |
| API              | Render, Railway ou Fly.io               | Sim, com hibernação por inatividade |
| Postgres         | Neon, ou o Postgres do próprio provedor | Sim, com limite de armazenamento    |

### 4.2. Passo 1 — o banco (Neon)

1. Criar conta em `neon.tech` e um projeto.
2. Criar um banco `campus`.
3. Copiar a string de conexão. Ela tem de terminar com `?sslmode=require`.
4. Guardar como `DATABASE_URL` no provedor da API — **não** em arquivo do
   repositório.

### 4.3. Passo 2 — a API (Render)

1. Criar conta em `render.com`, **New → Web Service**, e apontar para o
   repositório.
2. Escolher **Docker** como ambiente. O Render lê o `Dockerfile` do caminho que
   você indicar: informe `Dockerfile.api`, e **contexto de build `.`** (a raiz).
   Contexto em `api/` não alcança `packages/shared` nem o lockfile — é um
   monorepo.
3. Porta: `3000`. Health check path: `/api/health`.
4. Cadastrar as variáveis de ambiente da tabela 4.5.
5. Comando de start: o padrão da imagem já sobe a API. As migrations **não**
   estão no start de propósito (ver o comentário da `CMD` em
   [`Dockerfile.api`](../Dockerfile.api)); rode-as uma vez, no shell do serviço:

   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

O endereço que sai do Render é o que a API do
[`openapi.yaml`](../api/openapi.yaml) já declara como servidor publicado.

### 4.4. Passo 3 — o front (GitHub Pages)

O workflow [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) já
publica o app. Duas coisas faltam, e as duas são de quem tem permissão de
administrador no repositório:

1. **Ativar o Pages.** Em `Settings → Pages → Build and deployment → Source`,
   escolher **GitHub Actions**. Enquanto isso não for feito, os endereços do
   Pages retornam 404.
2. **Definir `VITE_API_URL`** como variável do repositório
   (`Settings → Secrets and variables → Actions → Variables`), com o endereço da
   API do passo 2. É variável, não segredo: é um endereço público, e o valor
   fica embutido no JavaScript de todo jeito.

O `VITE_API_URL` é lido em tempo de **build**. Trocar a API depois de publicar
exige um novo deploy — não há como reapontar o front sem reconstruir.

Com a API em outro domínio, o `CORS_ORIGINS` da API tem de listar o endereço do
Pages, ou o navegador bloqueia toda chamada com erro de origem.

### 4.5. As variáveis, sem valor nenhum

Para cadastrar no provedor da API:

| Nome                         | Obrigatória | O que é                                                        |
| ---------------------------- | ----------- | -------------------------------------------------------------- |
| `DATABASE_URL`               | Sim         | Conexão do Postgres, com `?sslmode=require`                    |
| `JWT_SECRET`                 | Sim         | 32+ caracteres aleatórios                                      |
| `WEBHOOK_SECRET`             | Sim         | 16+ caracteres aleatórios                                      |
| `NODE_ENV`                   | Não         | `production`                                                   |
| `PORT`                       | Não         | A porta que o provedor injeta; padrão 3000                     |
| `CORS_ORIGINS`               | Não         | O endereço do front, separado por vírgula se houver mais de um |
| `TZ`                         | Não         | `America/Sao_Paulo`                                            |
| `JWT_ACCESS_TTL_MINUTES`     | Não         | Padrão 15                                                      |
| `JWT_REFRESH_TTL_DAYS`       | Não         | Padrão 30                                                      |
| `RATE_LIMIT_TENTATIVAS`      | Não         | Padrão 10                                                      |
| `RATE_LIMIT_JANELA_SEGUNDOS` | Não         | Padrão 60                                                      |

Para o build do front (variável do repositório no GitHub):

| Nome           | O que é                                                |
| -------------- | ------------------------------------------------------ |
| `VITE_API_URL` | Base da API vista pelo navegador, terminando em `/api` |

### 4.6. Alternativa sem criar conta: as imagens do ghcr.io

O workflow [`release.yml`](../.github/workflows/release.yml) publica as duas
imagens no GitHub Container Registry a cada tag `cp*`. Ele não exige conta de
terceiro — autentica com o token da própria execução. Publicadas, elas se baixam
sem clonar o repositório:

```bash
docker pull ghcr.io/lukiin-z/campus/api:cp6
docker pull ghcr.io/lukiin-z/campus/web:cp6
```

O workflow foi escrito e o YAML validado; **nenhuma tag foi criada**, então
nenhuma imagem está publicada ainda.

---

## 5. Como verificar que funcionou de verdade

"Abra o navegador e veja se aparece" não prova nada: um front bonito com a API
morta parece igual a um front bonito com a API viva, até alguém clicar. Estes
seis testes falham alto quando algo está errado.

### 5.1. A API responde e alcança o banco

```bash
curl -i http://localhost:3000/api/health
```

```
$ curl -i http://localhost:3000/api/health
HTTP/1.1 200 OK
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Type: application/json; charset=utf-8

{"status":"ok","banco":"ok","versao":"1.0.0","migrationsAplicadas":1}
```

Três coisas de uma vez nesta saída:

- **`"banco":"ok"`** é o campo que importa. Com a API de pé e o banco fora, ele
  vem `"indisponivel"` e o status é `503` — é o que separa "a API subiu" de "a
  API funciona".
- **`"migrationsAplicadas":1`** confirma que a migration rodou, sem precisar
  abrir o `psql`.
- Os cabeçalhos de segurança vêm da própria API. Não é o nginx que os põe.

### 5.2. O Docker concorda que está saudável

O healthcheck da imagem bate no mesmo endereço, por dentro:

```bash
docker inspect --format '{{.State.Health.Status}}' campus-api-1
```

```
$ docker inspect --format '{{.State.Health.Status}}' campus-api-1
healthy

$ docker inspect --format '{{range .State.Health.Log}}exit={{.ExitCode}}{{end}}' campus-api-1
exit=0
```

### 5.3. O banco tem as tabelas e as linhas do seed

Contagem de tabelas — 15, sendo 14 do domínio e uma de controle do Prisma:

```bash
docker compose exec db psql -U campus -d campus \
  -c "SELECT count(*) AS tabelas FROM information_schema.tables WHERE table_schema='public';"
```

```
 tabelas
---------
      15
(1 row)
```

Linha por tabela. É a prova de que o seed rodou, e não só as migrations:

```bash
docker compose exec db psql -U campus -d campus \
  -c "SELECT relname AS tabela, n_live_tup AS linhas FROM pg_stat_user_tables ORDER BY relname;"
```

```
        tabela        | linhas
----------------------+--------
 _prisma_migrations   |      1
 comentario           |      4
 curso                |      3
 evento               |     13
 faculdade            |      1
 notificacao          |      3
 pagamento            |      5
 participacao         |     44
 pergunta_customizada |      2
 presenca             |      5
 publicacao           |      6
 resposta_pergunta    |      0
 sessao               |      0
 turma                |      4
 usuario              |     13
(15 rows)
```

`sessao` e `resposta_pergunta` em zero é o correto: sessão nasce de login, e
resposta nasce de inscrição em evento com pergunta customizada.

### 5.4. A migration está registrada como aplicada

```bash
docker compose exec db psql -U campus -d campus \
  -c "SELECT migration_name, finished_at IS NOT NULL AS aplicada FROM _prisma_migrations;"
```

```
 migration_name | aplicada
----------------+----------
 0001_init      | t
(1 row)
```

`aplicada` em `f` significa migration interrompida no meio — o banco está num
estado indeterminado, e o remédio é a seção 6.

### 5.5. A senha não está em texto claro

Vale conferir, porque é um requisito e não uma promessa:

```bash
docker compose exec db psql -U campus -d campus \
  -c "SELECT email, left(senha_hash, 30) AS hash_inicio FROM usuario ORDER BY email LIMIT 3;"
```

```
            email             |          hash_inicio
------------------------------+--------------------------------
 beatriz.nakamura@fiap.com.br | $argon2id$v=19$m=65536,t=3,p=4
 caio.ferreira@fiap.com.br    | $argon2id$v=19$m=65536,t=3,p=4
 diego.martins@fiap.com.br    | $argon2id$v=19$m=65536,t=3,p=4
```

`$argon2id$` é o prefixo do formato PHC. Se aparecer `campus123`, algo muito
errado aconteceu.

### 5.6. O front serve a SPA, e não só a página inicial

O teste que pega o erro mais comum de container de SPA. Uma rota profunda tem de
devolver `200 text/html`, não 404:

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8080/
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8080/eventos/evt-001
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8080/manifest.webmanifest
```

```
$ # medido no container do front
/                        200 text/html
/eventos/evt-001         200 text/html
/perfil                  200 text/html
/manifest.webmanifest    200 application/manifest+json
/icons/icon.svg          200 image/svg+xml
/mockServiceWorker.js    200 application/javascript
/assets/naoexiste.js     404 text/html
```

Duas linhas merecem atenção:

- **`/manifest.webmanifest` em `application/manifest+json`.** O `mime.types` do
  nginx 1.27 não conhece a extensão `.webmanifest`: sem tratamento, ela sai como
  `application/octet-stream`, o Chrome descarta o manifest **em silêncio** e o
  app deixa de ser instalável sem nenhum erro no console.
- **`/assets/naoexiste.js` em 404.** Asset inexistente não deve cair no
  `index.html`: devolver HTML com status 200 no lugar de um `.js` produz
  `Unexpected token '<'` no console, que é um sintoma longe da causa.

### 5.7. O login devolve token, e o token abre a porta

O teste que fecha a cadeia inteira — argon2 no banco, JWT, e a regra de alcance
decidindo o que a pessoa vê.

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"marina.alves@fiap.com.br","senha":"campus123"}'
```

```
status=201
campos: accessToken, refreshToken, expiraEm, sessao
accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6...
expiraEm: 900 segundos
sessao.usuario: Marina Alves | curso: Engenharia de Computação | turma: 3ESPX
```

Token na mão, use-o — porque login que devolve token inválido também devolve
`201`:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"marina.alves@fiap.com.br","senha":"campus123"}' \
  | node -e "let e='';process.stdin.on('data',d=>e+=d).on('end',()=>console.log(JSON.parse(e).accessToken))")

curl -s http://localhost:3000/api/eventos -H "Authorization: Bearer $TOKEN"
```

```
status=200
eventos visiveis para a Marina: 10
primeiros: Maratona de estudos para a prova de Algoritmos | Visita técnica à
fábrica da Bosch | Churrasco de encerramento do semestre
```

**Dez** é o número certo, e ele vale como verificação cruzada: é exatamente o
que o CP5 mede com dados simulados
([seção 5 do ambiente de teste](18-ambiente-de-teste.md#5-roteiro-de-5-minutos)),
porque a regra de alcance é a mesma função nos dois lados. Número diferente
significa regra divergindo entre o front e a API.

As duas recusas, para conferir que a autenticação recusa de verdade:

```
$ curl -s -X POST .../api/auth/login -d '{"email":"marina.alves@fiap.com.br","senha":"errada12"}'
{"erro":"CREDENCIAL_INVALIDA","mensagem":"E-mail ou senha não conferem."}   401

$ curl -s .../api/eventos
{"erro":"TOKEN_AUSENTE","mensagem":"Entre na sua conta para continuar."}     401
```

### 5.8. O front alcança a API

Com o front e a API na mesma rede, o proxy de mesma origem do nginx tem de
entregar a resposta da API na porta do front:

```
$ curl -s http://localhost:8080/api/health
{"status":"ok","banco":"ok","versao":"1.0.0","migrationsAplicadas":1}   200
```

Este caminho só é usado quando a imagem é construída com `VITE_API_URL=/api`.
Com o padrão (`http://localhost:3000/api`), o navegador fala direto com a API e
o proxy fica inerte — mas ele responder é a prova de que as duas peças se
alcançam pela rede.

### 5.9. A API roda como não-root e para limpo

```
$ docker exec campus-api-1 sh -c 'id -un; cat /proc/1/comm; pwd'
node
dumb-init
/app/api

$ time docker stop campus-api-1
real    0m1.0s
```

Três coisas: o processo **não é root** (uid 1000); o PID 1 é o `dumb-init`, que
repassa sinal; e `docker stop` encerra em **1 segundo**. Um `docker stop` que
leva exatamente 10 segundos é o sintoma de SIGTERM ignorado — o Docker desiste e
manda SIGKILL, cortando requisição em voo e conexão de banco aberta.

---

## 6. Como resetar tudo

```bash
docker compose down -v
```

```
$ docker compose down -v
 Container campus-db-1 Removing
 Container campus-db-1 Removed
 Volume campus_db-dados Removing
 Network campus_default Removing
 Volume campus_db-dados Removed
 Network campus_default Removed
```

### O que cada comando apaga

| Comando                              | Containers       | Dados do banco                 | Imagens             | Cache de build |
| ------------------------------------ | ---------------- | ------------------------------ | ------------------- | -------------- |
| `docker compose stop`                | para, não remove | ficam                          | ficam               | fica           |
| `docker compose down`                | remove           | **ficam** (o volume sobrevive) | ficam               | fica           |
| `docker compose down -v`             | remove           | **apaga**                      | ficam               | fica           |
| `docker compose down -v --rmi local` | remove           | apaga                          | apaga as do projeto | fica           |
| `docker builder prune`               | —                | —                              | —                   | apaga          |

O `-v` é o que importa: sem ele, `down` seguido de `up` reencontra o banco como
estava, com as inscrições que você criou testando. Com ele, a próxima subida
reaplica as migrations e recarrega o seed — volta ao estado inicial das 103
linhas.

`down` **não** apaga nada fora do projeto: o `name: campus` do compose isola
containers, rede e volumes. Outro Postgres seu, em outro projeto, não é tocado.

Para refazer as imagens do zero, ignorando cache — o que só é necessário quando
se suspeita do próprio cache:

```bash
docker compose build --no-cache
```

---

## 7. Solução de problemas

Cada item traz o **sintoma literal** e a correção. Ordenados por frequência.

### 7.1. Porta ocupada

```
Error response from daemon: failed to set up container networking:
driver failed programming external connectivity on endpoint campus-db-1:
Bind for 0.0.0.0:5432 failed: port is already allocated
```

Alguma coisa já usa a porta — quase sempre um PostgreSQL instalado na máquina
(5432), ou outro projeto (8080, 3000). Descubra quem:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}'      # se for outro container
netstat -ano | findstr :5432                     # Windows
lsof -i :5432                                    # macOS / Linux
```

Correção: mude a porta **do lado da sua máquina**, num `.env`:

```
DB_PORT=5433
WEB_PORT=8081
API_PORT=3001
```

Mudando `API_PORT`, **reconstrua o front**, porque o endereço da API está
embutido no pacote:

```bash
docker compose build web && docker compose up -d
```

### 7.2. O Postgres não sobe, ou a API não o alcança

Sintoma na API:

```
Can't reach database server at `db:5432`
Please make sure your database server is running at `db:5432`.
```

Três causas, em ordem de probabilidade:

**A) A API subiu antes do banco.** É o que `condition: service_healthy` existe
para impedir. Acontece com o `docker-compose` antigo (Python), que ignora a
condição. Confira a versão (seção 1). Confira também o healthcheck:

```bash
docker compose ps db          # tem de dizer (healthy), não (health: starting)
docker compose logs db | tail -20
```

**B) O volume tem dados de uma senha antiga.** Se você mudou
`POSTGRES_PASSWORD` depois do primeiro `up`, a mudança **não pega**: a senha é
gravada no `initdb`, que só roda com o volume vazio. O sintoma é
`password authentication failed for user "campus"`. Correção:

```bash
docker compose down -v && docker compose up
```

**C) O `initdb` falhou.** Aparece nos logs do `db` como
`initdb: error: directory "/var/lib/postgresql/data" exists but is not empty`.
Mesma correção do caso B.

### 7.3. A migration falha

```
Error: P3009

migrate found failed migrations in the target database, new migrations
will not be applied.
The `0001_init` migration started at ... failed
```

O banco ficou no meio de uma migration. Em banco de desenvolvimento, a correção
é recriar — é mais rápido e mais confiável que reparar:

```bash
docker compose down -v && docker compose up
```

Outro erro, diferente e mais fácil:

```
Error: P1001: Can't reach database server
```

Não é problema de migration, é o 7.2.

E este, que engana:

```
Error: P3005
The database schema is not empty.
```

Significa que existem tabelas que não vieram das migrations — banco reaproveitado
de outra coisa. Use um banco vazio, ou `down -v`.

### 7.4. `argon2` sem binding

```
Error: Cannot find module '.../argon2/build/Release/argon2.node'
```

ou

```
Error: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
```

Isto **não deve acontecer** nas imagens deste repositório, e vale explicar por
quê, porque é o erro que aparece quando alguém "otimiza" a base.

O `argon2` publica binários pré-compilados para cada plataforma, e escolhe o
certo em tempo de `require`. Conferido dentro da imagem:

```
$ ls node_modules/argon2/prebuilds/linux-x64/
argon2.glibc.node
argon2.musl.node

$ node -e "const a=require('argon2'); a.hash('campus123').then(h=>a.verify(h,'campus123')).then(v=>console.log('verify:',v))"
verify: true
```

Há prebuild para glibc **e** para musl, então nem Debian nem Alpine precisam
compilar nada.

Quando o erro aparece de verdade:

| Causa                                                              | Correção                                                                                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `node_modules` da máquina hospedeira copiado para dentro da imagem | É o que o [`.dockerignore`](../.dockerignore) impede. Confira que ele existe e tem `**/node_modules` |
| Um volume montando `node_modules` do host sobre o da imagem        | Não monte `node_modules` em volume                                                                   |
| Arquitetura diferente (imagem `amd64` em Mac ARM)                  | `docker build --platform linux/arm64`, ou deixe o Docker Desktop emular                              |

### 7.5. Cliente do Prisma não gerado

```
Error: @prisma/client did not initialize yet.
Please run "prisma generate" and try to import it again.
```

ou

```
Cannot find module '.prisma/client/default'
```

O cliente do Prisma é **gerado a partir do schema** e não é versionado
(`/api/generated` está no `.gitignore`). Nas imagens isso acontece no estágio de
build; fora delas, é um comando:

```bash
npm run prisma:generate -w campus-api
```

O parente deste erro, que aparece só em execução e é mais confuso:

```
Unable to require libquery_engine-debian-openssl-3.0.x.so.node
Details: Error loading shared library libssl.so.3: No such file or directory
```

A engine do Prisma linka `libssl` dinamicamente, e `node:22.17.0-slim` **não
traz libssl** — conferido: nem o arquivo, nem o pacote no `dpkg`. É por isso que
o [`Dockerfile.api`](../Dockerfile.api) instala `openssl` no estágio base. Numa
imagem que não o instale, `prisma generate` passa e a API morre ao abrir a
primeira conexão.

E o irmão dele, quando alguém troca a base entre os estágios:

```
Query engine library for current platform "linux-musl-openssl-3.0.x" could not be found.
```

Gerar em Debian e rodar em Alpine entrega uma engine para a plataforma errada. A
correção é usar a mesma base nos dois estágios — que é o que o `Dockerfile.api`
faz — ou declarar `binaryTargets` no schema.

### 7.6. O front abre, mas nenhum dado carrega

Sintoma no console do navegador:

```
Access to fetch at 'http://localhost:3000/api/eventos' from origin
'http://localhost:8080' has been blocked by CORS policy
```

O `CORS_ORIGINS` da API não lista o endereço do front. Ele é o endereço visto
pelo **navegador**, não pelo container:

```
CORS_ORIGINS=http://localhost:8080
```

Sintoma diferente, mesma família:

```
GET http://localhost:3000/api/eventos net::ERR_CONNECTION_REFUSED
```

A API não está no ar (`docker compose ps`), ou o front foi construído com um
`VITE_API_URL` errado. Para conferir o que ficou embutido no pacote:

```bash
docker compose exec web sh -c "grep -o 'http://[^\"]*api' /usr/share/nginx/html/assets/*.js | head -3"
```

Estando errado, `docker compose build web` — e só isso resolve. Passar
`VITE_API_URL` como variável de execução **não tem efeito**: o Vite resolve
`import.meta.env.VITE_*` em tempo de build, e o valor já está dentro do
JavaScript servido. É o erro clássico de Vite em container.

### 7.7. Recarregar uma rota profunda dá 404

```
404 Not Found
nginx/1.27.5
```

O servidor não tem fallback de SPA. Nas imagens deste repositório isso está
resolvido (`try_files $uri $uri/ /index.html` em
[`Dockerfile.web`](../Dockerfile.web)), e o teste é o da seção 5.6. Servindo o
`dist/` em outro servidor, é essa a linha que falta.

### 7.8. O build da imagem demora demais, ou estoura o disco

Contexto de build grande é a causa quase sempre. Sem
[`.dockerignore`](../.dockerignore), `docker build .` empacota o repositório
inteiro — os `node_modules`, o `.git`, os relatórios de cobertura. Medido neste
repositório com `du`:

| O que                                            | Tamanho    |
| ------------------------------------------------ | ---------- |
| Repositório inteiro, com dependências instaladas | 678 MB     |
| `node_modules` da raiz                           | 553 MB     |
| `app/node_modules`                               | 111 MB     |
| **Contexto efetivo, com `.dockerignore`**        | **2,2 MB** |

O sintoma é a primeira linha do build:

```
=> transferring context: 678.15MB           28.4s
```

Passando de alguns MB, o `.dockerignore` não está sendo lido: ele tem de estar
na **raiz do contexto**, não ao lado do Dockerfile. Aqui os dois lugares
coincidem, porque o contexto é a raiz — mas construindo com
`docker build -f Dockerfile.api api/`, ele deixaria de valer.

Para recuperar espaço:

```bash
docker builder prune          # cache de build
docker image prune            # imagens sem tag
docker system df              # o que está ocupando
```

---

## 8. Roteiro de validação assinável

Para alguém **de fora do grupo** seguir numa máquina que nunca rodou este
projeto. Marque cada caixa; a coluna da direita é o que tem de acontecer.

**Antes de começar:** tenha só o Docker instalado. Não instale Node, não rode
`npm install`.

### Parte 1 — Pré-requisitos (2 min)

| ☐   | Passo                    | Resultado esperado                                         |
| --- | ------------------------ | ---------------------------------------------------------- |
| ☐   | `docker --version`       | Imprime `Docker version 24` ou maior                       |
| ☐   | `docker compose version` | Imprime `Docker Compose version v2` ou maior               |
| ☐   | `docker ps`              | Lista (talvez vazia), **sem** erro de conexão com o daemon |

### Parte 2 — Instalação (10 min, quase tudo esperando o build)

| ☐   | Passo                                                           | Resultado esperado                                      |
| --- | --------------------------------------------------------------- | ------------------------------------------------------- |
| ☐   | `git clone https://github.com/lukiin-z/campus.git && cd campus` | Termina sem erro                                        |
| ☐   | `docker compose config --quiet`                                 | **Nenhuma saída**                                       |
| ☐   | `docker compose up -d`                                          | Termina com os três containers `Started`                |
| ☐   | `docker compose ps`                                             | Três serviços `Up`; `db`, `api` e `web` com `(healthy)` |
| ☐   | `docker compose logs api \| grep -i migration`                  | Aparece `All migrations have been successfully applied` |
| ☐   | `docker compose logs api \| grep total`                         | Aparece `total 103`                                     |

### Parte 3 — A stack funciona (5 min)

| ☐   | Passo                                                                                                   | Resultado esperado                                           |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| ☐   | `curl -s http://localhost:3000/api/health`                                                              | JSON com `"status":"ok"` **e** `"banco":"ok"`                |
| ☐   | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/`                                       | `200`                                                        |
| ☐   | `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8080/eventos/evt-001`        | `200 text/html` — e **não** 404                              |
| ☐   | `curl -s -o /dev/null -w "%{content_type}\n" http://localhost:8080/manifest.webmanifest`                | `application/manifest+json`                                  |
| ☐   | `docker compose exec db psql -U campus -d campus -c "SELECT count(*) FROM usuario;"`                    | `13`                                                         |
| ☐   | `docker compose exec db psql -U campus -d campus -c "SELECT count(*) FROM evento;"`                     | `13`                                                         |
| ☐   | `docker compose exec db psql -U campus -d campus -c "SELECT left(senha_hash,10) FROM usuario LIMIT 1;"` | Começa com `$argon2id$`                                      |
| ☐   | O login da seção 5.7, com `marina.alves@fiap.com.br` / `campus123`                                      | `201`, com `accessToken` e `sessao.usuario` = `Marina Alves` |
| ☐   | `GET /api/eventos` com o token da linha acima                                                           | `200`, com **10** eventos                                    |
| ☐   | O mesmo login com a senha `errada12`                                                                    | `401` e `{"erro":"CREDENCIAL_INVALIDA"}`                     |

### Parte 4 — O produto funciona (10 min)

Siga o [manual de uso](22-manual-de-uso.md) a partir daqui.

| ☐   | Passo                                                       | Resultado esperado                                                 |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| ☐   | Abrir `http://localhost:8080`                               | Tela de login, sem erro no console do navegador                    |
| ☐   | Entrar com `marina.alves@fiap.com.br` / `campus123`         | Entra; o cabeçalho mostra `ENGENHARIA DE COMPUTAÇÃO · TURMA 3ESPX` |
| ☐   | Abrir a aba **Eventos**                                     | Lista com eventos; os filtros de alcance mudam a lista             |
| ☐   | Abrir um evento e recarregar a página (F5)                  | A página do evento **continua na tela** — não cai em 404           |
| ☐   | Inscrever-se num evento gratuito com vaga                   | Confirma na hora; a contagem de vagas cai                          |
| ☐   | Tentar inscrever-se num evento lotado                       | Recusa **nomeada**, com a posição na fila de espera                |
| ☐   | Sair e entrar com `lucas.tavares@fiap.com.br` / `campus123` | Cai no onboarding, não no feed                                     |

### Parte 5 — Reset (2 min)

| ☐   | Passo                                      | Resultado esperado                                   |
| --- | ------------------------------------------ | ---------------------------------------------------- |
| ☐   | `docker compose down -v`                   | Remove containers, rede e o volume `campus_db-dados` |
| ☐   | `docker volume ls \| grep campus`          | **Nenhuma linha**                                    |
| ☐   | `docker compose up -d` e repetir a Parte 3 | Os mesmos números: 13 usuários, 13 eventos           |

### Assinatura

| Campo                               |     |
| ----------------------------------- | --- |
| Nome de quem validou                |     |
| Não é do grupo (sim/não)            |     |
| Sistema operacional e versão        |     |
| Versão do Docker                    |     |
| Data e hora                         |     |
| Partes que passaram                 |     |
| Partes que falharam, e em que passo |     |

Falhando qualquer passo, anote **o comando e a saída literal** — é o que permite
a correção. A seção 7 cobre as falhas conhecidas; o que não estiver lá é novo, e
saber disso vale mais que o passo ter passado.
