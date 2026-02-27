import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
/**
 * PermissionsService en auth-service solo maneja información de módulos del plan.
 * Los permisos específicos de usuario (RolePermission, TenantUserPermission) están en el tenant.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener módulos habilitados del plan
   */
  private getEnabledModules(planModules: { module: { module_key: string } }[]): string[] {
    return planModules.map((pm) => pm.module.module_key);
  }

  /**
   * Obtener módulos habilitados para una compañía basado en su plan
   * NOTA: Los permisos específicos del usuario se manejan en el tenant
   */
  async getCompanyModules(companyId: string): Promise<any> {
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
      throw new ForbiddenException('La compañía no tiene una suscripción activa');
    }

    const modules = this.getEnabledModules(subscription.plan.plan_modules);

    return {
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
      },
      modules: modules.map((moduleKey: string) => ({
        module_key: moduleKey,
        enabled: true,
      })),
    };
  }

  /**
   * Verificar si un módulo está habilitado en el plan de la compañía
   */
  async checkModuleAccess(companyId: string, moduleKey: string): Promise<any> {
    const companyModules = await this.getCompanyModules(companyId);
    const allowed = companyModules.modules.some((m: any) => m.module_key === moduleKey);

    return {
      allowed,
      reason: allowed
        ? 'Módulo incluido en el plan'
        : 'Módulo no disponible en el plan de la compañía',
    };
  }
}
