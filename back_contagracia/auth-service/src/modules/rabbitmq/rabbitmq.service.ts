import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;
  private hasLoggedError = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';

    try {
      const rabbitMQUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';

      this.connection = await amqp.connect(rabbitMQUrl) as any;
      this.channel = await (this.connection as any).createChannel();

      // Declarar exchange para emails
      await this.channel.assertExchange('email_events', 'topic', { durable: true });

      this.isConnected = true;
      console.log('✅ RabbitMQ Connected');
      this.hasLoggedError = false;

      (this.connection as any).on('error', (err: any) => {
        // En desarrollo, solo loguear el primer error
        if (!isDevelopment || !this.hasLoggedError) {
          console.warn('⚠️ RabbitMQ connection error (email notifications disabled)');
          this.hasLoggedError = true;
        }
        this.isConnected = false;
      });

      (this.connection as any).on('close', () => {
        if (!isDevelopment || !this.hasLoggedError) {
          console.warn('⚠️ RabbitMQ connection closed');
          this.hasLoggedError = true;
        }
        this.isConnected = false;
      });
    } catch (error) {
      // En desarrollo, solo mostrar mensaje informativo
      if (!this.hasLoggedError) {
        if (isDevelopment) {
          console.warn('⚠️ RabbitMQ not available (email notifications disabled)');
        } else {
          console.error('Failed to connect to RabbitMQ:', error);
        }
        this.hasLoggedError = true;
      }
      this.isConnected = false;
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      this.isConnected = false;
    } catch (error) {
      // Silently ignore disconnect errors
      this.isConnected = false;
    }
  }

  /**
   * Emitir evento de verificación de email
   */
  async emitEmailVerification(data: {
    user_id: string;
    email: string;
    token: string;
    full_name: string;
    company_name?: string;
  }): Promise<void> {
    if (!this.isConnected) {
      // Silently skip if not connected (already logged on connection failure)
      return;
    }

    const event = {
      event: 'email.verification.send',
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      'email_events',
      'email.verification.send',
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log('Email verification event emitted:', data.email);
  }

  /**
   * Emitir evento de reset de contraseña
   */
  async emitPasswordReset(data: {
    user_id: string;
    email: string;
    token: string;
    full_name: string;
  }): Promise<void> {
    if (!this.isConnected) {
      // Silently skip if not connected (already logged on connection failure)
      return;
    }

    const event = {
      event: 'email.password_reset.send',
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      'email_events',
      'email.password_reset.send',
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log('Password reset event emitted:', data.email);
  }

  /**
   * Emitir evento de contraseña cambiada
   */
  async emitPasswordChanged(data: {
    user_id: string;
    email: string;
    full_name: string;
  }): Promise<void> {
    if (!this.isConnected) {
      // Silently skip if not connected (already logged on connection failure)
      return;
    }

    const event = {
      event: 'email.password_changed',
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      'email_events',
      'email.password_changed',
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log('Password changed event emitted:', data.email);
  }

  /**
   * Emitir evento de alerta de login
   */
  async emitLoginAlert(data: {
    user_id: string;
    email: string;
    full_name: string;
    ip_address: string;
    device: string;
    location?: string;
  }): Promise<void> {
    if (!this.isConnected) {
      // Silently skip if not connected (already logged on connection failure)
      return;
    }

    const event = {
      event: 'email.login_alert',
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      'email_events',
      'email.login_alert',
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log('Login alert event emitted:', data.email);
  }

  /**
   * Emitir evento genérico
   */
  async emit(routingKey: string, data: any): Promise<void> {
    if (!this.isConnected) {
      // Silently skip if not connected (already logged on connection failure)
      return;
    }

    const event = {
      event: routingKey,
      data,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      'email_events',
      routingKey,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log(`Event emitted: ${routingKey}`);
  }

  /**
   * Verificar si RabbitMQ está conectado
   */
  isRabbitMQConnected(): boolean {
    return this.isConnected;
  }
}
