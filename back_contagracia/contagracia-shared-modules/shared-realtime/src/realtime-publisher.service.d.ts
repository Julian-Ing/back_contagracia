import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RealtimePublisherService implements OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private publisher;
    private isConnected;
    constructor(configService: ConfigService);
    private initializeRedis;
    onModuleDestroy(): Promise<void>;
    private publish;
    /**
     * Notificar que los permisos de un rol cambiaron
     */
    notifyRoleUpdated(companyId: string, roleKey: string): Promise<void>;
    /**
     * Notificar que un usuario cambió de rol
     */
    notifyUserRoleChanged(userId: string, companyId: string, oldRoleKey: string | undefined, newRoleKey: string): Promise<void>;
    /**
     * Forzar logout de un usuario específico
     */
    forceLogoutUser(userId: string, reason: string): Promise<void>;
    /**
     * Forzar logout de todos los usuarios de una compañía
     */
    forceLogoutCompany(companyId: string, reason: string): Promise<void>;
    /**
     * Notificar que la sesión de un usuario fue desplazada por un nuevo login
     */
    notifySessionDisplaced(userId: string, activeSessionId: string, reason: string, deviceInfo?: string): Promise<void>;
    /**
     * Notificar cambio en lista de roles
     */
    notifyRoleListChanged(companyId: string, action: 'created' | 'updated' | 'deleted', roleId: string): Promise<void>;
    /**
     * Notificar cambio en lista de usuarios (tenant)
     */
    notifyUserListChanged(companyId: string, action: 'created' | 'updated' | 'deleted' | 'status_changed', userId: string): Promise<void>;
    /**
     * Notificar cambio en lista de compañías (para admins)
     */
    notifyCompanyListChanged(action: 'created' | 'updated' | 'deleted' | 'status_changed', companyId: string): Promise<void>;
    /**
     * Notificar cambio en lista de usuarios master (para admins)
     */
    notifyMasterUserListChanged(action: 'created' | 'updated' | 'deleted' | 'status_changed', userId: string): Promise<void>;
    /**
     * Notificar nueva notificación creada
     */
    notifyNotificationCreated(companyId: string, notification: {
        id: string;
        type: string;
        title: string;
        message: string;
        action_url?: string | null;
        exclude_user_id?: string | null;
    }): Promise<void>;
    /**
     * Notificar que una notificación fue leída
     */
    notifyNotificationRead(companyId: string, notificationId: string): Promise<void>;
    /**
     * Notificar que todas las notificaciones fueron marcadas como leídas
     */
    notifyNotificationsAllRead(companyId: string): Promise<void>;
    /**
     * Notificar que la configuración de una empresa cambió (ej: display_decimals)
     */
    notifyCompanySettingsUpdated(companyId: string, display_decimals: number): Promise<void>;
}
