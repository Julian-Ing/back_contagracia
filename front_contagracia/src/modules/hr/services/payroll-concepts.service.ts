/**
 * Servicio de Conceptos de Nómina - HR Service
 * Comunicación con hr-service (puerto 3012) - payroll-concepts
 */

import { hrClient } from '@/shared/services/api/apiClient';

export interface PayrollConceptItem {
  key: string;
  name: string;
  debit_account_code: string | null;
  administrative_debit_account_code: string | null;
  credit_account_code: string | null;
  default_value: string | null;
  default_percentage: string | null;
  is_percentage: boolean;
  is_array: boolean;
  is_legal: boolean;
  concept_type: 'ACCRUED' | 'DEDUCTION' | 'PROVISION' | 'PARAFISCAL';
  created_at: string;
  updated_at: string;
}

export interface PayrollConceptsResponse {
  data: PayrollConceptItem[];
  grouped: {
    ACCRUED: PayrollConceptItem[];
    DEDUCTION: PayrollConceptItem[];
    PROVISION: PayrollConceptItem[];
    PARAFISCAL: PayrollConceptItem[];
  };
  total: number;
}

export interface UpdateConceptDto {
  debit_account_code?: string;
  administrative_debit_account_code?: string;
  credit_account_code?: string;
  default_value?: string;
  default_percentage?: string;
}

export const payrollConceptsService = {
  /**
   * Listar todos los conceptos agrupados por tipo
   */
  async getAll(): Promise<PayrollConceptsResponse> {
    const { data } = await hrClient.get('/payroll-concepts');
    return data;
  },

  /**
   * Obtener un concepto por key
   */
  async getOne(key: string): Promise<PayrollConceptItem> {
    const { data } = await hrClient.get(`/payroll-concepts/${key}`);
    return data;
  },

  /**
   * Actualizar cuentas contables y configuración de un concepto
   */
  async update(key: string, dto: UpdateConceptDto): Promise<PayrollConceptItem> {
    const { data } = await hrClient.put(`/payroll-concepts/${key}`, dto);
    return data;
  },
};
