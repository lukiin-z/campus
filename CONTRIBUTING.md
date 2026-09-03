# Como contribuir no Campus

Este documento define o fluxo de trabalho do time. Ele vale para os 6 integrantes e
para qualquer pessoa que abra um PR no repositório.

## 1. Pré-requisitos

| Ferramenta | Versão | Verificação |
|---|---|---|
| Node.js | 22.17.0 (ver `.nvmrc`) | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.40+ | `git --version` |

```bash
nvm use          # respeita o .nvmrc
npm ci           # na RAIZ: instala os três workspaces de uma vez
```

O repositório é um monorepo com **npm workspaces** desde o CP6
([ADR-0008](docs/adr/0008-monorepo-com-dominio-compartilhado.md)):

| Workspace | Pacote | O que é |
|---|---|---|
| `packages/shared` | `@campus/shared` | Tipos, as 13 regras de negócio e os schemas Zod — fonte única, consumida pelos dois lados |
| `app` | `campus-app` | Front React + Vite |
| `api` | `campus-api` | API NestJS + Prisma |

Há **um** `package-lock.json`, na raiz. `npm ci` dentro de `app/` ou `api/` não funciona, e
a cadeia de ferramentas (vite, vitest, typescript, eslint, prettier) é declarada só na raiz
— duas cópias de `vite` no monorepo produzem erro de tipo nominal entre elas.

O cliente do Prisma não é versionado. Depois do `npm ci`:

```bash
npm run prisma:generate -w campus-api
```

## 2. Fluxo de branches

`main` é protegida: nada entra por push direto, só por Pull Request com CI verde.

```
main
 ├── feat/inscricao-lista-espera
 ├── fix/vagas-negativas-no-progressbar
 ├── docs/requisitos-rnf-lgpd
 └── chore/atualiza-eslint
```

| Prefixo | Uso |
|---|---|
| `feat/` | Nova funcionalidade ou nova tela |
| `fix/` | Correção de defeito |
| `docs/` | Documentação, diagramas, ADRs |
| `refactor/` | Mudança interna sem alterar comportamento |
| `test/` | Só testes |
| `chore/` | Build, CI, dependências, configuração |

Regras do nome: minúsculas, `kebab-case`, em português, descrevendo o **resultado**
(`feat/checkin-por-qrcode`), não a tarefa (`feat/mexer-no-checkin`).

## 3. Conventional Commits

Formato obrigatório:

```
tipo(escopo): descrição no imperativo, minúscula, sem ponto final

[corpo opcional explicando o porquê, não o quê]

[rodapé opcional: Refs #12, BREAKING CHANGE: ...]
```

Tipos aceitos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`.

Escopos usados neste projeto: `eventos`, `inscricao`, `pagamento`, `checkin`, `feed`,
`auth`, `perfil`, `ui`, `tokens`, `mocks`, `docs`, `uml`, `marca`, `trello`, `ci`,
`app`.

Exemplos reais deste repositório:

```
feat(inscricao): promove primeiro da fila quando uma vaga é liberada
fix(ui): corrige contraste do chip inativo para atender WCAG AA
docs(uml): adiciona diagrama de estados de Participacao
chore(ci): roda lint, test e build em push e pull request
```

O que **não** fazer: `update`, `ajustes`, `wip`, `varios arquivos`, commit gigante com
tudo do dia.

## 4. Definition of Ready (para pegar um card)

Um card só sai do **Backlog** para o **Sprint Backlog** quando tem:

1. Descrição com contexto e valor para o usuário;
2. Critério de aceite em `Dado / Quando / Então`;
3. Requisito rastreado (`RF-0xx` / `RNF-0xx`);
4. Estimativa em pontos (Fibonacci: 1, 2, 3, 5, 8);
5. Responsável definido;
6. Dependências identificadas e desbloqueadas.

## 5. Definition of Done (para mover para Done)

1. Código na `main` via PR aprovado por pelo menos 1 revisor;
2. `npm run lint`, `npm run test` e `npm run build` verdes no CI;
3. Critério de aceite verificado manualmente na branch;
4. Teste automatizado cobrindo a regra (quando houver regra de negócio);
5. Documentação afetada atualizada (requisitos, diagrama, README);
6. Sem `TODO`, `console.log` ou código comentado;
7. Card com link do PR e do commit no comentário do Trello.

## 6. Pull Requests

- Um PR resolve **um** card. PR grande é sinal de card mal fatiado.
- Use o template (`.github/pull_request_template.md`) — ele não é decorativo.
- Marque o revisor conforme a área: front/arquitetura → Lucas Baraldi; requisitos →
  Lucas Zolla; UML/dados → Ronaldo Veloso Filho; UI/design system → Ana Luiza Dourado;
  produto/escopo → João Viviani Baldini; teste/QA → Vitor Pantarotto.
- Revisão olha, nesta ordem: correção da regra de negócio → cobertura de teste →
  acessibilidade → aderência aos tokens → legibilidade.

## 7. Padrões de código

- **TypeScript strict.** `any` só com comentário justificando.
- **Sem valor mágico de estilo.** Cor, fonte, raio, sombra e espaçamento vêm do
  `tailwind.config.ts`. `text-[#E8542E]` em componente é motivo de revisão reprovada.
- **Domínio em inglês, conteúdo em português.** Tipos, funções e variáveis em inglês
  (`WaitlistEntry`, `promoteFromWaitlist`); textos de UI, docs e commits em português.
- **Camada de dados só via repositório.** Nenhuma tela chama `fetch` direto; tudo passa
  por `src/services/*Repository.ts` (ver [ADR-0003](docs/adr/0003-camada-de-repositorio-com-msw.md)).
- **Tipos de domínio espelham o diagrama de classes.** Mudou o tipo? Atualize
  [docs/05-modelagem/02-diagrama-classes.md](docs/05-modelagem/02-diagrama-classes.md)
  no mesmo PR.
- **Acessibilidade não é opcional.** Ícone sem `aria-label` e foco invisível são bugs.

## 8. Comandos de verificação

Rode antes de abrir PR — é exatamente o que o CI roda:

Tudo da **raiz** do repositório. `-w <workspace>` escolhe o pacote.

```bash
# Documentação e fronteira do contrato — não precisam de npm install
node scripts/validate-docs.mjs
node scripts/check-contrato.mjs

# Regras de negócio primeiro: são o mais rápido e o mais fundamental (~1s)
npm run test:coverage -w @campus/shared

# Front
npm run lint -w campus-app
npm run test:coverage -w campus-app
npm run build -w campus-app
node scripts/check-tailwind-scale.mjs
node scripts/check-bundle-size.mjs

# API
npm run lint -w campus-api
npm run test -w campus-api
npm run build -w campus-api

# Ponta a ponta, contra o build de produção
npm run test:e2e
```

Atalhos da raiz que agrupam o essencial: `npm test`, `npm run lint`,
`npm run format:check`, `npm run test:coverage`, `npm run test:dominio`.

**A ordem não é acidental.** Documentação e contrato falham em segundos sem instalar nada;
as regras de negócio falham em um segundo e dizem exatamente qual regra quebrou; lint em
segundos; teste em dezenas; build em minutos. Falhar cedo devolve o resultado mais rápido a
quem abriu o PR — é a mesma ordem do [`ci.yml`](.github/workflows/ci.yml).

## 9. Decisões arquiteturais

Mudança que altera stack, contrato público, modelo de dados ou fronteira de camada
exige uma ADR em [`docs/adr/`](docs/adr/README.md) no mesmo PR. Copie o formato de uma
existente: contexto, decisão, alternativas consideradas, consequências.
