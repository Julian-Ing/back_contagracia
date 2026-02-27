import { Module } from '@nestjs/common';
import { TestSetController } from './test-set.controller';
import { TestSetService } from './test-set.service';

@Module({
  controllers: [TestSetController],
  providers: [TestSetService],
})
export class TestSetModule {}
