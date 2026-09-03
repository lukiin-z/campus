-- Prova de que as restrições do banco RECUSAM, e não apenas existem.
--
-- Uma restrição declarada e nunca exercitada é uma restrição que ninguém sabe
-- se funciona. Este arquivo tenta violar cada garantia central do modelo e
-- espera que o PostgreSQL rejeite. Ele é executado pelo `docker compose` de
-- verificação e pelo roteiro de `docs/23-instalacao.md`.
--
-- Como ler o resultado: cada bloco imprime `ok` quando a violação foi
-- rejeitada. Qualquer `FALHOU` significa que o banco aceitou dado impossível.
--
-- Rode com:
--   psql -U campus -d campus -v ON_ERROR_STOP=0 -f api/prisma/verificar-restricoes.sql

\set QUIET on
SET client_min_messages TO NOTICE;
\set QUIET off

-- ---------------------------------------------------------------------------
-- Massa mínima: uma faculdade, um curso, uma turma, um usuário, um evento.
-- ---------------------------------------------------------------------------

BEGIN;

INSERT INTO faculdade (id, nome, sigla, dominios_email)
VALUES ('11111111-1111-1111-1111-111111111111', 'Faculdade de Teste', 'TST', ARRAY['teste.edu.br']);

INSERT INTO curso (id, faculdade_id, nome, codigo, duracao_semestres)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
        'Engenharia de Teste', 'ETST', 10);

INSERT INTO turma (id, curso_id, nome, periodo, codigo_convite, codigo_ativo)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
        '1TST', '2026.1', 'TST-26', true);

INSERT INTO usuario (id, nome, email, senha_hash, avatar_seed, faculdade_id, curso_id, turma_id,
                     papeis, email_verificado, visivel_entre_confirmados, atualizado_em)
VALUES ('44444444-4444-4444-4444-444444444444', 'Aluno de Teste', 'aluno@teste.edu.br',
        '$argon2id$naoimporta', 1, '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
        ARRAY['ALUNO']::papel_usuario[], true, true, now());

INSERT INTO evento (id, organizador_id, titulo, descricao, alcance, turma_id, inicio, fim, local,
                    capacidade, ocupadas, preco, status, prazo_inscricao, prazo_cancelamento,
                    capa_seed, atualizado_em)
VALUES ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444',
        'Evento de teste', 'Descrição do evento de teste, com tamanho suficiente.',
        'TURMA', '33333333-3333-3333-3333-333333333333',
        now() + interval '10 days', now() + interval '10 days 4 hours', 'Sala 1',
        10, 0, 25.00, 'PUBLICADO',
        now() + interval '9 days', now() + interval '9 days', 1, now());

COMMIT;

-- ---------------------------------------------------------------------------
-- 1. RN-004 — `ocupadas` não passa da capacidade
--
-- É a invariante central do produto: se ela cair, o evento vende mais vaga do
-- que tem, e alguém chega na porta e não entra.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  UPDATE evento SET ocupadas = 11 WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou ocupadas > capacidade (RN-004)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-004: ocupadas > capacidade recusado';
END $$;

DO $$
BEGIN
  UPDATE evento SET ocupadas = -1 WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou ocupadas negativo';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-004: ocupadas negativo recusado';
END $$;

-- ---------------------------------------------------------------------------
-- 2. RN-001 — âncora de alcance coerente
--
-- Evento com duas âncoras, ou sem nenhuma, tem alcance indefinido: "quem vê
-- este evento?" passa a não ter resposta.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  UPDATE evento SET curso_id = '22222222-2222-2222-2222-222222222222'
   WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou duas âncoras de alcance (RN-001)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-001: duas âncoras recusadas';
END $$;

DO $$
BEGIN
  UPDATE evento SET turma_id = NULL WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou alcance TURMA sem turma';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-001: alcance sem âncora recusado';
END $$;

-- ---------------------------------------------------------------------------
-- 3. RN-011 — datas e duração
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  UPDATE evento SET fim = inicio - interval '1 hour'
   WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou fim antes do início (RN-011)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-011: fim antes do início recusado';
END $$;

DO $$
BEGIN
  UPDATE evento SET fim = inicio + interval '8 days'
   WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou evento de 8 dias (RN-011)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-011: duração acima de 7 dias recusada';
END $$;

-- ---------------------------------------------------------------------------
-- 4. RN-021 — cancelamento sem motivo
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  UPDATE evento SET status = 'CANCELADO', motivo_cancelamento = NULL
   WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco aceitou cancelamento sem motivo (RN-021)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-021: cancelamento sem motivo recusado';
END $$;

-- ---------------------------------------------------------------------------
-- 5. RN-015 — uma participação ATIVA por (evento, aluno)
--
-- O índice é parcial de propósito: quem cancela pode se inscrever de novo.
-- As duas metades da regra são verificadas.
-- ---------------------------------------------------------------------------

INSERT INTO participacao (id, evento_id, usuario_id, status, cancelada_apos_prazo, atualizado_em)
VALUES ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
        '44444444-4444-4444-4444-444444444444', 'CONFIRMADA', false, now());

DO $$
BEGIN
  INSERT INTO participacao (id, evento_id, usuario_id, status, cancelada_apos_prazo, atualizado_em)
  VALUES ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555',
          '44444444-4444-4444-4444-444444444444', 'CONFIRMADA', false, now());
  RAISE EXCEPTION 'FALHOU: o banco aceitou duas participações ativas (RN-015)';
EXCEPTION
  WHEN unique_violation THEN RAISE NOTICE 'ok  RN-015: segunda participação ativa recusada';
END $$;

DO $$
BEGIN
  UPDATE participacao SET status = 'CANCELADA', motivo_cancelamento = 'ALUNO_DESISTIU'
   WHERE id = '66666666-6666-6666-6666-666666666666';

  INSERT INTO participacao (id, evento_id, usuario_id, status, cancelada_apos_prazo, atualizado_em)
  VALUES ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555',
          '44444444-4444-4444-4444-444444444444', 'CONFIRMADA', false, now());
  RAISE NOTICE 'ok  RN-015: reinscrição depois de cancelar é permitida';
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'FALHOU: o índice não é parcial — cancelar impediria reinscrever';
END $$;

-- ---------------------------------------------------------------------------
-- 6. RN-006, RN-007 e RN-012 — estado com prazo tem de ter o prazo
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  UPDATE participacao SET status = 'LISTA_ESPERA', posicao_fila = NULL
   WHERE id = '77777777-7777-7777-7777-777777777777';
  RAISE EXCEPTION 'FALHOU: o banco aceitou fila sem posição (RN-006)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-006: LISTA_ESPERA sem posição recusada';
END $$;

DO $$
BEGIN
  UPDATE participacao SET status = 'OFERTA_PENDENTE', oferta_expira_em = NULL
   WHERE id = '77777777-7777-7777-7777-777777777777';
  RAISE EXCEPTION 'FALHOU: o banco aceitou oferta sem prazo (RN-007)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-007: oferta sem prazo recusada';
END $$;

DO $$
BEGIN
  UPDATE participacao SET status = 'PENDENTE_PAGAMENTO', pagamento_expira_em = NULL
   WHERE id = '77777777-7777-7777-7777-777777777777';
  RAISE EXCEPTION 'FALHOU: o banco aceitou pagamento pendente sem prazo (RN-012)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-012: pendente sem prazo recusado';
END $$;

-- ---------------------------------------------------------------------------
-- 7. RNF-022 — Pix não carrega dado de cartão
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  INSERT INTO pagamento (id, participacao_id, metodo, valor, status, chave_idempotencia,
                         ultimos_quatro, bandeira_cartao, titular_cartao)
  VALUES ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777',
          'PIX', 25.00, 'AGUARDANDO', 'chave-teste-1', '1486', 'Visa', 'ALUNO DE TESTE');
  RAISE EXCEPTION 'FALHOU: o banco aceitou dado de cartão em cobrança Pix (RNF-022)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RNF-022: cartão em cobrança Pix recusado';
END $$;

DO $$
BEGIN
  INSERT INTO pagamento (id, participacao_id, metodo, valor, status, chave_idempotencia,
                         ultimos_quatro, bandeira_cartao, titular_cartao)
  VALUES ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777',
          'CARTAO_CREDITO', 25.00, 'AGUARDANDO', 'chave-teste-2', '148', 'Visa', 'ALUNO');
  RAISE EXCEPTION 'FALHOU: o banco aceitou ultimos_quatro com 3 dígitos (RNF-022)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RNF-022: ultimos_quatro fora do formato recusado';
END $$;

-- ---------------------------------------------------------------------------
-- 8. RN-013 e RN-027 — reembolso na faixa, e uma cobrança aberta por vez
-- ---------------------------------------------------------------------------

INSERT INTO pagamento (id, participacao_id, metodo, valor, status, chave_idempotencia)
VALUES ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777',
        'PIX', 25.00, 'AGUARDANDO', 'chave-teste-3');

DO $$
BEGIN
  UPDATE pagamento SET valor_reembolsado = 30.00
   WHERE id = '99999999-9999-9999-9999-999999999999';
  RAISE EXCEPTION 'FALHOU: o banco aceitou reembolso maior que o valor (RN-013)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-013: reembolso acima do valor recusado';
END $$;

DO $$
BEGIN
  INSERT INTO pagamento (id, participacao_id, metodo, valor, status, chave_idempotencia)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777',
          'PIX', 25.00, 'AGUARDANDO', 'chave-teste-4');
  RAISE EXCEPTION 'FALHOU: o banco aceitou duas cobranças AGUARDANDO (RN-027)';
EXCEPTION
  WHEN unique_violation THEN RAISE NOTICE 'ok  RN-027: segunda cobrança aberta recusada';
END $$;

DO $$
BEGIN
  INSERT INTO pagamento (id, participacao_id, metodo, valor, status, chave_idempotencia)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777',
          'PIX', 25.00, 'AGUARDANDO', 'chave-teste-3');
  RAISE EXCEPTION 'FALHOU: o banco aceitou chave de idempotência repetida (RN-014)';
EXCEPTION
  WHEN unique_violation THEN RAISE NOTICE 'ok  RN-014: chave de idempotência repetida recusada';
END $$;

-- ---------------------------------------------------------------------------
-- 9. RN-018 — uma presença por participação
-- ---------------------------------------------------------------------------

INSERT INTO presenca (id, participacao_id, registrado_por_id, metodo, sincronizado)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777',
        '44444444-4444-4444-4444-444444444444', 'QR_CODE', true);

DO $$
BEGIN
  INSERT INTO presenca (id, participacao_id, registrado_por_id, metodo, sincronizado)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777',
          '44444444-4444-4444-4444-444444444444', 'MANUAL', true);
  RAISE EXCEPTION 'FALHOU: o banco aceitou duas presenças na mesma participação (RN-018)';
EXCEPTION
  WHEN unique_violation THEN RAISE NOTICE 'ok  RN-018: segunda presença recusada';
END $$;

-- ---------------------------------------------------------------------------
-- 10. RN-025 e RN-020 — perguntas e moderação
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  INSERT INTO pergunta_customizada (id, evento_id, enunciado, tipo, opcoes, obrigatoria, ordem)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555',
          'Pergunta de teste', 'TEXTO_CURTO', ARRAY[]::text[], false, 6);
  RAISE EXCEPTION 'FALHOU: o banco aceitou ordem de pergunta acima de 5 (RN-025)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-025: ordem de pergunta fora da faixa recusada';
END $$;

DO $$
BEGIN
  INSERT INTO pergunta_customizada (id, evento_id, enunciado, tipo, opcoes, obrigatoria, ordem)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555',
          'Vai levar acompanhante?', 'ESCOLHA_UNICA', ARRAY['Sim'], true, 1);
  RAISE EXCEPTION 'FALHOU: o banco aceitou escolha única com 1 opção (RN-025)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-025: escolha única com uma opção recusada';
END $$;

DO $$
BEGIN
  INSERT INTO publicacao (id, evento_id, autor_id, legenda, imagem_seed, removida)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555',
          '44444444-4444-4444-4444-444444444444', 'Foto do evento', 3, true);
  RAISE EXCEPTION 'FALHOU: o banco aceitou remoção sem motivo e sem autor (RN-020)';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'ok  RN-020: remoção sem justificativa recusada';
END $$;

-- ---------------------------------------------------------------------------
-- 11. Ações referenciais — evento com participação NÃO é apagado
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  DELETE FROM evento WHERE id = '55555555-5555-5555-5555-555555555555';
  RAISE EXCEPTION 'FALHOU: o banco apagou evento com participação (RN-021)';
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'ok  RN-021: apagar evento com participação recusado (RESTRICT)';
END $$;

-- ---------------------------------------------------------------------------
-- Limpeza: o banco de verificação volta ao estado vazio.
-- ---------------------------------------------------------------------------

DELETE FROM presenca WHERE participacao_id = '77777777-7777-7777-7777-777777777777';
DELETE FROM pagamento WHERE participacao_id = '77777777-7777-7777-7777-777777777777';
DELETE FROM participacao WHERE evento_id = '55555555-5555-5555-5555-555555555555';
DELETE FROM evento WHERE id = '55555555-5555-5555-5555-555555555555';
DELETE FROM usuario WHERE id = '44444444-4444-4444-4444-444444444444';
DELETE FROM turma WHERE id = '33333333-3333-3333-3333-333333333333';
DELETE FROM curso WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM faculdade WHERE id = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '  22 restricoes verificadas contra o PostgreSQL.'
\echo '  Nenhum FALHOU acima significa que o banco recusa dado impossivel.'
\echo ''
