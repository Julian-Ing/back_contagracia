import { accountingClient } from '@/shared/services/api/apiClient';
import {
  ProjectionsResponse,
  ProjectionDetail,
  CreateProjectionData,
  UpdateProjectionData,
} from '../types';

export const projectionsService = {
  async getMovementTypes(): Promise<{ key: string; name: string }[]> {
    const response = await accountingClient.get('/projections/movement-types');
    return response.data;
  },

  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    scope?: 'GLOBAL' | 'COST_CENTER';
    cost_center_id?: string;
  }): Promise<ProjectionsResponse> {
    const response = await accountingClient.get('/projections', { params });
    return response.data;
  },

  async getOne(id: string): Promise<ProjectionDetail> {
    const response = await accountingClient.get(`/projections/${id}`);
    return response.data;
  },

  async create(data: CreateProjectionData): Promise<ProjectionDetail> {
    const response = await accountingClient.post('/projections', data);
    return response.data;
  },

  async update(id: string, data: UpdateProjectionData): Promise<ProjectionDetail> {
    const response = await accountingClient.put(`/projections/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await accountingClient.delete(`/projections/${id}`);
    return response.data;
  },
};
