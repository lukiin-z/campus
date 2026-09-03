# Registro da jornada do projeto

**Disciplina:** Engenharia de Software · **Curso:** Engenharia de Computação (3º ano) ·
**Instituição:** FIAP · **Professor:** Hercules Ramos
**Projeto:** Campus — aplicativo de eventos universitários

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-02 | CP5 | Documento criado: linha do tempo do CP4 e do CP5, decisões, mudanças de escopo, requisitos revistos e defeitos encontrados por verificação |
| 1.2 | 2026-09-02 | CP6 | Abre a seção do CP6: a fase de contrato, a decisão de mover o domínio para `@campus/shared`, as 22 restrições do banco verificadas e 6 defeitos de infraestrutura que a migração expôs (16 a 21) |
| 1.1 | 2026-09-02 | CP5 | Fecha a seção do CP5 depois da integração: 9 defeitos registrados (7 a 15), separados entre comissão e omissão; a pendência do E2E do CP4 fechada com o relato da primeira execução; quadro do que foi medido e do que não foi |

---

## 1. Para que serve este documento

O enunciado do CP6 avalia **"evolução do projeto — coerência e evolução clara entre CP4 →
CP5 → CP6"** com peso de 15%. Este documento é a evidência dessa evolução: não um resumo do
que existe hoje, mas o **registro de como chegamos aqui** — o que decidimos, o que mudamos
de ideia, o que caiu do escopo e por quê, e o que a verificação encontrou de errado.

Três coisas que ele deliberadamente contém:

| Contém | Por quê |
|---|---|
| **Decisão com data e commit** | "Evolução clara" só é verificável se der para apontar o momento e o artefato |
| **Requisito que caiu ou mudou** | Escopo que só cresce é escopo que não foi pensado. O que saiu diz mais que o que entrou |
| **Defeito encontrado por verificação** | Um projeto sem defeito registrado é um projeto sem verificação de verdade — ou com registro incompleto |

E uma que ele **não** contém: narrativa de esforço. Quantas horas cada tarefa levou não é
evidência de engenharia.

O estado atual do produto está em outro lugar: requisitos em
[`02-requisitos.md`](02-requisitos.md), arquitetura em
[`08-arquitetura.md`](08-arquitetura.md), decisões em [`adr/`](adr/README.md).

## 2. Linha do tempo por tag

Cada checkpoint tem uma **tag anotada** no Git e uma *release* no GitHub. A tag é o que
permite reconstruir o estado exato de cada entrega:

```bash
git tag -l                 # cp4, cp5, cp6
git diff --stat cp4 cp5    # o que mudou entre as entregas
git log --oneline cp4..cp5 # os commits do CP5
```

| Tag | Data | Commits acumulados | Entrega |
|---|---|---|---|
| `cp4` | 2026-09-01 | 8 | Idealização: documentação, UML, marca, pitch, Trello, base técnica |
| `cp5` | 2026-09-02 | 13 (+5) | Protótipo funcional: 12 rotas navegáveis com dados simulados, ambiente de teste, PWA |
| `cp6` | 2026-09-03 | 27 (+14) | Entrega final: monorepo, API NestJS + PostgreSQL, 1 012 testes, stack em um comando |

---

## 3. CP4 — Idealização

**Tag:** `cp4` · **Commits:** 8 · **Foco:** decidir *o que* construir e provar que o time
sabe descrever o problema antes de escrever código.

### 3.1 Os commits

| Commit | O que entrou |
|---|---|
| `2a4e992` | Estrutura do repositório e preservação do protótipo estático original em `prototype/legacy/` |
| `4aafe4a` | `.gitattributes` normalizando fim de linha — o repositório é editado em Windows e verificado em Ubuntu no CI |
| `ff62137` | Problema, 3 personas, 43 RF, 22 RNF, escopo MoSCoW, 25 regras de negócio, glossário |
| `067dc48` | 12 diagramas UML em Mermaid, validados por renderização |
| `c87fcc4` | Logo em SVG escrito à mão, paleta com contraste WCAG calculado, identidade visual |
| `018fe65` | Base React: domínio puro testado e camada de dados trocável |
| `63e0305` | Arquivo do Figma construído via MCP, com os limites do plano documentados |
| `744be9a` | Styleguide, README e checklist de entrega |

### 3.2 Decisões do CP4

| # | Decisão | Por quê, em uma linha |
|---|---|---|
| [0001](adr/0001-react-vite-em-vez-de-react-native.md) | React + Vite, não React Native | Publicar em loja não cabe no semestre; PWA entrega "instalável" sem isso |
| [0002](adr/0002-tailwind-com-design-tokens.md) | Tailwind com tema **substituído**, não estendido | Valor visual fora do token não gera CSS — o erro aparece, em vez de passar |
| [0003](adr/0003-camada-de-repositorio-com-msw.md) | Camada de repositório com MSW falando HTTP de verdade | Um app que nunca falha na demo desmonta na primeira semana do CP6 |
| [0004](adr/0004-participacao-como-entidade-propria.md) | `Participacao` é entidade, não tabela de junção | A relação aluno–evento tem identidade e história (fila, oferta, pagamento, presença) |
| [0005](adr/0005-alcance-como-enum-com-ancora-condicional.md) | Alcance como enum + três FKs com `CHECK` | Uma coluna polimórfica sem tipo não é verificável pelo banco |
| [0006](adr/0006-abstracao-de-gateway-de-pagamento.md) | Gateway de pagamento atrás de interface de 4 métodos | Simulador no CP5 e provedor real no CP6 sem tocar em quem consome |

### 3.3 O que a verificação encontrou no CP4

Seis defeitos reais, cada um encontrado por uma verificação executada — não por leitura:

| # | Defeito | Encontrado por | Correção |
|---|---|---|---|
| 1 | **Dois pares de cor reprovavam WCAG AA.** O coral `#E8542E` sobre branco dá 3,66:1 e o cinza `#767D85` em texto pequeno dá 4,02:1 — ambos abaixo de 4,5:1 | Cálculo de razão de contraste sobre a paleta inteira (28 pares) | Corrigidos para `#C83A16` (5,16:1) e `#5C6269` (5,95:1). O coral da marca ficou restrito a texto grande e ao símbolo |
| 2 | **RN-004 e RN-007 se contradiziam** sobre `OFERTA_PENDENTE` ocupar vaga | Leitura cruzada das 25 regras durante a revisão de consistência | Documentação alinhada ao comportamento correto: a vaga fica reservada durante a oferta |
| 3 | **Handlers de escrita não verificavam alcance.** Dava para se inscrever em evento invisível por requisição direta | Teste de integração da camada de serviço (CT-012) | `canSee` aplicado em `POST /participacoes` e `POST /lista-espera` (RN-001, RNF-012) |
| 4 | **`ToastViewport` violava a própria fronteira de camadas** — estava em `components/ui/` importando a store | `no-restricted-imports` do ESLint | Movido para `components/layout/` |
| 5 | **Sete classes Tailwind fora da escala** (`w-64`, `h-56`, `h-40`, `h-48`, `h-64`) não geravam CSS: o cartão de evento e as capas ficavam **invisíveis** | Inspeção do app no navegador | Tokens nomeados em `tailwind.config.ts` **e** um verificador novo, `scripts/check-tailwind-scale.mjs`, que agora roda no CI |
| 6 | **Contagens MoSCoW erradas** nos documentos 02 e 03 (26/12/5 em vez de 28/11/4) e distribuição CP5/CP6 invertida | Recontagem item a item | Números corrigidos nos dois documentos |

O defeito 5 é o mais instrutivo: nasceu de uma decisão boa (escala fechada, ADR-0002) cujo
modo de falha ninguém tinha previsto — classe fora da escala **não dá erro**, só não gera
CSS. A correção que importa não foi trocar as sete classes: foi transformar o modo de falha
em verificação automática.

### 3.4 Limites aceitos no CP4

| Limite | Natureza | Estado |
|---|---|---|
| Arquivo do Figma com 3 páginas em vez de 5 | Plano Starter limita a 3 páginas | Conteúdo consolidado sem perda; declarado em [`06-marca/guia-figma.md`](06-marca/guia-figma.md) |
| 8 telas do Figma não construídas | Cota de chamadas do MCP esgotada | Substitutos: 4 telas de referência no styleguide + o app React funcionando |
| E2E do Playwright escrito e **não executado** | Navegador não baixado, por decisão de tempo | **Resolvido no CP5** — e a primeira execução reprovou 6 de 6. Ver §4.5, defeito 12 |

---

## 4. CP5 — Protótipo funcional

**Tag:** `cp5` · **Foco:** provar que o que foi descrito no CP4 **funciona**, ponta a ponta,
com dados simulados.

### 4.1 Como o CP5 foi construído: contrato primeiro, então paralelismo

A decisão de processo mais consequente do CP5 não foi técnica: foi **escrever todo o
contrato antes de dividir o trabalho**. Concretamente, nesta ordem:

1. **Contrato** — tipos (`app/src/types/domain.ts`, +144 linhas), três módulos de domínio
   novos (`auth.ts`, `pix.ts`, `ticketToken.ts`), as interfaces dos repositórios
   (`app/src/services/index.ts`), a implementação HTTP, os endpoints do mock
   (`app/src/mocks/handlersCp5.ts`), os hooks e as 12 rotas com a guarda de sessão.
2. **Só então** as frentes paralelas, cada uma com **caminhos de escrita exclusivos**:
   telas de autenticação; telas de pagamento, ingresso e check-in; telas de feed,
   notificações e detalhe; ambiente de teste e PWA; documentação viva; diagramas; demo.

A regra que fez isso funcionar: **arquivo disputado por duas frentes não pertence a nenhuma
das duas** — pertence à integração. Foi por isso que `tailwind.config.ts`,
`app/package.json`, `App.tsx`, os serviços e os mocks ficaram fora do alcance das frentes,
que reportavam o que precisavam em vez de editar.

### 4.2 O que o CP5 acrescentou ao código

| Camada | O que entrou |
|---|---|
| Tipos | `Credenciais`, `ResultadoLogin`, `EntradaOnboarding`, `CobrancaPix`, `ResumoCartao`, `NovoPagamento`, `PagamentoView`, `TokenIngresso`, `ResultadoCheckin`, `PresencaView`, `PainelCheckin`, `NovaPublicacao`, `NovoComentario` + 4 enums de motivo de recusa |
| Domínio | `auth.ts` (RN-002, RN-003), `pix.ts` (BR Code com CRC16, Luhn, resumo de cartão), `ticketToken.ts` (token com forma de JWS, três formas de leitura) |
| Serviços | `AuthRepository` ganhou 6 métodos; `PaymentsRepository` e `CheckinRepository` são novos; `FeedRepository` ganhou escrita |
| Mock | `handlersCp5.ts` com 16 endpoints novos; helpers extraídos para `support.ts`; resolução de usuário por `Bearer` |
| Rotas | De 7 para 12, com guarda de sessão de três estados |
| Testes | +49 casos nos módulos de domínio novos |

### 4.3 Decisão do CP5

| # | Decisão | Por quê |
|---|---|---|
| [0007](adr/0007-token-assinado-no-cliente-no-cp5.md) | Token de sessão e de ingresso **com a forma final do CP6**, assinados no cliente | O CP5 não tem servidor: qualquer chave viaja no bundle. Manter a **forma** do token evita reescrever `decideCheckIn` e seus testes na Sprint 3. A assinatura não é controle de segurança, e isso está declarado em três lugares no código |

### 4.4 Mudanças de escopo e de requisito no CP5

A implementação corrigiu o que a especificação supôs. Cada linha aqui é uma coisa que o CP4
descreveu de um jeito e o CP5 provou ser de outro:

| O que mudou | O que o CP4 supunha | O que a implementação mostrou |
|---|---|---|
| **Quando a janela de pagamento começa a contar** | Implícito: a partir da inscrição | A janela de RN-012 é recontada quando a **cobrança é aberta**. Contar da inscrição faria o aluno perder minutos escolhendo o método de pagamento |
| **Cobrança é idempotente por participação** | Não especificado | Duplo toque no botão geraria dois Pix para a mesma vaga, e o aluno pagaria o errado. `POST /participacoes/:id/pagamento` devolve a cobrança existente |
| **O payload Pix não é armazenado** | Implícito: campo na entidade `Pagamento` | `gerarCobrancaPix` é determinístico sobre (valor, referência, expiração). Guardar o QR é guardar dado derivado — e desalinhá-lo do valor na primeira alteração de preço |
| **O leitor de check-in aceita três formas** | Só QR (RF-034), com código numérico como contingência solta | As três formas convergem para a **mesma decisão** em `classificarLeitura`. Na porta de um evento as três aparecem, e um caminho de decisão por forma seria três caminhos para divergir |
| **Publicar exige participação *e* alcance** | RN-019 falava só de participação | Sem a verificação de alcance, um `POST` direto publicaria em evento invisível — o mesmo defeito nº 3 do CP4, em outra rota |
| **A guarda de rota tem três estados** | Dois: autenticado ou não | Tratar "carregando" como "não autenticado" faz o F5 em rota profunda piscar o login e perder o destino |
| **Sessão em `sessionStorage`** | Não especificado | Fechar a aba encerra a sessão. É o comportamento certo em computador de laboratório compartilhado, que é o cenário das personas |

### 4.5 O que a verificação encontrou no CP5

| # | Defeito | Encontrado por | Correção |
|---|---|---|---|
| 7 | **O teste do BR Code lia o campo EMV com casamento guloso** e capturava o CRC junto com o `txid`: 33 caracteres onde o limite é 25 | O próprio teste, ao falhar na primeira execução | O erro era do teste, não do código. Reescrito para ler o campo pelo **prefixo de tamanho**, que é como EMV define |
| 8 | **Colisão de caixa em nome de arquivo** (`PerfisDemo.ts` e `perfisDemo.ts`) | `forceConsistentCasingInFileNames` do TypeScript | Nome único. O Windows não distingue as duas grafias, o Ubuntu do CI distingue — seria erro só no CI |
| 9 | **`JA_UTILIZADO` era ramo morto.** O check-in aceito grava a presença **e** muda a participação para `PRESENTE` na mesma transação; como a verificação de status vinha antes da de unicidade, a segunda leitura do mesmo ingresso devolvia `NAO_CONFIRMADA`. A recusa que RN-018 existe para produzir — a única que traz o **horário do primeiro uso** — nunca chegava a quem consome a API | Percorrer a porta simulada no navegador. `decideCheckIn` **não tinha nenhum teste** | Ordem invertida em `domain/checkin.ts`, e o arquivo de teste que não existia foi escrito: 23 casos, dos quais 5 verificam **a ordem** entre condições violadas ao mesmo tempo |
| 10 | **Tela branca se o mock não subir.** `main.tsx` fazia `await worker.start()` antes do `createRoot`: falha de registro de service worker — janela privada, armazenamento desligado, contexto não seguro — matava a página sem nenhuma mensagem, indistinguível de erro de build | Uma frente relatou tela branca ao verificar no navegador | `iniciarMock` passou a devolver o motivo em vez de rejeitar, e o app renderiza com faixa de aviso explicando a causa provável |
| 11 | **Três regras existiam escritas e não valiam em lugar nenhum.** `paymentExpired`, `offerExpired` e `planPromotion` eram exercitadas por teste unitário e **nenhum handler as chamava**: o cronômetro da cobrança chegava a zero na tela e o pagamento continuava sendo aceito. `canPostToEvent`, que codifica RN-019, também não tinha consumidor — o handler usava `isActive`, então quem estava na **fila de espera** publicava no feed por requisição direta | Revisão dos diagramas contra o código, e recontagem de cobertura por função | `mocks/expiracao.ts` aplica os prazos na borda de toda requisição, e `canPostToEvent` passou a ser a autoridade única de RN-019 nos dois endpoints. 22 testes de integração novos cobrindo os dois |
| 12 | **O E2E nunca executado estava quebrado.** A primeira execução real reprovou **6 de 6**: um `vite preview` esquecido em outra porta servindo a base errada, a guarda de sessão nova que o teste do CP4 não conhecia, e um passo que recarregava a página — o que reconstrói o mock em memória a partir do seed | Rodar `npx playwright test` pela primeira vez no projeto | Três correções no teste e uma constatação no app (inscrição paga navega direto para a cobrança, e está certa). O E2E entrou no `ci.yml` em job próprio |
| 13 | **`permissions.ts`: 12 funções exportadas, 0% de cobertura de funções.** A regra com mais superfície do projeto (RN-024) era a com menos prova, e permissão errada não falha em teste de tela — falha em vazamento | Leitura do relatório de cobertura por arquivo | 31 casos focados no **negativo** (quem NÃO pode), levando `permissions.ts` a 100% de linhas e de funções |
| 14 | **O código de turma que a tela sugeria não existia** — `ESPX-26` em vez de `3ESPX-26`. Quem seguisse a instrução do onboarding recebia "esse código de turma não existe" | Percorrer o onboarding de ponta a ponta pela API | O código virou campo (`codigoSugerido`) com teste que o confere contra o seed e contra `decideOnboarding` |
| 15 | **Participação em evento fora de alcance.** A primeira tentativa de criar a oferta de vaga pôs a usuária da demonstração em um evento de outro curso — estado que o sistema não consegue produzir | Teste de integração CT-012, que existia e reprovou | Evento próprio (`evt-012`) dentro do alcance dela. As três participações herdadas do CP4 no mesmo formato entraram em lista de exceções documentada, com o motivo de cada uma |

**Nenhum dos nove defeitos do CP5 foi encontrado relendo código.** Cada um veio de uma
verificação executando: um teste que falhou, um relatório de cobertura, um diagrama
conferido contra o fonte, uma tela percorrida no navegador, uma suíte rodada pela primeira
vez. O padrão do CP4 se repetiu sem exceção.

Vale separar dois tipos entre eles, porque exigem defesas diferentes:

| Tipo | Quais | O que os expõe |
|---|---|---|
| **Comissão** — o código faz a coisa errada | 7, 8, 14, 15 | Teste que roda. Falham alto e rápido |
| **Omissão** — o código não faz a coisa certa, e nada reclama | 9, 10, 11, 12, 13 | Só cobertura por função, diagrama conferido linha a linha, e execução real. Uma função escrita, testada em unidade e nunca chamada **parece** coberta |

Os cinco de omissão são a lição do CP5. Foi por isso que a cobertura de **funções** entrou
como limite ao lado da de linhas: `permissions.ts` tinha 18% de linhas e 0% de funções, e
só o segundo número contava a verdade.

### 4.6 Pendências do CP4 resolvidas no CP5

| Pendência do CP4 | Estado no CP5 |
|---|---|
| Login e onboarding eram "Sprint 2" | Implementados (RF-001 a RF-005) |
| Pagamento existia só como interface | Cobrança Pix e cartão simulados, com webhook e idempotência |
| Check-in existia só como decisão de domínio | Ingresso com token, painel do organizador e leitor simulado |
| Feed era somente leitura | Publicação e comentário com verificação dupla |
| `GET /api/sessao` devolvia usuário fixo | Sessão vem do token; o usuário fixo permanece como fallback do mock para requisição direta, documentado |
| **E2E escrito e nunca executado** | ✅ Fechado. Chromium instalado, 6 casos verdes contra o build de produção, e job próprio no `ci.yml` — a execução não depende mais da máquina de ninguém |

### 4.7 O que o CP5 mediu, e o que ainda não mede

| Medida | Valor | Limite | Como reconferir |
|---|---|---|---|
| Testes de unidade e integração | **293** em 17 arquivos | ≥ 8 (RNF-015) | `cd app && npm run test` |
| Casos E2E | **6**, executados | ≥ 1 | `cd app && npm run test:e2e` |
| Cobertura de linhas (domínio + serviços) | **83,59%** | 60% | `cd app && npm run test:coverage` |
| Cobertura de funções | **77,46%** | 60% | idem |
| Pacote JS | **234,00 KB** gzip | 250 KB (RNF-007) | `cd app && npm run check:size` |
| Documentação | 48 arquivos, 892 links, 24 blocos Mermaid, 33 SVGs | sem link quebrado | `node scripts/validate-docs.mjs` |

O pacote merece atenção: o CP5 consumiu **23 KB** dos 39 KB de folga que o CP4 tinha, e
sobraram 16 KB. O maior chunk é o worker do MSW, com 106 KB gzip — que **desaparece** no
CP6, quando o mock sai. A folga vai crescer, não encolher.

Três coisas continuam **não medidas**, e é honesto listá-las: os 6 breakpoints de RNF-018
(o E2E prova um, 390×844), o tempo de resposta com tráfego real, e a validação com 5 alunos
de verdade (RNF-005), que depende de pessoas e não de código.

---

## 5. CP6 — Entrega final

**Tag:** `cp6` · **Foco:** o produto com dados reais — API, banco e pacote instalável.

### 5.1 A fase de contrato, e por que ela veio primeiro

O CP5 foi construído com paralelismo sobre um contrato escrito antes (§4.1). O CP6 repetiu
a receita, e a diferença é que agora o contrato atravessa **dois processos**: o que o
navegador chama e o que o servidor responde.

Quatro artefatos foram escritos antes de qualquer divisão de trabalho:

| Artefato | O que fixa |
|---|---|
| `packages/shared/` | Tipos, as 13 regras de negócio e os schemas Zod — a fonte única dos dois lados ([ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md)) |
| `api/prisma/schema.prisma` | 14 tabelas e 10 enums, espelhando o ER coluna por coluna |
| `api/prisma/migrations/0001_init/` | O SQL, com as 20 restrições `CHECK` e os índices parciais escritos à mão sobre o que o Prisma gera |
| `api/openapi.yaml` | 38 caminhos, 43 operações, 44 schemas — método, corpo, resposta e código de erro |

### 5.2 A decisão: o domínio saiu do front

Treze módulos de regra saíram de `app/src/domain/` para `packages/shared/src/domain/`, com
`git mv` para o histórico acompanhar. **Não foi organização de pastas** — foi a resposta à
pergunta que o CP6 impõe: onde mora a regra quando dois processos precisam dela.

O raciocínio completo, com as quatro alternativas recusadas, está na
[ADR-0008](adr/0008-monorepo-com-dominio-compartilhado.md). O resumo é que a alternativa
óbvia — copiar o domínio para a API — erra no único ponto que precisa acertar, e há
evidência disso no próprio CP5: **quatro divergências** em um dia de trabalho, todas em
pares de código que nasceram idênticos (os três critérios de RN-019, o `MAX_PRICE` em dois
schemas, a senha de demonstração em dois arquivos, e os nomes de rota do contrato contra as
rotas do mock).

Dois efeitos que não eram o objetivo e vieram de graça:

- **243 testes passaram a cobrir o domínio da API** sem uma linha de teste escrita para ela.
- **A suíte do domínio ficou 9× mais rápida** — roda em `node`, sem jsdom: ~1 s contra ~9 s.
  Isso muda hábito, porque a suíte volta a caber no laço de edição.

Ficaram no app três módulos, e o motivo é o mesmo nos três: **não são domínio**. `format`
é apresentação, `eventAction` decide estado de botão, e `eventSchema` valida a forma do
**formulário** — que é diferente da forma do corpo da requisição. Essa última parece
duplicação e não é: o que não se repete é o limite, e capacidade e preço vêm de `POLICY`.

### 5.3 O que o banco real provou

O CP5 garantia RN-004 com uma fila de escrita serializada dentro do service worker. É uma
boa imitação de `SELECT ... FOR UPDATE`, e foi escolhida de propósito para o teste de
concorrência não passar no mock e falhar na API. Mas imitação não é garantia: no CP5, se o
código tivesse um furo, o dado inconsistente entraria.

No CP6 a garantia mudou de lugar. Vinte restrições `CHECK`, um índice único **parcial** e
uma ação referencial fazem o **banco** recusar dado impossível — e foram
**exercitadas, não apenas declaradas**:

```
api/prisma/verificar-restricoes.sql, contra PostgreSQL 16
→ 22 verificações, todas recusando
```

Cada uma tenta violar uma garantia central e espera a recusa. Duas merecem nota:

- **RN-015 tem duas metades.** O índice é parcial de propósito: a segunda inscrição *ativa*
  no mesmo evento é recusada, **e** a reinscrição depois de cancelar é permitida. Um único
  que ignorasse o status impediria comportamento legítimo e frequente. As duas metades são
  verificadas.
- **RNF-022 deixou de depender de disciplina.** Dado de cartão em cobrança Pix é recusado
  pelo `CHECK`, não pela boa vontade de quem escreve o service. E o `ResumoCartao` do
  contrato é `strict`: um cliente que tentasse enviar o número do cartão recebe `422`,
  porque o objeto não aceita campo a mais.

### 5.4 Os defeitos que a migração expôs

Seis, todos de infraestrutura, e nenhum óbvio antes de acontecer. Registro porque a
mensagem de erro de cada um **não menciona a causa**:

| # | Sintoma | Causa |
|---|---|---|
| 16 | `Cannot find package 'jsdom' imported from node_modules/vitest` | `jsdom` ficou em `app/node_modules` e o `vitest` foi içado para a raiz. A mensagem não menciona workspace |
| 17 | `Type 'Plugin<any>' is not assignable to type 'PluginOption'` | **Duas cópias de `vite`** no monorepo, com erro de tipo *nominal* entre elas |
| 18 | Cobertura caiu de 83% para 63% e o limite reprovou | O `include` de cobertura apontando para `../packages/` não funciona: o provider v8 resolve o glob da raiz do projeto e descarta o caminho de fora |
| 19 | "Você só pode cancelar a sua própria inscrição" em um teste que não fala de cancelamento | O token de sessão é estado de módulo e não era zerado entre testes. Apareceu ao cobrir os métodos de autenticação, que nenhum teste chamava |
| 20 | `preco: 12.999` passava pela validação | `Number.isInteger(Math.round(v*100))` é **sempre** verdadeiro. A verificação de centavos não verificava nada — e era código que eu havia escrito minutos antes |
| 21 | `services/http` com **45,71%** de cobertura de funções | Metade dos métodos do contrato de dados nunca havia sido chamada. É exatamente o arquivo que a troca do mock pela API substitui. Hoje 97,14% |

O de número 20 é o mais instrutivo do checkpoint: a linha parecia certa, passava no
`tsc`, passava no lint, e foi escrita com a intenção correta. O que a pegou foi um teste
que afirmava o comportamento — não uma releitura.

#### Os defeitos da integração, 22 a 36

Estes apareceram depois, quando as frentes voltaram e as peças foram ligadas. A tabela
separa **o que os produziu**, porque é a única coluna com valor transferível.

| # | Sintoma | Causa | O que o encontrou |
|---|---|---|---|
| 22 | `ERR_PACKAGE_PATH_NOT_EXPORTED` em todo módulo da API | `packages/shared` publicava só a condição `import` no `exports`, e a API é CommonJS. **O `tsc` não avisa**: a resolução de tipos usa caminho diferente da de execução | Rodar a API. Nenhuma verificação estática pegava |
| 23 | `GET /api/eventos` respondia **200 com o index.html**, e a tela quebrava com `Cannot read properties of undefined (reading 'map')` | `resposta.json().catch(() => ({}))` valia para sucesso e erro. No sucesso, o `{}` de consolo virava "deu certo, sem dados" | Abrir a build num navegador que **recusa service worker** — o caminho de falha que nenhum ambiente normal produz |
| 24 | A página voltava a ficar **em branco**, apagando o próprio aviso que explicava a falha | O app não tinha fronteira de erro. Um `throw` em render desmonta a árvore inteira no React 18, e leva a faixa de aviso com ela — anulando a correção do CP5 | O mesmo navegador, no mesmo minuto |
| 25 | `POST /pagamentos/{id}/simular` → **404** na stack de demonstração | A guarda do simulador era `NODE_ENV !== 'production'`, e a stack de demonstração roda `production` de propósito. O fluxo de pagamento ficava indemonstrável | Percorrer os fluxos contra os containers, não contra o código |
| 26 | Aluno sem vínculo cairia num feed vazio em vez do onboarding (RF-004) | O schema `Usuario` do contrato não declarava `cursoId`/`turmaId`. `onboardingPendente` compara `=== null`, e `undefined === null` é falso | Uma frente lendo o contrato contra o código que o consome |
| 27 | O e-mail institucional de todo organizador ia no payload da lista de eventos e do feed | Os quatro pontos de aninhamento usavam `$ref: Usuario`, que exige `email` — e essas listas são vistas pela turma inteira (RNF-021) | Revisão do contrato campo por campo, procurando o que ele obriga a mandar |
| 28 | `npm run build` reprovava com seis `TS2304` | `export type { X } from` reexporta o nome **sem trazê-lo ao escopo do módulo**, e as assinaturas do próprio arquivo o usavam. Efeito colateral: `tsc -p app/tsconfig.json --noEmit` **passa** e `tsc -b` reprova — os dois não são equivalentes neste repositório, e é o do build que vale | O build. O typecheck que eu havia rodado antes não |
| 29 | Uma verificação que o código **afirmava ter** não existia | O comentário de `main.ts` dizia que a concordância entre `openapi.yaml` e as rotas servidas era "a verificação que impede o contrato e as rotas divergirem". Nunca foi escrita | Reler a frase e procurar o arquivo |
| 30 | O job `api` da CI reprovava com `P1012` | `prisma validate` exige `DATABASE_URL` porque o `datasource` a lê com `env(...)`, e nenhum job a definia | Simular o job localmente |
| 31 | Duas verdades sobre o mesmo corpo de resposta | `ResultadoLoginApi` na API e `TokensDeSessao` no pacote, forma idêntica. E `ParticipanteConfirmado` tinha duas declarações **já divergentes**: `status: string` no app, `StatusParticipacao` na API | Procurar por tipo declarado dos dois lados |
| 32 | Regerar o código de convite da turma respondia erro no modo `api`, sem nada acusar | O cliente mandava `GET` onde a API serve `POST`. O caminho existia, então conferir só o caminho daria verde | O primeiro teste do cliente HTTP, no primeiro caso que ele rodou |
| 34 | O job de E2E da CI morria em `Module '"@prisma/client"' has no exported member 'Evento'` e dezenas de `TS7006` | O projeto novo do Playwright **compila a API** no `webServer`, e o job não gerava o cliente do Prisma nem construía o pacote compartilhado. Nenhuma das mensagens menciona geração de cliente | A CI, no primeiro push com o job |
| 35 | A contraprova da trava **reprovou na CI e passava aqui** | Ela afirmava que a corrida se manifesta sem `SELECT ... FOR UPDATE`. No runner do GitHub nenhuma das 49 recusas perdeu o `totalFila`; nesta máquina, de 7 a 22 perdiam em cinco execuções seguidas. Os dois resultados são verdadeiros — uma corrida que não se manifesta numa máquina rápida continua sendo uma corrida. Afirmar que ela se manifesta é escrever um teste intermitente, que é pior que teste ausente: treina quem lê a saída a ignorar vermelho. A degradação passou a ser **medida e registrada**, e as asserções ficaram com o que não depende de escalonamento; a contraprova determinística é a réplica ingênua com `pg_sleep`, que coloca 5 de 5 numa vaga sempre | A CI, rodando o mesmo teste em outra máquina |
| 36 | O E2E da stack real reprovava na CI com `strict mode violation: resolved to 2 elements` | O caso procurava o texto "Pagamento confirmado", e ele aparece em DOIS lugares no instante da confirmação: o bloco de status da tela e o toast. Aqui passava porque o toast já havia sumido quando a asserção rodou; no runner, mais lento, ainda estava lá. **A primeira correção reprovou igual** — trocou `getByText` por `getByRole('status')` e o toast de sucesso *também* é `role="status"`; foi escrita sem abrir o `ToastViewport`. A que valeu prende a asserção à frase que só a tela tem ("o ingresso já foi emitido") | A CI, duas vezes, em outra máquina |
| 33 | O front funcionava **em exatamente uma máquina** | `VITE_API_URL` tinha padrão `http://localhost:3000/api`, e o JavaScript roda no navegador de quem ABRE a página: em qualquer VM ou servidor, `localhost:3000` é a porta 3000 *dele*. Para um critério que se chama instalabilidade, o pior padrão possível | Ler a aba de rede do navegador durante o passeio pelas telas |

Quatro citações a **RNF-021** no código apontavam para o requisito errado — o limite de
taxa citava *controle do titular*, que não tem relação, e não existe RNF de limite de taxa
em [`02-requisitos.md`](02-requisitos.md). Não é defeito de comportamento, e está aqui
porque citação errada é pior que citação nenhuma: faz o código parecer rastreável a um
requisito que ninguém escreveu.

#### O que a medição de cobertura mostrou, de novo

O CP5 aprendeu que cinco dos seus nove defeitos eram **omissões**. O CP6 repetiu a lição em
quatro lugares, e nenhum deles teria aparecido em revisão:

| Arquivo | Cobertura de funções | O que era |
|---|---|---|
| `app/src/services/api/index.ts` | **20,83%** | 41 das 42 operações do cliente da API real nunca chamadas. É a camada de que depende a troca de fonte |
| `packages/shared/src/domain/deadlines.ts` | **28,57%** (22,22% de linhas) | **Sem arquivo de teste nenhum.** Os 22% vinham de ser importado pelos testes de outros módulos — o efeito colateral que faz um módulo *parecer* exercitado |
| `packages/shared/src/domain/policy.ts` | **33,33%** | `addMinutes` e `addHours`, as duas funções que *produzem* os prazos gravados no banco |
| `app/src/lib/` | não medido | O cliente HTTP com a renovação de sessão estava **fora do `include`**: o arquivo mais delicado da camada de dados não aparecia em número nenhum |

O limite de cobertura era 60% com medição real acima de 90%, o que não protege nada —
deixa passar uma regressão que apaga metade da cobertura. Subiu para 90/85 no pacote e
88/78 no app, com a folga escrita no arquivo de configuração.

### 5.5 O que o CP6 mediu, e o que continua sendo pendência declarada

#### Medido, com saída colada em `docs/24-checklist-entrega-cp6.md`

| O que | Número |
|---|---|
| Testes verdes | **1 012** — 308 no pacote, 525 no app (inclui os do pacote), 83 unitários da API, 96 de integração contra PostgreSQL, 9 de Playwright |
| Cobertura do pacote compartilhado | 99,32% de linhas · 94,62% de ramos · 97,97% de funções |
| Cobertura do app | 96,68% · 85,04% · 90,97% |
| Cobertura do domínio da API | 84,53% de linhas · 77,49% de funções · 70,12% de ramos (meta era ≥ 70%) |
| Concorrência (CT-020, RNF-013) | 50 simultâneas na última vaga → **1× `201`, 49× `409 SEM_VAGA`, 0× `5xx`, `ocupadas` 300/300** |
| Contraprova da trava | sem `SELECT ... FOR UPDATE`, **5 de 5 pessoas entram em 1 vaga**; e de 7 a 22 das 49 recusas perdem o `totalFila` |
| Restrições do banco | **22 de 22** tentativas de gravar dado impossível recusadas |
| Contrato × rotas servidas | 38 declaradas, 38 registradas, concordam |
| Pacote do app | 236,90 KB gzip no modo mock · **126,45 KB no modo `api`** (o chunk do MSW sai da build) |
| Stack do zero | `docker compose up -d --build` com volumes apagados → 3 serviços saudáveis, migration aplicada, seed rodado |
| **Continuidade CP5 → CP6** | `GET /api/eventos` responde **10 eventos** para a Marina — o mesmo número que o mock do CP5 media |

A última linha é a que responde ao critério de evolução: não é que os dois funcionem, é que
**medem o mesmo**. A regra de alcance que decide isso é uma função só, em
`packages/shared/src/domain/visibility.ts`, e as duas fontes a chamam.

#### Pendências declaradas

Nenhuma delas é surpresa: as cinco estavam previstas no roadmap ou dependem de coisa fora
do repositório.

| Pendência | Por que continua |
|---|---|
| **GitHub Pages não está publicado** | Exige o Pages ativado nas configurações do repositório, e a conta autenticada aqui tem `push` e não `admin` — a API de Pages responde `404`. O workflow foi corrigido e verificado localmente; falta um clique de quem é dono |
| **Deploy público (caminho C de instalação)** | Depende de contas em Render/Railway/Fly e Neon que ninguém criou. Os dois outros caminhos — PWA e `docker compose up` — estão verificados |
| **RNF-021, controle do titular** | Não há endpoint de exportação nem de exclusão de conta, e `usuario.excluido_em` **não existe** no schema. O ER e o dicionário afirmavam que existia; foi corrigido nesta entrega |
| **Instalação como PWA clicada** | O navegador desta sessão recusa registro de service worker e não dispara `beforeinstallprompt` nem para a build do CP5, que tem um — o resultado negativo mediu o navegador. O manifest foi conferido campo por campo e é servido em `application/manifest+json` |
| **Gateway de pagamento real** | ADR-0006: o simulador é a decisão, não uma falta. O que se testa é o nosso lado — janela, idempotência, assinatura, estorno |
| **Execução em macOS e Linux** | Tudo rodou em Windows com Docker Desktop. A CI cobre Linux para lint, tipo, teste, integração e E2E, mas não para o `docker compose` |
| **Vídeo, Trello e entrega no Teams** | São ações de pessoa. Roteiros, decks e o quadro pronto para importar estão no repositório |

#### O que este checkpoint provou sobre o processo

Quinze defeitos novos, e a coluna "o que encontrou" da tabela de 5.4 não tem uma única
entrada dizendo "releitura do código". As fontes foram: um teste rodando pela primeira vez,
um relatório de cobertura por função, a aba de rede do navegador, um job de CI reprovando,
um `docker compose up` de verdade e — duas vezes — um navegador que se recusava a fazer
algo, criando por acidente o caminho de falha que nenhum ambiente saudável produz.

Dois merecem registro à parte porque são do tipo que atravessa revisão sem ser notado:

- **A verificação que o código afirmava ter.** Um comentário dizia que a concordância entre
  contrato e rotas era verificada. Não era. Reescrever a frase seria mais rápido do que
  escrever o verificador, e teria deixado o repositório mentindo por escrito.
- **A tradução que lia comentário.** O Prisma embute um trecho do código-fonte na mensagem
  de erro; o tradutor procurava nome de restrição no texto; o nome estava num comentário.
  O teste passava, a produção também — até alguém editar o comentário. Foi encontrado
  porque uma frente desconfiou de um teste que passou na primeira tentativa.

---

## 6. O que este projeto aprendeu

Três padrões se repetiram nas duas entregas, e vale registrar porque são transferíveis:

1. **Defeito não aparece em releitura, aparece em execução.** Dos oito defeitos
   registrados, zero foram encontrados relendo código com atenção. Todos vieram de uma
   verificação: cálculo de contraste, teste de integração, regra de lint, inspeção no
   navegador, recontagem, o próprio teste falhando.
2. **O modo de falha de uma boa decisão precisa de guarda automática.** A escala fechada de
   Tailwind (ADR-0002) é uma decisão certa cujo modo de falha é silencioso. A correção que
   valeu foi o verificador, não o remendo nas sete classes.
3. **Paralelismo exige contrato, não coordenação.** As frentes do CP5 não se coordenaram
   entre si em nenhum momento: escreveram contra um contrato que já existia, em caminhos
   exclusivos. O custo foi escrever o contrato inteiro primeiro — e foi o que tornou a
   integração possível.
