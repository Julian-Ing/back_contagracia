import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-master';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<any> {
    await this.$connect();
    console.log('Tax Service: Prisma connected to master database');
  }

  async onModuleDestroy(): Promise<any> {
    await this.$disconnect();
  }
}
