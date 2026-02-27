import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { TemplateVariablesService, ContactVariables, OpportunityVariables, CompanyVariables } from './template-variables.service';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendFromTemplateParams {
  companyId: string;
  templateId: string;
  to: string;
  variables?: {
    contact?: ContactVariables;
    opportunity?: OpportunityVariables;
    company?: CompanyVariables;
    custom?: Record<string, string>;
  };
}

/**
 * Servicio para envío de emails usando Nodemailer
 * La configuración SMTP se obtiene de la tabla email_sms_config por tenant
 * Si no hay configuración del tenant, usa las variables de entorno como fallback
 */
@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  // Configuración SMTP por defecto desde variables de entorno
  private readonly defaultSmtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
  };

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly templateVariables: TemplateVariablesService,
    private readonly configService: ConfigService,
  ) {
    // Cargar config de fallback desde env vars
    this.defaultSmtpConfig = {
      host: this.configService.get<string>('DEFAULT_SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('DEFAULT_SMTP_PORT', '587'), 10),
      secure: this.configService.get<string>('DEFAULT_SMTP_PORT', '587') === '465',
      user: this.configService.get<string>('DEFAULT_SMTP_USER', ''),
      password: this.configService.get<string>('DEFAULT_SMTP_PASSWORD', ''),
      fromName: this.configService.get<string>('DEFAULT_SMTP_FROM_NAME', 'Contagracia'),
    };
  }

  /**
   * Envía un email usando una plantilla
   */
  async sendFromTemplate(params: SendFromTemplateParams): Promise<EmailResult> {
    const db = await this.tenantPrisma.getClientForCompany(params.companyId);

    // Obtener template
    const template = await db.emailTemplate.findUnique({
      where: { id: params.templateId },
    });

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Reemplazar variables en subject y body
    const subject = this.templateVariables.replaceAll(template.subject, params.variables || {});
    const html = this.templateVariables.replaceAll(template.body_html, params.variables || {});

    // Enviar email
    return this.send(params.companyId, {
      to: params.to,
      subject,
      html,
    });
  }

  /**
   * Envía un email directamente
   * Usa configuración SMTP de la empresa o Gmail como fallback
   */
  async send(companyId: string, params: SendEmailParams): Promise<EmailResult> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Obtener configuración SMTP de la empresa
    const config = await db.emailSmsConfig.findFirst();

    // Determinar qué configuración usar (empresa o fallback desde env vars)
    const useDefaultSmtp = !config?.smtp_host || !config?.smtp_user || !config?.smtp_password;

    if (useDefaultSmtp) {
      if (!this.defaultSmtpConfig.user || !this.defaultSmtpConfig.password) {
        this.logger.warn(`[${companyId}] No SMTP config available (tenant or default)`);
        return {
          success: false,
          error: 'No hay configuración SMTP disponible. Configura el email en el perfil de empresa.',
        };
      }
      this.logger.debug(`[${companyId}] Using default SMTP from env vars (no tenant config found)`);
    }

    const smtpHost = useDefaultSmtp ? this.defaultSmtpConfig.host : config!.smtp_host!;
    const smtpPort = useDefaultSmtp ? this.defaultSmtpConfig.port : (config!.smtp_port || 587);
    const smtpSecure = useDefaultSmtp ? this.defaultSmtpConfig.secure : (config!.smtp_port === 465);
    const smtpUser = useDefaultSmtp ? this.defaultSmtpConfig.user : config!.smtp_user!;
    const smtpPassword = useDefaultSmtp ? this.defaultSmtpConfig.password : config!.smtp_password!;
    const smtpFromName = useDefaultSmtp ? this.defaultSmtpConfig.fromName : config?.from_name;

    try {
      // Crear transporter con la configuración SMTP
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      } as nodemailer.TransportOptions);

      // Preparar el remitente
      const from = params.from || (smtpFromName
        ? `"${smtpFromName}" <${smtpUser}>`
        : smtpUser);

      // Enviar email
      const info = await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      this.logger.log(`Email sent successfully to ${params.to}: ${(info as any).messageId}`);

      return {
        success: true,
        messageId: (info as any).messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to}: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Registra un envío de email en la tabla crm_email_sends
   */
  async logEmailSend(
    companyId: string,
    data: {
      template_id?: string;
      third_party_id?: string;
      campaign_id?: string;
      subject: string;
      body_html: string;
      status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
      sent_at?: Date;
      failure_reason?: string;
    },
  ): Promise<void> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    await db.emailSend.create({
      data: {
        template_id: data.template_id,
        third_party_id: data.third_party_id,
        campaign_id: data.campaign_id,
        subject: data.subject,
        body_html: data.body_html,
        status: data.status,
        sent_at: data.sent_at,
        failure_reason: data.failure_reason,
      },
    });
  }

  /**
   * Verifica si la configuración SMTP está disponible para una empresa
   * Retorna true si el tenant tiene config o si hay env vars de fallback
   */
  async isSmtpConfigured(companyId: string): Promise<boolean> {
    // Primero verificar config del tenant
    const hasTenantConfig = await this.hasTenantSmtpConfig(companyId);
    if (hasTenantConfig) return true;

    // Si no hay config del tenant, verificar si hay env vars de fallback
    return !!(this.defaultSmtpConfig.user && this.defaultSmtpConfig.password);
  }

  /**
   * Verifica si la empresa tiene su propia configuración SMTP (no usa fallback)
   */
  async hasTenantSmtpConfig(companyId: string): Promise<boolean> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const config = await db.emailSmsConfig.findFirst();
    return !!(config?.smtp_host && config?.smtp_user && config?.smtp_password);
  }
}
