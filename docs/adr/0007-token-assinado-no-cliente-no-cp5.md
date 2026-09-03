# ADR-0007 — Token de sessão e de ingresso assinados no cliente no CP5

- **Status:** Aceita
- **Data:** 2026-09-02
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Vitor Pantarotto (Scrum Master / QA), Ana Luiza Dourado (UX/UI Designer, pelo fluxo de porta do evento)
- **Requisitos afetados:** RF-003, RF-033, RF-034, RN-002, RN-017, RNF-019, RNF-020, RNF-021

## Contexto

O CP5 tem de entregar dois fluxos que dependem de **credencial**:

1. **Login institucional** (RF-003) — o app precisa saber quem está logado para
   segmentar o feed por alcance (RN-001) e para decidir de quem é cada ingresso.
2. **Check-in por QR Code** (RF-033, RF-034) — o ingresso precisa carregar algo que o
   leitor do organizador consiga validar, e RN-017 exige recusar por **motivo
   específico**: token inválido, ingresso de outro evento, já utilizado, inscrição não
   confirmada, fora da janela, sem permissão.

A restrição que fixa o problema é a mesma da [ADR-0003](0003-camada-de-repositorio-com-msw.md):
**no CP5 não existe servidor**. O app é conteúdo estático no GitHub Pages e as chamadas
`fetch('/api/...')` são atendidas pelo MSW dentro do próprio navegador
([`../03-escopo.md`](../03-escopo.md), P-02). Não há onde guardar um segredo: qualquer
chave usada para assinar viaja no bundle e é legível por quem abrir o DevTools.

Havia um segundo risco, mais caro que o primeiro. A tentação óbvia é fazer o ingresso ser
apenas o `participacaoId` — uma string opaca qualquer — e deixar "token de verdade" para o
CP6. O problema é que essa escolha **muda a forma do dado** entre os checkpoints: a decisão
de aceitar ou recusar passaria a operar sobre um identificador solto no CP5 e sobre um
payload estruturado no CP6, e `decideCheckIn` teria de ser reescrita junto com todos os
testes que a cercam. Seria o tipo de atalho que o CP5 paga com juros na Sprint 3.

Vale registrar o que **não** é problema aqui: o CP5 não trata dado sensível de verdade. Não
há dinheiro real ([ADR-0006](0006-abstracao-de-gateway-de-pagamento.md)), o banco é em
memória e os 12 usuários são fictícios. O que está em jogo é a **forma do contrato**, não a
proteção de um ativo.

## Decisão

**Adotamos, no CP5, tokens com a forma final do CP6 e assinatura calculada no cliente —
declarando explicitamente, no código e na documentação, que essa assinatura não é controle
de segurança.**

São dois tokens distintos, com propósitos distintos:

### 1. Token de sessão — `campus.sess.<usuarioId>`

Emitido por `POST /api/auth/login` e enviado em `Authorization: Bearer` por
[`app/src/services/http/index.ts`](../../app/src/services/http/index.ts). Guardado em
`sessionStorage`, não em `localStorage`: fechar a aba encerra a sessão, que é o
comportamento certo para app usado em computador de laboratório compartilhado — o cenário
real das personas ([`../01-problema-e-personas.md`](../01-problema-e-personas.md)).

O mock resolve o usuário em três níveis, em
[`app/src/mocks/support.ts`](../../app/src/mocks/support.ts): cabeçalho de teste
`x-usuario-id`, depois o `Bearer`, depois o usuário padrão do seed. O primeiro nível existe
para exercitar cenário multiusuário sem montar duas sessões de navegador (é o que faz o
CT-020 provar algo); o terceiro existe porque o mock também responde a requisição direta,
sem passar pela tela de login.

### 2. Token de ingresso — `campus.v1.<payload base64url>.<assinatura>`

Formato de JWS compacto, implementado em
[`packages/shared/src/domain/ticketToken.ts`](../../packages/shared/src/domain/ticketToken.ts). O payload carrega
`participacaoId`, `eventoId`, `usuarioId` e `emitidoEm`. A assinatura é um FNV-1a de 32 bits
sobre corpo + rótulo fixo.

Três consequências dessa escolha, e são elas que a justificam:

- `lerToken` devolve `null` para qualquer token não íntegro e **nunca lança**. Na porta de
  um evento, um leitor que estoura com exceção ao ler um QR de outro sistema para a fila.
- A decisão de aceitar (`decideCheckIn`) já opera sobre um **payload estruturado e
  verificado**, com as 6 condições de RN-017 na ordem em que ficam mais informativas.
- O leitor aceita **três formas** da mesma leitura (`classificarLeitura`): token completo
  pela câmera, código numérico de 8 dígitos digitado e código legível impresso
  `CMP-3ESPX-0184`. As três convergem para a mesma decisão, porque as três aparecem na
  porta de um evento de verdade.

No CP6, o que muda é **uma função**: `assinar()` passa a HMAC-SHA256 com chave no servidor,
e `emitirToken`/`lerToken` migram para a API. Nenhum consumidor muda — nem a tela, nem
`decideCheckIn`, nem os 13 testes de `ticketToken.test.ts`.

### O que declaramos, e onde

A assinatura do CP5 detecta **adulteração casual**, não ataque. Isso está escrito em três
lugares, de propósito: no cabeçalho de
[`ticketToken.ts`](../../packages/shared/src/domain/ticketToken.ts), no nome da constante
(`SEGREDO_DEMO`, com o comentário "rótulo, não segredo — está no bundle de propósito") e
aqui. A senha única `campus123` de todos os usuários do seed segue a mesma lógica e está
documentada em [`../18-ambiente-de-teste.md`](../18-ambiente-de-teste.md).

## Alternativas consideradas

### A. Ingresso como identificador opaco, token só no CP6

O ingresso seria o próprio `participacaoId`; o QR desenharia essa string.

- **Prós:** menos código no CP5; nenhuma promessa de segurança a explicar; menos superfície
  para errar agora.
- **Contras:** `decideCheckIn` operaria sobre um identificador solto, e a introdução do
  payload no CP6 mudaria a assinatura da função, o formato do erro `TOKEN_INVALIDO` e todo
  o corpo dos testes. Pior: sem payload não existe o caso "ingresso de outro evento", que é
  uma das 6 condições de RN-017 — o CP5 entregaria uma recusa que não sabe recusar.
- **Motivo objetivo da recusa:** trocaria trabalho de agora por retrabalho na Sprint 3, que
  é a última e já está cheia (pagamento, moderação, manual de uso). Foi exatamente esse
  raciocínio que fundou a ADR-0003.

### B. JWT de verdade, com biblioteca, assinado no cliente

Usar `jose` ou `jsonwebtoken` para emitir HS256 no navegador.

- **Prós:** formato padrão, interoperável, e o CP6 herdaria a biblioteca.
- **Contras:** adiciona dependência a um bundle que já é orçado em 250 KB gzip (RNF-007) e
  que hoje usa 211 KB. E — o ponto decisivo — **não muda nada de fato**: a chave HS256
  viajaria no bundle igual, então o JWT seria tão falsificável quanto o FNV-1a, com a
  diferença de *parecer* seguro. Formato padrão sobre segredo público é pior que formato
  próprio declarado: convida a confiar.
- **Motivo objetivo da recusa:** custo de dependência e de orçamento de pacote sem ganho de
  garantia, com risco de leitura errada por quem revisa. A regra do projeto é justificar
  dependência pelo que a stdlib não faz ([`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)),
  e aqui ela faz.

### C. Backend mínimo já no CP5 (função serverless) só para assinar

Uma função em serviço gratuito emitindo e verificando tokens.

- **Prós:** assinatura de verdade desde o CP5; segredo fora do cliente.
- **Contras:** quebra a premissa P-02 (sem custo e sem processo em execução), adiciona uma
  conta de terceiro e um ponto de falha externo à demo, e torna o app dependente de rede
  para uma tela que precisa funcionar na apresentação. Introduz configuração de segredo em
  CI que ninguém revisaria com cuidado a esta altura.
- **Motivo objetivo da recusa:** transfere para o CP5 o custo de infraestrutura que o CP6
  já tem planejado, em troca de proteger um ativo que não existe (dados fictícios).

## Consequências

### Positivas

- O formato do token e a assinatura de `decideCheckIn` são os **mesmos** nos dois
  checkpoints: a migração do CP6 troca uma função de 8 linhas, não um contrato.
- As 6 condições de RN-017 estão exercitáveis desde o CP5, incluindo "ingresso de outro
  evento" e "já utilizado" — que são as recusas que o organizador mais vê na prática.
- `lerToken` é total: devolve `null` em vez de lançar, para todas as 8 entradas-lixo que o
  teste cobre. O leitor da porta nunca trava por QR estranho.
- A sessão em `sessionStorage` já produz o comportamento correto em máquina compartilhada,
  sem esperar o CP6.
- O cabeçalho `x-usuario-id` do mock permite testar concorrência multiusuário de verdade
  (CT-020: exatamente um `201` e 49 `409` em 50 tentativas na última vaga).

### Negativas

- **Um token de ingresso do CP5 é falsificável em minutos** por quem leia o bundle: o
  algoritmo e o rótulo estão lá. Se a demo fosse pública com dados reais, isso seria um
  furo — e é por isso que a declaração aparece em três lugares em vez de um.
- **`emitidoEm` não é verificado** contra janela de validade no CP5. O campo existe e é
  transportado, mas `lerToken` não recusa token velho; a expiração entra no CP6 junto com o
  HMAC. Um token emitido em setembro continuaria "íntegro" em dezembro.
- **A senha única `campus123`** vale para os 12 usuários do seed. É afordância de
  demonstração deliberada, mas é também exatamente o tipo de coisa que sobrevive por
  descuido até produção. O CP6 tem de trocá-la por argon2 com senha por usuário (RNF-019), e
  isso está no roteiro de migração como item bloqueante.
- **Dois níveis de resolução de usuário no mock** (`x-usuario-id` e `Bearer`) são um caminho
  a mais para o teste divergir do app: um teste que use só o cabeçalho não exercita o
  caminho do token. Mitigado mantendo os testes de integração da camada de serviço passando
  pelo `Bearer`.
- O `sessionStorage` some ao fechar a aba, então **a demo exige login a cada abertura**. É o
  comportamento certo e uma fricção real na apresentação; o bloco "entrar como" da tela de
  login existe para compensar.

## Como reverter

Reverter para a alternativa A (identificador opaco) custa pouco em código e muito em
teste: apagar `packages/shared/src/domain/ticketToken.ts` (192 linhas), simplificar o parâmetro `token`
de `decideCheckIn` e reescrever `ticketToken.test.ts` (13 testes) mais os trechos de
`handlersCp5.ts` que classificam a leitura. Estimativa: meio dia. **Não recomendado** — o
motivo da recusa da alternativa A continua valendo.

Avançar para o CP6 (o caminho previsto) é menor: `assinar()` vira HMAC-SHA256 com chave de
variável de ambiente no servidor, `emitirToken`/`lerToken` passam a rodar na API, e o cliente
recebe o token já pronto. `classificarLeitura` e `decideCheckIn` não mudam.

## Verificação

| O que se verifica | Como |
|---|---|
| Token adulterado é recusado | `packages/shared/src/domain/ticketToken.test.ts` — corpo alterado com assinatura mantida, assinatura trocada, emissor trocado, versão trocada |
| `lerToken` nunca lança | O mesmo arquivo, caso "devolve null — nunca lança — para entrada lixo", com 8 entradas |
| As três formas de leitura convergem | `classificarLeitura` tem teste por forma, e `handlersCp5.ts` deriva a participação pelas três |
| Nenhum segredo real no repositório | Hook de pré-commit de varredura de segredos (`~/.claude/hooks/`) e revisão de PR. **Verificação fraca por natureza**: `SEGREDO_DEMO` é uma string no fonte e nenhum scanner distingue rótulo de segredo — o que protege é o nome e o comentário |
| A declaração continua visível | Item de checklist de PR que toca `ticketToken.ts` ou `support.ts`: a frase "não é controle de segurança" tem de continuar no cabeçalho. Depende do revisor — é a verificação mais fraca desta ADR |
| A senha demo não vaza para o CP6 | O CP6 remove `SENHA_DEMO` de `support.ts` junto com o mock; o teste de integração da API do CP6 usa hash argon2 e falha se a senha em texto claro for aceita |
