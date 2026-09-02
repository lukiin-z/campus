import type { PainelCheckin, PresencaView } from '../../types/domain';
import { numericCheckInCode } from '../../domain/checkin';

/**
 * Códigos para quem estiver avaliando poder colar no leitor simulado.
 *
 * Todos são DERIVADOS de participações que a API devolveu — `numericCheckInCode`
 * é determinístico sobre o id, então nenhum código fica escrito no fonte para
 * envelhecer no primeiro reseed do mock.
 *
 * A lista mistura os dois desfechos de propósito: um código que deve ser aceito
 * prova o caminho feliz, e um de quem já entrou prova a recusa de RN-018. As
 * duas coisas precisam ser demonstráveis.
 */

export interface DemoCode {
  codigo: string;
  pessoa: string;
  /** O que este código produz — dito antes de a pessoa colar, não depois. */
  efeito: string;
}

export function demoCodes(input: {
  /**
   * Confirmados que ainda não entraram, com o código de cada um. Vem do painel
   * (`GET /eventos/:id/checkin`) — antes a tela só conseguia listar a própria
   * inscrição do operador, e num evento organizado por outra pessoa a lista
   * saía vazia justamente onde ela mais serve.
   */
  aguardando: PainelCheckin['aguardando'];
  presencas: PresencaView[];
}): DemoCode[] {
  const aceitaveis = input.aguardando.map((pessoa) => ({
    codigo: pessoa.codigoNumerico,
    pessoa: pessoa.turma ? `${pessoa.nome} · ${pessoa.turma}` : pessoa.nome,
    efeito: 'confirmado e ainda não entrou: deve ser aceito.',
  }));

  const jaUsados = input.presencas.map((presenca) => ({
    codigo: numericCheckInCode(presenca.participacaoId),
    pessoa: presenca.participante.nome,
    efeito: 'já passou pela porta: mostra a recusa por ingresso repetido (RN-018).',
  }));

  // Dois aceitáveis e um já usado: o suficiente para mostrar os dois desfechos
  // sem transformar a tela em uma lista de códigos.
  return [...aceitaveis.slice(0, 2), ...jaUsados.slice(0, 1)];
}
