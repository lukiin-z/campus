-- Migration inicial do Campus — CP6.
--
-- A primeira parte é o SQL que `prisma migrate diff` gerou a partir de
-- `schema.prisma`. A segunda, a partir de "O que o Prisma não expressa", foi
-- escrita à mão: são os `CHECK`, o índice único parcial de RN-015 e os índices
-- parciais que o schema do Prisma não tem sintaxe para declarar.
--
-- Regerar esta migration a partir do schema apagaria a segunda parte. Se o
-- modelo mudar, gere uma migration NOVA — não reescreva esta.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "alcance_evento" AS ENUM ('TURMA', 'CURSO', 'FACULDADE');

-- CreateEnum
CREATE TYPE "status_evento" AS ENUM ('RASCUNHO', 'EM_APROVACAO', 'PUBLICADO', 'CANCELADO', 'REALIZADO');

-- CreateEnum
CREATE TYPE "status_participacao" AS ENUM ('PENDENTE_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA', 'OFERTA_PENDENTE', 'PRESENTE', 'AUSENTE', 'CANCELADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('AGUARDANDO', 'CONFIRMADO', 'RECUSADO', 'EM_ANALISE', 'REEMBOLSO_SOLICITADO', 'REEMBOLSADO', 'REEMBOLSADO_PARCIAL', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "metodo_pagamento" AS ENUM ('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO');

-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('ALUNO', 'ADMIN_CURSO', 'ADMIN_FACULDADE');

-- CreateEnum
CREATE TYPE "metodo_checkin" AS ENUM ('QR_CODE', 'CODIGO_NUMERICO', 'MANUAL');

-- CreateEnum
CREATE TYPE "tipo_pergunta" AS ENUM ('TEXTO_CURTO', 'ESCOLHA_UNICA');

-- CreateEnum
CREATE TYPE "tipo_notificacao" AS ENUM ('NOVO_EVENTO', 'VAGA_LIBERADA', 'PAGAMENTO_CONFIRMADO', 'PAGAMENTO_EXPIRADO', 'EVENTO_ALTERADO', 'EVENTO_CANCELADO', 'CHECKIN_REALIZADO', 'EVENTO_APROVADO');

-- CreateEnum
CREATE TYPE "motivo_cancelamento" AS ENUM ('ALUNO_DESISTIU', 'EVENTO_CANCELADO', 'VINCULO_PERDIDO', 'REMOVIDO_PELO_ORGANIZADOR', 'OFERTA_RECUSADA');

-- CreateTable
CREATE TABLE "faculdade" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "sigla" VARCHAR(20) NOT NULL,
    "dominios_email" TEXT[],
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculdade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curso" (
    "id" UUID NOT NULL,
    "faculdade_id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "duracao_semestres" INTEGER NOT NULL,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turma" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "periodo" VARCHAR(10) NOT NULL,
    "codigo_convite" VARCHAR(24) NOT NULL,
    "codigo_ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "avatar_seed" INTEGER NOT NULL,
    "faculdade_id" UUID NOT NULL,
    "curso_id" UUID,
    "turma_id" UUID,
    "papeis" "papel_usuario"[] DEFAULT ARRAY['ALUNO']::"papel_usuario"[],
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "visivel_entre_confirmados" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "refresh_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(400),
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" UUID NOT NULL,
    "organizador_id" UUID NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "descricao" TEXT NOT NULL,
    "alcance" "alcance_evento" NOT NULL,
    "turma_id" UUID,
    "curso_id" UUID,
    "faculdade_id" UUID,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "local" VARCHAR(160) NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "ocupadas" INTEGER NOT NULL DEFAULT 0,
    "preco" DECIMAL(10,2) NOT NULL,
    "status" "status_evento" NOT NULL DEFAULT 'RASCUNHO',
    "motivo_cancelamento" VARCHAR(400),
    "prazo_inscricao" TIMESTAMPTZ(3) NOT NULL,
    "prazo_cancelamento" TIMESTAMPTZ(3) NOT NULL,
    "capa_seed" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pergunta_customizada" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "enunciado" VARCHAR(160) NOT NULL,
    "tipo" "tipo_pergunta" NOT NULL,
    "opcoes" TEXT[],
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "pergunta_customizada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacao" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "status_participacao" NOT NULL,
    "posicao_fila" INTEGER,
    "pagamento_expira_em" TIMESTAMPTZ(3),
    "oferta_expira_em" TIMESTAMPTZ(3),
    "motivo_cancelamento" "motivo_cancelamento",
    "cancelada_apos_prazo" BOOLEAN NOT NULL DEFAULT false,
    "politica_vigente" JSONB,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "participacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "metodo" "metodo_pagamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valor_reembolsado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "status_pagamento" NOT NULL DEFAULT 'AGUARDANDO',
    "transacao_externa_id" VARCHAR(120),
    "chave_idempotencia" VARCHAR(200) NOT NULL,
    "ultimos_quatro" VARCHAR(4),
    "bandeira_cartao" VARCHAR(24),
    "titular_cartao" VARCHAR(120),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" TIMESTAMPTZ(3),

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presenca" (
    "id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "registrado_por_id" UUID NOT NULL,
    "metodo" "metodo_checkin" NOT NULL,
    "checkin_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo_correcao" VARCHAR(400),
    "sincronizado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "presenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_pergunta" (
    "id" UUID NOT NULL,
    "pergunta_id" UUID NOT NULL,
    "participacao_id" UUID NOT NULL,
    "valor" VARCHAR(500) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resposta_pergunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacao" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "legenda" VARCHAR(500) NOT NULL,
    "imagem_seed" INTEGER NOT NULL,
    "removida" BOOLEAN NOT NULL DEFAULT false,
    "motivo_remocao" VARCHAR(400),
    "removida_por_id" UUID,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario" (
    "id" UUID NOT NULL,
    "publicacao_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" VARCHAR(280) NOT NULL,
    "removido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" UUID NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "mensagem" VARCHAR(400) NOT NULL,
    "referencia_id" UUID,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculdade_sigla_key" ON "faculdade"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "curso_codigo_key" ON "curso"("codigo");

-- CreateIndex
CREATE INDEX "curso_faculdade_id_idx" ON "curso"("faculdade_id");

-- CreateIndex
CREATE UNIQUE INDEX "turma_codigo_convite_key" ON "turma"("codigo_convite");

-- CreateIndex
CREATE INDEX "turma_curso_id_idx" ON "turma"("curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_faculdade_id_idx" ON "usuario"("faculdade_id");

-- CreateIndex
CREATE INDEX "usuario_turma_id_idx" ON "usuario"("turma_id");

-- CreateIndex
CREATE INDEX "usuario_curso_id_idx" ON "usuario"("curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_refresh_hash_key" ON "sessao"("refresh_hash");

-- CreateIndex
CREATE INDEX "sessao_usuario_id_expira_em_idx" ON "sessao"("usuario_id", "expira_em");

-- CreateIndex
CREATE INDEX "evento_turma_id_inicio_idx" ON "evento"("turma_id", "inicio");

-- CreateIndex
CREATE INDEX "evento_curso_id_inicio_idx" ON "evento"("curso_id", "inicio");

-- CreateIndex
CREATE INDEX "evento_faculdade_id_inicio_idx" ON "evento"("faculdade_id", "inicio");

-- CreateIndex
CREATE INDEX "evento_organizador_id_criado_em_idx" ON "evento"("organizador_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pergunta_customizada_evento_id_ordem_key" ON "pergunta_customizada"("evento_id", "ordem");

-- CreateIndex
CREATE INDEX "participacao_usuario_id_criado_em_idx" ON "participacao"("usuario_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "participacao_evento_id_posicao_fila_idx" ON "participacao"("evento_id", "posicao_fila");

-- CreateIndex
CREATE INDEX "participacao_pagamento_expira_em_idx" ON "participacao"("pagamento_expira_em");

-- CreateIndex
CREATE INDEX "participacao_oferta_expira_em_idx" ON "participacao"("oferta_expira_em");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_chave_idempotencia_key" ON "pagamento"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "pagamento_participacao_id_idx" ON "pagamento"("participacao_id");

-- CreateIndex
CREATE INDEX "pagamento_transacao_externa_id_idx" ON "pagamento"("transacao_externa_id");

-- CreateIndex
CREATE UNIQUE INDEX "presenca_participacao_id_key" ON "presenca"("participacao_id");

-- CreateIndex
CREATE INDEX "presenca_registrado_por_id_idx" ON "presenca"("registrado_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "resposta_pergunta_pergunta_id_participacao_id_key" ON "resposta_pergunta"("pergunta_id", "participacao_id");

-- CreateIndex
CREATE INDEX "publicacao_evento_id_criado_em_idx" ON "publicacao"("evento_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "publicacao_autor_id_idx" ON "publicacao"("autor_id");

-- CreateIndex
CREATE INDEX "comentario_publicacao_id_criado_em_idx" ON "comentario"("publicacao_id", "criado_em");

-- CreateIndex
CREATE INDEX "notificacao_destinatario_id_criado_em_idx" ON "notificacao"("destinatario_id", "criado_em" DESC);

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_faculdade_id_fkey" FOREIGN KEY ("faculdade_id") REFERENCES "faculdade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turma" ADD CONSTRAINT "turma_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_faculdade_id_fkey" FOREIGN KEY ("faculdade_id") REFERENCES "faculdade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_faculdade_id_fkey" FOREIGN KEY ("faculdade_id") REFERENCES "faculdade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pergunta_customizada" ADD CONSTRAINT "pergunta_customizada_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_pergunta" ADD CONSTRAINT "resposta_pergunta_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pergunta_customizada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_pergunta" ADD CONSTRAINT "resposta_pergunta_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacao" ADD CONSTRAINT "publicacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacao" ADD CONSTRAINT "publicacao_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacao" ADD CONSTRAINT "publicacao_removida_por_id_fkey" FOREIGN KEY ("removida_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_publicacao_id_fkey" FOREIGN KEY ("publicacao_id") REFERENCES "publicacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- O que o Prisma não expressa
--
-- Tudo abaixo foi escrito à mão sobre o SQL gerado, e nada disso é decoração.
-- São as garantias que o modelo ER de docs/05-modelagem/03-modelo-dados-er.md
-- lista nas seções 3 e 4, e que o schema do Prisma não tem sintaxe para
-- declarar: `CHECK`, índice único PARCIAL e índice parcial.
--
-- O `CHECK` de `ocupadas` é a última linha de defesa contra overbooking: se a
-- transação da aplicação tiver um furo, o banco recusa a escrita em vez de
-- gravar dado impossível. RN-004 deixa de depender de o código estar certo.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- EVENTO
-- ---------------------------------------------------------------------------

-- RN-004: a invariante central do produto.
ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_capacidade_faixa"
  CHECK ("capacidade" BETWEEN 2 AND 2000);

ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_ocupadas_le_capacidade"
  CHECK ("ocupadas" >= 0 AND "ocupadas" <= "capacidade");

ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_preco_nao_negativo"
  CHECK ("preco" >= 0);

-- RN-011: início antes do fim, e duração de no máximo 7 dias. Um evento de
-- duas semanas é quase sempre erro de digitação na data.
ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_inicio_antes_do_fim"
  CHECK ("inicio" < "fim");

ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_duracao_maxima"
  CHECK ("fim" - "inicio" <= interval '7 days');

-- RN-009 e RN-010: prazo não pode ser depois de o evento começar.
ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_prazo_inscricao"
  CHECK ("prazo_inscricao" <= "inicio");

ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_prazo_cancelamento"
  CHECK ("prazo_cancelamento" <= "inicio");

-- RN-001: exatamente UMA âncora, coerente com o alcance. Sem esta restrição um
-- evento pode nascer com alcance indefinido — e "quem vê este evento?" passa a
-- não ter resposta.
ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_ancora_coerente"
  CHECK (
    ("alcance" = 'TURMA'     AND "turma_id" IS NOT NULL AND "curso_id" IS NULL     AND "faculdade_id" IS NULL) OR
    ("alcance" = 'CURSO'     AND "turma_id" IS NULL     AND "curso_id" IS NOT NULL AND "faculdade_id" IS NULL) OR
    ("alcance" = 'FACULDADE' AND "turma_id" IS NULL     AND "curso_id" IS NULL     AND "faculdade_id" IS NOT NULL)
  );

-- RN-021: cancelamento sem motivo deixa o inscrito sem saber o que houve.
ALTER TABLE "evento" ADD CONSTRAINT "ck_evento_cancelado_tem_motivo"
  CHECK ("status" <> 'CANCELADO' OR "motivo_cancelamento" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- PARTICIPACAO
-- ---------------------------------------------------------------------------

-- RN-006: posição de fila é 1-based, e só existe em LISTA_ESPERA.
ALTER TABLE "participacao" ADD CONSTRAINT "ck_participacao_posicao_positiva"
  CHECK ("posicao_fila" IS NULL OR "posicao_fila" >= 1);

ALTER TABLE "participacao" ADD CONSTRAINT "ck_participacao_fila_tem_posicao"
  CHECK ("status" <> 'LISTA_ESPERA' OR "posicao_fila" IS NOT NULL);

-- RN-007 e RN-012: estado com prazo tem de ter o prazo. Uma oferta sem
-- `oferta_expira_em` nunca expiraria, e a vaga ficaria presa para sempre.
ALTER TABLE "participacao" ADD CONSTRAINT "ck_participacao_oferta_tem_prazo"
  CHECK ("status" <> 'OFERTA_PENDENTE' OR "oferta_expira_em" IS NOT NULL);

ALTER TABLE "participacao" ADD CONSTRAINT "ck_participacao_pagamento_tem_prazo"
  CHECK ("status" <> 'PENDENTE_PAGAMENTO' OR "pagamento_expira_em" IS NOT NULL);

-- RN-015: UMA participação ativa por (evento, aluno).
--
-- É índice único PARCIAL, e é isto que faz RN-015 ser garantia do banco em vez
-- de resultado de um `SELECT` antes do `INSERT`. Um único que ignorasse o
-- status impediria a pessoa de se inscrever de novo depois de cancelar — o que
-- é comportamento legítimo e frequente.
CREATE UNIQUE INDEX "ux_participacao_ativa"
  ON "participacao" ("evento_id", "usuario_id")
  WHERE "status" IN ('PENDENTE_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA', 'OFERTA_PENDENTE', 'PRESENTE');

-- ---------------------------------------------------------------------------
-- PAGAMENTO
-- ---------------------------------------------------------------------------

ALTER TABLE "pagamento" ADD CONSTRAINT "ck_pagamento_valor_positivo"
  CHECK ("valor" > 0);

-- RN-013: não se reembolsa mais do que se cobrou.
ALTER TABLE "pagamento" ADD CONSTRAINT "ck_pagamento_reembolso_na_faixa"
  CHECK ("valor_reembolsado" >= 0 AND "valor_reembolsado" <= "valor");

-- RNF-022: Pix não carrega dado de cartão. A restrição é o que torna a promessa
-- verificável, em vez de depender de o desenvolvedor lembrar.
ALTER TABLE "pagamento" ADD CONSTRAINT "ck_pagamento_pix_sem_cartao"
  CHECK (
    "metodo" <> 'PIX'
    OR ("ultimos_quatro" IS NULL AND "bandeira_cartao" IS NULL AND "titular_cartao" IS NULL)
  );

ALTER TABLE "pagamento" ADD CONSTRAINT "ck_pagamento_ultimos_quatro_digitos"
  CHECK ("ultimos_quatro" IS NULL OR "ultimos_quatro" ~ '^[0-9]{4}$');

-- RN-027: no máximo UMA cobrança aberta por participação.
--
-- Sem isto, um duplo toque no botão de pagar geraria dois Pix para a mesma
-- vaga, e o aluno pagaria o errado. O parcial é essencial: cobrança recusada
-- ou estornada pode conviver com uma nova tentativa.
CREATE UNIQUE INDEX "ux_pagamento_aguardando_por_participacao"
  ON "pagamento" ("participacao_id")
  WHERE "status" = 'AGUARDANDO';

-- ---------------------------------------------------------------------------
-- PERGUNTA_CUSTOMIZADA e PUBLICACAO
-- ---------------------------------------------------------------------------

-- RN-025: no máximo 5 perguntas, ordem de 1 a 5.
ALTER TABLE "pergunta_customizada" ADD CONSTRAINT "ck_pergunta_ordem_faixa"
  CHECK ("ordem" BETWEEN 1 AND 5);

ALTER TABLE "pergunta_customizada" ADD CONSTRAINT "ck_pergunta_escolha_tem_opcoes"
  CHECK ("tipo" <> 'ESCOLHA_UNICA' OR array_length("opcoes", 1) >= 2);

-- RN-020: remoção sem motivo e sem autor é moderação sem responsável.
ALTER TABLE "publicacao" ADD CONSTRAINT "ck_publicacao_remocao_justificada"
  CHECK ("removida" = false OR ("motivo_remocao" IS NOT NULL AND "removida_por_id" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Índices parciais
--
-- O Prisma declarou o índice; aqui o predicado entra. Um índice sobre a coluna
-- inteira também funcionaria, mas custa espaço e escrita para linhas que a
-- consulta nunca lê — a lista de eventos só olha `PUBLICADO`, e as rotinas de
-- expiração só olham dois status.
--
-- Os `DROP INDEX IF EXISTS` removem os índices que o Prisma gerou sem
-- predicado, cujos nomes seguem a convenção `<tabela>_<colunas>_idx`.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS "evento_turma_id_inicio_idx";
CREATE INDEX "ix_evento_turma_inicio" ON "evento" ("turma_id", "inicio")
  WHERE "status" = 'PUBLICADO';

DROP INDEX IF EXISTS "evento_curso_id_inicio_idx";
CREATE INDEX "ix_evento_curso_inicio" ON "evento" ("curso_id", "inicio")
  WHERE "status" = 'PUBLICADO';

DROP INDEX IF EXISTS "evento_faculdade_id_inicio_idx";
CREATE INDEX "ix_evento_faculdade_inicio" ON "evento" ("faculdade_id", "inicio")
  WHERE "status" = 'PUBLICADO';

DROP INDEX IF EXISTS "participacao_evento_id_posicao_fila_idx";
CREATE INDEX "ix_participacao_fila" ON "participacao" ("evento_id", "posicao_fila")
  WHERE "status" = 'LISTA_ESPERA';

DROP INDEX IF EXISTS "participacao_pagamento_expira_em_idx";
CREATE INDEX "ix_participacao_expira" ON "participacao" ("pagamento_expira_em")
  WHERE "status" = 'PENDENTE_PAGAMENTO';

DROP INDEX IF EXISTS "participacao_oferta_expira_em_idx";
CREATE INDEX "ix_participacao_oferta" ON "participacao" ("oferta_expira_em")
  WHERE "status" = 'OFERTA_PENDENTE';

DROP INDEX IF EXISTS "publicacao_evento_id_criado_em_idx";
CREATE INDEX "ix_publicacao_evento" ON "publicacao" ("evento_id", "criado_em" DESC)
  WHERE "removida" = false;

DROP INDEX IF EXISTS "notificacao_destinatario_id_criado_em_idx";
CREATE INDEX "ix_notificacao_nao_lida" ON "notificacao" ("destinatario_id", "criado_em" DESC)
  WHERE "lida" = false;
