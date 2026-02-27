"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RealtimePublisherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimePublisherService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_1 = require("redis");
const realtime_events_1 = require("./realtime.events");
let RealtimePublisherService = RealtimePublisherService_1 = class RealtimePublisherService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RealtimePublisherService_1.name);
        this.isConnected = false;
        this.initializeRedis();
    }
    async initializeRedis() {
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
        this.publisher = (0, redis_1.createClient)({ url: redisUrl });
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
        }
        catch (error) {
            this.logger.error(`Error conectando Redis Publisher: ${error.message}`);
        }
    }
    async onModuleDestroy() {
        if (this.publisher) {
            await this.publisher.quit();
        }
    }
    async publish(channel, event) {
        if (!this.isConnected) {
            this.logger.warn(`Redis no conectado, evento descartado: ${event.type}`);
            return;
        }
        try {
            await this.publisher.publish(channel, JSON.stringify(event));
            this.logger.debug(`Publicado: ${channel} → ${event.type}`);
        }
        catch (error) {
            this.logger.error(`Error publicando evento: ${error.message}`);
        }
    }
    // =============================================
    // EVENTOS DE PERMISOS
    // =============================================
    /**
     * Notificar que los permisos de un rol cambiaron
     */
    async notifyRoleUpdated(companyId, roleKey) {
        const event = {
            type: realtime_events_1.PermissionEventTypes.ROLE_UPDATED,
            payload: { companyId, roleKey },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.PERMISSIONS, event);
        this.logger.log(`Evento: rol ${roleKey} actualizado en compañía ${companyId}`);
    }
    /**
     * Notificar que un usuario cambió de rol
     */
    async notifyUserRoleChanged(userId, companyId, oldRoleKey, newRoleKey) {
        const event = {
            type: realtime_events_1.PermissionEventTypes.USER_ROLE_CHANGED,
            payload: { userId, companyId, oldRoleKey, newRoleKey },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.PERMISSIONS, event);
        this.logger.log(`Evento: usuario ${userId} cambió de rol a ${newRoleKey}`);
    }
    // =============================================
    // EVENTOS DE SESIÓN (FORZAR LOGOUT)
    // =============================================
    /**
     * Forzar logout de un usuario específico
     */
    async forceLogoutUser(userId, reason) {
        const event = {
            type: realtime_events_1.SessionEventTypes.FORCE_LOGOUT_USER,
            payload: { userId, reason },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.SESSIONS, event);
        this.logger.log(`Evento: force logout usuario ${userId}`);
    }
    /**
     * Forzar logout de todos los usuarios de una compañía
     */
    async forceLogoutCompany(companyId, reason) {
        const event = {
            type: realtime_events_1.SessionEventTypes.FORCE_LOGOUT_COMPANY,
            payload: { companyId, reason },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.SESSIONS, event);
        this.logger.log(`Evento: force logout compañía ${companyId}`);
    }
    /**
     * Notificar que la sesión de un usuario fue desplazada por un nuevo login
     */
    async notifySessionDisplaced(userId, activeSessionId, reason, deviceInfo) {
        const event = {
            type: realtime_events_1.SessionEventTypes.SESSION_DISPLACED,
            payload: { userId, activeSessionId, reason, deviceInfo },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.SESSIONS, event);
        this.logger.log(`Evento: sesión desplazada para usuario ${userId}`);
    }
    // =============================================
    // EVENTOS DE LISTAS (CRUD)
    // =============================================
    /**
     * Notificar cambio en lista de roles
     */
    async notifyRoleListChanged(companyId, action, roleId) {
        const event = {
            type: realtime_events_1.ListEventTypes.ROLES_CHANGED,
            payload: { companyId, action, roleId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.LISTS, event);
    }
    /**
     * Notificar cambio en lista de usuarios (tenant)
     */
    async notifyUserListChanged(companyId, action, userId) {
        const event = {
            type: realtime_events_1.ListEventTypes.USERS_CHANGED,
            payload: { companyId, action, userId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.LISTS, event);
    }
    /**
     * Notificar cambio en lista de compañías (para admins)
     */
    async notifyCompanyListChanged(action, companyId) {
        const event = {
            type: realtime_events_1.ListEventTypes.COMPANIES_CHANGED,
            payload: { action, companyId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.LISTS, event);
    }
    /**
     * Notificar cambio en lista de usuarios master (para admins)
     */
    async notifyMasterUserListChanged(action, userId) {
        const event = {
            type: realtime_events_1.ListEventTypes.MASTER_USERS_CHANGED,
            payload: { action, userId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.LISTS, event);
    }
    // =============================================
    // EVENTOS DE NOTIFICACIONES
    // =============================================
    /**
     * Notificar nueva notificación creada
     */
    async notifyNotificationCreated(companyId, notification) {
        const event = {
            type: realtime_events_1.NotificationEventTypes.NOTIFICATION_CREATED,
            payload: { companyId, notification },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.NOTIFICATIONS, event);
    }
    /**
     * Notificar que una notificación fue leída
     */
    async notifyNotificationRead(companyId, notificationId) {
        const event = {
            type: realtime_events_1.NotificationEventTypes.NOTIFICATION_READ,
            payload: { companyId, notificationId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.NOTIFICATIONS, event);
    }
    /**
     * Notificar que todas las notificaciones fueron marcadas como leídas
     */
    async notifyNotificationsAllRead(companyId) {
        const event = {
            type: realtime_events_1.NotificationEventTypes.NOTIFICATIONS_ALL_READ,
            payload: { companyId },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.NOTIFICATIONS, event);
    }
    // =============================================
    // EVENTOS DE CONFIGURACIÓN DE EMPRESA
    // =============================================
    /**
     * Notificar que la configuración de una empresa cambió (ej: display_decimals)
     */
    async notifyCompanySettingsUpdated(companyId, display_decimals) {
        const event = {
            type: realtime_events_1.CompanySettingsEventTypes.SETTINGS_UPDATED,
            payload: { companyId, display_decimals },
            timestamp: new Date().toISOString(),
        };
        await this.publish(realtime_events_1.RealtimeChannels.COMPANY_SETTINGS, event);
        this.logger.log(`Evento: configuración de compañía ${companyId} actualizada`);
    }
};
exports.RealtimePublisherService = RealtimePublisherService;
exports.RealtimePublisherService = RealtimePublisherService = RealtimePublisherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RealtimePublisherService);
