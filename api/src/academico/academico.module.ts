import { Module } from '@nestjs/common';
import { AcademicoController } from './academico.controller';
import { AcademicoService } from './academico.service';

@Module({
  controllers: [AcademicoController],
  providers: [AcademicoService],
  exports: [AcademicoService],
})
export class AcademicoModule {}
