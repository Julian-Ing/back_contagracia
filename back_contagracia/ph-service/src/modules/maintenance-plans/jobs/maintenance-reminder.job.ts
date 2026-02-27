import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MaintenanceReminderService } from './maintenance-reminder.service';

@Injectable()
export class MaintenanceReminderJob {
  private readonly logger = new Logger(MaintenanceReminderJob.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly reminderService: MaintenanceReminderService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('PH_MAINTENANCE_REMINDER_ENABLED', 'true') === 'true';
    this.logger.log(
      `MaintenanceReminderJob: ${this.isEnabled ? 'habilitado' : 'deshabilitado'}`,
    );
  }

  @Cron('0 7 * * *', {
    name: 'ph-maintenance-reminders',
    timeZone: 'America/Bogota',
  })
  async handleDailyReminders() {
    if (!this.isEnabled) {
      this.logger.debug('Recordatorios de mantenimiento deshabilitados. Saltando.');
      return;
    }

    const startTime = Date.now();
    this.logger.log('Iniciando job de recordatorios de mantenimiento...');

    try {
      const result = await this.reminderService.processReminders();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `Job completado en ${duration}s — ` +
        `${result.totalCompanies} empresas, ` +
        `${result.plansChecked} planes revisados, ` +
        `${result.remindersSent} recordatorios enviados, ` +
        `${result.errors} errores`,
      );
    } catch (error) {
      this.logger.error(
        `Error en job de recordatorios de mantenimiento: ${error.message}`,
        error.stack,
      );
    }
  }
}
