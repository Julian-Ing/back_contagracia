import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionResolutionService } from './permission-resolution.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionResolutionService],
  exports: [PermissionsService, PermissionResolutionService],
})
export class PermissionsModule {}
