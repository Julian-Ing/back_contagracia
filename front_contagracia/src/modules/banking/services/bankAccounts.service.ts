import { accountingClient } from '@/shared/services/api/apiClient';
import type { BankAccount, BankAccountsResponse, BankAccountFilters, UpdateBankAccountData, CanDeleteBankAccountResponse } from '../types';

export const bankAccountsService = {
  /**
   * Obtener lista de cuentas bancarias con filtros y paginación
   */
  async getAll(filters: BankAccountFilters = {}): Promise<BankAccountsResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.type) params.type = filters.type;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.includeInactive) params.includeInactive = 'true';

    const response = await accountingClient.get<BankAccountsResponse>('/bank-accounts', { params });
    return response.data;
  },

  /**
   * Obtener una cuenta bancaria por ID
   */
  async getOne(id: string): Promise<BankAccount> {
    const response = await accountingClient.get<BankAccount>(`/bank-accounts/${id}`);
    return response.data;
  },

  /**
   * Crear cuenta bancaria
   */
  async create(data: {
    account_type: string;
    account_name: string;
    bank_id?: string;
    account_number?: string;
    account_id?: string;
  }): Promise<BankAccount> {
    const response = await accountingClient.post<BankAccount>('/bank-accounts', data);
    return response.data;
  },

  /**
   * Actualizar cuenta bancaria
   */
  async update(id: string, data: UpdateBankAccountData): Promise<BankAccount> {
    const response = await accountingClient.put<BankAccount>(`/bank-accounts/${id}`, data);
    return response.data;
  },

  /**
   * Verificar si se puede eliminar
   */
  async canDelete(id: string): Promise<CanDeleteBankAccountResponse> {
    const response = await accountingClient.get<CanDeleteBankAccountResponse>(`/bank-accounts/${id}/can-delete`);
    return response.data;
  },

  /**
   * Eliminar cuenta bancaria
   */
  async delete(id: string): Promise<void> {
    await accountingClient.delete(`/bank-accounts/${id}`);
  },
};
