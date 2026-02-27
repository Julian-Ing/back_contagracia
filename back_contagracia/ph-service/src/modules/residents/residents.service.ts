import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

@Injectable()
export class ResidentsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    filters: {
      condominium_id?: string;
      unit_id?: string;
      resident_type?: string;
      tercero_id?: string;
      is_active?: boolean;
      skip?: number;
      take?: number;
      userId?: string;
      userRole?: string;
      permissions?: string[];
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const {
      condominium_id,
      unit_id,
      resident_type,
      tercero_id,
      is_active,
      skip = 0,
      take = 20,
    } = filters;

    const where: any = {};

    if (unit_id) {
      where.unit_id = unit_id;
    }

    if (resident_type) {
      where.resident_type = resident_type;
    }

    if (tercero_id) {
      where.tercero_id = tercero_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (condominium_id) {
      where.unit = { condominium_id };
    }

    // Si no es admin, filtrar solo residentes de las copropiedades del usuario
    const isAdmin = filters.userRole === 'owner' || filters.userRole === 'admin' || filters.permissions?.includes('*');
    if (!isAdmin && filters.userId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: { id: filters.userId },
        select: { third_party_id: true },
      });

      if (tenantUser?.third_party_id) {
        const myResidents = await db.phUnitResident.findMany({
          where: { tercero_id: tenantUser.third_party_id, is_active: true },
          select: { unit_id: true },
        });
        const myUnitIds = myResidents.map((r) => r.unit_id);
        const myUnits = await db.phUnit.findMany({
          where: { id: { in: myUnitIds } },
          select: { condominium_id: true },
        });
        const condoIds = [...new Set(myUnits.map((u) => u.condominium_id))];
        where.unit = { ...where.unit, condominium_id: { in: condoIds } };
      } else {
        return { data: [], total: 0 };
      }
    }

    const [data, total] = await Promise.all([
      db.phUnitResident.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          unit: {
            include: {
              condominium: true,
            },
          },
        },
      }),
      db.phUnitResident.count({ where }),
    ]);

    // Resolver nombres de terceros
    const terceroIds = [...new Set(data.map((r) => r.tercero_id).filter(Boolean))];
    const terceros = terceroIds.length > 0
      ? await db.thirdParty.findMany({
          where: { id: { in: terceroIds } },
          select: { id: true, name: true },
        })
      : [];
    const terceroMap = new Map(terceros.map((t) => [t.id, t]));

    const enriched = data.map((r) => ({
      ...r,
      tercero: terceroMap.get(r.tercero_id) || null,
    }));

    return { data: enriched, total };
  }

  /**
   * Obtener las unidades del usuario logueado (via tenant_user.third_party_id → PhUnitResident)
   */
  async getMyUnits(companyId: string, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Buscar el tercero vinculado al usuario
    const tenantUser = await db.tenantUser.findFirst({
      where: { id: userId },
      select: { third_party_id: true },
    });

    if (!tenantUser?.third_party_id) return [];

    // Buscar datos del tercero y sus unidades en paralelo
    const [tercero, residents] = await Promise.all([
      db.thirdParty.findUnique({
        where: { id: tenantUser.third_party_id },
        select: { id: true, name: true, phone: true, email: true },
      }),
      db.phUnitResident.findMany({
        where: {
          tercero_id: tenantUser.third_party_id,
          is_active: true,
        },
        include: {
          unit: {
            include: { condominium: true },
          },
        },
      }),
    ]);

    // Adjuntar datos del tercero a cada registro
    return residents.map((r) => ({ ...r, tercero }));
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const resident = await db.phUnitResident.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            condominium: true,
          },
        },
        vehicles: true,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente no encontrado');
    }

    return resident;
  }

  async create(companyId: string, dto: CreateResidentDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.phUnitResident.create({
      data: {
        unit_id: dto.unit_id,
        tercero_id: dto.tercero_id,
        resident_type: dto.resident_type,
        is_primary: dto.is_primary ?? false,
        move_in_date: dto.move_in_date ? new Date(dto.move_in_date) : undefined,
        notes: dto.notes,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateResidentDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitResident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Residente no encontrado');
    }

    const data: any = {};
    if (dto.unit_id !== undefined) data.unit_id = dto.unit_id;
    if (dto.tercero_id !== undefined) data.tercero_id = dto.tercero_id;
    if (dto.resident_type !== undefined) data.resident_type = dto.resident_type;
    if (dto.is_primary !== undefined) data.is_primary = dto.is_primary;
    if (dto.move_in_date !== undefined) data.move_in_date = new Date(dto.move_in_date);
    if (dto.notes !== undefined) data.notes = dto.notes;

    return db.phUnitResident.update({
      where: { id },
      data,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitResident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Residente no encontrado');
    }

    return db.phUnitResident.update({
      where: { id },
      data: {
        is_active: false,
        move_out_date: new Date(),
      },
    });
  }
}
