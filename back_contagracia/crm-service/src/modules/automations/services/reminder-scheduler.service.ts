import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailSenderService } from './email-sender.service';
import { TemplateVariablesService } from './template-variables.service';

/**
 * Servicio para procesar recordatorios de reuniones
 * - Procesa cola de recordatorios pendientes cada minuto
 * - Programa recordatorios cuando se crea/actualiza una reunión
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
    private readonly emailSender: EmailSenderService,
    private readonly templateVariables: TemplateVariablesService,
  ) {}

  /**
   * Procesa la cola de recordatorios pendientes
   * Se ejecuta cada minuto
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'process-reminders' })
  async processReminders(): Promise<void> {
    try {
      const companies = await this.getActiveCompanies();

      for (const company of companies) {
        await this.processRemindersForCompany(company.id);
      }
    } catch (error) {
      this.logger.error(`Error processing reminders: ${error.message}`, error.stack);
    }
  }

  /**
   * Programa recordatorios para una actividad tipo MEETING
   * Debe llamarse cuando se crea o actualiza una reunión
   */
  async scheduleReminders(companyId: string, activityId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Obtener la actividad
    const activity = await db.crmActivity.findUnique({
      where: { id: activityId },
      include: {
        third_party: true,
        user: true,
      },
    });

    if (!activity || activity.type !== 'MEETING' || !activity.due_date) {
      return;
    }

    // Cancelar recordatorios previos
    await this.cancelReminders(companyId, activityId);

    // Obtener configuración de recordatorios
    const config = await db.crmMeetingReminderConfig.findFirst({
      where: { is_active: true },
    });

    if (!config) {
      this.logger.debug(`[${companyId}] No reminder config found, skipping`);
      return;
    }

    const reminderMinutes = config.default_reminder_minutes || [60]; // Default: 1 hora antes
    const meetingDate = new Date(activity.due_date);

    // Crear recordatorios según la configuración
    for (const minutes of reminderMinutes) {
      const remindAt = new Date(meetingDate.getTime() - minutes * 60 * 1000);

      // Solo programar si la fecha de recordatorio es futura
      if (remindAt <= new Date()) {
        continue;
      }

      // Recordatorio para el usuario asignado
      if (config.send_to_assigned && activity.user?.email) {
        await db.crmScheduledReminder.create({
          data: {
            activity_id: activityId,
            remind_at: remindAt,
            reminder_minutes_before: minutes,
            recipient_type: 'assigned',
            recipient_email: activity.user.email,
            status: 'pending',
          },
        });
      }

      // Recordatorio para el contacto
      if (config.send_to_contact && activity.third_party?.email) {
        await db.crmScheduledReminder.create({
          data: {
            activity_id: activityId,
            remind_at: remindAt,
            reminder_minutes_before: minutes,
            recipient_type: 'contact',
            recipient_email: activity.third_party.email,
            status: 'pending',
          },
        });
      }
    }

    this.logger.debug(`Scheduled ${reminderMinutes.length * 2} reminders for activity ${activityId}`);
  }

  /**
   * Cancela todos los recordatorios pendientes de una actividad
   */
  async cancelReminders(companyId: string, activityId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    await db.crmScheduledReminder.updateMany({
      where: {
        activity_id: activityId,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
      },
    });
  }

  // ============================================
  // Procesamiento de recordatorios
  // ============================================

  private async processRemindersForCompany(companyId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const now = new Date();

    // Buscar recordatorios pendientes que deben enviarse
    const pendingReminders = await db.crmScheduledReminder.findMany({
      where: {
        status: 'pending',
        remind_at: { lte: now },
      },
      include: {
        activity: {
          include: {
            third_party: true,
            user: true,
            opportunity: true,
          },
        },
      },
    });

    if (pendingReminders.length === 0) return;

    this.logger.debug(`[${companyId}] Processing ${pendingReminders.length} pending reminders`);

    // Obtener configuración de recordatorios para los templates
    const config = await db.crmMeetingReminderConfig.findFirst({
      where: { is_active: true },
    });

    for (const reminder of pendingReminders) {
      try {
        await this.sendReminder(companyId, reminder, config);

        // Marcar como enviado
        await db.crmScheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            sent_at: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder ${reminder.id}: ${error.message}`);

        // Marcar como fallido
        await db.crmScheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            error_message: error.message,
          },
        });
      }
    }
  }

  private async sendReminder(companyId: string, reminder: any, config: any): Promise<void> {
    if (!reminder.recipient_email) {
      throw new Error('No recipient email');
    }

    const activity = reminder.activity;
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Preparar variables para el template
    const meetingDate = new Date(activity.due_date);
    const variables = {
      contact: {
        name: activity.third_party?.name || 'Participante',
        email: activity.third_party?.email,
        phone: activity.third_party?.phone,
        company_name: activity.third_party?.company_name,
      },
      custom: {
        meeting_subject: activity.subject,
        meeting_description: activity.description || '',
        meeting_date: meetingDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        meeting_time: meetingDate.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        reminder_time: this.formatReminderTime(reminder.reminder_minutes_before),
        assigned_user: activity.user?.name || 'No asignado',
      },
    };

    // Usar template de configuración o template por defecto
    let subject = config?.subject_template || 'Recordatorio: {{meeting_subject}} - {{meeting_date}}';
    let body = config?.body_template || this.getDefaultReminderTemplate();

    subject = this.templateVariables.replaceAll(subject, variables);
    body = this.templateVariables.replaceAll(body, variables);

    const result = await this.emailSender.send(companyId, {
      to: reminder.recipient_email,
      subject,
      html: body,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    this.logger.log(`Reminder sent to ${reminder.recipient_email} for meeting "${activity.subject}"`);
  }

  // ============================================
  // Helpers
  // ============================================

  private async getActiveCompanies(): Promise<{ id: string }[]> {
    try {
      const companies = await this.masterPrisma.company.findMany({
        where: { is_active: true },
        select: { id: true },
      });
      return companies;
    } catch {
      return [];
    }
  }

  private formatReminderTime(minutes: number): string {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} día${days > 1 ? 's' : ''}`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }

  private getDefaultReminderTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .meeting-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .meeting-info h3 { margin: 0 0 10px 0; color: #4F46E5; }
          .meeting-info p { margin: 5px 0; }
          .reminder-badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 5px 10px; border-radius: 4px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Recordatorio de Reunión</h2>
            <p class="reminder-badge">Faltan {{reminder_time}}</p>
          </div>
          <div class="content">
            <div class="meeting-info">
              <h3>{{meeting_subject}}</h3>
              <p><strong>Fecha:</strong> {{meeting_date}}</p>
              <p><strong>Hora:</strong> {{meeting_time}}</p>
              <p><strong>Participante:</strong> {{contact_name}}</p>
              <p><strong>Responsable:</strong> {{assigned_user}}</p>
            </div>
            <p>{{meeting_description}}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
