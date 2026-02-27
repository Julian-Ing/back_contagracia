import { BankAccountType } from '@prisma/client-tenant';

/**
 * Cuentas bancarias por defecto
 * account_config_key: referencia a AccountingConfig para obtener el account_id
 */
export const bankAccounts = [
  {
    account_name: 'Caja General',
    account_type: 'CASH' as BankAccountType,
    account_config_key: 'finance_cash_account',
  },
];
