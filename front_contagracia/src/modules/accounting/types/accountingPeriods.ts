export type PeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED';
export type PeriodActionType = 'OPEN' | 'CLOSE' | 'REOPEN' | 'ADJUST';

export interface AccountingPeriod {
  id: string;
  consecutive: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  is_annual: boolean;
  parent_period_id: string | null;
  parent_period_name: string | null;
  status: PeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  description: string | null;
  actions_count: number;
  child_periods_count?: number;
  created_at: string;
}

export interface AccountingPeriodAction {
  id: string;
  action: PeriodActionType;
  reason: string | null;
  is_manual: boolean;
  journal_entry_id: string | null;
  journal_entry_consecutive: string | null;
  journal_entry_is_reversed: boolean | null;
  created_by: string | null;
  created_at: string;
}

export interface PreviewSaldoRow {
  account_code: string;
  account_name: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string | null;
  third_party_name: string | null;
  bank_account_name: string | null;
  cost_center_name: string | null;
  cost_center_movement_type_name: string | null;
}

export interface PreviewCxRow {
  third_party_name: string;
  description: string | null;
  amount: number;
  due_date: string;
  account_code: string;
  account_name: string;
  cost_center_name: string | null;
  cost_center_movement_type_name: string | null;
}

export interface PreviewPrepaymentRow {
  third_party_name: string;
  type: 'customer' | 'supplier' | 'employee';
  amount: number;
  account_code: string;
  account_name: string;
  cost_center_name: string | null;
  cost_center_movement_type_name: string | null;
}

export interface OpeningBalancePreviewResult {
  saldoRows: PreviewSaldoRow[];
  cxcRows: PreviewCxRow[];
  cxpRows: PreviewCxRow[];
  prepaymentRows: PreviewPrepaymentRow[];
  totalDebit: string;
  totalCredit: string;
  errors: string[];
}

export interface OpeningBalanceImportResult {
  journal_entry_id: string;
  consecutive: string;
  items_count: number;
  cxc_count: number;
  cxp_count: number;
  prepayments_count: number;
}

export interface ReverseOpeningBalanceResult {
  reversal_journal_entry_id: string;
  reversal_consecutive: string;
}

export interface AccountingPeriodsFilters {
  search?: string;
  year?: number;
  status?: PeriodStatus;
  is_annual?: boolean;
  page?: number;
  limit?: number;
}

export interface AccountingPeriodActionsFilters {
  search?: string;
  action?: PeriodActionType;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface AccountingPeriodsResponse {
  data: AccountingPeriod[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccountingPeriodActionsResponse {
  data: AccountingPeriodAction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePeriodData {
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  is_annual?: boolean;
  parent_period_id?: string;
  description?: string;
}

export interface UpdatePeriodData {
  name?: string;
  start_date?: string;
  end_date?: string;
  year?: number;
  is_annual?: boolean;
  description?: string;
}

// ============ CLOSING PREVIEW ============

export type AccountNature = 'DEBIT' | 'CREDIT';

export interface AccountInfo {
  code: string;
  name: string;
  type: string;
  nature: AccountNature;
}

export interface AccountMovement {
  id: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
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

export interface AccountBalanceResult {
  account: AccountInfo;
  from_date: string;
  to_date: string;
  with_children: boolean;
  accounts_included: AccountInfo[];
  total_debits: number;
  total_credits: number;
  balance: number;
  movements: AccountMovement[];
  movements_count: number;
}

export interface ClosingPreviewResult {
  period: {
    id: string;
    name: string;
    year: number;
    is_annual: boolean;
    start_date: string;
    end_date: string;
  };
  income: AccountBalanceResult;
  expenses: AccountBalanceResult;
  costs: AccountBalanceResult;
  net_income: number;
}

export interface ClosingConfirmData {
  reason: string;
  closingAccountCode: string;  // Cuenta de cierre (utilidad del ejercicio)
  openingAccountCode: string;  // Cuenta de apertura (resultados anteriores)
}
