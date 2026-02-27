import { Module } from '@nestjs/common';
import { HrPortalController } from './hr-portal.controller';
import { HrPortalService } from './hr-portal.service';

@Module({
  controllers: [HrPortalController],
  providers: [HrPortalService],
})
export class HrPortalModule {}
