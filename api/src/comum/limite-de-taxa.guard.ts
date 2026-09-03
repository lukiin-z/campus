import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AMBIENTE, type Ambiente } from '../config/ambiente';
import { LimiteExcedido } from './erros';
import type { RequisicaoAutenticada } from './titular';

/**
 * Limite de taxa nas rotas de credencial — RNF-021.
 *
 * ## O que é e o que não é
 *
 * É uma janela fixa em memória, por (IP, método, caminho). Serve ao que o
 * contrato promete em `/auth/cadastro` e `/auth/login`: `429` depois de N
 * tentativas, para que tentar senha por força bruta custe tempo.
 *
 * **Não é** limite distribuído. O contador vive no processo, então duas
 * instâncias atrás de um balanceador toleram o dobro das tentativas, e um
 * reinício zera a contagem. A alternativa correta é contador em Redis, que
 * exigiria uma dependência e um serviço a mais — decisão de infraestrutura, não
 * desta lane. Está escrito aqui de propósito: um limite que parece distribuído
 * e não é dá falsa segurança, o que é pior que não ter.
 *
 * Janela fixa (e não deslizante) é escolha consciente: aceita uma rajada na
 * virada da janela e custa um inteiro por chave. Para deter força bruta de
 * senha, é suficiente.
 */
interface Contagem {
  tentativas: number;
  reiniciaEm: number;
}

/**
 * O contador, separado do guard.
 *
 * A separação existe para o teste: exercitar o guard exigiria fabricar um
 * `ExecutionContext`, o que só se consegue com `as unknown as` — que este
 * projeto não usa. Com a contagem em uma classe própria, o teste exercita a
 * regra (a janela, o teto, a limpeza) e o guard fica sendo só a adaptação
 * HTTP.
 */
export class JanelaDeTaxa {
  private readonly contagens = new Map<string, Contagem>();

  constructor(
    private readonly teto: number,
    private readonly janelaMs: number,
  ) {}

  /**
   * Registra uma tentativa.
   *
   * @returns `null` quando a tentativa é permitida, ou os segundos que faltam
   *   para a janela reiniciar quando o teto foi passado.
   */
  registrar(chave: string, agora: number): number | null {
    const registro = this.contagens.get(chave);

    if (!registro || registro.reiniciaEm <= agora) {
      this.contagens.set(chave, { tentativas: 1, reiniciaEm: agora + this.janelaMs });
      this.limparVencidos(agora);
      return null;
    }

    registro.tentativas += 1;
    if (registro.tentativas > this.teto) {
      return Math.ceil((registro.reiniciaEm - agora) / 1000);
    }
    return null;
  }

  /** Quantas chaves estão sendo contadas. Exposto para o teste da limpeza. */
  get tamanho(): number {
    return this.contagens.size;
  }

  /**
   * Sem isto o `Map` cresce sem limite: cada IP novo deixa uma chave que
   * ninguém remove, e o processo vaza memória a cada requisição de rede hostil
   * — o oposto do que um limite de taxa deveria conseguir.
   */
  private limparVencidos(agora: number): void {
    for (const [chave, registro] of this.contagens) {
      if (registro.reiniciaEm <= agora) this.contagens.delete(chave);
    }
  }
}

@Injectable()
export class LimiteDeTaxaGuard implements CanActivate {
  private readonly janela: JanelaDeTaxa;

  constructor(@Inject(AMBIENTE) ambiente: Ambiente) {
    this.janela = new JanelaDeTaxa(
      ambiente.RATE_LIMIT_TENTATIVAS,
      ambiente.RATE_LIMIT_JANELA_SEGUNDOS * 1000,
    );
  }

  canActivate(contexto: ExecutionContext): boolean {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const chave = `${requisicao.ip ?? 'desconhecido'} ${requisicao.method} ${requisicao.path}`;

    const esperar = this.janela.registrar(chave, Date.now());
    if (esperar !== null) throw new LimiteExcedido(esperar);
    return true;
  }
}
