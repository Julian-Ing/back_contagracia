import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto, SetPlanModulesDto } from './dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private async syncDianForPlanCompanies(planId: string): Promise<void> {
    // Solo sincronizar si el plan tiene el módulo electronic_documents
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        plan_modules: {
          include: { module: { select: { module_key: true } } },
        },
        subscriptions: {
          where: { OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }] },
          select: { company_id: true },
        },
      },
    });

    if (!plan) return;

    const hasElectronicDocs = plan.plan_modules.some(
      (pm) => pm.module.module_key === 'electronic_documents',
    );

    if (!hasElectronicDocs) {
      this.logger.log(`Plan ${planId} no tiene módulo electronic_documents, omitiendo sync DIAN`);
      return;
    }

    const companyIds = plan.subscriptions.map((s) => s.company_id);
    if (companyIds.length === 0) return;

    const syncUrl = this.configService.get<string>('COMPANY_SERVICE_SYNC_URL');
    if (!syncUrl) {
      this.logger.warn('COMPANY_SERVICE_SYNC_URL no configurada, omitiendo sync DIAN');
      return;
    }

    this.logger.log(
      `Sincronizando ${companyIds.length} compañías del plan ${planId} con DIAN`,
    );

    for (const companyId of companyIds) {
      try {
        await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId }),
        });
      } catch (error: any) {
        this.logger.error(
          `Error sincronizando compañía ${companyId} con DIAN: ${error.message}`,
        );
      }
    }
  }

  private async syncInventoryForPlanCompanies(planId: string): Promise<void> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        plan_modules: {
          include: { module: { select: { module_key: true } } },
        },
        subscriptions: {
          where: { OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }] },
          select: { company_id: true },
        },
      },
    });

    if (!plan) return;

    const hasInventory = plan.plan_modules.some(
      (pm) => pm.module.module_key === 'inventory_management',
    );

    if (!hasInventory) {
      this.logger.log(`Plan ${planId} no tiene módulo inventory_management, omitiendo sync inventario`);
      return;
    }

    const companyIds = plan.subscriptions.map((s) => s.company_id);
    if (companyIds.length === 0) return;

    const syncUrl = this.configService.get<string>('INVENTORY_SERVICE_SYNC_URL');
    if (!syncUrl) {
      this.logger.warn('INVENTORY_SERVICE_SYNC_URL no configurada, omitiendo sync inventario');
      return;
    }

    this.logger.log(
      `Sincronizando almacén principal para ${companyIds.length} compañías del plan ${planId}`,
    );

    for (const companyId of companyIds) {
      try {
        await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId }),
        });
      } catch (error: any) {
        this.logger.error(
          `Error sincronizando almacén principal para compañía ${companyId}: ${error.message}`,
        );
      }
    }
  }

  async findAll(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? undefined : { is_active: true },
      include: {
        plan_modules: {
          include: {
            module: true,
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        plan_modules: {
          include: {
            module: true,
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    return plan;
  }

  async create(createDto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un plan con el nombre ${createDto.name}`,
      );
    }

    return this.prisma.plan.create({
      data: createDto,
      include: {
        plan_modules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    if (updateDto.name && updateDto.name !== plan.name) {
      const existing = await this.prisma.plan.findUnique({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un plan con el nombre ${updateDto.name}`,
        );
      }
    }

    return this.prisma.plan.update({
      where: { id },
      data: updateDto,
      include: {
        plan_modules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    if (plan._count.subscriptions > 0) {
      throw new BadRequestException(
        `No se puede eliminar el plan porque tiene ${plan._count.subscriptions} suscripciones activas`,
      );
    }

    return this.prisma.plan.delete({
      where: { id },
    });
  }

  // Plan Modules Management
  async getPlanModules(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${planId} no encontrado`);
    }

    return this.prisma.planModule.findMany({
      where: { plan_id: planId },
      include: {
        module: true,
      },
      orderBy: { module: { module_name: 'asc' } },
    });
  }

  async setPlanModules(planId: string, dto: SetPlanModulesDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${planId} no encontrado`);
    }

    // Validar que los módulos existen
    const existingModules = await this.prisma.module.findMany({
      where: { id: { in: dto.module_ids } },
    });

    const existingIds = existingModules.map((m) => m.id);
    const invalidIds = dto.module_ids.filter((id) => !existingIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Los siguientes módulos no existen: ${invalidIds.join(', ')}`,
      );
    }

    // Eliminar módulos actuales y crear los nuevos
    await this.prisma.$transaction([
      this.prisma.planModule.deleteMany({
        where: { plan_id: planId },
      }),
      this.prisma.planModule.createMany({
        data: dto.module_ids.map((module_id) => ({
          plan_id: planId,
          module_id,
        })),
      }),
    ]);

    const result = await this.getPlanModules(planId);

    // Propagar cambios a todos los tenants suscritos a este plan
    this.propagatePlanModulesToTenants(planId).catch((err) =>
      this.logger.error(`Error propagando módulos del plan ${planId} a tenants: ${err.message}`),
    );

    // Sincronizar con DIAN todas las compañías de este plan (si tiene electronic_documents)
    this.syncDianForPlanCompanies(planId).catch((err) =>
      this.logger.error(`Error sincronizando DIAN para plan ${planId}: ${err.message}`),
    );

    // Sincronizar almacén principal para compañías del plan (si tiene inventory_management)
    this.syncInventoryForPlanCompanies(planId).catch((err) =>
      this.logger.error(`Error sincronizando inventario para plan ${planId}: ${err.message}`),
    );

    return result;
  }

  private buildDatabaseUrl(company: {
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_password: string;
  }): string {
    return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
  }

  async propagatePlanModulesToTenants(planId: string) {
    // Obtener plan con módulos, acciones y suscripciones activas
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        plan_modules: {
          include: {
            module: {
              include: { actions: true },
            },
          },
        },
        subscriptions: {
          where: {
            OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
          },
          include: {
            company: true,
          },
        },
      },
    });

    if (!plan) return;

    const modules = plan.plan_modules.map((pm) => pm.module);
    const moduleKeys = modules.map((m) => m.module_key);
    const actions = modules.flatMap((m) => m.actions);

    this.logger.log(
      `Propagando ${modules.length} módulos y ${actions.length} acciones a ${plan.subscriptions.length} tenants del plan "${plan.name}"`,
    );

    for (const sub of plan.subscriptions) {
      const company = sub.company;
      let tenantPrisma: TenantPrismaClient | null = null;

      try {
        tenantPrisma = new TenantPrismaClient({
          datasources: {
            db: { url: this.buildDatabaseUrl(company) },
          },
        });
        await tenantPrisma.$connect();

        // Eliminar módulos que ya no están en el plan (cascade borra sus acciones)
        await tenantPrisma.module.deleteMany({
          where: { module_key: { notIn: moduleKeys } },
        });

        // Upsert módulos del plan
        for (const m of modules) {
          await tenantPrisma.module.upsert({
            where: { id: m.id },
            create: {
              id: m.id,
              module_key: m.module_key,
              module_name: m.module_name,
              description: m.description,
              icon: m.icon,
              group: m.group,
              sort_order: m.sort_order,
              is_active: m.is_active,
            },
            update: {
              module_name: m.module_name,
              description: m.description,
              icon: m.icon,
              group: m.group,
              sort_order: m.sort_order,
              is_active: m.is_active,
            },
          });
        }

        // Upsert acciones del plan
        for (const a of actions) {
          await tenantPrisma.systemAction.upsert({
            where: { id: a.id },
            create: {
              id: a.id,
              module_id: a.module_id,
              action_key: a.action_key,
              action_name: a.action_name,
              description: a.description,
              is_active: a.is_active,
            },
            update: {
              action_name: a.action_name,
              description: a.description,
              is_active: a.is_active,
            },
          });
        }

        this.logger.log(`✅ Tenant ${company.db_name} actualizado`);
      } catch (err) {
        this.logger.error(`❌ Error en tenant ${company.db_name}: ${err.message}`);
      } finally {
        if (tenantPrisma) await tenantPrisma.$disconnect();
      }
    }
  }

  async addPlanModule(planId: string, moduleId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${planId} no encontrado`);
    }

    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Módulo con ID ${moduleId} no encontrado`);
    }

    // Verificar si ya existe
    const existing = await this.prisma.planModule.findUnique({
      where: {
        plan_id_module_id: {
          plan_id: planId,
          module_id: moduleId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('El módulo ya está asignado a este plan');
    }

    const result = await this.prisma.planModule.create({
      data: {
        plan_id: planId,
        module_id: moduleId,
      },
      include: {
        module: true,
      },
    });

    // Propagar cambios a tenants
    this.propagatePlanModulesToTenants(planId).catch((err) =>
      this.logger.error(`Error propagando módulo a tenants del plan ${planId}: ${err.message}`),
    );

    // Sincronizar con DIAN si es electronic_documents
    if (module.module_key === 'electronic_documents') {
      this.syncDianForPlanCompanies(planId).catch((err) =>
        this.logger.error(
          `Error sincronizando DIAN para plan ${planId} después de agregar módulo: ${err.message}`,
        ),
      );
    }

    // Sincronizar almacén principal si es inventory_management
    if (module.module_key === 'inventory_management') {
      this.syncInventoryForPlanCompanies(planId).catch((err) =>
        this.logger.error(
          `Error sincronizando inventario para plan ${planId} después de agregar módulo: ${err.message}`,
        ),
      );
    }

    return result;
  }

  async removePlanModule(planId: string, moduleId: string) {
    const planModule = await this.prisma.planModule.findUnique({
      where: {
        plan_id_module_id: {
          plan_id: planId,
          module_id: moduleId,
        },
      },
    });

    if (!planModule) {
      throw new NotFoundException('El módulo no está asignado al plan');
    }

    return this.prisma.planModule.delete({
      where: {
        plan_id_module_id: {
          plan_id: planId,
          module_id: moduleId,
        },
      },
    });
  }
}
