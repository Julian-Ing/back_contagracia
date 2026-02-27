import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import {
  RealtimeChannels,
  PermissionEventTypes,
  SessionEventTypes,
  ListEventTypes,
  NotificationEventTypes,
  CompanySettingsEventTypes,
  RealtimeEvent,
  RoleUpdatedPayload,
  UserRoleChangedPayload,
  ForceLogoutUserPayload,
  ForceLogoutCompanyPayload,
  SessionDisplacedPayload,
  ListChangedPayload,
  NotificationCreatedPayload,
  NotificationReadPayload,
  NotificationsAllReadPayload,
  CompanySettingsUpdatedPayload,
} from './realtime.events';

@Injectable()
export class RealtimePublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisherService.name);
  private publisher: RedisClientType;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.publisher = createClient({ url: redisUrl });

    this.publisher.on('error', (err) => {
      this.logger.error(`Redis Publisher Error: ${err.message}`);
      this.isConnected = false;
    });

    this.publisher.on('connect', () => {
      this.logger.log('Redis Publisher conectado');
      this.isConnected = true;
    });

    try {
      await this.publisher.connect();
    } catch (error) {
      this.logger.error(`Error conectando Redis Publisher: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.publisher) {
      await this.publisher.quit();
    }
  }

  private async publish(channel: string, event: RealtimeEvent): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Redis no conectado, evento descartado: ${event.type}`);
      return;
    }

    try {
      await this.publisher.publish(channel, JSON.stringify(event));
      this.logger.debug(`Publicado: ${channel} → ${event.type}`);
    } catch (error) {
      this.logger.error(`Error publicando evento: ${error.message}`);
    }
  }

  // =============================================
  // EVENTOS DE PERMISOS
  // =============================================

  /**
   * Notificar que los permisos de un rol cambiaron
   */
  async notifyRoleUpdated(companyId: string, roleKey: string): Promise<void> {
    const event: RealtimeEvent<RoleUpdatedPayload> = {
      type: PermissionEventTypes.ROLE_UPDATED,
      payload: { companyId, roleKey },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.PERMISSIONS, event);
    this.logger.log(`Evento: rol ${roleKey} actualizado en compañía ${companyId}`);
  }

  /**
   * Notificar que un usuario cambió de rol
   */
  async notifyUserRoleChanged(
    userId: string,
    companyId: string,
    oldRoleKey: string | undefined,
    newRoleKey: string,
  ): Promise<void> {
    const event: RealtimeEvent<UserRoleChangedPayload> = {
      type: PermissionEventTypes.USER_ROLE_CHANGED,
      payload: { userId, companyId, oldRoleKey, newRoleKey },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.PERMISSIONS, event);
    this.logger.log(`Evento: usuario ${userId} cambió de rol a ${newRoleKey}`);
  }

  // =============================================
  // EVENTOS DE SESIÓN (FORZAR LOGOUT)
  // =============================================

  /**
   * Forzar logout de un usuario específico
   */
  async forceLogoutUser(userId: string, reason: string): Promise<void> {
    const event: RealtimeEvent<ForceLogoutUserPayload> = {
      type: SessionEventTypes.FORCE_LOGOUT_USER,
      payload: { userId, reason },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.SESSIONS, event);
    this.logger.log(`Evento: force logout usuario ${userId}`);
  }

  /**
   * Forzar logout de todos los usuarios de una compañía
   */
  async forceLogoutCompany(companyId: string, reason: string): Promise<void> {
    const event: RealtimeEvent<ForceLogoutCompanyPayload> = {
      type: SessionEventTypes.FORCE_LOGOUT_COMPANY,
      payload: { companyId, reason },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.SESSIONS, event);
    this.logger.log(`Evento: force logout compañía ${companyId}`);
  }

  /**
   * Notificar que la sesión de un usuario fue desplazada por un nuevo login
   */
  async notifySessionDisplaced(
    userId: string,
    activeSessionId: string,
    reason: string,
    deviceInfo?: string,
  ): Promise<void> {
    const event: RealtimeEvent<SessionDisplacedPayload> = {
      type: SessionEventTypes.SESSION_DISPLACED,
      payload: { userId, activeSessionId, reason, deviceInfo },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.SESSIONS, event);
    this.logger.log(`Evento: sesión desplazada para usuario ${userId}`);
  }

  // =============================================
  // EVENTOS DE LISTAS (CRUD)
  // =============================================

  /**
   * Notificar cambio en lista de roles
   */
  async notifyRoleListChanged(
    companyId: string,
    action: 'created' | 'updated' | 'deleted',
    roleId: string,
  ): Promise<void> {
    const event: RealtimeEvent<ListChangedPayload> = {
      type: ListEventTypes.ROLES_CHANGED,
      payload: { companyId, action, roleId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.LISTS, event);
  }

  /**
   * Notificar cambio en lista de usuarios (tenant)
   */
  async notifyUserListChanged(
    companyId: string,
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    userId: string,
  ): Promise<void> {
    const event: RealtimeEvent<ListChangedPayload> = {
      type: ListEventTypes.USERS_CHANGED,
      payload: { companyId, action, userId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.LISTS, event);
  }

  /**
   * Notificar cambio en lista de compañías (para admins)
   */
  async notifyCompanyListChanged(
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    companyId: string,
  ): Promise<void> {
    const event: RealtimeEvent<ListChangedPayload> = {
      type: ListEventTypes.COMPANIES_CHANGED,
      payload: { action, companyId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.LISTS, event);
  }

  /**
   * Notificar cambio en lista de usuarios master (para admins)
   */
  async notifyMasterUserListChanged(
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    userId: string,
  ): Promise<void> {
    const event: RealtimeEvent<ListChangedPayload> = {
      type: ListEventTypes.MASTER_USERS_CHANGED,
      payload: { action, userId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.LISTS, event);
  }

  // =============================================
  // EVENTOS DE NOTIFICACIONES
  // =============================================

  /**
   * Notificar nueva notificación creada
   */
  async notifyNotificationCreated(
    companyId: string,
    notification: { id: string; type: string; title: string; message: string; action_url?: string | null; exclude_user_id?: string | null },
  ): Promise<void> {
    const event: RealtimeEvent<NotificationCreatedPayload> = {
      type: NotificationEventTypes.NOTIFICATION_CREATED,
      payload: { companyId, notification },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.NOTIFICATIONS, event);
  }

  /**
   * Notificar que una notificación fue leída
   */
  async notifyNotificationRead(companyId: string, notificationId: string): Promise<void> {
    const event: RealtimeEvent<NotificationReadPayload> = {
      type: NotificationEventTypes.NOTIFICATION_READ,
      payload: { companyId, notificationId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.NOTIFICATIONS, event);
  }

  /**
   * Notificar que todas las notificaciones fueron marcadas como leídas
   */
  async notifyNotificationsAllRead(companyId: string): Promise<void> {
    const event: RealtimeEvent<NotificationsAllReadPayload> = {
      type: NotificationEventTypes.NOTIFICATIONS_ALL_READ,
      payload: { companyId },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.NOTIFICATIONS, event);
  }

  // =============================================
  // EVENTOS DE CONFIGURACIÓN DE EMPRESA
  // =============================================

  /**
   * Notificar que la configuración de una empresa cambió (ej: display_decimals)
   */
  async notifyCompanySettingsUpdated(
    companyId: string,
    display_decimals: number,
  ): Promise<void> {
    const event: RealtimeEvent<CompanySettingsUpdatedPayload> = {
      type: CompanySettingsEventTypes.SETTINGS_UPDATED,
      payload: { companyId, display_decimals },
      timestamp: new Date().toISOString(),
    };
    await this.publish(RealtimeChannels.COMPANY_SETTINGS, event);
    this.logger.log(`Evento: configuración de compañía ${companyId} actualizada`);
  }
}
