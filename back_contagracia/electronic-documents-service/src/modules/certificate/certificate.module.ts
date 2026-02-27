import { Module } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';

@Module({
  controllers: [CertificateController],
  providers: [CertificateService, DianApiService],
  exports: [CertificateService],
})
export class CertificateModule {}
