import { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
interface CompanyConnection {
    databaseUrl: string;
    companyId: string;
    tenantId: string;
    isActive: boolean;
    cachedAt: number;
}
interface TenantContextOptions {
    masterDatabaseUrl: string;
    connectionCacheTtl: number;
}
export declare class TenantContextService implements OnModuleDestroy {
    private options;
    private readonly logger;
    private masterPrisma;
    /** Cache de info de conexión por company_id (solo metadata, no conexiones) */
    private connectionCache;
    /** Pool de conexiones activas a tenants */
    private tenantConnections;
    /** Cache de permisos por `${companyId}:${userId}` - TTL 60 segundos */
    private permissionsCache;
    private readonly PERMISSIONS_CACHE_TTL;
    /** Instancia global para acceso desde PermissionsGuard (evita problemas de DI timing) */
    private static _instance;
    /** Obtener instancia global del servicio */
    static getInstance(): TenantContextService | null;
    constructor(options: TenantContextOptions);
    onModuleDestroy(): Promise<void>;
    /**
     * Construir URL de conexión a partir de los datos de la company
     */
    private buildDatabaseUrl;
    /**
     * Obtener información de conexión de una company
     * Cachea la metadata (no la conexión) por un tiempo configurable
     */
    getCompanyConnection(companyId: string): Promise<CompanyConnection | null>;
    /**
     * Obtener cliente Prisma para un tenant
     * Reutiliza conexiones existentes
     */
    getTenantClient(companyId: string): Promise<TenantPrismaClient | null>;
    /**
     * Cargar todos los permisos de un usuario (con cache de 60 segundos)
     * Se cargan UNA vez y se cachean, luego las verificaciones son instantáneas
     */
    private loadUserPermissions;
    /**
     * Verificar si un usuario tiene un permiso específico
     * Usa cache de 60 segundos - 0 consultas en la mayoría de requests
     *
     * @param companyId - ID de la company
     * @param userId - ID del TenantUser
     * @param roleKey - Key del rol del usuario
     * @param actionKey - El permiso a verificar (ej: 'users.create')
     * @returns true si tiene el permiso
     */
    hasPermission(companyId: string, userId: string, roleKey: string, actionKey: string): Promise<boolean>;
    /**
     * Verificar múltiples permisos a la vez (OR - cualquiera de ellos)
     * Usa cache - muy eficiente
     */
    hasAnyPermission(companyId: string, userId: string, roleKey: string, actionKeys: string[]): Promise<boolean>;
    /**
     * Verificar múltiples permisos a la vez (AND - todos ellos)
     * Usa cache - muy eficiente
     */
    hasAllPermissions(companyId: string, userId: string, roleKey: string, actionKeys: string[]): Promise<boolean>;
    /**
     * Obtener el database_url para un company_id
     * Útil para servicios que necesitan conectarse al tenant
     */
    getDatabaseUrl(companyId: string): Promise<string | null>;
    /**
     * Invalidar cache de conexión de una company
     */
    invalidateConnectionCache(companyId: string): void;
    /**
     * Invalidar cache de permisos de un usuario específico
     * Llamar cuando un admin cambie permisos de un usuario
     */
    invalidateUserPermissions(companyId: string, userId: string): void;
    /**
     * Invalidar cache de permisos de todos los usuarios de una company
     * Llamar cuando se modifiquen permisos de un rol
     */
    invalidateCompanyPermissions(companyId: string): void;
    /**
     * Obtener límites del plan de una compañía
     * @param companyId - ID de la compañía
     * @returns Límites del plan (maxUsers incluye user_plus)
     */
    getCompanyPlanLimits(companyId: string): Promise<{
        maxUsers: number;
    }>;
    /**
     * Obtener las acciones disponibles del plan de una compañía
     * Con paginación y búsqueda fuzzy (Levenshtein)
     * @param companyId - ID de la compañía
     * @param options - Opciones de paginación y filtro
     */
    getCompanyPlanActions(companyId: string, options?: {
        page?: number;
        limit?: number;
        search?: string;
        moduleKey?: string;
        actionKeys?: string[];
    }): Promise<{
        data: Array<{
            action_key: string;
            action_name: string;
            description: string | null;
            module_key: string;
            module_name: string;
        }>;
        modules: Array<{
            module_key: string;
            module_name: string;
        }>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Calcula score de similitud fuzzy (simplificado)
     */
    private fuzzyScore;
    /**
     * Distancia de Levenshtein
     */
    private levenshteinDistance;
}
export {};
