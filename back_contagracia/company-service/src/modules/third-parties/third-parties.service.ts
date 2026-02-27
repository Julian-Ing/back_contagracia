import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant-users/tenant-prisma.service';
import { CreateThirdPartyDto, UpdateThirdPartyDto } from './dto';

export interface ThirdPartyFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  /** Excluir terceros que SOLO tienen roles internos (contact, employee) */
  excludeInternalOnly?: boolean;
  /** Incluir solo terceros que tengan al menos uno de estos roles */
  include_roles?: string[];
  /** Excluir terceros que tengan alguno de estos roles */
  exclude_roles?: string[];
}

@Injectable()
export class ThirdPartiesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private verifyCompanyAccess(jwtCompanyId: string, urlCompanyId: string): void {
    if (jwtCompanyId !== urlCompanyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  // Roles que se consideran "externos" (para módulo de Terceros)
  // Deben coincidir con los valores del enum ThirdPartyType en Prisma (UPPERCASE)
  private readonly EXTERNAL_ROLES = ['CLIENT', 'SUPPLIER', 'CO_OWNER', 'TENANT', 'OTHER', 'EPS', 'ARL', 'PENSION_FUND', 'COMPENSATION_FUND', 'SEVERANCE_FUND', 'SENA', 'ICBF'];

  /**
   * Listar terceros con filtros y paginación
   */
  async findAll(companyId: string, jwtCompanyId: string, filters: ThirdPartyFilters = {}): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const { search, role, is_active, page = 1, limit = 50, excludeInternalOnly = true, include_roles, exclude_roles } = filters;

    const where: any = {};

    // Filtrar por estado activo
    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    // Filtrar por rol específico (singular)
    if (role) {
      where.roles = { has: role };
    }

    // Filtrar por múltiples roles (incluir si tiene al menos uno)
    if (include_roles?.length) {
      where.roles = { hasSome: include_roles.map(r => r.toUpperCase()) };
    }

    // Excluir terceros que tengan alguno de los roles especificados
    if (exclude_roles?.length) {
      where.NOT = {
        roles: { hasSome: exclude_roles.map(r => r.toUpperCase()) },
      };
    }
    // Excluir terceros que SOLO tienen roles internos (contact, employee)
    // Solo mostrar los que tienen al menos un rol externo
    else if (excludeInternalOnly && !role && !include_roles?.length) {
      where.roles = { hasSome: this.EXTERNAL_ROLES };
    }

    // Búsqueda fuzzy por nombre, identificación o email (pg_trgm)
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "third_parties"
        WHERE "name" ILIKE ${searchPattern}
        OR "identification_number" ILIKE ${searchPattern}
        OR "email" ILIKE ${searchPattern}
        OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        OR word_similarity(${search}, COALESCE("identification_number", '')) > 0.3
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length > 0) {
        where.id = { in: matchIds };
      } else {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    const [data, total] = await Promise.all([
      tenantDb.thirdParty.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          type_organization: { select: { id: true, name: true } },
          type_document_identification: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
          municipality: { select: { id: true, name: true } },
        },
      }),
      tenantDb.thirdParty.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener un tercero por ID
   */
  async findOne(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const thirdParty = await tenantDb.thirdParty.findUnique({
      where: { id },
      include: {
        type_organization: true,
        type_document_identification: true,
        type_regime: true,
        type_liability: true,
        department: true,
        municipality: true,
        cxc_account: { select: { code: true, name: true } },
        cxp_account: { select: { code: true, name: true } },
      },
    });

    if (!thirdParty) {
      throw new NotFoundException('Tercero no encontrado');
    }

    return thirdParty;
  }

  /**
   * Verificar si existe un tercero por número de identificación
   */
  async exists(companyId: string, jwtCompanyId: string, identificationNumber: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const thirdParty = await tenantDb.thirdParty.findFirst({
      where: { identification_number: identificationNumber },
      select: {
        id: true,
        name: true,
        identification_number: true,
        roles: true,
      },
    });

    return {
      exists: !!thirdParty,
      thirdParty: thirdParty || undefined,
    };
  }

  /**
   * Crear un nuevo tercero
   */
  async create(companyId: string, jwtCompanyId: string, dto: CreateThirdPartyDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar si ya existe
    if (dto.identification_number) {
      const existing = await tenantDb.thirdParty.findFirst({
        where: { identification_number: dto.identification_number },
      });

      if (existing) {
        throw new ConflictException('Ya existe un tercero con este número de identificación');
      }
    }

    // Validar cuentas contables si se especifican
    if (dto.cxc_account_code) {
      const cxcAccount = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.cxc_account_code },
      });
      if (!cxcAccount) {
        throw new NotFoundException(`Cuenta CxC ${dto.cxc_account_code} no encontrada`);
      }
    }

    if (dto.cxp_account_code) {
      const cxpAccount = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.cxp_account_code },
      });
      if (!cxpAccount) {
        throw new NotFoundException(`Cuenta CxP ${dto.cxp_account_code} no encontrada`);
      }
    }

    const thirdParty = await tenantDb.thirdParty.create({
      data: {
        name: dto.name,
        identification_number: dto.identification_number,
        dv: dto.dv,
        type_document_identification_id: dto.type_document_identification_id,
        type_organization_id: dto.type_organization_id,
        type_regime_id: dto.type_regime_id,
        type_liability_id: dto.type_liability_id,
        roles: dto.roles || [],
        department_id: dto.department_id,
        municipality_id: dto.municipality_id,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        first_name: dto.first_name,
        second_name: dto.second_name,
        first_surname: dto.first_surname,
        second_surname: dto.second_surname,
        cxc_account_code: dto.cxc_account_code,
        cxp_account_code: dto.cxp_account_code,
      },
      include: {
        type_organization: true,
        type_document_identification: true,
      },
    });

    return thirdParty;
  }

  /**
   * Actualizar un tercero
   */
  async update(companyId: string, jwtCompanyId: string, id: string, dto: UpdateThirdPartyDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que existe
    const existing = await tenantDb.thirdParty.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tercero no encontrado');
    }

    // Verificar si el nuevo número de identificación ya existe
    if (dto.identification_number && dto.identification_number !== existing.identification_number) {
      const duplicate = await tenantDb.thirdParty.findFirst({
        where: {
          identification_number: dto.identification_number,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe un tercero con este número de identificación');
      }
    }

    // Validar cuentas contables si se especifican
    if (dto.cxc_account_code) {
      const cxcAccount = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.cxc_account_code },
      });
      if (!cxcAccount) {
        throw new NotFoundException(`Cuenta CxC ${dto.cxc_account_code} no encontrada`);
      }
    }

    if (dto.cxp_account_code) {
      const cxpAccount = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.cxp_account_code },
      });
      if (!cxpAccount) {
        throw new NotFoundException(`Cuenta CxP ${dto.cxp_account_code} no encontrada`);
      }
    }

    const thirdParty = await tenantDb.thirdParty.update({
      where: { id },
      data: {
        name: dto.name,
        identification_number: dto.identification_number,
        dv: dto.dv,
        type_document_identification_id: dto.type_document_identification_id,
        type_organization_id: dto.type_organization_id,
        type_regime_id: dto.type_regime_id,
        type_liability_id: dto.type_liability_id,
        roles: dto.roles,
        department_id: dto.department_id,
        municipality_id: dto.municipality_id,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        first_name: dto.first_name,
        second_name: dto.second_name,
        first_surname: dto.first_surname,
        second_surname: dto.second_surname,
        cxc_account_code: dto.cxc_account_code,
        cxp_account_code: dto.cxp_account_code,
      },
      include: {
        type_organization: true,
        type_document_identification: true,
        cxc_account: { select: { code: true, name: true } },
        cxp_account: { select: { code: true, name: true } },
      },
    });

    return thirdParty;
  }

  /**
   * Desactivar (soft delete) un tercero
   */
  async remove(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await tenantDb.thirdParty.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tercero no encontrado');
    }

    await tenantDb.thirdParty.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Tercero desactivado exitosamente' };
  }
}
