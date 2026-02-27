import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateCondominiumDto } from './dto/create-condominium.dto';
import { UpdateCondominiumDto } from './dto/update-condominium.dto';
import { CreateTowerDto } from './dto/create-tower.dto';
import { UpdateTowerDto } from './dto/update-tower.dto';

@Injectable()
export class CondominiumsService {
  private readonly logger = new Logger(CondominiumsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ─── Condominiums ────────────────────────────────────────────────

  async findAll(
    companyId: string,
    filters: {
      search?: string;
      is_active?: boolean;
      skip?: number;
      take?: number;
      userId?: string;
      userRole?: string;
      permissions?: string[];
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const { search, is_active, skip = 0, take = 20 } = filters;

    const where: any = {
      company_id: companyId,
    };

    // Si no se especifica is_active, por defecto solo activos
    if (is_active !== undefined) {
      where.is_active = is_active;
    } else {
      where.is_active = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nit: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Si el usuario NO es admin/owner, filtrar solo copropiedades donde tiene unidades vinculadas
    const isAdmin = filters.userRole === 'owner' || filters.userRole === 'admin' || filters.permissions?.includes('*');
    if (!isAdmin && filters.userId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: { id: filters.userId },
        select: { third_party_id: true },
      });

      if (tenantUser?.third_party_id) {
        const residents = await db.phUnitResident.findMany({
          where: { tercero_id: tenantUser.third_party_id, is_active: true },
          select: { unit_id: true },
        });
        const unitIds = residents.map((r) => r.unit_id);

        // Obtener condominium_ids de esas unidades
        const units = await db.phUnit.findMany({
          where: { id: { in: unitIds } },
          select: { condominium_id: true },
        });
        const condoIds = [...new Set(units.map((u) => u.condominium_id))];
        where.id = { in: condoIds };
      } else {
        // Sin tercero vinculado → no tiene copropiedades
        return { data: [], total: 0 };
      }
    }

    const [data, total] = await Promise.all([
      db.phCondominium.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { towers: true, units: true },
          },
        },
      }),
      db.phCondominium.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phCondominium.findUniqueOrThrow({
      where: { id },
      include: {
        towers: {
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async create(companyId: string, dto: CreateCondominiumDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phCondominium.create({
      data: {
        company_id: companyId,
        created_by: userId,
        name: dto.name,
        nit: dto.nit,
        address: dto.address,
        department_id: dto.department_id,
        municipality_id: dto.municipality_id,
        phone: dto.phone,
        email: dto.email,
        admin_company_id: dto.admin_company_id,
        total_units: dto.total_units,
        price_per_m2: dto.price_per_m2,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCondominiumDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phCondominium.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phCondominium.update({
      where: { id },
      data: {
        is_active: false,
      },
    });
  }

  // ─── Towers ─────────────────────────────────────────────────────

  async getTowers(companyId: string, condominiumId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const data = await db.phTower.findMany({
      where: {
        condominium_id: condominiumId,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return { data };
  }

  async createTower(
    companyId: string,
    condominiumId: string,
    dto: CreateTowerDto,
    userId: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phTower.create({
      data: {
        condominium_id: condominiumId,
        name: dto.name,
        code: dto.code,
        total_floors: dto.total_floors,
      },
    });
  }

  async updateTower(
    companyId: string,
    condominiumId: string,
    towerId: string,
    dto: UpdateTowerDto,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phTower.update({
      where: { id: towerId },
      data: {
        ...dto,
      },
    });
  }

  async removeTower(companyId: string, condominiumId: string, towerId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phTower.update({
      where: { id: towerId },
      data: {
        is_active: false,
      },
    });
  }
}
