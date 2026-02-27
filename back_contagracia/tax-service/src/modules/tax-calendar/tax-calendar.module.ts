import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TaxCalendarController } from './tax-calendar.controller';
import { TaxCalendarService } from './tax-calendar.service';
import { PdfParserService } from './services/pdf-parser.service';
import { DianDownloaderService } from './services/dian-downloader.service';
import { ReminderService } from './services/reminder.service';
import { ReminderJob } from './jobs/reminder.job';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TaxCalendarController],
  providers: [
    TaxCalendarService,
    PdfParserService,
    DianDownloaderService,
    ReminderService,
    ReminderJob,
  ],
  exports: [
    TaxCalendarService,
    PdfParserService,
    DianDownloaderService,
    ReminderService,
    ReminderJob,
  ],
})
export class TaxCalendarModule {}
