import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener configuración SMTP de la base de datos
   */
  private async getSmtpConfig(): Promise<SmtpConfig | null> {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: {
          code: 'smtp',
          is_active: true,
        },
        include: {
          keys: true,
        },
      });

      if (!integration) {
        this.logger.warn('SMTP integration not found or inactive');
        return null;
      }

      const keys = integration.keys.reduce(
        (acc, key) => {
          acc[key.key_name] = key.key_value;
          return acc;
        },
        {} as Record<string, string>,
      );

      // Validar que todas las keys requeridas existan y tengan valor
      const requiredKeys = ['host', 'port', 'user', 'password', 'from_email'];
      for (const key of requiredKeys) {
        if (!keys[key]) {
          this.logger.warn(`SMTP configuration missing required key: ${key}`);
          return null;
        }
      }

      return {
        host: keys.host,
        port: parseInt(keys.port, 10) || 587,
        secure: keys.secure === 'true',
        user: keys.user,
        password: keys.password,
        from_email: keys.from_email,
        from_name: keys.from_name || 'Contagracia',
      };
    } catch (error) {
      this.logger.error('Error getting SMTP config', error);
      return null;
    }
  }

  /**
   * Inicializar o reinicializar el transporter con la configuración actual
   */
  private async initializeTransporter(): Promise<boolean> {
    const config = await this.getSmtpConfig();

    if (!config) {
      this.transporter = null;
      this.smtpConfig = null;
      return false;
    }

    // Si la configuración cambió, crear nuevo transporter
    if (
      !this.smtpConfig ||
      this.smtpConfig.host !== config.host ||
      this.smtpConfig.port !== config.port ||
      this.smtpConfig.user !== config.user ||
      this.smtpConfig.password !== config.password
    ) {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      });

      this.smtpConfig = config;
      this.logger.log(`SMTP transporter initialized: ${config.host}:${config.port}`);
    }

    return true;
  }

  /**
   * Verificar si el servicio de email está configurado y activo
   */
  async isConfigured(): Promise<boolean> {
    return await this.initializeTransporter();
  }

  /**
   * Enviar email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const initialized = await this.initializeTransporter();

    if (!initialized || !this.transporter || !this.smtpConfig) {
      this.logger.error('Email service not configured. Cannot send email.');
      throw new InternalServerErrorException(
        'El servicio de email no está configurado. Contacte al administrador.',
      );
    }

    try {
      const mailOptions = {
        from: `"${this.smtpConfig.from_name}" <${this.smtpConfig.from_email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw new InternalServerErrorException(
        'Error al enviar el email. Por favor intente de nuevo.',
      );
    }
  }

  /**
   * Enviar código de verificación
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center;
                  padding: 20px; background: white; border-radius: 8px; margin: 20px 0;
                  letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contagracia</h1>
          </div>
          <div class="content">
            <h2>Verifica tu email</h2>
            <p>Usa el siguiente codigo para verificar tu direccion de email:</p>
            <div class="code">${code}</div>
            <p>Este codigo expira en <strong>15 minutos</strong>.</p>
            <p>Si no solicitaste este codigo, puedes ignorar este mensaje.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Contagracia. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `${code} - Codigo de verificacion Contagracia`,
      html,
    });
  }

  /**
   * Enviar email de bienvenida después del registro
   */
  async sendWelcomeEmail(email: string, fullName: string, companyName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenido a Contagracia</h1>
          </div>
          <div class="content">
            <h2>Hola ${fullName}!</h2>
            <p>Tu empresa <strong>${companyName}</strong> ha sido registrada exitosamente.</p>
            <p>Ya puedes acceder a tu cuenta y comenzar a gestionar tu negocio con todas las herramientas que Contagracia tiene para ti.</p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Contagracia. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Bienvenido a Contagracia, ${fullName}!`,
      html,
    });
  }

  /**
   * Enviar código de recuperación de contraseña
   */
  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; color: #DC2626; text-align: center;
                  padding: 20px; background: white; border-radius: 8px; margin: 20px 0;
                  letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperar Contraseña</h1>
          </div>
          <div class="content">
            <h2>Código de verificación</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
            <div class="code">${code}</div>
            <p>Este código expira en <strong>15 minutos</strong>.</p>
            <div class="warning">
              <strong>Importante:</strong> Si no solicitaste restablecer tu contraseña, ignora este mensaje. Tu cuenta sigue segura.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Contagracia. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `${code} - Recuperar contraseña Contagracia`,
      html,
    });
  }
}
