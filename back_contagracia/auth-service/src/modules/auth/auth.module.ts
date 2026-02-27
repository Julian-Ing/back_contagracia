import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { RealtimeModule } from '@contagracia/shared-modules';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiration = configService.get<string>('JWT_EXPIRATION') || '1h';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiration as any, // JWT Module acepta string pero TS no lo tipea correctamente
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    EmailModule,
    RealtimeModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
