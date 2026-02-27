"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsEventTypes = exports.NotificationEventTypes = exports.ListEventTypes = exports.SessionEventTypes = exports.PermissionEventTypes = exports.RealtimeChannels = void 0;
/**
 * Canales de Redis para eventos realtime
 */
exports.RealtimeChannels = {
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
};
/**
 * Tipos de eventos de permisos
 */
exports.PermissionEventTypes = {
    ROLE_UPDATED: 'role_updated',
    USER_ROLE_CHANGED: 'user_role_changed',
};
/**
 * Tipos de eventos de sesión
 */
exports.SessionEventTypes = {
    FORCE_LOGOUT_USER: 'force_logout_user',
    FORCE_LOGOUT_COMPANY: 'force_logout_company',
    SESSION_DISPLACED: 'session_displaced',
};
/**
 * Tipos de eventos de listas
 */
exports.ListEventTypes = {
    ROLES_CHANGED: 'roles_changed',
    USERS_CHANGED: 'users_changed',
    COMPANIES_CHANGED: 'companies_changed',
    MASTER_USERS_CHANGED: 'master_users_changed',
};
/**
 * Tipos de eventos de notificaciones
 */
exports.NotificationEventTypes = {
    NOTIFICATION_CREATED: 'notification_created',
    NOTIFICATION_READ: 'notification_read',
    NOTIFICATIONS_ALL_READ: 'notifications_all_read',
};
/**
 * Tipos de eventos de configuración de empresa
 */
exports.CompanySettingsEventTypes = {
    SETTINGS_UPDATED: 'company_settings_updated',
};
