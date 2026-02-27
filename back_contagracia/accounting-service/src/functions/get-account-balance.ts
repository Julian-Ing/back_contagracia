import { BadRequestException } from '@nestjs/common';
import { PrismaClientTenant } from '@contagracia/shared-modules';
import { AccountType, JournalEntryItemType } from '@prisma/client-tenant';

export type AccountNature = 'DEBIT' | 'CREDIT';

const ACCOUNT_NATURE_MAP: Record<AccountType, AccountNature> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
  EXPENSE: 'DEBIT',
  COST: 'DEBIT',
  PRODUCTION_COST: 'DEBIT',
  DEBTOR_ACCOUNTS: 'DEBIT',
  CREDITOR_ACCOUNTS: 'CREDIT',
};

export interface AccountMovement {
  id: string;
  date: Date;
  type: JournalEntryItemType;
  amount: number;
  description: string | null;
  account_code: string;
  account_name: string;
  journal_entry_id: string;
  journal_entry_consecutive: string;
  journal_entry_description: string | null;
  third_party_id: string | null;
  third_party_name: string | null;
  third_party_identification: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
}

export interface AccountInfo {
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
}

export interface AccountBalanceResult {
  account: AccountInfo;
  from_date: Date;
  to_date: Date;
  with_children: boolean;
  accounts_included: AccountInfo[];
  total_debits: number;
  total_credits: number;
  balance: number;
  movements: AccountMovement[];
  movements_count: number;
}

/**
 * Obtiene recursivamente todos los códigos de cuentas descendientes
 */
async function getDescendantCodes(
  prisma: PrismaClientTenant,
  parentCode: string
): Promise<string[]> {
  const children = await prisma.chartOfAccount.findMany({
    where: { parent_code: parentCode, is_active: true },
    select: { code: true },
  });

  const codes: string[] = [];
  for (const child of children) {
    codes.push(child.code);
    const descendants = await getDescendantCodes(prisma, child.code);
    codes.push(...descendants);
  }

  return codes;
}

/**
 * Obtiene el saldo de una cuenta contable en un rango de fechas.
 *
 * @param prisma - Cliente Prisma del tenant
 * @param params.account_code - Código de la cuenta
 * @param params.from_date - Fecha desde (inclusivo)
 * @param params.to_date - Fecha hasta (inclusivo)
 * @param params.with_children - Incluir todas las cuentas descendientes (recursivo)
 *
 * @returns Totales, saldo y detalle de todos los movimientos
 */
export async function getAccountBalance(
  prisma: PrismaClientTenant,
  params: {
    account_code: string;
    from_date: Date;
    to_date: Date;
    with_children?: boolean;
  }
): Promise<AccountBalanceResult> {
  const { account_code, from_date, to_date, with_children = false } = params;

  // 1. Obtener cuenta principal
  const mainAccount = await prisma.chartOfAccount.findUnique({
    where: { code: account_code },
    select: { code: true, name: true, type: true },
  });

  if (!mainAccount) {
    throw new BadRequestException(`Cuenta ${account_code} no encontrada`);
  }

  const nature = ACCOUNT_NATURE_MAP[mainAccount.type];

  // 2. Obtener cuentas a incluir
  let accountCodes = [account_code];
  let accountsIncluded: AccountInfo[] = [{
    code: mainAccount.code,
    name: mainAccount.name,
    type: mainAccount.type,
    nature,
  }];

  if (with_children) {
    const descendantCodes = await getDescendantCodes(prisma, account_code);
    accountCodes = [account_code, ...descendantCodes];

    if (descendantCodes.length > 0) {
      const descendants = await prisma.chartOfAccount.findMany({
        where: { code: { in: descendantCodes } },
        select: { code: true, name: true, type: true },
      });

      accountsIncluded = [
        ...accountsIncluded,
        ...descendants.map(a => ({
          code: a.code,
          name: a.name,
          type: a.type,
          nature: ACCOUNT_NATURE_MAP[a.type],
        })),
      ];
    }
  }

  // 3. Calcular totales
  const totals = await prisma.journalEntryItem.groupBy({
    by: ['type'],
    where: {
      account_code: { in: accountCodes },
      journal_entry: {
        date: { gte: from_date, lte: to_date },
      },
    },
    _sum: { amount: true },
  });

  const totalDebits = Number(totals.find(t => t.type === 'DEBIT')?._sum.amount || 0);
  const totalCredits = Number(totals.find(t => t.type === 'CREDIT')?._sum.amount || 0);
  const balance = nature === 'DEBIT' ? totalDebits - totalCredits : totalCredits - totalDebits;

  // 4. Obtener todos los movimientos con detalle
  const items = await prisma.journalEntryItem.findMany({
    where: {
      account_code: { in: accountCodes },
      journal_entry: {
        date: { gte: from_date, lte: to_date },
      },
    },
    include: {
      account: { select: { name: true } },
      journal_entry: { select: { id: true, consecutive: true, date: true, description: true } },
      third_party: { select: { name: true, identification_number: true } },
      bank_account: { select: { account_name: true } },
    },
    orderBy: [
      { journal_entry: { date: 'desc' } },
      { journal_entry: { created_at: 'desc' } },
    ],
  });

  return {
    account: {
      code: mainAccount.code,
      name: mainAccount.name,
      type: mainAccount.type,
      nature,
    },
    from_date,
    to_date,
    with_children,
    accounts_included: accountsIncluded,
    total_debits: totalDebits,
    total_credits: totalCredits,
    balance,
    movements: items.map(item => ({
      id: item.id,
      date: item.journal_entry.date,
      type: item.type,
      amount: Number(item.amount),
      description: item.description,
      account_code: item.account_code,
      account_name: item.account.name,
      journal_entry_id: item.journal_entry.id,
      journal_entry_consecutive: item.journal_entry.consecutive || '',
      journal_entry_description: item.journal_entry.description,
      third_party_id: item.third_party_id,
      third_party_name: item.third_party?.name || null,
      third_party_identification: item.third_party?.identification_number || null,
      bank_account_id: item.bank_account_id,
      bank_account_name: item.bank_account?.account_name || null,
    })),
    movements_count: items.length,
  };
}
