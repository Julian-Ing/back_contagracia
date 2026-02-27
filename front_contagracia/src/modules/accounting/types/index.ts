export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'INCOME'
  | 'EXPENSE'
  | 'COST'
  | 'PRODUCTION_COST'
  | 'DEBTOR_ACCOUNTS'
  | 'CREDITOR_ACCOUNTS';

export interface ChartOfAccountNode {
  code: string;
  name: string;
  type: AccountType;
  parent_code: string | null;
  children: ChartOfAccountNode[];
  _matched?: boolean;
}

export interface ChartOfAccountsResponse {
  data: ChartOfAccountNode[];
  total: number;
  filtered?: number;
  page: number;
  limit: number;
  totalPages: number;
}
