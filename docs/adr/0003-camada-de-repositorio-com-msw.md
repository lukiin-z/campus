# ADR-0003 — Camada de repositório com interfaces + HTTP + MSW

- **Status:** Aceita
- **Data:** 2026-08-24
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Vitor Pantarotto (Scrum Master / QA), João Viviani Baldini (Product Owner)
- **Requisitos afetados:** RNF-016, RNF-008, RNF-013, RNF-014, RNF-015, RF-019 a RF-027, RF-028 a RF-031

## Contexto

O calendário do projeto separa o produto em duas metades:

| Checkpoint | O que precisa existir |
|---|---|
| **CP5** — entrega 06/10/2026 | 18 RFs `Must` funcionando **com dados mockados**, ambiente de teste **acessível por link**, demo ao vivo do fluxo completo |
| **CP6** — entrega 10/11/2026 | Persistência real, API, pagamento em sandbox, notificação idempotente |

Duas restrições fixam o problema: **não há backend próprio no CP5** e **não há orçamento**
([`../03-escopo.md`](../03-escopo.md), P-02) — o CP5 tem de rodar como conteúdo estático no
GitHub Pages, sem processo em execução. Somos seis pessoas e a Sprint 3 é a última: o que
sobrar de integração para ela vai competir com pagamento, check-in, moderação e o manual de
uso.

Existe um requisito escrito exatamente sobre isso — **RNF-016**: "substituir o mock pela API
real exige alterar **apenas** a implementação dos repositórios; nenhuma alteração em
`src/pages/` ou `src/components/`".

O risco que a decisão precisa endereçar não é "como faço o app funcionar sem backend" — isso
é fácil. É o risco de o CP5 produzir um app que **nunca falha**: sem latência, sem erro de
rede, sem `409` de conflito de vaga, sem `422` de regra violada. Um app assim passa na demo
e desmonta na primeira semana do CP6, quando a rede real aparece — e aí não há sprint
sobrando para descobrir que nenhuma tela tem estado de erro.

Há um agravante de domínio: o Campus é cheio de conflito **por natureza**. Capacidade que
não pode estourar (RN-004, RNF-013), fila FIFO com janela de oferta (RN-007, RN-008),
janela de pagamento de 60 minutos (RN-012), ingresso de uso único (RN-017). Todos esses
casos se manifestam como **código de status HTTP**, não como valor de retorno de função.

## Decisão

**Adotamos uma camada de repositório em três partes: interfaces em `src/services/`,
implementação HTTP única, e MSW interceptando as chamadas no CP4/CP5.**

1. **Interfaces** (`src/services/`): `EventsRepository`, `ParticipationsRepository`,
   `AuthRepository`, `FeedRepository`, `NotificationsRepository`. É o que a camada de estado
   (TanStack Query / Zustand) conhece. Nenhuma página importa `fetch`, `axios`, `msw` ou
   `seed`.

2. **Implementação HTTP** (`src/services/http/`): `fetch` contra as rotas definidas em
   [`../08-arquitetura.md`](../08-arquitetura.md). Falha de transporte e código de erro viram
   um `ApiError` com `status` e `codigo`; o que é **desvio de regra**, e não erro, vira valor
   de retorno tipado — `ResultadoInscricao` tem `SEM_VAGA` como um dos seus casos, ao lado de
   `CONFIRMADA`, `PENDENTE_PAGAMENTO` e `RECUSADA`. Ficar lotado não é exceção: é RN-006.
   **Existe uma só implementação** — não há "repositório mock" e "repositório real" em
   paralelo.

3. **MSW** (`src/mocks/`): um Service Worker registra handlers para as mesmas rotas, resolve
   contra um banco em memória (`src/mocks/db.ts`, semeado por `src/mocks/seed.ts` com a
   faculdade, 3 cursos, 4 turmas, 12 usuários e 11 eventos do seed canônico) e responde com
   **código de status, corpo de erro e atraso artificial** equivalentes ao da API planejada.

4. O *container* no fim de `src/services/index.ts` é o **único** ponto do app que conhece a
   implementação concreta (`export const repositories: Repositories = httpRepositories`), e o
   bootstrap do MSW é uma função isolada em `src/main.tsx`, executada **antes** do primeiro
   render — se o app subisse primeiro, a primeira requisição escaparia do interceptador.
   Desligar o mock no CP6 é remover essa chamada e trocar a linha do *container*.

O ponto central: **o mock não é uma camada de dados alternativa, é um servidor falso.** O que
muda no CP6 é *quem responde* — a seta `==>` do
[diagrama de componentes](../05-modelagem/07-diagrama-componentes.md).

Efeito prático imediato: desde o CP4 o app tem estado de carregamento, estado de erro,
*retry*, invalidação de cache por mutação e tratamento de `409`/`422` — porque o mock
devolve esses casos de verdade.

## Alternativas consideradas

### A. Repositório mock que devolve objeto direto (sem HTTP)

```ts
// a alternativa recusada
class InMemoryEventsRepository implements EventsRepository {
  async list() { return seed.eventos; }   // sempre sucesso, sempre instantâneo
}
```

| | |
|---|---|
| **Prós** | Implementação de uma tarde; zero infraestrutura; nenhum Service Worker para manter; testes instantâneos e determinísticos; nada para desligar em produção |
| **Contras** | O app nunca exercita latência, falha de rede, `AbortError`, nem código de status. `409` (sem vaga / ingresso já usado) e `422` (regra de negócio violada) **não existem** como caminho de código, então nenhuma tela tem tratamento para eles; o `isLoading` do TanStack Query resolve em zero e ninguém desenha *skeleton*; RNF-008 ("< 300 ms com a camada mockada") deixa de ter significado; e no CP6 a migração muda de "trocar quem responde" para "descobrir, tela por tela, como cada uma reage a erro" |
| **Motivo objetivo da recusa** | Transfere o risco todo para a última sprint, que é a mais carregada. O ganho é uma tarde de implementação; o custo é descobrir na Sprint 3 que oito telas não sabem falhar |

### B. `json-server` (ou Mirage JS / Prism a partir do OpenAPI)

| | |
|---|---|
| **Prós** | HTTP de verdade sem Service Worker; dados em arquivo JSON, fáceis de editar; com Prism, o mock nasceria do contrato OpenAPI, garantindo aderência ao formato |
| **Contras** | É um **processo separado**, e o GitHub Pages não executa processo: o "ambiente de teste acessível por link" do CP5 simplesmente não funcionaria — o app abriria e falharia em toda chamada; a rota REST genérica do `json-server` não aplica regra de negócio, então capacidade, FIFO, janela de pagamento e uso único do ingresso teriam de ser simulados em *middleware* próprio (reescrevendo o que `src/domain/` já faz); e no Vitest/jsdom não há como interceptar sem subir porta, o que torna o teste de componente dependente de servidor externo |
| **Motivo objetivo da recusa** | Quebra o critério de entrega explícito do CP5 (link público funcional) e não sabe aplicar as regras que são o coração do produto |

### C. Backend real já no CP5 (Fastify + PostgreSQL em nível gratuito)

| | |
|---|---|
| **Prós** | Realismo máximo, elimina a migração do CP6, valida concorrência de verdade (RNF-013) desde a Sprint 2 |
| **Contras** | Sem orçamento, a hospedagem gratuita hiberna: a **demo ao vivo** passa a depender de rede da faculdade e de *cold start* de dezenas de segundos — risco inaceitável num critério de avaliação; consumiria a Sprint 2 inteira em infraestrutura, autenticação e migração de esquema, que é exatamente a sprint das 18 RFs `Must`; e o cenário de falha mais provável seria entregar backend sem telas, invertendo a ordem do que a disciplina pede em cada checkpoint |
| **Motivo objetivo da recusa** | Sequenciamento. A Sprint 2 existe para provar **fluxo**; a Sprint 3, para provar **persistência**. Antecipar a segunda custa a primeira |

### D. Contrato só no papel, telas com dado estático embutido no componente

Recusada de imediato: quebra RNF-016 na origem (a tela passa a conter dado), e o CP5 viraria
um protótipo navegável — o que o CP4 já entrega em Figma e HTML. O CP5 exige protótipo
**funcional**.

## Consequências

### Positivas

- **RNF-016 deixa de ser promessa.** A migração do CP6 é uma mudança de configuração e de
  base de URL, verificável por `git diff --stat`: zero linhas alteradas em `src/pages/` e
  `src/components/`.
- **Os estados difíceis nascem no CP5.** Carregamento, erro, vazio, conflito, prazo
  expirado: todos aparecem porque o mock os produz. É a diferença entre uma UI honesta e uma
  UI de vitrine.
- **O mock aplica as regras reais.** `src/mocks/` importa `src/domain/` (seta M2→D1/D2 do
  diagrama de componentes), então capacidade, fila, prazo, reembolso e check-in se comportam
  no CP5 como se comportarão na API. Uma implementação, não duas.
- **A demo funciona offline.** Nenhuma dependência de rede externa durante a apresentação —
  o que também protege contra o Wi-Fi da sala.
- **Teste de componente e teste E2E usam os mesmos handlers**, via `setupServer` no Vitest e
  Service Worker no navegador. O cenário "sem vaga" é escrito uma vez.
- **O contrato de API é exercitado antes de existir.** Erro de desenho de rota aparece no
  CP5, quando corrigir custa uma linha de handler, e não no CP6.

### Negativas

- **`public/mockServiceWorker.js` é artefato gerado e versionado.** Ele precisa ser
  regenerado (`npx msw init public`) quando a versão do MSW muda, e esquecer isso produz uma
  falha obscura ("worker desatualizado") que consome tempo de depuração de quem não conhece
  a ferramenta.
- **Service Worker + GitHub Pages é uma armadilha de escopo.** O app é servido em
  `/campus/`, então o worker precisa ser registrado com o `base` correto. O erro só aparece
  **no deploy**, nunca no `npm run dev` — é a classe de defeito mais caro que existe.
- **Duas configurações do mesmo mock.** No navegador é `setupWorker`; no Vitest é
  `setupServer`. Os handlers são compartilhados, mas a inicialização não, e a segunda pode
  ficar defasada sem que ninguém note até um teste falhar por motivo errado.
- **Depuração em duas camadas.** Um `404` pode ser rota errada **ou** handler ausente; um
  `500` pode ser exceção no handler. Toda investigação de rede no CP5 passa a ter um suspeito
  a mais, e quem não escreveu o mock perde tempo antes de olhar no lugar certo.
- **`src/mocks/db.ts` acumula lógica de servidor.** Reserva de vaga, promoção FIFO,
  expiração — se essa lógica divergir de `src/domain/`, o CP5 valida uma regra que a API do
  CP6 não terá, e o teste passa nos dois lugares por motivos diferentes. Mitigação
  estrutural: o mock **importa** o domínio; reimplementar regra dentro de `src/mocks/` é
  motivo de reprovação de PR.
- **MSW ativo em produção é um desastre silencioso — e hoje não há flag que o impeça.** O
  worker sobe **sempre** em `src/main.tsx`; não existe build "sem mock" até o CP6. Ou seja: o
  que está publicado no Pages serve dados fictícios sem avisar ninguém, e um deploy
  distraído no CP6 continuaria fazendo isso, com o app "funcionando" e nenhum erro visível.
  A escolha por não ter flag é deliberada (uma condicional a menos, e o desligamento aparece
  no diff em vez de ficar escondido num `.env`), mas o preço é este. Mitigações: a chamada
  fica isolada numa função com comentário explícito, é item de checklist do PR de integração
  do CP6, e o CI passa a verificar que o bundle de produção não contém `msw`.
- **A concorrência de verdade não é testada no CP5.** O banco em memória serializa escrita
  em uma única *thread*; RNF-013 (50 requisições paralelas para 1 vaga) só pode ser provado
  contra PostgreSQL com `SELECT … FOR UPDATE`. O CP5 prova a *regra*, não a *atomicidade* —
  e isso precisa estar dito, porque é a diferença entre "não estoura" e "não estoura sob
  concorrência".

## Como reverter

Este caso é atípico: **a reversão é o próprio plano.** Sair do mock para a API real é o
roteiro do CP6 detalhado em [`../13-roadmap-cp5-cp6.md`](../13-roadmap-cp5-cp6.md) — remover
a chamada de bootstrap em `src/main.tsx`, apagar `src/mocks/` e apontar a base de URL da
implementação HTTP para a API. Custo: baixo, e já orçado.

O que **não** é reversível a custo baixo é a direção contrária: voltar para a alternativa A
(mock direto, sem HTTP) implicaria apagar o tratamento de status, os estados de erro e o
mapeamento de exceções de domínio — ou seja, jogar fora trabalho de UI já validado, para
ganhar velocidade em testes que já são rápidos. Não há cenário em que isso se pague.

Risco residual da decisão: se o MSW for descontinuado ou incompatível com uma versão futura
de navegador durante o semestre, o plano B é substituir o interceptador por um *stub* de
`fetch` em `src/services/http/` — as interfaces e as telas continuam intactas, porque a
fronteira que a ADR protege é a de `src/services/`, não a ferramenta.

## Verificação

| Como se verifica | Onde |
|---|---|
| `no-restricted-imports` proíbe `src/pages/**` e `src/components/**` de importar `msw`, `src/mocks/*`, `axios`, ou de usar `fetch` direto | `npm run lint` no CI (RNF-017); tabela de dependências do [diagrama de componentes](../05-modelagem/07-diagrama-componentes.md) |
| A suíte que atravessa a camada HTTP roda contra a implementação de repositório, com os casos de erro incluídos (`SEM_VAGA`, ingresso usado, prazo encerrado) e as invariantes do mock verificadas a cada caso | [`app/src/services/inscricao.test.ts`](../../app/src/services/inscricao.test.ts) no Vitest; cobre CT-001/002/020 (RN-004) e CT-003 (RN-006) |
| Nenhum módulo de `src/mocks/` reimplementa regra de negócio — só importa de `src/domain/` | Revisão de PR: qualquer condicional de capacidade, fila ou prazo dentro de `src/mocks/` é bloqueador |
| O PR de integração do CP6 mostra **zero** linhas alteradas em `src/pages/` e `src/components/` | `git diff --stat` anexado ao PR — é a prova direta de RNF-016 |
| O bundle de produção não contém MSW | Busca por `mockServiceWorker`/`msw` no `dist/` gerado, executada no job de build |
| Latência simulada mantém o alvo mockado de RNF-008 (< 300 ms) | Medição no E2E do Playwright |
