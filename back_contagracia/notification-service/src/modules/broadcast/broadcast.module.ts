import { Module } from '@nestjs/common';
import { BroadcastController } from './broadcast.controller.js';
import { BroadcastService } from './broadcast.service.js';
import { CompanyNotificationsModule } from '../company-notifications/company-notifications.module.js';

@Module({
  imports: [CompanyNotificationsModule],
  controllers: [BroadcastController],
  providers: [BroadcastService],
})
export class BroadcastModule {}
