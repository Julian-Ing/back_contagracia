import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailSenderService } from './email-sender.service';
import { TemplateVariablesService } from './template-variables.service';

/**
 * Servicio para procesar automatizaciones de eventos programados
 * - Cumpleaños
 * - Fin de año
 * - Fechas personalizadas
 */
@Injectable()
export class ScheduledEventsService {
  private readonly logger = new Logger(ScheduledEventsService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
    private readonly emailSender: EmailSenderService,
    private readonly templateVariables: TemplateVariablesService,
  ) {}

  /**
   * Procesa automatizaciones de cumpleaños
   * Se ejecuta diariamente a las 00:05
   */
  @Cron('5 0 * * *', { name: 'birthday-automations' })
  async processBirthdayAutomations(): Promise<void> {
    this.logger.log('Starting birthday automations processing...');

    try {
      // Obtener todas las empresas (tenants) activas
      const companies = await this.getActiveCompanies();

      for (const company of companies) {
        await this.processBirthdaysForCompany(company.id);
      }

      this.logger.log('Birthday automations processing completed');
    } catch (error) {
      this.logger.error(`Error processing birthday automations: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesa automatizaciones de fin de año
   * Se ejecuta el 31 de diciembre a las 09:00
   */
  @Cron('0 9 31 12 *', { name: 'year-end-automations' })
  async processYearEndAutomations(): Promise<void> {
    this.logger.log('Starting year-end automations processing...');

    try {
      const companies = await this.getActiveCompanies();

      for (const company of companies) {
        await this.processYearEndForCompany(company.id);
      }

      this.logger.log('Year-end automations processing completed');
    } catch (error) {
      this.logger.error(`Error processing year-end automations: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesa automatizaciones de fechas personalizadas
   * Se ejecuta cada hora
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'custom-date-automations' })
  async processCustomDateAutomations(): Promise<void> {
    this.logger.debug('Checking custom date automations...');

    try {
      const companies = await this.getActiveCompanies();

      for (const company of companies) {
        await this.processCustomDatesForCompany(company.id);
      }
    } catch (error) {
      this.logger.error(`Error processing custom date automations: ${error.message}`, error.stack);
    }
  }

  // ============================================
  // Procesamiento por empresa
  // ============================================

  private async processBirthdaysForCompany(companyId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Buscar automatizaciones de cumpleaños activas
    const automations = await db.crmEventAutomation.findMany({
      where: {
        event_type: 'birthday',
        is_active: true,
        deleted_at: null,
      },
      include: {
        email_template: true,
        whatsapp_template: true,
      },
    });

    if (automations.length === 0) return;

    // Obtener contactos con cumpleaños hoy
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Buscar terceros con cumpleaños hoy (comparando mes y día)
    const birthdayContacts = await db.thirdParty.findMany({
      where: {
        deleted_at: null,
        birth_date: {
          not: null,
        },
      },
    });

    // Filtrar contactos cuyo cumpleaños sea hoy
    const todaysBirthdays = birthdayContacts.filter((contact) => {
      if (!contact.birth_date) return false;
      const birthDate = new Date(contact.birth_date);
      return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
    });

    this.logger.debug(`[${companyId}] Found ${todaysBirthdays.length} birthdays today`);

    for (const contact of todaysBirthdays) {
      for (const automation of automations) {
        // Verificar si aplica al segmento del contacto
        if (!this.contactMatchesSegments(contact, automation.target_segments as string[])) {
          continue;
        }

        try {
          await this.executeEventAutomation(companyId, db, automation, contact);

          // Actualizar contador de ejecución
          await db.crmEventAutomation.update({
            where: { id: automation.id },
            data: {
              execution_count: { increment: 1 },
              last_executed_at: new Date(),
            },
          });

          // Registrar en logs
          await this.logAutomationExecution(db, {
            automation_type: 'event',
            automation_id: automation.id,
            trigger_data: {
              event_type: 'birthday',
              third_party_id: contact.id,
              birth_date: contact.birth_date,
            },
            action_data: {
              action_type: automation.action_type,
              email_sent: automation.action_type === 'email' || automation.action_type === 'both',
            },
            status: 'success',
          });
        } catch (error) {
          this.logger.error(`Error sending birthday automation to ${contact.email}: ${error.message}`);

          await this.logAutomationExecution(db, {
            automation_type: 'event',
            automation_id: automation.id,
            trigger_data: {
              event_type: 'birthday',
              third_party_id: contact.id,
            },
            action_data: { action_type: automation.action_type },
            status: 'failed',
            error_message: error.message,
          });
        }
      }
    }
  }

  private async processYearEndForCompany(companyId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Buscar automatizaciones de fin de año activas
    const automations = await db.crmEventAutomation.findMany({
      where: {
        event_type: 'year_end',
        is_active: true,
        deleted_at: null,
      },
      include: {
        email_template: true,
        whatsapp_template: true,
      },
    });

    if (automations.length === 0) return;

    // Obtener todos los contactos activos
    const contacts = await db.thirdParty.findMany({
      where: {
        deleted_at: null,
        roles: { has: 'CONTACT' },
      },
    });

    this.logger.log(`[${companyId}] Sending year-end messages to ${contacts.length} contacts`);

    for (const automation of automations) {
      for (const contact of contacts) {
        // Verificar si aplica al segmento del contacto
        if (!this.contactMatchesSegments(contact, automation.target_segments as string[])) {
          continue;
        }

        try {
          await this.executeEventAutomation(companyId, db, automation, contact);

          // Actualizar contador
          await db.crmEventAutomation.update({
            where: { id: automation.id },
            data: {
              execution_count: { increment: 1 },
              last_executed_at: new Date(),
            },
          });
        } catch (error) {
          this.logger.error(`Error sending year-end message to ${contact.email}: ${error.message}`);
        }
      }
    }
  }

  private async processCustomDatesForCompany(companyId: string): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Buscar automatizaciones de fecha personalizada que deben ejecutarse hoy
    const automations = await db.crmEventAutomation.findMany({
      where: {
        event_type: 'custom_date',
        is_active: true,
        deleted_at: null,
        custom_date: {
          gte: todayStart,
          lte: todayEnd,
        },
        // Solo ejecutar si no se ha ejecutado hoy
        OR: [
          { last_executed_at: null },
          { last_executed_at: { lt: todayStart } },
        ],
      },
      include: {
        email_template: true,
        whatsapp_template: true,
      },
    });

    if (automations.length === 0) return;

    // Verificar si la hora coincide (si custom_time está definido)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const automation of automations) {
      // Verificar hora de ejecución si está definida
      if (automation.custom_time) {
        const [targetHour, targetMinute] = automation.custom_time.split(':').map(Number);
        // Solo ejecutar si estamos dentro de la hora correcta
        if (currentHour !== targetHour) continue;
        // Permitir ejecución dentro de los primeros 5 minutos de la hora
        if (currentMinute > 5) continue;
      }

      // Obtener contactos objetivo
      const contacts = await db.thirdParty.findMany({
        where: {
          deleted_at: null,
          roles: { has: 'CONTACT' },
        },
      });

      for (const contact of contacts) {
        if (!this.contactMatchesSegments(contact, automation.target_segments as string[])) {
          continue;
        }

        try {
          await this.executeEventAutomation(companyId, db, automation, contact);
        } catch (error) {
          this.logger.error(`Error executing custom date automation: ${error.message}`);
        }
      }

      // Actualizar ejecución
      await db.crmEventAutomation.update({
        where: { id: automation.id },
        data: {
          execution_count: { increment: 1 },
          last_executed_at: new Date(),
        },
      });
    }
  }

  // ============================================
  // Ejecución de automatizaciones
  // ============================================

  private async executeEventAutomation(
    companyId: string,
    db: any,
    automation: any,
    contact: any,
  ): Promise<void> {
    const variables = {
      contact: {
        name: contact.name || 'Estimado cliente',
        email: contact.email,
        phone: contact.phone,
        company_name: contact.company_name,
      },
    };

    // Enviar email si corresponde
    if ((automation.action_type === 'email' || automation.action_type === 'both') && automation.email_template && contact.email) {
      const subject = this.templateVariables.replaceAll(automation.email_template.subject, variables);
      const html = this.templateVariables.replaceAll(automation.email_template.body_html, variables);

      const result = await this.emailSender.send(companyId, {
        to: contact.email,
        subject,
        html,
      });

      if (result.success) {
        await this.emailSender.logEmailSend(companyId, {
          template_id: automation.email_template_id,
          third_party_id: contact.id,
          subject,
          body_html: html,
          status: 'SENT',
          sent_at: new Date(),
        });
      }
    }

    // WhatsApp pendiente de implementación por otro dev
    if ((automation.action_type === 'whatsapp' || automation.action_type === 'both') && automation.whatsapp_template) {
      this.logger.debug(`[WHATSAPP] Would send to ${contact.whatsapp_number || contact.phone}`);
    }
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
    } catch (error) {
      this.logger.warn('Could not fetch companies for scheduled events');
      return [];
    }
  }

  private contactMatchesSegments(contact: any, targetSegments: string[] | null): boolean {
    // Si no hay segmentos objetivo, aplica a todos
    if (!targetSegments || targetSegments.length === 0) return true;

    const contactTags = contact.crm_tags || [];
    const contactSegment = contact.segment;

    // Verificar si algún tag o segmento coincide
    return targetSegments.some(
      (segment) => contactTags.includes(segment) || contactSegment === segment,
    );
  }

  private async logAutomationExecution(
    db: any,
    data: {
      automation_type: string;
      automation_id: string;
      trigger_data: any;
      action_data: any;
      status: 'success' | 'failed' | 'skipped';
      error_message?: string;
    },
  ): Promise<void> {
    try {
      await db.crmAutomationLog.create({
        data: {
          automation_type: data.automation_type,
          automation_id: data.automation_id,
          trigger_data: data.trigger_data,
          action_data: data.action_data,
          status: data.status,
          error_message: data.error_message,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log automation execution: ${error.message}`);
    }
  }
}
