import { accountingClient } from '@/shared/services/api/apiClient';
import type { JournalEntriesResponse, JournalEntriesFilters, JournalEntryType } from '../types/journalEntries';

export const journalEntriesService = {
  async getAll(filters: JournalEntriesFilters = {}): Promise<JournalEntriesResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.type_key) params.type_key = filters.type_key;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<JournalEntriesResponse>('/journal-entries', { params });
    return response.data;
  },

  async getTypes(): Promise<JournalEntryType[]> {
    const response = await accountingClient.get<JournalEntryType[]>('/journal-entries/types');
    return response.data;
  },
};
