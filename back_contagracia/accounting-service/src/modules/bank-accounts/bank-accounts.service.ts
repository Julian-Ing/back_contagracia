import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService, createCostCenterMovement } from '@contagracia/shared-modules';
import { BankAccountType } from '@prisma/client-tenant';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { createJournalEntry } from '../../functions';
import { createBankMovement } from '../../functions/create-bank-movement';
import { validatePeriodOpen } from '../../functions/validate-period-open';

export interface BankAccountsQueryParams {
  search?: string;
  type?: BankAccountType;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface CreateBankAccountDto {
  account_type: BankAccountType;
  bank_id?: string;
  account_number?: string;
  account_name: string;
  account_id?: string;
  initial_balance?: number;
  counterpart_account_id?: string;
  cost_center_id?: string;
}

export interface UpdateBankAccountDto {
  account_name?: string;
  account_number?: string;
  account_id?: string;
  is_active?: boolean;
}

@Injectable()
export class BankAccountsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar cuentas bancarias con búsqueda y paginación
   */
  async findAll(companyId: string, params: BankAccountsQueryParams = {}): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, type, page = 1, limit = 50 } = params;

    const where: any = params.includeInactive ? {} : { is_active: true };

    if (type) {
      where.account_type = type;
    }

    if (search) {
      where.OR = [
        { account_name: { contains: search, mode: 'insensitive' } },
        { account_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [bankAccounts, total] = await Promise.all([
      tenantDb.bankAccount.findMany({
        where,
        include: {
          bank: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { account_name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.bankAccount.count({ where }),
    ]);

    // Resolver nombres de cuentas contables en batch
    const accountCodes = bankAccounts.map(ba => ba.account_id).filter(Boolean) as string[];
    const accountMap = new Map<string, string>();
    if (accountCodes.length > 0) {
      const accounts = await tenantDb.chartOfAccount.findMany({
        where: { code: { in: accountCodes } },
        select: { code: true, name: true },
      });
      accounts.forEach(a => accountMap.set(a.code, a.name));
    }

    return {
      data: bankAccounts.map((ba) => ({
        id: ba.id,
        account_type: ba.account_type,
        bank_id: ba.bank_id,
        bank_name: ba.bank?.name || null,
        account_number: ba.account_number,
        account_name: ba.account_name,
        account_id: ba.account_id,
        chart_account_name: ba.account_id ? accountMap.get(ba.account_id) || null : null,
        initial_balance: ba.initial_balance,
        current_balance: ba.current_balance,
        is_active: ba.is_active,
        created_at: ba.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  /**
   * Obtener cuenta bancaria por ID
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const bankAccount = await tenantDb.bankAccount.findUnique({
      where: { id },
      include: {
        bank: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    return bankAccount;
  }

  /**
   * Crear cuenta bancaria
   */
  async create(companyId: string, dto: CreateBankAccountDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasAccountingModule = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    if (hasAccountingModule) {
      await validatePeriodOpen(tenantDb, new Date());
    }

    // Validar tipo de cuenta
    if (!['SAVINGS', 'CHECKING', 'CASH'].includes(dto.account_type)) {
      throw new BadRequestException('Tipo de cuenta inválido');
    }

    // Si no es CASH, validar que tenga banco y número de cuenta
    if (dto.account_type !== BankAccountType.CASH) {
      if (!dto.bank_id) {
        throw new BadRequestException('El banco es requerido para cuentas de ahorro o corriente');
      }

      if (!dto.account_number?.trim()) {
        throw new BadRequestException('El número de cuenta es requerido para cuentas de ahorro o corriente');
      }

      if (!/^\d+$/.test(dto.account_number.trim())) {
        throw new BadRequestException('El número de cuenta debe contener solo dígitos');
      }

      // Verificar que el banco exista
      const bank = await tenantDb.bank.findUnique({
        where: { id: dto.bank_id },
      });

      if (!bank) {
        throw new NotFoundException('Banco no encontrado');
      }
    }

    // Si es CASH, no debe tener banco ni número de cuenta
    if (dto.account_type === BankAccountType.CASH) {
      dto.bank_id = undefined;
      dto.account_number = undefined;
    }

    // Si tiene módulo de contabilidad, la cuenta contable es requerida
    if (hasAccountingModule && !dto.account_id) {
      throw new BadRequestException('La cuenta contable es requerida');
    }

    // Validar cuenta contable si se proporciona
    if (dto.account_id) {
      const account = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.account_id },
      });

      if (!account) {
        throw new NotFoundException('Cuenta contable no encontrada');
      }

      // Validar que sea cuenta apropiada (1105 para CASH, 1110 para bancos)
      const expectedPrefix = dto.account_type === BankAccountType.CASH ? '1105' : '1110';
      if (!dto.account_id.startsWith(expectedPrefix)) {
        throw new BadRequestException(
          `La cuenta contable debe iniciar con ${expectedPrefix} para este tipo de cuenta`,
        );
      }
    }

    const initialBalance = dto.initial_balance || 0;

    // Si hay saldo inicial Y tiene módulo de contabilidad, validar cuenta contable y contrapartida
    if (initialBalance > 0 && hasAccountingModule) {
      if (!dto.account_id) {
        throw new BadRequestException('La cuenta contable es requerida cuando hay saldo inicial');
      }
      if (!dto.counterpart_account_id) {
        throw new BadRequestException('La cuenta contrapartida es requerida cuando hay saldo inicial');
      }

      // Validar que la cuenta contrapartida exista y no sea 1105 ni 1110
      const counterpartAccount = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.counterpart_account_id },
      });
      if (!counterpartAccount) {
        throw new NotFoundException('Cuenta contrapartida no encontrada');
      }
      if (dto.counterpart_account_id.startsWith('1105') || dto.counterpart_account_id.startsWith('1110')) {
        throw new BadRequestException('La cuenta contrapartida no puede ser de bancos (1110) ni caja (1105)');
      }
    }

    // Validar CC si módulo activo y hay saldo inicial (independiente de contabilidad)
    if (hasCostCentersModule && initialBalance > 0) {
      if (!dto.cost_center_id) {
        throw new BadRequestException('Se requiere centro de costos para el saldo inicial');
      }
    }

    // Crear cuenta bancaria (y saldo inicial si aplica) en una sola transacción
    const bankAccount = await tenantDb.$transaction(async (tx: any) => {
      const created = await tx.bankAccount.create({
        data: {
          account_type: dto.account_type,
          bank_id: dto.bank_id || null,
          account_number: dto.account_number || null,
          account_name: dto.account_name,
          account_id: dto.account_id || null,
          initial_balance: initialBalance,
          current_balance: 0,
          is_active: true,
        },
        include: {
          bank: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (initialBalance > 0) {
        const ccMtKey = dto.account_type === 'CASH' ? 'cash_movement' : 'bank_movement';
        const desc = `Saldo inicial ${dto.account_name}`;
        let jeId: string | undefined;

        // Crear asiento contable solo si tiene módulo de contabilidad
        if (hasAccountingModule && dto.account_id && dto.counterpart_account_id) {
          const je = await createJournalEntry(tx, {
            date: new Date(),
            description: `Saldo inicial - ${dto.account_name}`,
            type_key: 'bank_account_opening',
            items: [
              {
                account_code: dto.account_id,
                amount: initialBalance,
                type: 'DEBIT',
                description: desc,
                bank_account_id: created.id,
                cost_center_id: dto.cost_center_id,
                cost_center_movement_type_key: hasCostCentersModule && dto.cost_center_id ? ccMtKey : undefined,
              },
              {
                account_code: dto.counterpart_account_id,
                amount: initialBalance,
                type: 'CREDIT',
                description: desc,
                cost_center_id: dto.cost_center_id,
                cost_center_movement_type_key: hasCostCentersModule && dto.cost_center_id ? ccMtKey : undefined,
              },
            ],
          });
          jeId = je.id;
        }

        // Crear CC movements (independiente de contabilidad)
        if (hasCostCentersModule && dto.cost_center_id) {
          const ccType = await tx.costCenterMovementType.findUnique({
            where: { key: ccMtKey },
            select: { nature: true },
          });
          const nature = ccType?.nature || 'DEBIT';

          // Dos movimientos: DEBIT (banco) + CREDIT (contrapartida)
          const sides: Array<{ type: string }> = [{ type: 'DEBIT' }, { type: 'CREDIT' }];
          for (const side of sides) {
            const sign = side.type === nature ? 'POSITIVE' : 'NEGATIVE';
            const ccMov = await createCostCenterMovement(tx, {
              cost_center_id: dto.cost_center_id,
              movement_date: new Date(),
              type_key: ccMtKey,
              reference_type_key: jeId ? 'journal_entry' : 'bank_account_opening',
              sign,
              amount: initialBalance,
              reference_id: jeId || created.id,
              description: desc,
            });

            // Vincular al JE item si existe
            if (jeId) {
              const jeItem = await tx.journalEntryItem.findFirst({
                where: {
                  journal_entry_id: jeId,
                  type: side.type,
                  cost_center_movement_id: null,
                },
                select: { id: true },
              });
              if (jeItem) {
                await tx.journalEntryItem.update({
                  where: { id: jeItem.id },
                  data: { cost_center_movement_id: ccMov.id },
                });
              }
            }
          }
        }

        // Crear movimiento bancario siempre (actualiza current_balance)
        await createBankMovement(tx, {
          bank_account_id: created.id,
          transaction_date: new Date(),
          amount: initialBalance,
          direction: 'INCOME',
          type_key: 'bank_account_opening',
          description: `Saldo inicial - ${dto.account_name}`,
        });
      }

      return created;
    });

    return bankAccount;
  }

  /**
   * Actualizar cuenta bancaria
   */
  async update(companyId: string, id: string, dto: UpdateBankAccountDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.bankAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    // Validar cuenta contable si se proporciona
    if (dto.account_id) {
      const account = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.account_id },
      });

      if (!account) {
        throw new NotFoundException('Cuenta contable no encontrada');
      }
    }

    const updated = await tenantDb.bankAccount.update({
      where: { id },
      data: {
        account_name: dto.account_name,
        account_number: dto.account_number,
        account_id: dto.account_id,
        is_active: dto.is_active,
      },
      include: {
        bank: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return updated;
  }

  /**
   * Verificar si se puede eliminar una cuenta bancaria
   */
  async canDelete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.bankAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    const [
      journalItemsCount,
      bankMovementsCount,
      documentPaymentsCount,
      receiptLinesCount,
      reconciliationsCount,
      prepaymentsCount,
    ] = await Promise.all([
      tenantDb.journalEntryItem.count({ where: { bank_account_id: id } }),
      tenantDb.bankMovement.count({ where: { bank_account_id: id } }),
      tenantDb.documentPayment.count({ where: { bank_account_id: id } }),
      tenantDb.paymentReceiptLine.count({ where: { kind: 'BANK', ref_id: id } }),
      tenantDb.bankReconciliation.count({ where: { bank_account_id: id } }),
      tenantDb.prepayment.count({ where: { bank_account_id: id } }),
    ]);

    const usageCount = journalItemsCount + bankMovementsCount + documentPaymentsCount + receiptLinesCount + prepaymentsCount;

    if (usageCount > 0) {
      return {
        canDelete: false,
        reason: `Tiene ${usageCount} movimiento(s) asociado(s)`,
        journalItemsCount,
        bankMovementsCount,
        documentPaymentsCount,
        receiptLinesCount,
        reconciliationsCount,
        prepaymentsCount,
      };
    }

    if (reconciliationsCount > 0) {
      return {
        canDelete: false,
        reason: `Tiene ${reconciliationsCount} conciliación(es) asociada(s)`,
        journalItemsCount,
        bankMovementsCount,
        documentPaymentsCount,
        receiptLinesCount,
        reconciliationsCount,
        prepaymentsCount,
      };
    }

    return {
      canDelete: true,
      journalItemsCount: 0,
      bankMovementsCount: 0,
      documentPaymentsCount: 0,
      receiptLinesCount: 0,
      reconciliationsCount: 0,
      prepaymentsCount: 0,
    };
  }

  /**
   * Eliminar cuenta bancaria (DELETE real, no soft delete)
   */
  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const canDeleteResult = await this.canDelete(companyId, id);

    if (!canDeleteResult.canDelete) {
      throw new ConflictException(canDeleteResult.reason);
    }

    await tenantDb.bankAccount.delete({
      where: { id },
    });

    return { message: 'Cuenta bancaria eliminada exitosamente' };
  }
}
