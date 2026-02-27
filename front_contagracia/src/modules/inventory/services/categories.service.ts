import { inventoryClient } from '@/shared/services/api/apiClient';
import { CategoriesResponse, ProductCategory } from '../types';

export const categoriesService = {
  async getForSelect(search?: string): Promise<{ id: string; name: string }[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const response = await inventoryClient.get('/categories/for-select', { params });
    return response.data;
  },

  async getAll(params?: { search?: string; page?: number; limit?: number }): Promise<CategoriesResponse> {
    const response = await inventoryClient.get('/categories', { params });
    return response.data;
  },

  async create(data: { name: string; description?: string }): Promise<ProductCategory> {
    const response = await inventoryClient.post('/categories', data);
    return response.data;
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<ProductCategory> {
    const response = await inventoryClient.patch(`/categories/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/categories/${id}`);
    return response.data;
  },
};
