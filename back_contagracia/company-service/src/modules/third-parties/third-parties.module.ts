import { Module } from '@nestjs/common';
import { ThirdPartiesController } from './third-parties.controller';
import { ThirdPartiesService } from './third-parties.service';
import { TenantUsersModule } from '../tenant-users/tenant-users.module';

@Module({
  imports: [TenantUsersModule],
  controllers: [ThirdPartiesController],
  providers: [ThirdPartiesService],
  exports: [ThirdPartiesService],
})
export class ThirdPartiesModule {}
