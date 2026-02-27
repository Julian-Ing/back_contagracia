/**
 * Canales de Redis para eventos realtime
 */
export declare const RealtimeChannels: {
    readonly PERMISSIONS: "realtime:permissions";
    readonly SESSIONS: "realtime:sessions";
    readonly LISTS: "realtime:lists";
    readonly NOTIFICATIONS: "realtime:notifications";
    readonly COMPANY_SETTINGS: "realtime:company_settings";
};
/**
 * Tipos de eventos de permisos
 */
export declare const PermissionEventTypes: {
    readonly ROLE_UPDATED: "role_updated";
    readonly USER_ROLE_CHANGED: "user_role_changed";
};
/**
 * Tipos de eventos de sesión
 */
export declare const SessionEventTypes: {
    readonly FORCE_LOGOUT_USER: "force_logout_user";
    readonly FORCE_LOGOUT_COMPANY: "force_logout_company";
    readonly SESSION_DISPLACED: "session_displaced";
};
/**
 * Tipos de eventos de listas
 */
export declare const ListEventTypes: {
    readonly ROLES_CHANGED: "roles_changed";
    readonly USERS_CHANGED: "users_changed";
    readonly COMPANIES_CHANGED: "companies_changed";
    readonly MASTER_USERS_CHANGED: "master_users_changed";
};
/**
 * Tipos de eventos de notificaciones
 */
export declare const NotificationEventTypes: {
    readonly NOTIFICATION_CREATED: "notification_created";
    readonly NOTIFICATION_READ: "notification_read";
    readonly NOTIFICATIONS_ALL_READ: "notifications_all_read";
};
/**
 * Tipos de eventos de configuración de empresa
 */
export declare const CompanySettingsEventTypes: {
    readonly SETTINGS_UPDATED: "company_settings_updated";
};
/**
 * Interfaces de payload para eventos
 */
export interface RoleUpdatedPayload {
    companyId: string;
    roleKey: string;
}
export interface UserRoleChangedPayload {
    userId: string;
    companyId: string;
    oldRoleKey?: string;
    newRoleKey: string;
}
export interface ForceLogoutUserPayload {
    userId: string;
    reason: string;
}
export interface ForceLogoutCompanyPayload {
    companyId: string;
    reason: string;
}
export interface SessionDisplacedPayload {
    userId: string;
    activeSessionId: string;
    reason: string;
    deviceInfo?: string;
}
export interface ListChangedPayload {
    action: 'created' | 'updated' | 'deleted' | 'status_changed';
    companyId?: string;
    roleId?: string;
    userId?: string;
}
export interface NotificationCreatedPayload {
    companyId: string;
    notification: {
        id: string;
        type: string;
        title: string;
        message: string;
        action_url?: string | null;
        exclude_user_id?: string | null;
    };
}
export interface NotificationReadPayload {
    companyId: string;
    notificationId: string;
}
export interface NotificationsAllReadPayload {
    companyId: string;
}
export interface CompanySettingsUpdatedPayload {
    companyId: string;
    display_decimals: number;
}
/**
 * Estructura de mensaje de evento
 */
export interface RealtimeEvent<T = any> {
    type: string;
    payload: T;
    timestamp: string;
}
