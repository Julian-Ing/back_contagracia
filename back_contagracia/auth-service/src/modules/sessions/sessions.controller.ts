import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar sesiones activas',
    description: 'Obtiene todas las sesiones activas del usuario autenticado. La sesión actual está marcada con is_current: true',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones activas',
    schema: {
      example: {
        sessions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            session_id: 'sess_abc123',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0...',
            device_info: { browser: 'Chrome', os: 'Windows' },
            last_activity: '2024-01-26T10:00:00Z',
            created_at: '2024-01-26T10:00:00Z',
            expires_at: '2024-02-02T10:00:00Z',
            is_current: true,
          },
          {
            id: '456e7890-e89b-12d3-a456-426614174111',
            session_id: 'sess_def456',
            ip_address: '192.168.1.2',
            user_agent: 'Chrome/120.0...',
            device_info: { browser: 'Chrome', os: 'Android' },
            last_activity: '2024-01-25T15:30:00Z',
            created_at: '2024-01-25T15:30:00Z',
            expires_at: '2024-02-01T15:30:00Z',
            is_current: false,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async getUserSessions(@Req() req: any) {
    const { sub, session_id } = req.user;
    const sessions = await this.sessionsService.getUserSessions(sub, session_id);
    return { sessions };
  }

  @Audit('sessions.revoked')
  @Delete(':session_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revocar sesión específica',
    description: 'Revoca una sesión específica del usuario por su ID. No puedes revocar tu sesión actual.',
  })
  @ApiParam({
    name: 'session_id',
    description: 'ID de la sesión a revocar',
    example: 'sess_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión revocada exitosamente',
    schema: {
      example: {
        message: 'Sesión revocada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'No puedes revocar tu sesión actual',
  })
  @ApiResponse({
    status: 404,
    description: 'Sesión no encontrada',
  })
  async revokeSession(@Param('session_id') sessionId: string, @Req() req: any) {
    const { sub, session_id: currentSessionId } = req.user;
    await this.sessionsService.revokeSession(sub, sessionId, currentSessionId);
    return { message: 'Sesión revocada exitosamente' };
  }

  @Audit('sessions.all_revoked')
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revocar todas las sesiones excepto la actual',
    description: 'Cierra todas las sesiones del usuario excepto la sesión desde la que se hace la petición',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesiones revocadas exitosamente',
    schema: {
      example: {
        message: '3 sesiones revocadas exitosamente',
        count: 3,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async revokeAllSessions(@Req() req: any) {
    const { sub, session_id: currentSessionId } = req.user;
    const count = await this.sessionsService.revokeAllSessions(sub, currentSessionId);
    return {
      message: `${count} sesiones revocadas exitosamente`,
      count,
    };
  }
}
