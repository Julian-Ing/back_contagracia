// Module
export { AuthModule, AuthModuleOptions } from './auth.module';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { JwtOptionalGuard } from './guards/jwt-optional.guard';
export { RolesGuard } from './guards/roles.guard';
export { PermissionsGuard, TENANT_CONTEXT_SERVICE } from './guards/permissions.guard';

// Strategy
export { JwtStrategy } from './strategies/jwt.strategy';

// Decorators
export { CurrentUser, CompanyId, UserId } from './decorators/current-user.decorator';
export { Roles } from './decorators/roles.decorator';
export { RequirePermissions, RequireAnyPermission } from './decorators/permissions.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';

// Interfaces
export { JwtPayload } from './interfaces/jwt-payload.interface';
