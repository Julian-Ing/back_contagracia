import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { createBankMovement, CreateBankMovementParams } from '../../functions';

export interface BankMovementsQueryParams {
  bank_account_id: string;
  search?: string;
  type_key?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BankMovementsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar movimientos bancarios con búsqueda y paginación
   */
  async findAll(companyId: string, params: BankMovementsQueryParams): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const {
      bank_account_id,
      search,
      type_key,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = params;

    // Verificar que la cuenta bancaria existe
    const bankAccount = await tenantDb.bankAccount.findUnique({
      where: { id: bank_account_id },
    });

    if (!bankAccount) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    const where: any = {
      bank_account_id,
    };

    if (type_key) {
      where.type_key = type_key;
    }

    if (from_date || to_date) {
      where.transaction_date = {};
      if (from_date) where.transaction_date.gte = new Date(from_date);
      if (to_date) where.transaction_date.lte = new Date(to_date);
    }

    if (search) {
      where.OR = [
        { consecutive: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference_consecutive: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [movements, total] = await Promise.all([
      tenantDb.bankMovement.findMany({
        where,
        include: {
          type: true,
        },
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.bankMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => ({
        id: m.id,
        consecutive: m.consecutive,
        transaction_date: m.transaction_date,
        amount: m.amount,
        type_key: m.type_key,
        type_description: m.type.description,
        description: m.description,
        reference_id: m.reference_id,
        reference_type: m.reference_type,
        reference_consecutive: m.reference_consecutive,
        created_at: m.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  /**
   * Obtener movimiento por ID
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const movement = await tenantDb.bankMovement.findUnique({
      where: { id },
      include: {
        type: true,
        bank_account: {
          select: { id: true, account_name: true, account_type: true },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException('Movimiento bancario no encontrado');
    }

    return movement;
  }

  /**
   * Crear movimiento bancario
   */
  async create(companyId: string, data: CreateBankMovementParams) {
    const tenantDb = await this.getTenantDb(companyId);
    return tenantDb.$transaction(async (tx: any) => {
      return createBankMovement(tx, data);
    });
  }
}
