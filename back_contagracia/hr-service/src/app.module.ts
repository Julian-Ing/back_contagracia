import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
} from '@contagracia/shared-modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos HR
import { EmployeesModule } from './modules/employees';
import { SocialSecurityEntitiesModule } from './modules/social-security-entities';
import { CompanySettingsModule } from './modules/company-settings';
import { TimeAttendanceModule } from './modules/time-attendance';
import { LeavesModule } from './modules/leaves';
import { HrExpensesModule } from './modules/hr-expenses';
import { EmployeeObservationsModule } from './modules/employee-observations';
import { PerformanceEvaluationsModule } from './modules/performance-evaluations';
import { PayrollConceptsModule } from './modules/payroll-concepts';
import { PayrollWithholdingUvtModule } from './modules/payroll-withholding-uvt';
import { PayrollSettlementsModule } from './modules/payroll-settlements';
import { HrPortalModule } from './modules/hr-portal/hr-portal.module';
import { ShiftsModule } from './modules/shifts';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TenantContextModule DEBE ir ANTES de AuthModule para que TENANT_CONTEXT_SERVICE esté disponible
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuthModule.forRoot(),
    AuditModule.forRoot({
      serviceName: 'hr-service',
      tenantPrismaService: TenantContextService,
    }),
    ScheduleModule.forRoot(),
    // HR Modules
    EmployeesModule,
    SocialSecurityEntitiesModule,
    CompanySettingsModule,
    TimeAttendanceModule,
    LeavesModule,
    HrExpensesModule,
    EmployeeObservationsModule,
    PerformanceEvaluationsModule,
    PayrollConceptsModule,
    PayrollWithholdingUvtModule,
    PayrollSettlementsModule,
    HrPortalModule,
    ShiftsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Proveer TenantContextService para el PermissionsGuard
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
