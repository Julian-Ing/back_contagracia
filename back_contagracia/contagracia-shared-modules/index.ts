// Re-export Prisma clients
export { PrismaClient, Prisma } from '@prisma/client-master';
export { PrismaClient as PrismaClientTenant } from '@prisma/client-tenant';

// Re-export shared modules - Import from compiled dist folders
export * from './shared-audit/dist/audit.module';
export * from './shared-audit/dist/decorators/audit.decorator';
export * from './shared-audit/dist/decorators/no-audit.decorator';
export * from './shared-audit/dist/interceptors/audit-logging.interceptor';
export * from './shared-audit/dist/interceptors/audit-context.interceptor';

export * from './shared-auth/dist/auth.module';
export * from './shared-auth/dist/guards/jwt-auth.guard';
export * from './shared-auth/dist/guards/jwt-optional.guard';
export * from './shared-auth/dist/guards/roles.guard';
export * from './shared-auth/dist/guards/permissions.guard';
export * from './shared-auth/dist/strategies/jwt.strategy';
export * from './shared-auth/dist/decorators/current-user.decorator';
export * from './shared-auth/dist/decorators/roles.decorator';
export * from './shared-auth/dist/decorators/permissions.decorator';
export * from './shared-auth/dist/decorators/public.decorator';
export * from './shared-auth/dist/interfaces/jwt-payload.interface';
export type { RefreshTokenPayload } from './shared-auth/dist/interfaces/jwt-payload.interface';

export * from './shared-database/dist/index';
export * from './shared-validators/dist/index';

// Tenant context - realtime permissions and database connection (compiles in-place)
export * from './shared-tenant-context/src/index';

// DIAN API - Integración con API DIAN (compiles in-place)
export * from './shared-dian/src/index';

// Realtime - Redis pub/sub for realtime events (compiles in-place)
export * from './shared-realtime/src/realtime.events';
export * from './shared-realtime/src/realtime.module';
export * from './shared-realtime/src/realtime-publisher.service';

// Functions - Shared utility functions across services
export * from './src/functions/get-next-consecutive';
export * from './src/functions/move-stock';
export * from './src/functions/recalculate-average-cost';
export * from './src/functions/validate-period-open';
export * from './src/functions/create-journal-entry';
export * from './src/functions/create-cost-center-movement';

// Constants - Shared constants across services
export * from './src/constants/account-types';
export * from './src/constants/nit-dependent-fields';
