import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PolicyReminderService } from './policy-reminder.service';

@Injectable()
export class PolicyReminderJob {
  private readonly logger = new Logger(PolicyReminderJob.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly reminderService: PolicyReminderService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('PH_POLICY_REMINDER_ENABLED', 'true') === 'true';

    this.logger.log(`PolicyReminderJob: ${this.isEnabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Cron: todos los días a las 7 AM (Colombia)
   * Revisa pólizas activas y envía notificaciones de vencimiento próximo
   */
  @Cron('0 7 * * *', {
    name: 'ph-policy-reminders',
    timeZone: 'America/Bogota',
  })
  async handleDailyReminders() {
    if (!this.isEnabled) {
      this.logger.debug('Recordatorios de pólizas deshabilitados. Saltando.');
      return;
    }

    const startTime = Date.now();
    this.logger.log('Iniciando job de recordatorios de pólizas...');

    try {
      const result = await this.reminderService.processReminders();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(
        `Job completado en ${duration}s — ` +
        `${result.totalCompanies} empresas, ` +
        `${result.policiesChecked} pólizas revisadas, ` +
        `${result.remindersSent} recordatorios enviados, ` +
        `${result.errors} errores`,
      );
    } catch (error) {
      this.logger.error(`Error en job de recordatorios de pólizas: ${error.message}`, error.stack);
    }
  }
}
