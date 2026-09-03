import { describe, expect, it } from 'vitest';
import { POLICY } from './domain/policy';
import {
  credenciaisSchema,
  entradaOnboardingSchema,
  leituraCheckinSchema,
  novaPublicacaoSchema,
  novoComentarioSchema,
  novoEventoSchema,
  novoPagamentoSchema,
  paginacaoSchema,
  resumoCartaoSchema,
  webhookPagamentoSchema,
} from './schemas';

/**
 * CT-039 — o contrato de escrita da API (RF-010, RF-028, RF-037, RNF-022).
 *
 * Estes schemas são a **única** validação de forma que existe, e valem nas duas
 * pontas: o formulário do app e o `ValidationPipe` da API usam o mesmo objeto.
 * Um furo aqui é um furo nos dois lugares ao mesmo tempo.
 *
 * O caso mais importante do arquivo é o de `resumoCartaoSchema`: RNF-022 se
 * cumpre pelo **formato do contrato**, não por disciplina de quem chama, e é
 * isso que se verifica — um corpo com o número do cartão tem de ser recusado
 * pelo schema, não ignorado por ele.
 */

const DAQUI_A_UM_MES = new Date(Date.now() + 30 * 24 * 3_600_000);

function eventoValido(sobrescreve: Record<string, unknown> = {}) {
  const inicio = DAQUI_A_UM_MES;
  const fim = new Date(inicio.getTime() + 6 * 3_600_000);
  return {
    titulo: 'Churrasco de encerramento',
    descricao: 'Rateio de R$ 25 com carne, bebida e caixa de som por conta do grupo.',
    alcance: 'TURMA',
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    local: 'Quadra do Campus 2',
    capacidade: 40,
    preco: 25,
    publicar: true,
    ...sobrescreve,
  };
}

describe('credenciaisSchema', () => {
  it('normaliza o e-mail: apara e baixa a caixa', () => {
    // Sem isto, `Marina@FIAP.com.br ` e `marina@fiap.com.br` seriam contas
    // diferentes — e a segunda tentativa de login "sem motivo" seria isto.
    const r = credenciaisSchema.parse({ email: '  MARINA@FIAP.com.BR ', senha: 'campus123' });
    expect(r.email).toBe('marina@fiap.com.br');
  });

  it('recusa e-mail incompleto e senha curta com mensagem em português', () => {
    const r = credenciaisSchema.safeParse({ email: 'marina@', senha: 'curta' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const mensagens = r.error.issues.map((i) => i.message).join(' ');
      expect(mensagens).toContain('e-mail');
      expect(mensagens).toContain('8 caracteres');
      // Nenhuma mensagem padrão do Zod chega ao usuário.
      expect(mensagens).not.toMatch(/String must contain|Invalid/);
    }
  });

  it('NÃO valida o domínio institucional, e é decisão', () => {
    // RN-002 depende da lista de domínios da faculdade, que é dado e não
    // constante. Se o schema a validasse, ele deixaria de ser um valor estático
    // compartilhável. Quem decide é `dominioInstitucional`.
    expect(credenciaisSchema.safeParse({ email: 'x@gmail.com', senha: 'campus123' }).success).toBe(
      true,
    );
  });
});

describe('entradaOnboardingSchema', () => {
  it('exige curso e código, e apara o código digitado', () => {
    const r = entradaOnboardingSchema.parse({ cursoId: 'cur-001', codigoConvite: ' 3ESPX-26 ' });
    expect(r.codigoConvite).toBe('3ESPX-26');
    expect(entradaOnboardingSchema.safeParse({ cursoId: '', codigoConvite: 'x' }).success).toBe(
      false,
    );
  });
});

describe('novoEventoSchema', () => {
  it('aceita um evento coerente', () => {
    expect(novoEventoSchema.safeParse(eventoValido()).success).toBe(true);
  });

  it('recusa fim antes ou igual ao início', () => {
    const inicio = DAQUI_A_UM_MES.toISOString();
    for (const fim of [inicio, new Date(DAQUI_A_UM_MES.getTime() - 3_600_000).toISOString()]) {
      const r = novoEventoSchema.safeParse(eventoValido({ inicio, fim }));
      expect(r.success).toBe(false);
    }
  });

  it('recusa duração acima do teto da política', () => {
    const fim = new Date(
      DAQUI_A_UM_MES.getTime() + (POLICY.MAX_EVENT_DURATION_DAYS + 1) * 24 * 3_600_000,
    ).toISOString();
    const r = novoEventoSchema.safeParse(eventoValido({ fim }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain(String(POLICY.MAX_EVENT_DURATION_DAYS));
    }
  });

  it('limites de capacidade e preço vêm da POLICY, não de literais', () => {
    expect(
      novoEventoSchema.safeParse(eventoValido({ capacidade: POLICY.MIN_CAPACITY - 1 })).success,
    ).toBe(false);
    expect(
      novoEventoSchema.safeParse(eventoValido({ capacidade: POLICY.MAX_CAPACITY + 1 })).success,
    ).toBe(false);
    expect(novoEventoSchema.safeParse(eventoValido({ preco: POLICY.MAX_PRICE + 1 })).success).toBe(
      false,
    );
  });

  it('recusa preço com mais de duas casas decimais', () => {
    // `12.999` não existe em dinheiro, e arredondar em silêncio cobraria valor
    // diferente do que o organizador escreveu.
    expect(novoEventoSchema.safeParse(eventoValido({ preco: 12.999 })).success).toBe(false);
    expect(novoEventoSchema.safeParse(eventoValido({ preco: 12.99 })).success).toBe(true);
  });

  it('recusa prazo de inscrição depois do início', () => {
    const depois = new Date(DAQUI_A_UM_MES.getTime() + 3_600_000).toISOString();
    const r = novoEventoSchema.safeParse(eventoValido({ prazoInscricao: depois }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['prazoInscricao']);
  });

  it('recusa prazo de cancelamento depois do início', () => {
    /*
     * O par do caso acima, e ele estava faltando: `prazoInscricao` tinha teste e
     * `prazoCancelamento` não, embora os dois ramos sejam irmãos no mesmo
     * `superRefine`. A medição do CP6 mostrou as linhas 182-187 descobertas.
     */
    const depois = new Date(DAQUI_A_UM_MES.getTime() + 3_600_000).toISOString();
    const r = novoEventoSchema.safeParse(eventoValido({ prazoCancelamento: depois }));

    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['prazoCancelamento']);
  });

  it('aceita prazo de cancelamento exatamente no início', () => {
    const r = novoEventoSchema.safeParse(
      eventoValido({ prazoCancelamento: DAQUI_A_UM_MES.toISOString() }),
    );
    expect(r.success).toBe(true);
  });

  it('NÃO tem campo de âncora de alcance, e é decisão', () => {
    /*
     * `turmaId`/`cursoId`/`faculdadeId` não existem no corpo: a âncora vem do
     * vínculo de quem cria (RN-001). Aceitá-la do cliente permitiria publicar
     * um evento na turma de outra pessoa.
     */
    const r = novoEventoSchema.safeParse(eventoValido({ turmaId: 'tur-999' }));
    expect(r.success).toBe(true);
    if (r.success) expect('turmaId' in r.data).toBe(false);
  });

  it('recusa pergunta de escolha única sem opções suficientes', () => {
    const r = novoEventoSchema.safeParse(
      eventoValido({
        perguntas: [
          { enunciado: 'Vai levar acompanhante?', tipo: 'ESCOLHA_UNICA', obrigatoria: true },
        ],
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('2 opções');
  });

  it('recusa mais perguntas que o máximo da política', () => {
    const pergunta = { enunciado: 'Alguma restrição?', tipo: 'TEXTO_CURTO', obrigatoria: false };
    const excesso = Array.from({ length: POLICY.MAX_CUSTOM_QUESTIONS + 1 }, () => pergunta);
    expect(novoEventoSchema.safeParse(eventoValido({ perguntas: excesso })).success).toBe(false);
  });

  it('exige data com fuso — ISO sem offset é ambíguo', () => {
    expect(
      novoEventoSchema.safeParse(eventoValido({ inicio: '2026-09-12T13:00:00' })).success,
    ).toBe(false);
  });
});

describe('resumoCartaoSchema — RNF-022 pelo formato do contrato', () => {
  const valido = { ultimosQuatro: '1486', bandeira: 'Visa', titular: 'MARINA ALVES' };

  it('aceita o resumo com os três campos', () => {
    expect(resumoCartaoSchema.safeParse(valido).success).toBe(true);
  });

  it('RECUSA um corpo que traga o número do cartão', () => {
    /*
     * O caso central do arquivo. O objeto é `.strict()`, então um cliente que
     * tentasse enviar `numero` ou `cvv` recebe `422` — RNF-022 deixa de depender
     * de o desenvolvedor lembrar de não mandar.
     */
    for (const extra of [{ numero: '4539578763621486' }, { cvv: '123' }, { validade: '09/28' }]) {
      const r = resumoCartaoSchema.safeParse({ ...valido, ...extra });
      expect(r.success, `deveria recusar ${Object.keys(extra)[0]}`).toBe(false);
    }
  });

  it('exige exatamente quatro dígitos em ultimosQuatro', () => {
    for (const ruim of ['148', '14867', 'abcd', '']) {
      expect(resumoCartaoSchema.safeParse({ ...valido, ultimosQuatro: ruim }).success).toBe(false);
    }
  });
});

describe('novoPagamentoSchema', () => {
  const cartao = { ultimosQuatro: '4444', bandeira: 'Mastercard', titular: 'MARINA ALVES' };

  it('Pix sem cartão e cartão com resumo são aceitos', () => {
    expect(novoPagamentoSchema.safeParse({ metodo: 'PIX' }).success).toBe(true);
    expect(novoPagamentoSchema.safeParse({ metodo: 'CARTAO_CREDITO', cartao }).success).toBe(true);
  });

  it('cartão sem resumo é recusado', () => {
    const r = novoPagamentoSchema.safeParse({ metodo: 'CARTAO_DEBITO' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['cartao']);
  });

  it('Pix COM dados de cartão é recusado — a combinação não faz sentido', () => {
    // Aceitar em silêncio guardaria resumo de cartão numa cobrança Pix, e o
    // inventário LGPD passaria a ter dado que ninguém sabe de onde veio.
    expect(novoPagamentoSchema.safeParse({ metodo: 'PIX', cartao }).success).toBe(false);
  });

  it('método fora do enum é recusado com mensagem de produto', () => {
    const r = novoPagamentoSchema.safeParse({ metodo: 'BOLETO' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('Pix');
  });
});

describe('webhookPagamentoSchema', () => {
  it('exige a chave de idempotência', () => {
    // RN-014: sem ela não há como distinguir reenvio de cobrança nova, e
    // reenvio é o caso COMUM — gateway reenvia até receber 200.
    const r = webhookPagamentoSchema.safeParse({
      transacaoExternaId: 'sim-pag-001',
      valorPago: 45,
      pago: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['chaveIdempotencia']);
  });
});

describe('leituraCheckinSchema', () => {
  it('aceita as três formas de leitura sem classificá-las', () => {
    // Quem classifica é `classificarLeitura`, no servidor. O schema só garante
    // que há algo legível e que não é um corpo abusivo.
    for (const leitura of ['campus.v1.abc.def', '84110627', 'CMP-3ESPX-0184']) {
      expect(leituraCheckinSchema.safeParse({ leitura }).success).toBe(true);
    }
  });

  it('recusa leitura vazia e leitura absurdamente longa', () => {
    expect(leituraCheckinSchema.safeParse({ leitura: '   ' }).success).toBe(false);
    expect(leituraCheckinSchema.safeParse({ leitura: 'x'.repeat(4097) }).success).toBe(false);
  });
});

describe('feed', () => {
  it('legenda e comentário respeitam os limites que a tela mostra', () => {
    expect(novaPublicacaoSchema.safeParse({ eventoId: 'evt-009', legenda: 'a' }).success).toBe(
      false,
    );
    expect(
      novaPublicacaoSchema.safeParse({ eventoId: 'evt-009', legenda: 'x'.repeat(500) }).success,
    ).toBe(true);
    expect(novoComentarioSchema.safeParse({ texto: 'x'.repeat(281) }).success).toBe(false);
  });

  it('imagemSeed fora de 1..24 é recusado', () => {
    const base = { eventoId: 'evt-009', legenda: 'foto do churrasco' };
    expect(novaPublicacaoSchema.safeParse({ ...base, imagemSeed: 0 }).success).toBe(false);
    expect(novaPublicacaoSchema.safeParse({ ...base, imagemSeed: 25 }).success).toBe(false);
    expect(novaPublicacaoSchema.safeParse({ ...base, imagemSeed: 24 }).success).toBe(true);
  });
});

describe('paginacaoSchema', () => {
  it('converte texto de query string em número', () => {
    // Sem `coerce`, `?pagina=2` reprovaria por "esperava number, recebeu
    // string" — erro que não ajuda ninguém a corrigir a chamada.
    expect(paginacaoSchema.parse({ pagina: '2', porPagina: '50' })).toEqual({
      pagina: 2,
      porPagina: 50,
    });
  });

  it('tem padrão e teto', () => {
    expect(paginacaoSchema.parse({})).toEqual({ pagina: 1, porPagina: 20 });
    expect(paginacaoSchema.safeParse({ porPagina: '1000' }).success).toBe(false);
  });
});
