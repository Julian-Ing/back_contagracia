import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { RealtimePublisherService } from '@contagracia/shared-modules';
import { PrismaService } from '../prisma/prisma.service';
import {
  ManageSubscriptionDto,
  UpdateCompanyStatusDto,
  AssignCategoriesDto,
} from './dto';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private realtimePublisher: RealtimePublisherService,
  ) {}

  private async syncDianForCompany(companyId: string): Promise<void> {
    const syncUrl = this.configService.get<string>('COMPANY_SERVICE_SYNC_URL');
    if (!syncUrl) {
      this.logger.warn('COMPANY_SERVICE_SYNC_URL no configurada, omitiendo sync DIAN');
      return;
    }

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!response.ok) {
        this.logger.warn(`Error sincronizando compañía ${companyId} con DIAN: ${response.statusText}`);
      }
    } catch (error: any) {
      this.logger.error(`Error llamando company-service sync: ${error.message}`);
    }
  }

  private async syncInventoryForCompany(companyId: string, planId: string): Promise<void> {
    // Verificar si el plan tiene inventory_management
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        plan_modules: {
          include: { module: { select: { module_key: true } } },
        },
      },
    });

    if (!plan) return;

    const hasInventory = plan.plan_modules.some(
      (pm) => pm.module.module_key === 'inventory_management',
    );

    if (!hasInventory) return;

    const syncUrl = this.configService.get<string>('INVENTORY_SERVICE_SYNC_URL');
    if (!syncUrl) {
      this.logger.warn('INVENTORY_SERVICE_SYNC_URL no configurada, omitiendo sync inventario');
      return;
    }

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!response.ok) {
        this.logger.warn(`Error sincronizando almacén principal para compañía ${companyId}: ${response.statusText}`);
      }
    } catch (error: any) {
      this.logger.error(`Error llamando inventory-service sync: ${error.message}`);
    }
  }

  /**
   * Construir URL de conexión a la base de datos del tenant
   */
  private buildDatabaseUrl(company: {
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_password: string;
  }): string {
    return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    expiration?: string;
    category_id?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter (ahora busca en Company, no en user_companies)
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { nit: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (query.category_id) {
      where.category_assignments = {
        some: { category_id: query.category_id },
      };
    }

    // Get companies with relations
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          subscriptions: {
            orderBy: { created_at: 'desc' },
            take: 1,
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  max_users: true,
                },
              },
            },
          },
          category_assignments: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    // Transform data to match frontend Company interface
    let data = companies.map((company) => {
      const subscription = company.subscriptions[0];
      const categories = company.category_assignments.map((a) => a.category);

      return {
        id: company.id,
        company_id: company.id,
        company_name: company.company_name,
        email: company.email || '',
        company_nit: company.nit,
        company_phone: '',
        user_created_at: company.created_at.toISOString(),
        plan_id: subscription?.plan?.id || '',
        plan_name: subscription?.plan?.name || 'Sin plan',
        subscription_ends_at: subscription?.ends_at?.toISOString() || null,
        invoice_count: 0, // TODO: count from tenant DB
        status: company.is_active ? 'active' : 'inactive',
        categories,
        tenant_id: company.tenant_id,
      };
    });

    // Server-side expiration filter
    if (query.expiration && query.expiration !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      data = data.filter((c) => {
        if (!c.subscription_ends_at) return query.expiration === 'expired';
        const endDate = new Date(c.subscription_ends_at);
        endDate.setHours(0, 0, 0, 0);
        const diffMs = endDate.getTime() - now.getTime();
        const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        switch (query.expiration) {
          case 'expired':
            return daysUntil < 0;
          case '30':
            return daysUntil >= 0 && daysUntil <= 30;
          case '60':
            return daysUntil >= 0 && daysUntil <= 60;
          case '90':
            return daysUntil >= 0 && daysUntil <= 90;
          case 'more90':
            return daysUntil > 90;
          default:
            return true;
        }
      });
    }

    return {
      data,
      meta: {
        total: query.expiration ? data.length : total,
        page,
        limit,
        totalPages: Math.ceil(
          (query.expiration ? data.length : total) / limit,
        ),
      },
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            plan: true,
          },
        },
        category_assignments: {
          include: {
            category: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    // Intentar obtener el owner del tenant
    let owner: {
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      created_at: Date;
      is_active: boolean;
    } | null = null;
    try {
      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: this.buildDatabaseUrl(company) },
        },
      });

      try {
        const ownerUser = await tenantPrisma.tenantUser.findFirst({
          where: {
            role: {
              role_key: 'owner',
            },
          },
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            created_at: true,
            is_active: true,
          },
        });
        owner = ownerUser;
      } finally {
        await tenantPrisma.$disconnect();
      }
    } catch {
      // Si falla la conexión al tenant, continuamos sin owner
    }

    return {
      ...company,
      owner,
    };
  }

  async updateStatus(id: string, dto: UpdateCompanyStatusDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    const result = await this.prisma.company.update({
      where: { id },
      data: { is_active: dto.status === 'active' },
    });

    // Notificar cambio en lista de compañías
    this.realtimePublisher.notifyCompanyListChanged('status_changed', id);

    // Si se desactiva, forzar logout de todos los usuarios de la compañía
    if (dto.status !== 'active') {
      this.realtimePublisher.forceLogoutCompany(id, 'La compañía ha sido desactivada');
    }

    return result;
  }

  async manageSubscription(id: string, dto: ManageSubscriptionDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { subscriptions: { orderBy: { created_at: 'desc' }, take: 1 } },
    });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.plan_id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${dto.plan_id} no encontrado`);
    }

    const subscriptionData = {
      company_id: id,
      plan_id: dto.plan_id,
      ends_at: new Date(dto.ends_at),
    };

    const existingSubscription = company.subscriptions[0];

    let result;
    if (existingSubscription) {
      result = await this.prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionData,
        include: { plan: true },
      });
    } else {
      result = await this.prisma.subscription.create({
        data: subscriptionData,
        include: { plan: true },
      });
    }

    // Propagar módulos del nuevo plan al tenant
    this.propagateModulesToTenant(company, dto.plan_id).catch((err) =>
      this.logger.error(`Error propagando módulos al tenant ${company.db_name}: ${err.message}`),
    );

    // Sincronizar con API DIAN si tiene módulo electronic_documents
    this.syncDianForCompany(id).catch((err) =>
      this.logger.error(`Error sincronizando DIAN para ${id}: ${err.message}`),
    );

    // Sincronizar almacén principal si tiene módulo inventory_management
    this.syncInventoryForCompany(id, dto.plan_id).catch((err) =>
      this.logger.error(`Error sincronizando inventario para ${id}: ${err.message}`),
    );

    return result;
  }

  private async propagateModulesToTenant(
    company: { db_host: string; db_port: number; db_name: string; db_user: string; db_password: string },
    planId: string,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        plan_modules: {
          include: {
            module: { include: { actions: true } },
          },
        },
      },
    });

    if (!plan) return;

    const modules = plan.plan_modules.map((pm) => pm.module);
    const moduleKeys = modules.map((m) => m.module_key);
    const actions = modules.flatMap((m) => m.actions);

    let tenantPrisma: TenantPrismaClient | null = null;
    try {
      tenantPrisma = new TenantPrismaClient({
        datasources: { db: { url: this.buildDatabaseUrl(company) } },
      });
      await tenantPrisma.$connect();

      await tenantPrisma.module.deleteMany({
        where: { module_key: { notIn: moduleKeys } },
      });

      for (const m of modules) {
        await tenantPrisma.module.upsert({
          where: { id: m.id },
          create: { id: m.id, module_key: m.module_key, module_name: m.module_name, description: m.description, icon: m.icon, group: m.group, sort_order: m.sort_order, is_active: m.is_active },
          update: { module_name: m.module_name, description: m.description, icon: m.icon, group: m.group, sort_order: m.sort_order, is_active: m.is_active },
        });
      }

      for (const a of actions) {
        await tenantPrisma.systemAction.upsert({
          where: { id: a.id },
          create: { id: a.id, module_id: a.module_id, action_key: a.action_key, action_name: a.action_name, description: a.description, is_active: a.is_active },
          update: { action_name: a.action_name, description: a.description, is_active: a.is_active },
        });
      }

      this.logger.log(`Tenant ${company.db_name} actualizado: ${modules.length} módulos, ${actions.length} acciones`);
    } finally {
      if (tenantPrisma) await tenantPrisma.$disconnect();
    }
  }

  async assignCategories(id: string, dto: AssignCategoriesDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete all current assignments
      await tx.companyCategoryAssignment.deleteMany({
        where: { company_id: id },
      });

      // Insert new assignments
      if (dto.category_ids.length > 0) {
        await tx.companyCategoryAssignment.createMany({
          data: dto.category_ids.map((category_id) => ({
            company_id: id,
            category_id,
          })),
        });
      }

      // Return updated assignments
      return tx.companyCategoryAssignment.findMany({
        where: { company_id: id },
        include: {
          category: {
            select: { id: true, name: true, color: true },
          },
        },
      });
    });
  }

  async remove(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    // 1. Eliminar carpetas de uploads del disco (logos y firmas)
    try {
      const logoDir = path.resolve(process.cwd(), '..', 'uploads', 'logos', company.nit);
      if (fs.existsSync(logoDir)) {
        fs.rmSync(logoDir, { recursive: true, force: true });
      }
      const sigDir = path.resolve(process.cwd(), '..', 'uploads', 'signatures', company.nit);
      if (fs.existsSync(sigDir)) {
        fs.rmSync(sigDir, { recursive: true, force: true });
      }
    } catch {
      // No bloquear eliminación si falla limpieza de archivos
    }

    // 2. Eliminar base de datos del tenant
    if (company.db_name) {
      try {
        // Cerrar conexiones activas y eliminar la BD del tenant
        await this.prisma.$executeRawUnsafe(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${company.db_name}' AND pid <> pg_backend_pid()`,
        );
        await this.prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${company.db_name}"`);
      } catch (err) {
        console.warn(`[remove] No se pudo eliminar la BD del tenant ${company.db_name}:`, err);
        // No bloquear la eliminación del registro si falla el DROP
      }
    }

    // 3. Cascade delete en master: subscriptions, category_assignments, notifications
    return this.prisma.company.delete({
      where: { id },
    });
  }

  async impersonate(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        subscriptions: {
          take: 1,
          orderBy: { created_at: 'desc' },
          include: {
            plan: {
              include: {
                plan_modules: {
                  include: {
                    module: {
                      include: { actions: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Compañía con ID ${id} no encontrada`);
    }

    if (!company.is_active) {
      throw new BadRequestException('La compañía está inactiva');
    }

    // Conectar al tenant para obtener el owner
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: this.buildDatabaseUrl(company) },
      },
    });

    try {
      const owner = await tenantPrisma.tenantUser.findFirst({
        where: {
          role: {
            role_key: 'owner',
          },
          is_active: true,
        },
        include: {
          role: true,
        },
      });

      if (!owner) {
        throw new BadRequestException('La compañía no tiene un usuario owner activo');
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
      const subscription = company.subscriptions?.[0];
      const enabledModules = subscription?.plan?.plan_modules?.map(
        (pm) => pm.module.module_key,
      ) || [];
      // Obtener todas las acciones de los módulos del plan (owner tiene todas)
      const allActions = subscription?.plan?.plan_modules?.flatMap(
        (pm) => pm.module.actions?.map((a) => a.action_key) || [],
      ) || [];

      // Generate a temporary token for the company owner (impersonation)
      const impersonateSessionId = `impersonate_${Date.now()}`;
      const accessToken = jwt.sign(
        {
          sub: owner.id,
          email: owner.email,
          user_type: 'company_user',
          company_id: company.id,
          tenant_id: company.tenant_id,
          role: owner.role.role_key,
          session_id: impersonateSessionId,
          database_url: this.buildDatabaseUrl(company),
          modules: enabledModules,
          impersonated: true,
        },
        jwtSecret,
        { expiresIn: '2h' },
      );

      return {
        access_token: accessToken,
        refresh_token: null,
        user_type: 'company_user' as const,
        user: {
          id: owner.id,
          email: owner.email,
          full_name: owner.full_name,
        },
        company: {
          id: company.id,
          company_name: company.company_name,
          nit: company.nit || '',
          email: company.email || '',
          phone: '',
          address: '',
          database_name: company.db_name,
          logo_url: company.logo_url || null,
          user_plus: company.user_plus || 0,
          is_active: company.is_active,
          created_at: company.created_at.toISOString(),
          updated_at: company.updated_at.toISOString(),
        },
        subscription: subscription
          ? {
              plan_id: subscription.plan?.id || '',
              plan_name: subscription.plan?.name || '',
            }
          : null,
        permissions: {
          modules: enabledModules,
          actions: allActions,
        },
        role: owner.role.role_key,
        must_change_password: false,
        impersonated: true,
      };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
}
