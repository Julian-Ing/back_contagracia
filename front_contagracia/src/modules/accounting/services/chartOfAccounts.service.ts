import { accountingClient } from '@/shared/services/api/apiClient';
import type { ChartOfAccountsResponse, ChartOfAccountNode, AccountType } from '../types';

export interface ChartOfAccountsParams {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface CreateAccountDto {
  code: string;
  name: string;
}

export interface UpdateAccountDto {
  name: string;
}

export interface AccountDetail {
  code: string;
  name: string;
  type: AccountType;
  parent_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: {
    code: string;
    name: string;
    type: AccountType;
  } | null;
  children: ChartOfAccountNode[];
}

export const chartOfAccountsService = {
  /**
   * Listar cuentas con búsqueda, filtro y paginación
   */
  async getAll(params?: ChartOfAccountsParams): Promise<ChartOfAccountsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const query = queryParams.toString();
    const url = query ? `/chart-of-accounts?${query}` : '/chart-of-accounts';
    const response = await accountingClient.get<ChartOfAccountsResponse>(url);
    return response.data;
  },

  /**
   * Obtener cuenta por código
   */
  async getOne(code: string): Promise<AccountDetail> {
    const response = await accountingClient.get<AccountDetail>(`/chart-of-accounts/${code}`);
    return response.data;
  },

  /**
   * Verificar si una cuenta existe
   */
  async exists(code: string): Promise<{ exists: boolean; account?: AccountDetail }> {
    try {
      const account = await this.getOne(code);
      return { exists: true, account };
    } catch {
      return { exists: false };
    }
  },

  /**
   * Crear nueva cuenta
   */
  async create(dto: CreateAccountDto): Promise<AccountDetail> {
    const response = await accountingClient.post<AccountDetail>('/chart-of-accounts', dto);
    return response.data;
  },

  /**
   * Actualizar cuenta (solo nombre)
   */
  async update(code: string, dto: UpdateAccountDto): Promise<AccountDetail> {
    const response = await accountingClient.put<AccountDetail>(`/chart-of-accounts/${code}`, dto);
    return response.data;
  },

  /**
   * Eliminar cuenta permanentemente
   */
  async delete(code: string): Promise<{ message: string }> {
    const response = await accountingClient.delete<{ message: string }>(`/chart-of-accounts/${code}`);
    return response.data;
  },
};
