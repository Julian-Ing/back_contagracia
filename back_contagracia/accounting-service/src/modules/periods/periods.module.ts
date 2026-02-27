import { Module } from '@nestjs/common';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';
import { OpeningBalanceTemplateService } from './opening-balance-template.service';
import { OpeningBalanceImportService } from './opening-balance-import.service';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [JournalEntriesModule],
  controllers: [PeriodsController],
  providers: [PeriodsService, OpeningBalanceTemplateService, OpeningBalanceImportService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
