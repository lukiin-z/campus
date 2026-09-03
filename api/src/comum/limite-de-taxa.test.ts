import { describe, expect, it } from 'vitest';
import { JanelaDeTaxa } from './limite-de-taxa.guard';
import { STATUS_ATIVOS, STATUS_QUE_OCUPAM } from './status';

/**
 * O limite de taxa das rotas de credencial (nenhum RNF o exige; ver o guard).
 *
 * O relógio é parâmetro (`registrar(chave, agora)`) justamente para o teste não
 * precisar esperar 60 segundos: janela verificada por espera é teste
 * intermitente, e teste intermitente é teste que alguém desliga.
 */
describe('JanelaDeTaxa', () => {
  const TETO = 3;
  const JANELA = 60_000;

  it('permite até o teto e recusa a partir dele', () => {
    const janela = new JanelaDeTaxa(TETO, JANELA);
    const t0 = 1_000_000;

    expect(janela.registrar('ip-a', t0)).toBeNull();
    expect(janela.registrar('ip-a', t0 + 10)).toBeNull();
    expect(janela.registrar('ip-a', t0 + 20)).toBeNull();
    // A quarta passa do teto de 3.
    expect(janela.registrar('ip-a', t0 + 30)).toBeGreaterThan(0);
  });

  it('a recusa informa quantos segundos faltam para a janela reiniciar', () => {
    const janela = new JanelaDeTaxa(1, JANELA);
    const t0 = 1_000_000;

    janela.registrar('ip-a', t0);
    // 15 s depois da abertura: faltam 45 s.
    expect(janela.registrar('ip-a', t0 + 15_000)).toBe(45);
  });

  it('a contagem reinicia quando a janela vira', () => {
    const janela = new JanelaDeTaxa(1, JANELA);
    const t0 = 1_000_000;

    janela.registrar('ip-a', t0);
    expect(janela.registrar('ip-a', t0 + 100)).not.toBeNull();
    expect(janela.registrar('ip-a', t0 + JANELA + 1)).toBeNull();
  });

  it('conta por chave: um IP bloqueado não bloqueia outro', () => {
    const janela = new JanelaDeTaxa(1, JANELA);
    const t0 = 1_000_000;

    janela.registrar('ip-a', t0);
    expect(janela.registrar('ip-a', t0 + 10)).not.toBeNull();
    // A chave inclui método e caminho, então login e cadastro também não se
    // atropelam.
    expect(janela.registrar('ip-b', t0 + 10)).toBeNull();
  });

  it('não vaza memória: chave vencida sai do mapa', () => {
    const janela = new JanelaDeTaxa(TETO, JANELA);
    const t0 = 1_000_000;

    for (let i = 0; i < 50; i += 1) janela.registrar(`ip-${i}`, t0);
    expect(janela.tamanho).toBe(50);

    /*
     * Sem a limpeza, cada IP novo deixaria uma chave para sempre — e um
     * atacante com IPs rotativos derrubaria o processo por memória, que é o
     * oposto do que um limite de taxa deveria conseguir.
     */
    janela.registrar('ip-novo', t0 + JANELA + 1);
    expect(janela.tamanho).toBe(1);
  });
});

/**
 * As listas de status do `WHERE` são derivadas de `isActive` e `occupiesSpot`.
 * Este teste é a amarra contra alguém "otimizar" trocando-as por array literal:
 * o dia em que `occupiesSpot` mudar, o literal continuaria compilando e a
 * contagem de `ocupadas` ficaria errada em todo evento com fila.
 */
describe('listas de status derivadas do domínio', () => {
  it('RN-015: cinco status contam como participação ativa', () => {
    expect([...STATUS_ATIVOS].sort()).toEqual(
      ['CONFIRMADA', 'LISTA_ESPERA', 'OFERTA_PENDENTE', 'PENDENTE_PAGAMENTO', 'PRESENTE'].sort(),
    );
  });

  it('RN-004: quatro status ocupam vaga, e LISTA_ESPERA não é um deles', () => {
    expect([...STATUS_QUE_OCUPAM].sort()).toEqual(
      ['CONFIRMADA', 'OFERTA_PENDENTE', 'PENDENTE_PAGAMENTO', 'PRESENTE'].sort(),
    );
    expect(STATUS_QUE_OCUPAM).not.toContain('LISTA_ESPERA');
  });
});
