import { Module } from '@nestjs/common';
import { PerformanceEvaluationsController } from './performance-evaluations.controller';
import { PerformanceEvaluationsService } from './performance-evaluations.service';
import { EvaluationsAnalysisService } from './evaluations-analysis.service';

@Module({
  controllers: [PerformanceEvaluationsController],
  providers: [PerformanceEvaluationsService, EvaluationsAnalysisService],
  exports: [PerformanceEvaluationsService, EvaluationsAnalysisService],
})
export class PerformanceEvaluationsModule {}
