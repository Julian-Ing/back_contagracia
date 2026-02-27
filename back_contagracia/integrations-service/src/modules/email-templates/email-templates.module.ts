import { Module } from '@nestjs/common';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailSendsController } from './email-sends.controller';
import { EmailTemplatesService } from './email-templates.service';

@Module({
  controllers: [EmailTemplatesController, EmailSendsController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
