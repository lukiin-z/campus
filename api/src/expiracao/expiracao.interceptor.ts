import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { from, switchMap, type Observable } from 'rxjs';
import { ExpiracaoService } from './expiracao.service';

/**
 * Aplica os prazos vencidos na **borda** de cada requisição, antes de o handler
 * decidir qualquer coisa.
 *
 * ## Por que na borda, e não só num job
 *
 * Porque foi assim que o defeito apareceu. O cronômetro da cobrança chegava a
 * zero na tela e o `POST /pagamentos/:id/simular` continuava confirmando o
 * pagamento — a participação nunca virava `EXPIRADA`. Com a verificação na
 * borda, a requisição que tentaria pagar depois do prazo já encontra a
 * participação expirada e recebe a recusa certa.
 *
 * O job agendado continua sendo necessário para o caso oposto: ninguém pedindo
 * nada. Sem ele, a vaga expirada de um evento sem tráfego fica presa e a fila
 * espera por ela. `ExpiracaoService.aplicar()` é público exatamente para isso.
 *
 * ## Por que erro aqui não derruba a requisição
 *
 * A expiração é trabalho de manutenção, não a resposta que o usuário pediu.
 * Falha na varredura (deadlock, timeout de transação) é registrada e a
 * requisição segue: um `GET /eventos` que devolve `500` porque a rotina de
 * prazos tropeçou é pior do que um `GET /eventos` que mostra uma vaga que vai
 * expirar dois segundos depois.
 */
@Injectable()
export class ExpiracaoInterceptor implements NestInterceptor {
  private readonly log = new Logger(ExpiracaoInterceptor.name);

  constructor(private readonly expiracao: ExpiracaoService) {}

  intercept(_contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    const varredura = this.expiracao.aplicar().catch((erro: unknown) => {
      this.log.warn(
        `varredura de prazos falhou e a requisição seguiu: ${
          erro instanceof Error ? erro.message : 'motivo desconhecido'
        }`,
      );
    });

    // `switchMap` e não `tap`: o handler só roda DEPOIS da varredura. Se
    // rodassem em paralelo, o handler poderia ler a participação um instante
    // antes de ela virar `EXPIRADA` — que é o defeito que este interceptor
    // existe para fechar.
    return from(varredura).pipe(switchMap(() => proximo.handle()));
  }
}
