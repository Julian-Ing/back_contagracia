import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SessionInfo {
  id: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  last_activity: Date;
  created_at: Date;
  expires_at: Date;
  is_current: boolean;
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todas las sesiones activas de un usuario
   */
  async getUserSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        session_id: true,
        ip_address: true,
        user_agent: true,
        device_info: true,
        last_activity: true,
        created_at: true,
        expires_at: true,
      },
      orderBy: {
        last_activity: 'desc',
      },
    });

    return sessions.map((session) => ({
      ...session,
      is_current: session.session_id === currentSessionId,
    }));
  }

  /**
   * Revocar una sesión específica
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<void> {
    // No permitir revocar la sesión actual
    if (sessionId === currentSessionId) {
      throw new ForbiddenException(
        'No puedes revocar tu sesión actual. Usa logout en su lugar.',
      );
    }

    const session = await this.prisma.session.findFirst({
      where: {
        session_id: sessionId,
        is_active: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Verificar que la sesión pertenece al usuario
    if (session.user_id !== userId) {
      throw new ForbiddenException('No tienes permiso para revocar esta sesión');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { is_active: false },
    });

    // TODO: Agregar session_id a Redis blacklist
  }

  /**
   * Revocar todas las sesiones excepto la actual
   */
  async revokeAllSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        user_id: userId,
        session_id: { not: currentSessionId },
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // TODO: Agregar user_id a Redis kill-switch

    return result.count;
  }

  /**
   * Obtener información de una sesión específica
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    const session = await this.prisma.session.findUnique({
      where: { session_id: sessionId },
      select: {
        id: true,
        session_id: true,
        ip_address: true,
        user_agent: true,
        device_info: true,
        last_activity: true,
        created_at: true,
        expires_at: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      is_current: false,
    };
  }

  /**
   * Limpiar sesiones expiradas (para cronjob)
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          {
            AND: [
              { is_active: false },
              {
                last_activity: {
                  lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días
                },
              },
            ],
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Contar sesiones activas de un usuario
   */
  async countActiveSessions(userId: string): Promise<number> {
    return await this.prisma.session.count({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { gte: new Date() },
      },
    });
  }
}
