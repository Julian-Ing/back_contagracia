"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaTenantService = exports.PrismaMasterService = exports.DatabaseModule = void 0;
var database_module_1 = require("./database.module");
Object.defineProperty(exports, "DatabaseModule", { enumerable: true, get: function () { return database_module_1.DatabaseModule; } });
var prisma_master_service_1 = require("./prisma-master.service");
Object.defineProperty(exports, "PrismaMasterService", { enumerable: true, get: function () { return prisma_master_service_1.PrismaMasterService; } });
var prisma_tenant_service_1 = require("./prisma-tenant.service");
Object.defineProperty(exports, "PrismaTenantService", { enumerable: true, get: function () { return prisma_tenant_service_1.PrismaTenantService; } });
