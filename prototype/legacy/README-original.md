# Campus — App de eventos universitários

Protótipo visual (web) do app descrito na especificação. Não é mais uma moldura de
celular — é uma página web responsiva normal, que roda em qualquer navegador ou pode
ser hospedada gratuitamente no GitHub Pages.

## Como rodar

**Local:** baixe o repositório e abra `index.html` direto no navegador. Não precisa de
servidor, build, nem instalação — é HTML/CSS/JS puro.

**Online (GitHub Pages):**
1. Suba este repositório no GitHub.
2. Vá em **Settings → Pages**.
3. Em "Branch", selecione `main` e a pasta `/ (root)`.
4. Salve — em alguns minutos o link fica disponível em
   `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`.

## O que tem no protótipo (`index.html`)

Uma barra de navegação fixa no topo (logo, abas e botão "Criar evento") e um conteúdo
central que troca de tela ao clicar nas abas — sem recarregar a página:

| Tela | O que mostra |
|---|---|
| **Início** | Feed social (posts com foto) + eventos em destaque em formato "ticket" |
| **Eventos** | Lista de eventos com filtros (turma/curso/faculdade/gratuito/data) |
| **Criar** | Formulário de criação de evento (nome, descrição, alcance, data, vagas, valor, local) |
| **Detalhe** | Aberto ao clicar em qualquer evento — capa, dados, barra de vagas preenchidas, botão de participação, botão de voltar |
| **Perfil** | Dados do aluno, estatísticas, abas de eventos (participando/criados/anteriores) |

**Identidade visual:** fundo claro (`#FBFBFA`), texto quase preto, um acento coral
(`#E8542E`) para ações principais e um verde-azulado (`#0F7A6E`) como segundo acento
para variar. Tipografia Space Grotesk (títulos) + Inter (corpo) + JetBrains Mono
(datas, tags, dados). O cartão de evento em forma de **ticket picotado** continua sendo
o elemento de assinatura.

O layout é responsivo: em telas estreitas, a barra de navegação do topo esconde os
links de texto e mantém só logo, botão de criar e avatar.

Todos os dados na tela são fictícios e fixos no HTML — não há backend, banco de dados,
login real ou persistência. Cliques em "Publicar evento" ou "Entrar na lista de espera"
só mostram um aviso (toast), não gravam nada.

## O que ainda falta para virar produto de verdade

O protótipo cobre a experiência visual. Faltam três pilares que a especificação original
detalha e que exigem decisões técnicas antes de codar:

### 1. Modelo de dados (proposta inicial)

```
Faculdade
 └─ Curso
     └─ Turma (com ano/período)
         └─ Aluno (pertence a 1 turma, 1 curso, 1 faculdade)

Evento
 ├─ organizador_id → Aluno
 ├─ alcance: turma | curso | faculdade
 ├─ turma_id / curso_id / faculdade_id (conforme alcance)
 ├─ capacidade_maxima, preco, prazos (inscrição, pagamento, cancelamento)
 ├─ perguntas_customizadas[] (opcional, respondidas na inscrição)
 └─ status: ativo | cancelado

Participacao
 ├─ evento_id, aluno_id
 ├─ status: pendente | confirmado | recusado | cancelado | lista_espera
 ├─ respostas_perguntas[]
 └─ posicao_fila (se lista_espera)

Pagamento
 ├─ participacao_id
 ├─ metodo: pix | cartao | outro
 └─ status: pendente | confirmado | recusado | reembolsado

Publicacao (feed)
 ├─ autor_id, foto, legenda
 └─ evento_relacionado_id (opcional)

Notificacao
 ├─ destinatario_id, tipo, referencia_id, lida (bool)

Presenca (QR Code)
 ├─ participacao_id, checkin_em, escaneado_por_id
```

Esse desenho já reserva espaço para **administrador de curso** e **administrador de
faculdade** como papéis adicionais sobre `Aluno`, sem precisar remodelar nada — como a
especificação pede.

### 2. Decisões em aberto (mencionadas no briefing como "a definir depois")

- **Autenticação**: e-mail institucional é a intenção declarada. Recomendo login por
  e-mail + verificação de domínio (ex: `@nomedafaculdade.edu.br`) desde o início, mesmo
  que simplificado, para evitar retrabalho de segurança depois.
- **Cadastro oficial de faculdades/cursos/turmas**: hoje é auto-declarado no onboarding
  + entrada por código de turma. Isso é razoável para uma v1, mas sem verificação, nada
  impede um aluno de se declarar em turma errada — vale um código de convite validado
  pela turma, não digitado livremente.
- **Pagamentos**: a especificação pede Pix, cartão e extensibilidade. Sugiro abstrair
  atrás de uma interface única (`iniciar_pagamento`, `confirmar_pagamento`,
  `reembolsar`) desde o primeiro provedor, para trocar de gateway sem afetar o resto do
  sistema.

### 3. Stack sugerida

Como é um app mobile com feed em tempo real, notificações push, QR code e pagamentos,
uma stack comum e produtiva seria:

- **App**: React Native (ou Flutter) — cobre iOS/Android com uma base de código.
- **Backend**: API REST ou GraphQL (Node/NestJS, ou Django/FastAPI) + Postgres.
- **Notificações**: push via Firebase Cloud Messaging.
- **Pagamentos**: gateway com suporte a Pix nativo (ex: Mercado Pago, Pagar.me,
  Asaas) atrás da interface abstrata citada acima.
- **QR Code**: geração no backend (biblioteca padrão), leitura no app via câmera
  (ex: `expo-camera` + leitor de QR).

## Próximos passos possíveis

1. Revisar o protótipo e me dizer o que muda (telas, fluxo, visual).
2. Detalhar o modelo de dados acima em um schema real (SQL ou Prisma/Drizzle).
3. Especificar os endpoints da API por módulo (eventos, participação, pagamentos,
   notificações, feed).
4. Iniciar o projeto de app (estrutura de pastas React Native/Flutter) conectado a
   dados mockados, depois plugar no backend real.
