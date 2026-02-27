/**
 * Servicio de Gastos Viaticos - HR Service
 * Comunicacion con el hr-service (puerto 3012)
 */

import { hrClient } from '@/shared/services/api/apiClient';
import type {
  TravelExpensesResponse,
  TravelExpenseDetail,
  TravelExpenseStats,
  CreateTravelExpenseDto,
  RequestTravelExpenseDto,
  EditTravelExpenseDto,
  QueryTravelExpensesParams,
} from '../types';

export const hrExpensesService = {
  // ==================== LISTADO Y DETALLE ====================

  async getAll(params: QueryTravelExpensesParams = {}): Promise<TravelExpensesResponse> {
    const queryParams: Record<string, string> = {};
    if (params.third_party_id) queryParams.third_party_id = params.third_party_id;
    if (params.status) queryParams.status = params.status;
    if (params.expense_category) queryParams.expense_category = params.expense_category;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.skip !== undefined) queryParams.skip = String(params.skip);
    if (params.take !== undefined) queryParams.take = String(params.take);

    const response = await hrClient.get<TravelExpensesResponse>('/hr-expenses', { params: queryParams });
    return response.data;
  },

  async getOne(id: string): Promise<TravelExpenseDetail> {
    const response = await hrClient.get<TravelExpenseDetail>(`/hr-expenses/${id}`);
    return response.data;
  },

  async getStats(): Promise<TravelExpenseStats> {
    const response = await hrClient.get<TravelExpenseStats>('/hr-expenses/stats');
    return response.data;
  },

  // ==================== CREACION ====================

  async create(data: CreateTravelExpenseDto): Promise<{ message: string }> {
    const response = await hrClient.post<{ message: string }>('/hr-expenses', data);
    return response.data;
  },

  async request(data: RequestTravelExpenseDto): Promise<{ message: string }> {
    const response = await hrClient.post<{ message: string }>('/hr-expenses/request', data);
    return response.data;
  },

  // ==================== EDICION ====================

  async update(id: string, data: EditTravelExpenseDto): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/hr-expenses/${id}`, data);
    return response.data;
  },

  // ==================== APROBACION / RECHAZO ====================

  async approve(id: string, adminNotes?: string): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/hr-expenses/${id}/approve`, {
      admin_notes: adminNotes,
    });
    return response.data;
  },

  async reject(id: string, rejectionReason: string): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/hr-expenses/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // ==================== ELIMINACION ====================

  async delete(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete<{ message: string }>(`/hr-expenses/${id}`);
    return response.data;
  },
};
