import { Module } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';
import { RutController } from './rut.controller';
import { RutService } from './rut.service';

@Module({
  controllers: [RutController],
  providers: [RutService, DianApiService],
  exports: [RutService],
})
export class RutModule {}
