"use strict";
// Re-export everything using CommonJS require

// Prisma clients
const clientMaster = require('@prisma/client-master');
const clientTenant = require('@prisma/client-tenant');

module.exports.PrismaClient = clientMaster.PrismaClient;
module.exports.Prisma = clientMaster.Prisma;
module.exports.RiskLevel = clientMaster.RiskLevel;
module.exports.PrismaClientTenant = clientTenant.PrismaClient;

// Shared Audit
const auditModule = require('./shared-audit/dist/audit.module');
const auditDecorator = require('./shared-audit/dist/decorators/audit.decorator');
const noAuditDecorator = require('./shared-audit/dist/decorators/no-audit.decorator');
const auditLoggingInterceptor = require('./shared-audit/dist/interceptors/audit-logging.interceptor');
const auditContextInterceptor = require('./shared-audit/dist/interceptors/audit-context.interceptor');

Object.assign(module.exports, auditModule);
Object.assign(module.exports, auditDecorator);
Object.assign(module.exports, noAuditDecorator);
Object.assign(module.exports, auditLoggingInterceptor);
Object.assign(module.exports, auditContextInterceptor);

// Shared Auth
const authModule = require('./shared-auth/dist/auth.module');
const jwtAuthGuard = require('./shared-auth/dist/guards/jwt-auth.guard');
const rolesGuard = require('./shared-auth/dist/guards/roles.guard');
const permissionsGuard = require('./shared-auth/dist/guards/permissions.guard');
const jwtOptionalGuard = require('./shared-auth/dist/guards/jwt-optional.guard');
const currentUserDecorator = require('./shared-auth/dist/decorators/current-user.decorator');
const rolesDecorator = require('./shared-auth/dist/decorators/roles.decorator');
const permissionsDecorator = require('./shared-auth/dist/decorators/permissions.decorator');
const publicDecorator = require('./shared-auth/dist/decorators/public.decorator');

Object.assign(module.exports, authModule);
Object.assign(module.exports, jwtAuthGuard);
Object.assign(module.exports, rolesGuard);
Object.assign(module.exports, permissionsGuard);
Object.assign(module.exports, jwtOptionalGuard);
Object.assign(module.exports, currentUserDecorator);
Object.assign(module.exports, rolesDecorator);
Object.assign(module.exports, permissionsDecorator);
Object.assign(module.exports, publicDecorator);

// Shared Database
const database = require('./shared-database/dist/index');
Object.assign(module.exports, database);

// Shared Validators
const validators = require('./shared-validators/dist/index');
Object.assign(module.exports, validators);

// Tenant Context (compiles in-place to src/)
const tenantContext = require('./shared-tenant-context/src/index');
Object.assign(module.exports, tenantContext);

// DIAN API (compiles in-place to src/)
const dianApi = require('./shared-dian/src/index');
Object.assign(module.exports, dianApi);

// Realtime (compiled to dist/)
const realtimeExports = require('./shared-realtime/dist/index');
Object.assign(module.exports, realtimeExports);

// Functions - shared utilities
const getNextConsecutive = require('./src/functions/get-next-consecutive');
Object.assign(module.exports, getNextConsecutive);

const moveStock = require('./src/functions/move-stock');
Object.assign(module.exports, moveStock);

const recalculateAverageCost = require('./src/functions/recalculate-average-cost');
Object.assign(module.exports, recalculateAverageCost);

const validatePeriodOpen = require('./src/functions/validate-period-open');
Object.assign(module.exports, validatePeriodOpen);

const createJournalEntry = require('./src/functions/create-journal-entry');
Object.assign(module.exports, createJournalEntry);

const createCostCenterMovement = require('./src/functions/create-cost-center-movement');
Object.assign(module.exports, createCostCenterMovement);
