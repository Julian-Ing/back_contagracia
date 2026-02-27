import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    filters: {
      condominium_id?: string;
      unit_id?: string;
      vehicle_type?: string;
      search?: string;
      is_active?: string;
      skip?: number;
      take?: number;
      userId?: string;
      userRole?: string;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const {
      condominium_id,
      unit_id,
      vehicle_type,
      search,
      is_active,
      skip = 0,
      take = 20,
    } = filters;

    let where: any = {};

    // Filtro is_active (por defecto solo activos)
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    } else {
      where.is_active = true;
    }

    if (unit_id) {
      where.unit_id = unit_id;
    }

    if (vehicle_type) {
      where.vehicle_type = vehicle_type;
    }

    // Filtro por condominio (a través de la unidad)
    if (condominium_id) {
      where.unit = {
        condominium_id,
      };
    }

    // Búsqueda por placa, marca o modelo
    if (search) {
      where.OR = [
        { plate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Si no es admin, filtrar solo vehículos de las unidades del usuario
    // Relación: vehículo → unit_id (apartamento) O parking_space (parqueadero)
    // El residente puede estar asociado al apartamento o al parqueadero
    const isAdmin =
      filters.userRole === 'owner' || filters.userRole === 'admin';
    if (!isAdmin && filters.userId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: { id: filters.userId },
        select: { third_party_id: true },
      });

      if (tenantUser?.third_party_id) {
        const myResidents = await db.phUnitResident.findMany({
          where: { tercero_id: tenantUser.third_party_id, is_active: true },
          include: { unit: { select: { id: true, unit_number: true } } },
        });
        const unitIds = myResidents.map((r) => r.unit_id);
        const unitNumbers = myResidents
          .map((r) => r.unit?.unit_number)
          .filter(Boolean) as string[];

        // Vehículos cuya unidad pertenece al residente O cuyo parqueadero coincide
        const ownershipFilter: any[] = [{ unit_id: { in: unitIds } }];
        if (unitNumbers.length > 0) {
          ownershipFilter.push({ parking_space: { in: unitNumbers } });
        }

        // Preservar filtros existentes en where y agregar condición de propiedad
        const existingWhere = { ...where };
        where = { AND: [existingWhere, { OR: ownershipFilter }] };
      } else {
        return { data: [], total: 0, skip, take };
      }
    }

    const [data, total] = await Promise.all([
      db.phVehicle.findMany({
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
      db.phVehicle.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const vehicle = await db.phVehicle.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            condominium: true,
          },
        },
        resident: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  async create(companyId: string, dto: CreateVehicleDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const vehicle = await db.phVehicle.create({
      data: {
        unit_id: dto.unit_id,
        resident_id: dto.resident_id,
        vehicle_type: dto.vehicle_type,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        color: dto.color,
        plate: dto.plate,
        sticker_number: dto.sticker_number,
        parking_space: dto.parking_space,
        notes: dto.notes,
      },
    });

    this.logger.log(`Vehículo creado: ${vehicle.id}`);

    return vehicle;
  }

  async update(companyId: string, id: string, dto: UpdateVehicleDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que existe
    const existing = await db.phVehicle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await db.phVehicle.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Vehículo actualizado: ${vehicle.id}`);

    return vehicle;
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que existe
    const existing = await db.phVehicle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await db.phVehicle.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.log(`Vehículo desactivado: ${vehicle.id}`);

    return { message: 'Vehículo eliminado exitosamente' };
  }
}
