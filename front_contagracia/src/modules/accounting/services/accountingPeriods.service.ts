import { accountingClient } from '@/shared/services/api/apiClient';
import type {
  AccountingPeriod,
  AccountingPeriodsResponse,
  AccountingPeriodsFilters,
  AccountingPeriodActionsResponse,
  AccountingPeriodActionsFilters,
  CreatePeriodData,
  UpdatePeriodData,
  ClosingPreviewResult,
  ClosingConfirmData,
  OpeningBalancePreviewResult,
  OpeningBalanceImportResult,
  ReverseOpeningBalanceResult,
} from '../types/accountingPeriods';

export const accountingPeriodsService = {
  async getAll(filters: AccountingPeriodsFilters = {}): Promise<AccountingPeriodsResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.year) params.year = String(filters.year);
    if (filters.status) params.status = filters.status;
    if (filters.is_annual !== undefined) params.is_annual = String(filters.is_annual);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<AccountingPeriodsResponse>('/accounting-periods', { params });
    return response.data;
  },

  async getById(id: string): Promise<AccountingPeriod> {
    const response = await accountingClient.get<AccountingPeriod>(`/accounting-periods/${id}`);
    return response.data;
  },

  async create(data: CreatePeriodData): Promise<AccountingPeriod> {
    const response = await accountingClient.post<AccountingPeriod>('/accounting-periods', data);
    return response.data;
  },

  async update(id: string, data: UpdatePeriodData): Promise<AccountingPeriod> {
    const response = await accountingClient.put<AccountingPeriod>(`/accounting-periods/${id}`, data);
    return response.data;
  },

  async close(id: string, data: ClosingConfirmData): Promise<AccountingPeriod> {
    const response = await accountingClient.post<AccountingPeriod>(`/accounting-periods/${id}/close`, data);
    return response.data;
  },

  async reopen(id: string, reason?: string): Promise<AccountingPeriod> {
    const response = await accountingClient.post<AccountingPeriod>(`/accounting-periods/${id}/reopen`, { reason });
    return response.data;
  },

  async getActions(periodId: string, filters: AccountingPeriodActionsFilters = {}): Promise<AccountingPeriodActionsResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.action) params.action = filters.action;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<AccountingPeriodActionsResponse>(
      `/accounting-periods/${periodId}/actions`,
      { params },
    );
    return response.data;
  },

  async getOpenAnnualPeriods(): Promise<AccountingPeriod[]> {
    const response = await accountingClient.get<AccountingPeriodsResponse>('/accounting-periods', {
      params: {
        is_annual: 'true',
        status: 'OPEN,REOPENED',
        limit: '100',
      },
    });
    return response.data.data;
  },

  async getClosingPreview(periodId: string): Promise<ClosingPreviewResult> {
    const response = await accountingClient.get<ClosingPreviewResult>(
      `/accounting-periods/${periodId}/closing-preview`,
    );
    return response.data;
  },

  async downloadOpeningBalanceTemplate(periodId: string): Promise<Blob> {
    const response = await accountingClient.get(
      `/accounting-periods/${periodId}/opening-balance-template`,
      { responseType: 'blob' },
    );
    return response.data;
  },

  async previewOpeningBalance(periodId: string, file: File): Promise<OpeningBalancePreviewResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await accountingClient.post<OpeningBalancePreviewResult>(
      `/accounting-periods/${periodId}/preview-opening-balance`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async importOpeningBalance(periodId: string, file: File, description?: string): Promise<OpeningBalanceImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);

    const response = await accountingClient.post<OpeningBalanceImportResult>(
      `/accounting-periods/${periodId}/import-opening-balance`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async reverseOpeningBalance(periodId: string, actionId: string): Promise<ReverseOpeningBalanceResult> {
    const response = await accountingClient.post<ReverseOpeningBalanceResult>(
      `/accounting-periods/${periodId}/actions/${actionId}/reverse-opening-balance`,
    );
    return response.data;
  },
};
