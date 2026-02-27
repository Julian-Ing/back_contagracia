/**
 * Canales de Redis para eventos realtime
 */
export const RealtimeChannels = {
  // Permisos
  PERMISSIONS: 'realtime:permissions',
  // Sesiones
  SESSIONS: 'realtime:sessions',
  // Listas (CRUD updates)
  LISTS: 'realtime:lists',
  // Notificaciones
  NOTIFICATIONS: 'realtime:notifications',
  // Configuración de empresa
  COMPANY_SETTINGS: 'realtime:company_settings',
} as const;

/**
 * Tipos de eventos de permisos
 */
export const PermissionEventTypes = {
  ROLE_UPDATED: 'role_updated',
  USER_ROLE_CHANGED: 'user_role_changed',
} as const;

/**
 * Tipos de eventos de sesión
 */
export const SessionEventTypes = {
  FORCE_LOGOUT_USER: 'force_logout_user',
  FORCE_LOGOUT_COMPANY: 'force_logout_company',
  SESSION_DISPLACED: 'session_displaced',
} as const;

/**
 * Tipos de eventos de listas
 */
export const ListEventTypes = {
  ROLES_CHANGED: 'roles_changed',
  USERS_CHANGED: 'users_changed',
  COMPANIES_CHANGED: 'companies_changed',
  MASTER_USERS_CHANGED: 'master_users_changed',
} as const;

/**
 * Tipos de eventos de notificaciones
 */
export const NotificationEventTypes = {
  NOTIFICATION_CREATED: 'notification_created',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATIONS_ALL_READ: 'notifications_all_read',
} as const;

/**
 * Tipos de eventos de configuración de empresa
 */
export const CompanySettingsEventTypes = {
  SETTINGS_UPDATED: 'company_settings_updated',
} as const;

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
