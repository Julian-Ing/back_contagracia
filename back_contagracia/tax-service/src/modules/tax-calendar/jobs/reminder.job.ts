import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ReminderService } from '../services/reminder.service';

@Injectable()
export class ReminderJob {
  private readonly logger = new Logger(ReminderJob.name);
  private readonly isEnabled: boolean;
  private readonly cronExpression: string;
  private readonly daysAhead: number;
  private readonly includeOverdue: boolean;
  private readonly overdueMaxDays: number;

  constructor(
    private readonly reminderService: ReminderService,
    private readonly configService: ConfigService,
  ) {
    // Leer configuración desde variables de entorno
    this.isEnabled = this.configService.get<string>('TAX_REMINDER_ENABLED', 'true') === 'true';
    this.cronExpression = this.configService.get<string>('TAX_REMINDER_CRON', '0 7 * * *'); // Default: 7 AM diario
    this.daysAhead = parseInt(this.configService.get<string>('TAX_REMINDER_DAYS_AHEAD', '30'), 10);
    this.includeOverdue =
      this.configService.get<string>('TAX_REMINDER_INCLUDE_OVERDUE', 'true') === 'true';
    this.overdueMaxDays = parseInt(
      this.configService.get<string>('TAX_REMINDER_OVERDUE_DAYS', '7'),
      10,
    );

    this.logger.log(`ReminderJob inicializado:`);
    this.logger.log(`  - Habilitado: ${this.isEnabled}`);
    this.logger.log(`  - Cron: ${this.cronExpression}`);
    this.logger.log(`  - Días adelante: ${this.daysAhead}`);
    this.logger.log(`  - Incluir vencidas: ${this.includeOverdue}`);
    if (this.includeOverdue) {
      this.logger.log(`  - Máx días vencidos: ${this.overdueMaxDays}`);
    }
  }

  /**
   * Job principal ejecutado según el cron configurado
   * Por defecto: todos los días a las 7 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM, {
    name: 'tax-reminders-daily',
    timeZone: 'America/Bogota',
  })
  async handleDailyReminders() {
    if (!this.isEnabled) {
      this.logger.debug('Recordatorios deshabilitados. Saltando ejecución.');
      return;
    }

    const startTime = Date.now();
    this.logger.log('========================================');
    this.logger.log('🔔 Iniciando job de recordatorios tributarios');
    this.logger.log('========================================');

    try {
      const result = await this.reminderService.processReminders(
        this.daysAhead,
        this.includeOverdue,
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log('========================================');
      this.logger.log('✅ Job de recordatorios completado');
      this.logger.log(`  - Empresas procesadas: ${result.totalCompanies}`);
      this.logger.log(`  - Obligaciones encontradas: ${result.totalObligations}`);
      this.logger.log(`  - Notificaciones enviadas: ${result.notificationsSent}`);
      this.logger.log(`  - Errores: ${result.errors}`);
      this.logger.log(`  - Duración: ${duration}s`);
      this.logger.log('========================================');
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.error('========================================');
      this.logger.error('❌ Error en job de recordatorios');
      this.logger.error(`  - Error: ${error.message}`);
      this.logger.error(`  - Duración: ${duration}s`);
      this.logger.error('========================================');
      this.logger.error(error.stack);
    }
  }

  /**
   * Job semanal para recordatorios de obligaciones del mes siguiente
   * Se ejecuta todos los lunes a las 8 AM
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_8AM, {
    name: 'tax-reminders-weekly',
    timeZone: 'America/Bogota',
  })
  async handleWeeklyReminders() {
    if (!this.isEnabled) {
      return;
    }

    // Verificar si es lunes (día 1 de la semana)
    const today = new Date();
    if (today.getDay() !== 1) {
      return;
    }

    this.logger.log('🔔 Ejecutando recordatorio semanal (60 días adelante)');

    try {
      const result = await this.reminderService.processReminders(60, false);

      this.logger.log('✅ Recordatorio semanal completado');
      this.logger.log(`  - Notificaciones enviadas: ${result.notificationsSent}`);
    } catch (error) {
      this.logger.error('❌ Error en recordatorio semanal', error.stack);
    }
  }

  /**
   * Ejecuta el job manualmente (para testing o ejecución manual desde endpoint)
   */
  async executeManually(daysAhead?: number, includeOverdue?: boolean): Promise<{
    totalCompanies: number;
    totalObligations: number;
    notificationsSent: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();

    this.logger.log('🔔 Ejecución manual de recordatorios iniciada');

    const result = await this.reminderService.processReminders(
      daysAhead ?? this.daysAhead,
      includeOverdue ?? this.includeOverdue,
    );

    const duration = (Date.now() - startTime) / 1000;

    return {
      ...result,
      duration,
    };
  }

  /**
   * Ejecuta recordatorios para una empresa específica (testing)
   */
  async executeForCompany(companyId: string, daysAhead?: number) {
    this.logger.log(`🔔 Ejecución manual para empresa ${companyId}`);

    return await this.reminderService.processRemindersForCompany(
      companyId,
      daysAhead ?? this.daysAhead,
    );
  }
}
