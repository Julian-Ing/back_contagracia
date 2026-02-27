import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule, TenantContextModule, TenantContextService, AuditModule, TENANT_CONTEXT_SERVICE } from '@contagracia/shared-modules';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { AccountingConfigModule } from './modules/accounting-config/accounting-config.module';
import { BanksModule } from './modules/banks/banks.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { BankMovementsModule } from './modules/bank-movements/bank-movements.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { PeriodsModule } from './modules/periods/periods.module';
import { ArApModule } from './modules/ar-ap/ar-ap.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PaymentReceiptsModule } from './modules/payment-receipts/payment-receipts.module';
import { PrepaymentsModule } from './modules/prepayments/prepayments.module';
import { CompanyPaymentMethodsModule } from './modules/company-payment-methods/company-payment-methods.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { ProjectionsModule } from './modules/projections/projections.module';
import { GeneralLedgerModule } from './modules/general-ledger/general-ledger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TenantContextModule must be imported BEFORE AuthModule so that TENANT_CONTEXT_SERVICE provider is available
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuthModule.forRoot(), // JWT + Guards globales
    AuditModule.forRoot({
      serviceName: 'accounting-service',
      tenantPrismaService: TenantContextService,
    }),
    ChartOfAccountsModule,
    AccountingConfigModule,
    BanksModule,
    BankAccountsModule,
    BankMovementsModule,
    JournalEntriesModule,
    PeriodsModule,
    ArApModule,
    PaymentsModule,
    PaymentReceiptsModule,
    PrepaymentsModule,
    CompanyPaymentMethodsModule,
    CostCentersModule,
    ProjectionsModule,
    GeneralLedgerModule,
  ],
  providers: [
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}