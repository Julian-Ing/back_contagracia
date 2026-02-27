import { accountingClient } from '@/shared/services/api/apiClient';
import type { PaymentReceiptDetail } from '../types';

export interface CreatePaymentReceiptLinePayload {
  kind: 'DOC' | 'BANK' | 'ACCOUNT' | 'PREP_USED' | 'CXC_CREATED' | 'CXP_CREATED' | 'PREP_CREATED';
  account_code: string;
  debit: number;
  credit: number;
  ref_id?: string;
  company_payment_method_id?: string;
  description?: string;
  cost_center_id?: string;
  cost_center_movement_type_key?: string;
}

export interface CreatePaymentReceiptPayload {
  type: 'RECEIVABLE' | 'PAYABLE';
  date: string;
  third_party_id: string;
  description?: string;
  lines: CreatePaymentReceiptLinePayload[];
}

export const paymentReceiptsService = {
  async create(payload: CreatePaymentReceiptPayload): Promise<any> {
    const { data } = await accountingClient.post('/payment-receipts', payload);
    return data;
  },

  async getOne(id: string): Promise<PaymentReceiptDetail> {
    const { data } = await accountingClient.get<PaymentReceiptDetail>(`/payment-receipts/${id}`);
    return data;
  },

  async edit(id: string, payload: CreatePaymentReceiptPayload): Promise<any> {
    const { data } = await accountingClient.put(`/payment-receipts/${id}`, payload);
    return data;
  },

  async reverse(id: string, reason?: string): Promise<any> {
    const { data } = await accountingClient.post(`/payment-receipts/${id}/reverse`, { reason });
    return data;
  },
};
