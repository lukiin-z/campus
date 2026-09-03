import { describe, expect, it } from 'vitest';
import { ApiError } from '../services';
import { queryClient, queryKeys } from './queryClient';

/**
 * A configuração do cache tem duas decisões, e nenhuma estava verificada.
 *
 * O arquivo aparecia com **0% de cobertura** depois que `src/lib/` entrou na
 * medição — e não é arquivo de configuração inerte: `retry` decide o que NÃO
 * repetir, e `queryKeys` decide o que invalida o quê. Errar a primeira faz o
 * usuário esperar o dobro por uma mensagem que não vai mudar; errar a segunda
 * faz a tela mostrar dado velho depois de uma escrita bem-sucedida.
 */

/** O predicado de `retry`, como o React Query o chamará. */
function devoRepetir(tentativas: number, erro: unknown): boolean {
  const opcao = queryClient.getDefaultOptions().queries?.retry;
  if (typeof opcao !== 'function') throw new Error('retry deveria ser uma função');
  return opcao(tentativas, erro as Error) === true;
}

describe('retry', () => {
  it('não repete erro de negócio: a resposta não muda na segunda tentativa', () => {
    const conflito = new ApiError(409, 'JA_INSCRITO', 'Você já está inscrito.');

    expect(devoRepetir(0, conflito)).toBe(false);
  });

  it('não repete nem um 422, que é regra violada e não falha transitória', () => {
    const recusa = new ApiError(422, 'PRAZO_ENCERRADO', 'As inscrições encerraram.');

    expect(devoRepetir(0, recusa)).toBe(false);
  });

  it('repete falha de rede uma vez, porque essa pode mudar', () => {
    const rede = new Error('Failed to fetch');

    expect(devoRepetir(0, rede)).toBe(true);
  });

  it('para na segunda: uma repetição, não um laço', () => {
    const rede = new Error('Failed to fetch');

    expect(devoRepetir(1, rede)).toBe(false);
  });

  it('mutação nunca repete — repetir escrita é duplicar efeito', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});

describe('queryKeys', () => {
  /*
   * Duas chaves iguais para coisas diferentes é o defeito silencioso deste
   * arquivo: a invalidação de uma passa a limpar a outra, e o sintoma aparece
   * como "às vezes a tela não atualiza".
   */
  it('nenhuma chave colide com outra', () => {
    const ID_A = 'evt-001';
    const ID_B = 'evt-002';

    const geradas = [
      queryKeys.sessao,
      queryKeys.eventos(),
      queryKeys.eventos({ alcance: 'TURMA' }),
      queryKeys.destaques,
      queryKeys.evento(ID_A),
      queryKeys.evento(ID_B),
      queryKeys.minhasParticipacoes,
      queryKeys.participacao(ID_A),
      queryKeys.feed,
      queryKeys.eventosPublicaveis,
      queryKeys.notificacoes,
      queryKeys.faculdade,
      queryKeys.cursos,
      queryKeys.turmas(ID_A),
      queryKeys.pagamento(ID_A),
      queryKeys.tokenIngresso(ID_A),
      queryKeys.painelCheckin(ID_A),
    ].map((chave) => JSON.stringify(chave));

    expect(new Set(geradas).size).toBe(geradas.length);
  });

  it('a chave de um id não colide com a de outro', () => {
    expect(queryKeys.evento('a')).not.toEqual(queryKeys.evento('b'));
    expect(queryKeys.turmas('a')).not.toEqual(queryKeys.turmas('b'));
  });

  it('destaques fica sob o prefixo de eventos, para invalidar junto', () => {
    /*
     * Isto é intencional e vale registrar: criar um evento precisa limpar a
     * lista E os destaques. Compartilhar o primeiro segmento é o que faz uma
     * invalidação em `['eventos']` alcançar os dois.
     */
    expect(queryKeys.destaques[0]).toBe('eventos');
    expect(queryKeys.eventos()[0]).toBe('eventos');
  });
});
