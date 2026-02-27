import { hrClient } from '@/shared/services/api/apiClient';
import type {
  Observation,
  ObservationsResponse,
  ObservationStats,
  ObservationFilters,
  CreateObservationDto,
  UpdateObservationDto,
} from '../types';

export const observationsService = {
  async getAll(filters: ObservationFilters = {}): Promise<ObservationsResponse> {
    const params: Record<string, string> = {};
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.search) params.search = filters.search;
    if (filters.third_party_id) params.third_party_id = filters.third_party_id;
    if (filters.observation_type) params.observation_type = filters.observation_type;
    if (filters.severity) params.severity = filters.severity;
    if (filters.status) params.status = filters.status;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;

    const response = await hrClient.get<ObservationsResponse>('/observations', { params });
    return response.data;
  },

  async getOne(id: string): Promise<Observation> {
    const response = await hrClient.get<Observation>(`/observations/${id}`);
    return response.data;
  },

  async getStats(): Promise<ObservationStats> {
    const response = await hrClient.get<ObservationStats>('/observations/stats');
    return response.data;
  },

  async create(data: CreateObservationDto): Promise<Observation> {
    const response = await hrClient.post<Observation>('/observations', data);
    return response.data;
  },

  async update(id: string, data: UpdateObservationDto): Promise<Observation> {
    const response = await hrClient.patch<Observation>(`/observations/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const response = await hrClient.delete<{ message: string }>(`/observations/${id}`);
    return response.data;
  },
};
