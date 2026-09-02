# ADR-0006 — Abstração de gateway de pagamento (interface `PaymentGateway`)

- **Status:** Aceita
- **Data:** 2026-08-31
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), João Viviani Baldini (Product Owner), Vitor Pantarotto (Scrum Master / QA)
- **Requisitos afetados:** RNF-022, RNF-014, RNF-009 · RN-012, RN-013, RN-014 · RF-028, RF-029, RF-030, RF-031, RF-032

## Contexto

Pagamento é o ponto do projeto onde um erro custa **dinheiro de aluno**, não nota. E é o
único módulo cujo requisito principal é uma **proibição**:

> **RNF-022** — Nenhum dado de cartão trafega ou é armazenado pelo Campus. A captura ocorre
> no ambiente do gateway (redirect/SDK), e guardamos apenas identificador da transação e
> status.

Ao lado dela, uma regra de negócio que define quem tem autoridade:

> **RN-014** — A confirmação de pagamento é **idempotente** e vem **somente do gateway**.
> Reprocessar a mesma notificação N vezes produz o mesmo resultado e uma única confirmação.

O contexto de projeto aperta por três lados:

1. **O CP5 não tem backend** ([ADR-0003](0003-camada-de-repositorio-com-msw.md)), e ainda
   assim precisa responder coerentemente sobre pagamento: três dos onze eventos do seed
   canônico são pagos — `evt-001` (R$ 25,00), `evt-005` (R$ 45,00) e `evt-007` (R$ 15,00) — e
   a participação principal de Marina, em `evt-001`, está `CONFIRMADA` e **paga**. As telas
   de pagamento (RF-028 a RF-032) são entregas do **CP6** conforme
   [`../02-requisitos.md`](../02-requisitos.md), mas o detalhe de evento pago, o valor, a
   política de reembolso e o estado da participação aparecem no CP5 — e a camada mockada
   precisa de algo por trás disso que não seja um campo estático.
2. **O provedor real ainda não está escolhido.** A dependência **D-02** de
   [`../03-escopo.md`](../03-escopo.md) é "sandbox de gateway com Pix", com plano B declarado:
   "gateway simulado próprio atrás da mesma interface (`PaymentGateway`)". A premissa P-03
   assume sandbox gratuito — e premissa é coisa que pode não se confirmar.
3. **Orçamento zero e sem pessoa jurídica.** O grupo não tem entidade para abrir conta de
   recebimento (premissa do grupo), então o CP6 opera em **sandbox**, com dinheiro fictício.

Existe ainda uma regra interna do time contra abstração prematura: **não criar abstração
antes do terceiro caso concreto**. Esta ADR abre exceção a ela, e o motivo precisa estar
escrito — não basta invocar bom gosto arquitetural.

## Decisão

**Todo acesso a pagamento passa por uma interface de quatro métodos, `PaymentGateway`. No
CP5 a implementação é um simulador; no CP6, um adaptador para o provedor real em sandbox. O
SDK ou a API do provedor não aparece em nenhum caso de uso.**

```ts
// src/services/payments/paymentGateway.ts
import type { MetodoPagamento, StatusPagamento } from '../../types/domain';

/** Solicitacao de cobranca. Nao carrega nenhum dado de cartao — RNF-022. */
export interface CobrancaSolicitada {
  readonly participacaoId: string;
  readonly valorCentavos: number;
  readonly metodo: MetodoPagamento;
  readonly descricao: string;
  /** ISO 8601. min(agora + 60min, prazoInscricao, inicio - 1h) — RN-012. */
  readonly expiraEm: string;
  /** Chave de idempotencia gerada por nos, estavel por tentativa — RN-014. */
  readonly chaveIdempotencia: string;
  /** Para onde o provedor devolve o usuario apos captura fora do nosso dominio. */
  readonly urlRetorno?: string;
}

export interface CobrancaCriada {
  /** Identificador da transacao no provedor (ex.: "gw-8842"). Unico dado que persistimos. */
  readonly transacaoId: string;
  readonly status: StatusPagamento;
  readonly expiraEm: string;
  /** Presente quando metodo === 'PIX'. */
  readonly pix?: { readonly copiaECola: string; readonly qrCodeBase64: string };
  /** Presente quando a captura ocorre no ambiente do provedor (cartao) — RNF-022. */
  readonly redirecionamento?: { readonly url: string };
}

export interface CobrancaConsultada {
  readonly transacaoId: string;
  readonly status: StatusPagamento;
  readonly valorCentavos: number;
  readonly pagoEm?: string;
  readonly motivoRecusa?: string;
}

export interface ReembolsoSolicitado {
  readonly transacaoId: string;
  /** Integral ou parcial conforme a politica congelada na participacao — RN-013. */
  readonly valorCentavos: number;
  readonly chaveIdempotencia: string;
  readonly motivo: string;
}

export interface ReembolsoRealizado {
  readonly reembolsoId: string;
  readonly status: StatusPagamento;
  readonly valorCentavos: number;
  readonly efetivadoEm?: string;
}

/** Requisicao bruta recebida em POST /webhooks/pagamento. Superficie publica, nao confiavel. */
export interface NotificacaoRecebida {
  readonly corpoBruto: string;
  readonly cabecalhos: Readonly<Record<string, string>>;
}

export type NotificacaoVerificada =
  | {
      readonly valida: true;
      readonly tipo: 'PAGAMENTO_CONFIRMADO' | 'PAGAMENTO_RECUSADO' | 'REEMBOLSO_EFETIVADO';
      readonly transacaoId: string;
      readonly chaveIdempotencia: string;
      readonly ocorridoEm: string;
    }
  | {
      readonly valida: false;
      readonly motivo: 'ASSINATURA_INVALIDA' | 'CORPO_MALFORMADO' | 'EVENTO_IGNORADO';
    };

export interface PaymentGateway {
  criarCobranca(entrada: CobrancaSolicitada): Promise<CobrancaCriada>;
  consultarCobranca(transacaoId: string): Promise<CobrancaConsultada>;
  reembolsar(entrada: ReembolsoSolicitado): Promise<ReembolsoRealizado>;
  /** Sincrona e pura: so verifica assinatura e formato. Nao toca rede nem banco. */
  verificarNotificacao(entrada: NotificacaoRecebida): NotificacaoVerificada;
}
```

Quatro escolhas de desenho merecem registro:

- **A interface não tem campo de cartão.** Não existe `numeroCartao`, `cvv` nem `titular` em
  nenhum tipo — o caminho do cartão é `redirecionamento.url`. RNF-022 deixa de depender de
  disciplina e passa a ser uma propriedade do tipo: o dado proibido não tem por onde entrar.
- **`verificarNotificacao` é síncrona e pura.** Verificação de assinatura HMAC e de formato
  não precisa de rede; sendo pura, é testável com vetores fixos, inclusive o caso de
  assinatura adulterada, sem nenhum servidor.
- **`chaveIdempotencia` é gerada por nós**, estável por tentativa, e é a mesma chave gravada
  em `pagamento.chave_idempotencia` com `UNIQUE` no banco. RN-014 é garantida em duas
  camadas: o provedor não cria cobrança duplicada e o banco não aceita processamento
  duplicado.
- **Valores em centavos, inteiros.** Nenhum ponto flutuante em dinheiro, em nenhum ponto da
  interface.

### Por que a exceção à regra "não abstraia antes do terceiro caso" se paga aqui

A regra existe para impedir abstração **especulativa** — a que serve a um segundo caso
imaginado. Aqui, três condições a desarmam:

1. **Já existem duas implementações no dia 1, não uma.** Simulador (CP5) e adaptador real
   (CP6) são requisitos de checkpoints diferentes, ambos com data marcada. A abstração não
   antecipa um futuro hipotético; ela descreve o presente de duas sprints já planejadas.
2. **A fronteira é imposta por um requisito de segurança, não por gosto.** RNF-022 exige que
   o dado de cartão nunca entre no nosso lado. Uma interface sem campo de cartão é a forma
   mais barata e mais verificável de garantir isso — mais barata do que auditar chamadas de
   SDK espalhadas.
3. **Sem a abstração, a Sprint 3 nasce sem rede de proteção.** A dependência D-02 (sandbox
   com Pix) pode não se confirmar, e o plano B declarado em [`../03-escopo.md`](../03-escopo.md)
   é literalmente "gateway simulado próprio atrás da mesma interface". Um plano B que só
   existe no papel não é plano B: a interface tem de existir e ter uma implementação
   funcionando **antes** de a dependência falhar.

E o custo da exceção é pequeno e delimitado: **quatro métodos, sem herança, sem *factory*,
sem plugin, sem registro dinâmico.** Se a abstração fosse um framework de meios de pagamento,
a regra teria vencido.

## Alternativas consideradas

### A. Acoplar direto ao SDK do provedor

| | |
|---|---|
| **Prós** | Menos código nosso; tipos e validações do provedor prontos; nenhuma tradução de enum; documentação oficial cobre os casos de borda |
| **Contras** | O tipo do provedor vaza para o caso de uso e para o teste: `criarInscricaoPaga()` passa a receber e devolver objetos do SDK, e testar a regra de janela de pagamento (RN-012) exige *mock* da biblioteca de terceiro. No CP5, sem backend, não haveria como simular a cobrança sem falar com o provedor de verdade — a demo passaria a depender de rede e credencial. E se a premissa P-03 falhar (sandbox indisponível, gratuito deixando de existir, provedor sem Pix em teste), a troca deixaria de ser "escrever outro adaptador" e viraria refatoração dos serviços de aplicação em plena Sprint 3 |
| **Motivo objetivo da recusa** | Torna o módulo mais crítico do produto **intestável sem rede** e transforma um risco de dependência externa (D-02) em risco de refatoração de código de negócio |

### B. Chamar a API HTTP do provedor direto, sem SDK e sem interface

| | |
|---|---|
| **Prós** | Zero dependência nova; controle total sobre a requisição; nada de peculiaridade de SDK |
| **Contras** | Mantém integralmente o vazamento da alternativa A, com mais trabalho: parsing manual, tratamento de erro de transporte e reimplementação de *retry*. E, decisivo: sem um ponto único de entrada, a geração da chave de idempotência e a verificação de assinatura ficariam espalhadas por onde houver chamada — que é exatamente onde RN-014 e RNF-022 se perdem |
| **Motivo objetivo da recusa** | Todos os contras de A sem o único pró de A (menos código) |

### C. Adiar a decisão: definir a fronteira de pagamento só no CP6

| | |
|---|---|
| **Prós** | Nada a manter agora; a interface nasceria já conhecendo a API real, e portanto mais certa; economiza tempo da Sprint 2 |
| **Contras** | A interface nasceria **junto com** a integração, moldada pela API do provedor que estivesse disponível — e sem nada que a validasse antes. O plano B de D-02 deixaria de existir na prática. E há um efeito imediato no CP5: `evt-001` é pago e a participação de Marina é paga; sem nenhuma noção de cobrança no mock, ou o estado dela vira dado estático (que não responde a cancelamento nem a reembolso), ou o detalhe de evento pago mostra política de reembolso que nada sustenta. Fica ainda pior no CP6: `RN-012` (janela de 60 min) e `RF-030` (expiração de reserva) são o que devolve vaga para a fila — e seriam escritos pela primeira vez na sprint mais cheia, sem os modos de falha já exercitados |
| **Motivo objetivo da recusa** | Concentra na Sprint 3 o módulo de maior risco **e** anula o plano B de uma dependência externa já classificada como risco (R-04 em [`../12-riscos.md`](../12-riscos.md)) |

### D. Simulador sem interface, embutido no mock

Recusada por consistência com a [ADR-0003](0003-camada-de-repositorio-com-msw.md): o
simulador precisa ser substituível pelo adaptador real **sem tocar em quem chama**. Sem
interface, o CP6 teria de reescrever o consumidor — que é o problema que a ADR-0003 evita no
resto do sistema.

## Consequências

### Positivas

- **RNF-022 é garantido por tipo.** Não há campo de cartão na interface, então nenhum caminho
  de código consegue receber um. A verificação vira busca por nome de campo no esquema e nos
  tipos, e não auditoria de comportamento.
- **RN-014 tem um único ponto de entrada.** `verificarNotificacao` é o único lugar que decide
  se uma notificação é autêntica, e `chaveIdempotencia` é o único mecanismo de duplicidade.
  Um ponto único é um ponto que se testa.
- **O CP5 sustenta o seed pago sem rede externa e sem credencial.** Valor, política de
  reembolso, estado da participação de Marina em `evt-001` e o cálculo de prazo têm uma
  implementação atrás deles — não são texto fixo na tela. As telas de pagamento continuam
  sendo entrega do CP6, mas chegam à Sprint 3 com a fronteira já provada.
- **Os casos difíceis viram teste, não sorte.** O simulador expõe modos de falha
  deliberados: recusa, timeout, notificação duplicada, notificação com assinatura inválida,
  notificação fora de ordem. Isso permite escrever CT-010 (idempotência) e CT-008/CT-009
  (reembolso) antes de existir provedor.
- **A dependência D-02 deixa de ser bloqueante.** Se o sandbox não sair, o plano B já está
  implementado e é o mesmo objeto que os casos de uso consomem.
- **Trocar de provedor é escrever um arquivo.** Não é vantagem hipotética: se o provedor
  escolhido não tiver Pix em sandbox, é o que vai acontecer na Sprint 3.

### Negativas

- **A tradução de enum é código que só existe por causa da abstração — e é onde os bugs vão
  se esconder.** Cada provedor tem seu vocabulário de status (`paid`, `approved`,
  `settled`, `in_process`, `charged_back`), e mapeá-lo para `StatusPagamento` (8 valores) é
  decisão semântica, não mecânica: um `in_process` mapeado para `CONFIRMADO` confirma
  inscrição sem dinheiro. Mitigação: o mapa fica em um arquivo só, com teste por valor de
  origem, e o valor desconhecido é mapeado para `EM_ANALISE` — nunca para `CONFIRMADO`.
- **A interface foi desenhada sem conhecer a API real, então vai mudar no CP6.** Previsões
  concretas: `criarCobranca` provavelmente precisará de dados do pagador (nome, e-mail) para
  antifraude de cartão — o que exige revisar RNF-020 (minimização); `reembolsar` pode exigir
  referência ao item ou ao lote; e alguns provedores só aceitam idempotência em cabeçalho
  próprio. Ou seja: **parte do desenho de hoje é hipótese, e está declarada como hipótese.**
- **Risco de o simulador ser "bom demais".** Um gateway que sempre confirma em cinco segundos
  e nunca recusa ensina o app a assumir sucesso — o mesmo defeito que a ADR-0003 evita na
  camada de dados. Mitigação obrigatória: os modos de falha do simulador são configuráveis e
  fazem parte da suíte, não são brinquedo de depuração.
- **Duas implementações para manter durante a Sprint 3.** Enquanto o adaptador real é escrito,
  o simulador continua sendo o que roda em teste e em demo — e as duas precisam concordar,
  ou a suíte de contrato mente.
- **`verificarNotificacao` síncrona não cobre provedores que exigem consulta de volta.**
  Alguns provedores mandam notificação sem assinatura e esperam que o receptor **consulte** a
  transação para confirmar. Nesse caso a verificação deixa de ser pura e passa a usar
  `consultarCobranca`, o que muda a assinatura do método — está previsto como ponto de
  revisão da interface no CP6, não como surpresa.
- **Uma indireção a mais para depurar.** Um pagamento que não confirma tem agora três
  suspeitos (provedor, adaptador, caso de uso) em vez de dois.

## Como reverter

Reverter é barato **e é a direção errada**, o que é uma combinação incomum:

- Apagar a interface e chamar o SDK direto dos serviços de aplicação: estimativa do grupo,
  **cerca de um dia** de trabalho.
- O que se perde nesse dia: o simulador (e com ele a capacidade de rodar teste de pagamento
  sem rede), o ponto único de idempotência, e a garantia por tipo de RNF-022.

A reversão parcial faz mais sentido do que a total: se a interface se revelar mal desenhada
no CP6, o caminho é **reescrever a interface** (mantendo a fronteira) e não removê-la — o que
significa uma ADR nova substituindo esta, com a assinatura corrigida contra a API real. A
fronteira é a decisão; a assinatura de hoje é a melhor hipótese disponível.

## Verificação

| Como se verifica | Onde |
|---|---|
| Suíte de contrato única roda os mesmos casos contra `SimulatedPaymentGateway` e, no CP6, contra o adaptador do provedor em sandbox (marcada como teste de integração) | `paymentGateway.contract.test.ts`; cobre **CT-010** (RN-014) e **CT-008 / CT-009** (RN-013) |
| A mesma notificação processada 3× produz **um** `pagamento` `CONFIRMADO`, uma notificação ao aluno e nenhuma alteração adicional de estado | **CT-010** (RN-014); asserção sobre `chave_idempotencia` `UNIQUE` |
| Notificação com assinatura adulterada é recusada **sem** tocar o banco | Teste de `verificarNotificacao` com vetor fixo — sem rede, sem banco |
| Nenhum campo de cartão existe nos tipos, no esquema ou no log: busca por `cartao`, `numero_cartao`, `cvv`, `titular`, `pan` | Verificação automática no CI sobre `src/**` e sobre o DDL de migração do CP6 (RNF-022) |
| Nenhum import do SDK/HTTP do provedor fora do diretório do adaptador | `no-restricted-imports` no ESLint; caso de uso que importe o provedor é PR bloqueado |
| Status desconhecido do provedor nunca resulta em `CONFIRMADO` | Teste do mapa de status com valor inédito → `EM_ANALISE` |
| Nenhum valor monetário em ponto flutuante | Revisão de PR + tipo `valorCentavos: number` inteiro em toda a interface |
| Token, chave de assinatura e corpo bruto da notificação não aparecem em log | Revisão de log conforme RNF-009 e a seção de observabilidade de [`../08-arquitetura.md`](../08-arquitetura.md) |
