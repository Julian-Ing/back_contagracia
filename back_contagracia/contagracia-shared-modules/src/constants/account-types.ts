/**
 * Mapeo de tipos de cuenta contable según PUC Colombia
 */

export const ACCOUNT_TYPE_CLASS = {
  ASSET: 1,             // Activo
  LIABILITY: 2,         // Pasivo
  EQUITY: 3,            // Patrimonio
  INCOME: 4,            // Ingresos
  EXPENSE: 5,           // Gastos
  COST: 6,              // Costos
  PRODUCTION_COST: 7,   // Costos de Producción
  DEBTOR_ACCOUNTS: 8,   // Cuentas Deudoras
  CREDITOR_ACCOUNTS: 9, // Cuentas Acreedoras
} as const;

export const ACCOUNT_CLASS_TYPE = {
  1: 'ASSET',
  2: 'LIABILITY',
  3: 'EQUITY',
  4: 'INCOME',
  5: 'EXPENSE',
  6: 'COST',
  7: 'PRODUCTION_COST',
  8: 'DEBTOR_ACCOUNTS',
  9: 'CREDITOR_ACCOUNTS',
} as const;

export const ACCOUNT_TYPE_NAMES = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  INCOME: 'Ingresos',
  EXPENSE: 'Gastos',
  COST: 'Costos',
  PRODUCTION_COST: 'Costos de Producción',
  DEBTOR_ACCOUNTS: 'Cuentas Deudoras',
  CREDITOR_ACCOUNTS: 'Cuentas Acreedoras',
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPE_CLASS;
export type AccountClass = (typeof ACCOUNT_TYPE_CLASS)[AccountType];

/**
 * Obtiene la clase (1-9) a partir del tipo de cuenta
 */
export function getAccountClass(type: AccountType): number {
  return ACCOUNT_TYPE_CLASS[type];
}

/**
 * Obtiene el tipo de cuenta a partir de la clase (1-9)
 */
export function getAccountType(accountClass: number): AccountType | undefined {
  return ACCOUNT_CLASS_TYPE[accountClass as keyof typeof ACCOUNT_CLASS_TYPE] as AccountType;
}

/**
 * Obtiene el nombre en español del tipo de cuenta
 */
export function getAccountTypeName(type: AccountType): string {
  return ACCOUNT_TYPE_NAMES[type];
}

/**
 * Detecta el tipo de cuenta basado en el código PUC (primer dígito)
 */
export function detectAccountTypeFromCode(code: string): AccountType | undefined {
  const firstDigit = parseInt(code.charAt(0), 10);
  if (firstDigit >= 1 && firstDigit <= 9) {
    return getAccountType(firstDigit);
  }
  return undefined;
}
