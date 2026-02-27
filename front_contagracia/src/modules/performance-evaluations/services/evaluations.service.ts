import { hrClient } from '@/shared/services/api/apiClient';
import type {
  Evaluation,
  EvaluationsResponse,
  EvaluationFilters,
  CreateEvaluationDto,
  UpdateEvaluationDto,
  GenerateEvaluationsDto,
  GenerateEvaluationsResponse,
} from '../types';

export const evaluationsService = {
  async getAll(filters: EvaluationFilters = {}): Promise<EvaluationsResponse> {
    const params: Record<string, string> = {};
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.search) params.search = filters.search;
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.evaluation_period) params.evaluation_period = filters.evaluation_period;
    if (filters.status) params.status = filters.status;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;

    const response = await hrClient.get<EvaluationsResponse>('/evaluations', { params });
    return response.data;
  },

  async getOne(id: string): Promise<Evaluation> {
    const response = await hrClient.get<Evaluation>(`/evaluations/${id}`);
    return response.data;
  },

  async create(data: CreateEvaluationDto): Promise<Evaluation> {
    const response = await hrClient.post<Evaluation>('/evaluations', data);
    return response.data;
  },

  async update(id: string, data: UpdateEvaluationDto): Promise<Evaluation> {
    const response = await hrClient.patch<Evaluation>(`/evaluations/${id}`, data);
    return response.data;
  },

  async complete(id: string): Promise<Evaluation> {
    const response = await hrClient.patch<Evaluation>(`/evaluations/${id}/complete`);
    return response.data;
  },

  async approve(id: string): Promise<Evaluation> {
    const response = await hrClient.patch<Evaluation>(`/evaluations/${id}/approve`);
    return response.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete<{ message: string }>(`/evaluations/${id}`);
    return response.data;
  },

  async getDashboard(params: { period?: string; date_from?: string; date_to?: string } = {}): Promise<any> {
    const response = await hrClient.get('/evaluations/analysis/dashboard', { params });
    return response.data;
  },

  async getEmployeeAnalysis(profileId: string, params: { period?: string; date_from?: string; date_to?: string } = {}): Promise<any> {
    const response = await hrClient.get(`/evaluations/analysis/employee/${profileId}`, { params });
    return response.data;
  },

  async generate(data: GenerateEvaluationsDto): Promise<GenerateEvaluationsResponse> {
    const response = await hrClient.post<GenerateEvaluationsResponse>('/evaluations/generate', data);
    return response.data;
  },
};
