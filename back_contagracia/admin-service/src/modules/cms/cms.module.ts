import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PagesController } from './controllers/pages.controller';
import { SectionsController } from './controllers/sections.controller';
import { CmsPublicController } from './controllers/cms-public.controller';
import { PagesService } from './services/pages.service';
import { SectionsService } from './services/sections.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PagesController,
    SectionsController,
    CmsPublicController,
  ],
  providers: [PagesService, SectionsService],
  exports: [PagesService, SectionsService],
})
export class CmsModule {}
