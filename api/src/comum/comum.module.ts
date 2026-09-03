import { Global, Module } from '@nestjs/common';
import { AcessoAEventos } from './acesso-evento.service';
import { LimiteDeTaxaGuard } from './limite-de-taxa.guard';

/**
 * Peças que todo módulo de domínio usa.
 *
 * `AcessoAEventos` é global de propósito: ele é o portão de alcance (RN-001), e
 * um módulo que precise dele e esqueça o `imports` é um módulo cuja escrita
 * roda sem verificar alcance — o defeito nº 3 do CP4. Deixar a peça sempre
 * disponível remove o modo de falha.
 *
 * `LimiteDeTaxaGuard` guarda estado (o contador da janela). Sendo provider de um
 * módulo global, existe uma instância só — duas instâncias contariam metade
 * cada e o limite valeria pelo dobro.
 */
@Global()
@Module({
  providers: [AcessoAEventos, LimiteDeTaxaGuard],
  exports: [AcessoAEventos, LimiteDeTaxaGuard],
})
export class ComumModule {}
