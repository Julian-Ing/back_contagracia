import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanySettingsHelper } from './company-settings.helper';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { DianModule } from '../dian/dian.module';

@Module({
  imports: [PrismaModule, TenantModule, DianModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanySettingsHelper],
  exports: [CompaniesService],
})
export class CompaniesModule {}
