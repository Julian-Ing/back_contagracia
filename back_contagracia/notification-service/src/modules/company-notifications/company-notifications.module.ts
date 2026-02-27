import { Module } from '@nestjs/common';
import { CompanyNotificationsController } from './company-notifications.controller.js';
import { CompanyNotificationsService } from './company-notifications.service.js';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job.js';

@Module({
  controllers: [CompanyNotificationsController],
  providers: [CompanyNotificationsService, NotificationCleanupJob],
  exports: [CompanyNotificationsService, NotificationCleanupJob],
})
export class CompanyNotificationsModule {}
