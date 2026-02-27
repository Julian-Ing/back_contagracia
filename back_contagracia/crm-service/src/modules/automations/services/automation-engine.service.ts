import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { TemplateVariablesService } from './template-variables.service';
import { EmailSenderService } from './email-sender.service';
import {
  OpportunityStageChangedEvent,
  FormSubmittedEvent,
  CRM_EVENTS,
} from '../events/automation.events';

/**
 * Motor de ejecución de automatizaciones
 * Escucha eventos del CRM y ejecuta las automatizaciones configuradas
 */
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly templateVariables: TemplateVariablesService,
    private readonly emailSender: EmailSenderService,
  ) {}

  // ============================================
  // Listener: Cambio de etapa de oportunidad
  // ============================================

  @OnEvent(CRM_EVENTS.OPPORTUNITY_STAGE_CHANGED)
  async handleOpportunityStageChanged(event: OpportunityStageChangedEvent) {
    this.logger.log(
      `[${event.companyId}] Opportunity stage changed: ${event.fromStageId} -> ${event.toStageId}`,
    );

    try {
      // Ejecutar automatizaciones de mensajes (email/whatsapp)
      await this.executeOpportunityMessageAutomations(event);

      // Ejecutar automatizaciones de actividades (crear tareas/reuniones)
      await this.executeActivityAutomations(event);
    } catch (error) {
      this.logger.error(
        `Error executing automations for opportunity ${event.opportunityId}: ${error.message}`,
        error.stack,
      );
    }
  }

  // ============================================
  // Listener: Envío de formulario
  // ============================================

  @OnEvent(CRM_EVENTS.FORM_SUBMITTED)
  async handleFormSubmitted(event: FormSubmittedEvent) {
    this.logger.log(
      `[${event.companyId}] Form submitted: ${event.formId}`,
    );

    try {
      await this.executeFormAutomations(event);
    } catch (error) {
      this.logger.error(
        `Error executing form automations for form ${event.formId}: ${error.message}`,
        error.stack,
      );
    }
  }

  // ============================================
  // Ejecución de automatizaciones de mensaje
  // ============================================

  private async executeOpportunityMessageAutomations(event: OpportunityStageChangedEvent) {
    const db = await this.tenantPrisma.getClientForCompany(event.companyId);

    // Buscar automatizaciones que coincidan con el cambio de etapa
    const automations = await db.crmOpportunityAutomation.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        trigger_stage_to: event.toStageId,
        OR: [
          { trigger_stage_from: event.fromStageId },
          { trigger_stage_from: null }, // null = cualquier etapa origen
        ],
      },
      include: {
        email_template: true,
        whatsapp_template: true,
      },
    });

    this.logger.debug(`Found ${automations.length} message automations to execute`);

    for (const automation of automations) {
      try {
        if (automation.action_type === 'email' && automation.email_template) {
          await this.sendEmailFromAutomation(
            event.companyId,
            automation,
            event.contact,
            event.opportunity,
          );
        } else if (automation.action_type === 'whatsapp' && automation.whatsapp_template) {
          await this.sendWhatsAppFromAutomation(
            event.companyId,
            automation,
            event.contact,
            event.opportunity,
          );
        }

        // Registrar ejecución exitosa
        await this.logAutomationExecution(db, {
          automation_type: 'opportunity',
          automation_id: automation.id,
          trigger_data: {
            opportunity_id: event.opportunityId,
            from_stage: event.fromStageId,
            to_stage: event.toStageId,
          },
          action_data: {
            action_type: automation.action_type,
            template_id: automation.email_template_id || automation.whatsapp_template_id,
          },
          status: 'success',
        });
      } catch (error) {
        this.logger.error(`Failed to execute automation ${automation.id}: ${error.message}`);

        // Registrar fallo
        await this.logAutomationExecution(db, {
          automation_type: 'opportunity',
          automation_id: automation.id,
          trigger_data: {
            opportunity_id: event.opportunityId,
            from_stage: event.fromStageId,
            to_stage: event.toStageId,
          },
          action_data: { action_type: automation.action_type },
          status: 'failed',
          error_message: error.message,
        });
      }
    }
  }

  // ============================================
  // Ejecución de automatizaciones de actividad
  // ============================================

  private async executeActivityAutomations(event: OpportunityStageChangedEvent) {
    const db = await this.tenantPrisma.getClientForCompany(event.companyId);

    // Buscar automatizaciones de actividad que coincidan
    const automations = await db.crmActivityAutomation.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        trigger_stage_to: event.toStageId,
        OR: [
          { trigger_stage_from: event.fromStageId },
          { trigger_stage_from: null },
        ],
      },
    });

    this.logger.debug(`Found ${automations.length} activity automations to execute`);

    for (const automation of automations) {
      try {
        // Calcular fecha de la actividad
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (automation.days_offset || 0));

        // Determinar usuario asignado
        let assignedTo = event.opportunity.assigned_to;
        if (automation.assigned_to_rule === 'specific_user' && automation.assigned_to_user_id) {
          assignedTo = automation.assigned_to_user_id;
        }

        // Crear la actividad
        const activity = await db.crmActivity.create({
          data: {
            type: automation.activity_type as any,
            subject: automation.activity_subject,
            description: automation.activity_description,
            status: 'PENDING',
            due_date: dueDate,
            user_id: assignedTo,
            opportunity_id: event.opportunityId,
            third_party_id: event.contact?.id,
          },
        });

        this.logger.log(`Created activity ${activity.id} from automation ${automation.id}`);

        // Registrar ejecución exitosa
        await this.logAutomationExecution(db, {
          automation_type: 'activity',
          automation_id: automation.id,
          trigger_data: {
            opportunity_id: event.opportunityId,
            from_stage: event.fromStageId,
            to_stage: event.toStageId,
          },
          action_data: {
            activity_id: activity.id,
            activity_type: automation.activity_type,
          },
          status: 'success',
        });
      } catch (error) {
        this.logger.error(`Failed to create activity from automation ${automation.id}: ${error.message}`);

        await this.logAutomationExecution(db, {
          automation_type: 'activity',
          automation_id: automation.id,
          trigger_data: {
            opportunity_id: event.opportunityId,
            from_stage: event.fromStageId,
            to_stage: event.toStageId,
          },
          action_data: { activity_type: automation.activity_type },
          status: 'failed',
          error_message: error.message,
        });
      }
    }
  }

  // ============================================
  // Ejecución de automatizaciones de formulario
  // ============================================

  private async executeFormAutomations(event: FormSubmittedEvent) {
    const db = await this.tenantPrisma.getClientForCompany(event.companyId);

    // Buscar automatización para este formulario
    const automation = await db.crmFormAutomation.findUnique({
      where: {
        form_id: event.formId,
        is_active: true,
      },
      include: {
        auto_response_template: true,
      },
    });

    if (!automation) {
      this.logger.debug(`No automation configured for form ${event.formId}`);
      return;
    }

    try {
      let assignedUserId: string | null = null;

      // Determinar asignación
      if (automation.assignment_type === 'specific_user' && automation.assigned_user_id) {
        assignedUserId = automation.assigned_user_id;
      } else if (automation.assignment_type === 'round_robin' && automation.round_robin_users) {
        const users = automation.round_robin_users as string[];
        if (users.length > 0) {
          const index = automation.round_robin_index % users.length;
          assignedUserId = users[index];

          // Actualizar índice de round robin
          await db.crmFormAutomation.update({
            where: { id: automation.id },
            data: { round_robin_index: index + 1 },
          });
        }
      }

      // Si ya hay un lead creado por forms.service.ts, actualizarlo
      if (event.leadId && assignedUserId) {
        await db.crmLead.update({
          where: { id: event.leadId },
          data: { assigned_to: assignedUserId },
        });
      }

      // Crear oportunidad si está configurado
      if (automation.create_opportunity && event.leadId && event.contact) {
        const opportunity = await db.crmOpportunity.create({
          data: {
            name: `Oportunidad desde ${event.formData.name || 'Formulario'}`,
            lead_id: event.leadId,
            third_party_id: event.contact.id,
            stage_id: automation.opportunity_stage_id || await this.getDefaultStageId(db),
            expected_value: automation.opportunity_value || 0,
            probability: automation.opportunity_probability || 10,
            assigned_to: assignedUserId,
          },
        });

        this.logger.log(`Created opportunity ${opportunity.id} from form automation`);
      }

      // Enviar respuesta automática
      if (automation.auto_response_enabled && automation.auto_response_template && event.contact?.email) {
        await this.sendAutoResponseEmail(
          event.companyId,
          automation.auto_response_template,
          event.contact,
        );
      }

      // TODO: Enviar notificación al usuario asignado
      // if (automation.send_notification && assignedUserId) { ... }

      // Registrar ejecución exitosa
      await this.logAutomationExecution(db, {
        automation_type: 'form',
        automation_id: automation.id,
        trigger_data: {
          form_id: event.formId,
          submission_id: event.submissionId,
        },
        action_data: {
          assigned_user_id: assignedUserId,
          opportunity_created: automation.create_opportunity,
          auto_response_sent: automation.auto_response_enabled && !!event.contact?.email,
        },
        status: 'success',
      });
    } catch (error) {
      this.logger.error(`Failed to execute form automation: ${error.message}`);

      await this.logAutomationExecution(db, {
        automation_type: 'form',
        automation_id: automation.id,
        trigger_data: {
          form_id: event.formId,
          submission_id: event.submissionId,
        },
        action_data: {},
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  // ============================================
  // Métodos de envío de mensajes
  // ============================================

  private async sendEmailFromAutomation(
    companyId: string,
    automation: any,
    contact: OpportunityStageChangedEvent['contact'],
    opportunity: OpportunityStageChangedEvent['opportunity'],
  ) {
    if (!contact?.email) {
      this.logger.warn(`Cannot send email: contact has no email`);
      return;
    }

    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Preparar variables para el template
    const subject = this.templateVariables.replaceAll(automation.email_template.subject, {
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company_name: contact.company_name,
      },
      opportunity: {
        name: opportunity.name,
        value: opportunity.expected_value,
      },
    });

    const body = this.templateVariables.replaceAll(automation.email_template.body_html, {
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company_name: contact.company_name,
      },
      opportunity: {
        name: opportunity.name,
        value: opportunity.expected_value,
      },
    });

    // Buscar el third_party_id del contacto
    const thirdParty = await db.thirdParty.findFirst({
      where: { email: contact.email },
    });

    // Enviar email usando EmailSenderService (con fallback a Gmail)
    const result = await this.emailSender.send(companyId, {
      to: contact.email,
      subject,
      html: body,
    });

    // Registrar el envío
    await db.emailSend.create({
      data: {
        template_id: automation.email_template_id,
        third_party_id: thirdParty?.id,
        subject: subject,
        body_html: body,
        status: result.success ? 'SENT' : 'FAILED',
        sent_at: result.success ? new Date() : undefined,
        failure_reason: result.error,
      },
    });

    if (result.success) {
      this.logger.log(`[EMAIL] Sent to ${contact.email}: ${subject} (${result.messageId})`);
    } else {
      this.logger.error(`[EMAIL] Failed to send to ${contact.email}: ${result.error}`);
      throw new Error(result.error);
    }
  }

  private async sendWhatsAppFromAutomation(
    companyId: string,
    automation: any,
    contact: OpportunityStageChangedEvent['contact'],
    opportunity: OpportunityStageChangedEvent['opportunity'],
  ) {
    if (!contact?.whatsapp && !contact?.phone) {
      this.logger.warn(`Cannot send WhatsApp: contact has no phone number`);
      return;
    }

    // TODO: Implementar envío de WhatsApp cuando integrations-service esté listo
    this.logger.log(`[WHATSAPP] Would send to ${contact.whatsapp || contact.phone}`);
  }

  private async sendAutoResponseEmail(
    companyId: string,
    template: any,
    contact: { id: string; name: string; email?: string },
  ) {
    if (!contact.email) return;

    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Preparar variables para el template
    const subject = this.templateVariables.replaceAll(template.subject, {
      contact: { name: contact.name, email: contact.email },
    });

    const body = this.templateVariables.replaceAll(template.body_html, {
      contact: { name: contact.name, email: contact.email },
    });

    // Enviar email usando EmailSenderService
    const result = await this.emailSender.send(companyId, {
      to: contact.email,
      subject,
      html: body,
    });

    // Registrar el envío
    await db.emailSend.create({
      data: {
        template_id: template.id,
        third_party_id: contact.id,
        subject,
        body_html: body,
        status: result.success ? 'SENT' : 'FAILED',
        sent_at: result.success ? new Date() : undefined,
        failure_reason: result.error,
      },
    });

    if (result.success) {
      this.logger.log(`[AUTO-RESPONSE] Sent to ${contact.email}: ${subject}`);
    } else {
      this.logger.warn(`[AUTO-RESPONSE] Failed to send to ${contact.email}: ${result.error}`);
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private async getDefaultStageId(db: any): Promise<string> {
    const stage = await db.crmOpportunityStage.findFirst({
      orderBy: { order: 'asc' },
    });
    return stage?.id || '';
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
  ) {
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
