import { Injectable, Logger, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService, RealtimePublisherService } from '@contagracia/shared-modules';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly realtimePublisher: RealtimePublisherService,
  ) {}

  /**
   * Obtener cliente de tenant a partir del company_id
   */
  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new UnauthorizedException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Crear un nuevo rol en el tenant
   */
  async create(companyId: string, currentUserId: string, dto: CreateRoleDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que el usuario actual es admin
    const currentUser = await tenantDb.tenantUser.findUnique({
      where: { id: currentUserId },
      include: { role: true },
    });

    if (!currentUser?.role || !['owner', 'admin'].includes(currentUser.role.role_key)) {
      throw new ForbiddenException('Solo administradores pueden crear roles');
    }

    // Verificar que el role_key no exista
    const existing = await tenantDb.role.findUnique({
      where: { role_key: dto.role_key },
    });

    if (existing) {
      throw new ConflictException('Ya existe un rol con esta clave');
    }

    // No permitir crear roles reservados
    const reservedKeys = ['owner', 'admin', 'employee'];
    if (reservedKeys.includes(dto.role_key.toLowerCase())) {
      throw new ForbiddenException('No se puede usar una clave de rol reservada');
    }

    // Crear rol con permisos en transacción
    const result = await tenantDb.$transaction(async (tx: any) => {
      const role = await tx.role.create({
        data: {
          role_key: dto.role_key.toLowerCase(),
          role_name: dto.role_name,
          description: dto.description,
          is_system: false,
          is_active: true,
        },
      });

      // Crear permisos si se especificaron
      if (dto.permissions && dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            role_id: role.id,
            action_key: p.action_key,
            granted: p.granted !== false,
          })),
        });
      }

      return role;
    });

    this.logger.log(`Rol creado: ${result.role_key} en tenant ${companyId}`);

    // Obtener el rol con sus permisos
    const roleWithPermissions = await tenantDb.role.findUnique({
      where: { id: result.id },
      include: { permissions: true },
    });

    // Notificar en tiempo real
    this.realtimePublisher.notifyRoleListChanged(companyId, 'created', result.id);

    return {
      message: 'Rol creado exitosamente',
      role: {
        id: roleWithPermissions!.id,
        role_key: roleWithPermissions!.role_key,
        role_name: roleWithPermissions!.role_name,
        description: roleWithPermissions!.description,
        is_system: roleWithPermissions!.is_system,
        permissions: roleWithPermissions!.permissions.map((p: any) => ({
          action_key: p.action_key,
          granted: p.granted,
        })),
      },
    };
  }

  /**
   * Listar roles del tenant
   * Excluye el rol 'owner' de la lista (no se puede asignar)
   */
  async findAll(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const roles = await tenantDb.role.findMany({
      where: {
        is_active: true,
        role_key: { not: 'owner' }, // No mostrar owner
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      data: roles.map((role: any) => ({
        id: role.id,
        role_key: role.role_key,
        role_name: role.role_name,
        description: role.description,
        is_system: role.is_system,
      })),
    };
  }

  /**
   * Obtener rol por ID
   */
  async findOne(companyId: string, roleId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const role = await tenantDb.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      return null;
    }

    return {
      id: role.id,
      role_key: role.role_key,
      role_name: role.role_name,
      description: role.description,
      is_system: role.is_system,
      permissions: role.permissions.map((p: any) => ({
        action_key: p.action_key,
        granted: p.granted,
      })),
    };
  }

  /**
   * Actualizar rol existente
   */
  async update(companyId: string, currentUserId: string, roleId: string, dto: UpdateRoleDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que el usuario actual es admin
    const currentUser = await tenantDb.tenantUser.findUnique({
      where: { id: currentUserId },
      include: { role: true },
    });

    if (!currentUser?.role || !['owner', 'admin'].includes(currentUser.role.role_key)) {
      throw new ForbiddenException('Solo administradores pueden editar roles');
    }

    // Verificar que el rol existe
    const existingRole = await tenantDb.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // No permitir editar roles del sistema
    if (existingRole.is_system) {
      throw new ForbiddenException('No se pueden editar roles del sistema');
    }

    // Actualizar rol y permisos en transacción
    const result = await tenantDb.$transaction(async (tx: any) => {
      // Actualizar datos básicos del rol
      const updateData: any = {};
      if (dto.role_name !== undefined) updateData.role_name = dto.role_name;
      if (dto.description !== undefined) updateData.description = dto.description;

      if (Object.keys(updateData).length > 0) {
        await tx.role.update({
          where: { id: roleId },
          data: updateData,
        });
      }

      // Actualizar permisos si se especificaron
      if (dto.permissions !== undefined) {
        // Eliminar permisos existentes
        await tx.rolePermission.deleteMany({
          where: { role_id: roleId },
        });

        // Crear nuevos permisos
        if (dto.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissions.map((p) => ({
              role_id: roleId,
              action_key: p.action_key,
              granted: p.granted !== false,
            })),
          });
        }
      }

      return true;
    });

    this.logger.log(`Rol actualizado: ${existingRole.role_key} en tenant ${companyId}`);

    // Obtener el rol actualizado con sus permisos
    const roleWithPermissions = await tenantDb.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    // Notificar en tiempo real: actualización de lista de roles
    this.realtimePublisher.notifyRoleListChanged(companyId, 'updated', roleId);

    // Notificar a usuarios con este rol que sus permisos cambiaron
    if (dto.permissions !== undefined) {
      this.realtimePublisher.notifyRoleUpdated(companyId, existingRole.role_key);
    }

    return {
      message: 'Rol actualizado exitosamente',
      role: {
        id: roleWithPermissions!.id,
        role_key: roleWithPermissions!.role_key,
        role_name: roleWithPermissions!.role_name,
        description: roleWithPermissions!.description,
        is_system: roleWithPermissions!.is_system,
        permissions: roleWithPermissions!.permissions.map((p: any) => ({
          action_key: p.action_key,
          granted: p.granted,
        })),
      },
    };
  }

  /**
   * Eliminar rol existente
   * Solo permite eliminar roles no-sistema que no tengan usuarios asignados
   */
  async delete(companyId: string, currentUserId: string, roleId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que el usuario actual es admin
    const currentUser = await tenantDb.tenantUser.findUnique({
      where: { id: currentUserId },
      include: { role: true },
    });

    if (!currentUser?.role || !['owner', 'admin'].includes(currentUser.role.role_key)) {
      throw new ForbiddenException('Solo administradores pueden eliminar roles');
    }

    // Verificar que el rol existe
    const existingRole = await tenantDb.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // No permitir eliminar roles del sistema
    if (existingRole.is_system) {
      throw new ForbiddenException('No se pueden eliminar roles del sistema');
    }

    // Verificar que no haya usuarios con este rol
    const usersWithRole = await tenantDb.tenantUser.count({
      where: { role_id: roleId },
    });

    if (usersWithRole > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol porque tiene ${usersWithRole} usuario(s) asignado(s). Reasigne los usuarios a otro rol primero.`
      );
    }

    // Eliminar permisos y rol en transacción
    await tenantDb.$transaction(async (tx: any) => {
      // Eliminar permisos del rol
      await tx.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Eliminar el rol
      await tx.role.delete({
        where: { id: roleId },
      });
    });

    this.logger.log(`Rol eliminado: ${existingRole.role_key} en tenant ${companyId}`);

    // Notificar en tiempo real
    this.realtimePublisher.notifyRoleListChanged(companyId, 'deleted', roleId);

    return {
      message: 'Rol eliminado exitosamente',
    };
  }
}
