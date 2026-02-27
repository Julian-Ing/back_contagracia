import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AssembliesController } from './assemblies.controller';
import { AssembliesService } from './assemblies.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [AssembliesController],
  providers: [AssembliesService],
  exports: [AssembliesService],
})
export class AssembliesModule {}
