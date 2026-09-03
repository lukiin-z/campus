# Plano de testes

## Histórico de revisões

| Versão | Data | Checkpoint | O que mudou |
|---|---|---|---|
| 1.0 | 2026-09-01 | CP4 | Versão inicial: estratégia, 31 casos em Gherkin (CT-001 a CT-031), E2E único, testes manuais, matriz de rastreabilidade |
| 1.1 | 2026-09-02 | CP5 | Acrescenta a seção 3.13 com CT-032 a CT-037 (autenticação, vínculo, cobrança simulada e token de ingresso), atualiza a matriz e move a numeração futura para CT-038 |

Este documento define **o que é testado, em que nível, com qual comando e com qual dado**.
Ele não descreve intenção: cada caso de teste aqui tem ID, regra de negócio coberta,
arquivo de destino e dados do seed canônico. Um caso sem esses quatro itens não entra no
plano.

Os cenários usam Gherkin como **especificação**, não como suíte executável — o projeto não
usa Cucumber. Cada `Cenário:` vira um `it()` no Vitest com o ID do caso no nome
(`it('CT-004: promove o primeiro da fila', ...)`), de modo que a saída de
`npm run test` seja rastreável de volta para esta página.

**Responsável:** Vitor Pantarotto (Scrum Master / QA) ·
**Aprovação:** Lucas Baraldi (Tech Lead) para os níveis unitário e E2E,
Lucas Zolla (Requisitos) para a cobertura de RN/RF.

Documentos-fonte: [`02-requisitos.md`](02-requisitos.md) (RF/RNF),
[`04-regras-de-negocio.md`](04-regras-de-negocio.md) (RN e o mapeamento RN→CT, que este
plano respeita literalmente), [`03-escopo.md`](03-escopo.md) (critérios de saída),
[`05-modelagem/`](05-modelagem/README.md) (diagramas que os testes verificam) e
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) (DoD e comandos de verificação).

---

## 1. Estratégia

### 1.1 A pirâmide, com números deste projeto

| Nível | Casos planejados | % do total | O que prova | Custo de execução |
|---|---|---|---|---|
| Unitário — domínio puro (`app/src/domain/`) | **30** | 79% | As 25 regras de negócio: capacidade, fila, prazos, reembolso, token, permissões | Milissegundos, sem DOM, sem rede |
| Componente — Testing Library (`app/src/pages/`, `app/src/components/`) | **6** | 16% | Que a tela **usa** a decisão do domínio: ação primária correta, estado vazio, rótulo acessível | Centenas de ms, jsdom |
| Integração — repositório + MSW (`app/src/services/`) | **1** | 2,6% | Que a fronteira de dados aplica alcance no "servidor" (RNF-012), não na UI | ~1s, service worker mockado |
| E2E — Playwright (`app/e2e/`) | **1** | 2,6% | Que a fiação inteira funciona: rota → query → repositório → MSW → render → store | Dezenas de segundos, navegador real |
| **Total** | **38** | 100% | — | — |

O critério de saída do CP5 em [`03-escopo.md`](03-escopo.md) pede "≥ 8 unitários e 1 E2E".
Este plano prevê 30 unitários porque o mapeamento RN→CT fixado em
[`04-regras-de-negocio.md`](04-regras-de-negocio.md) já obriga 31 casos de teste — o mínimo
do checkpoint é piso, não meta.

### 1.2 Por que a pirâmide é assim **aqui**

A escolha não é doutrina, é consequência da arquitetura decidida no CP4:

1. **As regras de negócio são funções puras.** `availableSpots(event)`,
   `promoteFromWaitlist(queue, now)`, `computeRefund(payment, event, canceledAt)`,
   `canCheckIn(participation, event, now)` e `canSee(user, event)` recebem dados e devolvem
   dados. Não tocam React, não tocam rede, não tocam relógio do sistema (o `now` é
   parâmetro). Testar a escala de reembolso 100/50/0 custa três `expect` e roda em
   milissegundos.
2. **O risco caro está exatamente nessas funções.** Os defeitos que destroem o produto são
   overbooking (RN-004), vaga oferecida a duas pessoas (RN-007), cobrança dupla (RN-014),
   ingresso reutilizado (RN-017) e evento restrito visível para quem não é do alcance
   (RN-001). Todos são erros de **decisão**, não de renderização. O teste barato cobre o
   risco caro — é essa coincidência que justifica a base larga.
3. **A camada de tela é fina de propósito.** Por [ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)
   e pelo RNF-016, `pages/` só consome domínio e repositório; não decide nada. Testar tela é
   testar ligação, e ligação quebra de forma óbvia — um caso por padrão de ligação basta.
4. **E2E é o nível mais caro de manter e o menos preciso de diagnosticar.** Um E2E vermelho
   diz "o fluxo quebrou"; um unitário vermelho diz "a linha 42 de `refund.ts` está errada".
   Com 8 telas e um fluxo principal, um E2E cobre a fiação toda (ver seção 4).

**Consequência prática para o time:** PR que muda regra de negócio sem tocar em
`*.test.ts` do domínio é reprovado na revisão — está no DoD de
[`../CONTRIBUTING.md`](../CONTRIBUTING.md).

### 1.3 O que **não** é testado automaticamente no CP4/CP5, e por quê

Omissão consciente. Cada linha diz o que é feito no lugar, para que nada fique sem rede.

| Não automatizado | Por que | O que é feito no lugar | Quando entra |
|---|---|---|---|
| **Pagamento real** (Pix/cartão) | Não há sandbox de gateway garantido nem gratuito (dependência D-02 de [`03-escopo.md`](03-escopo.md)), e nenhum dado de cartão pode passar pelo nosso código (RNF-022) | Gateway simulado atrás da interface `PaymentGateway` ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)). CT-007, CT-010 e CT-008/009 testam **nosso** lado do contrato: janela, idempotência e escala de reembolso | CP6, em sandbox |
| **Notificação real** (push, e-mail) | RF-039 e RF-040 são CP6; enviar e-mail em teste automatizado exige provedor, caixa de teste e limpeza — custo sem retorno agora | O domínio devolve a **intenção** de notificar (`TipoNotificacao` + destinatário) e o teste verifica a intenção. Entrega não é verificada | CP6 |
| **Leitura de câmera para o QR** | Playwright não lê câmera física; conceder `camera` a um navegador headless testaria o navegador, não o Campus. Aparelho com câmera é a dependência D-06 | CT-022 e CT-023 injetam o token diretamente em `verifyTicketToken`/`registerCheckIn`. O fallback de código numérico de 8 dígitos (UC-005) é o caminho testável ponta a ponta | CP6, teste manual em aparelho real |
| **TLS 1.2+ e hash Argon2id** (RNF-009, RNF-010) | Não existe servidor nosso no CP5 — não há o que medir | Inspeção de configuração do host e revisão de código no CP6 | CP6 |
| **p95 de feed e de escrita** (RNF-006, RNF-008) | Medir percentil com dados mockados mede o mock | Lighthouse mobile manual sobre o build de produção, registrado no card do Trello; o E2E mede o tempo do fluxo com a camada mockada (alvo < 300 ms) | CP5 manual, CP6 automatizado |
| **Contraste WCAG** (RNF-002) | Auditoria automatizada de contraste exige render real de todas as combinações | Tabela de 25 combinações calculada em [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) + roteiro manual da seção 5 | CP5 (auditoria automatizada no pipeline) |
| **Compatibilidade de navegador** (RNF-019) | Grade de navegadores em CI gratuito é lenta e frágil | Matriz manual preenchida no CP5: Chrome, Safari, Firefox (duas últimas versões), Android 9+, iOS 14+ | CP5 manual |
| **Usabilidade em 90 s** (RNF-005) | Não é verificável por código | Teste com 5 alunos reais, cronometrado, no CP5 | CP5 manual |

---

## 2. Ferramentas e comandos

Todos os comandos rodam a partir de `app/`, exceto o validador de documentação, que roda na
raiz. É exatamente o que o CI executa — o desenvolvedor não deve descobrir a falha no CI.

| Nível | Ferramenta | Comando | Onde os arquivos moram | O que falha o CI |
|---|---|---|---|---|
| Unitário | Vitest 2 | `npm run test` | `app/src/domain/*.test.ts` (14 arquivos) | Qualquer caso vermelho |
| Unitário — cobertura | Vitest + `@vitest/coverage-v8` | `npm run test:coverage` | idem | Cobertura de linhas < 60% em `src/domain/` ou `src/services/` (RNF-015) |
| Componente | Vitest + Testing Library + jsdom | `npm run test` | `app/src/**/*.test.tsx` (5 arquivos, 6 casos) | Qualquer caso vermelho; `button` sem nome acessível (RNF-004) |
| Integração | Vitest + MSW | `npm run test` | `app/src/services/*.test.ts` | Evento fora do alcance retornado pelo repositório (RNF-012) |
| E2E | Playwright | `npm run test:e2e` | `app/e2e/inscricao.spec.ts` | Fluxo de inscrição quebrado; mais de 3 toques até a confirmação (RNF-001) |
| Estático | ESLint 8 + Prettier + `tsc` | `npm run lint`, `npm run format:check`, `npm run build` | raiz de `app/` | Qualquer erro **ou aviso** (`--max-warnings 0`), formatação divergente, erro de tipo (RNF-017) |
| Documentação | Node script | `node scripts/validate-docs.mjs` | `docs/**` | Link relativo apontando para arquivo inexistente |
| Diagramas | Mermaid CLI | `npm run diagrams` | `docs/05-modelagem/` | Bloco Mermaid que não renderiza |

### 2.1 Limite de cobertura (RNF-015)

O limite é **≥ 60% de linhas nos módulos de domínio**, configurado no próprio Vitest para
que o build falhe sem intervenção humana:

```ts
// app/vitest.config.ts (trecho) — materializa o RNF-015
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    include: ['src/domain/**/*.ts', 'src/services/**/*.ts'],
    exclude: ['**/*.test.ts', 'src/domain/index.ts'],
    thresholds: { lines: 60, statements: 60, functions: 60, branches: 50 },
  },
}
```

Duas decisões de QA registradas aqui:

- **O escopo do limite é `src/domain/` e `src/services/`, não o projeto todo.** Exigir 60%
  global empurraria o time a escrever teste de `main.tsx` para subir número — cobertura de
  tela vem de caso de componente com propósito, não de percentual.
- **Ramos ficam em 50%.** RNF-015 fala de linha; a tabela de transições de
  `participation.ts` gera dezenas de ramos triviais que inflam o denominador. 50% mantém o
  limite honesto sem virar teatro de cobertura.

Expectativa real com os 30 casos unitários deste plano: **acima de 80%** nos 14 módulos de
domínio (estimativa do grupo, a confirmar na primeira execução do CP5).

### 2.2 Convenção de nome de teste

```ts
// app/src/domain/refund.test.ts
describe('computeRefund — RN-013', () => {
  it('CT-008: reembolsa 100% quando o cancelamento e anterior a 7 dias do inicio', () => {})
  it('CT-009: reembolsa 50% entre 7 dias e 48h, e 0% abaixo de 48h', () => {})
})
```

O ID no nome do caso é obrigatório para todo teste que cobre RN. Sem ele, a matriz da
seção 7 deixa de ser verificável por `npm run test` e passa a depender de memória.

---

## 3. Casos de teste

37 casos, `CT-001` a `CT-037`, agrupados pelos mesmos módulos de
[`04-regras-de-negocio.md`](04-regras-de-negocio.md). Todos usam o **seed canônico**: hoje é
**01/09/2026 (terça)**, usuária logada **Marina Alves** (ECOMP · 3ESPX).

Prioridade: **P0** = defeito causa overbooking, cobrança errada, entrada indevida ou
vazamento de evento restrito (bloqueia entrega); **P1** = regra `Must` sem risco financeiro
ou de dado; **P2** = regra periférica ou de histórico.

### 3.1 Capacidade e vagas

#### CT-001 — Inscrição com vaga disponível ocupa exatamente uma vaga

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-004 | RF-019, RF-020 | Unitário | P0 | `packages/shared/src/domain/capacity.test.ts` |

```gherkin
Funcionalidade: Reserva de vaga em evento com lugar livre

  Cenário: vaga disponível gera participação que ocupa vaga
    Dado o evento "evt-001" (Churrasco de encerramento do semestre), capacidade 40, 18 ocupadas
    E a aluna Gabriela Rocha, da turma 3ESPX, sem participação nesse evento
    E que agora é 01/09/2026 10h00
    Quando Gabriela se inscreve em "evt-001"
    Então a participação é criada com status "PENDENTE_PAGAMENTO", porque o evento custa R$ 25,00
    E "ocupadas" passa de 18 para 19
    E "availableSpots(evt-001)" passa de 22 para 21
    E o invariante "ocupadas <= capacidade" permanece verdadeiro
    E nenhuma entrada de lista de espera é criada
```

#### CT-002 — Só três estados consomem capacidade

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-004 | RF-020 | Unitário | P0 | `packages/shared/src/domain/capacity.test.ts` |

```gherkin
Funcionalidade: Contagem de vagas ocupadas

  Esquema do Cenário: cada status ocupa ou não ocupa vaga
    Dado o status de participação "<status>"
    Quando o domínio avalia "occupiesSpot(<status>)"
    Então o resultado é <ocupa>

    Exemplos:
      | status             | ocupa |
      | PENDENTE_PAGAMENTO | true  |
      | CONFIRMADA         | true  |
      | PRESENTE           | true  |
      | LISTA_ESPERA       | false |
      | OFERTA_PENDENTE    | false |
      | CANCELADA          | false |
      | EXPIRADA           | false |
      | AUSENTE            | false |

  Cenário: evento lotado é reconhecido a partir da soma dos estados que ocupam
    Dado o evento "evt-002" (Hackathon Campus 48h), capacidade 80
    E 74 participações "CONFIRMADA", 4 "PENDENTE_PAGAMENTO" e 2 "PRESENTE"
    E 7 participações "LISTA_ESPERA", 3 "CANCELADA" e 2 "EXPIRADA"
    Quando o domínio calcula a ocupação
    Então "ocupadas" é 80
    E "availableSpots(evt-002)" é 0
    E "isFull(evt-002)" é verdadeiro
    E as 12 participações em estado que não ocupa não alteram o resultado
```

#### CT-020 — Concorrência pela última vaga produz exatamente uma confirmação

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-004 | RF-019, RF-020 · RNF-013 | Unitário + **integração contra PostgreSQL** | P0 | `packages/shared/src/domain/capacity.test.ts`, `api/test/concorrencia.int.test.ts` |

Este é o caso que o [modelo de dados](05-modelagem/03-modelo-dados-er.md) descreve com
`SELECT ... FOR UPDATE`. Ele é medido em **dois níveis**, e a distinção importa porque o
comportamento observável **não** é o mesmo — a primeira versão deste cenário dizia que era:

- **CP5, camada mockada:** a serialização vem de uma fila de operações de escrita no
  navegador, e a mesma chamada resolve capacidade **e** fila. Uma inscrição em evento
  lotado nasce `LISTA_ESPERA` direto.
- **CP6, API real:** o contrato separa os dois passos de propósito. Uma inscrição em evento
  lotado responde `409 SEM_VAGA` com `acao: LISTA_ESPERA` e `totalFila`, e é o cliente que
  decide entrar na fila com um segundo pedido. Entrar na fila sem a pessoa pedir seria
  decidir por ela.

```gherkin
Funcionalidade: Reserva atômica sob concorrência

  Cenário: 50 inscrições simultâneas para 1 vaga — camada mockada (CP5)
    Dado o evento "evt-005" (Festa Junina Fora de Época), capacidade 300, com 299 ocupadas
    E 50 alunos diferentes, todos da FIAP, disparando inscrição no mesmo instante
    Quando as 50 operações são enfileiradas e processadas pela camada de escrita
    Então exatamente 1 participação nasce "PENDENTE_PAGAMENTO"
    E as outras 49 nascem "LISTA_ESPERA", com posições 1 a 49 na ordem de chegada
    E "ocupadas" termina em 300, nunca em 301
    E em nenhum instante intermediário "ocupadas" ultrapassa 300
    E nenhuma das 49 recebe mensagem de erro — evento lotado direciona para a fila (RN-006)

  Cenário: 50 inscrições simultâneas para 1 vaga — API real com PostgreSQL (CP6)
    Dado o mesmo evento, com 299 de 300 ocupadas no banco
    E 50 requisições HTTP disparadas juntas, cada uma com o token do seu aluno
    Quando o "SELECT ... FOR UPDATE" de "comum/travas.ts" serializa as transações
    Então exatamente 1 responde 201 com status "PENDENTE_PAGAMENTO"
    E as outras 49 respondem 409 com erro "SEM_VAGA", acao "LISTA_ESPERA" e "totalFila"
    E nenhuma responde 5xx — recusa por regra não é falha de servidor
    E "ocupadas" termina exatamente em 300
    E as 50 que entram na fila em seguida recebem posições 1 a 50, únicas e contíguas
```

**Medido** (`api/test/concorrencia.int.test.ts`):
`50 simultâneas → 201: 1 · 409: 49 · 5xx: 0 · ocupadas: 300/300`.

E há a **contraprova**, que é o que dá sentido ao número acima
(`api/test/concorrencia-sem-trava.int.test.ts`): com `travarEvento` desligada por
`vi.mock`, o mesmo cenário continua sem overbooking — o `CHECK` do banco segura —, mas de
7 a 22 das 49 recusas passam a vir da tradução do `CHECK` em vez de `isFull`, e portanto
**sem `totalFila`**: a tela perde o "você seria o 8º da fila". Ou seja, quem impede o
overbooking nesse caminho é o `CHECK`; quem produz a **resposta certa** é a trava.

Uma segunda contraprova mede a réplica ingênua — ler `ocupadas`, esperar, escrever
`lido + 1` sem trava: **5 de 5 pessoas entraram em 1 vaga**, com `ocupadas` em 300. O
`CHECK` não pega, porque 300 é um valor legal. É por isso que `increment` **e** a trava são
necessários, e não um ou outro.

#### CT-021 — Capacidade diminui só até o número de ocupadas, e aumentar promove a fila

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-005 | RF-013, RF-025 | Unitário | P1 | `packages/shared/src/domain/capacity.test.ts` |

```gherkin
Funcionalidade: Alteração de capacidade de evento publicado

  Cenário: reduzir até as ocupadas é permitido
    Dado o evento "evt-003" (Roda de conversa: mercado de dados), capacidade 60, 41 ocupadas
    Quando o organizador reduz a capacidade para 41
    Então a alteração é aceita
    E "availableSpots(evt-003)" passa a ser 0
    E nenhuma participação é removida

  Cenário: reduzir abaixo das ocupadas é recusado
    Dado o evento "evt-003", capacidade 60, 41 ocupadas
    Quando o organizador tenta reduzir a capacidade para 40
    Então a alteração é recusada com o motivo "capacidade menor que as vagas já ocupadas"
    E a capacidade continua 60
    E nenhuma das 41 participações é alterada

  Cenário: aumentar capacidade promove a lista de espera na hora
    Dado o evento "evt-006" (Workshop de Git e GitHub), capacidade 30, lotado, com 4 na fila
    Quando o organizador aumenta a capacidade para 32
    Então as participações das posições 1 e 2 passam para "OFERTA_PENDENTE"
    E cada uma recebe "ofertaExpiraEm = 02/09/2026 (agora + 24h)"
    E as posições 3 e 4 passam a ser 1 e 2
    E nenhuma vaga criada é liberada para inscrição normal enquanto as ofertas estão abertas
```

### 3.2 Lista de espera

#### CT-003 — Evento lotado direciona para a fila, no fim dela

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-006 | RF-024 | Unitário | P0 | `packages/shared/src/domain/waitlist.test.ts` |

```gherkin
Funcionalidade: Entrada na lista de espera

  Cenário: inscrição em evento lotado cria entrada na fila
    Dado o evento "evt-002" (Hackathon Campus 48h), lotado em 80/80
    E a lista de espera com 7 posições ocupadas, sendo Marina Alves a posição 7
    E as inscrições abertas (prazo 18/09/2026 16h)
    E o aluno Diego Martins, da turma 2ESPA, sem participação nesse evento
    Quando Diego aciona a inscrição em 01/09/2026 11h00
    Então a participação nasce "LISTA_ESPERA" com "posicaoFila = 8"
    E "ocupadas" continua 80
    E a ação não retorna erro de "evento lotado"
    E a posição de Marina continua 7
    E nenhuma prioridade por turma, curso ou histórico altera a ordem — a fila é FIFO por instante de entrada
```

#### CT-004 — Vaga liberada é oferecida ao primeiro da fila, e fica reservada

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-007 | RF-025 | Unitário | P0 | `packages/shared/src/domain/waitlist.test.ts` |

```gherkin
Funcionalidade: Promoção FIFO da lista de espera

  Contexto:
    Dado o evento "evt-002" (Hackathon Campus 48h), lotado em 80/80, gratuito
    E a fila com 7 pessoas, sendo Caio Ferreira a posição 1 e Marina Alves a posição 7
    E que agora é 01/09/2026 14h00

  Cenário: cancelamento libera vaga e gera uma única oferta
    Quando uma participação "CONFIRMADA" é cancelada
    Então a participação de Caio Ferreira passa de "LISTA_ESPERA" para "OFERTA_PENDENTE"
    E "ofertaExpiraEm" é 02/09/2026 14h00 (agora + WAITLIST_OFFER_WINDOW_HOURS = 24h)
    E Caio recebe a intenção de notificação "VAGA_LIBERADA"
    E nenhuma outra pessoa da fila recebe oferta pela mesma vaga
    E a vaga fica reservada: uma inscrição nova de Karen Yamada nesse instante entra na fila, não na vaga

  Cenário: confirmar dentro da janela ocupa a vaga
    Dado que Caio Ferreira tem oferta pendente até 02/09/2026 14h00
    Quando Caio confirma em 01/09/2026 20h00
    Então a participação passa para "CONFIRMADA", porque "evt-002" é gratuito
    E "ocupadas" volta a 80
    E a fila fica com 6 pessoas

  Cenário: janela truncada quando a oferta ultrapassaria o início do evento
    Dado o evento "evt-006" (Workshop de Git e GitHub), início 15/09/2026 19h30, lotado, 4 na fila
    E que agora é 15/09/2026 09h00
    Quando uma vaga é liberada
    Então "ofertaExpiraEm" é 15/09/2026 18h30 (início - 1h), e não 16/09/2026 09h00
```

#### CT-005 — As demais posições avançam em 1

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-007 | RF-025 | Unitário | P0 | `packages/shared/src/domain/waitlist.test.ts` |

```gherkin
Funcionalidade: Reordenação da fila

  Cenário: promoção do primeiro avança todas as posições seguintes
    Dado o evento "evt-002" com fila de 7 pessoas, Marina Alves na posição 7
    Quando a posição 1 (Caio Ferreira) é promovida para "OFERTA_PENDENTE"
    Então as posições 2 a 7 passam a ser 1 a 6
    E Marina Alves passa a ver "posição 6 na lista de espera"
    E não existem duas participações com a mesma "posicaoFila" no mesmo evento
    E não existe lacuna na sequência de posições

  Cenário: saída voluntária da fila também avança as posições seguintes
    Dado o evento "evt-002" com fila de 7 pessoas e Marina Alves na posição 7
    Quando a pessoa da posição 3 cancela a participação
    Então sua participação passa para "CANCELADA"
    E as posições 4 a 7 passam a ser 3 a 6
    E Marina Alves passa a ver "posição 6"
    E nenhuma oferta é emitida, porque não houve vaga liberada
```

#### CT-006 — Oferta expirada passa a vez ao próximo, sem punição

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-008 | RF-026, RF-027 | Unitário | P0 | `packages/shared/src/domain/waitlist.test.ts` |

```gherkin
Funcionalidade: Expiração da oferta de vaga

  Cenário: expiração encadeia a oferta para o próximo da fila
    Dado o evento "evt-002" (Hackathon Campus 48h), gratuito
    E Caio Ferreira com "OFERTA_PENDENTE" até 02/09/2026 14h00
    E Elisa Prado na posição 1 da fila restante e Marina Alves na posição 6
    Quando o relógio chega a 02/09/2026 14h01 sem confirmação de Caio
    Então a participação de Caio passa para "EXPIRADA"
    E a participação de Elisa Prado passa para "OFERTA_PENDENTE", com janela até 03/09/2026 14h01
    E as posições restantes avançam em 1, e Marina Alves passa a ver "posição 5"
    E a mesma vaga nunca fica com duas ofertas abertas ao mesmo tempo

  Cenário: quem perdeu a oferta pode voltar, mas no fim da fila
    Dado que Caio Ferreira está "EXPIRADA" em "evt-002"
    E a fila tem 5 pessoas
    Quando Caio aciona a inscrição novamente em 02/09/2026 15h00
    Então uma nova participação é criada com status "LISTA_ESPERA" e "posicaoFila = 6"
    E a participação "EXPIRADA" anterior é preservada no histórico
    E nenhuma penalidade adicional é aplicada
```

### 3.3 Pagamento e reembolso

#### CT-007 — Janela de pagamento de 60 minutos, com liberação automática

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-012 | RF-028, RF-030 | Unitário | P0 | `packages/shared/src/domain/payment.test.ts` |

```gherkin
Funcionalidade: Janela de pagamento da reserva

  Cenário: a reserva nasce com prazo de 60 minutos
    Dado o evento "evt-001" (Churrasco de encerramento do semestre), R$ 25,00, início 12/09/2026 13h00
    E a aluna Gabriela Rocha se inscrevendo em 01/09/2026 10h00
    Quando a participação é criada
    Então o status é "PENDENTE_PAGAMENTO"
    E "pagamentoExpiraEm" é 01/09/2026 11h00
    E o valor equivale a min(agora + 60min, prazoInscricao 12/09/2026 11h00, início - 1h 12/09/2026 12h00)
    E a vaga já está ocupada (ocupadas 19)

  Cenário: janela vencida libera a vaga
    Dado que Gabriela Rocha tem "PENDENTE_PAGAMENTO" com expiração em 01/09/2026 11h00
    Quando o relógio chega a 01/09/2026 11h01 sem confirmação do gateway
    Então a participação passa para "EXPIRADA"
    E "ocupadas" volta de 19 para 18
    E o processo de promoção da fila é acionado (RN-007) — em "evt-001" a fila está vazia, então a vaga volta ao pool
    E Gabriela recebe a intenção de notificação "PAGAMENTO_EXPIRADO"

  Cenário: pagamento que chega depois da expiração é estornado
    Dado que a participação de Gabriela Rocha está "EXPIRADA" desde 01/09/2026 11h01
    Quando o gateway confirma a transação "pix-7f3a91c2" às 01/09/2026 11h20
    Então nenhuma participação volta a ocupar vaga
    E o pagamento vai para "ESTORNADO"
    E a notificação enviada traz o motivo e o valor de R$ 25,00
```

#### CT-008 — Reembolso integral acima de 7 dias de antecedência

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-013 | RF-031 | Unitário | P0 | `packages/shared/src/domain/refund.test.ts` |

```gherkin
Funcionalidade: Escala de reembolso — faixa integral

  Cenário: cancelamento com 11 dias de antecedência devolve 100%
    Dado o evento "evt-001", início 12/09/2026 13h00, preço R$ 25,00
    E Marina Alves com participação "CONFIRMADA" e pagamento "CONFIRMADO" de R$ 25,00
    Quando Marina cancela em 01/09/2026 10h00
    Então o reembolso calculado é R$ 25,00 (100%)
    E o pagamento vai de "CONFIRMADO" para "REEMBOLSO_SOLICITADO" e depois "REEMBOLSADO"
    E a participação vai para "CANCELADA" com "canceladaAposPrazo = false"
    E a vaga é liberada e a fila é acionada

  Cenário: cancelamento pelo organizador devolve 100% em qualquer momento
    Dado o evento "evt-005" (Festa Junina Fora de Época), início 10/10/2026 20h00, R$ 45,00
    E uma participação "CONFIRMADA" com pagamento "CONFIRMADO"
    Quando a organizadora Beatriz Nakamura cancela o evento em 09/10/2026 22h00
    Então o reembolso é R$ 45,00 (100%), mesmo faltando menos de 48h
    E o motivo registrado no reembolso é "EVENTO_CANCELADO"
```

#### CT-009 — Reembolso de 50% e de 0% conforme a antecedência

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-013 | RF-031, RF-014 | Unitário | P0 | `packages/shared/src/domain/refund.test.ts` |

```gherkin
Funcionalidade: Escala de reembolso — faixas parcial e zero

  Contexto:
    Dado o evento "evt-001", início 12/09/2026 13h00, preço R$ 25,00
    E Marina Alves com pagamento "CONFIRMADO" de R$ 25,00
    E os parâmetros FULL_REFUND_DAYS_BEFORE = 7 dias e PARTIAL_REFUND_HOURS_BEFORE = 48h

  Esquema do Cenário: o valor do reembolso depende só da antecedência
    Quando Marina cancela em "<momento>"
    Então o reembolso é "<valor>"
    E o status do pagamento passa a ser "<status>"

    Exemplos:
      | momento          | antecedência | valor      | status                |
      | 04/09/2026 09h00 | 8 dias       | R$ 25,00   | REEMBOLSADO           |
      | 07/09/2026 09h00 | 5 dias       | R$ 12,50   | REEMBOLSADO_PARCIAL   |
      | 10/09/2026 20h00 | 41 horas     | R$ 0,00    | CONFIRMADO            |

  Cenário: limite exato de 7 dias fica na faixa integral
    Quando Marina cancela em 05/09/2026 13h00, exatamente 7 dias antes
    Então o reembolso é R$ 25,00 (100%)

  Cenário: limite exato de 48 horas fica na faixa parcial
    Quando Marina cancela em 10/09/2026 13h00, exatamente 48h antes
    Então o reembolso é R$ 12,50 (50%)

  Cenário: alteração de data, local ou preço abre janela de reembolso integral
    Dado que o organizador muda o local de "evt-001" em 09/09/2026 18h00
    Quando Marina solicita reembolso em 10/09/2026 09h00, dentro de 48h da notificação
    Então o reembolso é R$ 25,00 (100%), apesar de faltarem menos de 48h para o evento
    E a política aplicada é a gravada na participação no momento do pagamento
```

#### CT-010 — Confirmação de pagamento é idempotente e exclusiva do gateway

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-014 | RF-029 · RNF-014, RNF-022 | Unitário | P0 | `packages/shared/src/domain/payment.test.ts` |

```gherkin
Funcionalidade: Notificação de pagamento

  Cenário: a mesma notificação processada três vezes confirma uma vez
    Dado o evento "evt-001", R$ 25,00
    E Gabriela Rocha com participação "PENDENTE_PAGAMENTO" e pagamento "AGUARDANDO"
    E a notificação do gateway com "transacaoExternaId = pix-7f3a91c2", valor R$ 25,00
    Quando a notificação é processada 3 vezes seguidas
    Então existe exatamente 1 pagamento com status "CONFIRMADO"
    E existe exatamente 1 transição de participação "PENDENTE_PAGAMENTO" para "CONFIRMADA"
    E existe exatamente 1 intenção de notificação "PAGAMENTO_CONFIRMADO"
    E "ocupadas" não muda entre a primeira e a terceira execução

  Cenário: nenhuma ação de usuário confirma pagamento
    Dado o pagamento "AGUARDANDO" de Gabriela Rocha
    Quando a própria aluna aciona "marcar como pago" pela interface
    Então a operação é recusada
    E o pagamento continua "AGUARDANDO"
    E a participação continua "PENDENTE_PAGAMENTO"

  Cenário: notificação para participação em estado incompatível não confirma nada
    Dado que a participação de Gabriela Rocha está "CANCELADA"
    Quando a notificação "pix-7f3a91c2" é processada
    Então nenhum pagamento passa a "CONFIRMADO"
    E o pagamento vai para "ESTORNADO", conforme RN-012
    E nenhuma vaga é ocupada

  Cenário: nada de cartão é persistido
    Quando qualquer notificação de "CARTAO_CREDITO" é processada
    Então o pagamento gravado tem apenas "transacaoExternaId", método, valor e status
    E o objeto persistido não tem campo de número, validade, CVV ou titular do cartão
```

### 3.4 Alcance e visibilidade

#### CT-011 — O alcance define, sozinho, quem enxerga o evento

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-001 | RF-011, RF-015, RF-016, RF-036 | Unitário | P0 | `packages/shared/src/domain/visibility.test.ts` |

```gherkin
Funcionalidade: Visibilidade por alcance

  Contexto:
    Dado a faculdade FIAP — Campus Paulista
    E Marina Alves, aluna verificada, curso ECOMP, turma 3ESPX

  Esquema do Cenário: Marina enxerga o evento conforme o alcance e a âncora
    Quando o domínio avalia "canSee(Marina, <evento>)"
    Então o resultado é <visivel>

    Exemplos:
      | evento  | alcance e âncora     | visivel | por quê                          |
      | evt-001 | TURMA 3ESPX          | true    | é a turma dela                   |
      | evt-003 | CURSO ECOMP          | true    | é o curso dela                   |
      | evt-002 | FACULDADE FIAP       | true    | aluna verificada da faculdade    |
      | evt-004 | FACULDADE FIAP       | true    | aluna verificada da faculdade    |
      | evt-006 | CURSO SI             | false   | outro curso                      |
      | evt-009 | TURMA 1CCB           | false   | outra turma e outro curso        |

  Cenário: exatamente uma âncora preenchida
    Quando um evento de alcance "CURSO" é validado com "turmaId" e "cursoId" preenchidos
    Então a validação falha com "âncora incoerente com o alcance"

  Cenário: âncora fora da hierarquia do organizador é recusada
    Dado o aluno Rafael Souza, da turma 3ESPX do curso ECOMP
    Quando Rafael tenta criar um evento de alcance "CURSO" ancorado em Sistemas de Informação
    Então a criação é recusada

  Cenário: organizador e admin enxergam o próprio rascunho
    Dado o evento "evt-011" (Sarau de fim de semestre), TURMA 3ESPX, status "RASCUNHO"
    Então "canSee" é verdadeiro para o organizador e para Isabela Duarte (ADMIN_FACULDADE)
    E é falso para Marina Alves, mesmo sendo da turma 3ESPX

  Cenário: quem já tem participação ativa não perde o acesso ao trocar de vínculo
    Dado que Marina Alves tem participação "CONFIRMADA" em "evt-001" (TURMA 3ESPX)
    Quando o vínculo de Marina muda para a turma 2ESPA
    Então "canSee(Marina, evt-001)" continua verdadeiro
    E o ingresso "CMP-3ESPX-0184" continua acessível
```

#### CT-012 — Alcance é verificado no servidor, inclusive por acesso direto por ID

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-001 | RF-015, RF-016 · RNF-012 | Integração (repositório + MSW) | P0 | `app/src/services/eventRepository.test.ts` |

```gherkin
Funcionalidade: Autorização de alcance na fronteira de dados

  Cenário: a listagem não devolve evento fora do alcance
    Dado Marina Alves autenticada (ECOMP · 3ESPX)
    Quando o repositório busca "GET /eventos"
    Então a resposta contém evt-001, evt-002, evt-003, evt-004, evt-005, evt-007
    E não contém evt-006 (CURSO SI) nem evt-009 (TURMA 1CCB) nem evt-011 (RASCUNHO de outro)

  Cenário: acesso por ID direto a evento fora do alcance é negado
    Dado Marina Alves autenticada
    Quando o repositório busca "GET /eventos/evt-006" — o Workshop de Git do curso SI
    Então a resposta é 403
    E o corpo não traz título, data, local nem contagem de vagas do evento
    E a decisão vem do handler, não de filtro na tela

  Cenário: o inverso também vale
    Dado Felipe Antunes autenticado (CC · 1CCB)
    Quando ele busca "GET /eventos/evt-001" — o Churrasco da turma 3ESPX
    Então a resposta é 403

  Cenário: esconder na UI não é cumprir a regra
    Quando o teste chama o repositório diretamente, sem renderizar nenhuma tela
    Então as três asserções acima continuam válidas
```

#### CT-013 — Alcance não aumenta depois de publicado

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-002 | RF-011, RF-013 | Unitário | P1 | `app/src/domain/event.test.ts` |

```gherkin
Funcionalidade: Alteração de alcance após publicação

  Cenário: ampliar de TURMA para CURSO é recusado
    Dado o evento "evt-001", alcance TURMA 3ESPX, status "PUBLICADO", 18 participações
    Quando o organizador tenta alterar o alcance para CURSO ECOMP
    Então a alteração é recusada com "alcance não pode ser ampliado após a publicação"
    E o alcance continua TURMA 3ESPX

  Cenário: reduzir com participação ativa incompatível é recusado
    Dado o evento "evt-003", alcance CURSO ECOMP, status "PUBLICADO"
    E Diego Martins (turma 2ESPA, curso ECOMP) com participação "CONFIRMADA"
    Quando o organizador tenta reduzir o alcance para TURMA 3ESPX
    Então a alteração é recusada, porque Diego ficaria fora do novo alcance
    E nenhuma participação é cancelada

  Cenário: reduzir sem participação incompatível é permitido e notifica
    Dado o evento "evt-003", alcance CURSO ECOMP, com participações apenas de alunos de 3ESPX
    Quando o organizador reduz o alcance para TURMA 3ESPX
    Então a alteração é aceita
    E todos os inscritos recebem a intenção de notificação "EVENTO_ALTERADO"

  Cenário: alcance é livre enquanto rascunho
    Dado o evento "evt-011" (Sarau de fim de semestre), status "RASCUNHO", alcance TURMA 3ESPX
    Quando o organizador altera o alcance para FACULDADE
    Então a alteração é aceita, porque não há inscrito para surpreender
```

#### CT-014 — Evento de alcance FACULDADE criado por aluno exige aprovação

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-003 | RF-041 | Unitário | P1 | `app/src/domain/event.test.ts` |

```gherkin
Funcionalidade: Aprovação de evento de alcance FACULDADE

  Cenário: aluno comum cria evento de faculdade e ele nasce em aprovação
    Dado o aluno Rafael Souza, sem papel administrativo
    Quando ele publica um evento de alcance FACULDADE
    Então o status resultante é "EM_APROVACAO", não "PUBLICADO"
    E "canSee" é verdadeiro apenas para Rafael e para os administradores da faculdade
    E "canSee(Marina, evento)" é falso

  Cenário: admin de faculdade aprova e o evento fica visível
    Dado o evento em "EM_APROVACAO" criado por Rafael Souza
    Quando Isabela Duarte (ADMIN_FACULDADE) aprova
    Então o status passa para "PUBLICADO"
    E Rafael recebe a intenção de notificação "EVENTO_APROVADO"
    E o alcance da faculdade recebe "NOVO_EVENTO"

  Cenário: admin de faculdade publica direto
    Dado Isabela Duarte (ADMIN_FACULDADE) como organizadora
    Quando ela publica um evento de alcance FACULDADE
    Então o status é "PUBLICADO", sem passar por "EM_APROVACAO"

  Cenário: alcance TURMA e CURSO não exigem aprovação
    Dado o aluno Rafael Souza
    Quando ele publica "evt-001" com alcance TURMA 3ESPX
    Então o status é "PUBLICADO" imediatamente
```

### 3.5 Prazos

#### CT-015 — Prazo de inscrição encerra entradas, mas não a movimentação da fila

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-009 | RF-023 | Unitário | P1 | `packages/shared/src/domain/deadlines.test.ts` |

```gherkin
Funcionalidade: Prazo de inscrição

  Contexto:
    Dado o evento "evt-001", início 12/09/2026 13h00
    E "prazoInscricao" padrão de 12/09/2026 11h00 (início - 2h)

  Cenário: antes do prazo, inscrição aberta
    Quando "enrollmentOpen(evt-001, 12/09/2026 10h59)" é avaliado
    Então o resultado é verdadeiro

  Cenário: depois do prazo, nenhuma entrada nova
    Quando Gabriela Rocha tenta se inscrever em 12/09/2026 11h30
    Então a operação é recusada com "inscrições encerradas"
    E nenhuma participação é criada, nem "PENDENTE_PAGAMENTO" nem "LISTA_ESPERA"

  Cenário: oferta já emitida sobrevive ao prazo
    Dado o evento "evt-006", prazo de inscrição 15/09/2026 17h30
    E uma oferta emitida em 15/09/2026 16h00, válida até 15/09/2026 18h30 (início - 1h)
    Quando o aluno confirma em 15/09/2026 18h00, após o prazo de inscrição
    Então a confirmação é aceita
    E a participação passa para "CONFIRMADA"

  Cenário: promoção da fila continua funcionando após o prazo
    Dado o evento "evt-006" lotado, com 4 na fila, e o prazo de inscrição já vencido
    Quando uma vaga é liberada por cancelamento
    Então a posição 1 recebe "OFERTA_PENDENTE"
    E o prazo limita entrada, não movimentação interna
```

#### CT-016 — Prazo de cancelamento separa desistência de no-show

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-010 | RF-021, RF-031 | Unitário | P1 | `packages/shared/src/domain/deadlines.test.ts` |

```gherkin
Funcionalidade: Prazo de cancelamento

  Contexto:
    Dado o evento "evt-001", início 12/09/2026 13h00, R$ 25,00
    E "prazoCancelamento" padrão de 11/09/2026 13h00 (início - 24h)
    E Marina Alves com participação "CONFIRMADA" e pagamento "CONFIRMADO"

  Cenário: cancelamento antes do prazo é livre
    Quando Marina cancela em 10/09/2026 20h00
    Então a participação vai para "CANCELADA" com "canceladaAposPrazo = false"
    E a vaga é liberada
    E o reembolso segue a escala de RN-013 — 41h de antecedência, portanto R$ 0,00

  Cenário: cancelamento depois do prazo é permitido, marcado e sem reembolso
    Quando Marina cancela em 11/09/2026 18h00
    Então a participação vai para "CANCELADA" com "canceladaAposPrazo = true"
    E a vaga é liberada e a fila é acionada
    E o reembolso é R$ 0,00
    E o histórico do organizador registra o cancelamento fora do prazo

  Cenário: invariante do prazo
    Quando um evento é validado com "prazoCancelamento" posterior ao início
    Então a validação falha
```

#### CT-017 — Prazos coerentes entre si na criação e na edição

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-011 | RF-010, RF-013 | Unitário | P1 | `app/src/domain/eventSchema.test.ts` |

```gherkin
Funcionalidade: Coerência de datas do evento

  Cenário: evento válido passa na validação
    Dado o evento "evt-011" (Sarau de fim de semestre), criado em 01/09/2026
    E início 03/10/2026 20h00, fim 03/10/2026 23h00, prazo de inscrição 03/10/2026 18h00
    Quando o esquema é validado
    Então a validação passa
    E "prazoCancelamento" recebe o padrão 02/10/2026 20h00

  Esquema do Cenário: cada desigualdade violada reprova a publicação
    Quando o evento é validado com "<violação>"
    Então a validação falha com a mensagem "<mensagem>"

    Exemplos:
      | violação                                        | mensagem                                    |
      | fim 03/10/2026 19h00, antes do início 20h00     | fim deve ser posterior ao início            |
      | prazo de inscrição 04/10/2026, após o início    | prazo de inscrição deve ser até o início    |
      | prazo de cancelamento 04/10/2026, após o início | prazo de cancelamento deve ser até o início |
      | início 20/08/2026, no passado                   | início deve ser futuro na criação           |
      | fim 12/10/2026, 9 dias após o início            | duração máxima de 7 dias                    |
      | capacidade 1                                    | capacidade mínima de 2                      |
      | capacidade 2500                                 | capacidade máxima de 2000                   |

  Cenário: edição pode manter evento em andamento
    Dado o evento "evt-004" (Feira de Carreiras 2026.2) em andamento
    Quando o organizador corrige o local sem alterar as datas
    Então a validação de "início > agora" não é aplicada na edição
```

### 3.6 Unicidade e integridade

#### CT-018 — Um aluno, uma participação ativa por evento

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-015 | RF-022 | Unitário | P0 | `packages/shared/src/domain/participation.test.ts` |

```gherkin
Funcionalidade: Unicidade da participação ativa

  Cenário: segunda inscrição no mesmo evento é recusada
    Dado Marina Alves com participação "CONFIRMADA" em "evt-001"
    Quando ela tenta se inscrever novamente em "evt-001"
    Então a operação é recusada com "você já está inscrita neste evento"
    E "ocupadas" continua 18
    E nenhuma participação nova é criada

  Esquema do Cenário: todo estado ativo bloqueia nova participação
    Dado Marina Alves com participação "<status>" em "evt-002"
    Quando ela tenta se inscrever novamente
    Então a operação é "<resultado>"

    Exemplos:
      | status             | resultado |
      | PENDENTE_PAGAMENTO | recusada  |
      | CONFIRMADA         | recusada  |
      | LISTA_ESPERA       | recusada  |
      | OFERTA_PENDENTE    | recusada  |
      | PRESENTE           | recusada  |
      | CANCELADA          | aceita    |
      | EXPIRADA           | aceita    |
      | AUSENTE            | aceita    |

  Cenário: histórico é preservado ao reinscrever
    Dado Marina Alves com participação "CANCELADA" em "evt-001"
    Quando ela se inscreve novamente, com vaga e prazo disponíveis
    Então existe uma segunda participação, e a primeira continua "CANCELADA"
    E nenhum registro é apagado ou reaproveitado
```

#### CT-019 — Organizador não é participante automático

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-016 | RF-010, RF-019 | Unitário | P1 | `packages/shared/src/domain/participation.test.ts` |

```gherkin
Funcionalidade: Organizador e contagem de vagas

  Cenário: criar evento não cria participação
    Dado o aluno Rafael Souza, da turma 3ESPX
    Quando ele cria e publica "evt-001" com capacidade 40
    Então "ocupadas" é 0 no momento da publicação
    E não existe participação de Rafael Souza em "evt-001"
    E ele não aparece na lista de presença

  Cenário: organizador que quer participar se inscreve como qualquer um
    Dado "evt-001" com 18 ocupadas e preço R$ 25,00
    Quando Rafael Souza se inscreve no próprio evento
    Então uma participação "PENDENTE_PAGAMENTO" é criada para ele
    E "ocupadas" passa a 19
    E o valor devido é R$ 25,00, sem isenção por ser organizador

  Cenário: organizador só entra na lista de presença com check-in
    Dado Rafael Souza com participação "CONFIRMADA" em "evt-001"
    Quando a lista de presença é gerada sem check-in dele
    Então Rafael não consta como presente
```

### 3.7 Check-in

#### CT-022 — Token do QR é validado em assinatura, evento e janela

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-017 | RF-033, RF-034 · RNF-011 | Unitário | P0 | `packages/shared/src/domain/checkin.test.ts` |

```gherkin
Funcionalidade: Validação do token de check-in

  Contexto:
    Dado o evento "evt-001", início 12/09/2026 13h00, fim 12/09/2026 18h00
    E CHECKIN_OPENS_HOURS_BEFORE = 4h e CHECKIN_CLOSES_HOURS_AFTER = 2h
    E o ingresso "CMP-3ESPX-0184" de Marina Alves, participação "CONFIRMADA"
    E o leitor sendo o organizador Rafael Souza

  Cenário: token íntegro dentro da janela é aceito
    Quando a leitura acontece em 12/09/2026 13h07
    Então o check-in é aceito
    E a participação passa para "PRESENTE"

  Esquema do Cenário: cada condição violada recusa com motivo específico
    Quando a leitura acontece com "<condição>"
    Então o check-in é recusado com o motivo "<motivo>"

    Exemplos:
      | condição                                                  | motivo                              |
      | assinatura HMAC adulterada em 1 byte do payload           | ingresso inválido                   |
      | token emitido para "evt-009" lido no "evt-001"             | ingresso de outro evento            |
      | leitura em 12/09/2026 08h30, antes de início - 4h          | check-in ainda não abriu            |
      | leitura em 12/09/2026 20h30, após fim + 2h                 | check-in encerrado                  |
      | participação "CANCELADA"                                   | inscrição cancelada                 |
      | participação "PENDENTE_PAGAMENTO"                          | pagamento não confirmado            |
      | leitor é Diego Martins, sem papel no evento                | sem permissão para validar check-in |

  Cenário: mensagem genérica é defeito
    Quando qualquer recusa acontece
    Então a mensagem devolvida identifica a condição violada
    E não é "erro ao validar ingresso"
```

#### CT-023 — O QR vale uma única vez

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-017 | RF-034 · RNF-011 | Unitário | P0 | `packages/shared/src/domain/checkin.test.ts` |

```gherkin
Funcionalidade: Uso único do ingresso

  Cenário: segunda leitura do mesmo ingresso é recusada
    Dado o ingresso "CMP-3ESPX-0184" de Marina Alves em "evt-001"
    E o check-in aceito em 12/09/2026 13h07, com "Presenca" registrada
    Quando o mesmo QR é lido novamente em 12/09/2026 13h09
    Então o check-in é recusado com "ingresso já utilizado às 13h07"
    E continua existindo exatamente 1 "Presenca" para essa participação
    E a participação continua "PRESENTE"

  Cenário: duas leituras simultâneas do mesmo ingresso
    Dado o ingresso "CMP-3ESPX-0184" sem presença registrada
    Quando dois leitores validam o mesmo token no mesmo instante
    Então exatamente 1 "Presenca" é criada
    E a outra leitura recebe "ingresso já utilizado"

  Cenário: ingresso de outra participação do mesmo evento não é afetado
    Dado que "CMP-3ESPX-0184" já foi usado
    Quando o ingresso de Gabriela Rocha, do mesmo "evt-001", é lido
    Então o check-in é aceito
```

#### CT-024 — Presença é fato único e imutável

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-018 | RF-034, RF-035 | Unitário | P1 | `packages/shared/src/domain/checkin.test.ts` |

```gherkin
Funcionalidade: Registro de presença

  Cenário: aceitar check-in cria presença com autoria e horário
    Dado o check-in de Marina Alves aceito em 12/09/2026 13h07 por Rafael Souza
    Então existe uma "Presenca" com "checkinEm = 12/09/2026 13h07"
    E "registradoPorId" é o id de Rafael Souza
    E a relação com a participação é 1:1

  Cenário: presença não é editada nem apagada
    Quando qualquer operação tenta alterar ou remover a "Presenca" existente
    Então a operação é recusada

  Cenário: correção de erro operacional cria nova presença com motivo
    Dado uma presença registrada por engano para a participação errada
    Quando o organizador registra a correção
    Então uma nova "Presenca" é criada com "motivoCorrecao" preenchido
    E a presença original permanece na trilha de auditoria

  Cenário: confirmada sem presença vira ausente ao fechar a janela
    Dado Marina Alves "CONFIRMADA" em "evt-009" (Churrasco de boas-vindas 1CCB), fim 22/08/2026 16h00
    Quando o relógio passa de 22/08/2026 18h00 (fim + 2h) sem check-in
    Então a participação passa para "AUSENTE"
    E o dado alimenta a taxa de comparecimento do evento
```

### 3.8 Feed e moderação

#### CT-025 — Publica no feed do evento quem esteve no evento

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-019 | RF-036, RF-037 | Unitário + componente | P1 | `app/src/domain/feed.test.ts`, `app/src/pages/Feed.test.tsx` |

```gherkin
Funcionalidade: Direito de publicar no feed do evento

  Esquema do Cenário: quem pode publicar
    Dado o usuário "<usuario>" com participação "<status>" no evento "<evento>"
    Quando "canPublish" é avaliado
    Então o resultado é <pode>

    Exemplos:
      | usuario         | status      | evento  | pode  | por quê                                  |
      | Marina Alves    | PRESENTE    | evt-009 | true  | esteve no evento                         |
      | Marina Alves    | CONFIRMADA  | evt-001 | false | inscrita não é o mesmo que ter ido       |
      | Rafael Souza    | organizador | evt-001 | true  | organizador publica antes e depois       |
      | Diego Martins   | sem vínculo | evt-009 | false | não vê o evento, não publica             |
      | Marina Alves    | AUSENTE     | evt-009 | false | não compareceu                           |

  Cenário: antes do início, só o organizador publica
    Dado o evento "evt-001", início 12/09/2026 13h00, e agora é 01/09/2026
    Então "canPublish" é verdadeiro para Rafael Souza e falso para todos os inscritos

  Cenário: a publicação herda a visibilidade do evento
    Dado uma publicação em "evt-009" (TURMA 1CCB)
    Então ela não aparece no feed de Marina Alves, que não vê "evt-009"

  Cenário de componente: o botão só existe para quem pode publicar
    Dado o feed de Marina Alves renderizado com o seed canônico
    Então o botão "Publicar foto" aparece no bloco de "evt-009"
    E não aparece no bloco de "evt-001"
```

#### CT-026 — Moderação exige autor, motivo e alcance correto

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-020 | RF-042 | Unitário | P2 | `app/src/domain/moderation.test.ts` |

```gherkin
Funcionalidade: Remoção de publicação e comentário

  Esquema do Cenário: quem pode remover o quê
    Dado a publicação "<publicacao>" no evento "<evento>"
    Quando "<ator>" tenta remover
    Então a operação é "<resultado>"

    Exemplos:
      | ator                              | publicacao        | evento  | resultado |
      | o próprio autor                   | própria           | evt-009 | aceita    |
      | Beatriz Nakamura (organizadora)   | de outro aluno    | evt-005 | aceita    |
      | Henrique Lima (ADMIN_CURSO ECOMP) | de aluno          | evt-003 | aceita    |
      | Henrique Lima (ADMIN_CURSO ECOMP) | de aluno          | evt-006 | recusada  |
      | Isabela Duarte (ADMIN_FACULDADE)  | de aluno          | evt-006 | aceita    |
      | Diego Martins (aluno no alcance)  | de outro aluno    | evt-004 | recusada  |

  Cenário: remoção sem motivo é recusada
    Quando Beatriz Nakamura remove uma publicação de "evt-005" sem informar motivo
    Então a operação é recusada

  Cenário: remoção grava autoria, motivo e horário
    Quando Beatriz Nakamura remove com o motivo "conteúdo fora do tema do evento"
    Então a publicação deixa de aparecer no feed
    E o registro guarda autor, motivo e horário da remoção
    E o conteúdo fica retido por 90 dias para contestação, e é eliminado depois
```

### 3.9 Cancelamento de evento

#### CT-027 — Cancelar evento exige motivo e é irreversível

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-021 | RF-014 | Unitário | P1 | `app/src/domain/event.test.ts` |

```gherkin
Funcionalidade: Cancelamento de evento

  Cenário: cancelamento sem motivo é recusado
    Dado o evento "evt-008" (Palestra: Carreira em Segurança da Informação), status "PUBLICADO"
    Quando o organizador cancela sem informar motivo
    Então a operação é recusada
    E o status continua "PUBLICADO"

  Cenário: cancelamento com motivo é aceito e registrado
    Quando o organizador cancela com o motivo "palestrante indisponível"
    Então o status passa para "CANCELADO"
    E o motivo fica visível para quem participava

  Cenário: CANCELADO é terminal
    Dado o evento "evt-008" com status "CANCELADO"
    Quando qualquer ator tenta voltar o status para "PUBLICADO" ou "EM_APROVACAO"
    Então a operação é recusada
    E o caminho oferecido é duplicar o evento (RF-018)

  Cenário: evento cancelado não aceita mais nada
    Dado o evento "evt-008" com status "CANCELADO"
    Então nova inscrição é recusada
    E check-in é recusado
    E nova publicação é recusada
    E o evento continua visível, com o motivo, para os 34 inscritos
```

#### CT-028 — Cascata do cancelamento nas participações

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-022 | RF-014 | Unitário | P0 | `app/src/domain/event.test.ts` |

```gherkin
Funcionalidade: Efeito em cascata do cancelamento

  Cenário: cancelamento de evento pago publicado
    Dado o evento "evt-005" (Festa Junina Fora de Época), R$ 45,00, 287 ocupadas
    E 280 participações "CONFIRMADA" com pagamento "CONFIRMADO"
    E 7 participações "PENDENTE_PAGAMENTO"
    E 5 participações "LISTA_ESPERA" e 1 "OFERTA_PENDENTE"
    Quando Beatriz Nakamura cancela o evento com motivo
    Então as 280 "CONFIRMADA" passam para "CANCELADA" com "motivo = EVENTO_CANCELADO"
    E os 280 pagamentos vão para "REEMBOLSO_SOLICITADO" com 100% de R$ 45,00
    E as 7 "PENDENTE_PAGAMENTO" passam para "CANCELADA" e a cobrança pendente é invalidada
    E as 5 "LISTA_ESPERA" e a "OFERTA_PENDENTE" passam para "CANCELADA"
    E todas as 293 pessoas recebem intenção de notificação "EVENTO_CANCELADO" com o motivo
    E tudo acontece em uma única operação: não há estado intermediário observável

  Cenário: presença nunca é revertida
    Dado o evento "evt-009" (Churrasco de boas-vindas 1CCB), status "REALIZADO"
    E 28 participações "PRESENTE" e 3 "AUSENTE"
    Quando Isabela Duarte (ADMIN_FACULDADE) cancela o evento com justificativa
    Então as 28 "PRESENTE" permanecem "PRESENTE"
    E as 3 "AUSENTE" permanecem "AUSENTE"
    E nenhum reembolso automático é gerado
    E o evento apenas deixa de aceitar novas ações
```

### 3.10 Papéis e permissões

#### CT-029 — Organizador é papel por evento, e transições proibidas são recusadas

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-023 | — · RNF-012 | Unitário | P0 | `packages/shared/src/domain/participation.test.ts`, `app/src/domain/event.test.ts` |

O mapeamento de [`04-regras-de-negocio.md`](04-regras-de-negocio.md) aponta RN-023 para
CT-029, e o [diagrama de estados](05-modelagem/06-diagrama-estados.md) atribui a CT-029 a
verificação das transições proibidas. As duas coisas convivem no mesmo caso porque provam a
mesma tese: **papel e estado são dados do domínio, não flags livres** — quem pode agir vem
da relação com o evento, e para onde o estado pode ir vem de uma tabela fechada.

```gherkin
Funcionalidade: Papel por evento e tabela fechada de transições

  Cenário: organizador não é tipo de usuário
    Dado o aluno Rafael Souza, organizador de "evt-001"
    Então o registro dele é um "Usuario" comum, sem subclasse nem cadastro à parte
    E "isOrganizer(Rafael, evt-001)" é verdadeiro
    E "isOrganizer(Rafael, evt-005)" é falso
    E as permissões de organizador de Rafael não valem em "evt-005"

  Cenário: papéis administrativos são atribuições sobre escopo, cumulativas com aluno
    Dado Henrique Lima com papel "ADMIN_CURSO" do curso ECOMP
    Então ele continua podendo se inscrever como aluno
    E suas permissões administrativas valem só em eventos de alcance TURMA e CURSO de ECOMP

  Esquema do Cenário: transição de participação fora da tabela é recusada
    Dado uma participação no estado "<de>"
    Quando o domínio tenta a transição para "<para>"
    Então a transição é recusada com "transição não permitida"

    Exemplos:
      | de                 | para               | por quê                                     |
      | LISTA_ESPERA       | CONFIRMADA         | pularia a oferta com janela (RN-007)        |
      | CONFIRMADA         | PENDENTE_PAGAMENTO | não se descobra vaga já paga (RN-013)       |
      | EXPIRADA           | OFERTA_PENDENTE    | estado terminal                             |
      | CANCELADA          | CONFIRMADA         | burlaria a fila                             |
      | AUSENTE            | PRESENTE           | correção cria nova presença (RN-018)        |
      | PRESENTE           | CANCELADA          | presença é fato imutável (RN-022)           |
      | PENDENTE_PAGAMENTO | PRESENTE           | check-in exige CONFIRMADA (RN-017)          |
      | LISTA_ESPERA       | PRESENTE           | não há vaga nem pagamento                   |

  Esquema do Cenário: transição de evento fora da tabela é recusada
    Dado um evento no status "<de>"
    Quando o domínio tenta a transição para "<para>"
    Então a transição é recusada

    Exemplos:
      | de        | para         |
      | CANCELADO | PUBLICADO    |
      | REALIZADO | PUBLICADO    |
      | PUBLICADO | RASCUNHO     |
      | PUBLICADO | EM_APROVACAO |
      | RASCUNHO  | REALIZADO    |
```

#### CT-030 — Matriz de permissões

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-024 | RF-041, RF-042, RF-043 · RNF-012 | Unitário | P0 | `packages/shared/src/domain/permissions.test.ts` |

```gherkin
Funcionalidade: Matriz de permissões por ator

  Esquema do Cenário: cada célula da matriz de RN-024 é um caso
    Dado o ator "<ator>"
    Quando ele tenta a ação "<acao>" sobre "<alvo>"
    Então o resultado é "<permitido>"

    Exemplos:
      | ator                              | acao                        | alvo                    | permitido |
      | Felipe Antunes (fora do alcance)  | ver evento                  | evt-001 (TURMA 3ESPX)   | não       |
      | Marina Alves (no alcance)         | ver evento                  | evt-001                 | sim       |
      | Marina Alves                      | criar evento TURMA          | turma 3ESPX             | sim       |
      | Marina Alves                      | criar evento TURMA          | turma 4SIA              | não       |
      | Marina Alves                      | criar evento FACULDADE      | FIAP                    | sim, em EM_APROVACAO |
      | Isabela Duarte (ADMIN_FACULDADE)  | criar evento FACULDADE      | FIAP                    | sim, publica direto |
      | Marina Alves                      | editar evento               | evt-001                 | não       |
      | Rafael Souza (organizador)        | editar evento               | evt-001                 | sim       |
      | Henrique Lima (ADMIN_CURSO ECOMP) | cancelar evento             | evt-003 (CURSO ECOMP)   | sim       |
      | Henrique Lima (ADMIN_CURSO ECOMP) | cancelar evento             | evt-006 (CURSO SI)      | não       |
      | Henrique Lima                     | aprovar evento FACULDADE    | evento em EM_APROVACAO  | não       |
      | Isabela Duarte                    | aprovar evento FACULDADE    | evento em EM_APROVACAO  | sim       |
      | Marina Alves                      | cancelar inscrição de outro | participação de Diego   | não       |
      | Henrique Lima                     | cancelar inscrição de outro | participação em evt-003 | sim, com motivo |
      | Marina Alves                      | validar check-in            | evt-001                 | não       |
      | Rafael Souza (organizador)        | validar check-in            | evt-001                 | sim       |
      | Marina Alves                      | ver lista de presença       | evt-001                 | não       |
      | Rafael Souza                      | ver lista de presença       | evt-001                 | sim       |
      | Marina Alves                      | gerenciar turmas e códigos  | curso ECOMP             | não       |
      | Henrique Lima                     | gerenciar turmas e códigos  | curso ECOMP             | sim       |

  Cenário: a decisão de permissão não depende da tela
    Quando cada caso acima é avaliado chamando o domínio diretamente
    Então nenhuma asserção precisa renderizar componente
    E o mesmo resultado vale para o handler do MSW, que consome a mesma função
```

### 3.11 Perguntas customizadas

#### CT-031 — Pergunta customizada nunca bloqueia a reserva da vaga

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-025 | RF-017 | Unitário + componente | P1 | `app/src/domain/customQuestions.test.ts`, `app/src/pages/EventDetail.test.tsx` |

```gherkin
Funcionalidade: Perguntas customizadas na inscrição

  Contexto:
    Dado o evento "evt-001" com 3 perguntas customizadas, duas delas obrigatórias
    E MAX_CUSTOM_QUESTIONS = 5

  Cenário: a vaga é reservada antes das perguntas
    Quando Gabriela Rocha se inscreve em "evt-001"
    Então a participação é criada primeiro
    E "ocupadas" passa de 18 para 19 antes de qualquer pergunta ser apresentada

  Cenário: abandonar o formulário não desfaz a inscrição
    Dado Gabriela Rocha com participação criada e formulário de perguntas aberto
    Quando ela fecha o formulário sem responder
    Então a participação continua válida
    E as 3 respostas ficam pendentes
    E o organizador vê "3 respostas pendentes" para essa inscrição

  Cenário: resposta pendente não bloqueia pagamento nem check-in
    Dado Gabriela Rocha com respostas pendentes em "evt-001"
    Quando o pagamento é confirmado pelo gateway
    Então a participação passa para "CONFIRMADA"
    E o check-in em 12/09/2026 13h07 é aceito

  Cenário: pergunta obrigatória bloqueia só o envio do formulário
    Quando Gabriela envia o formulário deixando uma pergunta obrigatória em branco
    Então o envio é recusado com erro de validação no campo
    E a participação permanece intacta

  Cenário: pergunta criada depois só vale para inscrições novas
    Dado que "evt-001" já tem 19 inscritos
    Quando o organizador adiciona uma quarta pergunta
    Então nenhuma das 19 participações passa a ter resposta pendente da nova pergunta
    E a inscrição seguinte responde as 4

  Cenário: limite de perguntas
    Quando o organizador tenta cadastrar a sexta pergunta
    Então a operação é recusada, porque MAX_CUSTOM_QUESTIONS é 5

  Cenário: uma resposta por par (participação, pergunta)
    Quando uma segunda resposta é enviada para a mesma pergunta da mesma participação
    Então a resposta anterior é substituída, e não duplicada
```

### 3.12 Casos de componente sem CT dedicado

Seis casos de componente sustentam a camada intermediária. Quatro deles não cobrem RN — cobrem
RNF e ligação de tela, e por isso não recebem ID de CT (o espaço `CT-0xx` é reservado a regra
de negócio).

| Caso | Arquivo | O que prova | Requisito |
|---|---|---|---|
| Estados do cartão de evento | `components/ui/EventCard.test.tsx` | evt-001 mostra "R$ 25,00" e "18 de 40"; evt-002 mostra "Lista de espera"; evt-008 mostra "Cancelado" com motivo; evt-003 mostra "Gratuito" | RF-015, RN-006 |
| Ação primária do detalhe | `pages/EventDetail.test.tsx` | evt-003 → "Inscrever-se"; evt-001 → "Ver ingresso" (Marina já confirmada); evt-002 → "Entrar na lista de espera" com "posição 7"; evt-008 → ação desabilitada | RF-016, RN-006, RN-015 |
| Formulário de perguntas | `pages/EventDetail.test.tsx` | complemento de componente do CT-031 | RF-017, RN-025 |
| Botão de publicar no feed | `pages/Feed.test.tsx` | complemento de componente do CT-025 | RF-037, RN-019 |
| Rótulo acessível em ícones | `components/a11y.test.tsx` | varre o render das 8 telas e falha se existir `button` sem nome acessível ou imagem de conteúdo sem `alt` | RNF-004 |
| Lista com filtros e estado vazio | `pages/EventList.test.tsx` | filtro por alcance e por data; estado vazio com texto útil, não em branco | RF-015 |

---

### 3.13 Autenticação, cobrança simulada e ingresso (CP5)

Seis casos acrescentados no CP5, junto com os módulos de domínio que entraram. Os três
arquivos somam **49 casos executados** — a contagem por CT abaixo é o agrupamento lógico,
não o número de `it()`.

#### CT-032 — Só e-mail institucional entra, e o motivo da recusa é específico

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-002 | RF-002, RF-003 | Unitário | P0 | `packages/shared/src/domain/auth.test.ts` |

```gherkin
Funcionalidade: Login com e-mail institucional

  Cenário: domínio exato é aceito
    Dado que a faculdade aceita o domínio "fiap.com.br"
    Quando "marina@fiap.com.br" tenta entrar com a senha correta
    Então o login é aceito

  Cenário: subdomínio institucional é aceito
    Quando "marina@aluno.fiap.com.br" tenta entrar
    Então o login é aceito, porque é assim que instituição organiza e-mail de aluno

  Cenário: sufixo parecido NÃO é subdomínio
    Quando "invasor@naofiap.com.br" tenta entrar
    Então o login é recusado
    # Sem o ponto na comparação, "naofiap.com.br" passaria por terminar em
    # "fiap.com.br" — e qualquer pessoa registraria um domínio assim.

  Cenário: o domínio é verificado ANTES da senha
    Dado que "marina@gmail.com" digitou uma senha correta de outra conta
    Quando ela tenta entrar
    Então a recusa é "DOMINIO_NAO_INSTITUCIONAL", não "CREDENCIAL_INVALIDA"
    E a mensagem nomeia o domínio aceito
    # Dizer "senha errada" a quem usou o Gmail manda a pessoa tentar de novo
    # com a mesma conta, para sempre.

  Cenário: recusa de credencial não revela se a conta existe
    Quando um e-mail inexistente e uma senha errada de conta existente são tentados
    Então as duas recusas têm o MESMO motivo e a MESMA mensagem
    # Mensagem diferente enumeraria contas válidas (RNF-021).

  Cenário: e-mail não verificado não entra
    Dado um usuário com "emailVerificado" falso e senha correta
    Quando ele tenta entrar
    Então a recusa é "EMAIL_NAO_VERIFICADO"
```

#### CT-033 — Código de turma prova o vínculo, e o erro diz o que corrigir

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-003 | RF-004, RF-005 | Unitário | P0 | `packages/shared/src/domain/auth.test.ts` |

```gherkin
Funcionalidade: Vínculo com a turma pelo código de convite

  Cenário: curso e código coerentes vinculam
    Dado o curso "Engenharia" e a turma "3ESPX" com código ativo "ESPX26"
    Quando o aluno escolhe Engenharia e digita "ESPX26"
    Então o vínculo é criado com a turma 3ESPX

  Cenário: código digitado à mão tolera espaço, hífen e caixa
    Quando o aluno digita " espx-26 "
    Então o vínculo é criado

  Cenário: código de outro curso tem recusa própria
    Quando o aluno escolhe Engenharia e digita "DIRA26", da turma 2DIRA de Direito
    Então a recusa é "CODIGO_DE_OUTRO_CURSO"
    E a mensagem nomeia a turma 2DIRA
    # É o erro de quem escolheu o curso errado na tela anterior. Mensagem
    # genérica o deixaria preso.

  Cenário: código inexistente e código inativo são recusas diferentes
    Quando o aluno digita "NADA00"
    Então a recusa é "CODIGO_INVALIDO"
    Quando o aluno digita "ESPY25", da turma 3ESPY do período 2025.2
    Então a recusa é "CODIGO_INATIVO"

  Cenário: o onboarding só termina com curso E turma
    Então "onboardingPendente" é verdadeiro enquanto qualquer um dos dois faltar
```

#### CT-034 — O BR Code da cobrança simulada é estruturalmente válido

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-012, RN-014 | RF-027, RF-028 | Unitário | P1 | `packages/shared/src/domain/pix.test.ts` |

```gherkin
Funcionalidade: Payload EMV da cobrança Pix simulada

  Cenário: CRC16 confere com a referência do padrão
    Então o CRC16/CCITT-FALSE de "123456789" é "29B1"
    # Referência externa: sem ela, o teste só confirmaria a própria implementação.

  Cenário: estrutura do payload
    Dada uma cobrança de R$ 45,50 para a participação "par-001"
    Então o payload começa com "000201"
    E contém o GUI "br.gov.bcb.pix"
    E o campo 54 traz "45.50" com duas casas
    E termina com "6304" seguido do CRC dos bytes anteriores

  Cenário: o payload é determinístico
    Quando a mesma cobrança é gerada duas vezes
    Então os dois BR Codes são idênticos
    # É o que permite NÃO armazenar o QR e recalculá-lo na leitura.

  Cenário: o txid respeita o limite de 25 caracteres alfanuméricos
    Dada uma referência longa com barra, espaço e hífen
    Então o campo 05 dentro do 62 tem no máximo 25 caracteres, todos alfanuméricos
```

#### CT-035 — Nenhum dígito do cartão além dos quatro últimos sai da tela

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-014 | RF-029, RNF-022 | Unitário | P0 | `packages/shared/src/domain/pix.test.ts` |

```gherkin
Funcionalidade: Redução do cartão ao resumo que pode trafegar

  Cenário: o resumo tem três campos e nada mais
    Dado o número "4539 5787 6362 1486" e o titular "Marina Alves"
    Quando o cartão é resumido
    Então o resultado é { ultimosQuatro: "1486", bandeira: "Visa", titular: "MARINA ALVES" }

  Cenário: o número não é reconstruível a partir do resumo
    Quando o resumo é serializado em JSON
    Então a cadeia não contém o número completo
    E não contém nem os 6 primeiros dígitos (o BIN)

  Cenário: Luhn reprova dígito trocado
    Então "4539578763621486" é válido e "4539578763621487" não é

  Cenário: validade vale até o último dia do mês impresso
    Dado que hoje é 15/09/2026
    Então "09/26" é válida, "08/26" não é e "10/26" é
    # Reprovar 09/26 no dia 1º cortaria um mês legítimo de uso.

  Cenário: CVV tem 4 dígitos na Amex e 3 nas outras bandeiras
```

#### CT-036 — Token adulterado é recusado, e entrada lixo não derruba o leitor

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-017 | RF-033, RF-034 | Unitário | P0 | `packages/shared/src/domain/ticketToken.test.ts` |

```gherkin
Funcionalidade: Integridade do token do ingresso

  Cenário: ciclo completo preserva o payload
    Quando um token é emitido e lido de volta
    Então o payload é idêntico, inclusive com acento e emoji no conteúdo
    # `btoa` quebraria aqui — é por isso que o base64url é escrito à mão.

  Cenário: corpo alterado com assinatura mantida é recusado
    Quando um caractere do corpo é trocado e a assinatura é preservada
    Então a leitura devolve nulo

  Cenário: emissor ou versão diferentes são recusados
    Quando o prefixo "campus.v1" é trocado por "outro.v1" ou "campus.v2"
    Então a leitura devolve nulo

  Cenário: entrada lixo devolve nulo e NUNCA lança
    Quando são lidos "", "   ", "abc", "a.b.c", "a.b.c.d.e", "campus.v1..x" e "{}"
    Então cada leitura devolve nulo, sem exceção
    # Na porta de um evento, um leitor que estoura com um QR de outro sistema
    # para a fila.

  Cenário: payload íntegro mas incompleto é recusado
    Dado um token com assinatura válida e "participacaoId" vazio
    Então a leitura devolve nulo
    # O leitor não pode confiar só na assinatura.
```

#### CT-037 — As três formas de leitura convergem para a mesma decisão

| Regra | Requisitos | Nível | Prioridade | Arquivo |
|---|---|---|---|---|
| RN-017, RN-018 | RF-033, RF-034 | Unitário | P0 | `packages/shared/src/domain/ticketToken.test.ts` |

```gherkin
Funcionalidade: Classificação da leitura na porta do evento

  Cenário: token completo pela câmera
    Quando a leitura começa com "campus.v1."
    Então é classificada como TOKEN

  Cenário: código numérico digitado
    Quando a leitura é " 01234567 "
    Então é classificada como CODIGO_NUMERICO com o valor sem espaços

  Cenário: código legível impresso, em qualquer caixa
    Quando a leitura é "cmp-3espx-0184"
    Então é classificada como CODIGO_LEGIVEL com "CMP-3ESPX-0184"

  Cenário: o que não é nenhuma das três formas é indecifrável
    Quando são lidos "", "1234", "123456789", "CMP-3ESPX" e uma URL de outro app
    Então cada um é classificado como INDECIFRAVEL

  Cenário: o ingresso é estável entre emissões
    Quando o mesmo ingresso é montado duas vezes
    Então o código numérico e o código legível não mudam
    # Código que muda a cada emissão inutiliza o ingresso impresso.
```

---

## 4. O único teste E2E

**Arquivo:** `app/e2e/inscricao.spec.ts` · **Fluxo:** abrir feed → abrir evento →
inscrever-se → ver confirmação · **Dado:** seed canônico, Marina Alves autenticada,
evento **evt-003** (Roda de conversa: mercado de dados, CURSO ECOMP, gratuito, 41/60).

`evt-003` é o alvo por três razões objetivas: Marina o enxerga (curso ECOMP), é gratuito
(o fluxo não depende do gateway, que não tem sandbox — D-02) e ela ainda não está inscrita
(em `evt-001` ela já está `CONFIRMADA`).

### 4.1 Passos

| # | Ação | Verificação |
|---|---|---|
| 1 | `page.goto('/')` | `[data-testid="feed"]` visível; MSW ativo; nenhum erro no console |
| 2 | **Toque 1** — clicar no cartão `[data-event-id="evt-003"]` | URL passa a `/eventos/evt-003` |
| 3 | — | `[data-testid="event-title"]` contém "Roda de conversa: mercado de dados" e `[data-testid="spots-counter"]` contém "41 de 60" |
| 4 | **Toque 2** — clicar em `[data-testid="primary-action"]` ("Inscrever-se") | `[data-testid="enroll-sheet"]` visível, com data, local e política |
| 5 | **Toque 3** — clicar em `[data-testid="enroll-confirm"]` | `[data-testid="participation-status"]` contém "Inscrição confirmada" |
| 6 | — | `[data-testid="spots-counter"]` contém "42 de 60" |
| 7 | — | `[data-testid="ticket-link"]` aponta para `/ingresso/` |
| 8 | Recarregar a página | O status confirmado persiste na sessão mockada |
| 9 | — | O contador de cliques do teste é exatamente **3** (RNF-001) e o fluxo fecha em menos de 300 ms de latência de escrita (RNF-008 na camada mockada) |

```ts
// app/e2e/inscricao.spec.ts (essência do caso)
test('fluxo de inscricao: feed -> evento -> inscrever -> confirmacao', async ({ page }) => {
  let taps = 0
  page.on('click', () => taps++)

  await page.goto('/')
  await expect(page.getByTestId('feed')).toBeVisible()

  await page.locator('[data-event-id="evt-003"]').click()
  await expect(page.getByTestId('event-title')).toContainText('mercado de dados')
  await expect(page.getByTestId('spots-counter')).toContainText('41 de 60')

  await page.getByTestId('primary-action').click()
  await page.getByTestId('enroll-confirm').click()

  await expect(page.getByTestId('participation-status')).toContainText('Inscrição confirmada')
  await expect(page.getByTestId('spots-counter')).toContainText('42 de 60')
  expect(taps).toBe(3)
})
```

### 4.2 Seletores estáveis

Regra: **`data-testid` para alvo de interação, papel acessível para asserção de
acessibilidade.** Nada mais.

| Seletor | Onde | Papel |
|---|---|---|
| `data-testid="feed"` | `/` | Raiz do feed carregado |
| `data-testid="event-card"` + `data-event-id="evt-003"` | Cartão no feed e na lista | Alvo do toque 1, sem depender de posição na lista |
| `data-testid="event-title"` | `/eventos/:id` | Confirma que abriu o evento certo |
| `data-testid="spots-counter"` | `/eventos/:id` | Prova o efeito da inscrição na contagem |
| `data-testid="primary-action"` | `/eventos/:id` | Botão resolvido por `resolvePrimaryAction` |
| `data-testid="enroll-sheet"` | Folha de inscrição | Contexto do toque 3 |
| `data-testid="enroll-confirm"` | Folha de inscrição | Confirmação |
| `data-testid="participation-status"` | `/eventos/:id` | Resultado observável |
| `data-testid="ticket-link"` | `/eventos/:id` | Caminho para `/ingresso/:id` |

O que **não** é usado como seletor, e por quê:

- **Texto visível** — a cópia é do PO e da designer; mudar "Inscrever-se" para "Quero ir"
  não pode quebrar o CI.
- **Classe do Tailwind** — as classes vêm de token e mudam com o design system.
- **XPath posicional / nth-child** — quebra quando um cartão entra no feed.

### 4.3 Por que só um E2E

- **O que o E2E prova é fiação, e a fiação é uma só.** Rota → TanStack Query → repositório
  → MSW → domínio → render → store de sessão. O fluxo de inscrição atravessa toda essa
  cadeia e passa por 3 das 8 telas. Um segundo E2E percorreria a mesma cadeia com outro
  conteúdo — repetiria custo, não cobertura.
- **A regra de negócio já está coberta 30 vezes, mais barato.** Um E2E para testar a escala
  de reembolso levaria dezenas de segundos, exigiria preparar estado de pagamento pela UI e
  falharia por *timeout* antes de falhar por regra. `refund.test.ts` faz o mesmo em
  milissegundos e aponta a linha errada.
- **Custo de manutenção é assimétrico.** Cada E2E acrescenta seletores frágeis, espera de
  rede e possibilidade de resultado instável. Suíte E2E instável é pior que suíte pequena:
  o time aprende a ignorar vermelho, e aí nenhum teste vale nada.
- **Quando um segundo E2E se justifica:** no CP6, quando existir API real e sessão
  persistida — aí o fluxo de check-in (ler ingresso, validar, ver presença) passa a
  atravessar fiação que hoje não existe.

---

## 5. Testes manuais obrigatórios

O que não dá para automatizar no CP4/CP5 tem roteiro, responsável e evidência. Sem
evidência anexada ao card, o item conta como não executado.

As **8 telas** do escopo, na ordem usada nos dois roteiros:

| # | Tela | Rota |
|---|---|---|
| 1 | Onboarding / entrada institucional | `/` (sem sessão) |
| 2 | Feed | `/` |
| 3 | Eventos, com filtros | `/eventos` |
| 4 | Detalhe do evento | `/eventos/evt-001` |
| 5 | Folha de inscrição e pagamento | `/eventos/evt-001` (sobreposta) |
| 6 | Criar evento | `/criar` |
| 7 | Ingresso com QR | `/ingresso/CMP-3ESPX-0184` |
| 8 | Perfil | `/perfil` |

### 5.1 Roteiro de acessibilidade (RNF-002, RNF-003, RNF-004)

Executor: Vitor Pantarotto · Revisora: Ana Luiza Dourado · Periodicidade: a cada
checkpoint e sempre que um componente de `components/ui/` mudar.

1. **Desconectar o mouse.** O roteiro inteiro é feito só com teclado. Mouse conectado
   convida a "só conferir uma coisinha" com o cursor e invalida o teste.
2. Em cada uma das 8 telas, percorrer todos os elementos focáveis com `Tab` e voltar com
   `Shift+Tab`. Registrar: a ordem de foco segue a ordem visual de leitura.
3. Confirmar que **nenhum** elemento interativo é alcançado sem indicador de foco visível.
   O anel é `coral-600` `#C83A16`, com 4,98:1 sobre o fundo da tela — acima do mínimo de
   3:1 exigido pela WCAG 1.4.11.
4. Acionar cada ação primária com `Enter` e cada alternância com `Espaço`. Nenhuma ação
   principal pode exigir clique.
5. Abrir a folha de inscrição (tela 5) e verificar: o foco entra na folha, fica preso
   dentro dela enquanto aberta, `Esc` fecha e o foco volta para o botão que a abriu.
6. Nos campos de `/criar` (tela 6), verificar que cada campo tem rótulo associado e que a
   mensagem de erro é anunciada e ligada ao campo (`aria-describedby`).
7. Verificar que **todo** controle apenas-ícone tem `aria-label` em português e descreve a
   ação, não o desenho: "Voltar", "Compartilhar evento", "Copiar código do ingresso" — nunca
   "seta", "ícone de link". O teste de componente de RNF-004 cobre a existência do rótulo;
   este passo cobre se o texto **significa** algo.
8. Verificar que ícone decorativo tem `aria-hidden="true"` e não entra na ordem de foco.
9. **Leitor de tela.** NVDA + Chrome no Windows e VoiceOver + Safari no iOS. Percorrer o
   fluxo de inscrição (telas 2 → 4 → 5) só de ouvido, sem olhar a tela. Critérios: o título
   da tela é anunciado ao navegar; o cartão do evento é anunciado com título, data e vagas;
   o resultado da inscrição é anunciado sem precisar procurar o foco (região `aria-live`).
10. Conferir contra a tabela de contraste de
    [`06-marca/identidade-visual.md`](06-marca/identidade-visual.md) que nenhuma combinação
    nova apareceu na tela. Cor nova sem linha na tabela é defeito de severidade **alto**.
11. Verificar em `/ingresso/CMP-3ESPX-0184` que o código do ingresso está disponível como
    texto (não só dentro da imagem do QR) — é o caminho para quem usa leitor de tela e para
    o fallback de código numérico (D-06).
12. Registrar o resultado em tabela de 8 linhas (uma por tela) com aprovado/reprovado por
    item, e anexar ao card do Trello. Cada reprovação abre issue com o template
    [`bug.md`](../.github/ISSUE_TEMPLATE/bug.md).

### 5.2 Roteiro de responsividade (RNF-018)

Executor: Vitor Pantarotto · Revisora: Ana Luiza Dourado.

1. Abrir o build de produção (`npm run build && npm run preview`), não o servidor de
   desenvolvimento — é o artefato que o avaliador vai ver.
2. Para cada largura da tabela abaixo, percorrer as 8 telas e registrar aprovado/reprovado.

| Largura | Aparelho de referência | Foco da verificação |
|---|---|---|
| 320 px | iPhone SE 1ª geração | Piso do requisito: nada cortado, nenhum botão fora da tela |
| 375 px | iPhone SE / 8 | Cartão de evento com título em duas linhas sem estourar |
| 390 px | iPhone 14 / referência do Figma | Layout canônico das 8 telas |
| 768 px | iPad retrato | Transição de 1 para 2 colunas no feed e na lista |
| 1024 px | iPad paisagem / notebook pequeno | Largura máxima de conteúdo respeitada, sem linha de texto longa demais |
| 1440 px | Desktop | Teto do requisito: conteúdo centralizado, sem faixa vazia gigante |

3. Critério objetivo de reprovação, em qualquer largura:
   `document.documentElement.scrollWidth > document.documentElement.clientWidth` — ou seja,
   **qualquer** rolagem horizontal na página.
4. Verificar também: nenhum alvo de toque menor que 44 × 44 px nas larguras de 320 a 390;
   nenhum texto abaixo de 12 px; nenhuma tabela ou bloco de código transbordando (o
   transbordo tem de ficar dentro do próprio container, com rolagem local).
5. Testar com o teclado virtual aberto em 320 px na folha de inscrição: o botão de confirmar
   continua alcançável.
6. Evidência: 6 capturas por tela reprovada (uma por largura) e a matriz 8 × 6 preenchida,
   anexadas ao card.

---

## 6. Critérios de aceite do CP5

O CP5 só é considerado entregue quando **todas** as linhas abaixo são verdadeiras. As
cinco primeiras vêm dos critérios de saída de [`03-escopo.md`](03-escopo.md); as demais são
o que este plano acrescenta para que "entregue" signifique "verificado".

| # | Critério | Teste que prova | Comando ou evidência |
|---|---|---|---|
| 1 | `lint`, `test` e `build` verdes no CI | Suíte completa | `npm run lint && npm run test && npm run build` |
| 2 | Cobertura de linhas ≥ 60% em `src/domain/` e `src/services/` | Limite configurado no Vitest | `npm run test:coverage` |
| 3 | E2E do fluxo de inscrição verde | `e2e/inscricao.spec.ts` | `npm run test:e2e` |
| 4 | Fluxo principal demonstrável ao vivo no link público | Roteiro de demo + E2E | GitHub Pages `/campus/` |
| 5 | Todo link relativo da documentação resolve | Validador de docs | `node scripts/validate-docs.mjs` |
| 6 | As 25 regras de negócio têm caso automatizado | CT-001 a CT-031 (menos os manuais listados em 1.3) | Matriz da seção 7 conferida contra a saída de `npm run test` |
| 7 | Nenhum caso P0 vermelho ou ignorado (`skip`, `todo`) | Grep na suíte | `rg -e "it\.skip" -e "it\.todo" app/src app/e2e` sem resultado em caso P0 |
| 8 | Reserva de vaga sem overbooking sob concorrência | CT-020 | `npm run test -- capacity` |
| 9 | Nenhum evento fora do alcance retornado pela fronteira de dados | CT-012 | `npm run test -- eventRepository` |
| 10 | Inscrição em no máximo 3 toques | Contador de cliques do E2E (RNF-001) | `npm run test:e2e` |
| 11 | Navegação por teclado aprovada nas 8 telas | Roteiro 5.1 | Matriz de 8 linhas anexada ao card |
| 12 | Nenhuma rolagem horizontal de 320 a 1440 px | Roteiro 5.2 | Matriz 8 × 6 anexada ao card |
| 13 | Nenhum controle apenas-ícone sem nome acessível | Caso de componente de RNF-004 | `npm run test -- a11y` |
| 14 | Diagramas coerentes com o código entregue | Revisão cruzada Ronaldo × Lucas Baraldi | Comentário de aprovação no PR |
| 15 | Validação com 5 alunos reais registrada | Roteiro de usabilidade (RNF-005) | Notas das 5 sessões e backlog gerado |
| 16 | Nenhum defeito de severidade bloqueador ou alto aberto | Painel de defeitos | Lista de issues com label `tipo: bug` |

---

## 7. Matriz de rastreabilidade

Uma linha por caso de teste. Se uma linha desta tabela não tiver correspondência na saída de
`npm run test`, o plano está desatualizado — e isso é defeito de processo, tratado na
retrospectiva.

| CT | RN | RF | RNF | Nível | Prioridade | Arquivo |
|---|---|---|---|---|---|---|
| CT-001 | RN-004 | RF-019, RF-020 | — | Unitário | P0 | `domain/capacity.test.ts` |
| CT-002 | RN-004 | RF-020 | — | Unitário | P0 | `domain/capacity.test.ts` |
| CT-003 | RN-006 | RF-024 | — | Unitário | P0 | `domain/waitlist.test.ts` |
| CT-004 | RN-007 | RF-025 | — | Unitário | P0 | `domain/waitlist.test.ts` |
| CT-005 | RN-007 | RF-025 | — | Unitário | P0 | `domain/waitlist.test.ts` |
| CT-006 | RN-008 | RF-026, RF-027 | — | Unitário | P0 | `domain/waitlist.test.ts` |
| CT-007 | RN-012 | RF-028, RF-030 | — | Unitário | P0 | `domain/payment.test.ts` |
| CT-008 | RN-013 | RF-031 | — | Unitário | P0 | `domain/refund.test.ts` |
| CT-009 | RN-013 | RF-031, RF-014 | — | Unitário | P0 | `domain/refund.test.ts` |
| CT-010 | RN-014 | RF-029 | RNF-014, RNF-022 | Unitário | P0 | `domain/payment.test.ts` |
| CT-011 | RN-001 | RF-011, RF-015, RF-016, RF-036 | RNF-012 | Unitário | P0 | `domain/visibility.test.ts` |
| CT-012 | RN-001 | RF-015, RF-016 | RNF-012 | Integração | P0 | `services/eventRepository.test.ts` |
| CT-013 | RN-002 | RF-011, RF-013 | — | Unitário | P1 | `domain/event.test.ts` |
| CT-014 | RN-003 | RF-041 | — | Unitário | P1 | `domain/event.test.ts` |
| CT-015 | RN-009 | RF-023 | — | Unitário | P1 | `domain/deadlines.test.ts` |
| CT-016 | RN-010 | RF-021, RF-031 | — | Unitário | P1 | `domain/deadlines.test.ts` |
| CT-017 | RN-011 | RF-010, RF-013 | — | Unitário | P1 | `domain/eventSchema.test.ts` |
| CT-018 | RN-015 | RF-022 | — | Unitário | P0 | `domain/participation.test.ts` |
| CT-019 | RN-016 | RF-010, RF-019 | — | Unitário | P1 | `domain/participation.test.ts` |
| CT-020 | RN-004 | RF-019, RF-020 | RNF-013 | Unitário | P0 | `domain/capacity.test.ts` |
| CT-021 | RN-005 | RF-013, RF-025 | — | Unitário | P1 | `domain/capacity.test.ts` |
| CT-022 | RN-017 | RF-033, RF-034 | RNF-011 | Unitário | P0 | `domain/checkin.test.ts` |
| CT-023 | RN-017 | RF-034 | RNF-011 | Unitário | P0 | `domain/checkin.test.ts` |
| CT-024 | RN-018 | RF-034, RF-035 | — | Unitário | P1 | `domain/checkin.test.ts` |
| CT-025 | RN-019 | RF-036, RF-037 | — | Unitário + componente | P1 | `domain/feed.test.ts`, `pages/Feed.test.tsx` |
| CT-026 | RN-020 | RF-042 | RNF-020, RNF-021 | Unitário | P2 | `domain/moderation.test.ts` |
| CT-027 | RN-021 | RF-014 | — | Unitário | P1 | `domain/event.test.ts` |
| CT-028 | RN-022 | RF-014 | — | Unitário | P0 | `domain/event.test.ts` |
| CT-029 | RN-023 | — | RNF-012 | Unitário | P0 | `domain/participation.test.ts`, `domain/event.test.ts` |
| CT-030 | RN-024 | RF-041, RF-042, RF-043 | RNF-012 | Unitário | P0 | `domain/permissions.test.ts` |
| CT-031 | RN-025 | RF-017 | — | Unitário + componente | P1 | `domain/customQuestions.test.ts`, `pages/EventDetail.test.tsx` |
| CT-032 | RN-002 | RF-002, RF-003 | RNF-021 | Unitário | P0 | `domain/auth.test.ts` |
| CT-033 | RN-003 | RF-004, RF-005 | — | Unitário | P0 | `domain/auth.test.ts` |
| CT-034 | RN-012, RN-014 | RF-027, RF-028 | — | Unitário | P1 | `domain/pix.test.ts` |
| CT-035 | RN-014 | RF-029 | RNF-022 | Unitário | P0 | `domain/pix.test.ts` |
| CT-036 | RN-017 | RF-033, RF-034 | RNF-020 | Unitário | P0 | `domain/ticketToken.test.ts` |
| CT-037 | RN-017, RN-018 | RF-033, RF-034 | RNF-011 | Unitário | P0 | `domain/ticketToken.test.ts` |

Cobertura das regras: **25 de 25** RN têm ao menos um CT. Nenhum CT existe sem RN — o
espaço `CT-0xx` é reservado a regra de negócio, e verificação de RNF vira caso de componente
ou passo de roteiro manual.

Numeração futura: novo caso começa em **CT-038**. IDs não são reciclados nem renumerados,
igual à regra de `02-requisitos.md`.

---

## 8. Gestão de defeitos

### 8.1 Severidade, com definição objetiva

Severidade é atribuída pelo QA na triagem, não por quem relata. O critério é o **efeito**,
não a dificuldade de corrigir.

| Severidade | Definição objetiva | Prazo de resposta (premissa do grupo) | Efeito na sprint |
|---|---|---|---|
| **Bloqueador** | Viola uma RN (overbooking, cobrança indevida, ingresso reutilizado, evento restrito visível para quem não é do alcance), **ou** impede o fluxo principal sem contorno (inscrever-se, pagar, fazer check-in), **ou** deixa `main`/CI/Pages vermelho | Correção começa no mesmo dia; nada novo entra em desenvolvimento antes | Sprint para, card vai para o topo |
| **Alto** | RF `Must` quebrado com contorno viável, **ou** RNF `Must` fora do limite (contraste abaixo de AA, ação inalcançável por teclado, cobertura abaixo de 60%, rolagem horizontal em alguma largura) | Correção na sprint corrente | Ocupa capacidade planejada; algo `Should` sai |
| **Médio** | RF `Should`/`Could` quebrado, estado vazio sem texto útil, mensagem de erro genérica, divergência entre diagrama e código sem impacto de comportamento | Priorizado na próxima planning | Vai para o backlog com estimativa |
| **Baixo** | Cosmético sem impacto funcional: espaçamento fora da escala, texto com erro de digitação, ícone trocado que não muda o significado da ação | Agrupado em card de acabamento | Entra se houver folga |

Dois casos que causam discussão, decididos aqui:

- **Erro de conteúdo em texto de regra** (por exemplo, a tela dizer "reembolso de 100% até
  48h") é **alto**, não baixo: o aluno decide com base nesse texto.
- **Divergência entre diagrama e código** é **médio** por padrão e **alto** quando o
  diagrama é o que o avaliador vai ler para entender a regra — CP4 e CP5 são avaliados pela
  modelagem, então divergência perto da entrega sobe de severidade.

### 8.2 Fluxo do defeito

```
1. Relato      issue no GitHub com o template bug.md, label "tipo: bug"
                  passos, esperado (citando RF/RN), observado, evidência, rota, ambiente
2. Triagem     QA (Vitor) atribui severidade e módulo em até 1 dia útil
                  sem reprodução -> pede evidência e marca "precisa-info"; não vira card
3. Card        card no Trello na lista da sprint corrente, com link da issue
                  bloqueador entra no topo; médio/baixo vão para o backlog
4. Teste       teste automatizado que reproduz o defeito e falha (vermelho)
                  obrigatório para todo defeito de regra de negócio
5. Correção    branch fix/<resultado-esperado>, PR com o template do repositório
                  o PR referencia a issue, o card e o ID do CT
6. Verificação QA roda o CT que falhava, a suíte completa e o roteiro manual afetado
7. Fechamento  issue fechada pelo merge; comentário no card com link do PR e do commit
                  o CT vira regressão permanente da suíte
```

O passo 4 não é negociável: **todo defeito de regra de negócio ganha teste automatizado que
falha antes da correção e passa depois.** Consequências práticas:

- Se o defeito cai em um CT que já existe, o CT ganha um `Cenário:` novo nesta página, e a
  matriz da seção 7 não muda.
- Se não cai em nenhum CT existente, o QA aloca um ID novo a partir de **CT-038**, escreve o
  Gherkin aqui e a implementação no mesmo PR da correção.
- PR de correção de RN sem teste vermelho-antes é reprovado na revisão, mesmo que a correção
  esteja certa. Sem o teste, nada impede o defeito de voltar na próxima refatoração — e
  defeito que volta custa a confiança na suíte.

### 8.3 Defeito encontrado pelo avaliador ou pelo usuário

Defeito que escapa da suíte e aparece na demo ou na validação com os 5 alunos entra no mesmo
fluxo, com dois passos extras na retrospectiva: **por que nenhum teste pegou** e **qual
nível da pirâmide deveria ter pegado**. A resposta vira card — de teste, não de código.
É a única métrica de qualidade que o grupo acompanha: quantos defeitos escaparam por
checkpoint, e em que nível estava o buraco.
