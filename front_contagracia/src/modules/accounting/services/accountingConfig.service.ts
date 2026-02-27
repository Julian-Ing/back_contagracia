import { accountingClient } from '@/shared/services/api/apiClient';

export interface AccountingConfigItem {
  key: string;
  description: string;
  account_code: string | null;
  default: string | null;
  account?: { code: string; name: string } | null;
}

export interface AccountingConfigResponse {
  data: AccountingConfigItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateAccountingConfigDto {
  account_code?: string | null;
}

export const accountingConfigService = {
  /**
   * Obtener una configuración por key
   */
  async getByKey(key: string): Promise<AccountingConfigItem | null> {
    try {
      const response = await accountingClient.get<AccountingConfigItem>(
        `/accounting-config/${encodeURIComponent(key)}`
      );
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Listar configuraciones contables con paginación
   */
  async findAll(search?: string, page = 1, limit = 20): Promise<AccountingConfigResponse> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await accountingClient.get<AccountingConfigResponse>(`/accounting-config?${params}`);
    return response.data;
  },

  /**
   * Actualizar cuenta(s) de una configuración
   */
  async update(key: string, dto: UpdateAccountingConfigDto): Promise<AccountingConfigItem> {
    const response = await accountingClient.patch<AccountingConfigItem>(
      `/accounting-config/${encodeURIComponent(key)}`,
      dto
    );
    return response.data;
  },

  /**
   * Resetear configuración a valor por defecto
   */
  async resetToDefault(key: string): Promise<AccountingConfigItem> {
    const response = await accountingClient.post<AccountingConfigItem>(
      `/accounting-config/${encodeURIComponent(key)}/reset`,
      {}
    );
    return response.data;
  },
};
