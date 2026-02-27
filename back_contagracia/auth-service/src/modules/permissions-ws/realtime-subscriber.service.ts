import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { PermissionsGateway } from './permissions.gateway';
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
} from '@contagracia/shared-modules';

@Injectable()
export class RealtimeSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeSubscriberService.name);
  private subscriber: RedisClientType;

  constructor(
    private readonly configService: ConfigService,
    private readonly gateway: PermissionsGateway,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.subscriber = createClient({ url: redisUrl });

    this.subscriber.on('error', (err) => {
      this.logger.error(`Redis Subscriber Error: ${err.message}`);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis Subscriber conectado');
    });

    try {
      await this.subscriber.connect();
      this.logger.log('Redis Subscriber conectado OK, suscribiendo a canales...');
    } catch (error) {
      this.logger.error(`Error en connect(): ${error.message}`);
      this.logger.error(error.stack);
      return;
    }

    try {
      await this.subscribeToChannels();
    } catch (error) {
      this.logger.error(`Error en subscribe(): ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  private async subscribeToChannels() {
    this.logger.log(`RealtimeChannels values: ${JSON.stringify(RealtimeChannels)}`);

    const channels = [
      { name: 'PERMISSIONS', value: RealtimeChannels.PERMISSIONS, handler: (m: string) => this.handlePermissionsEvent(m) },
      { name: 'SESSIONS', value: RealtimeChannels.SESSIONS, handler: (m: string) => this.handleSessionsEvent(m) },
      { name: 'LISTS', value: RealtimeChannels.LISTS, handler: (m: string) => this.handleListsEvent(m) },
      { name: 'NOTIFICATIONS', value: RealtimeChannels.NOTIFICATIONS, handler: (m: string) => this.handleNotificationsEvent(m) },
      { name: 'COMPANY_SETTINGS', value: RealtimeChannels.COMPANY_SETTINGS, handler: (m: string) => this.handleCompanySettingsEvent(m) },
    ];

    for (const ch of channels) {
      if (!ch.value) {
        this.logger.warn(`Canal ${ch.name} es undefined, saltando...`);
        continue;
      }
      try {
        await this.subscriber.subscribe(ch.value, ch.handler);
        this.logger.log(`Suscrito a: ${ch.name} (${ch.value})`);
      } catch (err) {
        this.logger.error(`Error suscribiendo a ${ch.name}: ${err.message}`);
      }
    }

    this.logger.log('Suscripción a canales completada');
    return;

    // --- Código original abajo (no se ejecuta) ---
    await this.subscriber.subscribe(
      RealtimeChannels.PERMISSIONS,
      (message) => this.handlePermissionsEvent(message),
    );

    await this.subscriber.subscribe(
      RealtimeChannels.SESSIONS,
      (message) => this.handleSessionsEvent(message),
    );

    await this.subscriber.subscribe(
      RealtimeChannels.LISTS,
      (message) => this.handleListsEvent(message),
    );

    await this.subscriber.subscribe(
      RealtimeChannels.NOTIFICATIONS,
      (message) => this.handleNotificationsEvent(message),
    );

    await this.subscriber.subscribe(
      RealtimeChannels.COMPANY_SETTINGS,
      (message) => this.handleCompanySettingsEvent(message),
    );

    this.logger.log('Suscrito a canales: permissions, sessions, lists, notifications, company_settings');
  }

  private handlePermissionsEvent(message: string) {
    try {
      const event: RealtimeEvent = JSON.parse(message);

      switch (event.type) {
        case PermissionEventTypes.ROLE_UPDATED: {
          const payload = event.payload as RoleUpdatedPayload;
          this.gateway.emitRoleUpdated(payload.companyId, payload.roleKey);
          break;
        }
        case PermissionEventTypes.USER_ROLE_CHANGED: {
          const payload = event.payload as UserRoleChangedPayload;
          if (payload.oldRoleKey) {
            this.gateway.moveUserToNewRole(
              payload.userId,
              payload.companyId,
              payload.oldRoleKey,
              payload.newRoleKey,
            );
          }
          this.gateway.emitUserRoleChanged(payload.userId, payload.newRoleKey);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error procesando evento de permisos: ${error.message}`);
    }
  }

  private handleSessionsEvent(message: string) {
    try {
      const event: RealtimeEvent = JSON.parse(message);

      switch (event.type) {
        case SessionEventTypes.FORCE_LOGOUT_USER: {
          const payload = event.payload as ForceLogoutUserPayload;
          this.gateway.emitForceLogout(payload.userId, payload.reason);
          break;
        }
        case SessionEventTypes.FORCE_LOGOUT_COMPANY: {
          const payload = event.payload as ForceLogoutCompanyPayload;
          this.gateway.emitCompanyForceLogout(payload.companyId, payload.reason);
          break;
        }
        case SessionEventTypes.SESSION_DISPLACED: {
          const payload = event.payload as SessionDisplacedPayload;
          this.gateway.emitSessionDisplaced(
            payload.userId,
            payload.activeSessionId,
            payload.reason,
            payload.deviceInfo,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error procesando evento de sesión: ${error.message}`);
    }
  }

  private handleListsEvent(message: string) {
    try {
      const event: RealtimeEvent = JSON.parse(message);
      const payload = event.payload as ListChangedPayload;

      switch (event.type) {
        case ListEventTypes.ROLES_CHANGED:
          this.gateway.emitRoleListChanged(
            payload.companyId!,
            payload.action,
            payload.roleId!,
          );
          break;
        case ListEventTypes.USERS_CHANGED:
          this.gateway.emitUserListChanged(
            payload.companyId!,
            payload.action,
            payload.userId!,
          );
          break;
        case ListEventTypes.COMPANIES_CHANGED:
          this.gateway.emitCompanyListChanged(payload.action, payload.companyId!);
          break;
        case ListEventTypes.MASTER_USERS_CHANGED:
          this.gateway.emitMasterUserListChanged(payload.action, payload.userId!);
          break;
      }
    } catch (error) {
      this.logger.error(`Error procesando evento de lista: ${error.message}`);
    }
  }

  private handleCompanySettingsEvent(message: string) {
    try {
      const event: RealtimeEvent = JSON.parse(message);

      switch (event.type) {
        case CompanySettingsEventTypes.SETTINGS_UPDATED: {
          const payload = event.payload as CompanySettingsUpdatedPayload;
          this.gateway.emitCompanySettingsUpdated(payload.companyId, payload.display_decimals);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error procesando evento de configuración: ${error.message}`);
    }
  }

  private handleNotificationsEvent(message: string) {
    try {
      const event: RealtimeEvent = JSON.parse(message);

      switch (event.type) {
        case NotificationEventTypes.NOTIFICATION_CREATED: {
          const payload = event.payload as NotificationCreatedPayload;
          this.gateway.emitNotificationCreated(payload.companyId, payload.notification);
          break;
        }
        case NotificationEventTypes.NOTIFICATION_READ: {
          const payload = event.payload as NotificationReadPayload;
          this.gateway.emitNotificationRead(payload.companyId, payload.notificationId);
          break;
        }
        case NotificationEventTypes.NOTIFICATIONS_ALL_READ: {
          const payload = event.payload as NotificationsAllReadPayload;
          this.gateway.emitNotificationsAllRead(payload.companyId);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error procesando evento de notificaciones: ${error.message}`);
    }
  }
}
