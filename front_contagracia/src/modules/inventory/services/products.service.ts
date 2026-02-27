import { inventoryClient } from '@/shared/services/api/apiClient';
import type { ProductsResponse, ProductListItem, CreateProductData, UpdateProductData, ProductUnitItem, TopSellingItem, CombinationsResponse, CreateCombinationsData, AssignedAttribute, StockSummaryResponse, KardexResponse, ProductMovementTypeItem } from '../types';

export interface ForSelectItem {
  value: string;
  label: string;
  description: string;
  barcode: string;
  mode: string;
  is_service: boolean;
  parent_product_id: string | null;
  price: string;
  tax_included: boolean;
  tax_id: string | null;
  tax_name: string | null;
  tax_rate: string | null;
  tax_per_unit_amount: number | null;
  unit_name: string | null;
}

export interface ForSelectProduct extends ForSelectItem {
  combinations: ForSelectItem[];
}

export interface ForSelectResponse {
  data: ForSelectProduct[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const productsService = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    category_id?: string;
    view_mode?: 'all' | 'products' | 'combinations';
    is_service?: boolean;
    parent_product_id?: string;
  }): Promise<ProductsResponse> {
    const response = await inventoryClient.get('/products', { params });
    return response.data;
  },

  async getForSelect(params?: {
    is_service?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ForSelectResponse> {
    const response = await inventoryClient.get('/products/for-select', { params });
    return response.data;
  },

  async getOne(id: string): Promise<any> {
    const response = await inventoryClient.get(`/products/${id}`);
    return response.data;
  },

  async create(data: CreateProductData): Promise<ProductListItem> {
    const response = await inventoryClient.post('/products', data);
    return response.data;
  },

  async update(id: string, data: UpdateProductData): Promise<ProductListItem> {
    const response = await inventoryClient.patch(`/products/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string; type: 'soft_delete' | 'hard_delete' }> {
    const response = await inventoryClient.delete(`/products/${id}`);
    return response.data;
  },

  async reactivate(id: string): Promise<{ message: string }> {
    const response = await inventoryClient.patch(`/products/${id}/reactivate`);
    return response.data;
  },

  async getUnits(): Promise<ProductUnitItem[]> {
    const response = await inventoryClient.get('/units');
    return response.data;
  },

  async getCombinations(productId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<CombinationsResponse> {
    const response = await inventoryClient.get('/products', {
      params: { ...params, view_mode: 'combinations', parent_product_id: productId },
    });
    return response.data;
  },

  async createCombinations(productId: string, data: CreateCombinationsData): Promise<{ created: number; combinations: any[] }> {
    const response = await inventoryClient.post(`/products/${productId}/combinations`, data);
    return response.data;
  },

  async getStockSummary(productId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<StockSummaryResponse> {
    const response = await inventoryClient.get(`/products/${productId}/stock-summary`, { params });
    return response.data;
  },

  async getCombinationFingerprints(productId: string): Promise<string[]> {
    const response = await inventoryClient.get(`/products/${productId}/combination-fingerprints`);
    return response.data;
  },

  async getProductAttributes(productId: string): Promise<AssignedAttribute[]> {
    const response = await inventoryClient.get(`/products/${productId}/attributes`);
    return response.data;
  },

  async setProductAttributes(productId: string, attributeIds: string[]): Promise<AssignedAttribute[]> {
    const response = await inventoryClient.put(`/products/${productId}/attributes`, { attribute_ids: attributeIds });
    return response.data;
  },

  async adjustStock(productId: string, data: {
    storage_id?: string;
    direction: 'IN' | 'OUT';
    quantity: number;
    reason: string;
    date?: string;
    counterpart_account_code?: string;
    cost_center_id?: string;
    cost_center_path?: string[];
  }): Promise<{ consecutive: string; newProductStock: number; newStorageStock: number | null }> {
    const response = await inventoryClient.post(`/products/${productId}/adjust-stock`, data);
    return response.data;
  },

  async getMovementTypes(): Promise<ProductMovementTypeItem[]> {
    const response = await inventoryClient.get('/products/movement-types');
    return response.data;
  },

  async getKardex(productId: string, params?: {
    search?: string;
    type_key?: string;
    page?: number;
    limit?: number;
  }): Promise<KardexResponse> {
    const response = await inventoryClient.get(`/products/${productId}/kardex`, { params });
    return response.data;
  },

  async topSelling(params?: {
    limit?: number;
    from?: string;
    to?: string;
    storage_id?: string;
  }): Promise<TopSellingItem[]> {
    const response = await inventoryClient.get('/products/top-selling', { params });
    return response.data;
  },
};
