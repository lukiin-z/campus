# ADR-0008 — Monorepo com o domínio em um pacote compartilhado

- **Status:** Aceita
- **Data:** 2026-09-02
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Lucas Zolla (Analista de Requisitos, pela rastreabilidade das regras), Vitor Pantarotto (Scrum Master / QA, pela estratégia de teste)
- **Requisitos afetados:** RNF-015, RNF-016, RNF-013, RN-004, RN-006 a RN-008, RN-012 a RN-019, RN-023, RN-024

## Contexto

O CP6 acrescenta um segundo consumidor às regras de negócio.

Até o CP5 havia um: o app React, com as regras em `app/src/domain/` — 13 módulos de
funções puras, exercitados por 215 testes, e aplicados pelo mock em memória que respondia
às chamadas `fetch('/api/...')` ([ADR-0003](0003-camada-de-repositorio-com-msw.md)). O CP6
troca esse mock por uma API NestJS com PostgreSQL, e a API precisa **das mesmas regras**.

A pergunta não é se as regras devem ser reusadas — o enunciado do checkpoint é explícito
("regras de negócio portadas do domínio puro do front, não reescritas"). A pergunta é
**onde elas moram** para que os dois lados as usem sem que uma cópia divirja da outra.

Três fatos concretos fixam o problema:

1. **A regra vale nas duas pontas por necessidade, não por elegância.** O botão de
   inscrição precisa saber se há vaga para decidir o rótulo; a API precisa saber para
   decidir se grava. `resolvePrimaryAction` chama `isFull`, e o handler de inscrição
   também. Se forem dois `isFull`, o dia em que um deles mudar a tela promete uma vaga que
   o servidor recusa.
2. **A divergência é o modo de falha mais provável do projeto.** O CP5 já produziu quatro
   ocorrências dela em escala menor: três critérios diferentes em vigor para "quem pode
   publicar no feed" (RN-019); `MAX_PRICE` escrito à mão em dois schemas; a senha de
   demonstração declarada em dois arquivos; e os nomes de rota do contrato divergindo das
   rotas do mock. Nenhuma nasceu errada — todas ficaram erradas depois.
3. **O front não pode depender do backend para funcionar.** O ambiente de teste do CP5
   roda como conteúdo estático no GitHub Pages, sem processo em execução, e essa
   propriedade se mantém no CP6 (`VITE_DATA_SOURCE=mock`). Um pacote que importe Prisma ou
   NestJS quebraria isso.

## Decisão

**Adotamos um monorepo com npm workspaces e três pacotes, com `@campus/shared` como fonte
única dos tipos, das regras de negócio e dos schemas de validação.**

```
campus/
├─ packages/shared/   @campus/shared — tipos, 13 módulos de regra, schemas Zod
├─ app/               campus-app     — React + Vite (consome o pacote)
└─ api/               campus-api     — NestJS + Prisma (consome o pacote)
```

### O que mora no pacote, e por quê

| Conteúdo | Por que é compartilhado |
|---|---|
| `types.ts` — 14 entidades, 15 enumerações, projeções de leitura | Duas cópias de um enum de status é o jeito mais rápido de o front aceitar um valor que o banco recusa |
| `domain/` — 13 módulos de funções puras | As regras. `planPromotion` existe **uma vez**, e é a mesma que decide na tela e na API |
| `schemas.ts` — validação Zod de forma e faixa | O formulário e o `ValidationPipe` da API usam o **mesmo objeto** |

### O que **não** mora nele

Nada que importe React, `fetch`, Prisma, NestJS ou `msw`. A única dependência de runtime é
`zod`, que é isomórfica. E a fronteira **é verificada**, não confiada:
[`scripts/check-contrato.mjs`](../../scripts/check-contrato.mjs) reprova o build se qualquer
arquivo do pacote importar algo fora da lista, com o motivo nomeado — "a API não roda
React", "o app não tem banco".

### O que sobrou em `app/src/domain/`

Três módulos, e o motivo é o mesmo nos três: **não são domínio.** `format.ts` é formatação
pt-BR para leitura humana; `eventAction.ts` decide rótulo e estado do botão principal;
`eventSchema.ts` valida a forma do **formulário** — `data`, `horaInicio`, `horaFim`,
`gratuito` — que é diferente da forma do corpo da requisição.

Essa última distinção merece nota porque parece duplicação e não é: `eventFormSchema` e
`novoEventoSchema` validam **fronteiras diferentes**. O que não se repete é o limite — a
capacidade e o preço vêm de `POLICY`, uma vez.

### `app/src/types/domain.ts` continua existindo

Como reexportação de uma linha. Duas razões: os ~40 arquivos do app que importavam de lá
seguem válidos, e a migração não virou um diff de 200 linhas de import; e `types/` continua
sendo o lugar onde o app declara o que **só ele** conhece — se surgir um tipo que a
interface precisa e a API não, ele nasce ali, e não no pacote, onde a API o herdaria sem
uso.

### Resolução do pacote: fonte, não `dist`

O app resolve `@campus/shared` pela **fonte**, por `paths` no `tsconfig.app.json` e por
`alias` no `vite.config.ts`. Apontar para o `dist` faria `npm run dev` servir uma versão
velha do domínio até alguém rodar o build do pacote — o tipo de erro que consome uma tarde e
não deixa rastro. A API consome o `dist`, porque lá o build existe de todo jeito.

As duas configurações resolvem o mesmo especificador em arquivos diferentes, e divergir
entre elas produz o pior sintoma possível: o `tsc` passa e o app serve código velho. O
verificador de contrato compara as duas.

## Alternativas consideradas

### A. Dois repositórios, e o domínio publicado como pacote npm

`@campus/shared` versionado no registry, e cada lado depende de uma versão.

- **Prós:** fronteira máxima; a API poderia ficar em uma versão anterior de propósito;
  é o que se faria em uma organização com dois times.
- **Contras:** cada mudança de regra vira publicar-versão, atualizar-dependência,
  reinstalar — em três lugares. Com **seis pessoas em papéis acumulados** e uma sprint de
  três semanas, o custo de ciclo é maior que o de todo o resto da tarefa. Pior: o
  incentivo passa a ser **não** mudar a regra compartilhada, e a saída fácil é
  reimplementá-la localmente — exatamente o que a decisão existe para evitar.
- **Motivo objetivo da recusa:** o custo de ciclo é incompatível com o calendário, e o
  incentivo que ele cria é o oposto do objetivo.

### B. Copiar o domínio para a API

`api/src/domain/` com uma cópia dos 13 módulos.

- **Prós:** zero configuração; nenhuma ferramenta nova; cada lado evolui livre.
- **Contras:** é literalmente a duplicação que o enunciado proíbe. E há evidência de que
  ela não sobrevive: o CP5 produziu quatro divergências desse tipo em um único dia de
  trabalho, todas em pares de código que **nasceram idênticos**. Duplicar 2.600 linhas de
  regra e 243 testes garantiria a quinta.
- **Motivo objetivo da recusa:** a decisão erra no único ponto que ela precisa acertar.

### C. Manter o domínio em `app/` e a API importar por caminho relativo

`api/src/...` importando `../../app/src/domain/...`.

- **Prós:** nenhuma reestruturação; nenhum workspace.
- **Contras:** a API passa a depender do layout interno do front, sem contrato nem
  fronteira verificável. Nada impediria a API de importar um componente React por engano,
  e o `Dockerfile.api` teria de copiar `app/` inteiro para o contexto de build. A
  dependência aponta para fora, em vez de para dentro — o oposto da regra que
  `no-restricted-imports` já faz valer dentro do app.
- **Motivo objetivo da recusa:** cria dependência sem fronteira, e a fronteira é o valor.

### D. Extrair só os **tipos**, e deixar as regras duplicadas

Compartilhar `types.ts` e reescrever as funções em cada lado.

- **Prós:** resolve o risco mais visível (enum divergente) com um décimo do trabalho.
- **Contras:** resolve o risco **menos** custoso. Um enum divergente falha alto e cedo, em
  compilação ou no primeiro `INSERT`. Uma regra divergente falha **calada**: a tela mostra
  uma vaga que o servidor recusa, e ninguém sabe por quê. Foi o caso do RN-019 no CP5 —
  três critérios em vigor ao mesmo tempo, sem nenhum erro em lugar nenhum.
- **Motivo objetivo da recusa:** protege contra o modo de falha barato e deixa o caro
  aberto.

## Consequências

### Positivas

- **Uma definição de cada regra.** `planPromotion`, `decideCheckIn`, `computeRefund` e as
  outras existem em um arquivo, e é o mesmo que decide nos dois lados.
- **243 testes** passaram a cobrir o domínio da API sem que uma linha de teste fosse
  escrita para ela. O teste do domínio deixou de ser "teste do front".
- **A suíte do domínio ficou 9× mais rápida**: roda em `node`, sem jsdom — ~1 s contra
  ~9 s. Isso muda o hábito: a suíte volta a caber no laço de edição.
- **A fronteira é executável.** `check-contrato.mjs` no CI, e a mensagem de erro diz o
  motivo, não só "import não permitido".
- **Um `npm ci` instala os três pacotes**, e o CI tem um lockfile em vez de dois.
- **O front continua funcionando sem backend** (`VITE_DATA_SOURCE=mock`), o que preserva o
  ambiente de teste do CP5 e o deploy estático no Pages.

### Negativas

- **A migração custou seis defeitos de infraestrutura**, e vale registrar porque nenhum
  deles é óbvio antes de acontecer:
  - `jsdom` ficou em `app/node_modules` enquanto o `vitest` foi içado para a raiz. O erro é
    `Cannot find package 'jsdom' imported from node_modules/vitest` — que não menciona
    workspace nenhum.
  - **Duas cópias de `vite`** no monorepo produziram erro de tipo *nominal* entre elas:
    "Type `Plugin<any>` is not assignable to type `PluginOption`". A causa não aparece na
    mensagem.
  - A cadeia de ferramentas (vite, vitest, typescript, eslint, prettier) teve de subir para
    a raiz. Ferramenta usada por mais de um workspace **não** pode ser declarada em dois.
  - O `include` de cobertura do app apontando para `../packages/` **não funciona**: o
    provider v8 resolve o glob a partir da raiz do projeto e descarta o caminho de fora. O
    número caiu de 83% para 63% e o limite reprovou.
  - O token de sessão é estado de módulo e não era zerado entre testes. Com os testes de
    autenticação novos, um teste deixava a sessão de outro usuário ativa para os seguintes.
  - `app/package-lock.json` teve de deixar de existir. Dois lockfiles em um monorepo
    resolvem versões diferentes para a mesma dependência.
- **A cobertura passou a ser dois números**, medidos por dois comandos. É mais honesto —
  cada um mede o seu — e é uma coisa a mais para lembrar.
- **Mudar uma regra afeta os dois lados de imediato**, sem versão intermediária. É a
  contrapartida direta do benefício: não existe "a API ainda está na regra antiga". Se um
  dia for preciso, o caminho é a alternativa A, e ela custa o que custa.
- **O contexto de build do Docker cresceu**: a imagem da API precisa de `packages/shared`
  e do lockfile da raiz, então o `.dockerignore` deixou de ser opcional.
- **Um `npm ci` na raiz instala NestJS e Prisma** mesmo para quem só vai mexer no front.
  Aceitável — instala uma vez —, mas é ~40 s a mais no CI do app.

## Como reverter

Voltar para a alternativa B (cópia na API) é mecânico: `cp -r packages/shared/src/domain
api/src/domain`, ajustar os imports e apagar o workspace. Meio dia. **Não recomendado** —
o motivo da recusa continua valendo, e o custo real aparece depois, na primeira regra que
mudar de um lado só.

Ir para a alternativa A (pacote publicado) é o caminho de crescimento, não de reversão: o
pacote já tem `package.json`, `exports`, build com declarações e testes próprios. O que
falta é o registry e a disciplina de versão — e o gatilho para isso seria um segundo time,
não um segundo consumidor.

## Verificação

| O que se verifica | Como |
|---|---|
| Nenhum import proibido no pacote | `node scripts/check-contrato.mjs` no CI, job `documentacao`. 28 arquivos, 68 imports analisados |
| O alias do Vite e o `paths` do tsc concordam | Mesmo script, comparando os dois arquivos. Divergir faz o `tsc` passar e o app servir código velho |
| `app/src/types/domain.ts` não voltou a declarar tipo próprio | Mesmo script: qualquer `export interface`/`type`/`const` ali reprova |
| O domínio não conhece navegador | O script exige `environment: 'node'` no `vitest.config.ts` do pacote |
| As regras continuam certas | 243 testes no pacote, com limite de cobertura de RNF-015 (91,93% de linhas, 88,88% de funções) |
| A interface do front não mudou | 377 testes do app passando com a implementação de mock — é a prova de RNF-016 |
| Uma cópia de cada ferramenta | Verificação **fraca**: hoje é `npm ls vite` na mão. Um `npm ls --depth=1` no CI fecharia isso, e é candidato a verificador próprio |
