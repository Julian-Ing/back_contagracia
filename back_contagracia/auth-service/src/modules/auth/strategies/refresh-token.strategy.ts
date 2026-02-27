import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenPayload } from '@contagracia/shared-modules';

type RefreshStrategyBase = new (...args: any[]) => InstanceType<typeof Strategy>;

@Injectable()
export class RefreshTokenStrategy extends (PassportStrategy(
  Strategy,
  'jwt-refresh',
) as RefreshStrategyBase) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: RefreshTokenPayload): Promise<any> {
    if (!payload.sub || !payload.session_id) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Agregar el refresh token al payload para poder rotarlo
    return {
      ...payload,
      refreshToken: req.body.refresh_token,
    };
  }
}
