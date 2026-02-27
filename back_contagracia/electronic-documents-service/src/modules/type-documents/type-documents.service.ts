import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

@Injectable()
export class TypeDocumentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const skip = (page - 1) * limit;
    const where: any = {};

    // Fuzzy search con word_similarity
    if (search) {
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT td."id"
        FROM "type_documents" td
        WHERE word_similarity(${search}, COALESCE(td."name", '')) > 0.3
           OR word_similarity(${search}, COALESCE(td."code", '')) > 0.3
      `;

      const matchIds = fuzzyMatches.map((r) => r.id);
      if (matchIds.length > 0) {
        where.id = { in: matchIds };
      } else {
        // Sin coincidencias, retornar vacío
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    const [data, total] = await Promise.all([
      tenantDb.typeDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { display_order: 'asc' },
      }),
      tenantDb.typeDocument.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
