import { Module } from '@nestjs/common';
import { StorageTransfersController } from './storage-transfers.controller';
import { StorageTransfersService } from './storage-transfers.service';

@Module({
  controllers: [StorageTransfersController],
  providers: [StorageTransfersService],
  exports: [StorageTransfersService],
})
export class StorageTransfersModule {}
