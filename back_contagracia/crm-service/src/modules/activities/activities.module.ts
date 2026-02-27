import { Module, forwardRef } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { TenantModule } from '../tenant/tenant.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [
    TenantModule,
    forwardRef(() => AutomationsModule),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
