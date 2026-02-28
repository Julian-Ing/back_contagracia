import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

const RESIDENT_TYPE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  tenant: 'Arrendatario',
};

@Injectable()
export class ResidentsService {
  private readonly logger = new Logger(ResidentsService.name);

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

  // ── Historial helpers ──

  private async getTerceroName(db: any, terceroId: string): Promise<string> {
    try {
      const tercero = await db.thirdParty.findUnique({
        where: { id: terceroId },
        select: { name: true, first_name: true, first_surname: true },
      });
      if (!tercero) return 'Desconocido';
      return tercero.name || `${tercero.first_name || ''} ${tercero.first_surname || ''}`.trim() || 'Desconocido';
    } catch {
      return 'Desconocido';
    }
  }

  async logResidentAdded(
    companyId: string,
    unitId: string,
    terceroId: string,
    residentType: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      const name = await this.getTerceroName(db, terceroId);
      await db.auditLog.create({
        data: {
          action_key: 'unit.resident_added',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: {},
          new_values: {
            resident_name: name,
            resident_type: RESIDENT_TYPE_LABELS[residentType] || residentType,
          },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar residente agregado: ${err.message}`);
    }
  }

  async logResidentTypeChanged(
    companyId: string,
    unitId: string,
    terceroId: string,
    oldType: string,
    newType: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      const name = await this.getTerceroName(db, terceroId);
      await db.auditLog.create({
        data: {
          action_key: 'unit.resident_type_changed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: {
            resident_name: name,
            resident_type: RESIDENT_TYPE_LABELS[oldType] || oldType,
          },
          new_values: {
            resident_name: name,
            resident_type: RESIDENT_TYPE_LABELS[newType] || newType,
          },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de tipo de residente: ${err.message}`);
    }
  }

  async logResidentRemoved(
    companyId: string,
    unitId: string,
    terceroId: string,
    residentType: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      const name = await this.getTerceroName(db, terceroId);
      await db.auditLog.create({
        data: {
          action_key: 'unit.resident_removed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: {
            resident_name: name,
            resident_type: RESIDENT_TYPE_LABELS[residentType] || residentType,
          },
          new_values: {},
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar residente eliminado: ${err.message}`);
    }
  }

  async logOwnerChange(
    companyId: string,
    unitId: string,
    newTerceroId: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);

      // Buscar propietario anterior (activo o inactivo) excluyendo el nuevo
      const previousOwner = await db.phUnitResident.findFirst({
        where: {
          unit_id: unitId,
          resident_type: 'owner',
          tercero_id: { not: newTerceroId },
        },
        orderBy: { updated_at: 'desc' },
        select: { tercero_id: true },
      });

      if (!previousOwner) return; // No había propietario anterior

      const [oldName, newName] = await Promise.all([
        this.getTerceroName(db, previousOwner.tercero_id),
        this.getTerceroName(db, newTerceroId),
      ]);

      await db.auditLog.create({
        data: {
          action_key: 'unit.owner_changed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: { owner_name: oldName },
          new_values: { owner_name: newName },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de copropietario: ${err.message}`);
    }
  }

  async logDirectOwnerChange(
    companyId: string,
    unitId: string,
    oldTerceroId: string,
    newTerceroId: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);
      const [oldName, newName] = await Promise.all([
        this.getTerceroName(db, oldTerceroId),
        this.getTerceroName(db, newTerceroId),
      ]);

      await db.auditLog.create({
        data: {
          action_key: 'unit.owner_changed',
          entity_type: 'unit',
          entity_id: unitId,
          old_values: { owner_name: oldName },
          new_values: { owner_name: newName },
          user_id: userId ?? null,
          email: email ?? null,
          company_id: companyId,
          service_name: 'ph-service',
        },
      });
    } catch (err) {
      this.logger.warn(`Error al registrar cambio directo de copropietario: ${err.message}`);
    }
  }

  async logResidentUnitChanged(
    companyId: string,
    terceroId: string,
    oldUnitId: string,
    newUnitId: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);

      // Resolver nombre del residente y nombres de ambas unidades en paralelo
      const [name, oldUnit, newUnit] = await Promise.all([
        this.getTerceroName(db, terceroId),
        db.phUnit.findUnique({ where: { id: oldUnitId }, select: { unit_number: true } }),
        db.phUnit.findUnique({ where: { id: newUnitId }, select: { unit_number: true } }),
      ]);

      const oldUnitName = oldUnit?.unit_number || 'Desconocida';
      const newUnitName = newUnit?.unit_number || 'Desconocida';

      const commonData = {
        action_key: 'unit.resident_unit_changed',
        entity_type: 'unit',
        old_values: { resident_name: name, unit_name: oldUnitName },
        new_values: { resident_name: name, unit_name: newUnitName },
        user_id: userId ?? null,
        email: email ?? null,
        company_id: companyId,
        service_name: 'ph-service',
      };

      // Registrar en ambas unidades para que ambos historiales lo muestren
      await Promise.all([
        db.auditLog.create({ data: { ...commonData, entity_id: oldUnitId } }),
        db.auditLog.create({ data: { ...commonData, entity_id: newUnitId } }),
      ]);
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de unidad del residente: ${err.message}`);
    }
  }

  async logResidentCondominiumChanged(
    companyId: string,
    terceroId: string,
    oldUnitId: string,
    newUnitId: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);

      const [name, oldUnit, newUnit] = await Promise.all([
        this.getTerceroName(db, terceroId),
        db.phUnit.findUnique({
          where: { id: oldUnitId },
          select: { condominium_id: true, condominium: { select: { name: true } } },
        }),
        db.phUnit.findUnique({
          where: { id: newUnitId },
          select: { condominium_id: true, condominium: { select: { name: true } } },
        }),
      ]);

      // Solo registrar si la copropiedad realmente cambió
      if (!oldUnit || !newUnit || oldUnit.condominium_id === newUnit.condominium_id) return;

      const oldCondoName = oldUnit.condominium?.name || 'Desconocida';
      const newCondoName = newUnit.condominium?.name || 'Desconocida';

      const commonData = {
        action_key: 'unit.resident_condominium_changed',
        entity_type: 'unit',
        old_values: { resident_name: name, condominium_name: oldCondoName },
        new_values: { resident_name: name, condominium_name: newCondoName },
        user_id: userId ?? null,
        email: email ?? null,
        company_id: companyId,
        service_name: 'ph-service',
      };

      await Promise.all([
        db.auditLog.create({ data: { ...commonData, entity_id: oldUnitId } }),
        db.auditLog.create({ data: { ...commonData, entity_id: newUnitId } }),
      ]);
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de copropiedad del residente: ${err.message}`);
    }
  }

  async logResidentTowerChanged(
    companyId: string,
    terceroId: string,
    oldUnitId: string,
    newUnitId: string,
    userId?: string,
    email?: string,
  ) {
    try {
      const db = await this.tenantPrisma.getClientForCompany(companyId);

      const [name, oldUnit, newUnit] = await Promise.all([
        this.getTerceroName(db, terceroId),
        db.phUnit.findUnique({
          where: { id: oldUnitId },
          select: { tower_id: true, tower: { select: { name: true } } },
        }),
        db.phUnit.findUnique({
          where: { id: newUnitId },
          select: { tower_id: true, tower: { select: { name: true } } },
        }),
      ]);

      // Solo registrar si la torre realmente cambió
      if (!oldUnit || !newUnit) return;
      if (oldUnit.tower_id === newUnit.tower_id) return;

      const oldTowerName = oldUnit.tower?.name || 'Sin torre';
      const newTowerName = newUnit.tower?.name || 'Sin torre';

      const commonData = {
        action_key: 'unit.resident_tower_changed',
        entity_type: 'unit',
        old_values: { resident_name: name, tower_name: oldTowerName },
        new_values: { resident_name: name, tower_name: newTowerName },
        user_id: userId ?? null,
        email: email ?? null,
        company_id: companyId,
        service_name: 'ph-service',
      };

      await Promise.all([
        db.auditLog.create({ data: { ...commonData, entity_id: oldUnitId } }),
        db.auditLog.create({ data: { ...commonData, entity_id: newUnitId } }),
      ]);
    } catch (err) {
      this.logger.warn(`Error al registrar cambio de torre del residente: ${err.message}`);
    }
  }

  async getResidentHistory(companyId: string, residentId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Obtener el residente para saber su unit_id y tercero_id
    const resident = await db.phUnitResident.findUnique({
      where: { id: residentId },
      select: { unit_id: true, tercero_id: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente no encontrado');
    }

    // Buscar el nombre del tercero para filtrar entradas relevantes
    const tercero = await db.thirdParty.findUnique({
      where: { id: resident.tercero_id },
      select: { name: true, first_name: true, first_surname: true },
    });
    const terceroName = tercero?.name
      || `${tercero?.first_name || ''} ${tercero?.first_surname || ''}`.trim()
      || '';

    // Obtener historial de la unidad relacionado con residentes
    const entries = await db.auditLog.findMany({
      where: {
        entity_type: 'unit',
        entity_id: resident.unit_id,
        action_key: {
          in: [
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

    // Filtrar solo entradas que involucran a este tercero
    return entries.filter((entry) => {
      const oldVals = entry.old_values as Record<string, any> | null;
      const newVals = entry.new_values as Record<string, any> | null;
      const nameFields = [
        oldVals?.resident_name,
        newVals?.resident_name,
        oldVals?.owner_name,
        newVals?.owner_name,
      ].filter(Boolean);
      return nameFields.some((n) => n === terceroName);
    });
  }

  async deleteResidentHistoryEntry(companyId: string, historyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const entry = await db.auditLog.findUnique({ where: { id: historyId } });
    if (!entry) {
      throw new NotFoundException('Registro de historial no encontrado');
    }

    return db.auditLog.delete({ where: { id: historyId } });
  }
}
