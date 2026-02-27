import { accountingClient } from '@/shared/services/api/apiClient';
import type {
  CompanyPaymentMethodsResponse,
  CompanyPaymentMethod,
  DianPaymentMethod,
} from '../types';

export const companyPaymentMethodsService = {
  async getAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<CompanyPaymentMethodsResponse> {
    const qp: Record<string, string> = {};
    if (params.search) qp.search = params.search;
    if (params.page) qp.page = String(params.page);
    if (params.limit) qp.limit = String(params.limit);

    const res = await accountingClient.get<CompanyPaymentMethodsResponse>(
      '/company-payment-methods',
      { params: qp },
    );
    return res.data;
  },

  async create(data: {
    payment_method_id: string;
    name: string;
    description?: string;
  }): Promise<CompanyPaymentMethod> {
    const res = await accountingClient.post<CompanyPaymentMethod>(
      '/company-payment-methods',
      data,
    );
    return res.data;
  },

  async update(
    id: string,
    data: { name?: string; description?: string; is_active?: boolean },
  ): Promise<CompanyPaymentMethod> {
    const res = await accountingClient.put<CompanyPaymentMethod>(
      `/company-payment-methods/${id}`,
      data,
    );
    return res.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const res = await accountingClient.delete<{ message: string }>(
      `/company-payment-methods/${id}`,
    );
    return res.data;
  },

  async getDianPaymentMethods(): Promise<DianPaymentMethod[]> {
    const res = await accountingClient.get<DianPaymentMethod[]>(
      '/company-payment-methods/payment-methods',
    );
    return res.data;
  },
};
