import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

export interface AuthModuleOptions {
  global?: boolean;
}

// Obtener APP_GUARD token del host service
function getAppGuardToken(): any {
  try {
    const core = require(require.resolve('@nestjs/core', { paths: [process.cwd()] }));
    return core.APP_GUARD;
  } catch {
    return Symbol('APP_GUARD');
  }
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions = {}): DynamicModule {
    const { global = true } = options;
    const APP_GUARD = getAppGuardToken();

    // Los guards obtienen Reflector y TenantContextService dinámicamente
    // No necesitan inyección de dependencias
    const createJwtAuthGuard = () => new JwtAuthGuard();
    const createRolesGuard = () => new RolesGuard();
    const createPermissionsGuard = () => new PermissionsGuard();

    const providers: Provider[] = [
      {
        provide: 'JWT_SECRET',
        useFactory: (configService: ConfigService) => {
          const secret = configService.get<string>('JWT_SECRET');
          if (!secret) throw new Error('JWT_SECRET must be defined');
          return secret;
        },
        inject: [ConfigService],
      },
      JwtStrategy,
      { provide: JwtAuthGuard, useFactory: createJwtAuthGuard },
      { provide: RolesGuard, useFactory: createRolesGuard },
      { provide: PermissionsGuard, useFactory: createPermissionsGuard },
    ];

    if (global) {
      providers.push(
        { provide: APP_GUARD, useFactory: createJwtAuthGuard },
        { provide: APP_GUARD, useFactory: createPermissionsGuard },
      );
    }

    return {
      module: AuthModule,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1h') as any },
          }),
          inject: [ConfigService],
        }),
      ],
      providers,
      exports: [JwtStrategy, JwtAuthGuard, RolesGuard, PermissionsGuard, JwtModule, PassportModule],
    };
  }
}
