import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionsGateway } from './permissions.gateway';
import { PermissionsWsService } from './permissions-ws.service';
import { RealtimeSubscriberService } from './realtime-subscriber.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PermissionsGateway, PermissionsWsService, RealtimeSubscriberService],
  exports: [PermissionsGateway, PermissionsWsService],
})
export class PermissionsWsModule {}
