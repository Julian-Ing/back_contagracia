/**
 * Servicio de Tabla UVT Retención en la Fuente - HR Service
 * Comunicación con hr-service (puerto 3012) - payroll-withholding-uvt
 */

import { hrClient } from '@/shared/services/api/apiClient';

export interface UvtBracket {
  id: string;
  year: number;
  procedure: number;
  from_uvt: string;
  to_uvt: string | null;
  fixed_fee_uvt: string;
  marginal_rate: string;
  subtract_uvt: string;
  created_at: string;
  updated_at: string;
}

export interface UvtBracketsResponse {
  data: UvtBracket[];
  total: number;
  year?: number;
}

export interface CreateUvtBracketDto {
  year: number;
  procedure?: number;
  from_uvt: number;
  to_uvt?: number | null;
  fixed_fee_uvt?: number;
  marginal_rate: number;
  subtract_uvt?: number;
}

export interface UpdateUvtBracketDto {
  from_uvt?: number;
  to_uvt?: number | null;
  fixed_fee_uvt?: number;
  marginal_rate?: number;
  subtract_uvt?: number;
}

export const payrollWithholdingUvtService = {
  async getAll(year?: number, procedure?: number): Promise<UvtBracketsResponse> {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);
    if (procedure) params.procedure = String(procedure);
    const { data } = await hrClient.get('/payroll-withholding-uvt', { params });
    return data;
  },

  async getByYear(year: number): Promise<UvtBracketsResponse> {
    const { data } = await hrClient.get(`/payroll-withholding-uvt/${year}`);
    return data;
  },

  async create(dto: CreateUvtBracketDto): Promise<UvtBracket> {
    const { data } = await hrClient.post('/payroll-withholding-uvt', dto);
    return data;
  },

  async update(id: string, dto: UpdateUvtBracketDto): Promise<UvtBracket> {
    const { data } = await hrClient.put(`/payroll-withholding-uvt/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await hrClient.delete(`/payroll-withholding-uvt/${id}`);
  },

  async replicate(sourceYear: number, targetYear: number): Promise<UvtBracketsResponse> {
    const { data } = await hrClient.post('/payroll-withholding-uvt/replicate', {
      sourceYear,
      targetYear,
    });
    return data;
  },
};
