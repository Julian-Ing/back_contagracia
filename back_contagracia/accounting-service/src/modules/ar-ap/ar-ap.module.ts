import { Module } from '@nestjs/common';
import { ArApController } from './ar-ap.controller';
import { ArApService } from './ar-ap.service';

@Module({
  controllers: [ArApController],
  providers: [ArApService],
  exports: [ArApService],
})
export class ArApModule {}
