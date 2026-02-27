import { inventoryClient } from '@/shared/services/api/apiClient';
import type { StorageTransfersResponse, StorageTransferItem, CreateStorageTransferData } from '../types';

export const storageTransfersService = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<StorageTransfersResponse> {
    const response = await inventoryClient.get('/storage-transfers', { params });
    return response.data;
  },

  async getOne(id: string): Promise<StorageTransferItem> {
    const response = await inventoryClient.get(`/storage-transfers/${id}`);
    return response.data;
  },

  async create(data: CreateStorageTransferData): Promise<StorageTransferItem> {
    const response = await inventoryClient.post('/storage-transfers', data);
    return response.data;
  },

  async approve(id: string): Promise<StorageTransferItem> {
    const response = await inventoryClient.patch(`/storage-transfers/${id}/approve`);
    return response.data;
  },

  async reject(id: string, rejection_reason: string): Promise<StorageTransferItem> {
    const response = await inventoryClient.patch(`/storage-transfers/${id}/reject`, { rejection_reason });
    return response.data;
  },
};
