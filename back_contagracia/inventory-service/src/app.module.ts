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
import { CategoriesModule } from './modules/categories/categories.module';
import { UnitsModule } from './modules/units/units.module';
import { ProductsModule } from './modules/products/products.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ProductTransfersModule } from './modules/product-transfers/product-transfers.module';
import { StorageTransfersModule } from './modules/storage-transfers/storage-transfers.module';
import { InternalModule } from './modules/internal/internal.module';

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
      serviceName: 'inventory-service',
      tenantPrismaService: TenantContextService,
    }),
    CategoriesModule,
    UnitsModule,
    ProductsModule,
    AttributesModule,
    WarehousesModule,
    ProductTransfersModule,
    StorageTransfersModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
