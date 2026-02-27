export type DocType = 'INVOICE' | 'INVOICE_CREDIT_NOTE' | 'INVOICE_DEBIT_NOTE';
export type DocumentStatus = 'DRAFT' | 'PENDING' | 'PAID';
export type SentToApi = 'NOT_SENT' | 'SUCCESS' | 'ERROR';

export interface DocumentThirdParty {
  id: string;
  name: string | null;
  identification_number: string | null;
}

export interface DocumentListItem {
  id: string;
  doc_type: DocType;
  consecutive: string | null;
  doc_date: string;
  due_date: string | null;
  subtotal: number;
  total_taxes: number;
  total_withholdings: number;
  net_amount: number;
  status: DocumentStatus;
  sent_to_api: SentToApi;
  referenced_doc_id: string | null;
  third_party: DocumentThirdParty | null;
  referencing_docs?: DocumentListItem[];
}

export interface DocumentsResponse {
  data: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DocumentsFilters {
  search?: string;
  docType?: DocType | '';
  status?: DocumentStatus | '';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/* ── Create payload ──────────────────────────────────── */

export interface CreateDocumentItemPayload {
  product_id?: string;
  description?: string;
  quantity: string;
  unit_price: string;
  tax_included: boolean;
  is_discount_rate: boolean;
  discount_input: string;
  tax_id?: string;
  tax_rate?: number;
  storage_id?: string;
  cost_center_id?: string;
}

export interface CreateDocumentPaymentPayload {
  company_payment_method_id: string;
  bank_account_id?: string;
  prepayment_id?: string;
  cost_center_id?: string;
  amount: string;
}

export interface CreateDocumentWithholdingPayload {
  withholding_id: string;
  rate: number;
  amount: string;
  cost_center_id?: string;
}

export interface CreateDocumentAiuPayload {
  administrative_percentage: string;
  administrative: string;
  unexpected_percentage: string;
  unexpected: string;
  utility_percentage: string;
  utility: string;
}

export interface CreateDocumentCreditPayload {
  due_date: string;
  payment_method_id: string;
  cost_center_id?: string;
}

export interface CreateDocumentPayload {
  doc_type: string;
  status: string;
  third_party_id: string;
  doc_date: string;
  type_operation_id?: string;
  notes?: string;
  purchase_order_consecutive?: string;
  purchase_order_date?: string;
  subtotal: string;
  total_discounts: string;
  total_taxes: string;
  total_withholdings: string;
  net_amount: string;
  tax_details?: any;
  withholding_details?: any;
  items: CreateDocumentItemPayload[];
  payments?: CreateDocumentPaymentPayload[];
  withholdings?: CreateDocumentWithholdingPayload[];
  aiu?: CreateDocumentAiuPayload;
  credit?: CreateDocumentCreditPayload;
}

export interface CreateDocumentResponse {
  id: string;
  consecutive: string;
  status: DocumentStatus;
}

/* ── Detail response ─────────────────────────────────── */

export interface DocumentDetailItem {
  id: string;
  product_id: string | null;
  product_name: string | null;
  product_consecutive: string | null;
  product_barcode: string | null;
  is_service: boolean;
  parent_product_id: string | null;
  tax_included: boolean;
  unit_name: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_discount_rate: boolean;
  discount_rate: number;
  discount_value: number;
  discount_rate_value: number;
  discount_total_value: number;
  tax_id: string | null;
  tax_name: string | null;
  tax_rate: number;
  tax_per_unit_amount: number | null;
  tax_amount: number;
  storage_id: string | null;
  storage_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
}

export interface DocumentDetailPayment {
  id: string;
  company_payment_method_id: string;
  company_payment_method_name: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  bank_account_type: string | null;
  prepayment_id: string | null;
  prepayment_consecutive: string | null;
  prepayment_type: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  amount: number;
}

export interface DocumentDetailWithholding {
  id: string;
  withholding_id: string;
  withholding_name: string | null;
  tax_type_id: number | null;
  rate: number;
  amount: number;
  cost_center_id: string | null;
  cost_center_name: string | null;
}

export interface DocumentDetailAiu {
  administrative_percentage: number;
  administrative: number;
  unexpected_percentage: number;
  unexpected: number;
  utility_percentage: number;
  utility: number;
}

export interface DocumentDetailCredit {
  due_date: string;
  payment_method_id: string | null;
  payment_method_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
}

export interface DocumentDetail {
  id: string;
  doc_type: DocType;
  status: DocumentStatus;
  consecutive: string | null;
  doc_date: string;
  due_date: string | null;
  payment_type: 'CASH' | 'CREDIT' | null;
  type_operation: { id: string; code: string; name: string } | null;
  notes: string | null;
  purchase_order_consecutive: string | null;
  purchase_order_date: string | null;
  subtotal: number;
  total_discounts: number;
  total_taxes: number;
  total_withholdings: number;
  net_amount: number;
  tax_details: any;
  withholding_details: any;
  sent_to_api: SentToApi;
  third_party: (DocumentThirdParty & { email?: string | null }) | null;
  credit: DocumentDetailCredit | null;
  items: DocumentDetailItem[];
  payments: DocumentDetailPayment[];
  withholdings: DocumentDetailWithholding[];
  aiu: DocumentDetailAiu | null;
  created_at: string;
  updated_at: string;
}
