import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CompanyPaymentMethodQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface CreateCompanyPaymentMethodDto {
  payment_method_id: string;
  name: string;
  description?: string;
}

export interface UpdateCompanyPaymentMethodDto {
  name?: string;
  description?: string;
  is_active?: boolean;
}

@Injectable()
export class CompanyPaymentMethodsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async findAll(
    companyId: string,
    params: CompanyPaymentMethodQueryParams = {},
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50, includeInactive = false } = params;

    const where: any = {};

    if (!includeInactive) {
      where.is_active = true;
    }

    if (search) {
      const pattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT cpm."id" FROM "company_payment_methods" cpm
        WHERE cpm."name" ILIKE ${pattern}
        OR COALESCE(cpm."consecutive", '') ILIKE ${pattern}
        OR COALESCE(cpm."description", '') ILIKE ${pattern}
        OR word_similarity(${search}, cpm."name") > 0.3
        OR word_similarity(${search}, COALESCE(cpm."consecutive", '')) > 0.3
        OR word_similarity(${search}, COALESCE(cpm."description", '')) > 0.3
      `;
      const matchIds = fuzzyMatches.map((r) => r.id);
      if (matchIds.length > 0) {
        where.id = { in: matchIds };
      } else {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false,
        };
      }
    }

    const [data, total] = await Promise.all([
      tenantDb.companyPaymentMethod.findMany({
        where,
        include: {
          payment_method: { select: { id: true, name: true, code: true } },
        },
        orderBy: { consecutive: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.companyPaymentMethod.count({ where }),
    ]);

    return {
      data: data.map((m) => ({
        id: m.id,
        consecutive: m.consecutive,
        name: m.name,
        description: m.description,
        is_active: m.is_active,
        payment_method_id: m.payment_method_id,
        payment_method_name: m.payment_method.name,
        payment_method_code: m.payment_method.code,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findOne(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const method = await tenantDb.companyPaymentMethod.findUnique({
      where: { id },
      include: {
        payment_method: { select: { id: true, name: true, code: true } },
      },
    });

    if (!method) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    return {
      id: method.id,
      consecutive: method.consecutive,
      name: method.name,
      description: method.description,
      is_active: method.is_active,
      payment_method_id: method.payment_method_id,
      payment_method_name: method.payment_method.name,
      payment_method_code: method.payment_method.code,
      created_at: method.created_at,
      updated_at: method.updated_at,
    };
  }

  async create(companyId: string, dto: CreateCompanyPaymentMethodDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const paymentMethod = await tenantDb.paymentMethod.findUnique({
      where: { id: dto.payment_method_id },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Método de pago DIAN no encontrado');
    }

    const method = await tenantDb.$transaction(async (tx) => {
      const consecutive = await getNextConsecutive(tx, 'company_payment_method');

      return tx.companyPaymentMethod.create({
        data: {
          payment_method_id: dto.payment_method_id,
          consecutive,
          name: dto.name,
          description: dto.description || null,
        },
        include: {
          payment_method: { select: { id: true, name: true, code: true } },
        },
      });
    });

    return {
      id: method.id,
      consecutive: method.consecutive,
      name: method.name,
      description: method.description,
      is_active: method.is_active,
      payment_method_id: method.payment_method_id,
      payment_method_name: method.payment_method.name,
      payment_method_code: method.payment_method.code,
      created_at: method.created_at,
      updated_at: method.updated_at,
    };
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCompanyPaymentMethodDto,
  ) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.companyPaymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    const method = await tenantDb.companyPaymentMethod.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        is_active: dto.is_active,
      },
      include: {
        payment_method: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      id: method.id,
      consecutive: method.consecutive,
      name: method.name,
      description: method.description,
      is_active: method.is_active,
      payment_method_id: method.payment_method_id,
      payment_method_name: method.payment_method.name,
      payment_method_code: method.payment_method.code,
      created_at: method.created_at,
      updated_at: method.updated_at,
    };
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const method = await tenantDb.companyPaymentMethod.findUnique({
      where: { id },
    });

    if (!method) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    // Check usage in payment receipt lines
    const receiptLinesCount = await tenantDb.paymentReceiptLine.count({
      where: { company_payment_method_id: id },
    });

    if (receiptLinesCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${receiptLinesCount} línea(s) de recibo de pago asociada(s)`,
      );
    }

    // Check usage in documents
    const documentsCount = await tenantDb.document.count({
      where: { payment_method_id: id },
    });

    if (documentsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${documentsCount} documento(s) asociado(s)`,
      );
    }

    // Check usage in document_payments
    const dbpCount = await tenantDb.documentPayment.count({
      where: { company_payment_method_id: id },
    });

    if (dbpCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${dbpCount} pago(s) de documento asociado(s)`,
      );
    }

    // Check usage in prepayments
    const prepaymentsCount = await tenantDb.prepayment.count({
      where: { company_payment_method_id: id },
    });

    if (prepaymentsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${prepaymentsCount} anticipo(s) asociado(s)`,
      );
    }

    await tenantDb.companyPaymentMethod.delete({ where: { id } });

    return { message: 'Método de pago eliminado exitosamente' };
  }

  async getPaymentMethods(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const methods = await tenantDb.paymentMethod.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });

    return methods;
  }
}
