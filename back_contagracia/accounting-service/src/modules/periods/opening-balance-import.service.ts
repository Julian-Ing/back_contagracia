import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import * as ExcelJS from 'exceljs';
import { Decimal } from '@prisma/client-tenant/runtime/library';

interface ParsedSaldoRow {
  account_code: string;
  account_name: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string | null;
  third_party_id: string | null;
  third_party_name: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  cost_center_movement_type_key: string | null;
  cost_center_movement_type_name: string | null;
}

interface ParsedCxRow {
  third_party_id: string;
  third_party_name: string;
  description: string | null;
  amount: number;
  due_date: Date;
  account_code: string;
  account_name: string;
  cost_center_id: string | null;
  cost_center_name: string | null;
  cost_center_movement_type_key: string | null;
  cost_center_movement_type_name: string | null;
}

interface ParsedPrepaymentRow {
  third_party_id: string;
  third_party_name: string;
  type: 'customer' | 'supplier' | 'employee';
  amount: number;
  account_code: string;
  account_name: string;
  cost_center_id: string | null;
  cost_center_name: string | null;
  cost_center_movement_type_key: string | null;
  cost_center_movement_type_name: string | null;
}

export interface ParseResult {
  saldoRows: ParsedSaldoRow[];
  cxcRows: ParsedCxRow[];
  cxpRows: ParsedCxRow[];
  prepaymentRows: ParsedPrepaymentRow[];
  totalDebit: string;
  totalCredit: string;
  errors: string[];
}

@Injectable()
export class OpeningBalanceImportService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  /**
   * Preview: parse Excel and return parsed rows with resolved names (no DB writes)
   */
  async previewOpeningBalance(
    companyId: string,
    fileBuffer: Buffer,
  ): Promise<ParseResult> {
    return this.parseExcel(companyId, fileBuffer);
  }

  /**
   * Import: parse Excel, validate, create JE + ArAps + Prepayments + period action
   */
  async importOpeningBalance(
    companyId: string,
    periodId: string,
    userId: string,
    fileBuffer: Buffer,
    description?: string,
  ) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);

    // 1. Validate period
    const period = await tenantDb.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Período no encontrado');
    if (!period.is_annual) throw new BadRequestException('Solo se pueden importar saldos iniciales en períodos anuales');
    if (period.status !== 'OPEN' && period.status !== 'REOPENED') {
      throw new BadRequestException('El período debe estar abierto para importar saldos');
    }

    // Check no active manual opening balance
    const existingManualAction = await tenantDb.accountingPeriodAction.findFirst({
      where: {
        period_id: periodId,
        action: 'OPEN',
        is_manual: true,
        journal_entry_id: { not: null },
      },
      include: {
        journal_entry: { select: { id: true, is_reversed: true } },
      },
    });
    if (existingManualAction && existingManualAction.journal_entry && !existingManualAction.journal_entry.is_reversed) {
      throw new BadRequestException(
        'Ya existe una importación de saldos iniciales activa. Reverse la existente antes de importar nuevamente.',
      );
    }

    // 2. Parse Excel
    const parsed = await this.parseExcel(companyId, fileBuffer);

    if (parsed.errors.length > 0) {
      throw new BadRequestException({
        message: `Se encontraron ${parsed.errors.length} error(es) en el archivo`,
        errors: parsed.errors,
      });
    }

    const { saldoRows, cxcRows, cxpRows, prepaymentRows } = parsed;

    const totalRows = saldoRows.length + cxcRows.length + cxpRows.length + prepaymentRows.length;
    if (totalRows === 0) {
      throw new BadRequestException('El archivo no contiene datos para importar');
    }

    // 3. Build JE items
    const items: any[] = [];

    for (const row of saldoRows) {
      items.push({
        account_code: row.account_code,
        amount: row.amount,
        type: row.type,
        description: row.description || undefined,
        third_party_id: row.third_party_id || undefined,
        bank_account_id: row.bank_account_id || undefined,
        cost_center_id: row.cost_center_id || undefined,
        cost_center_movement_type_key: row.cost_center_movement_type_key || undefined,
      });
    }

    for (const row of cxcRows) {
      items.push({
        account_code: row.account_code,
        amount: row.amount,
        type: 'DEBIT',
        reference_type: 'CXC_CREATED',
        description: row.description || undefined,
        third_party_id: row.third_party_id,
        cost_center_id: row.cost_center_id || undefined,
        cost_center_movement_type_key: row.cost_center_movement_type_key || undefined,
      });
    }

    for (const row of cxpRows) {
      items.push({
        account_code: row.account_code,
        amount: row.amount,
        type: 'CREDIT',
        reference_type: 'CXP_CREATED',
        description: row.description || undefined,
        third_party_id: row.third_party_id,
        cost_center_id: row.cost_center_id || undefined,
        cost_center_movement_type_key: row.cost_center_movement_type_key || undefined,
      });
    }

    for (const row of prepaymentRows) {
      const refTypeMap: Record<string, string> = {
        'customer': 'PREP_CREATED_CLIENT',
        'supplier': 'PREP_CREATED_SUPPLIER',
        'employee': 'PREP_CREATED_EMPLOYEE',
      };
      const typeMap: Record<string, string> = {
        'customer': 'CREDIT',
        'supplier': 'DEBIT',
        'employee': 'DEBIT',
      };
      items.push({
        account_code: row.account_code,
        amount: row.amount,
        type: typeMap[row.type],
        reference_type: refTypeMap[row.type],
        third_party_id: row.third_party_id,
        cost_center_id: row.cost_center_id || undefined,
        cost_center_movement_type_key: row.cost_center_movement_type_key || undefined,
      });
    }

    // 4. Validate balance
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const item of items) {
      if (item.type === 'DEBIT') {
        totalDebit = totalDebit.plus(new Decimal(item.amount));
      } else {
        totalCredit = totalCredit.plus(new Decimal(item.amount));
      }
    }
    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `El balance no cuadra. Total Débitos: ${totalDebit.toFixed(2)}, Total Créditos: ${totalCredit.toFixed(2)}. Diferencia: ${totalDebit.minus(totalCredit).toFixed(2)}`,
      );
    }

    // 5. Compute due_date
    const allDueDates = [...cxcRows, ...cxpRows].map(r => r.due_date.getTime());
    const jeDate = `${period.year}-01-01`;
    const maxDueDate = allDueDates.length > 0
      ? new Date(Math.max(...allDueDates)).toISOString().split('T')[0]
      : undefined;

    // 6. Create JE
    const finalDescription = description || `Saldos iniciales ${period.year}`;
    const result = await this.journalEntriesService.create(companyId, {
      date: jeDate,
      due_date: maxDueDate,
      type_key: 'opening_balance',
      description: finalDescription,
      items,
    });

    // 7. Update individual ArAp due_dates
    if (cxcRows.length > 0 || cxpRows.length > 0) {
      const createdArAps = await tenantDb.arAp.findMany({
        where: { journal_entry_id: result.id },
        select: { id: true, third_party_id: true, amount: true, type: true, account_code: true },
      });

      const allCxRows = [
        ...cxcRows.map(r => ({ ...r, arApType: 'RECEIVABLE' })),
        ...cxpRows.map(r => ({ ...r, arApType: 'PAYABLE' })),
      ];

      for (const cxRow of allCxRows) {
        const matchingArAp = createdArAps.find(
          (a: any) =>
            a.third_party_id === cxRow.third_party_id &&
            a.type === cxRow.arApType &&
            a.account_code === cxRow.account_code &&
            new Decimal(a.amount.toString()).equals(new Decimal(cxRow.amount)),
        );
        if (matchingArAp) {
          await tenantDb.arAp.update({
            where: { id: matchingArAp.id },
            data: { due_date: cxRow.due_date },
          });
          const idx = createdArAps.indexOf(matchingArAp);
          if (idx > -1) createdArAps.splice(idx, 1);
        }
      }
    }

    // 8. Create period action
    await tenantDb.accountingPeriodAction.create({
      data: {
        period_id: periodId,
        action: 'OPEN',
        is_manual: true,
        journal_entry_id: result.id,
        reason: finalDescription,
        created_by: userId,
      },
    });

    return {
      journal_entry_id: result.id,
      consecutive: result.consecutive,
      items_count: items.length,
      cxc_count: cxcRows.length,
      cxp_count: cxpRows.length,
      prepayments_count: prepaymentRows.length,
    };
  }

  async reverseOpeningBalance(
    companyId: string,
    periodId: string,
    actionId: string,
    userId: string,
  ) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);

    const action = await tenantDb.accountingPeriodAction.findUnique({
      where: { id: actionId },
      include: {
        journal_entry: { select: { id: true, is_reversed: true, date: true } },
      },
    });

    if (!action) throw new NotFoundException('Acción no encontrada');
    if (action.period_id !== periodId) throw new BadRequestException('La acción no pertenece a este período');
    if (!action.is_manual) throw new BadRequestException('Solo se pueden reversar acciones manuales');
    if (action.action !== 'OPEN') throw new BadRequestException('Solo se pueden reversar acciones de apertura');
    if (!action.journal_entry_id || !action.journal_entry) {
      throw new BadRequestException('La acción no tiene asiento contable asociado');
    }
    if (action.journal_entry.is_reversed) {
      throw new BadRequestException('El asiento ya fue reversado');
    }

    const reversalDate = action.journal_entry.date || new Date();
    const result = await this.journalEntriesService.reverseComplete(
      companyId,
      action.journal_entry_id,
      reversalDate,
    );

    return {
      reversal_journal_entry_id: result.id,
      reversal_consecutive: result.consecutive,
    };
  }

  // ========== Private: Parse Excel ==========

  private async parseExcel(companyId: string, fileBuffer: Buffer): Promise<ParseResult> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    const [accounts, thirdParties, bankAccounts, costCenters, ccMovementTypes] = await Promise.all([
      tenantDb.chartOfAccount.findMany({
        where: { is_active: true },
        select: { code: true, name: true },
      }),
      tenantDb.thirdParty.findMany({
        where: { is_active: true },
        select: { id: true, identification_number: true, name: true },
      }),
      tenantDb.bankAccount.findMany({
        where: { is_active: true },
        select: { id: true, account_name: true },
      }),
      hasCostCentersModule
        ? tenantDb.costCenter.findMany({
            where: { is_active: true },
            select: { id: true, consecutive: true, name: true },
          })
        : [],
      hasCostCentersModule
        ? tenantDb.costCenterMovementType.findMany({ select: { key: true, name: true } })
        : [],
    ]);

    const accountMap = new Map<string, any>(accounts.map((a: any) => [a.code, a]));
    const thirdPartyByNit = new Map<string, any>(
      thirdParties
        .filter((t: any) => t.identification_number)
        .map((t: any) => [t.identification_number, t] as [string, any]),
    );
    const bankByName = new Map<string, any>(bankAccounts.map((b: any) => [b.account_name, b] as [string, any]));
    const ccByConsecutive = new Map<string, any>(costCenters.map((c: any) => [c.consecutive, c] as [string, any]));
    const ccTypeByKey = new Map<string, any>(ccMovementTypes.map((t: any) => [t.key, t] as [string, any]));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const errors: string[] = [];

    const extractCode = (val: any): string | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/^(\S+)\s*[—–-]\s*/);
      return match ? match[1] : str;
    };

    const extractNit = (val: any): string | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/^(\S+)\s*[—–-]\s*/);
      return match ? match[1] : str;
    };

    const extractBankName = (val: any): string | null => {
      if (!val) return null;
      return String(val).trim();
    };

    const extractCcConsecutive = (val: any): string | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/^(\S+)\s*[—–-]\s*/);
      return match ? match[1] : str;
    };

    const extractCcTypeKey = (val: any): string | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/^(\S+)\s*[—–-]\s*/);
      return match ? match[1] : str;
    };

    const resolveCostCenter = (
      rowLabel: string,
      ccVal: any,
      ccTypeVal: any,
    ): { cost_center_id: string | null; cost_center_name: string | null; cost_center_movement_type_key: string | null; cost_center_movement_type_name: string | null } => {
      if (!hasCostCentersModule) return { cost_center_id: null, cost_center_name: null, cost_center_movement_type_key: null, cost_center_movement_type_name: null };

      const ccConsecutive = extractCcConsecutive(ccVal);
      const ccTypeKey = extractCcTypeKey(ccTypeVal);

      if (!ccConsecutive) {
        errors.push(`${rowLabel}: Centro de Costos es requerido`);
        return { cost_center_id: null, cost_center_name: null, cost_center_movement_type_key: null, cost_center_movement_type_name: null };
      }
      if (!ccTypeKey) {
        errors.push(`${rowLabel}: Tipo CC es requerido`);
        return { cost_center_id: null, cost_center_name: null, cost_center_movement_type_key: null, cost_center_movement_type_name: null };
      }

      const cc = ccByConsecutive.get(ccConsecutive);
      if (!cc) {
        errors.push(`${rowLabel}: Centro de Costos "${ccConsecutive}" no encontrado`);
        return { cost_center_id: null, cost_center_name: null, cost_center_movement_type_key: null, cost_center_movement_type_name: null };
      }

      const ccType = ccTypeByKey.get(ccTypeKey);
      if (!ccType) {
        errors.push(`${rowLabel}: Tipo CC "${ccTypeKey}" no encontrado`);
        return { cost_center_id: null, cost_center_name: null, cost_center_movement_type_key: null, cost_center_movement_type_name: null };
      }

      return { cost_center_id: cc.id, cost_center_name: `${cc.consecutive} — ${cc.name}`, cost_center_movement_type_key: ccType.key, cost_center_movement_type_name: ccType.name };
    };

    // ========== Parse SALDOS ==========
    const saldosSheet = workbook.getWorksheet('Saldos');
    const saldoRows: ParsedSaldoRow[] = [];

    if (saldosSheet) {
      saldosSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const accountVal = row.getCell(1).value;
        const amountVal = row.getCell(2).value;
        const typeVal = row.getCell(3).value;

        if (!accountVal && !amountVal) return;

        const accountCode = extractCode(accountVal);
        const amount = Number(amountVal) || 0;
        const typeStr = typeVal ? String(typeVal).trim() : '';
        const descriptionVal = row.getCell(4).value;
        const thirdPartyVal = row.getCell(5).value;
        const bankVal = row.getCell(6).value;
        const ccCol = hasCostCentersModule ? 7 : -1;
        const ccTypeCol = hasCostCentersModule ? 8 : -1;

        const rowLabel = `Saldos fila ${rowNum}`;

        if (!accountCode) { errors.push(`${rowLabel}: Cuenta es requerida`); return; }
        if (amount <= 0) { errors.push(`${rowLabel}: Valor debe ser mayor a 0`); return; }
        if (typeStr !== 'Débito' && typeStr !== 'Crédito') { errors.push(`${rowLabel}: Tipo debe ser "Débito" o "Crédito"`); return; }
        if (!accountMap.has(accountCode)) { errors.push(`${rowLabel}: Cuenta "${accountCode}" no encontrada`); return; }

        const lineType: 'DEBIT' | 'CREDIT' = typeStr === 'Débito' ? 'DEBIT' : 'CREDIT';
        const account = accountMap.get(accountCode);

        let thirdPartyId: string | null = null;
        let thirdPartyName: string | null = null;
        const nit = extractNit(thirdPartyVal);
        if (nit) {
          const tp = thirdPartyByNit.get(nit);
          if (!tp) { errors.push(`${rowLabel}: Tercero con NIT "${nit}" no encontrado`); return; }
          thirdPartyId = tp.id;
          thirdPartyName = tp.name;
        }

        let bankAccountId: string | null = null;
        let bankAccountName: string | null = null;
        const bankName = extractBankName(bankVal);
        if (bankName) {
          const bank = bankByName.get(bankName);
          if (!bank) { errors.push(`${rowLabel}: Banco "${bankName}" no encontrado`); return; }
          bankAccountId = bank.id;
          bankAccountName = bank.account_name;
        }

        const cc = resolveCostCenter(
          rowLabel,
          ccCol > 0 ? row.getCell(ccCol).value : null,
          ccTypeCol > 0 ? row.getCell(ccTypeCol).value : null,
        );

        saldoRows.push({
          account_code: accountCode,
          account_name: account.name,
          amount,
          type: lineType,
          description: descriptionVal ? String(descriptionVal) : null,
          third_party_id: thirdPartyId,
          third_party_name: thirdPartyName,
          bank_account_id: bankAccountId,
          bank_account_name: bankAccountName,
          ...cc,
        });
      });
    }

    // ========== Parse CxC ==========
    const cxcSheet = workbook.getWorksheet('CxC');
    const cxcRows: ParsedCxRow[] = [];

    if (cxcSheet) {
      cxcSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const thirdPartyVal = row.getCell(1).value;
        const descriptionVal = row.getCell(2).value;
        const amountVal = row.getCell(3).value;
        const dueDateVal = row.getCell(4).value;
        const accountVal = row.getCell(5).value;
        const ccCol = hasCostCentersModule ? 6 : -1;
        const ccTypeCol = hasCostCentersModule ? 7 : -1;

        if (!thirdPartyVal && !amountVal) return;

        const rowLabel = `CxC fila ${rowNum}`;
        const nit = extractNit(thirdPartyVal);
        const amount = Number(amountVal) || 0;
        const accountCode = extractCode(accountVal);

        if (!nit) { errors.push(`${rowLabel}: NIT Tercero es requerido`); return; }
        if (amount <= 0) { errors.push(`${rowLabel}: Monto debe ser mayor a 0`); return; }
        if (!accountCode) { errors.push(`${rowLabel}: Cuenta CxC es requerida`); return; }
        if (!dueDateVal) { errors.push(`${rowLabel}: Fecha Vencimiento es requerida`); return; }

        const tp = thirdPartyByNit.get(nit);
        if (!tp) { errors.push(`${rowLabel}: Tercero con NIT "${nit}" no encontrado`); return; }
        if (!accountMap.has(accountCode)) { errors.push(`${rowLabel}: Cuenta "${accountCode}" no encontrada`); return; }

        let dueDate: Date;
        if (dueDateVal instanceof Date) {
          dueDate = dueDateVal;
        } else {
          dueDate = new Date(String(dueDateVal));
          if (isNaN(dueDate.getTime())) { errors.push(`${rowLabel}: Fecha Vencimiento "${dueDateVal}" no es válida`); return; }
        }

        const account = accountMap.get(accountCode);
        const cc = resolveCostCenter(
          rowLabel,
          ccCol > 0 ? row.getCell(ccCol).value : null,
          ccTypeCol > 0 ? row.getCell(ccTypeCol).value : null,
        );

        cxcRows.push({
          third_party_id: tp.id,
          third_party_name: tp.name,
          description: descriptionVal ? String(descriptionVal) : null,
          amount,
          due_date: dueDate,
          account_code: accountCode,
          account_name: account.name,
          ...cc,
        });
      });
    }

    // ========== Parse CxP ==========
    const cxpSheet = workbook.getWorksheet('CxP');
    const cxpRows: ParsedCxRow[] = [];

    if (cxpSheet) {
      cxpSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const thirdPartyVal = row.getCell(1).value;
        const descriptionVal = row.getCell(2).value;
        const amountVal = row.getCell(3).value;
        const dueDateVal = row.getCell(4).value;
        const accountVal = row.getCell(5).value;
        const ccCol = hasCostCentersModule ? 6 : -1;
        const ccTypeCol = hasCostCentersModule ? 7 : -1;

        if (!thirdPartyVal && !amountVal) return;

        const rowLabel = `CxP fila ${rowNum}`;
        const nit = extractNit(thirdPartyVal);
        const amount = Number(amountVal) || 0;
        const accountCode = extractCode(accountVal);

        if (!nit) { errors.push(`${rowLabel}: NIT Tercero es requerido`); return; }
        if (amount <= 0) { errors.push(`${rowLabel}: Monto debe ser mayor a 0`); return; }
        if (!accountCode) { errors.push(`${rowLabel}: Cuenta CxP es requerida`); return; }
        if (!dueDateVal) { errors.push(`${rowLabel}: Fecha Vencimiento es requerida`); return; }

        const tp = thirdPartyByNit.get(nit);
        if (!tp) { errors.push(`${rowLabel}: Tercero con NIT "${nit}" no encontrado`); return; }
        if (!accountMap.has(accountCode)) { errors.push(`${rowLabel}: Cuenta "${accountCode}" no encontrada`); return; }

        let dueDate: Date;
        if (dueDateVal instanceof Date) {
          dueDate = dueDateVal;
        } else {
          dueDate = new Date(String(dueDateVal));
          if (isNaN(dueDate.getTime())) { errors.push(`${rowLabel}: Fecha Vencimiento "${dueDateVal}" no es válida`); return; }
        }

        const account = accountMap.get(accountCode);
        const cc = resolveCostCenter(
          rowLabel,
          ccCol > 0 ? row.getCell(ccCol).value : null,
          ccTypeCol > 0 ? row.getCell(ccTypeCol).value : null,
        );

        cxpRows.push({
          third_party_id: tp.id,
          third_party_name: tp.name,
          description: descriptionVal ? String(descriptionVal) : null,
          amount,
          due_date: dueDate,
          account_code: accountCode,
          account_name: account.name,
          ...cc,
        });
      });
    }

    // ========== Parse Anticipos ==========
    const anticiposSheet = workbook.getWorksheet('Anticipos');
    const prepaymentRows: ParsedPrepaymentRow[] = [];

    if (anticiposSheet) {
      anticiposSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const thirdPartyVal = row.getCell(1).value;
        const typeVal = row.getCell(2).value;
        const amountVal = row.getCell(3).value;
        const accountVal = row.getCell(4).value;
        const ccCol = hasCostCentersModule ? 5 : -1;
        const ccTypeCol = hasCostCentersModule ? 6 : -1;

        if (!thirdPartyVal && !amountVal) return;

        const rowLabel = `Anticipos fila ${rowNum}`;
        const nit = extractNit(thirdPartyVal);
        const amount = Number(amountVal) || 0;
        const accountCode = extractCode(accountVal);
        const typeStr = typeVal ? String(typeVal).trim() : '';

        if (!nit) { errors.push(`${rowLabel}: NIT Tercero es requerido`); return; }
        if (amount <= 0) { errors.push(`${rowLabel}: Monto debe ser mayor a 0`); return; }
        if (!accountCode) { errors.push(`${rowLabel}: Cuenta es requerida`); return; }
        const prepTypeMap: Record<string, 'customer' | 'supplier' | 'employee'> = {
          'Cliente': 'customer',
          'Proveedor': 'supplier',
          'Empleado': 'employee',
        };
        if (!prepTypeMap[typeStr]) {
          errors.push(`${rowLabel}: Tipo debe ser "Cliente", "Proveedor" o "Empleado"`);
          return;
        }

        const tp = thirdPartyByNit.get(nit);
        if (!tp) { errors.push(`${rowLabel}: Tercero con NIT "${nit}" no encontrado`); return; }
        if (!accountMap.has(accountCode)) { errors.push(`${rowLabel}: Cuenta "${accountCode}" no encontrada`); return; }

        const account = accountMap.get(accountCode);
        const cc = resolveCostCenter(
          rowLabel,
          ccCol > 0 ? row.getCell(ccCol).value : null,
          ccTypeCol > 0 ? row.getCell(ccTypeCol).value : null,
        );

        prepaymentRows.push({
          third_party_id: tp.id,
          third_party_name: tp.name,
          type: prepTypeMap[typeStr],
          amount,
          account_code: accountCode,
          account_name: account.name,
          ...cc,
        });
      });
    }

    // Compute totals
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const row of saldoRows) {
      if (row.type === 'DEBIT') totalDebit = totalDebit.plus(new Decimal(row.amount));
      else totalCredit = totalCredit.plus(new Decimal(row.amount));
    }
    for (const row of cxcRows) {
      totalDebit = totalDebit.plus(new Decimal(row.amount));
    }
    for (const row of cxpRows) {
      totalCredit = totalCredit.plus(new Decimal(row.amount));
    }
    for (const row of prepaymentRows) {
      if (row.type === 'customer') totalCredit = totalCredit.plus(new Decimal(row.amount));
      else totalDebit = totalDebit.plus(new Decimal(row.amount));
    }

    return {
      saldoRows,
      cxcRows,
      cxpRows,
      prepaymentRows,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      errors,
    };
  }
}
