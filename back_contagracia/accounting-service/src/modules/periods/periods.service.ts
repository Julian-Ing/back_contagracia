import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { CreatePeriodDto, UpdatePeriodDto, QueryPeriodDto, CreatePeriodActionDto, QueryPeriodActionDto, ClosePeriodDto } from './dto';
import { getNextConsecutive } from '@contagracia/shared-modules';
import { getAccountBalance, AccountBalanceResult } from '../../functions/get-account-balance';
import { getClosingBalances, ClosingBalanceItem } from '../../functions/get-closing-balances';
import { createJournalEntry, JournalEntryItemInput } from '../../functions/create-journal-entry';
import { reverseJournalEntry } from '../../functions/reverse-journal-entry';

export interface ClosingPreviewResult {
  period: {
    id: string;
    name: string;
    year: number;
    is_annual: boolean;
    start_date: Date;
    end_date: Date;
  };
  income: AccountBalanceResult;   // Clase 4 - Ingresos
  expenses: AccountBalanceResult; // Clase 5 - Gastos
  costs: AccountBalanceResult;    // Clase 6 - Costos
  net_income: number;             // Utilidad = Ingresos - Gastos - Costos
}

@Injectable()
export class PeriodsService {
  constructor(
    private readonly tenantContext: TenantContextService,
  ) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar períodos con búsqueda y paginación
   */
  async findAll(companyId: string, params: QueryPeriodDto = {}): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, year, status, is_annual, page = 1, limit = 20 } = params;

    const where: any = {};

    if (year) {
      where.year = year;
    }

    if (status) {
      // Soportar filtro múltiple: "OPEN,REOPENED"
      if (status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    }

    if (is_annual !== undefined) {
      where.is_annual = is_annual === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { consecutive: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [periods, total] = await Promise.all([
      tenantDb.accountingPeriod.findMany({
        where,
        include: {
          parent_period: { select: { id: true, name: true, consecutive: true } },
          closed_by_user: { select: { id: true, full_name: true } },
          reopened_by_user: { select: { id: true, full_name: true } },
          _count: { select: { actions: true, child_periods: true } },
        },
        orderBy: [{ year: 'desc' }, { start_date: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.accountingPeriod.count({ where }),
    ]);

    return {
      data: periods.map((p: any) => ({
        id: p.id,
        consecutive: p.consecutive,
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        year: p.year,
        is_annual: p.is_annual,
        parent_period_id: p.parent_period_id,
        parent_period_name: p.parent_period?.name || null,
        status: p.status,
        closed_at: p.closed_at,
        closed_by: p.closed_by_user?.full_name || null,
        reopened_at: p.reopened_at,
        reopened_by: p.reopened_by_user?.full_name || null,
        description: p.description,
        actions_count: p._count.actions,
        child_periods_count: p._count.child_periods,
        created_at: p.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener período por ID
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({
      where: { id },
      include: {
        closed_by_user: { select: { id: true, full_name: true } },
        reopened_by_user: { select: { id: true, full_name: true } },
        actions: {
          include: {
            created_by_user: { select: { id: true, full_name: true } },
            journal_entry: { select: { id: true, consecutive: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    return period;
  }

  /**
   * Crear período
   * Para ANUALES: valida máximo 2 activos consecutivos (2 OPEN, o 1 REOPENED + 1 OPEN, o 1 OPEN)
   */
  async create(companyId: string, dto: CreatePeriodDto, userId?: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const isAnnual = dto.is_annual ?? false;

    // Validar parent para períodos mensuales
    if (!isAnnual && dto.parent_period_id) {
      const parent = await tenantDb.accountingPeriod.findUnique({
        where: { id: dto.parent_period_id },
      });

      if (!parent) {
        throw new BadRequestException('El período anual padre no existe');
      }

      if (!parent.is_annual) {
        throw new BadRequestException('El período padre debe ser un período anual');
      }

      if (parent.status === 'CLOSED') {
        throw new BadRequestException('El período anual padre está cerrado');
      }
    }

    if (isAnnual) {
      // Validar que no exista período del mismo año
      const existingYear = await tenantDb.accountingPeriod.findFirst({
        where: { year: dto.year, is_annual: true },
      });

      if (existingYear) {
        throw new BadRequestException(
          `Ya existe el período anual ${dto.year} (${existingYear.consecutive})`,
        );
      }

      // Validar máximo 2 activos consecutivos
      const activePeriods = await tenantDb.accountingPeriod.findMany({
        where: {
          is_annual: true,
          status: { in: ['OPEN', 'REOPENED'] },
        },
        orderBy: { year: 'asc' },
      });

      if (activePeriods.length >= 2) {
        const years = activePeriods.map(p => p.year).join(', ');
        throw new BadRequestException(
          `Ya existen 2 períodos anuales activos (${years}). Cierra uno antes de crear otro.`,
        );
      }

      // Si hay 1 activo, el nuevo debe ser consecutivo (año siguiente)
      if (activePeriods.length === 1) {
        const activeYear = activePeriods[0].year;
        if (dto.year !== activeYear + 1 && dto.year !== activeYear - 1) {
          throw new BadRequestException(
            `El nuevo período debe ser consecutivo al activo (${activeYear}). Solo puedes crear ${activeYear - 1} o ${activeYear + 1}.`,
          );
        }
      }
    } else {
      // Para mensuales: validar superposición de fechas
      const existing = await tenantDb.accountingPeriod.findFirst({
        where: {
          is_annual: false,
          parent_period_id: dto.parent_period_id,
          OR: [
            {
              start_date: { lte: new Date(dto.end_date) },
              end_date: { gte: new Date(dto.start_date) },
            },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un período mensual (${existing.consecutive}) que se superpone con las fechas seleccionadas`,
        );
      }
    }

    // Crear período y acción en transacción con consecutivo atómico
    const period = await tenantDb.$transaction(async (tx: any) => {
      const consecutive = await getNextConsecutive(tx, 'accounting_period');

      const newPeriod = await tx.accountingPeriod.create({
        data: {
          consecutive,
          name: dto.name,
          start_date: new Date(dto.start_date),
          end_date: new Date(dto.end_date),
          year: dto.year,
          is_annual: isAnnual,
          parent_period_id: isAnnual ? null : dto.parent_period_id,
          description: dto.description,
        },
      });

      // Crear acción de apertura
      await tx.accountingPeriodAction.create({
        data: {
          period_id: newPeriod.id,
          action: 'OPEN',
          reason: 'Período creado',
          created_by: userId,
        },
      });

      return newPeriod;
    });

    return period;
  }

  /**
   * Actualizar período (solo si está abierto)
   */
  async update(companyId: string, id: string, dto: UpdatePeriodDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    if (period.status === 'CLOSED') {
      throw new BadRequestException('No se puede modificar un período cerrado');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);
    if (dto.year) updateData.year = dto.year;
    if (dto.is_annual !== undefined) updateData.is_annual = dto.is_annual;
    if (dto.description !== undefined) updateData.description = dto.description;

    return tenantDb.accountingPeriod.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Cerrar período contable
   * Para ANUALES: genera asientos de cierre (4,5,6) y apertura del siguiente año
   */
  async close(companyId: string, id: string, userId: string, dto: ClosePeriodDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    if (period.status === 'CLOSED') {
      throw new BadRequestException('El período ya está cerrado');
    }

    // Para anuales: no cerrar si hay períodos anuales anteriores abiertos
    if (period.is_annual) {
      const priorOpenPeriod = await tenantDb.accountingPeriod.findFirst({
        where: {
          is_annual: true,
          year: { lt: period.year },
          status: { in: ['OPEN', 'REOPENED'] },
        },
        orderBy: { year: 'asc' },
      });

      if (priorOpenPeriod) {
        throw new BadRequestException(
          `No se puede cerrar "${period.name}" mientras el período "${priorOpenPeriod.name}" (${priorOpenPeriod.year}) está abierto. Debe cerrarlo primero.`
        );
      }
    }

    // Validar que las cuentas existan
    const [closingAccount, openingAccount] = await Promise.all([
      tenantDb.chartOfAccount.findUnique({ where: { code: dto.closingAccountCode } }),
      tenantDb.chartOfAccount.findUnique({ where: { code: dto.openingAccountCode } }),
    ]);

    if (!closingAccount) {
      throw new BadRequestException(`La cuenta de cierre ${dto.closingAccountCode} no existe`);
    }
    if (!openingAccount) {
      throw new BadRequestException(`La cuenta de apertura ${dto.openingAccountCode} no existe`);
    }

    // Para períodos ANUALES: obtener saldos de cierre antes de la transacción (lectura)
    let closingBalances: { items: ClosingBalanceItem[] } = { items: [] };
    if (period.is_annual) {
      closingBalances = await getClosingBalances(tenantDb, {
        accountPrefixes: ['4', '5', '6'],
        fromDate: period.start_date,
        toDate: period.end_date,
      });
    }

    // Ejecutar todo en una sola transacción
    const updated = await tenantDb.$transaction(async (tx: any) => {
      let closingEntryId: string | null = null;
      let openingEntryId: string | null = null;
      let nextPeriod: any = null;

      if (period.is_annual) {
        // 1. Generar asiento de CIERRE (period_close) - SIN FECHA
        if (closingBalances.items.length > 0) {
          const closingItems: JournalEntryItemInput[] = [];
          let totalClosingDebit = 0;
          let totalClosingCredit = 0;

          // Invertir saldos de cuentas 4, 5, 6
          for (const item of closingBalances.items) {
            if (item.balance > 0) {
              // Saldo deudor -> crédito para cerrar
              closingItems.push({
                account_code: item.account_code,
                amount: item.balance,
                type: 'CREDIT',
                description: `Cierre ${item.account_name}`,
                third_party_id: item.third_party_id || undefined,
                bank_account_id: item.bank_account_id || undefined,
              });
              totalClosingCredit += item.balance;
            } else if (item.balance < 0) {
              // Saldo acreedor -> débito para cerrar
              closingItems.push({
                account_code: item.account_code,
                amount: Math.abs(item.balance),
                type: 'DEBIT',
                description: `Cierre ${item.account_name}`,
                third_party_id: item.third_party_id || undefined,
                bank_account_id: item.bank_account_id || undefined,
              });
              totalClosingDebit += Math.abs(item.balance);
            }
          }

          // Línea de cuadre a cuenta de cierre (utilidad del ejercicio)
          const netIncome = totalClosingCredit - totalClosingDebit;
          if (netIncome > 0) {
            // Utilidad -> débito a cuenta de cierre
            closingItems.push({
              account_code: dto.closingAccountCode,
              amount: netIncome,
              type: 'DEBIT',
              description: `Utilidad del ejercicio ${period.year}`,
            });
          } else if (netIncome < 0) {
            // Pérdida -> crédito a cuenta de cierre
            closingItems.push({
              account_code: dto.closingAccountCode,
              amount: Math.abs(netIncome),
              type: 'CREDIT',
              description: `Pérdida del ejercicio ${period.year}`,
            });
          }

          // Crear asiento de cierre SIN FECHA
          const closingEntry = await createJournalEntry(tx, {
            description: `Cierre contable ${period.name}`,
            type_key: 'period_close',
            items: closingItems,
          });
          closingEntryId = closingEntry.id;
        }

        // 2. Crear/obtener período del siguiente año
        const nextYear = period.year + 1;
        nextPeriod = await tx.accountingPeriod.findFirst({
          where: { year: nextYear, is_annual: true },
        });

        if (!nextPeriod) {
          const consecutive = await getNextConsecutive(tx, 'accounting_period');
          nextPeriod = await tx.accountingPeriod.create({
            data: {
              consecutive,
              name: `Año ${nextYear}`,
              start_date: new Date(`${nextYear}-01-01`),
              end_date: new Date(`${nextYear}-12-31`),
              year: nextYear,
              is_annual: true,
              status: 'OPEN',
            },
          });
        }

        // 3. Generar asiento de APERTURA (opening_balance) - FECHA 1 enero siguiente
        const periodActions = await tx.accountingPeriodAction.findMany({
          where: {
            period_id: id,
            action: { in: ['CLOSE', 'ADJUST'] },
            journal_entry_id: { not: null },
          },
          select: { journal_entry_id: true },
        });
        const nullDateEntryIds = periodActions
          .map(a => a.journal_entry_id)
          .filter((entryId): entryId is string => !!entryId);

        // Agregar el asiento de cierre recién creado
        if (closingEntryId) {
          nullDateEntryIds.push(closingEntryId);
        }

        const openingBalances = await getClosingBalances(tx, {
          accountPrefixes: ['1', '2', '3', '7', '8', '9'],
          fromDate: period.start_date,
          toDate: period.end_date,
          includeNullDateEntryIds: nullDateEntryIds,
        });

        if (openingBalances.items.length > 0) {
          const openingItems: JournalEntryItemInput[] = [];

          // Separar cuenta de cierre para traslado especial
          const closingAccountBalance = openingBalances.items.find(
            i => i.account_code === dto.closingAccountCode
          );

          // Mantener saldos como están para apertura (excepto cuenta de cierre)
          for (const item of openingBalances.items) {
            // Excluir cuenta de cierre, se manejará aparte con traslado
            if (item.account_code === dto.closingAccountCode) continue;

            if (item.balance > 0) {
              // Saldo deudor -> débito
              openingItems.push({
                account_code: item.account_code,
                amount: item.balance,
                type: 'DEBIT',
                description: `Saldo inicial ${item.account_name}`,
                third_party_id: item.third_party_id || undefined,
                bank_account_id: item.bank_account_id || undefined,
              });
            } else if (item.balance < 0) {
              // Saldo acreedor -> crédito
              openingItems.push({
                account_code: item.account_code,
                amount: Math.abs(item.balance),
                type: 'CREDIT',
                description: `Saldo inicial ${item.account_name}`,
                third_party_id: item.third_party_id || undefined,
                bank_account_id: item.bank_account_id || undefined,
              });
            }
          }

          // Trasladar utilidad: closingAccount (360505) -> openingAccount (37050501)
          if (closingAccountBalance && closingAccountBalance.balance !== 0) {
            // La utilidad va directo a resultados anteriores (no se mantiene en 360505)
            if (closingAccountBalance.balance < 0) {
              // Saldo acreedor (utilidad) -> crédito en resultados anteriores
              openingItems.push({
                account_code: dto.openingAccountCode,
                amount: Math.abs(closingAccountBalance.balance),
                type: 'CREDIT',
                description: `Utilidad ejercicio ${period.year}`,
              });
            } else {
              // Saldo deudor (pérdida) -> débito en resultados anteriores
              openingItems.push({
                account_code: dto.openingAccountCode,
                amount: closingAccountBalance.balance,
                type: 'DEBIT',
                description: `Pérdida ejercicio ${period.year}`,
              });
            }
          }

          // Crear asiento de apertura con fecha 1 de enero del siguiente año
          const openingEntry = await createJournalEntry(tx, {
            date: new Date(nextYear, 0, 1),
            description: `Apertura contable ${nextYear}`,
            type_key: 'opening_balance',
            items: openingItems,
          });
          openingEntryId = openingEntry.id;
        }
      }

      // Actualizar estado del período
      const updatedPeriod = await tx.accountingPeriod.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closed_at: new Date(),
          closed_by: userId,
        },
      });

      // Acción CLOSE con journal_entry_id
      await tx.accountingPeriodAction.create({
        data: {
          period_id: id,
          action: 'CLOSE',
          reason: dto.reason,
          created_by: userId,
          journal_entry_id: closingEntryId,
        },
      });

      // Acción OPEN en el siguiente período (solo para anuales)
      if (period.is_annual && nextPeriod) {
        await tx.accountingPeriodAction.create({
          data: {
            period_id: nextPeriod.id,
            action: 'OPEN',
            reason: `Apertura por cierre del período ${period.name}`,
            created_by: userId,
            journal_entry_id: openingEntryId,
          },
        });
      }

      return updatedPeriod;
    });

    return updated;
  }

  /**
   * Reabrir período
   * Para ANUALES: valida máximo 2 activos consecutivos, genera reversiones de cierre y apertura
   */
  async reopen(companyId: string, id: string, userId: string, reason?: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    if (period.status !== 'CLOSED') {
      throw new BadRequestException('Solo se pueden reabrir períodos cerrados');
    }

    // Para períodos ANUALES: validar máximo 2 activos consecutivos
    if (period.is_annual) {
      // Contar períodos anuales activos (OPEN o REOPENED)
      const activePeriods = await tenantDb.accountingPeriod.findMany({
        where: {
          is_annual: true,
          status: { in: ['OPEN', 'REOPENED'] },
        },
        orderBy: { year: 'asc' },
      });

      // Si ya hay 2 activos, no se puede reabrir otro
      if (activePeriods.length >= 2) {
        throw new BadRequestException(
          'Ya existen 2 períodos anuales activos. Cierra uno antes de reabrir otro.',
        );
      }

      // Si hay 1 activo, verificar que sean consecutivos
      if (activePeriods.length === 1) {
        const activeYear = activePeriods[0].year;
        // El período a reabrir debe ser el año anterior al activo
        if (period.year !== activeYear - 1) {
          throw new BadRequestException(
            `Solo puedes reabrir el período ${activeYear - 1} (anterior al activo).`,
          );
        }
      }
    }

    // Para períodos ANUALES: obtener datos de lectura antes de la transacción
    let closeActionEntryId: string | null = null;
    let openActionEntryId: string | null = null;
    let nextPeriod: any = null;
    let openingEntryDate: Date | null = null;

    if (period.is_annual) {
      // Buscar la acción CLOSE más reciente con journal_entry_id
      const closeAction = await tenantDb.accountingPeriodAction.findFirst({
        where: {
          period_id: id,
          action: 'CLOSE',
          journal_entry_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
        select: { journal_entry_id: true },
      });
      closeActionEntryId = closeAction?.journal_entry_id || null;

      // Buscar el período siguiente y su acción OPEN con journal_entry_id
      const nextYear = period.year + 1;
      nextPeriod = await tenantDb.accountingPeriod.findFirst({
        where: { year: nextYear, is_annual: true },
      });

      if (nextPeriod) {
        const openAction = await tenantDb.accountingPeriodAction.findFirst({
          where: {
            period_id: nextPeriod.id,
            action: 'OPEN',
            journal_entry_id: { not: null },
          },
          orderBy: { created_at: 'desc' },
          select: { journal_entry_id: true },
        });
        openActionEntryId = openAction?.journal_entry_id || null;

        // Obtener fecha del asiento de apertura para la reversión
        if (openActionEntryId) {
          const openingEntry = await tenantDb.journalEntry.findUnique({
            where: { id: openActionEntryId },
            select: { date: true },
          });
          openingEntryDate = openingEntry?.date || new Date(nextYear, 0, 1);
        }
      }
    }

    // Ejecutar todo en una sola transacción
    const updated = await tenantDb.$transaction(async (tx: any) => {
      let closingReversalId: string | null = null;
      let openingReversalId: string | null = null;

      if (period.is_annual) {
        // Generar reversión del asiento de CIERRE (period_close) - sin fecha
        if (closeActionEntryId) {
          const closingReversal = await reverseJournalEntry(tx, {
            journal_entry_id: closeActionEntryId,
            reversal_date: null,
          });
          closingReversalId = closingReversal.id;
        }

        // Generar reversión del asiento de APERTURA (opening_balance)
        if (openActionEntryId) {
          const openingReversal = await reverseJournalEntry(tx, {
            journal_entry_id: openActionEntryId,
            reversal_date: openingEntryDate,
          });
          openingReversalId = openingReversal.id;
        }

        // Crear acción ADJUST en el siguiente período con la reversión de apertura
        if (nextPeriod) {
          await tx.accountingPeriodAction.create({
            data: {
              period_id: nextPeriod.id,
              action: 'ADJUST',
              reason: `Ajuste de apertura por reapertura del período ${period.name}`,
              created_by: userId,
              journal_entry_id: openingReversalId,
            },
          });
        }
      }

      // Reabrir el período
      const updatedPeriod = await tx.accountingPeriod.update({
        where: { id },
        data: {
          status: 'REOPENED',
          reopened_at: new Date(),
          reopened_by: userId,
        },
      });

      // Acción REOPEN al período que se reabre (con reversión de cierre)
      await tx.accountingPeriodAction.create({
        data: {
          period_id: id,
          action: 'REOPEN',
          reason: reason || 'Reapertura de período',
          created_by: userId,
          journal_entry_id: closingReversalId,
        },
      });

      return updatedPeriod;
    });

    return updated;
  }

  // ============ ACCIONES ============

  /**
   * Listar acciones de un período
   */
  async findActions(companyId: string, periodId: string, params: QueryPeriodActionDto = {}): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, action, from_date, to_date, page = 1, limit = 20 } = params;

    const where: any = { period_id: periodId };

    if (action) {
      where.action = action;
    }

    if (search) {
      where.reason = { contains: search, mode: 'insensitive' };
    }

    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) {
        where.created_at.gte = new Date(from_date);
      }
      if (to_date) {
        // Sumar un día para incluir todo el día de to_date
        const endDate = new Date(to_date);
        endDate.setDate(endDate.getDate() + 1);
        where.created_at.lt = endDate;
      }
    }

    const [actions, total] = await Promise.all([
      tenantDb.accountingPeriodAction.findMany({
        where,
        include: {
          created_by_user: { select: { id: true, full_name: true } },
          journal_entry: { select: { id: true, consecutive: true, is_reversed: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.accountingPeriodAction.count({ where }),
    ]);

    return {
      data: actions.map((a: any) => ({
        id: a.id,
        action: a.action,
        reason: a.reason,
        is_manual: a.is_manual,
        journal_entry_id: a.journal_entry_id,
        journal_entry_consecutive: a.journal_entry?.consecutive,
        journal_entry_is_reversed: a.journal_entry?.is_reversed ?? null,
        created_by: a.created_by_user?.full_name || null,
        created_at: a.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Crear acción manual
   */
  async createAction(
    companyId: string,
    periodId: string,
    userId: string,
    dto: CreatePeriodActionDto,
  ): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    return tenantDb.accountingPeriodAction.create({
      data: {
        period_id: periodId,
        action: dto.action,
        reason: dto.reason,
        created_by: userId,
      },
    });
  }

  // ============ CIERRE ============

  /**
   * Obtener preview de cierre para un período
   * Calcula saldos de cuentas 4 (Ingresos), 5 (Gastos), 6 (Costos)
   * y la utilidad neta
   */
  async getClosingPreview(companyId: string, periodId: string): Promise<ClosingPreviewResult> {
    const tenantDb = await this.getTenantDb(companyId);

    const period = await tenantDb.accountingPeriod.findUnique({
      where: { id: periodId },
      select: {
        id: true,
        name: true,
        year: true,
        is_annual: true,
        start_date: true,
        end_date: true,
        status: true,
      },
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    // Obtener saldos de clases 4, 5, 6 en paralelo
    const [income, expenses, costs] = await Promise.all([
      getAccountBalance(tenantDb, {
        account_code: '4',
        from_date: period.start_date,
        to_date: period.end_date,
        with_children: true,
      }),
      getAccountBalance(tenantDb, {
        account_code: '5',
        from_date: period.start_date,
        to_date: period.end_date,
        with_children: true,
      }),
      getAccountBalance(tenantDb, {
        account_code: '6',
        from_date: period.start_date,
        to_date: period.end_date,
        with_children: true,
      }),
    ]);

    // Utilidad = Ingresos - Gastos - Costos
    // income.balance es positivo (crédito), expenses y costs son positivos (débito)
    const net_income = income.balance - expenses.balance - costs.balance;

    return {
      period: {
        id: period.id,
        name: period.name,
        year: period.year,
        is_annual: period.is_annual,
        start_date: period.start_date,
        end_date: period.end_date,
      },
      income,
      expenses,
      costs,
      net_income,
    };
  }
}
