import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService, createCostCenterMovement } from '@contagracia/shared-modules';
import { PrepaymentType, PrepaymentStatus } from '@prisma/client-tenant';
import { validatePeriodOpen } from '../../functions/validate-period-open';
import { createJournalEntry } from '../../functions/create-journal-entry';
import { createBankMovement } from '../../functions/create-bank-movement';
import { reverseJournalEntry } from '../../functions/reverse-journal-entry';
import { getNextConsecutive } from '@contagracia/shared-modules';

/* ── DTOs ─────────────────────────────────────────────────── */

export interface PrepaymentQueryParams {
  search?: string;
  prepayment_type?: PrepaymentType;
  status?: PrepaymentStatus;
  third_party_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface MovementQueryParams {
  search?: string;
  source_key?: string;
  is_voided?: string;        // 'true' | 'false'
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface CreatePrepaymentDto {
  third_party_id: string;              // Cliente, proveedor o empleado
  prepayment_type: PrepaymentType;     // CLIENT | SUPPLIER | EMPLOYEE
  prepayment_date: string;             // YYYY-MM-DD
  original_amount: number;
  account_code?: string;               // Cuenta contable del anticipo (opcional si no tiene módulo contable)
  counterpart_account_code?: string;   // Cuenta de cruce (si no usa banco)
  bank_account_id?: string;            // Cuenta bancaria si el pago fue por banco
  company_payment_method_id?: string;  // Método de pago si el pago fue por banco
  notes?: string;
  cost_center_id?: string;             // Centro de costos (si tiene módulo CC)
}

export interface RefundPrepaymentDto {
  date: string;                        // YYYY-MM-DD — fecha de la devolución
  reason?: string;                     // Razón de la devolución
  refunded_by?: string;                // User ID (set by controller)
}

/* ── Service ──────────────────────────────────────────────── */

@Injectable()
export class PrepaymentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * List prepayments with fuzzy search, filters and pagination
   */
  async findAll(companyId: string, params: PrepaymentQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const {
      search,
      prepayment_type,
      status,
      third_party_id,
      from_date,
      to_date,
      page = 1,
      limit = 50,
    } = params;

    // Build WHERE conditions for raw query
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let paramIndex = 1;

    if (prepayment_type) {
      conditions.push(`p."prepayment_type" = $${paramIndex}::text::"PrepaymentType"`);
      values.push(prepayment_type);
      paramIndex++;
    }

    if (status) {
      conditions.push(`p."status" = $${paramIndex}::text::"PrepaymentStatus"`);
      values.push(status);
      paramIndex++;
    }

    if (third_party_id) {
      conditions.push(`p."third_party_id" = $${paramIndex}`);
      values.push(third_party_id);
      paramIndex++;
    }

    if (from_date) {
      conditions.push(`p."prepayment_date" >= $${paramIndex}::date`);
      values.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      conditions.push(`p."prepayment_date" <= $${paramIndex}::date`);
      values.push(to_date);
      paramIndex++;
    }

    if (search) {
      const searchParam = `$${paramIndex}`;
      const patternParam = `$${paramIndex + 1}`;
      values.push(search, `%${search}%`);
      paramIndex += 2;

      conditions.push(`(
        COALESCE(p."consecutive", '') ILIKE ${patternParam}
        OR tp."name" ILIKE ${patternParam}
        OR COALESCE(tp."identification_number", '') ILIKE ${patternParam}
        OR p."account_code" ILIKE ${patternParam}
        OR COALESCE(ca."name", '') ILIKE ${patternParam}
        OR COALESCE(ba."account_name", '') ILIKE ${patternParam}
        OR COALESCE(cpm."name", '') ILIKE ${patternParam}
        OR COALESCE(p."counterpart_account_code", '') ILIKE ${patternParam}
        OR COALESCE(cca."name", '') ILIKE ${patternParam}
        OR word_similarity(${searchParam}, COALESCE(p."consecutive", '')) > 0.3
        OR word_similarity(${searchParam}, tp."name") > 0.3
        OR word_similarity(${searchParam}, COALESCE(ba."account_name", '')) > 0.3
        OR word_similarity(${searchParam}, COALESCE(cpm."name", '')) > 0.3
        OR word_similarity(${searchParam}, COALESCE(ca."name", '')) > 0.3
        OR word_similarity(${searchParam}, COALESCE(cca."name", '')) > 0.3
      )`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "prepayments" p
      JOIN "third_parties" tp ON tp."id" = p."third_party_id"
      LEFT JOIN "chart_of_accounts" ca ON ca."code" = p."account_code"
      LEFT JOIN "bank_accounts" ba ON ba."id" = p."bank_account_id"
      LEFT JOIN "company_payment_methods" cpm ON cpm."id" = p."company_payment_method_id"
      LEFT JOIN "chart_of_accounts" cca ON cca."code" = p."counterpart_account_code"
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT
        p."id",
        p."consecutive",
        p."prepayment_date",
        p."prepayment_type",
        p."original_amount",
        p."balance",
        p."account_code",
        ca."name" as "account_name",
        p."counterpart_account_code",
        cca."name" as "counterpart_account_name",
        p."bank_account_id",
        ba."account_name" as "bank_account_name",
        p."company_payment_method_id",
        cpm."name" as "payment_method_name",
        p."status",
        p."notes",
        p."journal_entry_id",
        p."voided_at",
        p."voided_reason",
        p."voided_by",
        p."refunded_at",
        p."refunded_reason",
        p."refunded_by",
        p."created_at",
        tp."id" as "third_party_id",
        tp."name" as "third_party_name",
        tp."identification_number" as "third_party_document"
      FROM "prepayments" p
      JOIN "third_parties" tp ON tp."id" = p."third_party_id"
      LEFT JOIN "chart_of_accounts" ca ON ca."code" = p."account_code"
      LEFT JOIN "bank_accounts" ba ON ba."id" = p."bank_account_id"
      LEFT JOIN "company_payment_methods" cpm ON cpm."id" = p."company_payment_method_id"
      LEFT JOIN "chart_of_accounts" cca ON cca."code" = p."counterpart_account_code"
      WHERE ${whereClause}
      ORDER BY p."prepayment_date" DESC, p."consecutive" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countResult, data] = await Promise.all([
      tenantDb.$queryRawUnsafe<[{ total: number }]>(countQuery, ...values),
      tenantDb.$queryRawUnsafe<any[]>(dataQuery, ...values),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: data.map((row) => ({
        id: row.id,
        consecutive: row.consecutive,
        prepayment_date: row.prepayment_date,
        prepayment_type: row.prepayment_type,
        original_amount: Number(row.original_amount),
        balance: Number(row.balance),
        account_code: row.account_code,
        account_name: row.account_name,
        counterpart_account_code: row.counterpart_account_code,
        counterpart_account_name: row.counterpart_account_name,
        bank_account_id: row.bank_account_id,
        bank_account_name: row.bank_account_name,
        company_payment_method_id: row.company_payment_method_id,
        payment_method_name: row.payment_method_name,
        status: row.status,
        notes: row.notes,
        journal_entry_id: row.journal_entry_id,
        third_party_id: row.third_party_id,
        third_party_name: row.third_party_name,
        third_party_document: row.third_party_document,
        voided_at: row.voided_at,
        voided_reason: row.voided_reason,
        voided_by: row.voided_by,
        refunded_at: row.refunded_at,
        refunded_reason: row.refunded_reason,
        refunded_by: row.refunded_by,
        created_at: row.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  /**
   * Get prepayment by ID with relations and movements
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const prepayment = await tenantDb.prepayment.findUnique({
      where: { id },
      include: {
        third_party: {
          select: { id: true, name: true, identification_number: true },
        },
        account: { select: { code: true, name: true } },
        counterpart_account: { select: { code: true, name: true } },
        bank_account: { select: { id: true, account_name: true, account_number: true } },
        company_payment_method: { select: { id: true, name: true } },
      },
    });

    if (!prepayment) {
      throw new NotFoundException('Anticipo no encontrado');
    }

    return {
      ...prepayment,
      original_amount: Number(prepayment.original_amount),
      balance: Number(prepayment.balance),
    };
  }

  /**
   * List movements for a prepayment with search, filters and pagination
   */
  async findMovements(companyId: string, prepaymentId: string, params: MovementQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validate prepayment exists
    const exists = await tenantDb.prepayment.findUnique({ where: { id: prepaymentId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Anticipo no encontrado');

    const {
      search,
      source_key,
      is_voided,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = params;

    const conditions: string[] = [`m."prepayment_id" = $1`];
    const values: any[] = [prepaymentId];
    let paramIndex = 2;

    if (source_key) {
      conditions.push(`m."applied_to_source_key" = $${paramIndex}`);
      values.push(source_key);
      paramIndex++;
    }

    if (is_voided === 'true' || is_voided === 'false') {
      conditions.push(`m."is_voided" = $${paramIndex}::boolean`);
      values.push(is_voided);
      paramIndex++;
    }

    if (from_date) {
      conditions.push(`m."application_date" >= $${paramIndex}::date`);
      values.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      conditions.push(`m."application_date" <= $${paramIndex}::date`);
      values.push(to_date);
      paramIndex++;
    }

    if (search) {
      const patternParam = `$${paramIndex}`;
      values.push(`%${search}%`);
      paramIndex++;
      conditions.push(`(
        COALESCE(m."consecutive", '') ILIKE ${patternParam}
        OR COALESCE(m."applied_to_number", '') ILIKE ${patternParam}
        OR COALESCE(m."notes", '') ILIKE ${patternParam}
        OR COALESCE(s."description", '') ILIKE ${patternParam}
      )`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "prepayment_movements" m
      LEFT JOIN "ar_ap_sources" s ON s."key" = m."applied_to_source_key"
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT
        m."id",
        m."consecutive",
        m."application_date",
        m."amount",
        m."applied_to_source_key",
        m."applied_to_id",
        m."applied_to_number",
        m."journal_entry_id",
        m."is_voided",
        m."notes",
        m."created_at",
        s."key" as "source_key",
        s."description" as "source_description"
      FROM "prepayment_movements" m
      LEFT JOIN "ar_ap_sources" s ON s."key" = m."applied_to_source_key"
      WHERE ${whereClause}
      ORDER BY m."application_date" DESC, m."created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countResult, data, sources] = await Promise.all([
      tenantDb.$queryRawUnsafe<[{ total: number }]>(countQuery, ...values),
      tenantDb.$queryRawUnsafe<any[]>(dataQuery, ...values),
      tenantDb.arApSource.findMany({ orderBy: { description: 'asc' } }),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: data.map((row) => ({
        id: row.id,
        consecutive: row.consecutive,
        application_date: row.application_date,
        amount: Number(row.amount),
        applied_to_source_key: row.applied_to_source_key,
        applied_to_id: row.applied_to_id,
        applied_to_number: row.applied_to_number,
        journal_entry_id: row.journal_entry_id,
        is_voided: row.is_voided,
        notes: row.notes,
        created_at: row.created_at,
        applied_source: row.source_key
          ? { key: row.source_key, description: row.source_description }
          : null,
      })),
      sources: sources.map((s) => ({ key: s.key, description: s.description })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Crear anticipo (cliente, proveedor o empleado)
   *
   * Integraciones:
   * - Crear Prepayment con balance = original_amount
   * - Crear asiento contable (createJournalEntry): DB anticipo / CR banco o caja
   * - Si tiene bank_account_id → crear movimiento bancario (createBankMovement)
   * - Asignar consecutivo (getNextConsecutive 'prepayment')
   * - Validar periodo abierto (validatePeriodOpen)
   */
  async createPrepayment(companyId: string, dto: CreatePrepaymentDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasAccountingModule = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');
    const prepaymentDate = new Date(dto.prepayment_date);

    // ── Tipo de asiento y movimiento bancario ──
    const typeKeyMap: Record<string, string> = {
      CLIENT: 'client_prepayment',
      SUPPLIER: 'supplier_prepayment',
      EMPLOYEE: 'employee_prepayment',
    };
    const typeKey = typeKeyMap[dto.prepayment_type];

    // ── Validar periodo contable (solo si tiene contabilidad) ──
    if (hasAccountingModule) {
      await validatePeriodOpen(tenantDb, prepaymentDate);
    }

    // ── Validaciones comunes ──
    if (!dto.third_party_id) throw new BadRequestException('El tercero es requerido');
    if (!dto.prepayment_type) throw new BadRequestException('El tipo de anticipo es requerido');
    if (!['CLIENT', 'SUPPLIER', 'EMPLOYEE'].includes(dto.prepayment_type)) {
      throw new BadRequestException('Tipo de anticipo inválido');
    }
    if (!dto.original_amount || dto.original_amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!dto.prepayment_date) throw new BadRequestException('La fecha es requerida');

    // Validar tercero existe
    const thirdParty = await tenantDb.thirdParty.findUnique({ where: { id: dto.third_party_id } });
    if (!thirdParty) throw new NotFoundException('Tercero no encontrado');

    // ── Validaciones contables ──
    if (hasAccountingModule) {
      if (!dto.account_code) throw new BadRequestException('La cuenta de anticipo es requerida');

      const account = await tenantDb.chartOfAccount.findUnique({ where: { code: dto.account_code } });
      if (!account) throw new NotFoundException('Cuenta de anticipo no encontrada');

      if (dto.counterpart_account_code) {
        const counterpart = await tenantDb.chartOfAccount.findUnique({ where: { code: dto.counterpart_account_code } });
        if (!counterpart) throw new NotFoundException('Cuenta de cruce no encontrada');
      }
    }

    // ── Validaciones de banco ──
    let bankAccount: any = null;
    if (dto.bank_account_id) {
      bankAccount = await tenantDb.bankAccount.findUnique({ where: { id: dto.bank_account_id } });
      if (!bankAccount) throw new NotFoundException('Cuenta bancaria no encontrada');
      if (!bankAccount.is_active) throw new BadRequestException('La cuenta bancaria no está activa');
    }

    if (dto.company_payment_method_id) {
      const paymentMethod = await tenantDb.companyPaymentMethod.findUnique({ where: { id: dto.company_payment_method_id } });
      if (!paymentMethod) throw new NotFoundException('Método de pago no encontrado');
      if (!paymentMethod.is_active) throw new BadRequestException('El método de pago no está activo');
    }

    // ── Validar que tenga banco o cuenta de cruce ──
    if (!dto.bank_account_id && !dto.counterpart_account_code) {
      throw new BadRequestException('Debe seleccionar un banco o una cuenta de cruce');
    }

    // ── Validar CC si módulo activo (independiente de contabilidad) ──
    if (hasCostCentersModule && !dto.cost_center_id) {
      throw new BadRequestException('Se requiere centro de costos');
    }

    // ── Resolver cuenta de contrapartida ──
    let counterpartCode = dto.counterpart_account_code || null;
    if (hasAccountingModule && dto.bank_account_id && bankAccount) {
      if (bankAccount.account_id) {
        counterpartCode = bankAccount.account_id;
      } else {
        const configKey = bankAccount.account_type === 'CASH' ? 'finance_cash_account' : 'finance_bank_account';
        const config = await tenantDb.accountingConfig.findUnique({ where: { key: configKey } });
        if (!config?.account_code) {
          throw new BadRequestException(`No se encontró cuenta contable para ${configKey}`);
        }
        counterpartCode = config.account_code;
      }
    }

    // ── Descripción ──
    const typeLabels: Record<string, string> = {
      CLIENT: 'Cliente',
      SUPPLIER: 'Proveedor',
      EMPLOYEE: 'Empleado',
    };

    // ── Todo en UNA transacción ──
    const prepayment = await tenantDb.$transaction(async (tx: any) => {
      // Crear anticipo con consecutivo
      const consecutive = await getNextConsecutive(tx, 'prepayment');
      const created = await tx.prepayment.create({
        data: {
          consecutive,
          third_party_id: dto.third_party_id,
          prepayment_type: dto.prepayment_type,
          prepayment_date: prepaymentDate,
          original_amount: dto.original_amount,
          balance: dto.original_amount,
          account_code: dto.account_code || null,
          counterpart_account_code: counterpartCode,
          bank_account_id: dto.bank_account_id || null,
          company_payment_method_id: dto.company_payment_method_id || null,
          cost_center_id: dto.cost_center_id || null,
          notes: dto.notes || null,
        },
      });

      const formattedAmount = new Intl.NumberFormat('es-CO').format(dto.original_amount);
      let description = `Anticipo ${created.consecutive} a ${typeLabels[dto.prepayment_type]} ${thirdParty.name} por ${formattedAmount}`;
      if (dto.notes) {
        description += ` notas: ${dto.notes}`;
      }

      // Movimiento bancario (solo si pagó con banco)
      if (dto.bank_account_id) {
        await createBankMovement(tx, {
          bank_account_id: dto.bank_account_id,
          transaction_date: prepaymentDate,
          amount: dto.original_amount,
          direction: dto.prepayment_type === 'CLIENT' ? 'INCOME' : 'EXPENSE',
          type_key: typeKey,
          description,
          reference_id: created.id,
          reference_type: 'prepayment',
          reference_consecutive: created.consecutive,
        });
      }

      // Calcular CC type key antes del JE (se usa en items y luego en CC movements)
      const ccTypeKeyMap: Record<string, string> = {
        CLIENT: 'prepayment_customer',
        SUPPLIER: 'prepayment_supplier',
        EMPLOYEE: 'prepayment_employee',
      };
      const ccTypeKey = ccTypeKeyMap[dto.prepayment_type];
      const ccTypeKeyForJE = hasCostCentersModule && dto.cost_center_id ? ccTypeKey : undefined;

      // Asiento contable (solo si tiene módulo de contabilidad)
      let journalEntryId: string | undefined;
      if (hasAccountingModule) {
        const isClient = dto.prepayment_type === 'CLIENT';

        const journalEntry = await createJournalEntry(tx, {
          date: prepaymentDate,
          description,
          type_key: typeKey,
          reference_id: created.id,
          items: [
            {
              account_code: dto.account_code!,
              amount: dto.original_amount,
              type: isClient ? 'CREDIT' : 'DEBIT',
              description,
              third_party_id: dto.third_party_id,
              cost_center_id: dto.cost_center_id,
              cost_center_movement_type_key: ccTypeKeyForJE,
            },
            {
              account_code: counterpartCode!,
              amount: dto.original_amount,
              type: isClient ? 'DEBIT' : 'CREDIT',
              description,
              third_party_id: dto.third_party_id,
              bank_account_id: dto.bank_account_id || undefined,
              cost_center_id: dto.cost_center_id,
              cost_center_movement_type_key: ccTypeKeyForJE,
            },
          ],
        });

        journalEntryId = journalEntry.id;
        await tx.prepayment.update({
          where: { id: created.id },
          data: { journal_entry_id: journalEntry.id },
        });
      }

      // CC movements (independiente de contabilidad)
      if (hasCostCentersModule && dto.cost_center_id) {
        const ccType = await tx.costCenterMovementType.findUnique({
          where: { key: ccTypeKey },
          select: { nature: true },
        });
        const nature = ccType?.nature || 'DEBIT';

        const isClient = dto.prepayment_type === 'CLIENT';
        const sides = [
          { type: isClient ? 'CREDIT' : 'DEBIT' },
          { type: isClient ? 'DEBIT' : 'CREDIT' },
        ];

        for (const side of sides) {
          const sign = side.type === nature ? 'POSITIVE' : 'NEGATIVE';
          const ccMov = await createCostCenterMovement(tx, {
            cost_center_id: dto.cost_center_id,
            movement_date: prepaymentDate,
            type_key: ccTypeKey,
            reference_type_key: journalEntryId ? 'journal_entry' : 'prepayment',
            sign,
            amount: dto.original_amount,
            reference_id: journalEntryId || created.id,
            description,
          });

          // Vincular al JE item si existe
          if (journalEntryId) {
            const jeItem = await tx.journalEntryItem.findFirst({
              where: {
                journal_entry_id: journalEntryId,
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

      return created;
    });

    return prepayment;
  }

  /**
   * Anular anticipo completo (solo si no tiene movimientos aplicados)
   *
   * 1. Validar estado ACTIVE
   * 2. Validar que NO tenga PrepaymentMovements activos (no anulados)
   * 3. Validar período contable abierto para la fecha de anulación
   * 4. Si tiene journal_entry_id → reverseJournalEntry
   * 5. Si tiene bank_account_id → crear movimiento bancario inverso (type_key 'reversal')
   * 6. Marcar Prepayment status = VOIDED + voided_at, voided_reason, voided_by
   */
  async voidPrepayment(
    companyId: string,
    prepaymentId: string,
    params: { reason?: string; void_date: string; voided_by?: string },
  ): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasAccountingModule = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');
    const voidDate = new Date(params.void_date);

    // 1. Obtener el anticipo
    const prepayment = await tenantDb.prepayment.findUnique({
      where: { id: prepaymentId },
      include: {
        third_party: { select: { name: true } },
      },
    });

    if (!prepayment) {
      throw new NotFoundException('Anticipo no encontrado');
    }

    if (prepayment.status !== 'ACTIVE') {
      throw new BadRequestException(`No se puede anular un anticipo en estado ${prepayment.status}`);
    }

    // 2. Validar que NO tenga movimientos activos (no anulados)
    const activeMovements = await tenantDb.prepaymentMovement.count({
      where: { prepayment_id: prepaymentId, is_voided: false },
    });

    if (activeMovements > 0) {
      throw new BadRequestException(
        `No se puede anular el anticipo porque tiene ${activeMovements} movimiento(s) activo(s). Primero debe anular los movimientos.`,
      );
    }

    // 3. Validar período contable abierto (ANTES de tocar tablas)
    if (hasAccountingModule) {
      await validatePeriodOpen(tenantDb, voidDate);
    }

    // Todo en UNA transacción
    return tenantDb.$transaction(async (tx: any) => {
      // 4. Reversar asiento contable (si tiene) — CC movements se reversan dentro
      let reversalEntry: { id: string; consecutive: string } | null = null;
      if (prepayment.journal_entry_id && hasAccountingModule) {
        reversalEntry = await reverseJournalEntry(tx, {
          journal_entry_id: prepayment.journal_entry_id,
          reversal_date: voidDate,
          hasCostCentersModule,
        });
      }

      // CC movements inversos (solo si no hay JE pero sí hay CC)
      if (hasCostCentersModule && prepayment.cost_center_id && !prepayment.journal_entry_id) {
        const ccTypeKeyMap: Record<string, string> = {
          CLIENT: 'prepayment_customer',
          SUPPLIER: 'prepayment_supplier',
          EMPLOYEE: 'prepayment_employee',
        };
        const ccTypeKey = ccTypeKeyMap[prepayment.prepayment_type];

        const ccType = await tx.costCenterMovementType.findUnique({
          where: { key: ccTypeKey },
          select: { nature: true },
        });
        const nature = ccType?.nature || 'DEBIT';

        // Invertir los sides respecto a la creación
        const isClient = prepayment.prepayment_type === 'CLIENT';
        const sides = [
          { type: isClient ? 'DEBIT' : 'CREDIT' },
          { type: isClient ? 'CREDIT' : 'DEBIT' },
        ];

        const formattedAmt = new Intl.NumberFormat('es-CO').format(Number(prepayment.original_amount));
        const voidDesc = `Anulación anticipo ${prepayment.consecutive} a ${prepayment.third_party.name} por ${formattedAmt}`;

        for (const side of sides) {
          const sign = side.type === nature ? 'POSITIVE' : 'NEGATIVE';
          await createCostCenterMovement(tx, {
            cost_center_id: prepayment.cost_center_id,
            movement_date: voidDate,
            type_key: ccTypeKey,
            reference_type_key: 'prepayment',
            sign,
            amount: Number(prepayment.original_amount),
            reference_id: prepaymentId,
            description: voidDesc,
          });
        }
      }

      // 5. Crear movimiento bancario inverso (si tenía banco)
      if (prepayment.bank_account_id) {
        const originalDirection = prepayment.prepayment_type === 'CLIENT' ? 'INCOME' : 'EXPENSE';
        const inverseDirection = originalDirection === 'INCOME' ? 'EXPENSE' : 'INCOME';

        const formattedAmount = new Intl.NumberFormat('es-CO').format(Number(prepayment.original_amount));
        const description = `Anulación anticipo ${prepayment.consecutive} a ${prepayment.third_party.name} por ${formattedAmount}`;

        await createBankMovement(tx, {
          bank_account_id: prepayment.bank_account_id,
          transaction_date: voidDate,
          amount: Number(prepayment.original_amount),
          direction: inverseDirection,
          type_key: 'reversal',
          description,
          reference_id: reversalEntry?.id || prepaymentId,
          reference_type: reversalEntry ? 'journal_entry' : 'prepayment',
          reference_consecutive: reversalEntry?.consecutive || prepayment.consecutive || 'Anulación',
        });
      }

      // 6. Marcar anticipo como VOIDED
      await tx.prepayment.update({
        where: { id: prepaymentId },
        data: {
          status: 'VOIDED',
          balance: 0,
          voided_at: voidDate,
          voided_reason: params.reason || null,
          voided_by: params.voided_by || null,
        },
      });

      return {
        id: prepaymentId,
        status: 'VOIDED',
        voided_at: voidDate,
        voided_reason: params.reason || null,
        reversal_entry_id: reversalEntry?.id || null,
        reversal_entry_consecutive: reversalEntry?.consecutive || null,
      };
    });
  }

  /**
   * Devolver anticipo (total o parcial) al tercero
   *
   * Integraciones:
   * - Validar que amount <= Prepayment.balance
   * - Reducir Prepayment.balance
   * - Si balance llega a 0 → status = REFUNDED
   * - Crear asiento contable: CR anticipo / DB banco o caja
   * - Si tiene bank_account_id → crear movimiento bancario
   * - Crear PrepaymentMovement como registro de la devolución
   * - Validar periodo abierto
   */
  async refundPrepayment(companyId: string, prepaymentId: string, dto: RefundPrepaymentDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasAccountingModule = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');
    const refundDate = new Date(dto.date);

    // 1. Obtener el anticipo
    const prepayment = await tenantDb.prepayment.findUnique({
      where: { id: prepaymentId },
      include: {
        third_party: { select: { name: true } },
      },
    });

    if (!prepayment) {
      throw new NotFoundException('Anticipo no encontrado');
    }

    if (prepayment.status !== 'ACTIVE') {
      throw new BadRequestException(`No se puede devolver un anticipo en estado ${prepayment.status}`);
    }

    const refundAmount = Number(prepayment.balance);
    if (refundAmount <= 0) {
      throw new BadRequestException('El anticipo no tiene saldo para devolver');
    }

    // 2. Validar período contable abierto (ANTES de tocar tablas)
    if (hasAccountingModule) {
      await validatePeriodOpen(tenantDb, refundDate);
    }

    // 3. Tipo de asiento y movimiento bancario
    const refundTypeKeyMap: Record<string, string> = {
      CLIENT: 'client_prepayment_refund',
      SUPPLIER: 'supplier_prepayment_refund',
      EMPLOYEE: 'employee_prepayment_refund',
    };
    const typeKey = refundTypeKeyMap[prepayment.prepayment_type];

    // 4. Descripción
    const typeLabels: Record<string, string> = {
      CLIENT: 'Cliente',
      SUPPLIER: 'Proveedor',
      EMPLOYEE: 'Empleado',
    };
    const formattedAmount = new Intl.NumberFormat('es-CO').format(refundAmount);
    const description = `Devolución anticipo ${prepayment.consecutive} a ${typeLabels[prepayment.prepayment_type]} ${prepayment.third_party.name} por ${formattedAmount}`;

    // 5. Resolver cuenta de contrapartida (si tiene banco, usar cuenta del banco)
    let counterpartCode = prepayment.counterpart_account_code;
    if (hasAccountingModule && prepayment.bank_account_id) {
      const bankAccount = await tenantDb.bankAccount.findUnique({
        where: { id: prepayment.bank_account_id },
        select: { account_id: true, account_type: true },
      });
      if (bankAccount) {
        if (bankAccount.account_id) {
          counterpartCode = bankAccount.account_id;
        } else {
          const configKey = bankAccount.account_type === 'CASH' ? 'finance_cash_account' : 'finance_bank_account';
          const config = await tenantDb.accountingConfig.findUnique({ where: { key: configKey } });
          if (config?.account_code) {
            counterpartCode = config.account_code;
          }
        }
      }
    }

    // Todo en UNA transacción
    return tenantDb.$transaction(async (tx: any) => {
      // Calcular CC type key antes del JE
      const refundCcTypeKeyMap: Record<string, string> = {
        CLIENT: 'prepayment_customer',
        SUPPLIER: 'prepayment_supplier',
        EMPLOYEE: 'prepayment_employee',
      };
      const refundCcTypeKey = refundCcTypeKeyMap[prepayment.prepayment_type];
      const refundCcTypeKeyForJE = hasCostCentersModule && prepayment.cost_center_id ? refundCcTypeKey : undefined;

      // 6. Crear asiento contable (solo si tiene módulo de contabilidad)
      let journalEntry: { id: string; consecutive: string } | null = null;
      if (hasAccountingModule && prepayment.account_code && counterpartCode) {
        const isClient = prepayment.prepayment_type === 'CLIENT';

        journalEntry = await createJournalEntry(tx, {
          date: refundDate,
          description,
          type_key: typeKey,
          reference_id: prepaymentId,
          items: [
            {
              account_code: prepayment.account_code,
              amount: refundAmount,
              type: isClient ? 'DEBIT' : 'CREDIT',
              description,
              third_party_id: prepayment.third_party_id,
              cost_center_id: prepayment.cost_center_id || undefined,
              cost_center_movement_type_key: refundCcTypeKeyForJE,
            },
            {
              account_code: counterpartCode,
              amount: refundAmount,
              type: isClient ? 'CREDIT' : 'DEBIT',
              description,
              third_party_id: prepayment.third_party_id,
              bank_account_id: prepayment.bank_account_id || undefined,
              cost_center_id: prepayment.cost_center_id || undefined,
              cost_center_movement_type_key: refundCcTypeKeyForJE,
            },
          ],
        });
      }

      // 7. Movimiento bancario (si el anticipo original tenía banco)
      if (prepayment.bank_account_id) {
        await createBankMovement(tx, {
          bank_account_id: prepayment.bank_account_id,
          transaction_date: refundDate,
          amount: refundAmount,
          direction: prepayment.prepayment_type === 'CLIENT' ? 'EXPENSE' : 'INCOME',
          type_key: typeKey,
          description,
          reference_id: journalEntry?.id || prepaymentId,
          reference_type: journalEntry ? 'journal_entry' : 'prepayment',
          reference_consecutive: journalEntry?.consecutive || prepayment.consecutive || 'Devolución',
        });
      }

      // CC movements para reembolso (independiente de contabilidad)
      if (hasCostCentersModule && prepayment.cost_center_id) {

        const ccType = await tx.costCenterMovementType.findUnique({
          where: { key: refundCcTypeKey },
          select: { nature: true },
        });
        const nature = ccType?.nature || 'DEBIT';

        // Reembolso invierte los sides respecto a la creación
        const isClient = prepayment.prepayment_type === 'CLIENT';
        const sides = [
          { type: isClient ? 'DEBIT' : 'CREDIT' },
          { type: isClient ? 'CREDIT' : 'DEBIT' },
        ];

        for (const side of sides) {
          const sign = side.type === nature ? 'POSITIVE' : 'NEGATIVE';
          const ccMov = await createCostCenterMovement(tx, {
            cost_center_id: prepayment.cost_center_id,
            movement_date: refundDate,
            type_key: refundCcTypeKey,
            reference_type_key: journalEntry ? 'journal_entry' : 'prepayment',
            sign,
            amount: refundAmount,
            reference_id: journalEntry?.id || prepaymentId,
            description,
          });

          // Vincular al JE item si existe
          if (journalEntry) {
            const jeItem = await tx.journalEntryItem.findFirst({
              where: {
                journal_entry_id: journalEntry.id,
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

      // 8. Marcar anticipo como REFUNDED con balance 0
      await tx.prepayment.update({
        where: { id: prepaymentId },
        data: {
          status: 'REFUNDED',
          balance: 0,
          refunded_at: refundDate,
          refunded_reason: dto.reason || null,
          refunded_by: dto.refunded_by || null,
        },
      });

      return {
        id: prepaymentId,
        status: 'REFUNDED',
        refund_amount: refundAmount,
        refunded_at: refundDate,
        refunded_reason: dto.reason || null,
        journal_entry_id: journalEntry?.id || null,
        journal_entry_consecutive: journalEntry?.consecutive || null,
      };
    });
  }

}
