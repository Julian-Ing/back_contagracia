import { Module } from '@nestjs/common';
import { ContractExpirationJob } from './contract-expiration.job';

@Module({
  providers: [ContractExpirationJob],
})
export class JobsModule {}
