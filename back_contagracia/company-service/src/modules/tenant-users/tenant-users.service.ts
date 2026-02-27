import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import {
  UpdateTenantUserDto,
  UpdateTenantUserPermissionsDto,
} from './dto/update-tenant-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantUsersService {
  private readonly logger = new Logger(TenantUsersService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
  ) {}

  /**
   * Verificar que el usuario pertenece a la empresa
   * Compara el company_id del JWT con el companyId de la URL
   */
  private verifyCompanyAccess(
    jwtCompanyId: string,
    urlCompanyId: string,
  ): void {
    if (jwtCompanyId !== urlCompanyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  /**
   * Obtener las acciones habilitadas del plan de la empresa
   * Devuelve un Set de action_keys y un Map de action_key → module_key
   */
  private async getEnabledActions(companyId: string): Promise<{
    actions: Set<string>;
    actionToModule: Map<string, string>;
  }> {
    const subscription = await this.masterPrisma.subscription.findFirst({
      where: {
        company_id: companyId,
        OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
      },
      include: {
        plan: {
          include: {
            plan_modules: {
              include: {
                module: {
                  include: {
                    actions: {
                      where: { is_active: true },
                      select: { action_key: true },
                    },
                  },
                },
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
      return { actions: new Set(), actionToModule: new Map() };
    }

    const actions = new Set<string>();
    const actionToModule = new Map<string, string>();

    for (const pm of subscription.plan.plan_modules) {
      const moduleKey = pm.module.module_key;
      for (const action of pm.module.actions) {
        actions.add(action.action_key);
        actionToModule.set(action.action_key, moduleKey);
      }
    }

    return { actions, actionToModule };
  }

  /**
   * Crear un nuevo empleado en el tenant
   */
  async create(
    companyId: string,
    jwtCompanyId: string,
    dto: CreateTenantUserDto,
  ) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que el email no esté en uso
    const existing = await tenantDb.tenantUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Ya existe un empleado con este email');
    }

    // Validar permisos contra acciones del plan
    const { actions: enabledActions } = await this.getEnabledActions(companyId);

    if (dto.permissions && dto.permissions.length > 0) {
      const invalidActions = dto.permissions.filter(
        (p) => !enabledActions.has(p.action_key),
      );

      if (invalidActions.length > 0) {
        throw new ForbiddenException(
          `Las siguientes acciones no están disponibles en el plan: ${invalidActions.map((a) => a.action_key).join(', ')}`,
        );
      }
    }

    // Obtener rol por defecto (employee)
    const defaultRole = await tenantDb.role.findFirst({
      where: { role_key: 'employee' },
    });

    if (!defaultRole) {
      throw new NotFoundException('Rol de empleado no configurado');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Crear usuario y permisos en transacción
    const result = await tenantDb.$transaction(async (tx) => {
      // Crear el usuario
      const user = await tx.tenantUser.create({
        data: {
          email: dto.email,
          password_hash: passwordHash,
          full_name: dto.full_name,
          phone: dto.phone,
          third_party_id: dto.third_party_id,
          role_id: dto.role_id || defaultRole.id,
          must_change_password: true,
        },
      });

      // Crear permisos si se especificaron
      if (dto.permissions && dto.permissions.length > 0) {
        await tx.tenantUserPermission.createMany({
          data: dto.permissions.map((p) => ({
            tenant_user_id: user.id,
            action_key: p.action_key,
            granted: p.granted !== false,
          })),
        });
      }

      // Recuperar usuario con permisos
      const createdUser = await tx.tenantUser.findUnique({
        where: { id: user.id },
        include: { permissions: true, role: true },
      });

      if (!createdUser) {
        throw new Error('Error al crear el usuario');
      }

      return createdUser;
    });

    this.logger.log(`Empleado creado: ${result.email} en empresa ${companyId}`);

    return {
      message: 'Empleado creado exitosamente',
      user: {
        id: result.id,
        email: result.email,
        full_name: result.full_name,
        phone: result.phone,
        is_active: result.is_active,
        role: result.role
          ? { role_key: result.role.role_key, role_name: result.role.role_name }
          : null,
        permissions: result.permissions.map((p) => ({
          action_key: p.action_key,
          granted: p.granted,
        })),
      },
    };
  }

  /**
   * Listar empleados del tenant
   */
  async findAll(
    companyId: string,
    jwtCompanyId: string,
    options?: {
      skip?: number;
      take?: number;
      search?: string;
      isActive?: boolean;
    },
  ) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};

    if (options?.isActive !== undefined) {
      where.is_active = options.isActive;
    }

    if (options?.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { full_name: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Obtener usuarios y límites en paralelo
    const [users, total, companyWithPlan] = await Promise.all([
      tenantDb.tenantUser.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 50,
        orderBy: { created_at: 'desc' },
        include: {
          permissions: true,
          role: true,
        },
      }),
      tenantDb.tenantUser.count({ where }),
      // Obtener límites de usuarios desde master
      this.masterPrisma.company.findUnique({
        where: { id: companyId },
        include: {
          subscriptions: {
            where: {
              OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
            },
            take: 1,
            orderBy: { created_at: 'desc' },
            include: {
              plan: {
                select: { max_users: true },
              },
            },
          },
        },
      }),
    ]);

    // Calcular límite máximo de usuarios
    const planMaxUsers = companyWithPlan?.subscriptions[0]?.plan?.max_users || 1;
    const userPlus = companyWithPlan?.user_plus || 0;
    const maxUsers = planMaxUsers + userPlus;

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        role: user.role
          ? { role_key: user.role.role_key, role_name: user.role.role_name }
          : null,
        permissions_count: user.permissions.length,
      })),
      total,
      maxUsers,
      skip: options?.skip || 0,
      take: options?.take || 50,
    };
  }

  /**
   * Obtener un empleado por ID
   */
  async findOne(companyId: string, jwtCompanyId: string, userId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
        role: true,
        third_party: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      last_login_at: user.last_login_at,
      last_login_ip: user.last_login_ip,
      created_at: user.created_at,
      role: user.role
        ? {
            id: user.role.id,
            role_key: user.role.role_key,
            role_name: user.role.role_name,
          }
        : null,
      third_party: user.third_party
        ? {
            id: user.third_party.id,
            name: user.third_party.name,
            identification_number: user.third_party.identification_number,
          }
        : null,
      permissions: user.permissions.map((p) => ({
        id: p.id,
        action_key: p.action_key,
        granted: p.granted,
      })),
    };
  }

  /**
   * Actualizar datos de un empleado
   */
  async update(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: UpdateTenantUserDto,
  ) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (dto.email && dto.email !== existing.email) {
      const emailExists = await tenantDb.tenantUser.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const updateData: any = {
      email: dto.email,
      full_name: dto.full_name,
      phone: dto.phone,
      is_active: dto.is_active,
      tercero_id: dto.tercero_id,
      role_id: dto.role_id,
    };

    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 12);
      updateData.must_change_password = true;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await tenantDb.tenantUser.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });

    this.logger.log(`Empleado actualizado: ${updated.email}`);

    return {
      message: 'Empleado actualizado exitosamente',
      user: {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        phone: updated.phone,
        is_active: updated.is_active,
        role: updated.role
          ? { role_key: updated.role.role_key, role_name: updated.role.role_name }
          : null,
      },
    };
  }

  /**
   * Actualizar permisos de un empleado
   */
  async updatePermissions(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: UpdateTenantUserPermissionsDto,
  ) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Validar permisos contra acciones del plan
    const { actions: enabledActions } = await this.getEnabledActions(companyId);
    const invalidActions = dto.permissions.filter(
      (p) => !enabledActions.has(p.action_key),
    );

    if (invalidActions.length > 0) {
      throw new ForbiddenException(
        `Las siguientes acciones no están disponibles en el plan: ${invalidActions.map((a) => a.action_key).join(', ')}`,
      );
    }

    // Reemplazar todos los permisos en transacción
    await tenantDb.$transaction(async (tx) => {
      await tx.tenantUserPermission.deleteMany({
        where: { tenant_user_id: userId },
      });

      if (dto.permissions.length > 0) {
        await tx.tenantUserPermission.createMany({
          data: dto.permissions.map((p) => ({
            tenant_user_id: userId,
            action_key: p.action_key,
            granted: p.granted !== false,
          })),
        });
      }
    });

    this.logger.log(`Permisos actualizados para empleado: ${user.email}`);

    const permissions = await tenantDb.tenantUserPermission.findMany({
      where: { tenant_user_id: userId },
    });

    return {
      message: 'Permisos actualizados exitosamente',
      permissions: permissions.map((p) => ({
        action_key: p.action_key,
        granted: p.granted,
      })),
    };
  }

  /**
   * Eliminar (desactivar) un empleado
   */
  async remove(companyId: string, jwtCompanyId: string, userId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await tenantDb.tenantUser.update({
      where: { id: userId },
      data: { is_active: false },
    });

    this.logger.log(`Empleado desactivado: ${user.email}`);

    return {
      message: 'Empleado desactivado exitosamente',
    };
  }

  /**
   * Obtener permisos de un empleado (usado para validación de acceso)
   */
  async getEmployeePermissions(companyId: string, tenantUserId: string) {
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: tenantUserId },
      include: {
        permissions: {
          where: { granted: true },
        },
        role: true,
      },
    });

    if (!user || !user.is_active) {
      throw new NotFoundException('Empleado no encontrado o inactivo');
    }

    // Obtener acciones y mapeo a módulos del plan
    const { actions: enabledActions, actionToModule } = await this.getEnabledActions(companyId);

    // Filtrar permisos contra acciones habilitadas
    const validPermissions = user.permissions.filter((p) =>
      enabledActions.has(p.action_key),
    );

    // Extraer módulos únicos de las acciones válidas
    const modules = [
      ...new Set(
        validPermissions
          .map((p) => actionToModule.get(p.action_key))
          .filter((m): m is string => !!m),
      ),
    ];

    return {
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
        ? {
            role_key: user.role.role_key,
            role_name: user.role.role_name,
          }
        : null,
      modules,
      permissions: validPermissions.map((p) => ({
        action_key: p.action_key,
      })),
    };
  }
}
