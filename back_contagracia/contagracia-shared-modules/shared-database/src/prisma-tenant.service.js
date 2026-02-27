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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaTenantService = void 0;
const common_1 = require("@nestjs/common");
const client_tenant_1 = require("@prisma/client-tenant");
/**
 * Servicio de Prisma para bases de datos TENANT (por empresa)
 * Gestiona: invoices, products, purchases, employees, etc.
 *
 * Este servicio es REQUEST-SCOPED para permitir conexiones dinámicas
 * según la empresa del usuario autenticado
 */
let PrismaTenantService = class PrismaTenantService extends client_tenant_1.PrismaClient {
    constructor() {
        super();
    }
    /**
     * Obtiene o crea un Prisma Client para una empresa específica
     * @param databaseUrl - Connection string de la base de datos de la empresa
     */
    static getClient(databaseUrl) {
        if (!this.clientCache.has(databaseUrl)) {
            const client = new client_tenant_1.PrismaClient({
                datasources: {
                    db: {
                        url: databaseUrl,
                    },
                },
                log: ['query', 'info', 'warn', 'error'],
            });
            this.clientCache.set(databaseUrl, client);
            console.log(`✅ Created new Prisma Client for tenant: ${databaseUrl.split('@')[1]?.split('/')[0]}`);
        }
        return this.clientCache.get(databaseUrl);
    }
    /**
     * Limpia el cache de clientes (útil para testing)
     */
    static clearCache() {
        this.clientCache.forEach((client) => client.$disconnect());
        this.clientCache.clear();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaTenantService = PrismaTenantService;
PrismaTenantService.clientCache = new Map();
exports.PrismaTenantService = PrismaTenantService = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __metadata("design:paramtypes", [])
], PrismaTenantService);
