import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule, AuditModule, RealtimeModule } from '@contagracia/shared-modules';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SystemActionsModule } from './modules/system-actions/system-actions.module';
import { PlansModule } from './modules/plans/plans.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { CmsModule } from './modules/cms/cms.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BlogModule } from './modules/blog/blog.module';
import { UsersModule } from './modules/users/users.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule.forRoot(), // JWT + Guards globales
    AuditModule.forRoot({ serviceName: 'admin-service' }),
    RealtimeModule,
    PrismaModule,
    SystemActionsModule,
    PlansModule,
    CatalogsModule,
    CmsModule,
    CategoriesModule,
    CompaniesModule,
    BlogModule,
    UsersModule,
    SiteSettingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
