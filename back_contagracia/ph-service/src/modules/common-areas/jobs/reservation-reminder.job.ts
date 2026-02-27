import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ReservationReminderService } from './reservation-reminder.service';

@Injectable()
export class ReservationReminderJob {
  private readonly logger = new Logger(ReservationReminderJob.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly reminderService: ReservationReminderService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('PH_REMINDER_ENABLED', 'true') === 'true';

    this.logger.log(`ReservationReminderJob: ${this.isEnabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Cron: todos los días a las 6 PM (Colombia)
   * Busca reservas confirmadas para mañana y envía recordatorio
   */
  @Cron('0 18 * * *', {
    name: 'ph-reservation-reminders',
    timeZone: 'America/Bogota',
  })
  async handleDailyReminders() {
    if (!this.isEnabled) {
      this.logger.debug('Recordatorios PH deshabilitados. Saltando.');
      return;
    }

    const startTime = Date.now();
    this.logger.log('Iniciando job de recordatorios de reservas PH...');

    try {
      const result = await this.reminderService.processReminders();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(
        `Job completado en ${duration}s — ` +
        `${result.totalCompanies} empresas, ` +
        `${result.reservationsFound} reservas, ` +
        `${result.remindersSent} recordatorios enviados, ` +
        `${result.errors} errores`,
      );
    } catch (error) {
      this.logger.error(`Error en job de recordatorios: ${error.message}`, error.stack);
    }
  }
}
