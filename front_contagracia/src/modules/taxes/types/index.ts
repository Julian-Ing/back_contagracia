export interface TaxType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_tax: boolean;
}

export interface AccountRef {
  code: string;
  name: string;
}

export interface Tax {
  id: string;
  code: string;
  name: string;
  rate: number;
  per_unit_amount: number | null;
  description: string | null;
  tax_type_id: number;
  is_cost_tax: boolean;
  is_system: boolean;
  is_active: boolean;
  tax_type: TaxType | null;
  // Cuentas contables
  tax_sales_account: AccountRef | null;
  tax_purchases_account: AccountRef | null;
  tax_cost_account: AccountRef | null;
  withholding_sales_account: AccountRef | null;
  withholding_purchases_account: AccountRef | null;
  created_at: string;
}

export interface TaxesResponse {
  data: Tax[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TaxFilters {
  search?: string;
  is_tax?: boolean;
  tax_type_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateTaxData {
  name: string;
  rate: number;
  per_unit_amount?: number;
  tax_type_id: number;
  description?: string;
  is_cost_tax?: boolean;
  tax_sales_account_code?: string;
  tax_purchases_account_code?: string;
  tax_cost_account_code?: string;
  withholding_sales_account_code?: string;
  withholding_purchases_account_code?: string;
}

export interface UpdateTaxData {
  name?: string;
  rate?: number;
  per_unit_amount?: number | null;
  description?: string;
  is_cost_tax?: boolean;
  is_active?: boolean;
  tax_sales_account_code?: string | null;
  tax_purchases_account_code?: string | null;
  tax_cost_account_code?: string | null;
  withholding_sales_account_code?: string | null;
  withholding_purchases_account_code?: string | null;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  reason?: string;
  itemTaxesCount?: number;
  withholdingsCount?: number;
}
