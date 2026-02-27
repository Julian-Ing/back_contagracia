/* ── Enums matching backend ───────────────────────────────── */

export type ArApType = 'RECEIVABLE' | 'PAYABLE';
export type ArApStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'VOIDED';
export type PaymentReceiptStatus = 'ACTIVE' | 'VOIDED';
export type BucketFilter = 'all' | 'overdue' | '0-30' | '31-60' | '60+';
export type SummaryTab = 'pending' | 'paid' | 'all';

/* ── Summary by third party ──────────────────────────────── */

export interface ArApSummaryItem {
  third_party_id: string;
  third_party_name: string;
  third_party_document: string;
  total_amount: number;
  total_paid: number;
  total_balance: number;
  total_docs: number;
  pending_docs: number;
  paid_docs: number;
  last_doc_date: string | null;
  last_payment_date: string | null;
  avg_overdue_days: number;
}

export interface ArApSummaryResponse {
  data: ArApSummaryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ArApSummaryFilters {
  type: ArApType;
  search?: string;
  bucket?: BucketFilter;
  tab?: SummaryTab;
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
}

/* ── Sources (ar_ap_sources) ──────────────────────────────── */

export interface ArApSourceItem {
  key: string;
  description: string;
}

/* ── Third party detail ──────────────────────────────────── */

export interface ArApTransaction {
  id: string;
  source_key: string;
  source_description: string;
  description: string | null;
  source_number: string | null;
  consecutive: string | null;
  date: string;
  due_date: string | null;
  amount: number;
  paid: number;
  balance: number;
  status: ArApStatus;
  account_code: string | null;
  account_name: string | null;
  days_overdue: number;
  days_due: number;
}

export interface ArApPayment {
  id: string;
  consecutive: string | null;
  date: string;
  amount: number;
  payment_method_name: string | null;
  source_description: string | null;
  bank_account_name: string | null;
  receipt_id: string | null;
  receipt_consecutive: string | null;
  description: string | null;
}

export interface ArApDetailResponse {
  transactions: ArApTransaction[];
  payments: ArApPayment[];
  txTotal: number;
  txPage: number;
  txTotalPages: number;
}

export interface ArApDetailFilters {
  type: ArApType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
  statuses?: ArApStatus[];
  overdue?: 'all' | 'overdue' | 'current';
}

/* ── Payment receipts ────────────────────────────────────── */

export interface PaymentReceiptItem {
  id: string;
  consecutive: string | null;
  description: string | null;
  third_party_name: string | null;
  third_party_document: string | null;
  date: string;
  amount: number;
  income_amount: number;
  expense_amount: number;
  bank_amount: number;
  document_amount: number;
  client_prepayment_amount: number;
  supplier_prepayment_amount: number;
  status: PaymentReceiptStatus;
  has_journal: boolean;
}

export interface PaymentReceiptsResponse {
  data: PaymentReceiptItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentReceiptsFilters {
  type: ArApType;
  exclude_types?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/* ── Third party payments (paginated) ─────────────────────── */

export interface ThirdPartyPaymentItem {
  id: string;
  consecutive: string | null;
  date: string;
  amount: number;
  payment_method_name: string | null;
  source_description: string | null;
  receipt_id: string | null;
  receipt_consecutive: string | null;
  description: string | null;
  ar_ap_consecutive: string | null;
  ar_ap_source_number: string | null;
}

export interface ThirdPartyPaymentsResponse {
  data: ThirdPartyPaymentItem[];
  total: number;
  page: number;
  totalPages: number;
}

/* ── Payment receipt detail ──────────────────────────────── */

export interface PaymentReceiptLineDetail {
  id: string;
  kind: 'DOC' | 'BANK' | 'PREP_USED' | 'ACCOUNT' | 'CXC_CREATED' | 'CXP_CREATED';
  account_code: string;
  debit: number;
  credit: number;
  ref_id: string | null;
  description: string | null;
  company_payment_method: { id: string; name: string } | null;
  account: { code: string; name: string } | null;
  ref_label: string | null;
  ref_current_balance: number | null;
  cost_center: { id: string; consecutive: string; name: string } | null;
  cost_center_movement_type: { key: string; name: string } | null;
}

export interface PaymentReceiptDetail {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE' | 'MANUAL';
  consecutive: string | null;
  date: string;
  amount: number;
  description: string | null;
  status: PaymentReceiptStatus;
  journal_entry_id: string | null;
  third_party: { id: string; name: string; identification_number: string } | null;
  lines: PaymentReceiptLineDetail[];
}

/* ── Company payment methods ─────────────────────────────── */

export interface CompanyPaymentMethod {
  id: string;
  consecutive: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  payment_method_id: string;
  payment_method_name: string;
  payment_method_code: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyPaymentMethodsResponse {
  data: CompanyPaymentMethod[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DianPaymentMethod {
  id: string;
  name: string;
  code: string;
}

/* ── Prepayments ───────────────────────────────────────────── */

export type PrepaymentType = 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE';
export type PrepaymentStatus = 'ACTIVE' | 'APPLIED' | 'REFUNDED' | 'VOIDED';

export interface PrepaymentItem {
  id: string;
  consecutive: string | null;
  prepayment_date: string;
  prepayment_type: PrepaymentType;
  original_amount: number;
  balance: number;
  account_code: string | null;
  account_name: string | null;
  counterpart_account_code: string | null;
  counterpart_account_name: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  company_payment_method_id: string | null;
  payment_method_name: string | null;
  status: PrepaymentStatus;
  notes: string | null;
  journal_entry_id: string | null;
  third_party_id: string;
  third_party_name: string;
  third_party_document: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  voided_by: string | null;
  refunded_at: string | null;
  refunded_reason: string | null;
  refunded_by: string | null;
  created_at: string;
}

export interface PrepaymentsResponse {
  data: PrepaymentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PrepaymentsFilters {
  search?: string;
  prepayment_type?: PrepaymentType;
  status?: PrepaymentStatus;
  third_party_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface PrepaymentMovementItem {
  id: string;
  consecutive: string | null;
  application_date: string;
  amount: number;
  applied_to_source_key: string | null;
  applied_to_id: string | null;
  applied_to_number: string | null;
  journal_entry_id: string | null;
  is_voided: boolean;
  notes: string | null;
  created_at: string;
  applied_source: { key: string; description: string } | null;
}

export interface PrepaymentDetailData {
  id: string;
  consecutive: string | null;
  prepayment_date: string;
  prepayment_type: PrepaymentType;
  original_amount: number;
  balance: number;
  account_code: string | null;
  counterpart_account_code: string | null;
  bank_account_id: string | null;
  company_payment_method_id: string | null;
  journal_entry_id: string | null;
  status: PrepaymentStatus;
  notes: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  voided_by: string | null;
  refunded_at: string | null;
  refunded_reason: string | null;
  refunded_by: string | null;
  created_at: string;
  third_party: { id: string; name: string; identification_number: string };
  account: { code: string; name: string } | null;
  counterpart_account: { code: string; name: string } | null;
  bank_account: { id: string; account_name: string; account_number: string } | null;
  company_payment_method: { id: string; name: string } | null;
}

export interface PrepaymentMovementsResponse {
  data: PrepaymentMovementItem[];
  sources: { key: string; description: string }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PrepaymentMovementsFilters {
  search?: string;
  source_key?: string;
  is_voided?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}
