import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Audit, Public } from '@contagracia/shared-modules';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { PasswordsService } from './passwords.service';
import { ChangePasswordDto } from '../auth/dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from './dto';

@ApiTags('passwords')
@Controller('passwords')
export class PasswordsController {
  constructor(private readonly passwordsService: PasswordsService) {}

  @Audit('passwords.changed')
  @Post('change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: 'Permite al usuario autenticado cambiar su contraseña actual por una nueva',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente',
    schema: {
      example: {
        message: 'Contraseña cambiada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Contraseña actual incorrecta o nueva contraseña inválida',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    const { sub, user_type, company_id } = req.user;
    return this.passwordsService.changePassword(sub, changePasswordDto, user_type, company_id);
  }

  @Public()
  @RateLimit({ limit: 3, window: 3600 }) // 3 intentos por hora
  @UseGuards(RateLimitGuard)
  @Audit('passwords.forgot')
  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar código de recuperación',
    description: 'Envía un código de 6 dígitos al email para recuperar la contraseña',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Código de recuperación enviado',
    schema: {
      example: {
        message: 'Si el email existe, recibirás un código de verificación',
        expires_in: 900,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email inválido',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordsService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @RateLimit({ limit: 5, window: 900 }) // 5 intentos cada 15 minutos
  @UseGuards(RateLimitGuard)
  @Audit('passwords.verify_code')
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código de recuperación',
    description: 'Verifica el código de 6 dígitos y devuelve un token para resetear la contraseña',
  })
  @ApiBody({ type: VerifyResetCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Código verificado correctamente',
    schema: {
      example: {
        message: 'Código verificado correctamente',
        reset_token: 'uuid-token',
        expires_in: 1800,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido o expirado',
  })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.passwordsService.verifyResetCode(verifyResetCodeDto);
  }

  @Public()
  @Audit('passwords.reset')
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description: 'Restablece la contraseña del usuario usando el token de recuperación',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
    schema: {
      example: {
        message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado o nueva contraseña no válida',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordsService.resetPassword(resetPasswordDto);
  }
}
