# ADR-0005 — Alcance como enum com âncora condicional e `CHECK` de exclusividade

- **Status:** Aceita
- **Data:** 2026-08-27
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), Ronaldo Veloso Filho (Modelagem / Analista UML), Lucas Zolla (Analista de Requisitos)
- **Requisitos afetados:** RN-001, RN-002, RN-003 · RF-011, RF-015, RF-016, RF-036, RF-041 · RNF-006, RNF-012

## Contexto

O **alcance segmentado** é a razão de existir do produto. A declaração de problema do
Campus começa com "alcance errado nas duas direções": o churrasco da turma 3ESPX vazando
para 500 pessoas, e a Feira de Carreiras não chegando a quem interessa. Se o alcance falhar,
o produto não tem tese.

O alcance tem exatamente **três níveis**, fixados pela estrutura acadêmica e não por
configuração de produto: `TURMA`, `CURSO`, `FACULDADE` (`AlcanceEvento`). Cada nível aponta
para uma âncora concreta na hierarquia `Faculdade → Curso → Turma`, que também já é o vínculo
do usuário.

Restrições que a decisão precisa respeitar:

- **RN-001** — o alcance define a visibilidade. Um evento de turma **não existe** para quem
  não é da turma.
- **RN-002** — o alcance **não aumenta** depois de publicado (só é permitido restringir).
  Isso precisa ser checável numa comparação simples, não em travessia de grafo.
- **RNF-012** — a autorização de alcance é verificada **no servidor**. Aluno de outra turma
  recebe `403` ou lista vazia, **inclusive por ID direto**. A regra não é filtro de UI.
- **RNF-006** — o feed tem alvo de **p95 < 2s em 4G**. A consulta mais frequente do sistema
  inteiro é "eventos publicados visíveis para este usuário, ordenados por data" — ela roda a
  cada abertura do app.
- **RN-003** — evento de alcance `FACULDADE` exige aprovação (RF-041), o que faz do alcance
  um dado que também governa fluxo de estado, não só visibilidade.

O SGBD alvo é **PostgreSQL 16**, escolhido em
[`../05-modelagem/03-modelo-dados-er.md`](../05-modelagem/03-modelo-dados-er.md) justamente
por restrições `CHECK` compostas, enums nativos e índices parciais.

## Decisão

**`Evento.alcance` é um enum de três valores, acompanhado de três chaves estrangeiras
opcionais — `turma_id`, `curso_id`, `faculdade_id` — cuja exclusividade mútua é garantida por
uma restrição `CHECK` composta no banco.**

```sql
CONSTRAINT ck_evento_ancora_coerente CHECK (
  (alcance = 'TURMA'      AND turma_id IS NOT NULL AND curso_id IS NULL     AND faculdade_id IS NULL) OR
  (alcance = 'CURSO'      AND turma_id IS NULL     AND curso_id IS NOT NULL AND faculdade_id IS NULL) OR
  (alcance = 'FACULDADE'  AND turma_id IS NULL     AND curso_id IS NULL     AND faculdade_id IS NOT NULL)
)
```

Três consequências deliberadas:

1. **Integridade referencial preservada.** Cada âncora é uma FK de verdade, com
   `ON DELETE RESTRICT` — apagar uma turma que ancora eventos é impedido pelo banco, porque
   isso deixaria o alcance indefinido.

2. **A consulta do feed tem índice dedicado por nível**, e é isso que sustenta RNF-006:

```sql
CREATE INDEX ix_evento_turma_inicio     ON evento (turma_id, inicio)     WHERE status = 'PUBLICADO';
CREATE INDEX ix_evento_curso_inicio     ON evento (curso_id, inicio)     WHERE status = 'PUBLICADO';
CREATE INDEX ix_evento_faculdade_inicio ON evento (faculdade_id, inicio) WHERE status = 'PUBLICADO';
```

3. **No TypeScript, o alcance é uma união discriminada** por `alcance`, de modo que o
   compilador obriga a tratar os três casos e proíbe o estado ilegal em tempo de compilação —
   o espelho do `CHECK`:

```ts
export type EscopoEvento =
  | { readonly alcance: 'TURMA';     readonly turmaId: string }
  | { readonly alcance: 'CURSO';     readonly cursoId: string }
  | { readonly alcance: 'FACULDADE'; readonly faculdadeId: string };
```

RN-002 fica sendo uma comparação de ordinal (`TURMA < CURSO < FACULDADE`) mais a checagem de
que a âncora não mudou — uma função pura em `src/domain/visibility.ts`, testável sem banco.

## Alternativas consideradas

### A. Hierarquia polimórfica de escopo (`Escopo` abstrato + `EscopoTurma` / `EscopoCurso` / `EscopoFaculdade`)

Modelo OO clássico: `Evento` tem um `escopo_id` que aponta para uma tabela `escopo`, com
subtipos por tabela (*table-per-type*), e `Escopo.contem(usuario)` polimórfico.

| | |
|---|---|
| **Prós** | Elimina colunas nulas; extensível para escopos que não existem hoje (atlética, campus, laboratório, entidade estudantil) sem `ALTER TABLE` em `evento`; a regra "este usuário está no escopo?" fica encapsulada em um método por subtipo, o que é elegante no diagrama de classes |
| **Contras** | (1) A consulta do feed — a mais quente do sistema — passa a exigir join com `escopo` e, dentro dele, resolução do subtipo: o índice `(turma_id, inicio) WHERE status='PUBLICADO'` deixa de existir, e o plano de execução do filtro "minha turma, ordenado por data" degrada exatamente onde RNF-006 aperta. (2) A integridade sai do banco: nada impede um `EscopoTurma` apontando para turma inexistente sem FK própria por subtipo, e o `CHECK` de coerência vira responsabilidade da aplicação. (3) RN-002 (alcance não aumenta) deixa de ser comparação de ordinal e passa a exigir travessia da hierarquia para descobrir qual escopo "contém" qual. (4) O benefício central — extensibilidade — resolve um problema que **não existe**: o alcance tem três valores porque a estrutura acadêmica tem três níveis, e P-05 de [`../03-escopo.md`](../03-escopo.md) fixa "uma faculdade, 3 cursos, 4 turmas" como amostra suficiente |
| **Motivo objetivo da recusa** | Custa desempenho e integridade declarativa para comprar flexibilidade que nenhum requisito pede. Um quarto nível de alcance seria escopo novo de produto, não ajuste de modelo |

### B. Coluna única `escopo_id` sem tipo (uuid genérico + enum dizendo a que tabela se refere)

| | |
|---|---|
| **Prós** | Uma coluna em vez de três; nenhum nulo; nenhum `CHECK` composto para manter; "adicionar um nível novo" é só um valor novo no enum |
| **Contras** | **Impossível declarar chave estrangeira** — o banco não sabe para qual tabela o uuid aponta. Consequências em cadeia: (1) integridade referencial vira responsabilidade da aplicação, e um `escopo_id` órfão se manifesta em produção como "evento invisível para todo mundo", que é o pior modo de falha possível num produto cuja tese é o alcance; (2) `ON DELETE RESTRICT` deixa de proteger a âncora; (3) todo join exige `CASE` ou três `LEFT JOIN` condicionais, com o mesmo custo de plano da alternativa A; (4) o dicionário de dados perde a capacidade de dizer o que a coluna referencia — a documentação passa a depender de prosa |
| **Motivo objetivo da recusa** | Perder chave estrangeira para economizar duas colunas nulas é uma troca ruim. O custo aparece como corrupção silenciosa; a economia é de armazenamento irrelevante |

### C. Três tabelas de evento (`evento_turma`, `evento_curso`, `evento_faculdade`)

| | |
|---|---|
| **Prós** | Cada tabela com FK própria, obrigatória e sem nulo; separação física por nível de alcance |
| **Contras** | O feed viraria `UNION ALL` de três consultas com ordenação global por data; `Participacao`, `Pagamento` e `Presenca` precisariam de FK polimórfica para "evento", contaminando o resto do modelo (e conflitando com a [ADR-0004](0004-participacao-como-entidade-propria.md)); RN-002 deixaria de ser comparação e passaria a ser **mover a linha de tabela** ao restringir alcance, perdendo id e histórico; RF-018 (duplicar evento) e RF-013 (editar) triplicariam de implementação |
| **Motivo objetivo da recusa** | Espalha o custo por todo o modelo para resolver a única coisa que as colunas nulas custam: espaço |

## Consequências

### Positivas

- **O banco proíbe o estado ilegal.** Não existe evento `TURMA` com `curso_id` preenchido,
  nem evento sem âncora — e isso vale para qualquer caminho de escrita, inclusive
  `INSERT` manual em depuração.
- **A consulta mais frequente do produto tem índice sob medida**, com filtro parcial em
  `status = 'PUBLICADO'` (o que descarta rascunho, cancelado e realizado do índice), o que é
  a base do orçamento de RNF-006.
- **RNF-012 fica simples de implementar corretamente.** A verificação no servidor é comparar
  o vínculo do usuário (`turma_id`, `curso_id`, `faculdade_id` de `Usuario`) com a âncora do
  evento — três igualdades, sem travessia. Um caminho simples é um caminho que se testa por
  ator, inclusive por ID direto.
- **RN-002 vira uma linha.** Ordinal do alcance mais igualdade da âncora; `visibility.ts`
  fica sem dependência de banco e sem I/O, e os testes CT-011/CT-012/CT-013 rodam em
  milissegundos.
- **O TypeScript espelha o `CHECK`.** A união discriminada torna impossível construir um
  objeto de evento com duas âncoras, então o erro é pego no editor, antes do banco.
- **Legibilidade para a banca.** `alcance = 'TURMA'` e `turma_id` são autoexplicativos no
  diagrama ER e na apresentação — o que tem valor num critério de avaliação que pesa 20%.

### Negativas

- **Três colunas em que duas são sempre nulas.** Toda linha de `evento` carrega dois nulos
  por definição. É desperdício aceito, mas é desperdício, e aparece em qualquer `SELECT *`
  como ruído.
- **O `CHECK` de três ramos é código que precisa ser mantido em sincronia com o enum.**
  Adicionar um alcance novo (por exemplo, `ATLETICA`) exige, em um mesmo PR: `ALTER TYPE`,
  coluna nova, **reescrever o `CHECK` inteiro**, índice parcial novo, caso novo na união
  discriminada, caso novo em `visibility.ts` e ajuste em RN-002. São sete pontos de edição
  para um valor novo — o oposto de extensível.
- **Esquecer um dos sete pontos falha de formas diferentes**, e nem todas ruidosas: esquecer
  o índice degrada o feed silenciosamente; esquecer o `CHECK` permite estado ilegal; esquecer
  o caso no `switch` gera erro de compilação (o melhor dos três, e é por isso que o `switch`
  exaustivo é obrigatório).
- **O `switch` exaustivo é código a mais.** Cada leitura de âncora precisa discriminar por
  `alcance`, com `default` que atinge `never`. É verbosidade real em troca de segurança de
  tipo.
- **Não há um índice único que sirva para "ordenar por data qualquer âncora".** Consultas
  administrativas que ignoram alcance (moderação, aprovação de evento de faculdade) não usam
  os três índices parciais e precisam de índice próprio por `status`/`inicio`.
- **A regra vive em dois lugares.** O `CHECK` no banco e a união discriminada no TypeScript
  expressam a mesma invariante em linguagens diferentes; se uma mudar sem a outra, a
  divergência só aparece em tempo de execução, no `INSERT` recusado.

## Como reverter

Migrar para a alternativa A (polimórfica) é possível e não destrutivo:

1. Criar `escopo` e os três subtipos; popular com `INSERT … SELECT` a partir das três
   colunas existentes (três comandos, um por alcance).
2. Adicionar `evento.escopo_id`, preencher pelo mapeamento, tornar obrigatório.
3. Remover as três FKs e o `CHECK`; reescrever as consultas de feed e criar os índices
   equivalentes.
4. Trocar a união discriminada por hierarquia no TypeScript e reescrever `visibility.ts`.
5. **Reexecutar toda a bateria de RNF-012 por ator** — este é o passo caro e o que não pode
   ser abreviado, porque um erro aqui vaza evento de turma para a faculdade inteira.

Custo estimado pelo grupo: **2 a 3 dias de backend mais um dia de reteste de autorização**.
Reversível, portanto — mas sem motivo enquanto o alcance tiver três níveis. Se um quarto
nível aparecer (por exemplo, alcance por entidade estudantil), esta ADR deve ser
**substituída**, não emendada: com quatro âncoras, o `CHECK` de quatro ramos e as quatro
colunas passam a ser mais caros que o join.

## Verificação

| Como se verifica | Onde |
|---|---|
| `INSERT` de evento `TURMA` com `curso_id` preenchido é recusado por `ck_evento_ancora_coerente`; `INSERT` sem âncora nenhuma também | Teste de integração de banco no CP6; equivalente na camada mockada no CP5 |
| Aluno de outra turma não vê o evento na listagem **e** recebe `403`/`404` ao acessar por ID direto | **CT-011 / CT-012** (RN-001) e **CT-030** (RN-024), executados por ator: Marina (3ESPX), Diego (2ESPA), Elisa (4SIA), Felipe (1CCB) contra `evt-001` (TURMA 3ESPX) |
| Visibilidade correta nos três níveis | **CT-011 / CT-012** (RN-001) sobre `evt-001` (TURMA), `evt-003` (CURSO ECOMP), `evt-004` (FACULDADE) |
| Tentar aumentar o alcance de evento publicado é recusado; restringir é aceito | **CT-013** (RN-002) |
| Evento de alcance `FACULDADE` não é publicado sem aprovação | **CT-014** (RN-003) |
| O `switch` sobre `alcance` é exaustivo, com `default` inalcançável (`never`) | `tsc` em modo `strict` + `npm run lint` no CI (RNF-017) — adicionar valor ao enum sem tratar o caso quebra o build |
| Os três índices parciais existem e são usados pelo plano do feed | Revisão do PR de migração no CP6; `EXPLAIN` anexado no PR que tocar a consulta do feed |
