import { Module } from '@nestjs/common';
import { ProductTransfersController } from './product-transfers.controller';
import { ProductTransfersService } from './product-transfers.service';

@Module({
  controllers: [ProductTransfersController],
  providers: [ProductTransfersService],
  exports: [ProductTransfersService],
})
export class ProductTransfersModule {}
