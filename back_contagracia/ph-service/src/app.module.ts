import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
} from '@contagracia/shared-modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Infrastructure modules
import { PrismaModule } from './modules/prisma/prisma.module';
import { TenantModule } from './modules/tenant/tenant.module';

// PH Feature modules
import { CondominiumsModule } from './modules/condominiums/condominiums.module';
import { UnitTypesModule } from './modules/unit-types/unit-types.module';
import { UnitsModule } from './modules/units/units.module';
import { ResidentsModule } from './modules/residents/residents.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { CommonAreasModule } from './modules/common-areas/common-areas.module';
import { FeeConceptsModule } from './modules/fee-concepts/fee-concepts.module';
import { BillingModule } from './modules/billing/billing.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InsurancePoliciesModule } from './modules/insurance-policies/insurance-policies.module';
import { MaintenancePlansModule } from './modules/maintenance-plans/maintenance-plans.module';
import { DocumentCategoriesModule } from './modules/document-categories/document-categories.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AssembliesModule } from './modules/assemblies/assemblies.module';
import { PqrsModule } from './modules/pqrs/pqrs.module';
import { ComunicadosModule } from './modules/comunicados/comunicados.module';
import { PorteriaModule } from './modules/porteria/porteria.module';

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
      serviceName: 'ph-service',
      tenantPrismaService: TenantContextService,
    }),
    // Infrastructure
    PrismaModule,
    TenantModule,
    // PH Modules
    CondominiumsModule,
    UnitTypesModule,
    UnitsModule,
    ResidentsModule,
    VehiclesModule,
    CommonAreasModule,
    FeeConceptsModule,
    BillingModule,
    RentalsModule,
    DashboardModule,
    InsurancePoliciesModule,
    MaintenancePlansModule,
    DocumentCategoriesModule,
    DocumentsModule,
    AssembliesModule,
    PqrsModule,
    ComunicadosModule,
    PorteriaModule,
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
