import { PrismaClientTenant } from '@contagracia/shared-modules';

/**
 * Representa el saldo agrupado por cuenta + tercero + banco
 */
export interface ClosingBalanceItem {
  account_code: string;
  account_name: string;
  third_party_id: string | null;
  third_party_name: string | null;
  third_party_identification: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  debit_total: number;
  credit_total: number;
  balance: number; // saldo neto (débitos - créditos)
}

export interface GetClosingBalancesParams {
  /** Prefijos de cuentas a incluir (ej: ['4', '5', '6'] para cierre) */
  accountPrefixes: string[];
  /** Fecha inicio del período */
  fromDate: Date;
  /** Fecha fin del período */
  toDate: Date;
  /** IDs de asientos sin fecha a incluir (del período que se cierra) */
  includeNullDateEntryIds?: string[];
}

export interface ClosingBalancesResult {
  items: ClosingBalanceItem[];
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

/**
 * Obtiene los saldos agrupados por cuenta + tercero + banco
 * Optimizado usando GROUP BY de Prisma
 */
export async function getClosingBalances(
  prisma: PrismaClientTenant,
  params: GetClosingBalancesParams
): Promise<ClosingBalancesResult> {
  const { accountPrefixes, fromDate, toDate, includeNullDateEntryIds = [] } = params;

  // Construir condición de cuentas
  const accountConditions = accountPrefixes.map(prefix => ({
    account_code: { startsWith: prefix },
  }));

  // Construir condición de journal_entry (fecha o IDs específicos)
  const journalEntryCondition: any[] = [
    { date: { gte: fromDate, lte: toDate } },
  ];
  if (includeNullDateEntryIds.length > 0) {
    journalEntryCondition.push({ id: { in: includeNullDateEntryIds } });
  }

  // Dos queries paralelas: débitos y créditos agrupados
  const [debitsData, creditsData] = await Promise.all([
    prisma.journalEntryItem.groupBy({
      by: ['account_code', 'third_party_id', 'bank_account_id'],
      where: {
        type: 'DEBIT',
        OR: accountConditions,
        journal_entry: { OR: journalEntryCondition },
      },
      _sum: { amount: true },
    }),
    prisma.journalEntryItem.groupBy({
      by: ['account_code', 'third_party_id', 'bank_account_id'],
      where: {
        type: 'CREDIT',
        OR: accountConditions,
        journal_entry: { OR: journalEntryCondition },
      },
      _sum: { amount: true },
    }),
  ]);

  // Crear mapa de saldos por key (cuenta|tercero|banco)
  const balanceMap = new Map<string, { debit: number; credit: number; accountCode: string; thirdPartyId: string | null; bankAccountId: string | null }>();

  for (const item of debitsData) {
    const key = `${item.account_code}|${item.third_party_id || ''}|${item.bank_account_id || ''}`;
    balanceMap.set(key, {
      debit: Number(item._sum.amount || 0),
      credit: 0,
      accountCode: item.account_code,
      thirdPartyId: item.third_party_id,
      bankAccountId: item.bank_account_id,
    });
  }

  for (const item of creditsData) {
    const key = `${item.account_code}|${item.third_party_id || ''}|${item.bank_account_id || ''}`;
    const existing = balanceMap.get(key);
    if (existing) {
      existing.credit = Number(item._sum.amount || 0);
    } else {
      balanceMap.set(key, {
        debit: 0,
        credit: Number(item._sum.amount || 0),
        accountCode: item.account_code,
        thirdPartyId: item.third_party_id,
        bankAccountId: item.bank_account_id,
      });
    }
  }

  // Filtrar solo los que tienen saldo != 0
  const itemsWithBalance = Array.from(balanceMap.values())
    .filter(v => Math.abs(v.debit - v.credit) > 0.001);

  if (itemsWithBalance.length === 0) {
    return { items: [], totalDebits: 0, totalCredits: 0, netBalance: 0 };
  }

  // Extraer IDs únicos para obtener nombres
  const accountCodes = [...new Set(itemsWithBalance.map(i => i.accountCode))];
  const thirdPartyIds = [...new Set(itemsWithBalance.map(i => i.thirdPartyId).filter((id): id is string => !!id))];
  const bankAccountIds = [...new Set(itemsWithBalance.map(i => i.bankAccountId).filter((id): id is string => !!id))];

  // Obtener nombres en paralelo
  const [accounts, thirdParties, bankAccounts] = await Promise.all([
    prisma.chartOfAccount.findMany({
      where: { code: { in: accountCodes } },
      select: { code: true, name: true },
    }),
    thirdPartyIds.length > 0
      ? prisma.thirdParty.findMany({
          where: { id: { in: thirdPartyIds } },
          select: { id: true, name: true, identification_number: true },
        })
      : [],
    bankAccountIds.length > 0
      ? prisma.bankAccount.findMany({
          where: { id: { in: bankAccountIds } },
          select: { id: true, account_name: true },
        })
      : [],
  ]);

  // Crear mapas de nombres
  const accountNameMap = new Map<string, string>();
  for (const a of accounts) {
    accountNameMap.set(a.code, a.name);
  }

  const thirdPartyMap = new Map<string, { name: string; identification: string | null }>();
  for (const tp of thirdParties) {
    thirdPartyMap.set(tp.id, { name: tp.name, identification: tp.identification_number });
  }

  const bankAccountMap = new Map<string, string>();
  for (const ba of bankAccounts) {
    bankAccountMap.set(ba.id, ba.account_name);
  }

  // Construir resultado
  let totalDebits = 0;
  let totalCredits = 0;

  const items: ClosingBalanceItem[] = itemsWithBalance.map(item => {
    const thirdPartyInfo = item.thirdPartyId ? thirdPartyMap.get(item.thirdPartyId) : undefined;
    totalDebits += item.debit;
    totalCredits += item.credit;

    return {
      account_code: item.accountCode,
      account_name: accountNameMap.get(item.accountCode) || item.accountCode,
      third_party_id: item.thirdPartyId,
      third_party_name: thirdPartyInfo?.name ?? null,
      third_party_identification: thirdPartyInfo?.identification ?? null,
      bank_account_id: item.bankAccountId,
      bank_account_name: item.bankAccountId ? (bankAccountMap.get(item.bankAccountId) ?? null) : null,
      debit_total: item.debit,
      credit_total: item.credit,
      balance: item.debit - item.credit,
    };
  });

  // Ordenar por código de cuenta
  items.sort((a, b) => a.account_code.localeCompare(b.account_code));

  return {
    items,
    totalDebits,
    totalCredits,
    netBalance: totalDebits - totalCredits,
  };
}
