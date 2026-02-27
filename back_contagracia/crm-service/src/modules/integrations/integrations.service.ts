import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

interface EmailConfig {
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_password: string | null;
  from_name: string | null;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
  ) {}

  // ============================================
  // Email Config
  // ============================================

  async getEmailConfig(companyId: string): Promise<EmailConfig | null> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const config = await db.emailSmsConfig.findFirst();

    if (!config) {
      return null;
    }

    return {
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_password: null, // Never return the password
      from_name: config.from_name,
    };
  }

  async upsertEmailConfig(
    companyId: string,
    data: Partial<EmailConfig>,
  ): Promise<EmailConfig> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Check if config exists
    const existing = await db.emailSmsConfig.findFirst();

    const updateData: any = {
      smtp_host: data.smtp_host ?? undefined,
      smtp_port: data.smtp_port ?? undefined,
      smtp_user: data.smtp_user ?? undefined,
      from_name: data.from_name ?? undefined,
    };

    // Only update password if provided
    if (data.smtp_password) {
      updateData.smtp_password = data.smtp_password;
    }

    let config;

    if (existing) {
      config = await db.emailSmsConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      config = await db.emailSmsConfig.create({
        data: {
          smtp_host: data.smtp_host || null,
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || null,
          smtp_password: data.smtp_password || null,
          from_name: data.from_name || null,
        },
      });
    }

    this.logger.log(`[${companyId}] Email config updated`);

    return {
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_password: null, // Never return the password
      from_name: config.from_name,
    };
  }

  async testEmailConfig(companyId: string): Promise<{ success: boolean; error?: string }> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const config = await db.emailSmsConfig.findFirst();

    if (!config || !config.smtp_host || !config.smtp_user || !config.smtp_password) {
      return {
        success: false,
        error: 'Configuración SMTP incompleta. Guarda la configuración primero.',
      };
    }

    try {
      // Create transporter with saved config
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_port === 465,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password,
        },
      });

      // Verify connection
      await transporter.verify();

      // Send test email
      await transporter.sendMail({
        from: `"${config.from_name || 'Contagracia'}" <${config.smtp_user}>`,
        to: config.smtp_user, // Send to self
        subject: 'Email de Prueba - Contagracia',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10B981;">✅ Configuración Exitosa</h2>
            <p>Tu configuración de email SMTP está funcionando correctamente.</p>
            <p style="color: #6b7280; font-size: 14px;">
              Servidor: ${config.smtp_host}<br>
              Puerto: ${config.smtp_port}<br>
              Usuario: ${config.smtp_user}<br>
              Fecha: ${new Date().toLocaleString('es-CO')}
            </p>
          </div>
        `,
      });

      this.logger.log(`[${companyId}] Test email sent successfully to ${config.smtp_user}`);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`[${companyId}] Test email failed: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Error al conectar con el servidor SMTP',
      };
    }
  }

  // ============================================
  // Twilio Config (placeholder)
  // ============================================

  async getTwilioConfig(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const config = await db.emailSmsConfig.findFirst();

    if (!config) {
      return null;
    }

    return {
      twilio_account_sid: config.twilio_account_sid,
      twilio_whatsapp_number: config.twilio_whatsapp_number,
      // Never return auth_token
    };
  }

  async upsertTwilioConfig(
    companyId: string,
    data: {
      twilio_account_sid?: string;
      twilio_auth_token?: string;
      twilio_whatsapp_number?: string;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.emailSmsConfig.findFirst();

    const updateData: any = {};
    if (data.twilio_account_sid !== undefined) {
      updateData.twilio_account_sid = data.twilio_account_sid;
    }
    if (data.twilio_auth_token) {
      updateData.twilio_auth_token = data.twilio_auth_token;
    }
    if (data.twilio_whatsapp_number !== undefined) {
      updateData.twilio_whatsapp_number = data.twilio_whatsapp_number;
    }

    if (existing) {
      await db.emailSmsConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await db.emailSmsConfig.create({
        data: {
          twilio_account_sid: data.twilio_account_sid || null,
          twilio_auth_token: data.twilio_auth_token || null,
          twilio_whatsapp_number: data.twilio_whatsapp_number || null,
        },
      });
    }

    // Sync whatsapp_number to master Company for webhook routing
    if (data.twilio_whatsapp_number !== undefined) {
      try {
        await this.masterPrisma.company.update({
          where: { id: companyId },
          data: { whatsapp_number: data.twilio_whatsapp_number || null },
        });
        this.logger.log(`[${companyId}] Synced whatsapp_number to master: ${data.twilio_whatsapp_number}`);
      } catch (error: any) {
        this.logger.error(`[${companyId}] Failed to sync whatsapp_number to master: ${error.message}`);
      }
    }

    return {
      twilio_account_sid: data.twilio_account_sid,
      twilio_whatsapp_number: data.twilio_whatsapp_number,
    };
  }
}
