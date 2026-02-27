import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { TenantContextService } from '@contagracia/shared-modules';
import { createJournalEntry, CreateJournalEntryParams, CreateJournalEntryResult, JournalEntryItemInput } from '../../functions/create-journal-entry';
import { createCostCenterMovement, getNextConsecutive } from '@contagracia/shared-modules';
import { reverseJournalEntry } from '../../functions/reverse-journal-entry';
import { createBankMovement } from '../../functions/create-bank-movement';
import { createArAp } from '../../functions/create-ar-ap';
import { createPayment } from '../../functions/create-payment';
import { createPaymentReceipt } from '../../functions/create-payment-receipt';
import { createPrepaymentMovement } from '../../functions/create-prepayment-movement';
import { voidPaymentReceipt } from '../../functions/void-payment-receipt';
import { validatePeriodOpen } from '../../functions/validate-period-open';

export interface JournalEntriesQueryParams {
  search?: string;
  type_key?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class JournalEntriesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar asientos contables con búsqueda y paginación
   * - Las reversiones no aparecen como filas separadas, solo como hijos de su original
   * - Si un filtro coincide con una reversión, se trae su asiento original
   */
  async findAll(companyId: string, params: JournalEntriesQueryParams = {}): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, type_key, from_date, to_date, page = 1, limit = 50 } = params;

    // Construir condiciones de filtro (aplican tanto a originales como reversiones)
    const filterConditions: any = {
      NOT: { date: null },
    };

    if (from_date || to_date) {
      filterConditions.date = {};
      if (from_date) filterConditions.date.gte = new Date(from_date);
      if (to_date) filterConditions.date.lte = new Date(to_date);
    }

    if (search) {
      filterConditions.OR = [
        { consecutive: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Si filtran por tipo "reversal", buscar asientos que tienen reversión
    // Si filtran por otro tipo, buscar ese tipo
    let typeFilter: any = {};
    if (type_key) {
      if (type_key === 'reversal') {
        typeFilter = { is_reversed: true };
      } else {
        typeFilter = { type_key };
      }
    }

    // 1. Buscar asientos NO-reversión que coinciden con filtros
    const directWhere: any = {
      ...filterConditions,
      ...typeFilter,
      type_key: type_key === 'reversal' ? undefined : { not: 'reversal' },
    };
    if (type_key === 'reversal') {
      delete directWhere.type_key;
    }

    // 2. Buscar IDs de originales cuya REVERSIÓN coincide con los filtros
    const reversionsMatchingFilters = await tenantDb.journalEntry.findMany({
      where: {
        ...filterConditions,
        type_key: 'reversal',
        reference_id: { not: null },
      },
      select: { reference_id: true },
    });
    const originalIdsFromReversions = reversionsMatchingFilters
      .map((r) => r.reference_id)
      .filter((id): id is string => id !== null);

    // Combinar: originales directos + originales cuya reversión coincide
    const combinedWhere: any = {
      OR: [
        directWhere,
        ...(originalIdsFromReversions.length > 0 ? [{ id: { in: originalIdsFromReversions } }] : []),
      ],
      type_key: { not: 'reversal' }, // Nunca traer reversiones como fila principal
      NOT: { date: null },
    };

    const [entries, total] = await Promise.all([
      tenantDb.journalEntry.findMany({
        where: combinedWhere,
        include: {
          type: true,
          items: {
            include: {
              account: { select: { code: true, name: true } },
              third_party: { select: { id: true, name: true, identification_number: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.journalEntry.count({ where: combinedWhere }),
    ]);

    // Buscar asientos de reversión para los que tienen is_reversed = true
    const reversedIds = entries.filter((e) => e.is_reversed).map((e) => e.id);
    const reversalEntries =
      reversedIds.length > 0
        ? await tenantDb.journalEntry.findMany({
            where: {
              reference_id: { in: reversedIds },
              type_key: 'reversal',
            },
            include: {
              type: true,
              items: true,
            },
          })
        : [];

    // Crear mapa de reversiones con todos los datos
    const reversalMap = new Map<string, any>();
    for (const rev of reversalEntries) {
      if (rev.reference_id) {
        reversalMap.set(rev.reference_id, {
          id: rev.id,
          consecutive: rev.consecutive,
          date: rev.date,
          description: rev.description,
          type_key: rev.type_key,
          type_description: rev.type.description,
          type_color: rev.type.color,
          total_debit: rev.items
            .filter((i: any) => i.type === 'DEBIT')
            .reduce((sum: number, i: any) => sum + Number(i.amount), 0),
          total_credit: rev.items
            .filter((i: any) => i.type === 'CREDIT')
            .reduce((sum: number, i: any) => sum + Number(i.amount), 0),
        });
      }
    }

    return {
      data: entries.map((entry) => ({
        id: entry.id,
        consecutive: entry.consecutive,
        date: entry.date,
        description: entry.description,
        type_key: entry.type_key,
        type_description: entry.type.description,
        type_color: entry.type.color,
        is_reversed: entry.is_reversed,
        reversal_entry: entry.is_reversed ? reversalMap.get(entry.id) || null : null,
        items: entry.items.map((item) => ({
          id: item.id,
          account_code: item.account_code,
          account_name: item.account.name,
          type: item.type,
          amount: item.amount,
          description: item.description,
          third_party_id: item.third_party_id,
          third_party_name: item.third_party?.name,
        })),
        total_debit: entry.items
          .filter((i) => i.type === 'DEBIT')
          .reduce((sum, i) => sum + Number(i.amount), 0),
        total_credit: entry.items
          .filter((i) => i.type === 'CREDIT')
          .reduce((sum, i) => sum + Number(i.amount), 0),
        created_at: entry.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  /**
   * Obtener asiento contable por ID
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const entry = await tenantDb.journalEntry.findUnique({
      where: { id },
      include: {
        type: true,
        items: {
          include: {
            account: { select: { code: true, name: true } },
            third_party: { select: { id: true, name: true, identification_number: true } },
            bank_account: { select: { id: true, account_name: true } },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Asiento contable no encontrado');
    }

    // Si está reversado, buscar el asiento de reversión
    let reversal_entry = null;
    if (entry.is_reversed) {
      const reversal = await tenantDb.journalEntry.findFirst({
        where: {
          reference_id: entry.id,
          type_key: 'reversal',
        },
        select: { id: true, consecutive: true },
      });
      if (reversal) {
        reversal_entry = { id: reversal.id, consecutive: reversal.consecutive };
      }
    }

    // Si es una reversión, buscar el asiento original
    let original_entry = null;
    if (entry.type_key === 'reversal' && entry.reference_id) {
      const original = await tenantDb.journalEntry.findUnique({
        where: { id: entry.reference_id },
        select: { id: true, consecutive: true },
      });
      if (original) {
        original_entry = { id: original.id, consecutive: original.consecutive };
      }
    }

    return {
      ...entry,
      reversal_entry,
      original_entry,
    };
  }

  /**
   * Crear asiento contable usando la función centralizada
   * Luego crea movimientos bancarios para cada item con bank_account_id
   * Luego crea CXC/CXP para items con reference_type CXC_CREATED/CXP_CREATED
   */
  async create(companyId: string, dto: Omit<CreateJournalEntryParams, 'date'> & { date: string; due_date?: string }): Promise<CreateJournalEntryResult> {
    const date = new Date(dto.date);
    const dueDate = dto.due_date ? new Date(dto.due_date) : undefined;
    const tenantDb = await this.getTenantDb(companyId);

    // 1. Validar período contable PRIMERO
    await validatePeriodOpen(tenantDb, date);

    // 2. Validar líneas con ref_type != NORMAL
    for (const item of dto.items) {
      if (item.reference_type && item.reference_type !== 'NORMAL') {
        if (!item.third_party_id) {
          throw new BadRequestException(`Las líneas con tipo "${item.reference_type}" requieren un tercero`);
        }
        if (item.account_code.startsWith('1105') || item.account_code.startsWith('1110')) {
          throw new BadRequestException(`Las cuentas de Banco/Caja (1105*, 1110*) solo pueden usarse en líneas de tipo Normal`);
        }
      }
    }

    // 3. Validar CXC/CXP: due_date requerida y >= date
    const arApItems = dto.items.filter(
      (i) => i.reference_type === 'CXC_CREATED' || i.reference_type === 'CXP_CREATED',
    );
    if (arApItems.length > 0) {
      if (!dueDate) {
        throw new BadRequestException('La fecha de vencimiento es requerida cuando hay líneas de crear CXC/CXP');
      }
      if (dueDate < date) {
        throw new BadRequestException('La fecha de vencimiento no puede ser menor a la fecha de emisión');
      }
    }

    // 3b. Validar CXC_PAID / CXP_PAID (existencia, estado, tercero — el saldo se valida en create-payment con FOR UPDATE)
    const paidItems = dto.items.filter(
      (i) => i.reference_type === 'CXC_PAID' || i.reference_type === 'CXP_PAID',
    );
    for (const item of paidItems) {
      if (item.pair_id) continue; // Se resuelve en la transacción vía pair_id
      if (!item.reference_id) {
        throw new BadRequestException(`Las líneas de tipo "${item.reference_type}" requieren seleccionar un documento`);
      }
      const arAp = await tenantDb.arAp.findUnique({ where: { id: item.reference_id } });
      if (!arAp) throw new NotFoundException(`Documento CxC/CxP no encontrado (${item.reference_id})`);
      if (arAp.status === 'VOIDED' || arAp.status === 'PAID') {
        throw new BadRequestException('El documento seleccionado ya está pagado o anulado');
      }
      if (arAp.third_party_id !== item.third_party_id) {
        throw new BadRequestException('El tercero de la línea no coincide con el del documento');
      }
    }

    // 3c. Validar PREP_USED (existencia, estado, tercero — el saldo se valida en create-prepayment-movement con FOR UPDATE)
    const prepItems = dto.items.filter((i) => i.reference_type === 'PREP_USED');
    for (const item of prepItems) {
      if (item.pair_id) continue; // Se resuelve en la transacción vía pair_id
      if (!item.reference_id) {
        throw new BadRequestException('Las líneas de tipo "PREP_USED" requieren seleccionar un anticipo');
      }
      const prep = await tenantDb.prepayment.findUnique({ where: { id: item.reference_id } });
      if (!prep) throw new NotFoundException(`Anticipo no encontrado (${item.reference_id})`);
      if (prep.status !== 'ACTIVE') {
        throw new BadRequestException(`El anticipo seleccionado no está activo (estado: ${prep.status})`);
      }
      if (prep.third_party_id !== item.third_party_id) {
        throw new BadRequestException('El tercero de la línea no coincide con el del anticipo');
      }
    }

    // Validar centros de costos si la compañía tiene el módulo
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');
    if (hasCostCentersModule) {
      for (const item of dto.items) {
        if (!item.cost_center_id) {
          throw new BadRequestException(`Todas las líneas requieren centro de costos (cuenta: ${item.account_code})`);
        }
        if (!item.cost_center_movement_type_key) {
          throw new BadRequestException(`Todas las líneas requieren tipo de movimiento de CC (cuenta: ${item.account_code})`);
        }
      }
      // Validar que los CC existan y estén activos
      const ccIds = [...new Set(dto.items.map(i => i.cost_center_id).filter((id): id is string => !!id))];
      const costCenters = await tenantDb.costCenter.findMany({
        where: { id: { in: ccIds } },
        select: { id: true, is_active: true, name: true },
      });
      for (const ccId of ccIds) {
        const cc = costCenters.find((c: any) => c.id === ccId);
        if (!cc) throw new BadRequestException(`Centro de costos no encontrado (${ccId})`);
        if (!cc.is_active) throw new BadRequestException(`Centro de costos "${cc.name}" está inactivo`);
      }
      // Validar que los tipos de movimiento existan y cargar nature
      const typeKeys = [...new Set(dto.items.map(i => i.cost_center_movement_type_key).filter((k): k is string => !!k))];
      const types = await tenantDb.costCenterMovementType.findMany({
        where: { key: { in: typeKeys } },
        select: { key: true, nature: true },
      });
      const foundKeys = types.map((t: any) => t.key);
      const missingKeys = typeKeys.filter(k => !foundKeys.includes(k));
      if (missingKeys.length > 0) {
        throw new BadRequestException(`Tipos de movimiento de CC no encontrados: ${missingKeys.join(', ')}`);
      }
      var ccMovementTypeNatureMap = new Map<string, string>();
      types.forEach((t: any) => ccMovementTypeNatureMap.set(t.key, t.nature));
    }

    // 3d. Validar PREP_CREATED_* (tipo de línea correcto)
    const prepCreatedItems = dto.items.filter(
      (i) => i.reference_type && (i.reference_type as string).startsWith('PREP_CREATED_'),
    );
    for (const item of prepCreatedItems) {
      if (!item.third_party_id) {
        throw new BadRequestException('Las líneas de crear anticipo requieren un tercero');
      }
      const allowedType = item.reference_type === 'PREP_CREATED_CLIENT' ? 'CREDIT' : 'DEBIT';
      if (item.type !== allowedType) {
        throw new BadRequestException(
          `"${item.reference_type}" solo aplica en líneas tipo ${allowedType}`,
        );
      }
    }

    // 3e. Validar pair_id groups (vinculación crear↔consumir en mismo asiento)
    const CREATOR_TYPES = ['CXC_CREATED', 'CXP_CREATED', 'PREP_CREATED_CLIENT', 'PREP_CREATED_SUPPLIER', 'PREP_CREATED_EMPLOYEE'];
    const CONSUMER_TYPES = ['CXC_PAID', 'CXP_PAID', 'PREP_USED'];

    const pairGroups = new Map<string, typeof dto.items>();
    for (const item of dto.items) {
      if (item.pair_id) {
        if (!pairGroups.has(item.pair_id)) pairGroups.set(item.pair_id, []);
        pairGroups.get(item.pair_id)!.push(item);
      }
    }

    for (const [pairId, items] of pairGroups) {
      const creators = items.filter((i) => CREATOR_TYPES.includes(i.reference_type as string));
      const consumers = items.filter((i) => CONSUMER_TYPES.includes(i.reference_type as string));

      if (consumers.length > 0 && creators.length === 0) {
        throw new BadRequestException(`pair_id "${pairId}": consumidor sin línea creadora`);
      }
      if (creators.length > 1) {
        throw new BadRequestException(`pair_id "${pairId}" tiene múltiples líneas creadoras`);
      }
      if (creators.length === 1 && consumers.length === 0) continue;

      const creator = creators[0];
      const consumerTotal = consumers.reduce((sum, c) => sum + c.amount, 0);
      if (consumerTotal > creator.amount + 0.0001) {
        throw new BadRequestException(`pair_id "${pairId}": total consumido excede el monto creado`);
      }

      if (creator.reference_type === 'CXC_CREATED' && !consumers.every((c) => c.reference_type === 'CXC_PAID')) {
        throw new BadRequestException('CXC_CREATED solo puede vincularse con CXC_PAID');
      }
      if (creator.reference_type === 'CXP_CREATED' && !consumers.every((c) => c.reference_type === 'CXP_PAID')) {
        throw new BadRequestException('CXP_CREATED solo puede vincularse con CXP_PAID');
      }
      if ((creator.reference_type as string)?.startsWith('PREP_CREATED_') && !consumers.every((c) => c.reference_type === 'PREP_USED')) {
        throw new BadRequestException('PREP_CREATED solo puede vincularse con PREP_USED');
      }

      for (const consumer of consumers) {
        if (consumer.third_party_id !== creator.third_party_id) {
          throw new BadRequestException(`pair_id "${pairId}": tercero de la línea consumidora no coincide con la creadora`);
        }
      }
    }

    // Todo en UNA transacción
    return tenantDb.$transaction(async (tx: any) => {
      // 4. Crear ArAp PRIMERO e inyectar reference_id en los items
      const pairIdMap = new Map<string, string>(); // pair_id → created entity ID
      const createdArApIds: string[] = [];
      for (const item of arApItems) {
        const arAp = await createArAp(tx, {
          third_party_id: item.third_party_id!,
          type: item.reference_type === 'CXC_CREATED' ? 'RECEIVABLE' : 'PAYABLE',
          source_key: 'manual',
          source_id: '',
          date,
          due_date: dueDate,
          amount: item.amount,
          description: item.description || dto.description || undefined,
          account_code: item.account_code,
        });
        item.reference_id = arAp.id;
        createdArApIds.push(arAp.id);
        if (item.pair_id) pairIdMap.set(item.pair_id, arAp.id);
      }

      // 4a. Crear Prepayments (PREP_CREATED_*)
      const createdPrepaymentIds: string[] = [];
      for (const item of prepCreatedItems) {
        const prepType = item.reference_type === 'PREP_CREATED_CLIENT' ? 'CLIENT'
          : item.reference_type === 'PREP_CREATED_SUPPLIER' ? 'SUPPLIER' : 'EMPLOYEE';

        const consecutive = await getNextConsecutive(tx, 'prepayment');
        const prepayment = await tx.prepayment.create({
          data: {
            third_party_id: item.third_party_id!,
            prepayment_type: prepType,
            consecutive,
            prepayment_date: date,
            original_amount: item.amount,
            balance: item.amount,
            account_code: item.account_code,
            status: 'ACTIVE',
            notes: item.description || dto.description || null,
          },
        });
        item.reference_id = prepayment.id;
        createdPrepaymentIds.push(prepayment.id);
        if (item.pair_id) pairIdMap.set(item.pair_id, prepayment.id);
      }

      // 4b. Resolver pair_id → reference_id en consumidores
      for (const item of dto.items) {
        if (item.pair_id && CONSUMER_TYPES.includes(item.reference_type as string)) {
          const entityId = pairIdMap.get(item.pair_id);
          if (!entityId) throw new BadRequestException(`pair_id "${item.pair_id}" no resuelto`);
          item.reference_id = entityId;
        }
      }

      // 4b. Pre-computar redondeo para que el JE se cree con montos reales
      const displayDecimalsSetting = await tx.companySetting.findFirst({
        where: { category: 'general', key: 'display_decimals' },
      });
      const displayDecimals = displayDecimalsSetting ? parseInt(displayDecimalsSetting.value, 10) : 2;

      const roundingDiffs: Array<{ diff: number; isAsset: boolean }> = [];

      for (const item of paidItems) {
        const [locked] = await tx.$queryRaw`
          SELECT balance, type FROM ar_ap WHERE id = ${item.reference_id} FOR UPDATE
        `;
        if (!locked) continue;
        const currentBalance = new Decimal(locked.balance.toString());
        const userAmount = new Decimal(item.amount);
        if (!userAmount.equals(currentBalance)) {
          const roundedBalance = new Decimal(currentBalance.toFixed(displayDecimals));
          if (userAmount.equals(roundedBalance)) {
            item.amount = currentBalance.toNumber();
            roundingDiffs.push({
              diff: userAmount.minus(currentBalance).toNumber(),
              isAsset: locked.type === 'RECEIVABLE',
            });
          }
        }
      }

      for (const item of prepItems) {
        const [locked] = await tx.$queryRaw`
          SELECT balance, prepayment_type FROM prepayments WHERE id = ${item.reference_id} FOR UPDATE
        `;
        if (!locked) continue;
        const currentBalance = new Decimal(locked.balance.toString());
        const userAmount = new Decimal(item.amount);
        if (!userAmount.equals(currentBalance)) {
          const roundedBalance = new Decimal(currentBalance.toFixed(displayDecimals));
          if (userAmount.equals(roundedBalance)) {
            item.amount = currentBalance.toNumber();
            roundingDiffs.push({
              diff: userAmount.minus(currentBalance).toNumber(),
              isAsset: locked.prepayment_type !== 'CLIENT',
            });
          }
        }
      }

      // Agregar líneas de ajuste por redondeo al asiento
      if (roundingDiffs.length > 0) {
        let totalRoundingIncome = new Decimal(0);
        let totalRoundingExpense = new Decimal(0);

        for (const { diff, isAsset } of roundingDiffs) {
          const d = new Decimal(diff);
          if ((isAsset && d.gt(0)) || (!isAsset && d.lt(0))) {
            totalRoundingIncome = totalRoundingIncome.plus(d.abs());
          } else {
            totalRoundingExpense = totalRoundingExpense.plus(d.abs());
          }
        }

        if (!totalRoundingIncome.isZero()) {
          const incomeConfig = await tx.accountingConfig.findUnique({ where: { key: 'finance_rounding_income' } });
          if (!incomeConfig?.account_code) {
            throw new BadRequestException('No se encontró la configuración contable "finance_rounding_income" para ajuste por redondeo');
          }
          dto.items.push({
            account_code: incomeConfig.account_code,
            amount: totalRoundingIncome.toNumber(),
            type: 'CREDIT' as any,
            description: 'Ajuste por redondeo en decimales',
            reference_type: 'NORMAL' as any,
          });
        }
        if (!totalRoundingExpense.isZero()) {
          const expenseConfig = await tx.accountingConfig.findUnique({ where: { key: 'finance_rounding_expense' } });
          if (!expenseConfig?.account_code) {
            throw new BadRequestException('No se encontró la configuración contable "finance_rounding_expense" para ajuste por redondeo');
          }
          dto.items.push({
            account_code: expenseConfig.account_code,
            amount: totalRoundingExpense.toNumber(),
            type: 'DEBIT' as any,
            description: 'Ajuste por redondeo en decimales',
            reference_type: 'NORMAL' as any,
          });
        }
      }

      // 5. Crear asiento contable (items ya tienen reference_id correcto + montos reales)
      const result = await createJournalEntry(tx, {
        ...dto,
        date,
      });

      // 6. Actualizar ArAp con journal_entry_id y source del asiento
      if (createdArApIds.length > 0) {
        await tx.arAp.updateMany({
          where: { id: { in: createdArApIds } },
          data: { journal_entry_id: result.id, source_id: result.id, source_number: result.consecutive },
        });
      }

      // 6b. Actualizar Prepayments con journal_entry_id
      if (createdPrepaymentIds.length > 0) {
        await tx.prepayment.updateMany({
          where: { id: { in: createdPrepaymentIds } },
          data: { journal_entry_id: result.id },
        });
      }

      // 7. Crear movimientos bancarios
      await this.createBankMovementsForItems(tx, dto.items, date, dto.type_key, dto.description, result);

      // 7b. Crear movimientos de centro de costos
      if (hasCostCentersModule) {
        const jeItems = await tx.journalEntryItem.findMany({
          where: { journal_entry_id: result.id },
          select: { id: true, account_code: true, type: true, amount: true, reference_type: true, reference_id: true, third_party_id: true, bank_account_id: true },
        });
        const consumedJeItemIds = new Set<string>();

        for (const item of dto.items) {
          if (!item.cost_center_id || !item.cost_center_movement_type_key) continue;

          const typeNature = ccMovementTypeNatureMap.get(item.cost_center_movement_type_key!);
          const sign = item.type === typeNature ? 'POSITIVE' : 'NEGATIVE';

          const ccMovement = await createCostCenterMovement(tx, {
            cost_center_id: item.cost_center_id,
            movement_date: date,
            type_key: item.cost_center_movement_type_key,
            reference_type_key: 'journal_entry',
            sign,
            amount: item.amount,
            reference_id: result.id,
            description: item.description || dto.description || undefined,
          });

          // Vincular el JE item con el movimiento de CC (composite key match con consumo)
          const jeItem = jeItems.find(
            (j: any) => !consumedJeItemIds.has(j.id)
              && j.account_code === item.account_code && j.type === item.type
              && new Decimal(j.amount).equals(new Decimal(item.amount))
              && (j.reference_type || 'NORMAL') === (item.reference_type || 'NORMAL')
              && (j.reference_id || null) === (item.reference_id || null)
              && (j.third_party_id || null) === (item.third_party_id || null)
              && (j.bank_account_id || null) === (item.bank_account_id || null),
          );

          if (jeItem) {
            consumedJeItemIds.add(jeItem.id);
            await tx.journalEntryItem.update({
              where: { id: jeItem.id },
              data: { cost_center_movement_id: ccMovement.id },
            });
          }
        }
      }

      // 8. Si hay líneas no-NORMAL → crear PaymentReceipt con TODAS las líneas + procesar pagos/anticipos
      const nonNormalItems = dto.items.filter(
        (i) => i.reference_type && i.reference_type !== 'NORMAL',
      );
      if (nonNormalItems.length > 0) {
        // 8a. Obtener los JournalEntryItems creados para mapear sus IDs
        const jeItems = await tx.journalEntryItem.findMany({
          where: { journal_entry_id: result.id },
          select: { id: true, account_code: true, type: true, amount: true, reference_type: true, reference_id: true },
        });

        // 8b. Calcular amount del receipt (suma de líneas DOC: CXC_PAID + CXP_PAID)
        const receiptAmount = paidItems.reduce((sum, i) => sum + i.amount, 0);

        // 8c. Construir líneas del PaymentReceipt (TODAS las líneas para que cuadre y sea reversable)
        const receiptLines = dto.items.map((item) => {
          const jeItem = jeItems.find(
            (j: any) => j.account_code === item.account_code && j.type === item.type
              && (j.reference_type || 'NORMAL') === (item.reference_type || 'NORMAL')
              && (j.reference_id || null) === (item.reference_id || null),
          );

          let kind: string;
          if (item.reference_type === 'CXC_PAID' || item.reference_type === 'CXP_PAID') kind = 'DOC';
          else if (item.reference_type === 'PREP_USED') kind = 'PREP_USED';
          else if (item.reference_type === 'CXC_CREATED') kind = 'CXC_CREATED';
          else if (item.reference_type === 'CXP_CREATED') kind = 'CXP_CREATED';
          else if ((item.reference_type as string)?.startsWith('PREP_CREATED_')) kind = 'PREP_CREATED';
          else kind = 'ACCOUNT';

          return {
            kind,
            account_code: item.account_code,
            debit: item.type === 'DEBIT' ? item.amount : 0,
            credit: item.type === 'CREDIT' ? item.amount : 0,
            ref_id: item.reference_id || null,
            journal_entry_item_id: jeItem?.id || null,
            applied_to_source_key: 'manual',
            applied_to_id: result.id,
            description: item.description || null,
          };
        });

        // 8d. Crear PaymentReceipt tipo MANUAL (sin consecutivo, sin tercero fijo)
        const receipt = await createPaymentReceipt(tx, {
          type: 'MANUAL',
          date,
          amount: receiptAmount,
          journal_entry_id: result.id,
          description: dto.description || null,
          lines: receiptLines,
        });

        // 8e. Crear Payments para CXC_PAID / CXP_PAID
        for (const item of paidItems) {
          const jeItem = jeItems.find(
            (j: any) => j.reference_type === item.reference_type && j.reference_id === item.reference_id && j.account_code === item.account_code,
          );
          const receiptLine = receipt.lines.find(
            (l) => l.kind === 'DOC' && l.ref_id === item.reference_id,
          );

          await createPayment(tx, {
            ar_ap_id: item.reference_id!,
            date,
            amount: item.amount,
            description: item.description || dto.description || null,
            journal_entry_id: result.id,
            journal_entry_item_id: jeItem?.id || null,
            payment_receipt_id: receipt.id,
            payment_receipt_line_id: receiptLine?.id || null,
          });
        }

        // 8f. Crear PrepaymentMovements para PREP_USED
        for (const item of prepItems) {
          await createPrepaymentMovement(tx, {
            prepayment_id: item.reference_id!,
            application_date: date,
            amount: item.amount,
            applied_to_source_key: 'manual',
            applied_to_id: result.id,
            applied_to_number: result.consecutive,
            journal_entry_id: result.id,
            notes: item.description || dto.description || null,
          });
        }
      }

      return result;
    });
  }

  /**
   * Crea movimientos bancarios para items con bank_account_id
   * Cada item genera un movimiento separado (no se consolidan)
   */
  private async createBankMovementsForItems(
    tx: any,
    items: JournalEntryItemInput[],
    date: Date,
    typeKey: string,
    entryDescription: string | undefined,
    entry: CreateJournalEntryResult
  ): Promise<void> {
    for (const item of items) {
      if (!item.bank_account_id) continue;

      // DEBIT en cuentas de activo (1110*, 1105*) = ingreso
      // CREDIT en cuentas de activo = egreso
      await createBankMovement(tx, {
        bank_account_id: item.bank_account_id,
        transaction_date: date,
        amount: item.amount,
        direction: item.type === 'DEBIT' ? 'INCOME' : 'EXPENSE',
        type_key: typeKey,
        description: item.description || entryDescription || '',
        reference_id: entry.id,
        reference_type: 'journal_entry',
        reference_consecutive: entry.consecutive,
      });
    }
  }

  /**
   * Crea movimientos bancarios invertidos para una reversión
   */
  private async createBankMovementsForReversal(
    tx: any,
    originalEntryId: string,
    reversalDate: Date,
    reversalEntry: CreateJournalEntryResult
  ): Promise<void> {
    const originalItems = await tx.journalEntryItem.findMany({
      where: {
        journal_entry_id: originalEntryId,
        bank_account_id: { not: null },
      },
      select: {
        account_code: true,
        type: true,
        amount: true,
        description: true,
        bank_account_id: true,
      },
    });

    const originalEntry = await tx.journalEntry.findUnique({
      where: { id: originalEntryId },
      select: { description: true },
    });

    for (const item of originalItems) {
      if (!item.bank_account_id) continue;

      await createBankMovement(tx, {
        bank_account_id: item.bank_account_id,
        transaction_date: reversalDate,
        amount: Number(item.amount),
        direction: item.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
        type_key: 'reversal',
        description: `Reversión: ${item.description || originalEntry?.description || ''}`,
        reference_id: reversalEntry.id,
        reference_type: 'journal_entry',
        reference_consecutive: reversalEntry.consecutive,
      });
    }
  }

  /**
   * Listar tipos de asientos para filtros (excluye period_close)
   */
  async findAllTypes(companyId: string): Promise<any[]> {
    const tenantDb = await this.getTenantDb(companyId);

    const types = await tenantDb.journalEntryType.findMany({
      where: {
        key: { notIn: ['period_close'] },
      },
      orderBy: { description: 'asc' },
    });

    return types.map((t) => ({
      key: t.key,
      description: t.description,
      color: t.color,
    }));
  }

  /**
   * Reversar un asiento contable.
   * NO crea movimientos bancarios — eso lo hace quien llama.
   */
  async reverse(companyId: string, id: string, reversalDate?: Date | null): Promise<CreateJournalEntryResult> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');
    return tenantDb.$transaction(async (tx: any) => {
      return reverseJournalEntry(tx, {
        journal_entry_id: id,
        reversal_date: reversalDate,
        hasCostCentersModule,
      });
    });
  }

  /**
   * Reversar un asiento contable completo.
   * - Si tiene PaymentReceipt: void pagos/anticipos/CxC-CxP + bank movements, luego reverse JE
   * - Si no: reverse JE + bank movements (comportamiento original)
   */
  async reverseComplete(companyId: string, id: string, reversalDate: Date): Promise<CreateJournalEntryResult> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    return tenantDb.$transaction(async (tx: any) => {
      const receipt = await tx.paymentReceipt.findFirst({
        where: { journal_entry_id: id, status: 'ACTIVE' },
        select: { id: true },
      });

      // 1. Reversar el asiento contable
      const result = await reverseJournalEntry(tx, {
        journal_entry_id: id,
        reversal_date: reversalDate,
        hasCostCentersModule,
      });

      if (receipt) {
        // 2a. Tiene receipt → void todo (pagos, anticipos, ArAps, banco)
        await voidPaymentReceipt(tx, {
          payment_receipt_id: receipt.id,
          reversal_date: reversalDate,
          reversal_entry_id: result.id,
          reversal_entry_consecutive: result.consecutive,
        });
      } else {
        // 2b. Sin receipt → solo reversar movimientos bancarios
        await this.createBankMovementsForReversal(tx, id, reversalDate, result);
      }

      return result;
    });
  }

  /**
   * Duplicar un asiento contable
   */
  async duplicate(companyId: string, id: string, duplicateDate?: Date): Promise<CreateJournalEntryResult> {
    const tenantDb = await this.getTenantDb(companyId);
    const date = duplicateDate || new Date();

    // Validar período abierto
    await validatePeriodOpen(tenantDb, date);

    // Obtener asiento original con items
    const entry = await tenantDb.journalEntry.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            account_code: true,
            type: true,
            amount: true,
            description: true,
            third_party_id: true,
            bank_account_id: true,
            cost_center_id: true,
            cost_center_movement_type_key: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Asiento contable no encontrado');
    }

    const duplicateItems = entry.items.map((item: any) => ({
      account_code: item.account_code,
      type: item.type,
      amount: Number(item.amount),
      description: item.description,
      third_party_id: item.third_party_id,
      bank_account_id: item.bank_account_id,
      cost_center_id: item.cost_center_id || undefined,
      cost_center_movement_type_key: item.cost_center_movement_type_key || undefined,
    }));

    const description = entry.description || 'Asiento duplicado';
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    return tenantDb.$transaction(async (tx: any) => {
      const result = await createJournalEntry(tx, {
        date,
        description,
        type_key: 'manual',
        items: duplicateItems,
      });

      await this.createBankMovementsForItems(tx, duplicateItems, date, 'manual', description, result);

      // Crear CC movements si tiene el módulo
      if (hasCostCentersModule) {
        const typeKeys = [...new Set(duplicateItems.map(i => i.cost_center_movement_type_key).filter(Boolean))] as string[];
        const ccTypes = typeKeys.length > 0
          ? await tx.costCenterMovementType.findMany({ where: { key: { in: typeKeys } }, select: { key: true, nature: true } })
          : [];
        const natureMap = new Map(ccTypes.map((t: any) => [t.key, t.nature]));

        const jeItems = await tx.journalEntryItem.findMany({
          where: { journal_entry_id: result.id },
          select: { id: true, account_code: true, type: true, amount: true, third_party_id: true, bank_account_id: true },
        });
        const usedIds = new Set<string>();

        for (const item of duplicateItems) {
          if (!item.cost_center_id || !item.cost_center_movement_type_key) continue;
          const nature = natureMap.get(item.cost_center_movement_type_key);
          const sign = item.type === nature ? 'POSITIVE' : 'NEGATIVE';

          const ccMov = await createCostCenterMovement(tx, {
            cost_center_id: item.cost_center_id,
            movement_date: date,
            type_key: item.cost_center_movement_type_key,
            reference_type_key: 'journal_entry',
            sign,
            amount: item.amount,
            reference_id: result.id,
            description: item.description || description,
          });

          const jeItem = jeItems.find((j: any) =>
            !usedIds.has(j.id) && j.account_code === item.account_code && j.type === item.type
            && new Decimal(j.amount).equals(new Decimal(item.amount))
            && (j.third_party_id || null) === (item.third_party_id || null)
            && (j.bank_account_id || null) === (item.bank_account_id || null),
          );
          if (jeItem) {
            usedIds.add(jeItem.id);
            await tx.journalEntryItem.update({ where: { id: jeItem.id }, data: { cost_center_movement_id: ccMov.id } });
          }
        }
      }

      return result;
    });
  }
}
