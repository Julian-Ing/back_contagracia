import { accountingClient } from '@/shared/services/api/apiClient';
import type { PrepaymentsResponse, PrepaymentsFilters, PrepaymentType, PrepaymentItem, PrepaymentDetailData, PrepaymentMovementsResponse, PrepaymentMovementsFilters } from '../types';

export interface CreatePrepaymentPayload {
  third_party_id: string;
  prepayment_type: PrepaymentType;
  prepayment_date: string;
  original_amount: number;
  account_code?: string;
  counterpart_account_code?: string;
  bank_account_id?: string;
  company_payment_method_id?: string;
  notes?: string;
  cost_center_id?: string;
  cost_center_path?: string[];
}

export const prepaymentsService = {
  async getAll(filters: PrepaymentsFilters = {}): Promise<PrepaymentsResponse> {
    const params: Record<string, string> = {};

    if (filters.search) params.search = filters.search;
    if (filters.prepayment_type) params.prepayment_type = filters.prepayment_type;
    if (filters.status) params.status = filters.status;
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const { data } = await accountingClient.get('/prepayments', { params });
    return data;
  },

  async create(payload: CreatePrepaymentPayload): Promise<PrepaymentItem> {
    const { data } = await accountingClient.post('/prepayments', payload);
    return data;
  },

  async getById(id: string): Promise<PrepaymentDetailData> {
    const { data } = await accountingClient.get(`/prepayments/${id}`);
    return data;
  },

  async voidPrepayment(id: string, payload: { void_date: string; reason?: string }): Promise<any> {
    const { data } = await accountingClient.post(`/prepayments/${id}/void`, payload);
    return data;
  },

  async refundPrepayment(id: string, payload: { date: string; reason?: string }): Promise<any> {
    const { data } = await accountingClient.post(`/prepayments/${id}/refund`, payload);
    return data;
  },

  async getMovements(prepaymentId: string, filters: PrepaymentMovementsFilters = {}): Promise<PrepaymentMovementsResponse> {
    const params: Record<string, string> = {};

    if (filters.search) params.search = filters.search;
    if (filters.source_key) params.source_key = filters.source_key;
    if (filters.is_voided) params.is_voided = filters.is_voided;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const { data } = await accountingClient.get(`/prepayments/${prepaymentId}/movements`, { params });
    return data;
  },
};
