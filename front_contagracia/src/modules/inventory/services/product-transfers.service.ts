import { inventoryClient } from '@/shared/services/api/apiClient';
import type { ProductTransfersResponse, ProductTransferItem, CreateProductTransferData } from '../types';

export const productTransfersService = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    product_id?: string;
  }): Promise<ProductTransfersResponse> {
    const response = await inventoryClient.get('/product-transfers', { params });
    return response.data;
  },

  async getOne(id: string): Promise<ProductTransferItem> {
    const response = await inventoryClient.get(`/product-transfers/${id}`);
    return response.data;
  },

  async create(data: CreateProductTransferData): Promise<ProductTransferItem> {
    const response = await inventoryClient.post('/product-transfers', data);
    return response.data;
  },

  async approve(id: string): Promise<ProductTransferItem> {
    const response = await inventoryClient.patch(`/product-transfers/${id}/approve`);
    return response.data;
  },

  async reject(id: string, rejection_reason?: string): Promise<ProductTransferItem> {
    const response = await inventoryClient.patch(`/product-transfers/${id}/reject`, { rejection_reason });
    return response.data;
  },
};
