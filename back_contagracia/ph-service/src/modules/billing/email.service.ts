import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class BillingEmailService {
  private readonly logger = new Logger(BillingEmailService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Verifica si la empresa tiene SMTP configurado
   */
  async isSmtpConfigured(companyId: string): Promise<boolean> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const config = await db.emailSmsConfig.findFirst();
    return !!(config?.smtp_host && config?.smtp_user && config?.smtp_password);
  }

  /**
   * Envía un email usando la configuración SMTP del tenant
   */
  async sendEmail(
    companyId: string,
    params: SendEmailParams,
  ): Promise<EmailResult> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const config = await db.emailSmsConfig.findFirst();

    if (!config?.smtp_host || !config?.smtp_user || !config?.smtp_password) {
      return {
        success: false,
        error:
          'No hay configuración SMTP. Configura el email en Perfil de Empresa → Integraciones.',
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_port === 465,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password,
        },
      } as nodemailer.TransportOptions);

      const from = config.from_name
        ? `"${config.from_name}" <${config.smtp_user}>`
        : config.smtp_user;

      await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: 'application/pdf',
        })),
      });

      this.logger.log(`Email enviado a ${params.to}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error enviando email a ${params.to}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }
}
