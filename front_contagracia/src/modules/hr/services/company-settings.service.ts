/**
 * Servicio de Configuración de Empresa - HR Service
 * Comunicación con hr-service (puerto 3012) - company-settings
 */

import { hrClient } from '@/shared/services/api/apiClient';

export interface CompanySettingValue {
  value: any;
  raw_value: string;
  value_type: string;
  description: string | null;
  is_readonly: boolean;
}

export type CompanySettingsGrouped = Record<string, Record<string, CompanySettingValue>>;

export interface BulkUpsertItem {
  category: string;
  key: string;
  value: string;
}

export const companySettingsService = {
  /**
   * Obtener todas las configuraciones agrupadas por categoría
   */
  async getAll(): Promise<CompanySettingsGrouped> {
    const { data } = await hrClient.get('/company-settings');
    return data;
  },

  /**
   * Obtener configuraciones de una categoría
   */
  async getByCategory(category: string): Promise<Record<string, CompanySettingValue>> {
    const { data } = await hrClient.get(`/company-settings/${category}`);
    return data;
  },

  /**
   * Actualizar una configuración
   */
  async upsert(category: string, key: string, value: string, description?: string) {
    const { data } = await hrClient.put(`/company-settings/${category}/${key}`, {
      value,
      description,
    });
    return data;
  },

  /**
   * Actualizar múltiples configuraciones
   */
  async bulkUpsert(settings: BulkUpsertItem[]) {
    const { data } = await hrClient.post('/company-settings/bulk', { settings });
    return data;
  },

  /**
   * Inicializar configuraciones por defecto Colombia 2025
   */
  async initialize() {
    const { data } = await hrClient.post('/company-settings/initialize');
    return data;
  },
};
