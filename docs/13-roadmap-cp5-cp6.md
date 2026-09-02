# Roadmap CP5 → CP6

**Responsável técnico:** Lucas Baraldi (Tech Lead / Arquiteto)
**Base de escopo:** [`03-escopo.md`](03-escopo.md) (marcos e critérios de saída) ·
**Requisitos e checkpoint de cada RF:** [`02-requisitos.md`](02-requisitos.md) ·
**Base técnica:** [`08-arquitetura.md`](08-arquitetura.md) e [`adr/README.md`](adr/README.md) ·
**Cards:** [`09-trello/quadro.md`](09-trello/quadro.md)

Este documento responde a uma pergunta só: **o que exatamente falta**, quem faz, quanto custa
e qual requisito cada tarefa fecha. Ele detalha as raias Sprint 2 e Sprint 3 do quadro do
Trello — reproduz os cards já comprometidos no CP4 e **acrescenta** os que o detalhamento
técnico revelou como faltantes.

### Como as estimativas são lidas

- Escala **Fibonacci: 1, 2, 3, 5, 8**. Tarefa maior que 8 é quebrada na planning, não
  arredondada para cima.
- Conversão de referência (**estimativa do grupo**): **1 ponto ≈ 2 horas-pessoa**.
- Capacidade (**premissa do grupo**, P-06 de [`03-escopo.md`](03-escopo.md)): 6 a 10
  horas-pessoa por semana, por integrante — ou seja, entre **3 e 5 pontos por pessoa por
  semana**.

| Sprint | Janela | Semanas | Capacidade (P-06) | Comprometido no quadro | Acrescentado aqui | Total planejado | Exige, por pessoa |
|---|---|---|---|---|---|---|---|
| Sprint 2 (CP5) | 08/09 – 03/10/2026 | 3,7 | **66 a 111 pts** | 81 | 19 | **100** | ~9,0 h/semana |
| Sprint 3 (CP6) | 06/10 – 07/11/2026 | 4,7 | **85 a 141 pts** | 58 | 56 | **114** | ~8,7 h/semana |

**Leitura honesta dessa tabela:** as duas sprints só fecham operando perto do **teto** da
capacidade declarada (9 de 10 horas por semana, por pessoa). Não há folga real. Isso é o
risco **R-02** de [`12-riscos.md`](12-riscos.md) (equipe com papéis acumulados, exposição
crítica) se manifestando como aritmética, e a resposta está na seção 1.3: existe uma lista
de cortes preparada, com o valor em pontos de cada um, para a planning decidir **antes** de
a sprint começar — não na véspera da entrega.

---

## 1. O que falta para o CP5

**Entrega 06/10/2026.** O CP5 entrega **21 RFs** com dados mockados: os **19 `Must`** e os
**2 `Should`** (RF-012 e RF-027) marcados com checkpoint 5 em
[`02-requisitos.md`](02-requisitos.md).

### 1.1 Critérios do checkpoint e quem os fecha

| Critério do CP5 ([`03-escopo.md`](03-escopo.md)) | Estado ao fim do CP4 | Fechado por |
|---|---|---|
| RFs `Must` de checkpoint 5 funcionando com dados mockados | Base técnica pronta (tokens, 7 rotas, MSW com o seed, domínio, testes); nenhum fluxo de tela implementado | S2-01 a S2-07, S2-14, S2-15, S2-16 |
| Ambiente de teste acessível por link (Pages, `/campus/`) | Pages publicado com a base do app; falta o app com os fluxos e o fallback de rota da SPA | S2-18 |
| Diagramas de sequência e atividade atualizados conforme o implementado | Os diagramas do CP4 descrevem o **planejado**, não o implementado | S2-17 |
| ≥ 8 testes unitários e 1 E2E do fluxo de inscrição | Suíte unitária do domínio iniciada; **o E2E do Playwright nunca foi executado** (seção 6.1) | S2-08, S2-09, S2-13 |
| Cobertura de domínio ≥ 60% com limite que falha o CI | Sem limite configurado | S2-08 |
| Validação com 5 alunos reais (RNF-005) | Não iniciada | S2-11 |
| Demonstração ao vivo do fluxo completo | Sem roteiro e sem ensaio | S2-12 |

### 1.2 Tarefas da Sprint 2

**Cards já comprometidos no quadro do CP4** (81 pontos):

| ID | Tarefa | Responsável | Pts | Requisito coberto |
|---|---|---|---|---|
| `S2-01` | Onboarding de vínculo acadêmico com validação de domínio institucional | Lucas Zolla (+Baraldi) | 5 | RF-002, RF-005; RN-001 |
| `S2-02` | Lista de eventos com filtros e detalhe com ocupação de vagas | Lucas Baraldi | 8 | RF-015, RF-016; RNF-006 |
| `S2-03` | Criação de evento com seletor de alcance, prazos e rascunho | Lucas Baraldi | 8 | RF-010, RF-011, RF-012; RN-002, RN-011 |
| `S2-04` | Reserva de vaga sem estouro de capacidade e sem duplicidade | Ronaldo Veloso Filho | 8 | RF-019, RF-020, RF-022; RN-004, RN-015 |
| `S2-05` | Cancelamento e lista de espera FIFO com oferta de 24h | Ronaldo Veloso Filho | 8 | RF-021, RF-023, RF-024, RF-025; RN-006, RN-007, RN-008, RN-010 |
| `S2-06` | Feed segmentado por alcance | Ana Luiza Dourado | 8 | RF-036; RN-019 |
| `S2-07` | Cartão-ingresso com QR Code e código de validação | Ana Luiza Dourado | 5 | RF-033; RNF-011 |
| `S2-08` | 8 testes unitários do domínio de vagas e gate de cobertura no CI | Vitor Pantarotto | 8 | RNF-015; CT-001 a CT-006 |
| `S2-09` | E2E de inscrição em evento lotado com entrada na fila | Vitor Pantarotto | 5 | RNF-001, RNF-015; CT-003, CT-004 |
| `S2-10` | Revisão de aceite dos RFs `Must` e especificação de erros e estados vazios | Lucas Zolla | 8 | RFs `Must` de checkpoint 5; RNF-005 |
| `S2-11` | Teste de usabilidade com 5 alunos medindo os 90 segundos | João Viviani Baldini | 5 | RNF-001, RNF-005 |
| `S2-12` | Roteiro da demo do CP5 e refino do backlog do CP6 | João Viviani Baldini | 5 | Critério de saída 7 |

**Cards que este roadmap acrescenta** (19 pontos) — cada um cobre um requisito de checkpoint
5 ou um critério de saída que o quadro do CP4 não endereça:

| ID | Tarefa | Responsável | Pts | Requisito coberto | Por que faltava |
|---|---|---|---|---|---|
| `S2-13` | Baixar os navegadores do Playwright e **executar** o E2E pela primeira vez; deixar o job de E2E no CI | Vitor Pantarotto | 2 | Critério de saída 8 | Pré-requisito de `S2-09`: hoje o E2E está escrito e nunca rodou (seção 6.1) |
| `S2-14` | Telas de cadastro, login e sessão (`/login`), com estados de erro reais | Lucas Zolla (+Baraldi) | 5 | RF-001, RF-003 | `S2-01` cobre RF-002 e RF-005; RF-001 e RF-003 são `Must` de checkpoint 5 e não tinham card |
| `S2-15` | Perfil com abas "Participando", "Criados" e "Anteriores", e edição de nome/foto | Ana Luiza Dourado | 3 | RF-006, RF-007 | Ambos `Must` de checkpoint 5, sem card no quadro |
| `S2-16` | Sair da lista de espera com reordenação da fila | Ronaldo Veloso Filho | 1 | RF-027 (`Should`) | Completa o ciclo da fila que `S2-05` abre |
| `S2-17` | Atualizar os diagramas de sequência e de atividade conforme o implementado | Ronaldo Veloso Filho | 3 | Critério de saída 4 | Divergência entre diagrama e código é defeito (risco **R-06**), e não havia card com data |
| `S2-18` | Deploy do build no Pages com fallback de rota (`404.html` = `index.html`) e verificação de fumaça na URL publicada | Lucas Baraldi | 2 | Critério de saída 6 | Sem o fallback, compartilhar link de evento — o comportamento central do produto — quebra em produção |
| `S2-19` | Auditoria de acessibilidade e responsividade: 320/375/390/768/1024/1440px nas 8 telas | Vitor Pantarotto | 3 | RNF-002, RNF-003, RNF-004, RNF-018 | Quatro RNFs `Must` sem verificação alocada |
| | **Total da Sprint 2** | | **100** | | |

### 1.3 O déficit de capacidade e os cortes preparados

100 pontos exigem ~9 h/semana por pessoa, e a carga fica desigual: Ronaldo com 20 pontos,
Baraldi e Zolla com 18, Vitor com 18, Ana com 16, João com 10. Duas providências, ambas para
a planning de 08/09:

**Rebalanceamento sem corte:** João tem ~8 pontos de folga e é quem faz o aceite de qualquer
forma. Mover a metade de aceite de `S2-10` para ele (Zolla mantém a especificação de erros e
estados vazios) equaliza Zolla e João em ~14 pontos, sem alterar escopo.

**Cortes disponíveis, com o valor de cada um** — a decisão é do PO, conforme o item 3 da
seção 10 de [`03-escopo.md`](03-escopo.md):

| Corte | Pontos liberados | Consequência |
|---|---|---|
| Retirar RF-012 (salvar rascunho, `Should`) de `S2-03` | −3 | `evt-011` deixa de existir como rascunho na demo |
| Não puxar `S2-16` (RF-027, `Should`) para a sprint | −1 | Sair da fila só no CP6; entrar e ser promovido continuam no CP5 |
| Reduzir `S2-10` ao aceite, movendo o texto de erro e estado vazio das 8 telas para a Sprint 3 | −3 | Telas do CP5 com texto provisório de erro — aceitável, porque o texto definitivo depende dos achados de `S2-11` |
| Adiar `S2-19` para a primeira semana da Sprint 3 | −3 | **Não recomendado**: RNF-002, RNF-003, RNF-004 e RNF-018 são `Must`, e achado de acessibilidade tardio custa retrabalho de UI |
| **Corte recomendado (os três primeiros)** | **−7** | Sprint fecha em **93 pontos** ≈ 8,4 h/semana por pessoa |

### 1.4 O que fica deliberadamente fora do CP5

Não é esquecimento; é o checkpoint declarado de cada RF em
[`02-requisitos.md`](02-requisitos.md):

| Fora do CP5 | Requisitos | Por quê |
|---|---|---|
| Persistência real, API, banco | — | Restrição declarada: sem backend no CP5 ([ADR-0003](adr/0003-camada-de-repositorio-com-msw.md)) |
| Telas de pagamento e reembolso | RF-028 a RF-032 | Módulo F é checkpoint 6. O simulador de gateway existe desde o CP5 apenas para sustentar o seed pago e as regras de prazo ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)) |
| Validação de check-in por leitura de QR | RF-034, RF-035 | O ingresso (RF-033) é CP5; a leitura na porta é CP6 |
| Publicar foto e comentar | RF-037, RF-038 | Dependem de object storage; no CP5 as imagens são geradas localmente em SVG |
| Notificações | RF-039, RF-040 | Dependem de serviço externo |
| Editar e cancelar evento | RF-013, RF-014 | Checkpoint 6 |
| Administração e moderação | RF-041 a RF-043 | Checkpoint 6 |
| Teste de concorrência (RNF-013) | — | O banco em memória serializa escrita: no CP5 dá para provar a **regra**, nunca a **atomicidade** (seção 6.3) |

---

## 2. O que falta para o CP6

**Entrega 10/11/2026.** O CP6 entrega os **22 RFs** restantes — 9 `Must`, 9 `Should` e 4
`Could` — com persistência real, build instalável, manual de uso e registro da jornada.

### 2.1 Critérios do checkpoint e quem os fecha

| Critério do CP6 | Fechado por |
|---|---|
| API real com persistência substituindo o mock (RNF-016) | S3-01, S3-09, S3-10, S3-17 |
| Pagamento em sandbox com notificação idempotente | S3-03 |
| Check-in por QR com token assinado e uso único | S3-04 |
| Notificações e central de notificações | S3-05 |
| Moderação e aprovação de evento de faculdade | S3-06 |
| Build instalável (PWA) e manual de uso | S3-02, S3-07 |
| Registro da jornada do projeto | S3-08 |

### 2.2 Tarefas da Sprint 3

**Cards já comprometidos no quadro do CP4** (58 pontos):

| ID | Tarefa | Responsável | Pts | Requisito coberto |
|---|---|---|---|---|
| `S3-01` | Substituir os mocks pela API real sem alterar nenhuma tela | Lucas Baraldi | 8 | RNF-008, RNF-009, RNF-016 |
| `S3-02` | Publicar o app como PWA instalável com manifest, ícones e cache do feed | Lucas Baraldi | 5 | RNF-006, RNF-007, RNF-019; substitui RFX-05 |
| `S3-03` | Integrar Pix e cartão em sandbox, com notificação idempotente e reembolso | Ronaldo Veloso Filho | 8 | RF-028 a RF-031; RN-012, RN-013, RN-014; RNF-014, RNF-022 |
| `S3-04` | Check-in por leitura de QR e lista de presença | Ana Luiza Dourado | 8 | RF-034, RF-035; RN-017, RN-018; RNF-011 |
| `S3-05` | Os 8 tipos de notificação e a central de notificações | Ana Luiza Dourado | 5 | RF-039, RF-040 |
| `S3-06` | Matriz de permissões, aprovação de evento de faculdade e moderação | Lucas Zolla | 8 | RF-041, RF-042; RN-003, RN-020, RN-023, RN-024; RNF-012 |
| `S3-07` | Manual de uso e aceite dos RFs `Must` do CP6 | João Viviani Baldini | 8 | Critério de saída 10 |
| `S3-08` | Bateria CT-001 a CT-031 executada e métricas das 3 sprints fechadas | Vitor Pantarotto | 8 | CT-001 a CT-031; RNF-015 |

**Cards que este roadmap acrescenta** (56 pontos):

| ID | Tarefa | Responsável | Pts | Requisito coberto | Por que faltava |
|---|---|---|---|---|---|
| `S3-09` | Esquema PostgreSQL 16 e migração versionada: enums nativos, `ck_evento_ancora_coerente`, `ux_participacao_ativa`, `UNIQUE` de `presenca` e de `chave_idempotencia`, índices parciais por alcance | Ronaldo Veloso Filho (+Baraldi) | 8 | [ADR-0004](adr/0004-participacao-como-entidade-propria.md), [ADR-0005](adr/0005-alcance-como-enum-com-ancora-condicional.md); RN-015, RN-018 | `S3-01` pressupõe o banco pronto; sem card de esquema, a invariante que sustenta 4 regras não tem dono nem data |
| `S3-10` | API REST base em Fastify: contrato da §5 de [`08-arquitetura.md`](08-arquitetura.md), formato único de erro, `requestId` propagado, OpenAPI a partir dos handlers do MSW | Lucas Baraldi | 8 | Contrato de API; RNF-009 | Idem: `S3-01` é a troca do cliente, não a construção do servidor |
| `S3-11` | Autenticação real: Argon2id, verificação de domínio, JWT de acesso curto, refresh rotativo em cookie e recuperação de acesso | Lucas Zolla (+Baraldi) | 8 | RF-001 a RF-004; RNF-009, RNF-010 | RNF-010 e RF-004 (`Should`, checkpoint 6) não tinham card |
| `S3-12` | Rotinas de tempo agendadas com *heartbeat*, contadores e os dois alarmes da §9 de [`08-arquitetura.md`](08-arquitetura.md) | Lucas Zolla | 5 | RF-026, RF-030; RN-008, RN-012 | Três transições sem ator humano; se param, a fila congela **em silêncio** |
| `S3-13` | Editar evento publicado e cancelar evento com cascata irreversível | Ana Luiza Dourado | 5 | RF-013, RF-014; RN-021, RN-022; CT-027 | Dois `Must` de checkpoint 6 sem card |
| `S3-14` | Trocar de turma, preferências de privacidade e controle do titular (exportar dados, excluir conta) | João Viviani Baldini | 5 | RF-008, RF-009; RNF-020, RNF-021 | Obrigação de LGPD (risco **R-08**) sem tarefa alocada |
| `S3-15` | Painel de recebimentos do evento | João Viviani Baldini | 3 | RF-032 (`Should`) | Fecha o módulo F junto com `S3-03` |
| `S3-16` | Deploy do CP6: app e API sob o **mesmo domínio** (exigência da estratégia de cookie), migração no pipeline, segredos por variável de ambiente | Vitor Pantarotto | 5 | §6 e §10 de [`08-arquitetura.md`](08-arquitetura.md) | Restrição de arquitetura que precisa entrar na escolha da hospedagem, não ser descoberta depois |
| `S3-17` | Guarda de CI que reprova alteração em `pages/` e `components/` no PR de integração; remoção do bootstrap do MSW em `main.tsx`; verificação de que o bundle de produção não contém `msw` | Vitor Pantarotto | 3 | RNF-016 | É a prova objetiva do RNF-016, e depende de configuração de CI, não de boa vontade |
| `S3-18` | Medição sob carga: concorrência de 50 requisições para 1 vaga e p95 de leitura e escrita | Vitor Pantarotto | 3 | RNF-006, RNF-008, RNF-013; CT-020 | `S3-08` executa a bateria funcional; carga e concorrência exigem instrumentação própria (risco **R-07**) |
| `S3-19` | Atualizar diagramas, dicionário de dados e requisitos conforme o implementado | Ronaldo Veloso Filho | 3 | Critério de saída 4 | Mesma razão de `S2-17`, agora com o modelo de dados real |
| | **Total da Sprint 3** | | **114** | | |

Carga resultante: Baraldi 21 · Zolla 21 · Ronaldo 19 · Vitor 19 · Ana 18 · João 16. Nenhum
acima do teto individual de ~23 pontos, mas todos acima de 16 — sprint sem folga, com o
mesmo tratamento de risco da seção 1.3.

### 2.3 Fora do plano comprometido do CP6

Requisitos `Could` de [`02-requisitos.md`](02-requisitos.md), que só entram se a Sprint 3
abrir capacidade, e nessa ordem:

| Requisito | Tarefa | Pts |
|---|---|---|
| RF-017 — perguntas customizadas no evento | Formulário de até 5 perguntas + respostas na inscrição (RN-025, CT-031) | 5 |
| RF-043 — gerenciar turmas do curso | CRUD de turma e código de convite para `ADMIN_CURSO` | 3 |
| RF-038 — comentar publicação | Comentário no feed com moderação (RN-020) | 3 |
| RF-018 — duplicar evento | Cópia de evento como rascunho | 2 |

O contrato de API em [`08-arquitetura.md`](08-arquitetura.md) já prevê as rotas desses quatro
requisitos — **especificar não é comprometer**, e a distinção está registrada aqui para que
ninguém leia o contrato como promessa de entrega.

### 2.4 Ordem obrigatória dentro da Sprint 3

Quatro dependências que não admitem paralelismo:

1. `S3-09` e `S3-10` antes de tudo o que escreve no banco (`S3-03`, `S3-04`, `S3-06`,
   `S3-11`, `S3-12`, `S3-13`). Esquema e contrato são pré-requisito, não tarefa concorrente.
2. `S3-10` antes de `S3-06`: sem formato único de erro e `requestId`, a bateria de
   autorização por ator não tem o que asserir.
3. `S3-03` depende de **D-02** (sandbox com Pix). Se a dependência não se confirmar, o plano
   B já está implementado — o simulador continua atrás da mesma interface — e o card cai de
   8 para 3 pontos, restando apenas a verificação de assinatura.
4. `S3-17` e `S3-18` **por último**: são as tarefas que provam RNF-016 e RNF-013, e só fazem
   sentido com a API completa. Exceção: o *teste* de concorrência é escrito durante `S3-03` e
   `S3-09`, não no fim — escrever o teste no fim é o que transforma o risco R-07 em
   retrabalho de véspera.

---

## 3. Ponte com o Trello

Cada linha das tabelas das seções 1.2 e 2.2 é **um card** em
[`09-trello/quadro.md`](09-trello/quadro.md), na raia da sprint correspondente, com o mesmo
ID: prefixo `S2-` para a Sprint 2 (CP5) e `S3-` para a Sprint 3 (CP6).

| | Cards no quadro do CP4 | Acrescentados aqui | Total |
|---|---|---|---|
| Sprint 1 (CP4, `Done`) | 12 | — | 12 |
| Sprint 2 (CP5) | 12 (`S2-01`…`S2-12`) | 7 (`S2-13`…`S2-19`) | 19 |
| Sprint 3 (CP6) | 8 (`S3-01`…`S3-08`) | 11 (`S3-09`…`S3-19`) | 19 |
| **Total** | **32** | **18** | **50** |

Os 18 cards novos entram no `Backlog` e são puxados na planning da respectiva sprint. A
atualização de [`09-trello/quadro.md`](09-trello/quadro.md) — contagem, distribuição pelas
listas e carga por integrante — é do Scrum Master, no mesmo PR que incorporar estas tabelas.

Estrutura mínima de cada card, alinhada ao DoR/DoD de
[`../CONTRIBUTING.md`](../CONTRIBUTING.md):

| Campo do card | Conteúdo |
|---|---|
| Título | `S2-14 — Telas de cadastro, login e sessão` |
| Responsável | Um nome como primeiro membro. Onde há `(+Nome)`, o segundo é apoio e revisor |
| Estimativa | O ponto Fibonacci desta tabela, como etiqueta |
| Etiquetas | Módulo (A a J), requisito (`RF-001`…), regra (`RN-004`…), tipo (`feature` / `teste` / `docs` / `infra` / `chore`) |
| Critério de aceite | Copiado do critério do requisito em [`02-requisitos.md`](02-requisitos.md) — não reescrito |
| Caso de teste | O `CT-0xx` correspondente, quando existe |

Regras de fluxo já valendo:

- **O quadro é a fonte de verdade do estado**; este roadmap é a fonte de verdade do escopo.
  Divergência entre os dois é resolvida na daily, e o critério de saída 5 de
  [`03-escopo.md`](03-escopo.md) exige o quadro refletindo o estado real (risco **R-10**).
- Tarefa que aparecer durante a sprint entra no `Backlog`, nunca direto na raia da sprint. Se
  for `Must`, algo de tamanho equivalente sai (risco **R-01**).
- Card sem requisito nem regra associada é sinal de escopo não rastreado — o PO recusa.

---

## 4. Riscos do roadmap

O registro completo, com probabilidade, impacto, resposta e responsável, está em
[`12-riscos.md`](12-riscos.md). Aqui ficam apenas os riscos que mudam **a ordem ou o
conteúdo destas duas sprints**:

| Risco | Sinal antecipado | Efeito no roadmap | Resposta neste plano |
|---|---|---|---|
| **R-02** — 6 pessoas com papéis acumulados (exposição crítica) | Duas sprints planejadas a ~9 h/semana por pessoa, contra teto declarado de 10 | Qualquer imprevisto consome a sprint inteira | Lista de cortes com valor em pontos pronta antes da planning (§1.3); rebalanceamento de `S2-10` |
| **R-03** — integrante indisponível na reta final | Card sem movimento por uma semana | Capacidade cai ~17 pontos na Sprint 2 e ~19 na Sprint 3 | Cortar `Should` primeiro; segundo revisor definido por área em [`10-equipe-e-papeis.md`](10-equipe-e-papeis.md) |
| **R-04** — gateway sem sandbox gratuito (D-02) | Cadastro recusado ou provedor sem Pix em teste | `S3-03` cai de 8 para 3 pontos; o CP6 entrega o fluxo pago **simulado**, com a interface inalterada | Plano B implementado desde a Sprint 2 ([ADR-0006](adr/0006-abstracao-de-gateway-de-pagamento.md)); corte de decisão em 20/10/2026 (§5) |
| **R-05** — Pages ou CI quebra na véspera | Falha de job em `main` | Perde o critério de saída 6 na entrega | `S2-18` inclui verificação de fumaça na URL publicada, não só build local |
| **R-06** — diagrama e código divergem | PR de tela sem PR de diagrama associado | Reprova o critério de saída 4 na véspera | `S2-17` e `S3-19` são cards com responsável e data, não sobra de tempo |
| **R-07** — bug de concorrência (overbooking) | Overbooking em `S3-18` | Reabre `S3-03` e `S3-09` na semana final | O teste de concorrência é escrito **durante** `S3-09`, não no fim (§2.4, item 4) |
| **R-08** — coleta de dado pessoal além do necessário | Campo novo em formulário sem justificativa no PR | RNF-020 e RNF-021 reprovados | `S3-14` aloca exportação e exclusão de conta, que antes não tinham dono |
| **R-12** — CP5 fecha sem validação com usuário real | `S2-11` empurrado para a última semana | Perde RNF-005 e o insumo do backlog do CP6 | `S2-11` tem data-limite antes do congelamento de escopo (29/09), não na véspera |
| **R-14** — cadeia serial requisito → UML → UI → código | Fila de espera no `Code Review` | O último elo (código) absorve todo o atraso acumulado | Limite de 3 cards em `Code Review` e 4 em `Doing`, conforme o quadro |
| **R-16** — gate de validação da documentação não existe | Link quebrado ou Mermaid inválido passando no CI | Reprova os critérios de saída 2 e 3 | Materializado e em tratamento; é pré-requisito da entrega do CP4, não tarefa de Sprint 2 |

---

## 5. Marcos e datas

| Marco | Data | Responsável |
|---|---|---|
| Fim da Sprint 1 (CP4) | 05/09/2026 | Todos |
| **Entrega do CP4** | **08/09/2026** | Lucas Baraldi (repo e app), Lucas Zolla (documentação), Ronaldo Veloso Filho (UML), Ana Luiza Dourado (marca), João Viviani Baldini (pitch e vídeo), Vitor Pantarotto (Trello e testes) |
| Planning da Sprint 2, com a decisão de corte da §1.3 | 08/09/2026 | Vitor Pantarotto e João Viviani Baldini |
| E2E executado pela primeira vez (`S2-13`) | até 11/09/2026 | Vitor Pantarotto |
| Revisão de meia-sprint | 22/09/2026 | Vitor Pantarotto |
| Teste de usabilidade concluído (`S2-11`) | até 26/09/2026 | João Viviani Baldini |
| Congelamento de escopo da Sprint 2 | 29/09/2026 | João Viviani Baldini |
| Fim da Sprint 2 | 03/10/2026 | Todos |
| Ensaio da demo do CP5 | 05/10/2026 | João Viviani Baldini |
| **Entrega do CP5** | **06/10/2026** | Todos |
| Planning da Sprint 3 | 06/10/2026 | Vitor Pantarotto |
| Esquema e API base prontos (`S3-09`, `S3-10`) | até 16/10/2026 | Ronaldo Veloso Filho e Lucas Baraldi |
| **Corte de decisão do gateway (D-02)** | **20/10/2026** | Lucas Baraldi e João Viviani Baldini |
| Congelamento de escopo da Sprint 3 | 31/10/2026 | João Viviani Baldini |
| Fim da Sprint 3 | 07/11/2026 | Todos |
| **Entrega do CP6** | **10/11/2026** | Todos |

O **corte de decisão do gateway em 20/10** existe para que a resposta ao risco R-04 não seja
tomada na última semana: se até essa data o sandbox não estiver funcionando, `S3-03` segue
com o simulador, e ponto.

---

## 6. Pendências técnicas conhecidas do CP4

Registradas para não serem descobertas na Sprint 2 como surpresa.

### 6.1 O E2E do Playwright nunca foi executado

`@playwright/test` está nas dependências de desenvolvimento e o script `npm run test:e2e`
existe em `app/package.json`, mas **os navegadores do Playwright não foram baixados nesta
máquina** (`npx playwright install`). Consequência, sem eufemismo: **o teste E2E está escrito
e configurado, e não foi executado nenhuma vez.** Ele pode estar quebrado, e não temos como
afirmar o contrário.

Isso importa porque o E2E do fluxo de inscrição é o **critério de saída 8** do CP5 — não é
teste extra.

- É a **primeira tarefa da Sprint 2** (`S2-13`), com data-limite 11/09/2026, e pré-requisito
  de `S2-09`.
- Envolve baixar os navegadores (download grande, uma vez por máquina), rodar a suíte,
  corrigir o que aparecer e **adicionar o job de E2E ao CI**, para que a execução deixe de
  depender da máquina de alguém.
- Enquanto `S2-13` não fechar, nenhuma afirmação sobre cobertura E2E é válida — inclusive
  neste documento.

### 6.2 A exportação SVG dos diagramas depende de `npx`

O script `scripts/render-diagrams.mjs` extrai, valida e exporta todo bloco Mermaid da
documentação para `docs/05-modelagem/exports/`. O renderizador é o `@mermaid-js/mermaid-cli`,
**invocado por `npx` e deliberadamente ausente das dependências de `app/`** — ele arrasta o
Chromium do Puppeteer e pesaria no CI.

Consequências assumidas:

- Gerar os SVGs exige rede na primeira execução (o `npx` baixa o pacote) e não funciona em
  ambiente isolado. Quem já tiver o binário instalado aponta `MMDC_BIN` para ele.
- Os SVGs de `docs/05-modelagem/exports/` são **artefatos versionados**: editar um diagrama
  sem rodar `npm run diagrams` deixa o SVG defasado em relação ao Markdown, e **não há
  verificação automática que pegue isso hoje**.
- A **validação** de sintaxe (`--check`) é o que entra no CI; a **exportação** permanece
  manual, executada por quem altera diagrama. Está incluída no escopo de `S2-17` e `S3-19`.

### 6.3 O contrato de API e as rotas do mock divergem em três nomes

O MSW já implementa 12 rotas, e três delas têm nome diferente do contrato da §5 de
[`08-arquitetura.md`](08-arquitetura.md): `GET /sessao` (deveria ser `POST /auth/sessao` mais
`GET /me`), `GET /participacoes` (deveria ser `GET /me/participacoes`) e
`POST /notificacoes/:id/lida` (deveria ser `PATCH /notificacoes/{id}`). A tabela comparativa
está na §5.11 daquele documento.

A reconciliação é barata agora — uma linha por rota no handler e no repositório HTTP — e cara
no CP6, quando a API real já estiver escrita contra um dos dois nomes. Entra no escopo de
`S2-14`, que já mexe em autenticação e sessão.

### 6.4 O que o CP5 não vai conseguir provar

Registrado para que nenhuma afirmação otimista apareça na demo ou no relatório:

| Não provável no CP5 | Por quê | Onde é provado |
|---|---|---|
| Atomicidade da reserva de vaga (RNF-013) | O banco em memória serializa escrita em uma única *thread*; o CP5 prova a **regra**, não a **corrida** | `S3-18` (CT-020) |
| Latência real de escrita (RNF-008, p95 < 1,5 s) | Sem servidor, o alvo aplicável é o mockado (< 300 ms) | `S3-18` |
| Idempotência contra um gateway de verdade (RNF-014) | A notificação é gerada pelo nosso próprio simulador | `S3-03` |
| Hash Argon2id (RNF-010) | Não há armazenamento de senha no CP5 | `S3-11` |
| Autorização de alcance no servidor (RNF-012) | No CP5 quem "autoriza" é o MSW, que roda na máquina do usuário — **isto não é segurança** | `S3-06` |
| Transporte cifrado ponta a ponta (RNF-009) | O Pages serve HTTPS, mas não há API para autenticar contra | `S3-16` |
