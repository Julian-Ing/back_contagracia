import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ComunicadosController } from './comunicados.controller';
import { ComunicadosService } from './comunicados.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule, HttpModule],
  controllers: [ComunicadosController],
  providers: [ComunicadosService],
  exports: [ComunicadosService],
})
export class ComunicadosModule {}
