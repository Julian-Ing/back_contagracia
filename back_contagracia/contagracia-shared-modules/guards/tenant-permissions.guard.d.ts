import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant-context.service';
export declare class TenantPermissionsGuard implements CanActivate {
    private reflector;
    private tenantContextService;
    constructor(reflector: Reflector, tenantContextService: TenantContextService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
