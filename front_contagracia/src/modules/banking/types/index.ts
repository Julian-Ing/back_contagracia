export type BankAccountType = 'SAVINGS' | 'CHECKING' | 'CASH';

export interface BankAccount {
  id: string;
  account_type: BankAccountType;
  bank_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string;
  account_id: string | null;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface BankAccountsResponse {
  data: BankAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BankAccountFilters {
  search?: string;
  type?: BankAccountType;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface UpdateBankAccountData {
  account_name?: string;
  account_number?: string;
  account_id?: string;
  is_active?: boolean;
}

export interface CanDeleteBankAccountResponse {
  canDelete: boolean;
  reason?: string;
  journalItemsCount: number;
  bankMovementsCount: number;
  documentBankPaymentsCount: number;
  receiptLinesCount: number;
  reconciliationsCount: number;
  prepaymentsCount: number;
}

export interface BankMovement {
  id: string;
  consecutive: string;
  transaction_date: string;
  amount: number;
  type_key: string;
  type_description: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  reference_consecutive: string;
  created_at: string;
}

export interface BankMovementsResponse {
  data: BankMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BankMovementFilters {
  bank_account_id: string;
  search?: string;
  type_key?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

// Colores por tipo de cuenta
export const BANK_ACCOUNT_TYPE_COLORS: Record<BankAccountType, string> = {
  SAVINGS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CHECKING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CASH: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  SAVINGS: 'Ahorros',
  CHECKING: 'Corriente',
  CASH: 'Caja',
};

// Tipos de movimiento por categoría
export const INCOME_MOVEMENT_TYPES = [
  'invoice_receivable_payment',
  'invoice_debit_note_receivable_payment',
  'expense_return_receivable_payment',
  'purchase_return_receivable_payment',
  'manual_receivable_payment',
  'client_prepayment',
  'supplier_prepayment_refund',
  'fixed_asset_sale',
  'invoice_voucher',
];

export const EXPENSE_MOVEMENT_TYPES = [
  'invoice_credit_note_payable_payment',
  'expense_payable_payment',
  'purchase_payable_payment',
  'manual_payable_payment',
  'supplier_prepayment',
  'client_prepayment_refund',
  'travel_expense_advance',
  'tax_payable',
  'tax_payable_iva',
  'tax_payable_inc',
  'tax_payable_retefuente',
  'tax_payable_reteiva',
  'tax_payable_reteica',
  'payroll',
  'liquidation_service_bonus',
  'liquidation_severance',
  'liquidation_vacation',
  'liquidation_end_contract',
  'expense_voucher',
];

export const BANK_MOVEMENT_TYPES = [
  'bank_transfer',
  'bank_adjustment',
  'bank_account_opening',
  'bank_reconciliation_adjustment',
];

export function getMovementTypeColor(typeKey: string): string {
  if (INCOME_MOVEMENT_TYPES.includes(typeKey)) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
  if (EXPENSE_MOVEMENT_TYPES.includes(typeKey)) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }
  if (BANK_MOVEMENT_TYPES.includes(typeKey)) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}
