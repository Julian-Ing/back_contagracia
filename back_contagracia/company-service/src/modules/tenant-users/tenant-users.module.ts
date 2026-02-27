import { Module } from '@nestjs/common';
import { TenantUsersController } from './tenant-users.controller';
import { TenantUsersService } from './tenant-users.service';
import { TenantPrismaService } from './tenant-prisma.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantUsersController],
  providers: [TenantUsersService, TenantPrismaService],
  exports: [TenantUsersService, TenantPrismaService],
})
export class TenantUsersModule {}
