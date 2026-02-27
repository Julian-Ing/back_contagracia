export interface ReversalEntry {
  id: string;
  consecutive: string;
  date: string;
  description: string | null;
  total_debit: number;
  total_credit: number;
}

export interface JournalEntry {
  id: string;
  consecutive: string;
  date: string;
  description: string | null;
  type_key: string;
  type_description: string;
  type_color: string;
  is_reversed: boolean;
  reversal_entry: ReversalEntry | null;
  total_debit: number;
  total_credit: number;
  created_at: string;
}

export interface JournalEntriesResponse {
  data: JournalEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface JournalEntriesFilters {
  search?: string;
  type_key?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface JournalEntryType {
  key: string;
  description: string;
  color: string;
}
