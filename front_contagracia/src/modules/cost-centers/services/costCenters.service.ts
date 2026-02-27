import { accountingClient } from '@/shared/services/api/apiClient';
import {
  CostCentersResponse,
  CostCentersTreeResponse,
  CostCenterDetail,
  CreateCostCenterData,
  UpdateCostCenterData,
  DeleteCostCenterResponse,
  MovementType,
  CostCenterMovementsResponse,
  CostCenterMovementsFilters,
} from '../types';

export const costCentersService = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<CostCentersResponse> {
    const response = await accountingClient.get('/cost-centers', { params });
    return response.data;
  },

  async getTree(params?: {
    search?: string;
    includeInactive?: boolean;
  }): Promise<CostCentersTreeResponse> {
    const response = await accountingClient.get('/cost-centers', {
      params: { ...params, tree: true },
    });
    return response.data;
  },

  async getOne(id: string): Promise<CostCenterDetail> {
    const response = await accountingClient.get(`/cost-centers/${id}`);
    return response.data;
  },

  async create(data: CreateCostCenterData): Promise<CostCenterDetail> {
    const response = await accountingClient.post('/cost-centers', data);
    return response.data;
  },

  async update(id: string, data: UpdateCostCenterData): Promise<CostCenterDetail> {
    const response = await accountingClient.put(`/cost-centers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<DeleteCostCenterResponse> {
    const response = await accountingClient.delete(`/cost-centers/${id}`);
    return response.data;
  },

  async reactivate(id: string): Promise<CostCenterDetail> {
    const response = await accountingClient.put(`/cost-centers/${id}/reactivate`);
    return response.data;
  },

  async getMovementTypes(): Promise<MovementType[]> {
    const response = await accountingClient.get('/cost-centers/movement-types');
    return response.data;
  },

  async getMovementReferenceTypes(): Promise<MovementType[]> {
    const response = await accountingClient.get('/cost-centers/movement-reference-types');
    return response.data;
  },

  async getMovements(
    costCenterId: string,
    params?: CostCenterMovementsFilters,
  ): Promise<CostCenterMovementsResponse> {
    const response = await accountingClient.get(`/cost-centers/${costCenterId}/movements`, { params });
    return response.data;
  },
};
