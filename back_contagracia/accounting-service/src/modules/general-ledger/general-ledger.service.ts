import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { ACCOUNT_NATURE_MAP } from './general-ledger.constants';

const OPENING_BALANCE_TYPE = 'opening_balance';

export interface GeneralLedgerMovement {
  date: Date;
  consecutive: string;
  description: string | null;
  third_party_name: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerAccount {
  code: string;
  name: string;
  type: string;
  nature: 'DEBIT' | 'CREDIT';
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  movements: GeneralLedgerMovement[];
}

export interface GeneralLedgerResult {
  from_date: Date;
  to_date: Date;
  accounts: GeneralLedgerAccount[];
  grand_total_debits: number;
  grand_total_credits: number;
}

@Injectable()
export class GeneralLedgerService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async getGeneralLedger(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<GeneralLedgerResult> {
    const tenantDb = await this.getTenantDb(companyId);

    // Inicio del año fiscal (01/01 del año de dateFrom)
    const yearStart = new Date(dateFrom.getFullYear(), 0, 1);
    const isFromYearStart =
      dateFrom.getFullYear() === yearStart.getFullYear() &&
      dateFrom.getMonth() === 0 &&
      dateFrom.getDate() === 1;

    // ── 1. Cuentas con movimientos reales (no-SI) en el período ──────────────
    const codesInPeriod = await tenantDb.journalEntryItem.findMany({
      where: {
        journal_entry: {
          date: { gte: dateFrom, lte: dateTo },
          type_key: { not: OPENING_BALANCE_TYPE },
        },
      },
      select: { account_code: true },
      distinct: ['account_code'],
    });

    if (codesInPeriod.length === 0) {
      return {
        from_date: dateFrom,
        to_date: dateTo,
        accounts: [],
        grand_total_debits: 0,
        grand_total_credits: 0,
      };
    }

    const accountCodes = codesInPeriod.map((r) => r.account_code);

    // ── 2. Info de cuentas ───────────────────────────────────────────────────
    const accounts = await tenantDb.chartOfAccount.findMany({
      where: { code: { in: accountCodes } },
      select: { code: true, name: true, type: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    // ── 3. Saldo Inicial (asientos opening_balance datados en 01/01 del año) ─
    const siTotals = await tenantDb.journalEntryItem.groupBy({
      by: ['account_code', 'type'],
      where: {
        account_code: { in: accountCodes },
        journal_entry: {
          type_key: OPENING_BALANCE_TYPE,
          date: { gte: yearStart },
        },
      },
      _sum: { amount: true },
    });

    const siMap = new Map<string, { debit: number; credit: number }>();
    for (const row of siTotals) {
      if (!siMap.has(row.account_code)) {
        siMap.set(row.account_code, { debit: 0, credit: 0 });
      }
      const e = siMap.get(row.account_code)!;
      if (row.type === 'DEBIT') {
        e.debit += Number(row._sum.amount ?? 0);
      } else {
        e.credit += Number(row._sum.amount ?? 0);
      }
    }

    // ── 4. Si dateFrom > 01/01: movimientos no-SI entre 01/01 y dateFrom-1 ──
    const prePeriodMap = new Map<string, { debit: number; credit: number }>();

    if (!isFromYearStart) {
      const oneDayBeforeDateFrom = new Date(dateFrom);
      oneDayBeforeDateFrom.setDate(oneDayBeforeDateFrom.getDate() - 1);

      const preTotals = await tenantDb.journalEntryItem.groupBy({
        by: ['account_code', 'type'],
        where: {
          account_code: { in: accountCodes },
          journal_entry: {
            date: { gte: yearStart, lte: oneDayBeforeDateFrom },
            type_key: { not: OPENING_BALANCE_TYPE },
          },
        },
        _sum: { amount: true },
      });

      for (const row of preTotals) {
        if (!prePeriodMap.has(row.account_code)) {
          prePeriodMap.set(row.account_code, { debit: 0, credit: 0 });
        }
        const e = prePeriodMap.get(row.account_code)!;
        if (row.type === 'DEBIT') {
          e.debit += Number(row._sum.amount ?? 0);
        } else {
          e.credit += Number(row._sum.amount ?? 0);
        }
      }
    }

    // ── 5. Movimientos del período (no-SI, [dateFrom, dateTo]) ───────────────
    const items = await tenantDb.journalEntryItem.findMany({
      where: {
        account_code: { in: accountCodes },
        journal_entry: {
          date: { gte: dateFrom, lte: dateTo },
          type_key: { not: OPENING_BALANCE_TYPE },
        },
      },
      include: {
        journal_entry: {
          select: { id: true, consecutive: true, date: true, description: true },
        },
        third_party: { select: { name: true } },
      },
      orderBy: [
        { journal_entry: { date: 'asc' } },
        { journal_entry: { created_at: 'asc' } },
      ],
    });

    // Agrupar por cuenta
    const movementsByAccount = new Map<string, typeof items>();
    for (const item of items) {
      if (!movementsByAccount.has(item.account_code)) {
        movementsByAccount.set(item.account_code, []);
      }
      movementsByAccount.get(item.account_code)!.push(item);
    }

    // ── 6. Construir resultado ───────────────────────────────────────────────
    let grandTotalDebits = 0;
    let grandTotalCredits = 0;

    const ledgerAccounts: GeneralLedgerAccount[] = accountCodes
      .sort()
      .map((code) => {
        const accountInfo = accountMap.get(code);
        if (!accountInfo) return null;

        const nature: 'DEBIT' | 'CREDIT' =
          ACCOUNT_NATURE_MAP[accountInfo.type as keyof typeof ACCOUNT_NATURE_MAP] ?? 'DEBIT';

        // Saldo apertura = SI ± movimientos pre-período
        const si = siMap.get(code) ?? { debit: 0, credit: 0 };
        const pre = prePeriodMap.get(code) ?? { debit: 0, credit: 0 };

        const siBalance =
          nature === 'DEBIT'
            ? si.debit - si.credit
            : si.credit - si.debit;

        const preBalance =
          nature === 'DEBIT'
            ? pre.debit - pre.credit
            : pre.credit - pre.debit;

        const openingBalance = siBalance + preBalance;

        // Movimientos del período con saldo corrido
        const periodItems = movementsByAccount.get(code) ?? [];
        let runningBalance = openingBalance;
        let totalDebits = 0;
        let totalCredits = 0;

        const movements: GeneralLedgerMovement[] = periodItems.map((item) => {
          const debit = item.type === 'DEBIT' ? Number(item.amount) : 0;
          const credit = item.type === 'CREDIT' ? Number(item.amount) : 0;
          totalDebits += debit;
          totalCredits += credit;

          runningBalance += nature === 'DEBIT' ? debit - credit : credit - debit;

          return {
            date: item.journal_entry.date,
            consecutive: item.journal_entry.consecutive ?? '',
            description: item.description ?? item.journal_entry.description,
            third_party_name: item.third_party?.name ?? null,
            debit,
            credit,
            balance: runningBalance,
          };
        });

        grandTotalDebits += totalDebits;
        grandTotalCredits += totalCredits;

        const closingBalance =
          nature === 'DEBIT'
            ? openingBalance + totalDebits - totalCredits
            : openingBalance + totalCredits - totalDebits;

        return {
          code,
          name: accountInfo.name,
          type: accountInfo.type as string,
          nature,
          opening_balance: openingBalance,
          total_debits: totalDebits,
          total_credits: totalCredits,
          closing_balance: closingBalance,
          movements,
        };
      })
      .filter((a) => a !== null) as GeneralLedgerAccount[];

    return {
      from_date: dateFrom,
      to_date: dateTo,
      accounts: ledgerAccounts,
      grand_total_debits: grandTotalDebits,
      grand_total_credits: grandTotalCredits,
    };
  }
}
