import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface CompanyModules {
  modules: string[];
  plan_name: string;
}

/**
 * PermissionResolutionService en auth-service
 * Solo verifica módulos del plan de la compañía.
 * Los permisos específicos de usuario (RolePermission, TenantUserPermission) se verifican en el tenant.
 */
@Injectable()
export class PermissionResolutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener módulos habilitados del plan
   */
  private getEnabledModules(planModules: { module: { module_key: string } }[]): string[] {
    return planModules.map((pm) => pm.module.module_key);
  }

  /**
   * Verificar si un módulo está habilitado en el plan de la compañía
   */
  async canAccessModule(
    companyId: string,
    moduleKey: string,
  ): Promise<PermissionCheckResult> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        company_id: companyId,
        OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
      },
      include: {
        plan: {
          include: {
            plan_modules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No hay suscripción activa para la compañía',
      };
    }

    const enabledModules = this.getEnabledModules(subscription.plan.plan_modules);
    const moduleInPlan = enabledModules.includes(moduleKey);

    if (!moduleInPlan) {
      return {
        allowed: false,
        reason: `El plan "${subscription.plan.name}" no incluye el módulo "${moduleKey}"`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verificar si una acción pertenece a un módulo habilitado en el plan
   * NOTA: La verificación de permisos específicos del usuario se hace en el tenant
   */
  async canPerformAction(
    companyId: string,
    actionKey: string,
  ): Promise<PermissionCheckResult> {
    // Verificar que la acción existe y obtener su módulo
    const action = await this.prisma.systemAction.findUnique({
      where: { action_key: actionKey },
      include: {
        module: true,
      },
    });

    if (!action || !action.is_active) {
      return {
        allowed: false,
        reason: 'Acción no encontrada o inactiva',
      };
    }

    // Verificar que el módulo de la acción esté en el plan
    return this.canAccessModule(companyId, action.module.module_key);
  }

  /**
   * Obtener módulos habilitados para una compañía
   */
  async getCompanyModules(companyId: string): Promise<CompanyModules> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        company_id: companyId,
        OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
      },
      include: {
        plan: {
          include: {
            plan_modules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!subscription) {
      throw new ForbiddenException('No hay suscripción activa');
    }

    const modules = this.getEnabledModules(subscription.plan.plan_modules);
    return {
      modules,
      plan_name: subscription.plan.name,
    };
  }

  /**
   * Verificar múltiples módulos a la vez
   */
  async canAccessModules(
    companyId: string,
    moduleKeys: string[],
  ): Promise<{ [key: string]: PermissionCheckResult }> {
    const results: { [key: string]: PermissionCheckResult } = {};

    const companyModules = await this.getCompanyModules(companyId);

    for (const moduleKey of moduleKeys) {
      results[moduleKey] = {
        allowed: companyModules.modules.includes(moduleKey),
        reason: companyModules.modules.includes(moduleKey)
          ? 'Módulo incluido en el plan'
          : `Módulo no incluido en el plan "${companyModules.plan_name}"`,
      };
    }

    return results;
  }
}
