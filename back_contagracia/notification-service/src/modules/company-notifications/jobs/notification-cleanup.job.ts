import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class NotificationCleanupJob {
  private readonly logger = new Logger(NotificationCleanupJob.name);

  /**
   * Duración de las notificaciones en días
   * TODO: Hacer configurable por empresa (tenancy) cuando esté el perfil de configuración
   */
  private readonly NOTIFICATION_DURATION_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {
    this.logger.log(`NotificationCleanupJob inicializado:`);
    this.logger.log(`  - Duración de notificaciones: ${this.NOTIFICATION_DURATION_DAYS} días`);
    this.logger.log(`  - Limpieza: Diaria a las 3:00 AM (America/Bogota)`);
  }

  /**
   * Job de limpieza que se ejecuta diariamente a las 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'notification-cleanup',
    timeZone: 'America/Bogota',
  })
  async handleCleanup() {
    const startTime = Date.now();
    this.logger.log('🧹 Iniciando limpieza de notificaciones expiradas...');

    try {
      const result = await this.deleteExpiredNotifications();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(`✅ Limpieza completada en ${duration}s`);
      this.logger.log(`  - Notificaciones eliminadas: ${result.count}`);

      return result;
    } catch (error) {
      this.logger.error('❌ Error en limpieza de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Elimina notificaciones más antiguas que NOTIFICATION_DURATION_DAYS
   */
  async deleteExpiredNotifications(): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.NOTIFICATION_DURATION_DAYS);

    this.logger.debug(`Eliminando notificaciones anteriores a: ${cutoffDate.toISOString()}`);

    const result = await this.prisma.companyNotification.deleteMany({
      where: {
        created_at: { lt: cutoffDate },
      },
    });

    return { count: result.count };
  }

  /**
   * Ejecuta la limpieza manualmente (útil para testing o ejecución desde endpoint)
   */
  async executeManually(): Promise<{ count: number; duration: number }> {
    const startTime = Date.now();

    this.logger.log('🧹 Ejecución manual de limpieza iniciada...');

    const result = await this.deleteExpiredNotifications();
    const duration = (Date.now() - startTime) / 1000;

    this.logger.log(`✅ Limpieza manual completada: ${result.count} notificaciones eliminadas en ${duration.toFixed(2)}s`);

    return {
      count: result.count,
      duration,
    };
  }
}
