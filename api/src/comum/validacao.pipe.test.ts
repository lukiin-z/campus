import { credenciaisSchema, novoPagamentoSchema, novoEventoSchema } from '@campus/shared';
import { describe, expect, it } from 'vitest';
import { ErroDeNegocio } from './erros';
import { ZodValidationPipe } from './validacao.pipe';

/**
 * O pipe é a única porta de entrada de corpo na API. O que se testa aqui é a
 * FORMA da recusa — `{ erro, mensagem, detalhes: [{ campo, mensagem }] }` com
 * `422` — porque é ela que o formulário do app consome para pintar o campo
 * errado. Uma recusa com forma diferente produz o sintoma clássico: a tela
 * "não faz nada" ao enviar, porque o `422` chegou num formato que ela não sabe
 * ler.
 *
 * As regras dos schemas já têm teste em `packages/shared` (243 casos). Aqui
 * eles são usados como schemas reais em vez de um schema de mentira: um pipe
 * que passa com `z.object({ a: z.string() })` e falha com `novoEventoSchema`
 * (que tem `superRefine` e caminho aninhado) não teria sido pego.
 */

describe('ZodValidationPipe', () => {
  it('devolve o dado transformado pelo schema, não o corpo cru', () => {
    const resultado = new ZodValidationPipe(credenciaisSchema).transform({
      // O schema tem `.trim().toLowerCase()`: o pipe precisa devolver o valor
      // TRANSFORMADO, senão o `findUnique({ where: { email } })` procuraria o
      // texto original e não acharia a conta.
      email: '  Marina.Alves@FIAP.com.br ',
      senha: 'campus123',
    });

    expect(resultado.email).toBe('marina.alves@fiap.com.br');
  });

  it('recusa com 422 e um detalhe por campo', () => {
    let capturado: unknown;
    try {
      new ZodValidationPipe(credenciaisSchema).transform({ email: 'sem-arroba', senha: '123' });
    } catch (erro: unknown) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ErroDeNegocio);
    if (!(capturado instanceof ErroDeNegocio)) return;

    expect(capturado.getStatus()).toBe(422);
    expect(capturado.codigo).toBe('CORPO_INVALIDO');

    const detalhes = capturado.corpo().detalhes ?? [];
    expect(detalhes.map((d) => d.campo).sort()).toEqual(['email', 'senha']);
    // A mensagem é a do schema, escrita em português — nunca a padrão do Zod.
    expect(detalhes.find((d) => d.campo === 'senha')?.mensagem).toBe(
      'A senha tem pelo menos 8 caracteres.',
    );
  });

  it('caminho aninhado vira campo com ponto, como o formulário espera', () => {
    let capturado: unknown;
    try {
      new ZodValidationPipe(novoEventoSchema).transform({
        titulo: 'Semana de Tecnologia',
        descricao: 'Uma descrição com mais de vinte caracteres para passar do piso.',
        alcance: 'TURMA',
        inicio: '2026-10-01T13:00:00.000Z',
        fim: '2026-10-01T18:00:00.000Z',
        local: 'Auditório',
        capacidade: 40,
        preco: 0,
        publicar: true,
        // `ESCOLHA_UNICA` sem opções: o erro nasce no `superRefine`, com
        // caminho `['perguntas', 0, 'opcoes']`.
        perguntas: [{ enunciado: 'Qual turno?', tipo: 'ESCOLHA_UNICA', obrigatoria: true }],
      });
    } catch (erro: unknown) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ErroDeNegocio);
    if (!(capturado instanceof ErroDeNegocio)) return;

    const campos = (capturado.corpo().detalhes ?? []).map((d) => d.campo);
    expect(campos).toContain('perguntas.0.opcoes');
  });

  it('RNF-022: número de cartão no corpo é recusado, porque o schema é estrito', () => {
    let capturado: unknown;
    try {
      new ZodValidationPipe(novoPagamentoSchema).transform({
        metodo: 'CARTAO_CREDITO',
        cartao: {
          ultimosQuatro: '4242',
          bandeira: 'Visa',
          titular: 'MARINA ALVES',
          // Campo proibido. `.strict()` no schema é o que faz RNF-022 ser
          // propriedade do CONTRATO, e não disciplina de quem chama.
          numero: '4242424242424242',
        },
      });
    } catch (erro: unknown) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ErroDeNegocio);
    if (!(capturado instanceof ErroDeNegocio)) return;
    expect(capturado.getStatus()).toBe(422);
  });

  it('corpo ausente recusa com campo "(corpo)" em vez de campo vazio', () => {
    let capturado: unknown;
    try {
      new ZodValidationPipe(credenciaisSchema).transform(undefined);
    } catch (erro: unknown) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ErroDeNegocio);
    if (!(capturado instanceof ErroDeNegocio)) return;
    expect((capturado.corpo().detalhes ?? [])[0]?.campo).toBe('(corpo)');
  });
});
