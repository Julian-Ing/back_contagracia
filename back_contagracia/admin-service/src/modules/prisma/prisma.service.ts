import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-master';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    console.log('Admin Service: Prisma connected to master database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Admin Service: Prisma disconnected from master database');
  }
}
