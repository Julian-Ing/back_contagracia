import { Module } from '@nestjs/common';
import { FeeConceptsController } from './fee-concepts.controller';
import { FeeConceptsService } from './fee-concepts.service';

@Module({
  controllers: [FeeConceptsController],
  providers: [FeeConceptsService],
  exports: [FeeConceptsService],
})
export class FeeConceptsModule {}
