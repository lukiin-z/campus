# ADR-0001 — React + Vite (web mobile-first) em vez de React Native

- **Status:** Aceita
- **Data:** 2026-08-19
- **Decisores:** Lucas Baraldi (Tech Lead / Arquiteto, responsável técnico), João Viviani Baldini (Product Owner), Vitor Pantarotto (Scrum Master / QA)
- **Requisitos afetados:** RFX-05 (recusado), RF-033, RF-034, RF-039, RF-040, RNF-006, RNF-007, RNF-018, RNF-019

## Contexto

O Campus é um app de eventos universitários cujo público é **aluno com celular na mão**: as
três personas de [`../01-problema-e-personas.md`](../01-problema-e-personas.md) usam o
produto em pé, no corredor, entre aulas — e "usuário de desktop" está declarado como
antipersona. A leitura óbvia disso seria "então é app nativo".

As restrições do projeto dizem o contrário:

| Restrição | Efeito na escolha |
|---|---|
| **Três checkpoints em um semestre**, com datas fixas pela disciplina (CP4 08/09, CP5 06/10, CP6 10/11/2026) | Não há folga para um ciclo de submissão em loja, que depende de terceiro e tem prazo que não controlamos |
| **Orçamento zero** ([`../03-escopo.md`](../03-escopo.md), P-02) | Sem conta de desenvolvedor de loja, sem serviço de build pago, sem domínio próprio |
| **Seis pessoas, todas em papéis acumulados** | O time tem experiência prévia em web (HTML/CSS/JS/React); ninguém tem experiência de produção em RN, Swift, Kotlin ou Dart |
| **Avaliação por banca** | O artefato mais valioso é um **link que abre e funciona** no aparelho de quem avalia, sem instalar nada, sem TestFlight, sem convite, sem APK de fora da loja |
| **Sem backend próprio no CP5** | O CP5 tem de rodar como conteúdo estático publicado (GitHub Pages, base `/campus/`) — ver [ADR-0003](0003-camada-de-repositorio-com-msw.md) |

A publicação em loja já havia sido recusada como requisito: **RFX-05** em
[`../02-requisitos.md`](../02-requisitos.md) ("App nativo iOS/Android publicado nas lojas"),
com a justificativa de custo, conta de desenvolvedor e prazo de revisão incompatíveis com o
semestre. Esta ADR registra a decisão técnica que **decorre** dessa recusa: se não vai para
a loja, qual é o alvo de execução.

Há um custo específico que essa escolha compra e que precisa estar escrito: o check-in por
QR Code (RF-034) é a única funcionalidade do produto que depende de **hardware** —
a câmera do organizador na porta do evento.

## Decisão

**Entregamos o Campus como aplicação web mobile-first: React 18 + Vite + TypeScript em modo
`strict`, SPA com React Router, publicada como conteúdo estático.**

Consequências diretas da decisão, já assumidas no projeto:

1. O alvo de build é estático (`vite build`), publicado no GitHub Pages com `base: '/campus/'`
   nos CP4 e CP5.
2. O layout é desenhado do celular para cima, e a faixa de suporte obrigatória é
   **320px a 1440px sem rolagem horizontal** (RNF-018).
3. No CP6 o app recebe manifest e service worker para virar **PWA instalável** — é o
   substituto declarado da loja em [`../03-escopo.md`](../03-escopo.md).
4. A leitura de QR usa a API do navegador (`navigator.mediaDevices.getUserMedia`), e o
   check-in tem **fallback obrigatório por código numérico de 8 dígitos** — que já existe
   como `MetodoCheckin.CODIGO_NUMERICO` no domínio e como plano B da dependência D-06.
5. RF-039 (notificar) é entregue como **notificação dentro do app** (central de
   notificações, RF-040) e e-mail; push de sistema é `Should` do CP6, condicionado a PWA
   instalada.

## Alternativas consideradas

### A. React Native + Expo

| | |
|---|---|
| **Prós** | Acesso nativo à câmera com decodificador de código de barras pronto e confiável; push nativo em iOS e Android; ícone na tela inicial sem ensinar ninguém a "adicionar à tela de início"; React como linguagem comum com a experiência do time |
| **Contras** | A distribuição para a banca depende de loja, TestFlight ou APK lateral — todos com conta, prazo ou fricção de instalação; o Expo Go resolve o desenvolvimento, não a entrega avaliável; o design system teria de ser reconstruído em `StyleSheet` (Tailwind não se aplica), jogando fora a ponte token↔Figma da [ADR-0002](0002-tailwind-com-design-tokens.md); ninguém do time já publicou app RN, e a curva cairia na Sprint 2, que é justamente a das 18 RFs `Must` |
| **Motivo objetivo da recusa** | O gargalo do projeto é **prazo de entrega avaliável**, não capacidade nativa. RN move o risco para fora do nosso controle (revisão de loja, credencial de assinatura) e não remove nenhum requisito da lista |

### B. Flutter

| | |
|---|---|
| **Prós** | Uma base de código para iOS, Android e web; render consistente entre plataformas; ferramental de build maduro |
| **Contras** | Dart: nenhum integrante escreve Dart, e a decisão custaria a primeira semana de duas pessoas só em aprendizado; o build web do Flutter carrega o próprio motor de render, o que é incompatível com **RNF-007 (bundle inicial ≤ 250 KB gzip)**; o texto renderizado em canvas piora acessibilidade por leitor de tela, e temos quatro RNFs de acessibilidade (RNF-002 a RNF-005); a identidade visual — 20% da nota do CP4 — teria de ser refeita em widgets, sem reaproveitar nada do Figma |
| **Motivo objetivo da recusa** | Colide com um RNF numérico já aprovado (RNF-007) e com a área de maior peso na avaliação, em troca de um benefício (app nativo em loja) que já está fora de escopo por RFX-05 |

### C. Next.js em vez de Vite (ainda web)

| | |
|---|---|
| **Prós** | Roteamento por arquivo, SSR/SSG, otimização de imagem, caminho natural se o projeto crescesse para conteúdo público indexável |
| **Contras** | SSR exige processo Node em execução — e não temos hospedagem paga (P-02) nem backend no CP5; `output: 'export'` reduz o Next ao que o Vite já faz, com mais configuração e mais superfície para o `basePath` do Pages quebrar; nenhum requisito pede SEO, porque o feed é **segmentado por alcance** e portanto não é conteúdo público (RN-001) |
| **Motivo objetivo da recusa** | Paga complexidade por capacidades que o produto não usa. O feed do Campus é privado por definição; SSR para conteúdo autenticado e segmentado não traz ganho de percepção que o RNF-006 já não obtenha com bundle pequeno |

### D. Nativo separado (Swift + Kotlin)

Registrada apenas para fechar o leque: dobraria o esforço de implementação em um time de
seis pessoas com papéis acumulados, e mantém todos os contras da alternativa A. Recusada
sem discussão.

## Consequências

### Positivas

- **A entrega é um link.** Quem avalia abre `https://lukiin-z.github.io/campus/` no próprio
  celular e usa o app — sem instalação, sem convite, sem conta de teste. Isso vale para os
  três checkpoints e para a demo ao vivo do CP5.
- **O time produz na primeira semana.** Vite dá HMR imediato, o ecossistema (React Router,
  TanStack Query, Zustand, Zod, Vitest, Testing Library, Playwright) é o que o time já
  conhece, e não há etapa de build nativo no caminho crítico.
- **Um único artefato para 320–1440px.** O mesmo build atende celular do aluno e o
  projetor da apresentação, o que simplifica RNF-018 e RNF-019.
- **Deploy sem infraestrutura.** GitHub Pages a partir do CI cobre a dependência D-04 com
  plano B trivial (`npm run preview` gravado em vídeo).
- **O design system em Tailwind sobrevive intacto** para o CP6 — nenhuma reescrita de UI
  entre checkpoints.

### Negativas

- **A câmera não é nativa, e isso atinge a funcionalidade mais sensível do produto.**
  `getUserMedia` exige HTTPS (o Pages atende) e permissão explícita a cada sessão; a API
  `BarcodeDetector` não existe em todos os navegadores da matriz do RNF-019, o que obriga a
  carregar um decodificador em JavaScript, com custo de bundle e de CPU em aparelho antigo.
  Em iluminação ruim, na porta de um evento à noite, a taxa de leitura é pior do que a de um
  leitor nativo. **Mitigação declarada:** o fallback por código numérico de 8 dígitos não é
  cortesia, é caminho obrigatório do UC-005, e a tela de check-in do organizador precisa
  oferecê-lo com o mesmo destaque da câmera.
- **Não há push nativo, e RF-039 fica parcialmente entregue.** Web Push depende de PWA
  instalada e de versão recente de sistema; a matriz do RNF-019 aceita iOS 14+, onde não há
  Web Push. Consequência prática: um aluno em aparelho antigo **só descobre que a vaga foi
  liberada se abrir o app** — e a janela de oferta é de 24h (RN-007). Isso reduz a eficácia
  da lista de espera para parte do público. **Mitigação:** e-mail para os eventos de
  `VAGA_LIBERADA`, `PAGAMENTO_CONFIRMADO` e `EVENTO_CANCELADO`, e contagem visível do prazo
  na tela da participação.
- **A instalação precisa ser ensinada.** "Adicionar à tela de início" é um passo que
  ninguém executa por conta própria; sem ícone na tela inicial, o app depende de link salvo,
  e a recorrência cai. Isso vira item obrigatório do manual de uso do CP6.
- **Zero descoberta orgânica.** Sem loja, não existe busca por "Campus" que leve ao
  produto. A distribuição é 100% por link compartilhado no grupo da turma — o que, sendo
  honesto, é o canal real do público-alvo, mas é uma dependência de terceiro (WhatsApp) que
  o produto queria justamente reduzir.
- **`localStorage` é frágil como armazenamento de sessão.** Em iOS, dados de site podem ser
  descartados por inatividade prolongada, o que produz logout aparentemente aleatório —
  comportamento que um app nativo não tem. Ver a estratégia de token em
  [`../08-arquitetura.md`](../08-arquitetura.md).

## Como reverter

Reverter significa migrar a camada de apresentação para React Native (a alternativa A, que
é a única com custo tolerável).

| O que sobrevive | O que é perdido |
|---|---|
| `src/domain/` — regras de capacidade, fila, prazo, reembolso, check-in: TypeScript puro, sem DOM | `src/components/ui/` inteiro: os componentes e todo o Tailwind |
| `src/services/` — interfaces de repositório e implementação HTTP ([ADR-0003](0003-camada-de-repositorio-com-msw.md)) | `src/pages/` inteiro: navegação, layout e composição das 8 telas |
| `src/types/domain.ts` e os mocks | O styleguide e a ponte token↔Figma da [ADR-0002](0002-tailwind-com-design-tokens.md) |

Custo estimado pelo grupo: **uma sprint inteira de duas pessoas** só para reconstruir a
apresentação, sem contar conta de desenvolvedor, assinatura de build e ciclo de revisão de
loja — que não caberiam no semestre restante. Na prática, o **ponto de não retorno é a
entrega do CP5**: depois dela, reverter custa mais do que o produto inteiro entregue até
ali. É por isso que a decisão está registrada agora, e não na Sprint 3.

## Verificação

| Como se verifica | Onde |
|---|---|
| Nenhuma dependência `react-native*`, `expo*` ou `flutter` em `app/package.json` | Revisão de PR; conferência no CI a cada instalação de dependência |
| `npm run build` produz artefato estático servido com `base: '/campus/'`, e o link do Pages abre sem erro de console | Job de CI de deploy; critério de saída 6 de [`../03-escopo.md`](../03-escopo.md) |
| Layout sem rolagem horizontal em 320, 375, 390, 768, 1024 e 1440px | Roteiro de RNF-018, executado nas 8 telas |
| Bundle inicial ≤ 250 KB gzip (o decodificador de QR entra por carregamento sob demanda na rota de check-in, não no pacote inicial) | Relatório de tamanho do `vite build` no CI (RNF-007) |
| A tela de check-in oferece **os dois** caminhos — câmera e código numérico de 8 dígitos — e o fluxo por código é testado | Teste E2E do check-in (CT-022/CT-023, RN-017); item de checklist do PR da tela |
| Nenhum requisito depende de push de sistema como único canal | Revisão de PR de notificação: todo `TipoNotificacao` tem caminho in-app |
