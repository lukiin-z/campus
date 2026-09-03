import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { ProjecaoDeEventos } from './projecao.service';

@Module({
  controllers: [EventosController],
  providers: [EventosService, ProjecaoDeEventos],
  exports: [EventosService, ProjecaoDeEventos],
})
export class EventosModule {}
