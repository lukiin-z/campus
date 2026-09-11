<div align="center">

<img src="docs/06-marca/assets/logo.svg" alt="Campus" width="220" />

**Eventos da sua turma, do seu curso e da sua faculdade — com vagas, fila de espera, pagamento e check-in em um só lugar.**

[![CI](https://github.com/lukiin-z/campus/actions/workflows/ci.yml/badge.svg)](https://github.com/lukiin-z/campus/actions/workflows/ci.yml)
[![Pages](https://github.com/lukiin-z/campus/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/lukiin-z/campus/actions/workflows/deploy-pages.yml)
[![Licença MIT](https://img.shields.io/badge/licença-MIT-14181C)](LICENSE)
[![React 18](https://img.shields.io/badge/React-18-C83A16)](https://react.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-0F7A6E)](https://www.typescriptlang.org)
[![Vite 6](https://img.shields.io/badge/Vite-6-C83A16)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-tokens-0F7A6E)](https://tailwindcss.com)

</div>

---

## Identificação

**Disciplina:** Engenharia de Software · **Curso:** Engenharia de Computação, 3º ano
**Instituição:** FIAP · **Professor:** Hercules Ramos · **Turma:** ⟨TURMA⟩

| Integrante | RM | Papel no projeto |
|---|---|---|
| Ana Luiza Dourado | RM558793 | UX/UI Designer |
| João Viviani Baldini | RM558596 | Product Owner |
| Lucas Baraldi | RM555407 | Tech Lead / Arquiteto |
| Lucas Zolla | RM557952 | Analista de Requisitos |
| Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML |
| Vitor Pantarotto | RM554961 | Scrum Master / QA |

---

## Ver funcionando agora

### 🔗 **[https://lukiin-z.github.io/campus/](https://lukiin-z.github.io/campus/)**

> 🚨 **O site está servindo a página errada desde 2026-09-11, e a correção é de uma linha.**
> A origem do GitHub Pages está em **`build_type: legacy`** (`Deploy from a branch`, `main /`),
> então o Jekyll renderiza o `README.md` e publica **isso** — enquanto o artefato do app,
> montado corretamente pelo [`deploy-pages.yml`](.github/workflows/deploy-pages.yml), perde a
> corrida. Medido: `/` responde **200** mas com `<title>campus</title>` e **sem** `id="root"`;
> `/styleguide/`, `/prototipo/`, `/slides/`, `/slides-cp5/` e `/slides-cp6/` respondem **404**.
> O artefato do deploy **contém** os cinco — conferido na listagem do `tar` do run.
>
> **Correção (dono do repositório):** `Settings → Pages → Source: GitHub Actions`, ou
> `gh api -X PUT repos/lukiin-z/campus/pages -f build_type=workflow`. Depois, refaça o
> deploy e remeça. Até lá, para avaliar o app rode local — [dois comandos abaixo](#rodar-em-dois-comandos).

O app roda no navegador, sem instalar nada. Quatro cartões de demonstração na tela de
login entram como **aluno**, **organizador**, **admin de curso** ou **admin de
faculdade** — a senha de todos é `campus123`.

Roteiro de 5 minutos por fluxo, usuários do seed e limitações reais:
[`docs/18-ambiente-de-teste.md`](docs/18-ambiente-de-teste.md).

---

## O que foi entregue em cada checkpoint

| CP | O que foi entregue | Evidência |
|---|---|---|
| **CP4**<br>concepção | Documentação (43 RF, 22 RNF, 25 regras), 12 diagramas UML, identidade visual e design system, pitch, quadro do Trello, base do app React | [Checklist com evidência por critério](docs/16-checklist-entrega-cp4.md) · [Deck](https://lukiin-z.github.io/campus/slides/) · [Styleguide](https://lukiin-z.github.io/campus/styleguide/) · [Protótipo original](https://lukiin-z.github.io/campus/prototipo/) · Vídeo: ⟨VIDEO_CP4⟩ · Trello: ⟨TRELLO⟩ |
| **CP5**<br>protótipo | 12 rotas navegáveis com dados mockados: login, onboarding, inscrição, fila de espera, pagamento simulado, ingresso, check-in, feed e notificações | [Checklist com evidência por critério](docs/19-checklist-entrega-cp5.md) · [Deck](https://lukiin-z.github.io/campus/slides-cp5/) · [Ambiente de teste](docs/18-ambiente-de-teste.md) · Vídeo: ⟨VIDEO_CP5⟩ · Trello: ⟨TRELLO⟩ |
| **CP6**<br>entrega final | API NestJS sobre PostgreSQL, 43 operações, capacidade garantida por `SELECT … FOR UPDATE`, 22 restrições no banco, stack em um comando com `docker compose up` | [Checklist com evidência por critério](docs/24-checklist-entrega-cp6.md) · [Deck](https://lukiin-z.github.io/campus/slides-cp6/) · [Contrato da API](docs/21-api-contrato.md) · [Manual de uso](docs/22-manual-de-uso.md) · [Instalação](docs/23-instalacao.md) · Vídeo: ⟨VIDEO_CP6⟩ · Trello: ⟨TRELLO⟩ |

Os três checklists trazem, critério por critério, **o comando que reproduz cada número** —
não "está pronto", mas o que abrir, contar ou rodar. O pacote de entrega com o texto de
submissão dos três está em [`docs/entrega/README.md`](docs/entrega/README.md).

---

## Rodar em dois comandos

Pré-requisito: **Node 22.17.0** (o `.nvmrc` fixa a versão).

```bash
git clone https://github.com/lukiin-z/campus.git
cd campus
npm ci                 # na RAIZ. Um só package-lock.json serve os 3 workspaces
npm run dev            # http://localhost:5173
```

> ⚠️ **`npm ci` vai na raiz, nunca dentro de `app/` ou `api/`.** De dentro do workspace ele
> retorna **exit 0** e mesmo assim deixa a árvore quebrada: instala 165 pacotes em vez de
> 479, porque `prettier`, `vitest` e o resto da toolchain são declarados só na raiz. Medido
> em clone limpo em 2026-09-10 — depois disso, `build`, `test:coverage` e `format:check`
> reprovam.

**O produto inteiro — front, API e PostgreSQL — em um comando:**

```bash
docker compose up      # front em :8080, API em :3000/api
```

Roteiro completo de instalação, com os três caminhos e a solução de cada erro conhecido:
[`docs/23-instalacao.md`](docs/23-instalacao.md).

---

## Sumário

- [Identificação](#identificação)
- [Ver funcionando agora](#ver-funcionando-agora)
- [O que foi entregue em cada checkpoint](#o-que-foi-entregue-em-cada-checkpoint)
- [Rodar em dois comandos](#rodar-em-dois-comandos)
- [O problema](#o-problema)
- [Como ver funcionando](#como-ver-funcionando)
- [Funcionalidades](#funcionalidades)
- [Stack, e por que cada escolha](#stack-e-por-que-cada-escolha)
- [Como rodar](#como-rodar)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Documentação completa](#documentação-completa)
- [Equipe](#equipe)
- [Status por checkpoint](#status-por-checkpoint)
- [Licença](#licença)

---

## O problema

A vida social de um curso universitário acontece hoje em ferramentas que não foram feitas
para ela: um grupo de WhatsApp, um story de Instagram e, quando o organizador é
caprichoso, um Google Forms. Isso funciona até o evento crescer. A partir daí, quatro
problemas aparecem sempre nos mesmos pontos.

| Problema | Como acontece hoje |
|---|---|
| **O alcance é errado nas duas direções** | Um churrasco de 40 vagas da turma vira story e chega a centenas de pessoas — e o organizador passa o dia recusando gente. No sentido inverso, a Feira de Carreiras morre em um grupo de 45 pessoas |
| **O controle de vagas é manual** | Planilha com edição simultânea, "quem confirmou manda +1 aqui". Quando lota não existe fila; quando alguém desiste, a vaga evapora |
| **A cobrança é informal** | Um aluno vira tesoureiro sem querer: Pix na conta pessoal, controle por print de comprovante, dinheiro adiantado do próprio bolso |
| **Não sobra memória do que aconteceu** | As fotos morrem em stories de 24h. A gestão seguinte do Centro Acadêmico começa do zero, sem histórico de público, preço ou comparecimento |

> **Para** alunos e organizadores de eventos universitários, **que** perdem tempo e
> público porque divulgação, controle de vagas e cobrança acontecem em ferramentas
> genéricas e desconectadas, **o Campus é um** aplicativo de eventos universitários
> **que** entrega alcance segmentado por turma, curso ou faculdade com vagas, fila de
> espera, pagamento e check-in em um só lugar, **diferente de** grupos de WhatsApp,
> stories e plataformas de ingresso genéricas, **porque** conhece a estrutura acadêmica —
> turma, curso, faculdade — e usa essa estrutura como **regra de visibilidade** do evento,
> não como um campo de texto opcional.

Detalhamento, personas e jornada: [`docs/01-problema-e-personas.md`](docs/01-problema-e-personas.md).

---

## Como ver funcionando

| Link | O que é | 2026-09-10 | 2026-09-11 |
|---|---|---|---|
| **[App](https://lukiin-z.github.io/campus/)** | O app React rodando, com dados mockados | **200** | ⚠️ **200, mas servindo o README renderizado** — ver o aviso acima |
| **[Styleguide](https://lukiin-z.github.io/campus/styleguide/)** | A marca inteira em uma página: logo, paleta com contraste medido, tipografia, todos os componentes em todos os estados | **200** | 🚨 **404** |
| **[Protótipo original](https://lukiin-z.github.io/campus/prototipo/)** | O protótipo estático que originou a identidade visual, preservado | **200** | 🚨 **404** |
| **[Slides do vídeo (CP4)](https://lukiin-z.github.io/campus/slides/)** | Deck de apoio da apresentação, navegável por setas | **200** | 🚨 **404** |
| **[Slides do vídeo (CP5)](https://lukiin-z.github.io/campus/slides-cp5/)** | Deck de apoio da apresentação do CP5 | **200** | 🚨 **404** |
| **[Slides do vídeo (CP6)](https://lukiin-z.github.io/campus/slides-cp6/)** | Deck de apoio da apresentação do CP6 | **200** | 🚨 **404** |
| **[Arquivo do Figma](https://www.figma.com/design/LRohAtBOH6gyskqkA9cRKp)** | Design system com 64 tokens, 11 estilos de texto e 9 componentes com 34 variants | **403** sem sessão | **403** sem sessão — exige login no Figma |

> **Os seis primeiros links estão no ar.** Até 2026-09-10 este parágrafo dizia que o
> GitHub Pages ainda não havia sido ligado e que os endereços retornavam 404. A medição por
> HTTP contradisse o texto: **todos respondem 200**. O `deploy-pages.yml` passou a ligar o
> site sozinho (`actions/configure-pages@v5` com `enablement: true`), o que dispensou o
> passo em Settings.
>
> **Uma ressalva que continua verdadeira:** rota profunda como
> `https://lukiin-z.github.io/campus/eventos` responde **404** — e a tela **abre** de todo
> jeito, porque o deploy copia o `index.html` para `404.html` e o React Router monta a
> rota. O status é 404; o conteúdo é o certo. O porquê, com a citação da documentação
> oficial do Pages e a fronteira entre o que ela sustenta e o que foi medido aqui, está em
> [`docs/18-ambiente-de-teste.md` §1](docs/18-ambiente-de-teste.md#rota-profunda-responde-404--e-a-tela-abre).
>
> Passo a passo, usuários de teste e roteiro de 5 minutos:
> [`docs/18-ambiente-de-teste.md`](docs/18-ambiente-de-teste.md).

<div align="center">

### O elemento de assinatura da marca

<img src="docs/06-marca/assets/og-image.svg" alt="Cartão-ingresso picotado do Campus, com alcance, data, preço, barra de vagas e QR Code de check-in" width="760" />

</div>

---

## Funcionalidades

| Módulo | O que faz |
|---|---|
| **Alcance segmentado** | Todo evento tem alcance `TURMA`, `CURSO` ou `FACULDADE`, e o alcance determina **sozinho** quem enxerga — em lista, detalhe, feed e acesso por link direto |
| **Vagas sem estouro** | A capacidade nunca é excedida, mesmo com inscrições simultâneas: a verificação e a criação da participação acontecem em uma operação atômica |
| **Lista de espera FIFO** | Lotado não recusa: direciona para a fila. Vaga liberada é **oferecida ao primeiro** com janela de 24 h, e a vaga fica reservada durante a oferta |
| **Pagamento com reserva curta** | Pix e cartão via gateway. A vaga fica reservada por 60 min; sem pagamento, volta para a fila. Só o gateway confirma pagamento, e a confirmação é idempotente |
| **Reembolso com política visível** | Escala 100% / 50% / 0% pela antecedência, **exibida antes da cobrança** e congelada na participação: mudar a política depois não retroage |
| **Check-in de uso único** | Ingresso com QR assinado, válido só na janela do evento e aceito **uma vez**. Cada recusa tem motivo específico: "ingresso já utilizado às 20h14", não "erro" |
| **Feed como memória** | Publica quem esteve no evento. A publicação herda a visibilidade do evento, e não existe feed solto sem evento |
| **Acessibilidade** | Contraste WCAG 2.1 AA verificado par por par, navegação completa por teclado, foco visível e **nenhuma informação transmitida só por cor** |

Os 43 requisitos funcionais e 22 não funcionais estão em
[`docs/02-requisitos.md`](docs/02-requisitos.md); as 25 regras invariantes, em
[`docs/04-regras-de-negocio.md`](docs/04-regras-de-negocio.md).

---

## Stack, e por que cada escolha

| Camada | Escolha | Por que, e não a alternativa óbvia |
|---|---|---|
| App | **React 18 + Vite + TypeScript strict** | Publicação em loja é incompatível com o prazo do semestre; avaliação por link é mais simples para a banca. PWA instalável fica para o CP6 — [ADR-0001](docs/adr/0001-react-vite-em-vez-de-react-native.md) |
| Estilo | **Tailwind com os design tokens no `tailwind.config.ts`** | O nome do token é idêntico ao nome do style no Figma: é isso que liga design e código. Valor arbitrário em `className` é **erro de lint** — [ADR-0002](docs/adr/0002-tailwind-com-design-tokens.md) |
| Dados | **Camada de repositório + MSW interceptando HTTP** | O app fala HTTP de verdade desde já, então exercita carregamento, erro e conflito `409`. No CP6 muda **só quem responde** — nenhuma tela é tocada — [ADR-0003](docs/adr/0003-camada-de-repositorio-com-msw.md) |
| Estado | **Zustand** (sessão/UI) + **TanStack Query** (dados) | Dado de servidor tem cache, invalidação e estado de carregamento; estado de UI não. Misturar os dois é a via rápida para cache desatualizado |
| Formulário | **Zod + React Hook Form** | O schema **chama** as funções de domínio em vez de reimplementar a regra: validação de tela e regra de servidor não podem divergir |
| Domínio | **12 módulos de funções puras** em `app/src/domain/` | Sem React, sem rede, sem mock. É o que permite as mesmas regras rodarem no cliente e no servidor, e testarem em milissegundos |
| Teste | **Vitest + Testing Library + Playwright** | 704 testes de unidade e integração em 46 arquivos — 308 no domínio compartilhado, 217 no app, 83 unitários na API e 96 de integração contra PostgreSQL —, mais 9 casos E2E executados contra o build de produção |
| CI/CD | **GitHub Actions + GitHub Pages** | Lint, escala de espaçamento, formatação, cobertura, build e orçamento de pacote em todo push e PR |

Arquitetura completa, com C4 e o contrato da API planejada:
[`docs/08-arquitetura.md`](docs/08-arquitetura.md).

---

## Como rodar

Pré-requisito: **Node 22.17.0** (o `.nvmrc` fixa a versão).

```bash
git clone https://github.com/lukiin-z/campus.git
cd campus
npm ci                 # na RAIZ: há um só package-lock.json para os 3 workspaces
npm run dev
```

Abra `http://localhost:5173`. Não há backend nem variável de ambiente para configurar: o
MSW sobe com o app e responde do mock em memória, com um seed rico (1 faculdade, 3 cursos,
4 turmas, 12 usuários e 11 eventos em estados variados — lotado com fila, pago, gratuito,
cancelado, realizado e rascunho).

A tela de login tem quatro **cartões de demonstração**: um toque entra como aluno,
organizador, admin de curso ou admin de faculdade. A senha de todos é `campus123`.

Para demonstrar com o pacote de produção — o mesmo que o Pages publica, com o manifest e
os ícones nos caminhos definitivos:

```bash
npm run demo           # build + preview em http://localhost:4173
```

É nesse modo que o app pode ser **instalado como aplicativo** (Chrome e Edge, desktop e
Android): instalação de PWA exige origem segura, e `localhost` conta. Recarregar a página
devolve os dados ao seed — o mock vive em memória.

Guia completo para quem vai avaliar (links, usuários de teste, roteiro de 5 minutos por
fluxo, como instalar em cada plataforma, como resetar o estado e as limitações reais):
[`docs/18-ambiente-de-teste.md`](docs/18-ambiente-de-teste.md).

### Todos os comandos

```bash
npm run dev            # servidor de desenvolvimento
npm run demo           # build + preview, para demonstrar e instalar como PWA
npm run build          # build de produção dos 3 workspaces (tsc -b + vite build).
                       # Exige `npm run prisma:generate -w campus-api` antes: em árvore
                       # limpa, sem ele, a compilação da API reprova com 182 erros de tipo
npm run preview        # serve o build
npm run lint           # ESLint, zero aviso tolerado
npm run format:check   # Prettier
npm run test           # Vitest
npm run test:coverage  # Vitest com o limite de 60% no domínio
npm run test:e2e       # Playwright (precisa de `npx playwright install chromium`)
npm run check:scale    # classes utilitárias fora da escala de 4px
npm run check:size     # orçamento de tamanho do pacote
npm run diagrams       # regenera os SVGs dos diagramas Mermaid
npm run validate:docs  # links, âncoras, blocos Mermaid e SVGs da documentação
```

Da raiz do repositório, sem instalar nada (os dois scripts usam só a stdlib do Node):

```bash
node scripts/validate-docs.mjs
node scripts/render-diagrams.mjs --check
```

---

## Estrutura de pastas

Monorepo com **npm workspaces** desde o CP6 — três pacotes, um `package-lock.json`
([ADR-0008](docs/adr/0008-monorepo-com-dominio-compartilhado.md)).

```
campus/
├─ packages/shared/              @campus/shared — O CONTRATO ENTRE OS DOIS LADOS
│  └─ src/
│     ├─ types.ts                Entidades e enumerações. Espelha o diagrama de classes
│     ├─ domain/                 REGRAS DE NEGÓCIO em funções puras (RN-001 a RN-029)
│     │                          13 módulos. policy.ts é o único lugar com os números.
│     │                          `planPromotion` existe UMA vez, e é a mesma que decide
│     │                          na tela e na API — não há segunda cópia para divergir
│     └─ schemas.ts              Validação Zod. O formulário e o pipe da API usam o mesmo
│
├─ app/                          campus-app — React + Vite, mobile-first, PWA
│  ├─ src/
│  │  ├─ pages/                  12 telas, uma por rota
│  │  ├─ features/               Blocos por fluxo: auth, pagamento, checkin, feed
│  │  ├─ components/ui/          Design system: TicketCard, Button, Chip, Badge…
│  │  ├─ components/layout/      Moldura: TopBar, BottomNav, AppShell, Toast
│  │  ├─ services/               Interfaces + DUAS implementações atrás delas:
│  │  │                          `http/` (mock via MSW) e `api/` (servidor real).
│  │  │                          VITE_DATA_SOURCE escolhe — RNF-016, ADR-0003
│  │  ├─ mocks/                  Seed, banco em memória com escrita serializada, MSW
│  │  ├─ store/                  Zustand: sessão e UI
│  │  ├─ hooks/                  TanStack Query: cache e invalidação
│  │  └─ domain/                 Só o que NÃO é domínio: format, eventAction, eventSchema
│  └─ e2e/                       Playwright, contra o build de produção
│
├─ api/                          campus-api — NestJS + Prisma + PostgreSQL
│  ├─ prisma/
│  │  ├─ schema.prisma           14 tabelas, 10 enums. Espelha o ER coluna por coluna
│  │  ├─ migrations/             O SQL do Prisma + 20 CHECK e os índices parciais que
│  │  │                          ele não expressa, escritos à mão
│  │  └─ verificar-restricoes.sql  22 provas de que o banco RECUSA dado impossível
│  ├─ openapi.yaml               38 caminhos, 43 operações — o contrato da API
│  └─ src/
│     ├─ auth/ eventos/ …        Um módulo por área. A regra vem de @campus/shared:
│     │                          o service busca o estado, chama a decisão, persiste
│     └─ seed/                   Massa equivalente ao mock do CP5, para a demo ser contínua
│
├─ docs/                         Toda a documentação — comece pelo docs/README.md
│  ├─ 05-modelagem/              20 diagramas Mermaid + dicionário de dados
│  ├─ 06-marca/                  Identidade visual, design system, styleguide, SVGs
│  ├─ 09-trello/                 Quadro pronto para importar (JSON, CSV, manual, API)
│  └─ adr/                       8 decisões arquiteturais registradas
├─ prototype/legacy/             O protótipo estático original, preservado
├─ scripts/                      Verificadores: docs, diagramas, escala, pacote, contrato
├─ docker-compose.yml            Postgres + API + front, em um comando
└─ .github/workflows/            CI, publicação no Pages e release das imagens
```

**Por que o domínio saiu do app.** Até o CP5 havia um consumidor das regras: a tela. O CP6
acrescentou um segundo, a API — e duas cópias de `isFull` divergem na primeira correção
feita só de um lado, com o pior sintoma possível: a tela prometendo uma vaga que o servidor
recusa. A fronteira do pacote é **verificada**, não confiada:
[`scripts/check-contrato.mjs`](scripts/check-contrato.mjs) reprova o build se qualquer
arquivo dele importar React, Prisma ou NestJS.

---

## Documentação completa

**Índice navegável: [`docs/README.md`](docs/README.md)**

| Peso na avaliação | Documento |
|---|---|
| **25%** Documentação e requisitos | [Problema e personas](docs/01-problema-e-personas.md) · [Requisitos](docs/02-requisitos.md) · [Escopo](docs/03-escopo.md) · [Regras de negócio](docs/04-regras-de-negocio.md) · [Glossário](docs/14-glossario.md) |
| **20%** Modelagem UML | [Índice dos diagramas](docs/05-modelagem/README.md) · [Casos de uso](docs/05-modelagem/01-casos-de-uso.md) · [Classes](docs/05-modelagem/02-diagrama-classes.md) · [Modelo ER](docs/05-modelagem/03-modelo-dados-er.md) · [Sequência](docs/05-modelagem/04-diagrama-sequencia.md) · [Atividades](docs/05-modelagem/05-diagrama-atividades.md) · [Estados](docs/05-modelagem/06-diagrama-estados.md) · [Componentes](docs/05-modelagem/07-diagrama-componentes.md) · [Dicionário de dados](docs/05-modelagem/dicionario-de-dados.md) |
| **20%** Identidade visual | [Identidade visual](docs/06-marca/identidade-visual.md) · [Design system](docs/06-marca/design-system.md) · [Guia do Figma](docs/06-marca/guia-figma.md) · [Styleguide](docs/06-marca/styleguide.html) |
| **15%** Pitch | [Pitch](docs/07-pitch.md) · [Roteiro do vídeo](docs/15-video-roteiro.md) · [Slides](docs/15-video-slides.html) |
| **10%** Trello | [Quadro](docs/09-trello/quadro.md) · [Criar o quadro](docs/09-trello/criar-quadro.md) |
| **10%** GitHub | este README · [CONTRIBUTING](CONTRIBUTING.md) · [CI](.github/workflows/ci.yml) |
| Engenharia | [Arquitetura](docs/08-arquitetura.md) · [ADRs](docs/adr/README.md) · [Plano de testes](docs/11-plano-de-testes.md) · [Riscos](docs/12-riscos.md) · [Roadmap CP5–CP6](docs/13-roadmap-cp5-cp6.md) |
| Entrega | [Equipe e papéis](docs/10-equipe-e-papeis.md) · [Checklist do CP4](docs/16-checklist-entrega-cp4.md) · [Checklist do CP5](docs/19-checklist-entrega-cp5.md) · [Checklist do CP6](docs/24-checklist-entrega-cp6.md) |
| CP5 | [Ambiente de teste](docs/18-ambiente-de-teste.md) · [Registro da jornada](docs/17-jornada.md) · [Roteiro do vídeo](docs/20-video-cp5-roteiro.md) · [Slides](docs/20-video-cp5-slides.html) |
| CP6 | [Contrato da API](docs/21-api-contrato.md) · [Manual de uso](docs/22-manual-de-uso.md) · [Instalação](docs/23-instalacao.md) · [Checklist do CP6](docs/24-checklist-entrega-cp6.md) · [Roteiro do vídeo](docs/25-video-cp6-roteiro.md) · [Slides](docs/25-video-cp6-slides.html) |
| Ação humana | [**O que só pessoa faz**](docs/entrega/README.md) — vídeo, Trello e Teams, com o insumo de cada um pronto e o caminho dito |

---

## Equipe

| Integrante | RM | Papel | Responsabilidade no CP4 |
|---|---|---|---|
| Ana Luiza Dourado | RM558793 | UX/UI Designer | Identidade visual, protótipo Figma, design system, personas |
| João Viviani Baldini | RM558596 | Product Owner | Visão de produto, backlog, pitch, priorização MoSCoW |
| Lucas Baraldi | RM555407 | Tech Lead / Arquiteto | Arquitetura, stack, repositório, CI/CD, padrões de código |
| Lucas Zolla | RM557952 | Analista de Requisitos | RF/RNF, escopo, regras de negócio, critérios de aceite |
| Ronaldo Veloso Filho | RM556445 | Modelagem / Analista UML | Diagramas UML, modelo de dados, dicionário de dados |
| Vitor Pantarotto | RM554961 | Scrum Master / QA | Trello, sprints, cerimônias, plano de testes, riscos |

Responsabilidades detalhadas e matriz RACI dos artefatos:
[`docs/10-equipe-e-papeis.md`](docs/10-equipe-e-papeis.md).

Identificação da disciplina, do professor e da turma: [no topo desta
página](#identificação).

---

## Status por checkpoint

### CP4 — concepção, documentação e base técnica ✅

| Entrega | Estado |
|---|---|
| Documentação inicial: problema, personas, 43 RF, 22 RNF, escopo, 25 regras | ✅ |
| 12 diagramas Mermaid em 7 tipos, validados, com exports em SVG | ✅ |
| Marca: 6 SVGs à mão, paleta com contraste AA verificado par por par, design system, styleguide | ✅ |
| Arquivo do Figma: 64 tokens, 11 estilos de texto, 9 componentes com 34 variants | ⚠️ telas pendentes — [motivo](docs/06-marca/guia-figma.md#5-o-que-não-foi-construído-e-por-quê) |
| Pitch de 1 minuto, roteiro do vídeo e deck de apoio | ✅ |
| Quadro do Trello pronto para importar por 3 caminhos | ✅ |
| Repositório organizado, CI verde, Pages publicado | ✅ |
| Base do app React com domínio testado e camada de dados trocável | ✅ |

### CP5 — protótipo funcional com dados mockados ✅

| Entrega | Estado |
|---|---|
| 12 rotas navegáveis, com login, onboarding, pagamento simulado, ingresso, check-in, feed e notificações | ✅ |
| Estados de carregamento, vazio, erro e sucesso em toda tela | ✅ |
| 293 testes automatizados em 17 arquivos, mais 6 casos E2E executados | ✅ |
| Ambiente de teste documentado, com usuários do seed e roteiro de 5 minutos | ✅ [`docs/18`](docs/18-ambiente-de-teste.md) |
| App instalável pelo manifest (PWA), verificado no CI | ⚠️ sem cache offline — [motivo](docs/18-ambiente-de-teste.md#não-há-cache-offline-e-a-razão-é-o-mock) |
| Diagramas de sequência e atividade refeitos contra o código real | ✅ |
| Documentação viva: status real dos 43 RF, regras rastreadas até o arquivo | ✅ |
| Roteiro do vídeo de 2 min e deck do CP5 | ✅ |
| Registro da jornada CP4 → CP5, com os defeitos que a verificação encontrou | ✅ [`docs/17`](docs/17-jornada.md) |
| Site publicado no GitHub Pages | ✅ **200 em seis endereços**, medido em 2026-09-10 — [status por rota](docs/18-ambiente-de-teste.md#1-acesso-online) |

Tarefa por tarefa: [`docs/13-roadmap-cp5-cp6.md`](docs/13-roadmap-cp5-cp6.md).
Critério por critério, com evidência: [`docs/19-checklist-entrega-cp5.md`](docs/19-checklist-entrega-cp5.md).

### CP6 — persistência, integração e entrega final ✅

| Entrega | Estado |
|---|---|
| API NestJS sobre PostgreSQL: 43 operações no contrato, 43 rotas implementadas | ✅ |
| Capacidade sem estouro com `SELECT … FOR UPDATE`, e `CHECK` no banco como rede | ✅ |
| 14 tabelas, 20 `CHECK`, 2 índices únicos parciais — **22 restrições exercitadas** contra PostgreSQL real | ✅ |
| Stack inteira em um comando: `docker compose up`, três serviços em cadeia por `service_healthy` | ✅ medido **com** cache de imagem; **sem** cache segue não verificado |
| Contrato executável (`api/openapi.yaml`), com a doc derivando dele | ✅ [`docs/21`](docs/21-api-contrato.md) |
| Manual de uso e roteiro de instalação | ✅ [`docs/22`](docs/22-manual-de-uso.md) · [`docs/23`](docs/23-instalacao.md) |
| Roteiro do vídeo de 3 min e deck do CP6 | ✅ |
| 8 ADRs, com alternativa recusada e como reverter | ✅ [`docs/adr/`](docs/adr/README.md) |

Critério por critério, com o comando que reproduz cada número:
[`docs/24-checklist-entrega-cp6.md`](docs/24-checklist-entrega-cp6.md).

---

## Licença

[MIT](LICENSE) — © 2026 Equipe Campus.
