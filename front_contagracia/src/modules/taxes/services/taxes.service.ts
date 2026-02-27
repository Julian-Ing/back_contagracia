import { taxClient } from '@/shared/services/api/apiClient';
import type { Tax, TaxType, TaxesResponse, TaxFilters, CreateTaxData, UpdateTaxData, CanDeleteResponse } from '../types';

export const taxesService = {
  async getAll(filters: TaxFilters = {}): Promise<TaxesResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.is_tax !== undefined) params.is_tax = String(filters.is_tax);
    if (filters.tax_type_id) params.tax_type_id = String(filters.tax_type_id);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await taxClient.get<TaxesResponse>('/taxes', { params });
    return response.data;
  },

  async getForSelect(params: { search?: string; is_tax?: boolean; includeTypeIds?: number[]; excludeTypeIds?: number[]; excludeCostTax?: boolean } = {}): Promise<{ id: string; name: string; rate: number; per_unit_amount: number | null; tax_type_id: number }[]> {
    const queryParams: Record<string, string> = {};
    if (params.search) queryParams.search = params.search;
    if (params.is_tax !== undefined) queryParams.is_tax = String(params.is_tax);
    if (params.includeTypeIds?.length) queryParams.include_type_ids = params.includeTypeIds.join(',');
    if (params.excludeTypeIds?.length) queryParams.exclude_type_ids = params.excludeTypeIds.join(',');
    if (params.excludeCostTax) queryParams.exclude_cost_tax = 'true';

    const response = await taxClient.get('/taxes/for-select', { params: queryParams });
    return response.data;
  },

  async getTaxTypes(is_tax?: boolean): Promise<TaxType[]> {
    const params: Record<string, string> = {};
    if (is_tax !== undefined) params.is_tax = String(is_tax);

    const response = await taxClient.get<TaxType[]>('/taxes/types', { params });
    return response.data;
  },

  async getOne(id: string): Promise<Tax> {
    const response = await taxClient.get<Tax>(`/taxes/${id}`);
    return response.data;
  },

  async create(data: CreateTaxData): Promise<Tax> {
    const response = await taxClient.post<Tax>('/taxes', data);
    return response.data;
  },

  async update(id: string, data: UpdateTaxData): Promise<Tax> {
    const response = await taxClient.put<Tax>(`/taxes/${id}`, data);
    return response.data;
  },

  async canDelete(id: string): Promise<CanDeleteResponse> {
    const response = await taxClient.get<CanDeleteResponse>(`/taxes/${id}/can-delete`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await taxClient.delete(`/taxes/${id}`);
  },
};
