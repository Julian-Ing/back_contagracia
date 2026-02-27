import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TenantContextService, DianApiService } from '@contagracia/shared-modules';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';

@Injectable()
export class ResolutionsService {
  private readonly logger = new Logger(ResolutionsService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
  ) {}

  async create(companyId: string, createDto: CreateResolutionDto) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Validaciones de negocio
    this.validateBusinessRules(createDto);

    // Verificar que el tipo de documento existe
    const typeDocument = await tenantDb.typeDocument.findUnique({
      where: { id: createDto.type_document_id },
    });

    if (!typeDocument) {
      throw new BadRequestException('Tipo de documento no encontrado');
    }

    // Verificar technical_key para tipos específicos (1, 2, 3, 12)
    const requiresTechnicalKey = ['1', '2', '3', '12'].includes(typeDocument.id);
    if (requiresTechnicalKey && !createDto.technical_key) {
      throw new BadRequestException(
        'La clave técnica es obligatoria para este tipo de documento',
      );
    }

    // Crear resolución
    const resolution = await tenantDb.resolution.create({
      data: {
        type_document_id: createDto.type_document_id,
        prefix: createDto.prefix,
        resolution_number: createDto.resolution_number,
        resolution_date: new Date(createDto.resolution_date),
        technical_key: createDto.technical_key,
        range_from: BigInt(createDto.range_from),
        range_to: BigInt(createDto.range_to),
        last_external_consecutive: createDto.last_external_consecutive ?? 0,
        date_from: new Date(createDto.date_from),
        date_to: new Date(createDto.date_to),
        is_active: createDto.is_active ?? true,
      },
      include: {
        type_document: true,
      },
    });

    // Sincronizar con API DIAN (no bloquea si falla)
    await this.syncWithDian(companyId, resolution, tenantDb);

    return this.serializeResolution(resolution);
  }

  async findAll(
    companyId: string,
    search?: string,
    typeDocumentId?: string,
    isActive?: boolean,
    page = 1,
    limit = 20,
  ) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const skip = (page - 1) * limit;
    const where: any = {};

    // Filtro por tipo de documento
    if (typeDocumentId) {
      where.type_document_id = typeDocumentId;
    }

    // Filtro por estado: undefined = todos, true = solo activos, false = solo inactivos
    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    // Búsqueda fuzzy
    if (search && search.trim()) {
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT r."id"
        FROM "resolutions" r
        WHERE word_similarity(${search}, COALESCE(r."prefix", '')) > 0.3
           OR word_similarity(${search}, COALESCE(r."resolution_number", '')) > 0.3
      `;

      const matchIds = fuzzyMatches.map((r) => r.id);
      if (matchIds.length > 0) {
        where.id = { in: matchIds };
      } else {
        // Sin coincidencias
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    const [resolutions, total] = await Promise.all([
      tenantDb.resolution.findMany({
        where,
        skip,
        take: limit,
        include: {
          type_document: true,
        },
        orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      }),
      tenantDb.resolution.count({ where }),
    ]);

    return {
      data: resolutions.map((r) => this.serializeResolution(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const resolution = await tenantDb.resolution.findUnique({
      where: { id },
      include: {
        type_document: true,
      },
    });

    if (!resolution) {
      throw new NotFoundException('Resolución no encontrada');
    }

    return this.serializeResolution(resolution);
  }

  async update(companyId: string, id: string, updateDto: UpdateResolutionDto) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Verificar que existe
    const existing = await tenantDb.resolution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Resolución no encontrada');
    }

    // Validar rangos si se actualizan
    if (updateDto.range_from !== undefined || updateDto.range_to !== undefined) {
      const newFrom = updateDto.range_from ?? Number(existing.range_from);
      const newTo = updateDto.range_to ?? Number(existing.range_to);

      this.validateRanges(newFrom, newTo);

      // Validar last_external_consecutive
      const newLastExternal =
        updateDto.last_external_consecutive ?? existing.last_external_consecutive ?? 0;
      if (newLastExternal !== null && newLastExternal > newTo) {
        throw new BadRequestException(
          'El último consecutivo externo no puede ser mayor que el consecutivo "Hasta"',
        );
      }
    }

    // Validar fechas si se actualizan
    if (updateDto.date_from !== undefined || updateDto.date_to !== undefined) {
      const newDateFrom = updateDto.date_from
        ? new Date(updateDto.date_from)
        : existing.date_from;
      const newDateTo = updateDto.date_to ? new Date(updateDto.date_to) : existing.date_to;

      if (newDateFrom && newDateTo && newDateFrom > newDateTo) {
        throw new BadRequestException(
          'La fecha "Válida Desde" no puede ser mayor que "Válida Hasta"',
        );
      }
    }

    // Actualizar
    const updated = await tenantDb.resolution.update({
      where: { id },
      data: {
        ...(updateDto.type_document_id && { type_document_id: updateDto.type_document_id }),
        ...(updateDto.prefix && { prefix: updateDto.prefix }),
        ...(updateDto.resolution_number && { resolution_number: updateDto.resolution_number }),
        ...(updateDto.resolution_date && {
          resolution_date: new Date(updateDto.resolution_date),
        }),
        ...(updateDto.technical_key !== undefined && {
          technical_key: updateDto.technical_key,
        }),
        ...(updateDto.range_from !== undefined && {
          range_from: BigInt(updateDto.range_from),
        }),
        ...(updateDto.range_to !== undefined && { range_to: BigInt(updateDto.range_to) }),
        ...(updateDto.last_external_consecutive !== undefined && {
          last_external_consecutive: updateDto.last_external_consecutive,
        }),
        ...(updateDto.date_from && { date_from: new Date(updateDto.date_from) }),
        ...(updateDto.date_to && { date_to: new Date(updateDto.date_to) }),
        ...(updateDto.is_active !== undefined && { is_active: updateDto.is_active }),
      },
      include: {
        type_document: true,
      },
    });

    // Sincronizar con API DIAN (no bloquea si falla)
    await this.syncWithDian(companyId, updated, tenantDb);

    return this.serializeResolution(updated);
  }

  async remove(companyId: string, id: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Verificar que existe
    const existing = await tenantDb.resolution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Resolución no encontrada');
    }

    // Soft delete: marcar como inactiva
    await tenantDb.resolution.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Resolución eliminada exitosamente' };
  }

  // Validaciones de negocio
  private validateBusinessRules(dto: CreateResolutionDto) {
    // Validar rangos
    this.validateRanges(dto.range_from, dto.range_to);

    // Validar last_external_consecutive
    if (dto.last_external_consecutive !== undefined) {
      if (dto.last_external_consecutive < 0) {
        throw new BadRequestException('El último consecutivo externo no puede ser negativo');
      }
      if (dto.last_external_consecutive > dto.range_to) {
        throw new BadRequestException(
          'El último consecutivo externo no puede ser mayor que el consecutivo "Hasta"',
        );
      }
    }

    // Validar fechas de vigencia
    const dateFrom = new Date(dto.date_from);
    const dateTo = new Date(dto.date_to);

    if (dateFrom > dateTo) {
      throw new BadRequestException(
        'La fecha "Válida Desde" no puede ser mayor que "Válida Hasta"',
      );
    }
  }

  private validateRanges(from: number, to: number) {
    if (from <= 0 || to <= 0) {
      throw new BadRequestException('Los consecutivos deben ser mayores a 0');
    }

    if (to <= from) {
      throw new BadRequestException(
        'El consecutivo "Hasta" debe ser mayor que "Desde"',
      );
    }
  }

  private serializeResolution(resolution: any) {
    return {
      ...resolution,
      range_from: Number(resolution.range_from),
      range_to: Number(resolution.range_to),
    };
  }

  private async syncWithDian(companyId: string, resolution: any, tenantDb: any) {
    this.logger.log(`🔄 syncWithDian iniciado para resolución: ${resolution.id}`);
    this.logger.log(`🔍 Métodos disponibles en dianApiService: ${Object.getOwnPropertyNames(Object.getPrototypeOf(this.dianApiService)).join(', ')}`);
    try {
      // Obtener token DIAN de CompanySetting
      const setting = await tenantDb.companySetting.findFirst({
        where: { category: 'dian', key: 'api_dian_token' },
      });

      const token = setting?.value;
      this.logger.log(`🔑 Token DIAN encontrado: ${token ? `${token.substring(0, 20)}...` : 'NO HAY TOKEN'}`);

      if (!token) {
        // No hay token, no sincronizar (empresa sin facturación electrónica activa)
        this.logger.warn('⚠️ No hay token DIAN, saltando sincronización');
        return;
      }

      // Preparar payload para API DIAN
      const payload = {
        type_document_id: Number(resolution.type_document.id),
        prefix: resolution.prefix,
        resolution: resolution.resolution_number,
        resolution_date: resolution.resolution_date.toISOString().split('T')[0],
        technical_key: resolution.technical_key || '',
        from: Number(resolution.range_from),
        to: Number(resolution.range_to),
        date_from: resolution.date_from.toISOString().split('T')[0],
        date_to: resolution.date_to.toISOString().split('T')[0],
      };

      this.logger.log('📞 Llamando a dianApiService.syncResolution...');
      // Enviar a API DIAN
      await this.dianApiService.syncResolution(token, payload);
      this.logger.log('✅ syncWithDian completado');
    } catch (error: any) {
      // No bloquear el flujo principal si falla la sincronización con DIAN
      this.logger.error(`❌ Error sincronizando resolución ${resolution.id} con DIAN: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
    }
  }
}
