import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { WarehousesModule } from '../warehouses/warehouses.module';

@Module({
  imports: [WarehousesModule],
  controllers: [InternalController],
})
export class InternalModule {}
