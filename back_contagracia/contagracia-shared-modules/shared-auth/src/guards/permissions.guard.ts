import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Token para inyectar TenantContextService desde el modulo que consume este guard
 */
export const TENANT_CONTEXT_SERVICE = 'TENANT_CONTEXT_SERVICE';

/**
 * Interface minima que debe cumplir el TenantContextService inyectado
 */
interface ITenantContextService {
  hasPermission(companyId: string, userId: string, roleKey: string, actionKey: string): Promise<boolean>;
  hasAnyPermission(companyId: string, userId: string, roleKey: string, actionKeys: string[]): Promise<boolean>;
  hasAllPermissions(companyId: string, userId: string, roleKey: string, actionKeys: string[]): Promise<boolean>;
  getUserPermissions(companyId: string, userId: string): Promise<string[]>;
}

// Obtener Reflector del host service dinámicamente
function getHostReflector(): any {
  try {
    const core = require(require.resolve('@nestjs/core', { paths: [process.cwd()] }));
    return new core.Reflector();
  } catch {
    return null;
  }
}

/**
 * Función helper para obtener TenantContextService.getInstance()
 * Importamos dinámicamente para evitar dependencias circulares
 */
function getTenantContextServiceInstance(): ITenantContextService | null {
  try {
    const { TenantContextService } = require('@contagracia/shared-modules');
    return TenantContextService.getInstance?.() || null;
  } catch {
    return null;
  }
}

/**
 * Guard que valida permisos granulares basados en acciones
 * Lee los metadatos de @RequirePermissions y @RequireAnyPermission
 * y verifica consultando la BD via TenantContextService
 *
 * Obtiene Reflector y TenantContextService dinámicamente para evitar dual-package issues
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private _reflector: any;
  private _tenantContextService?: ITenantContextService;

  constructor(reflector?: any, tenantContextService?: ITenantContextService) {
    this._reflector = reflector;
    this._tenantContextService = tenantContextService;
  }

  private getReflector(): any {
    if (!this._reflector) {
      this._reflector = getHostReflector();
    }
    return this._reflector;
  }

  private getTenantService(): ITenantContextService | null {
    if (!this._tenantContextService) {
      this._tenantContextService = getTenantContextServiceInstance() || undefined;
    }
    return this._tenantContextService || null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reflector = this.getReflector();

    if (!reflector) {
      return true; // Sin reflector, permitir acceso
    }

    // Leer metadata de permisos requeridos (AND logic)
    const requiredPermissions = reflector.getAllAndOverride('required_permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Leer metadata de permisos requeridos (OR logic)
    const requiredAnyPermission = reflector.getAllAndOverride('required_any_permission', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay permisos requeridos, permitir acceso
    if (!requiredPermissions && !requiredAnyPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Usuario tipo "owner" (CMS super admin sin empresa) no puede acceder a rutas de empresa
    if (user.user_type === 'owner' && !user.company_id) {
      throw new ForbiddenException('Debes seleccionar una empresa para realizar esta acción');
    }

    // Obtener TenantContextService
    const service = this.getTenantService();

    if (!service) {
      console.error('❌ [PermissionsGuard] TenantContextService no disponible. Asegúrate de importar TenantContextModule.forRoot()');
      throw new ForbiddenException('Sistema de permisos no configurado correctamente');
    }

    // Extraer datos del usuario del JWT
    const userRole = user.role_key || user.role;
    const userId = user.sub || user.user_id;
    const companyId = user.company_id;

    if (!companyId || !userId) {
      throw new ForbiddenException('Token invalido: falta company_id o user_id');
    }

    // Lógica AND: Usuario debe tener TODAS las acciones requeridas
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAll = await service.hasAllPermissions(companyId, userId, userRole, requiredPermissions);

      if (!hasAll) {
        console.log('🔐 [PermissionsGuard] DENIED - User:', userId, 'Role:', userRole, 'Missing:', requiredPermissions);
        throw new ForbiddenException(
          `No tienes permiso para realizar esta acción. Permisos requeridos: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Lógica OR: Usuario debe tener AL MENOS UNA de las acciones
    if (requiredAnyPermission && requiredAnyPermission.length > 0) {
      const hasAny = await service.hasAnyPermission(companyId, userId, userRole, requiredAnyPermission);

      if (!hasAny) {
        throw new ForbiddenException(
          `No tienes permiso para realizar esta acción. Se requiere al menos uno de: ${requiredAnyPermission.join(', ')}`,
        );
      }
    }

    // Adjuntar permisos resueltos al request para que controllers puedan determinar selfOnly
    if (userRole === 'owner' || userRole === 'admin') {
      request.user.permissions = ['*'];
    } else {
      try {
        request.user.permissions = await service.getUserPermissions(companyId, userId);
      } catch {
        // Si falla, no bloquear - controllers usarán [] como fallback
      }
    }

    return true;
  }
}
