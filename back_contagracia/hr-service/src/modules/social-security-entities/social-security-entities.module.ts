import { Module } from '@nestjs/common';
import { SocialSecurityEntitiesController } from './social-security-entities.controller';
import { SocialSecurityEntitiesService } from './social-security-entities.service';

@Module({
  controllers: [SocialSecurityEntitiesController],
  providers: [SocialSecurityEntitiesService],
  exports: [SocialSecurityEntitiesService],
})
export class SocialSecurityEntitiesModule {}
