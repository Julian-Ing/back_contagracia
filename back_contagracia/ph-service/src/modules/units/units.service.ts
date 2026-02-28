import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

interface FindAllParams {
  condominium_id?: string;
  tower_id?: string;
  unit_type_id?: string;
  search?: string;
  is_active?: boolean;
  skip?: number;
  take?: number;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(companyId: string, params: FindAllParams) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};

    if (params.condominium_id) {
      where.condominium_id = params.condominium_id;
    }

    if (params.tower_id) {
      where.tower_id = params.tower_id;
    }

    if (params.unit_type_id) {
      where.unit_type_id = params.unit_type_id;
    }

    if (params.search) {
      where.unit_number = { contains: params.search, mode: 'insensitive' };
    }

    if (params.is_active !== undefined) {
      where.is_active = params.is_active;
    }

    // Si no es admin, filtrar solo unidades vinculadas al usuario
    const isAdmin = params.userRole === 'owner' || params.userRole === 'admin';
    if (!isAdmin && params.userId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: { id: params.userId },
        select: { third_party_id: true },
      });

      if (tenantUser?.third_party_id) {
        const myResidents = await db.phUnitResident.findMany({
          where: { tercero_id: tenantUser.third_party_id, is_active: true },
          select: { unit_id: true },
        });
        const unitIds = myResidents.map((r) => r.unit_id);
        where.id = { in: unitIds };
      } else {
        return { data: [], total: 0 };
      }
    }

    const [data, total] = await Promise.all([
      db.phUnit.findMany({
        where,
        include: {
          condominium: true,
          tower: true,
          unit_type: true,
          parent_unit: true,
          _count: {
            select: {
              residents: true,
              vehicles: true,
            },
          },
        },
        orderBy: { unit_number: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      db.phUnit.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const unit = await db.phUnit.findUnique({
      where: { id },
      include: {
        condominium: true,
        tower: true,
        unit_type: true,
        parent_unit: true,
        residents: true,
        vehicles: true,
        child_units: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad no encontrada');
    }

    return unit;
  }

  async create(companyId: string, dto: CreateUnitDto, createdBy: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.phUnit.create({
      data: {
        condominium_id: dto.condominium_id,
        tower_id: dto.tower_id,
        unit_type_id: dto.unit_type_id,
        unit_number: dto.unit_number,
        floor: dto.floor,
        area_m2: dto.area_m2,
        coefficient: dto.coefficient,
        parent_unit_id: dto.parent_unit_id,
        notes: dto.notes,
        created_by: createdBy,
      },
      include: {
        condominium: true,
        tower: true,
        unit_type: true,
        parent_unit: true,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateUnitDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Unidad no encontrada');
    }

    return db.phUnit.update({
      where: { id },
      data: dto,
      include: {
        condominium: true,
        tower: true,
        unit_type: true,
        parent_unit: true,
      },
    });
  }

  async getCoefficientSum(companyId: string, condominiumId: string, excludeUnitId?: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = { condominium_id: condominiumId, is_active: true };
    if (excludeUnitId) {
      where.id = { not: excludeUnitId };
    }

    const result = await db.phUnit.aggregate({
      where,
      _sum: { coefficient: true },
      _count: true,
    });

    return {
      sum: result._sum.coefficient ? Number(result._sum.coefficient) : 0,
      count: result._count,
    };
  }

  async logNameChange(
    companyId: string,
    unitId: string,
    oldName: string,
    newName: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      await db.auditLog.create({
        data: {
          action_key: 'unit.name_changed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: { unit_number: oldName },
          new_values: { unit_number: newName },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de nombre: ${err.message}`);
    }
  }

  async logCondominiumChange(
    companyId: string,
    unitId: string,
    oldCondoId: string,
    newCondoId: string,
    oldCondoName: string,
    newCondoName: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      await db.auditLog.create({
        data: {
          action_key: 'unit.condominium_changed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: { condominium: oldCondoName },
          new_values: { condominium: newCondoName },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de copropiedad: ${err.message}`);
    }
  }

  async getHistory(companyId: string, unitId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.auditLog.findMany({
      where: {
        entity_type: 'unit',
        entity_id: unitId,
        action_key: {
          in: [
            'unit.name_changed',
            'unit.condominium_changed',
            'unit.resident_added',
            'unit.resident_type_changed',
            'unit.resident_removed',
            'unit.owner_changed',
            'unit.resident_unit_changed',
            'unit.resident_condominium_changed',
            'unit.resident_tower_changed',
          ],
        },
      },
      orderBy: { performed_at: 'desc' },
      select: {
        id: true,
        action_key: true,
        old_values: true,
        new_values: true,
        email: true,
        performed_at: true,
      },
    });
  }

  async deleteHistoryEntry(companyId: string, historyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const entry = await db.auditLog.findUnique({ where: { id: historyId } });
    if (!entry) {
      throw new NotFoundException('Registro de historial no encontrado');
    }

    return db.auditLog.delete({ where: { id: historyId } });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Unidad no encontrada');
    }

    return db.phUnit.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
