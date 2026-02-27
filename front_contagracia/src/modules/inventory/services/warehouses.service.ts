import { inventoryClient } from '@/shared/services/api/apiClient';
import type { WarehousesResponse, WarehouseListItem, WarehouseDetail, StoragesResponse } from '../types';

export const warehousesService = {
  // ── For select (ligero, fuzzy) ──

  async getWarehousesForSelect(search?: string): Promise<Array<{ id: string; name: string }>> {
    const response = await inventoryClient.get('/warehouses/for-select', { params: { search: search || undefined } });
    return response.data;
  },

  async getStoragesForSelect(params?: { warehouse_id?: string; search?: string }): Promise<Array<{ id: string; name: string; consecutive: string; warehouse_id: string; warehouse_name: string; warehouse_consecutive: string }>> {
    const response = await inventoryClient.get('/warehouses/storages/for-select', { params });
    return response.data;
  },

  // ── Almacenes ──

  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<WarehousesResponse> {
    const response = await inventoryClient.get('/warehouses', { params });
    return response.data;
  },

  async getOne(id: string): Promise<WarehouseDetail> {
    const response = await inventoryClient.get(`/warehouses/${id}`);
    return response.data;
  },

  async create(data: { name: string }): Promise<WarehouseListItem> {
    const response = await inventoryClient.post('/warehouses', data);
    return response.data;
  },

  async update(id: string, data: { name?: string }): Promise<WarehouseListItem> {
    const response = await inventoryClient.patch(`/warehouses/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/warehouses/${id}`);
    return response.data;
  },

  // ── Bodegas ──

  async getAllStorages(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<StoragesResponse> {
    const response = await inventoryClient.get('/warehouses/storages/list', { params });
    return response.data;
  },

  async createStorage(warehouseId: string, data: { name: string }) {
    const response = await inventoryClient.post(`/warehouses/${warehouseId}/storages`, data);
    return response.data;
  },

  async updateStorage(storageId: string, data: { name?: string }) {
    const response = await inventoryClient.patch(`/warehouses/storages/${storageId}`, data);
    return response.data;
  },

  async deleteStorage(storageId: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/warehouses/storages/${storageId}`);
    return response.data;
  },

  // ── Usuarios ──

  async assignUsers(warehouseId: string, tenantUserIds: string[]) {
    const response = await inventoryClient.post(`/warehouses/${warehouseId}/users`, {
      tenant_user_ids: tenantUserIds,
    });
    return response.data;
  },

  async removeUser(warehouseId: string, tenantUserId: string): Promise<{ message: string }> {
    const response = await inventoryClient.delete(`/warehouses/${warehouseId}/users/${tenantUserId}`);
    return response.data;
  },

  // ── Mis bodegas ──

  async getMyStorages(): Promise<Array<{
    warehouse_id: string;
    warehouse_name: string;
    warehouse_consecutive: string;
    storages: Array<{ id: string; consecutive: string; name: string }>;
  }>> {
    const response = await inventoryClient.get('/warehouses/me/storages');
    return response.data;
  },
};
