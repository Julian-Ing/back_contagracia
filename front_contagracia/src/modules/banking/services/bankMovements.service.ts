import { accountingClient } from '@/shared/services/api/apiClient';
import type { BankMovement, BankMovementsResponse, BankMovementFilters } from '../types';

export const bankMovementsService = {
  /**
   * Obtener movimientos de una cuenta bancaria con filtros y paginación
   */
  async getAll(filters: BankMovementFilters): Promise<BankMovementsResponse> {
    const params: Record<string, string> = {
      bank_account_id: filters.bank_account_id,
    };
    if (filters.search) params.search = filters.search;
    if (filters.type_key) params.type_key = filters.type_key;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await accountingClient.get<BankMovementsResponse>('/bank-movements', { params });
    return response.data;
  },

  /**
   * Obtener un movimiento por ID
   */
  async getOne(id: string): Promise<BankMovement> {
    const response = await accountingClient.get<BankMovement>(`/bank-movements/${id}`);
    return response.data;
  },
};
