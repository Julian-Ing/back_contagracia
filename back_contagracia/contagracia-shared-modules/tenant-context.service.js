"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextService = void 0;
var common_1 = require("@nestjs/common");
var client_master_1 = require("@prisma/client-master");
var client_tenant_1 = require("@prisma/client-tenant");
var TenantContextService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TenantContextService = _classThis = /** @class */ (function () {
        function TenantContextService_1(options) {
            this.options = options;
            this.logger = new common_1.Logger(TenantContextService.name);
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
            TenantContextService._instance = this;
            this.logger.log('TenantContextService initialized (global instance registered)');
        }
        /** Obtener instancia global del servicio */
        TenantContextService_1.getInstance = function () {
            return TenantContextService._instance;
        };
        TenantContextService_1.prototype.onModuleDestroy = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _i, _a, _b, client;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _i = 0, _a = this.tenantConnections;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            _b = _a[_i], client = _b[1];
                            return [4 /*yield*/, client.$disconnect()];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [4 /*yield*/, this.masterPrisma.$disconnect()];
                        case 5:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Construir URL de conexión a partir de los datos de la company
         */
        TenantContextService_1.prototype.buildDatabaseUrl = function (company) {
            return "postgresql://".concat(company.db_user, ":").concat(company.db_password, "@").concat(company.db_host, ":").concat(company.db_port, "/").concat(company.db_name, "?schema=public");
        };
        /**
         * Obtener información de conexión de una company
         * Cachea la metadata (no la conexión) por un tiempo configurable
         */
        TenantContextService_1.prototype.getCompanyConnection = function (companyId) {
            return __awaiter(this, void 0, void 0, function () {
                var cached, company, connectionInfo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            cached = this.connectionCache.get(companyId);
                            if (cached && Date.now() - cached.cachedAt < this.options.connectionCacheTtl) {
                                return [2 /*return*/, cached];
                            }
                            return [4 /*yield*/, this.masterPrisma.company.findUnique({
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
                                })];
                        case 1:
                            company = _a.sent();
                            if (!company) {
                                this.connectionCache.delete(companyId);
                                return [2 /*return*/, null];
                            }
                            connectionInfo = {
                                companyId: company.id,
                                tenantId: company.tenant_id,
                                isActive: company.is_active,
                                databaseUrl: this.buildDatabaseUrl(company),
                                cachedAt: Date.now(),
                            };
                            this.connectionCache.set(companyId, connectionInfo);
                            return [2 /*return*/, connectionInfo];
                    }
                });
            });
        };
        /**
         * Obtener cliente Prisma para un tenant
         * Reutiliza conexiones existentes
         */
        TenantContextService_1.prototype.getTenantClient = function (companyId) {
            return __awaiter(this, void 0, void 0, function () {
                var connectionInfo, client;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCompanyConnection(companyId)];
                        case 1:
                            connectionInfo = _a.sent();
                            if (!connectionInfo || !connectionInfo.isActive) {
                                return [2 /*return*/, null];
                            }
                            client = this.tenantConnections.get(companyId);
                            if (!client) {
                                client = new client_tenant_1.PrismaClient({
                                    datasources: { db: { url: connectionInfo.databaseUrl } },
                                });
                                this.tenantConnections.set(companyId, client);
                            }
                            return [2 /*return*/, client];
                    }
                });
            });
        };
        /**
         * Cargar todos los permisos de un usuario (con cache de 60 segundos)
         * Se cargan UNA vez y se cachean, luego las verificaciones son instantáneas
         */
        TenantContextService_1.prototype.loadUserPermissions = function (companyId, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var cacheKey, cached, tenantClient, user, allPermissions, rolePermissions, permissions, userOverrides, _i, userOverrides_1, override;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            cacheKey = "".concat(companyId, ":").concat(userId);
                            cached = this.permissionsCache.get(cacheKey);
                            if (cached && Date.now() - cached.cachedAt < this.PERMISSIONS_CACHE_TTL) {
                                return [2 /*return*/, cached.permissions];
                            }
                            return [4 /*yield*/, this.getTenantClient(companyId)];
                        case 1:
                            tenantClient = _d.sent();
                            if (!tenantClient) {
                                return [2 /*return*/, null];
                            }
                            return [4 /*yield*/, tenantClient.tenantUser.findUnique({
                                    where: { id: userId },
                                    select: { id: true, role_id: true, is_active: true, role: { select: { role_key: true } } },
                                })];
                        case 2:
                            user = _d.sent();
                            if (!user || !user.is_active) {
                                this.permissionsCache.delete(cacheKey);
                                return [2 /*return*/, null];
                            }
                            // Owner y Admin: tienen todos los permisos (marcamos con set especial)
                            if (((_a = user.role) === null || _a === void 0 ? void 0 : _a.role_key) === 'owner' || ((_b = user.role) === null || _b === void 0 ? void 0 : _b.role_key) === 'admin') {
                                allPermissions = new Set(['*']);
                                this.permissionsCache.set(cacheKey, {
                                    permissions: allPermissions,
                                    roleKey: user.role.role_key,
                                    cachedAt: Date.now(),
                                });
                                return [2 /*return*/, allPermissions];
                            }
                            return [4 /*yield*/, tenantClient.rolePermission.findMany({
                                    where: { role_id: user.role_id, granted: true },
                                    select: { action_key: true },
                                })];
                        case 3:
                            rolePermissions = _d.sent();
                            permissions = new Set(rolePermissions.map(function (rp) { return rp.action_key; }));
                            return [4 /*yield*/, tenantClient.tenantUserPermission.findMany({
                                    where: { tenant_user_id: userId },
                                    select: { action_key: true, granted: true },
                                })];
                        case 4:
                            userOverrides = _d.sent();
                            for (_i = 0, userOverrides_1 = userOverrides; _i < userOverrides_1.length; _i++) {
                                override = userOverrides_1[_i];
                                if (override.granted) {
                                    permissions.add(override.action_key);
                                }
                                else {
                                    permissions.delete(override.action_key);
                                }
                            }
                            // Guardar en cache
                            this.permissionsCache.set(cacheKey, {
                                permissions: permissions,
                                roleKey: ((_c = user.role) === null || _c === void 0 ? void 0 : _c.role_key) || '',
                                cachedAt: Date.now(),
                            });
                            return [2 /*return*/, permissions];
                    }
                });
            });
        };
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
        TenantContextService_1.prototype.hasPermission = function (companyId, userId, roleKey, actionKey) {
            return __awaiter(this, void 0, void 0, function () {
                var permissions;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Atajo rápido para owner/admin (sin consultar cache siquiera)
                            if (roleKey === 'owner' || roleKey === 'admin') {
                                return [2 /*return*/, true];
                            }
                            return [4 /*yield*/, this.loadUserPermissions(companyId, userId)];
                        case 1:
                            permissions = _a.sent();
                            if (!permissions) {
                                return [2 /*return*/, false];
                            }
                            // Si tiene '*', tiene todos los permisos
                            if (permissions.has('*')) {
                                return [2 /*return*/, true];
                            }
                            return [2 /*return*/, permissions.has(actionKey)];
                    }
                });
            });
        };
        /**
         * Verificar múltiples permisos a la vez (OR - cualquiera de ellos)
         * Usa cache - muy eficiente
         */
        TenantContextService_1.prototype.hasAnyPermission = function (companyId, userId, roleKey, actionKeys) {
            return __awaiter(this, void 0, void 0, function () {
                var permissions;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (roleKey === 'owner' || roleKey === 'admin') {
                                return [2 /*return*/, true];
                            }
                            return [4 /*yield*/, this.loadUserPermissions(companyId, userId)];
                        case 1:
                            permissions = _a.sent();
                            if (!permissions) {
                                return [2 /*return*/, false];
                            }
                            if (permissions.has('*')) {
                                return [2 /*return*/, true];
                            }
                            return [2 /*return*/, actionKeys.some(function (key) { return permissions.has(key); })];
                    }
                });
            });
        };
        /**
         * Verificar múltiples permisos a la vez (AND - todos ellos)
         * Usa cache - muy eficiente
         */
        TenantContextService_1.prototype.hasAllPermissions = function (companyId, userId, roleKey, actionKeys) {
            return __awaiter(this, void 0, void 0, function () {
                var permissions;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (roleKey === 'owner' || roleKey === 'admin') {
                                return [2 /*return*/, true];
                            }
                            return [4 /*yield*/, this.loadUserPermissions(companyId, userId)];
                        case 1:
                            permissions = _a.sent();
                            if (!permissions) {
                                return [2 /*return*/, false];
                            }
                            if (permissions.has('*')) {
                                return [2 /*return*/, true];
                            }
                            return [2 /*return*/, actionKeys.every(function (key) { return permissions.has(key); })];
                    }
                });
            });
        };
        /**
         * Obtener el database_url para un company_id
         * Útil para servicios que necesitan conectarse al tenant
         */
        TenantContextService_1.prototype.getDatabaseUrl = function (companyId) {
            return __awaiter(this, void 0, void 0, function () {
                var connectionInfo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCompanyConnection(companyId)];
                        case 1:
                            connectionInfo = _a.sent();
                            if (!connectionInfo || !connectionInfo.isActive) {
                                return [2 /*return*/, null];
                            }
                            return [2 /*return*/, connectionInfo.databaseUrl];
                    }
                });
            });
        };
        /**
         * Invalidar cache de conexión de una company
         */
        TenantContextService_1.prototype.invalidateConnectionCache = function (companyId) {
            this.connectionCache.delete(companyId);
        };
        /**
         * Invalidar cache de permisos de un usuario específico
         * Llamar cuando un admin cambie permisos de un usuario
         */
        TenantContextService_1.prototype.invalidateUserPermissions = function (companyId, userId) {
            var cacheKey = "".concat(companyId, ":").concat(userId);
            this.permissionsCache.delete(cacheKey);
        };
        /**
         * Invalidar cache de permisos de todos los usuarios de una company
         * Llamar cuando se modifiquen permisos de un rol
         */
        TenantContextService_1.prototype.invalidateCompanyPermissions = function (companyId) {
            for (var _i = 0, _a = this.permissionsCache.keys(); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key.startsWith("".concat(companyId, ":"))) {
                    this.permissionsCache.delete(key);
                }
            }
        };
        /**
         * Obtener límites del plan de una compañía
         * @param companyId - ID de la compañía
         * @returns Límites del plan (maxUsers incluye user_plus)
         */
        TenantContextService_1.prototype.getCompanyPlanLimits = function (companyId) {
            return __awaiter(this, void 0, void 0, function () {
                var company, planMaxUsers, userPlus;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.masterPrisma.company.findUnique({
                                where: { id: companyId },
                                select: {
                                    user_plus: true,
                                    subscriptions: {
                                        where: {
                                            status: { in: ['ACTIVE', 'TRIAL'] },
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
                            })];
                        case 1:
                            company = _c.sent();
                            planMaxUsers = ((_b = (_a = company === null || company === void 0 ? void 0 : company.subscriptions[0]) === null || _a === void 0 ? void 0 : _a.plan) === null || _b === void 0 ? void 0 : _b.max_users) || 1;
                            userPlus = (company === null || company === void 0 ? void 0 : company.user_plus) || 0;
                            return [2 /*return*/, {
                                    maxUsers: planMaxUsers + userPlus,
                                }];
                    }
                });
            });
        };
        /**
         * Obtener las acciones disponibles del plan de una compañía
         * Con paginación y búsqueda fuzzy (Levenshtein)
         * @param companyId - ID de la compañía
         * @param options - Opciones de paginación y filtro
         */
        TenantContextService_1.prototype.getCompanyPlanActions = function (companyId_1) {
            return __awaiter(this, arguments, void 0, function (companyId, options) {
                var _a, page, _b, limit, search, moduleKey, actionKeys, subscription, modulesList, allActions, _i, _c, pm, _d, _e, action, actionKeysSet_1, searchLower_1, total, totalPages, skip, paginatedActions;
                var _this = this;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _a = options.page, page = _a === void 0 ? 1 : _a, _b = options.limit, limit = _b === void 0 ? 50 : _b, search = options.search, moduleKey = options.moduleKey, actionKeys = options.actionKeys;
                            return [4 /*yield*/, this.masterPrisma.subscription.findFirst({
                                    where: {
                                        company_id: companyId,
                                        status: { in: ['ACTIVE', 'TRIAL'] },
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
                                })];
                        case 1:
                            subscription = _f.sent();
                            if (!subscription) {
                                return [2 /*return*/, {
                                        data: [],
                                        modules: [],
                                        pagination: { page: page, limit: limit, total: 0, totalPages: 0 },
                                    }];
                            }
                            modulesList = subscription.plan.plan_modules
                                .map(function (pm) { return ({
                                module_key: pm.module.module_key,
                                module_name: pm.module.module_name,
                            }); })
                                .sort(function (a, b) { return a.module_name.localeCompare(b.module_name); });
                            allActions = [];
                            for (_i = 0, _c = subscription.plan.plan_modules; _i < _c.length; _i++) {
                                pm = _c[_i];
                                for (_d = 0, _e = pm.module.actions; _d < _e.length; _d++) {
                                    action = _e[_d];
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
                                allActions = allActions.filter(function (a) { return a.module_key === moduleKey; });
                            }
                            // Filtrar solo las acciones especificadas (para "Solo asignados")
                            if (actionKeys && actionKeys.length > 0) {
                                actionKeysSet_1 = new Set(actionKeys);
                                allActions = allActions.filter(function (a) { return actionKeysSet_1.has(a.action_key); });
                            }
                            // Búsqueda fuzzy si se especifica
                            if (search && search.trim()) {
                                searchLower_1 = search.toLowerCase().trim();
                                allActions = allActions
                                    .map(function (action) {
                                    var textToSearch = "".concat(action.action_name, " ").concat(action.action_key, " ").concat(action.module_name).toLowerCase();
                                    // Coincidencia exacta o contiene
                                    if (textToSearch.includes(searchLower_1)) {
                                        return { action: action, score: 1 };
                                    }
                                    // Búsqueda fuzzy con Levenshtein
                                    var score = _this.fuzzyScore(textToSearch, searchLower_1);
                                    return { action: action, score: score };
                                })
                                    .filter(function (item) { return item.score >= 0.3; })
                                    .sort(function (a, b) { return b.score - a.score; })
                                    .map(function (item) { return item.action; });
                            }
                            // Ordenar por módulo y nombre
                            allActions.sort(function (a, b) {
                                var modCompare = a.module_name.localeCompare(b.module_name);
                                if (modCompare !== 0)
                                    return modCompare;
                                return a.action_name.localeCompare(b.action_name);
                            });
                            total = allActions.length;
                            totalPages = Math.ceil(total / limit);
                            skip = (page - 1) * limit;
                            paginatedActions = allActions.slice(skip, skip + limit);
                            return [2 /*return*/, {
                                    data: paginatedActions,
                                    modules: modulesList,
                                    pagination: {
                                        page: page,
                                        limit: limit,
                                        total: total,
                                        totalPages: totalPages,
                                    },
                                }];
                    }
                });
            });
        };
        /**
         * Calcula score de similitud fuzzy (simplificado)
         */
        TenantContextService_1.prototype.fuzzyScore = function (text, query) {
            if (text.includes(query))
                return 1;
            // Verificar si todas las palabras del query están en el texto
            var queryWords = query.split(/\s+/).filter(function (w) { return w.length > 0; });
            if (queryWords.every(function (word) { return text.includes(word); })) {
                return 0.8;
            }
            // Levenshtein simplificado para strings cortos
            var maxLen = Math.max(text.length, query.length);
            if (maxLen === 0)
                return 1;
            var distance = this.levenshteinDistance(text.substring(0, 50), query);
            return Math.max(0, 1 - distance / maxLen);
        };
        /**
         * Distancia de Levenshtein
         */
        TenantContextService_1.prototype.levenshteinDistance = function (s1, s2) {
            if (s1.length === 0)
                return s2.length;
            if (s2.length === 0)
                return s1.length;
            var matrix = [];
            for (var i = 0; i <= s1.length; i++) {
                matrix[i] = [i];
            }
            for (var j = 0; j <= s2.length; j++) {
                matrix[0][j] = j;
            }
            for (var i = 1; i <= s1.length; i++) {
                for (var j = 1; j <= s2.length; j++) {
                    var cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
                }
            }
            return matrix[s1.length][s2.length];
        };
        return TenantContextService_1;
    }());
    __setFunctionName(_classThis, "TenantContextService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TenantContextService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    /** Instancia global para acceso desde PermissionsGuard (evita problemas de DI timing) */
    _classThis._instance = null;
    (function () {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TenantContextService = _classThis;
}();
exports.TenantContextService = TenantContextService;
