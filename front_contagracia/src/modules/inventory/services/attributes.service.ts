import { inventoryClient } from '@/shared/services/api/apiClient';
import type { AttributesResponse, AttributeListItem, AttributeOptionItem } from '../types';

export const attributesService = {
  async getForSelect(): Promise<Array<{ id: string; name: string; consecutive: string; options: Array<{ id: string; name: string }> }>> {
    const response = await inventoryClient.get('/attributes/for-select');
    return response.data;
  },

  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AttributesResponse> {
    const response = await inventoryClient.get('/attributes', { params });
    return response.data;
  },

  async create(data: { name: string; description?: string }): Promise<AttributeListItem> {
    const response = await inventoryClient.post('/attributes', data);
    return response.data;
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<AttributeListItem> {
    const response = await inventoryClient.patch(`/attributes/${id}`, data);
    return response.data;
  },

  async toggleActive(id: string): Promise<{ is_active: boolean; message: string }> {
    const response = await inventoryClient.patch(`/attributes/${id}/toggle-active`);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/attributes/${id}`);
    return response.data;
  },

  // ── Opciones ──

  async createOption(attributeId: string, data: { name: string }): Promise<AttributeOptionItem> {
    const response = await inventoryClient.post(`/attributes/${attributeId}/options`, data);
    return response.data;
  },

  async updateOption(optionId: string, data: { name?: string }): Promise<AttributeOptionItem> {
    const response = await inventoryClient.patch(`/attributes/options/${optionId}`, data);
    return response.data;
  },

  async toggleOptionActive(optionId: string): Promise<{ is_active: boolean; message: string }> {
    const response = await inventoryClient.patch(`/attributes/options/${optionId}/toggle-active`);
    return response.data;
  },

  async deleteOption(optionId: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/attributes/options/${optionId}`);
    return response.data;
  },

  // ── Acciones Masivas ──

  async bulkCreateAttributes(data: { attributes: Array<{ name: string; description?: string }> }): Promise<{ message: string; count: number }> {
    const response = await inventoryClient.post('/attributes/bulk', data);
    return response.data;
  },

  async bulkCreateOptions(attributeId: string, data: { names: string[] }): Promise<{ message: string; count: number }> {
    const response = await inventoryClient.post(`/attributes/${attributeId}/options/bulk`, data);
    return response.data;
  },

  async bulkCreateWithOptions(data: { attributes: Array<{ name: string; description?: string; options: string[] }> }): Promise<{ message: string; attributesCount: number; optionsCount: number }> {
    const response = await inventoryClient.post('/attributes/bulk-with-options', data);
    return response.data;
  },
};
