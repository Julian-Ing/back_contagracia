import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Audit, Public } from '@contagracia/shared-modules';
// import { RateLimit } from '../../common/decorators/rate-limit.decorator';
// import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  SendVerificationCodeDto,
  VerifyCodeDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  // @RateLimit({ limit: 3, window: 3600 }) // 3 intentos por hora
  // @UseGuards(RateLimitGuard)
  @Audit('auth.register')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Registra un nuevo usuario en una empresa existente',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        message: 'Usuario registrado. Por favor verifica tu email.',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'usuario@ejemplo.com',
          full_name: 'María González',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o email ya existe',
  })
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.register(registerDto, ipAddress);
  }

  // NOTE: POST /register-company fue movido a company-service
  // Ver: POST /companies/register en company-service

  @Public()
  @Audit('auth.email_verified')
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar email',
    description: 'Verifica el email del usuario mediante el token enviado',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verificado exitosamente',
    schema: {
      example: {
        message: 'Email verificado exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido o expirado',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  // @RateLimit({ limit: 3, window: 300 }) // 3 intentos por 5 minutos
  // @UseGuards(RateLimitGuard)
  @Audit('auth.send_verification_code')
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar código de verificación',
    description: 'Envía un código de 6 dígitos al email para verificación pre-registro',
  })
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Código enviado exitosamente',
    schema: {
      example: {
        message: 'Código de verificación enviado',
        email: 'usuario@ejemplo.com',
        expires_in: 900,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al enviar el email (servicio no configurado)',
  })
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    return this.authService.sendVerificationCode(dto);
  }

  @Public()
  // @RateLimit({ limit: 5, window: 300 }) // 5 intentos por 5 minutos
  // @UseGuards(RateLimitGuard)
  @Audit('auth.verify_code')
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código OTP',
    description: 'Verifica el código de 6 dígitos enviado al email. Retorna un token de registro.',
  })
  @ApiBody({ type: VerifyCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Código verificado exitosamente',
    schema: {
      example: {
        message: 'Email verificado correctamente',
        email: 'usuario@ejemplo.com',
        registration_token: 'uuid-token-para-registro',
        expires_in: 1800,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido o expirado',
  })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Public()
  // @RateLimit({ limit: 5, window: 900 }) // 5 intentos por 15 minutos
  // @UseGuards(RateLimitGuard)
  @Audit('auth.login')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica un usuario y retorna los tokens JWT',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@distribuidoraabc.com',
          full_name: 'Juan Pérez',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o email no verificado',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  // @RateLimit({ limit: 10, window: 60 }) // 10 intentos por minuto
  @Audit('auth.refresh')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))

  @ApiOperation({
    summary: 'Refrescar token',
    description: 'Obtiene un nuevo access_token usando el refresh_token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refrescado exitosamente',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: any) {
    const { session_id } = req.user;
    return this.authService.refresh(refreshTokenDto.refresh_token, session_id);
  }

  @Public()
  @Audit('auth.logout')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión actual',
    description: 'Cierra la sesión actual del usuario. El frontend siempre limpia el estado local.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Logout exitoso',
      },
    },
  })
  async logout() {
    // Endpoint público - el frontend siempre limpia los tokens locales
    // Si el token estaba válido, el frontend ya lo eliminó del storage
    return { message: 'Logout exitoso' };
  }

  @Audit('auth.logout_all')
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar todas las sesiones',
    description: 'Cierra todas las sesiones activas del usuario en todos los dispositivos',
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las sesiones cerradas exitosamente',
    schema: {
      example: {
        message: 'Todas las sesiones cerradas',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async logoutAll(@Req() req: any) {
    const { sub, user_type } = req.user;
    // Para system_admin, sub es user_id de master
    // Para company_user, sub es tenant_user_id
    if (user_type === 'system_admin') {
      return this.authService.logoutAll(sub, undefined);
    }
    return this.authService.logoutAll(undefined, sub);
  }

  @Post('reclaim-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reclamar sesión desplazada',
    description: 'Marca esta sesión como la activa y desplaza a las demás',
  })
  @ApiResponse({ status: 200, description: 'Sesión reclamada' })
  @ApiResponse({ status: 401, description: 'No autenticado o sesión inactiva' })
  async reclaimSession(@Req() req: any) {
    const { sub, session_id } = req.user;
    const userAgent = req.headers['user-agent'];
    return this.authService.reclaimSession(session_id, sub, userAgent);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener datos y permisos actuales',
    description: 'Retorna los datos del usuario autenticado con sus permisos actualizados',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del usuario con permisos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async me(@Req() req: any) {
    return this.authService.getMe(req.user);
  }
}
