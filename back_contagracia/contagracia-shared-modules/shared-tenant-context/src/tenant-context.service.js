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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TenantContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextService = void 0;
const common_1 = require("@nestjs/common");
const client_master_1 = require("@prisma/client-master");
const client_tenant_1 = require("@prisma/client-tenant");
let TenantContextService = TenantContextService_1 = class TenantContextService {
    /** Obtener instancia global del servicio */
    static getInstance() {
        return TenantContextService_1._instance;
    }
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger(TenantContextService_1.name);
        /** Cache de info de conexión por company_id (solo metadata, no conexiones) */
        this.connectionCache = new Map();
        /** Pool de conexiones activas a tenants */
        this.tenantConnections = new Map();
        /** Cache de permisos por `${companyId}:${userId}` - TTL 60 segundos */
        this.permissionsCache = new Map();
        this.PERMISSIONS_CACHE_TTL = 60 * 1000; // 60 segundos
        this.masterPrisma = new client_master_1.PrismaClient({
            datasources: { db: { url: options.masterDatabaseUrl } },
        });
        // Registrar instancia global
        TenantContextService_1._instance = this;
        this.logger.log('TenantContextService initialized (global instance registered)');
    }
    async onModuleDestroy() {
        // Cerrar todas las conexiones al destruir el módulo
        for (const [, client] of this.tenantConnections) {
            await client.$disconnect();
        }
        await this.masterPrisma.$disconnect();
    }
    /**
     * Construir URL de conexión a partir de los datos de la company
     */
    buildDatabaseUrl(company) {
        return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
    }
    /**
     * Obtener información de conexión de una company
     * Cachea la metadata (no la conexión) por un tiempo configurable
     */
    async getCompanyConnection(companyId) {
        // Verificar cache
        const cached = this.connectionCache.get(companyId);
        if (cached && Date.now() - cached.cachedAt < this.options.connectionCacheTtl) {
            return cached;
        }
        // Consultar DB maestra
        const company = await this.masterPrisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                tenant_id: true,
                is_active: true,
                db_host: true,
                db_port: true,
                db_name: true,
                db_user: true,
                db_password: true,
            },
        });
        if (!company) {
            this.connectionCache.delete(companyId);
            return null;
        }
        const connectionInfo = {
            companyId: company.id,
            tenantId: company.tenant_id,
            isActive: company.is_active,
            databaseUrl: this.buildDatabaseUrl(company),
            cachedAt: Date.now(),
        };
        this.connectionCache.set(companyId, connectionInfo);
        return connectionInfo;
    }
    /**
     * Obtener cliente Prisma para un tenant
     * Reutiliza conexiones existentes
     */
    async getTenantClient(companyId) {
        const connectionInfo = await this.getCompanyConnection(companyId);
        if (!connectionInfo || !connectionInfo.isActive) {
            return null;
        }
        // Reutilizar cliente existente
        let client = this.tenantConnections.get(companyId);
        if (client) {
            return client;
        }
        // Crear cliente
        client = new client_tenant_1.PrismaClient({
            datasources: { db: { url: connectionInfo.databaseUrl } },
        });
        this.tenantConnections.set(companyId, client);
        return client;
    }
    /**
     * Cargar todos los permisos de un usuario (con cache de 60 segundos)
     * Se cargan UNA vez y se cachean, luego las verificaciones son instantáneas
     */
    async loadUserPermissions(companyId, userId) {
        const cacheKey = `${companyId}:${userId}`;
        // Verificar cache
        const cached = this.permissionsCache.get(cacheKey);
        if (cached && Date.now() - cached.cachedAt < this.PERMISSIONS_CACHE_TTL) {
            return cached.permissions;
        }
        const tenantClient = await this.getTenantClient(companyId);
        if (!tenantClient) {
            return null;
        }
        // Obtener el usuario con su rol
        const user = await tenantClient.tenantUser.findUnique({
            where: { id: userId },
            select: { id: true, role_id: true, is_active: true, role: { select: { role_key: true } } },
        });
        if (!user || !user.is_active) {
            this.permissionsCache.delete(cacheKey);
            return null;
        }
        // Owner y Admin: tienen todos los permisos (marcamos con set especial)
        if (user.role?.role_key === 'owner' || user.role?.role_key === 'admin') {
            const allPermissions = new Set(['*']); // '*' significa todos
            this.permissionsCache.set(cacheKey, {
                permissions: allPermissions,
                roleKey: user.role.role_key,
                cachedAt: Date.now(),
            });
            return allPermissions;
        }
        // Cargar permisos del rol
        const rolePermissions = await tenantClient.rolePermission.findMany({
            where: { role_id: user.role_id, granted: true },
            select: { action_key: true },
        });
        const permissions = new Set(rolePermissions.map(rp => rp.action_key));
        // Aplicar overrides del usuario
        const userOverrides = await tenantClient.tenantUserPermission.findMany({
            where: { tenant_user_id: userId },
            select: { action_key: true, granted: true },
        });
        for (const override of userOverrides) {
            if (override.granted) {
                permissions.add(override.action_key);
            }
            else {
                permissions.delete(override.action_key);
            }
        }
        // Guardar en cache
        this.permissionsCache.set(cacheKey, {
            permissions,
            roleKey: user.role?.role_key || '',
            cachedAt: Date.now(),
        });
        return permissions;
    }
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
    async hasPermission(companyId, userId, roleKey, actionKey) {
        // Atajo rápido para owner/admin (sin consultar cache siquiera)
        if (roleKey === 'owner' || roleKey === 'admin') {
            return true;
        }
        const permissions = await this.loadUserPermissions(companyId, userId);
        if (!permissions) {
            return false;
        }
        // Si tiene '*', tiene todos los permisos
        if (permissions.has('*')) {
            return true;
        }
        return permissions.has(actionKey);
    }
    /**
     * Verificar múltiples permisos a la vez (OR - cualquiera de ellos)
     * Usa cache - muy eficiente
     */
    async hasAnyPermission(companyId, userId, roleKey, actionKeys) {
        if (roleKey === 'owner' || roleKey === 'admin') {
            return true;
        }
        const permissions = await this.loadUserPermissions(companyId, userId);
        if (!permissions) {
            return false;
        }
        if (permissions.has('*')) {
            return true;
        }
        return actionKeys.some(key => permissions.has(key));
    }
    /**
     * Verificar múltiples permisos a la vez (AND - todos ellos)
     * Usa cache - muy eficiente
     */
    async hasAllPermissions(companyId, userId, roleKey, actionKeys) {
        if (roleKey === 'owner' || roleKey === 'admin') {
            return true;
        }
        const permissions = await this.loadUserPermissions(companyId, userId);
        if (!permissions) {
            return false;
        }
        if (permissions.has('*')) {
            return true;
        }
        return actionKeys.every(key => permissions.has(key));
    }
    /**
     * Obtener el database_url para un company_id
     * Útil para servicios que necesitan conectarse al tenant
     */
    async getDatabaseUrl(companyId) {
        const connectionInfo = await this.getCompanyConnection(companyId);
        if (!connectionInfo || !connectionInfo.isActive) {
            return null;
        }
        return connectionInfo.databaseUrl;
    }
    /**
     * Obtener lista de permisos de un usuario (para adjuntar a req.user en el guard)
     * Retorna ['*'] para admin/owner (todos los permisos)
     */
    async getUserPermissions(companyId, userId) {
        const permissions = await this.loadUserPermissions(companyId, userId);
        if (!permissions)
            return [];
        return Array.from(permissions);
    }
    /**
     * Obtener NIT de una company desde master
     */
    async getCompanyNit(companyId) {
        const company = await this.masterPrisma.company.findUnique({
            where: { id: companyId },
            select: { nit: true },
        });
        return company?.nit || null;
    }
    /**
     * Obtener datos de establishment de una company para templates DIAN
     */
    async getCompanyEstablishmentData(companyId) {
        const company = await this.masterPrisma.company.findUnique({
            where: { id: companyId },
            select: {
                company_name: true,
                address: true,
                phone: true,
                email: true,
                municipality_id: true,
            },
        });
        if (!company)
            return null;
        return {
            company_name: company.company_name,
            address: company.address || '',
            phone: company.phone || '',
            email: company.email || '',
            municipality_id: Number(company.municipality_id),
        };
    }
    /**
     * Invalidar cache de conexión de una company
     */
    invalidateConnectionCache(companyId) {
        this.connectionCache.delete(companyId);
    }
    /**
     * Invalidar cache de permisos de un usuario específico
     * Llamar cuando un admin cambie permisos de un usuario
     */
    invalidateUserPermissions(companyId, userId) {
        const cacheKey = `${companyId}:${userId}`;
        this.permissionsCache.delete(cacheKey);
    }
    /**
     * Invalidar cache de permisos de todos los usuarios de una company
     * Llamar cuando se modifiquen permisos de un rol
     */
    invalidateCompanyPermissions(companyId) {
        for (const key of this.permissionsCache.keys()) {
            if (key.startsWith(`${companyId}:`)) {
                this.permissionsCache.delete(key);
            }
        }
    }
    /**
     * Obtener límites del plan de una compañía
     * @param companyId - ID de la compañía
     * @returns Límites del plan (maxUsers incluye user_plus)
     */
    async getCompanyPlanLimits(companyId) {
        const company = await this.masterPrisma.company.findUnique({
            where: { id: companyId },
            include: {
                subscriptions: {
                    where: {
                        OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
                    },
                    take: 1,
                    orderBy: { created_at: 'desc' },
                    include: {
                        plan: {
                            select: { max_users: true },
                        },
                    },
                },
            },
        });
        const planMaxUsers = company?.subscriptions[0]?.plan?.max_users || 1;
        const userPlus = company?.user_plus || 0;
        return {
            maxUsers: planMaxUsers + userPlus,
        };
    }
    /**
     * Verificar si una compañía tiene un módulo específico en su plan
     * @param companyId - ID de la compañía
     * @param moduleKey - Key del módulo (ej: 'accounting', 'banking')
     * @returns true si tiene el módulo
     */
    async hasModule(companyId, moduleKey) {
        const subscription = await this.masterPrisma.subscription.findFirst({
            where: {
                company_id: companyId,
                OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
            },
            include: {
                plan: {
                    include: {
                        plan_modules: {
                            include: {
                                module: { select: { module_key: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!subscription)
            return false;
        return subscription.plan.plan_modules.some((pm) => pm.module.module_key === moduleKey);
    }
    /**
     * Obtener las acciones disponibles del plan de una compañía
     * Con paginación y búsqueda fuzzy (Levenshtein)
     * @param companyId - ID de la compañía
     * @param options - Opciones de paginación y filtro
     */
    async getCompanyPlanActions(companyId, options = {}) {
        const { page = 1, limit = 50, search, moduleKey, actionKeys } = options;
        const subscription = await this.masterPrisma.subscription.findFirst({
            where: {
                company_id: companyId,
                OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
            },
            include: {
                plan: {
                    include: {
                        plan_modules: {
                            include: {
                                module: {
                                    include: {
                                        actions: {
                                            where: { is_active: true },
                                            orderBy: { action_name: 'asc' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        if (!subscription) {
            return {
                data: [],
                modules: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }
        // Extraer lista de módulos para filtro
        const modulesList = subscription.plan.plan_modules
            .map((pm) => ({
            module_key: pm.module.module_key,
            module_name: pm.module.module_name,
        }))
            .sort((a, b) => a.module_name.localeCompare(b.module_name));
        // Aplanar todas las acciones
        let allActions = [];
        for (const pm of subscription.plan.plan_modules) {
            for (const action of pm.module.actions) {
                allActions.push({
                    action_key: action.action_key,
                    action_name: action.action_name,
                    description: action.description,
                    module_key: pm.module.module_key,
                    module_name: pm.module.module_name,
                });
            }
        }
        // Filtrar por módulo si se especifica
        if (moduleKey) {
            allActions = allActions.filter((a) => a.module_key === moduleKey);
        }
        // Filtrar solo las acciones especificadas (para "Solo asignados")
        if (actionKeys && actionKeys.length > 0) {
            const actionKeysSet = new Set(actionKeys);
            allActions = allActions.filter((a) => actionKeysSet.has(a.action_key));
        }
        // Búsqueda fuzzy si se especifica
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            allActions = allActions
                .map((action) => {
                const textToSearch = `${action.action_name} ${action.action_key} ${action.module_name}`.toLowerCase();
                // Coincidencia exacta o contiene
                if (textToSearch.includes(searchLower)) {
                    return { action, score: 1 };
                }
                // Búsqueda fuzzy con Levenshtein
                const score = this.fuzzyScore(textToSearch, searchLower);
                return { action, score };
            })
                .filter((item) => item.score >= 0.3)
                .sort((a, b) => b.score - a.score)
                .map((item) => item.action);
        }
        // Ordenar por módulo y nombre
        allActions.sort((a, b) => {
            const modCompare = a.module_name.localeCompare(b.module_name);
            if (modCompare !== 0)
                return modCompare;
            return a.action_name.localeCompare(b.action_name);
        });
        // Paginación
        const total = allActions.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedActions = allActions.slice(skip, skip + limit);
        return {
            data: paginatedActions,
            modules: modulesList,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    /**
     * Calcula score de similitud fuzzy (simplificado)
     */
    fuzzyScore(text, query) {
        if (text.includes(query))
            return 1;
        // Verificar si todas las palabras del query están en el texto
        const queryWords = query.split(/\s+/).filter((w) => w.length > 0);
        if (queryWords.every((word) => text.includes(word))) {
            return 0.8;
        }
        // Levenshtein simplificado para strings cortos
        const maxLen = Math.max(text.length, query.length);
        if (maxLen === 0)
            return 1;
        const distance = this.levenshteinDistance(text.substring(0, 50), query);
        return Math.max(0, 1 - distance / maxLen);
    }
    /**
     * Distancia de Levenshtein
     */
    levenshteinDistance(s1, s2) {
        if (s1.length === 0)
            return s2.length;
        if (s2.length === 0)
            return s1.length;
        const matrix = [];
        for (let i = 0; i <= s1.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= s2.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        return matrix[s1.length][s2.length];
    }
};
exports.TenantContextService = TenantContextService;
/** Instancia global para acceso desde PermissionsGuard (evita problemas de DI timing) */
TenantContextService._instance = null;
exports.TenantContextService = TenantContextService = TenantContextService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('TENANT_CONTEXT_OPTIONS')),
    __metadata("design:paramtypes", [Object])
], TenantContextService);
