import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { TenantContextService, RealtimePublisherService } from '@contagracia/shared-modules';
import { CreateUserDto, UpdateUserDto, UpdateStatusDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly realtimePublisher: RealtimePublisherService,
  ) {}

  /**
   * Verificar que el usuario actual está activo
   */
  private async verifyUserActive(
    tenantDb: any,
    currentUserId: string,
  ): Promise<void> {
    const currentUser = await tenantDb.tenantUser.findUnique({
      where: { id: currentUserId },
      select: { is_active: true },
    });

    if (!currentUser || !currentUser.is_active) {
      throw new ForbiddenException('Usuario no encontrado o inactivo');
    }
  }

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
   * Listar usuarios del tenant
   */
  async findAll(
    companyId: string,
    currentUserId: string,
    options?: {
      skip?: number;
      take?: number;
      search?: string;
      isActive?: boolean;
    },
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

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

    const [users, total, planLimits] = await Promise.all([
      tenantDb.tenantUser.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 50,
        orderBy: { created_at: 'desc' },
        include: { role: true },
      }),
      tenantDb.tenantUser.count({ where }),
      this.tenantContext.getCompanyPlanLimits(companyId),
    ]);

    return {
      data: users.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        role: user.role
          ? {
              id: user.role.id,
              role_key: user.role.role_key,
              role_name: user.role.role_name,
            }
          : null,
      })),
      total,
      maxUsers: planLimits.maxUsers,
      skip: options?.skip || 0,
      take: options?.take || 50,
    };
  }

  /**
   * Obtener usuario por ID
   */
  async findOne(
    companyId: string,
    currentUserId: string,
    userId: string,
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
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
      updated_at: user.updated_at,
      role: user.role
        ? {
            id: user.role.id,
            role_key: user.role.role_key,
            role_name: user.role.role_name,
          }
        : null,
    };
  }

  /**
   * Crear nuevo usuario
   */
  async create(
    companyId: string,
    currentUserId: string,
    dto: CreateUserDto,
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

    // Verificar email único
    const existing = await tenantDb.tenantUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con este email');
    }

    // Verificar tercero si se proporciona
    if (dto.third_party_id) {
      const thirdParty = await tenantDb.thirdParty.findUnique({
        where: { id: dto.third_party_id },
      });
      if (!thirdParty) {
        throw new NotFoundException('Tercero no encontrado');
      }
      const linked = await tenantDb.tenantUser.findFirst({
        where: { third_party_id: dto.third_party_id },
      });
      if (linked) {
        throw new ConflictException('Este tercero ya está vinculado a otro usuario');
      }
    }

    // Obtener rol (por defecto employee)
    let roleId = dto.role_id;
    if (!roleId) {
      const defaultRole = await tenantDb.role.findFirst({
        where: { role_key: 'employee' },
      });
      if (!defaultRole) {
        throw new NotFoundException('Rol de empleado no configurado');
      }
      roleId = defaultRole.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await tenantDb.tenantUser.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        full_name: dto.full_name,
        phone: dto.phone,
        role_id: roleId,
        third_party_id: dto.third_party_id || null,
        must_change_password: true,
      },
      include: { role: true, third_party: true },
    });

    this.logger.log(`Usuario creado: ${user.email}`);

    // Notificar en tiempo real
    this.realtimePublisher.notifyUserListChanged(companyId, 'created', user.id);

    return {
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_active: user.is_active,
        role: user.role
          ? { role_key: user.role.role_key, role_name: user.role.role_name }
          : null,
      },
    };
  }

  /**
   * Actualizar usuario
   */
  async update(
    companyId: string,
    currentUserId: string,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

    const existing = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar email único si se cambia
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
      role_id: dto.role_id,
    };

    // Hash nueva contraseña si se proporciona
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 12);
      updateData.must_change_password = true;
    }

    // Limpiar campos undefined
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

    this.logger.log(`Usuario actualizado: ${updated.email}`);

    // Notificar en tiempo real
    this.realtimePublisher.notifyUserListChanged(companyId, 'updated', userId);

    return {
      message: 'Usuario actualizado exitosamente',
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
   * Actualizar estado (activar/desactivar)
   */
  async updateStatus(
    companyId: string,
    currentUserId: string,
    userId: string,
    dto: UpdateStatusDto,
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

    // No permitir desactivarse a sí mismo
    if (userId === currentUserId && !dto.is_active) {
      throw new ForbiddenException('No puedes desactivarte a ti mismo');
    }

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir desactivar al owner
    if (user.role?.role_key === 'owner' && !dto.is_active) {
      throw new ForbiddenException('No se puede desactivar al propietario');
    }

    await tenantDb.tenantUser.update({
      where: { id: userId },
      data: { is_active: dto.is_active },
    });

    const action = dto.is_active ? 'activado' : 'desactivado';
    this.logger.log(`Usuario ${action}: ${user.email}`);

    // Notificar en tiempo real
    this.realtimePublisher.notifyUserListChanged(companyId, 'status_changed', userId);

    // Si se desactiva, forzar cierre de sesión
    if (!dto.is_active) {
      this.realtimePublisher.forceLogoutUser(userId, 'Tu cuenta ha sido desactivada');
    }

    return {
      message: `Usuario ${action} exitosamente`,
    };
  }

  /**
   * Cambiar rol de usuario
   */
  async updateRole(
    companyId: string,
    currentUserId: string,
    userId: string,
    roleId: string,
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    await this.verifyUserActive(tenantDb, currentUserId);

    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir cambiar rol del owner
    if (user.role?.role_key === 'owner') {
      throw new ForbiddenException('No se puede cambiar el rol del propietario');
    }

    const newRole = await tenantDb.role.findUnique({
      where: { id: roleId },
    });

    if (!newRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // No permitir asignar rol owner
    if (newRole.role_key === 'owner') {
      throw new ForbiddenException('No se puede asignar el rol de propietario');
    }

    await tenantDb.tenantUser.update({
      where: { id: userId },
      data: { role_id: roleId },
    });

    this.logger.log(`Rol cambiado para ${user.email}: ${newRole.role_name}`);

    // Notificar en tiempo real
    this.realtimePublisher.notifyUserRoleChanged(
      userId,
      companyId,
      user.role?.role_key,
      newRole.role_key,
    );
    this.realtimePublisher.notifyUserListChanged(companyId, 'updated', userId);

    return {
      message: 'Rol actualizado exitosamente',
      role: {
        role_key: newRole.role_key,
        role_name: newRole.role_name,
      },
    };
  }
}
