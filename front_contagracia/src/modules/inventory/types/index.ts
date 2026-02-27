export interface ProductCategory {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  is_aiu: boolean;
  is_bag: boolean;
  products_count: number;
  created_at: string;
}

export interface CategoriesResponse {
  data: ProductCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ---- Products ----

export interface ProductListItem {
  id: string;
  consecutive: string;
  barcode: string;
  name: string;
  description: string | null;
  category: { id: string; name: string } | null;
  unit: { id: string; name: string; symbol: string } | null;
  tax: { id: string; name: string; rate: number } | null;
  price: number;
  cost: number;
  tax_included: boolean;
  costing_type: string;
  stock: number;
  is_service: boolean;
  is_aiu: boolean;
  is_bag: boolean;
  mode: string;
  image_path: string | null;
  combinations_count: number;
  created_at: string;
}

export interface ProductsResponse {
  data: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateProductData {
  name: string;
  barcode: string;
  description?: string;
  category_id: string;
  unit_id?: string;
  tax_id: string;
  price: number;
  cost: number;
  tax_included: boolean;
  costing_type: string;
  is_service: boolean;
  image_path?: string | null;
  asset_account_code?: string | null;
  cogs_account_code?: string | null;
  revenue_account_code?: string | null;
}

export interface UpdateProductData {
  name?: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  unit_id?: string;
  tax_id?: string;
  price?: number;
  cost?: number;
  tax_included?: boolean;
  costing_type?: string;
  is_service?: boolean;
  image_path?: string | null;
  asset_account_code?: string | null;
  cogs_account_code?: string | null;
  revenue_account_code?: string | null;
  attribute_option_ids?: string[];
}

export interface ProductUnitItem {
  id: string;
  name: string;
  symbol: string;
}

// ---- Top Selling ----

export interface TopSellingItem {
  id: string;
  consecutive: string;
  barcode: string;
  name: string;
  price: number;
  is_service: boolean;
  total_quantity: number;
  total_movements: number;
}

// ---- Combinations ----

export interface CombinationAttribute {
  attribute: string;
  option: string;
  attribute_id: string;
  option_id: string;
}

export interface CombinationListItem {
  id: string;
  consecutive: string;
  barcode: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  stock: number;
  mode: string;
  image_path: string | null;
  combinations_count: number;
  parent_product: { id: string; name: string; consecutive: string } | null;
  attributes: CombinationAttribute[];
  created_at: string;
}

export interface CombinationsResponse {
  data: CombinationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateCombinationItem {
  name: string;
  barcode: string;
  price: number;
  cost: number;
  attribute_option_ids: string[];
  image_path?: string | null;
  // Opcionales — si no se envían, se heredan del padre
  description?: string;
  category_id?: string;
  unit_id?: string;
  tax_id?: string;
  tax_included?: boolean;
  costing_type?: string;
  asset_account_code?: string | null;
  cogs_account_code?: string | null;
  revenue_account_code?: string | null;
}

export interface CreateCombinationsData {
  combinations: CreateCombinationItem[];
}

// ---- Assigned Attributes (product → attribute many-to-many) ----

export interface AssignedAttributeOption {
  id: string;
  name: string;
}

export interface AssignedAttribute {
  id: string;
  name: string;
  options: AssignedAttributeOption[];
}

// ---- Stock Summary ----

export interface StockStorageItem {
  storage_id: string;
  storage_name: string;
  storage_consecutive: string;
  warehouse_name: string;
  stock: number;
}

export interface StockSummaryItem {
  id: string;
  name: string;
  barcode: string;
  description: string | null;
  image_path: string | null;
  stock: number;
  is_parent: boolean;
  attributes: { attribute: string; option: string }[];
  storages?: StockStorageItem[];
}

export interface StockSummaryResponse {
  has_inventory_management: boolean;
  items: StockSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Product Transfers ----

export interface ProductTransferItemData {
  id: string;
  direction: 'IN' | 'OUT';
  quantity: number;
  product: { id: string; name: string; consecutive: string; barcode?: string } | null;
  storage: { id: string; name: string; warehouse_name?: string } | null;
}

export interface ProductTransferItem {
  id: string;
  consecutive: string;
  reason: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: { id: string; name: string } | null;
  approved_by: { id: string; name: string } | null;
  approved_at: string | null;
  rejected_by: { id: string; name: string } | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  items: ProductTransferItemData[];
}

export interface ProductTransfersResponse {
  data: ProductTransferItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductTransferData {
  reason: string;
  date?: string;
  items: Array<{
    product_id: string;
    direction: 'IN' | 'OUT';
    quantity: number;
    storage_id?: string;
  }>;
}

// ---- Storage Transfers ----

export interface StorageTransferItemData {
  id: string;
  direction: 'IN' | 'OUT';
  quantity: number;
  product: { id: string; name: string; consecutive: string; barcode?: string } | null;
  storage: { id: string; name: string; warehouse_name?: string } | null;
}

export interface StorageTransferItem {
  id: string;
  consecutive: string;
  reason: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  transferred_by: { id: string; name: string } | null;
  approved_by: { id: string; name: string } | null;
  approved_at: string | null;
  rejected_by: { id: string; name: string } | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  items: StorageTransferItemData[];
}

export interface StorageTransfersResponse {
  data: StorageTransferItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStorageTransferData {
  reason: string;
  date?: string;
  items: Array<{
    product_id: string;
    storage_id: string;
    direction: 'IN' | 'OUT';
    quantity: number;
  }>;
}

// ---- Kardex ----

export interface ProductMovementTypeItem {
  key: string;
  name: string;
}

export interface KardexItem {
  id: string;
  consecutive: string;
  type_key: string;
  type_name: string;
  direction: 'IN' | 'OUT';
  quantity: number;
  date: string;
  storage: {
    id: string;
    name: string;
    warehouse_name: string;
  } | null;
  reference_id: string | null;
  reference_consecutive: string | null;
  notes: string | null;
  created_at: string;
}

export interface KardexResponse {
  items: KardexItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Warehouses & Storages ----

export interface WarehouseListItem {
  id: string;
  consecutive: string;
  name: string;
  is_principal: boolean;
  storages_count: number;
  users_count: number;
  is_active: boolean;
  created_at: string;
}

export interface WarehousesResponse {
  data: WarehouseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StorageItem {
  id: string;
  consecutive: string;
  name: string;
  is_principal: boolean;
  products_count: number;
  movements_count: number;
  created_at: string;
}

export interface WarehouseUserItem {
  id: string;
  tenant_user_id: string;
  full_name: string;
  email: string;
  assigned_at: string;
}

export interface WarehouseDetail {
  id: string;
  consecutive: string;
  name: string;
  is_principal: boolean;
  is_active: boolean;
  created_at: string;
  storages: StorageItem[];
  users: WarehouseUserItem[];
}

export interface StorageListItem {
  id: string;
  consecutive: string;
  name: string;
  is_principal: boolean;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_consecutive: string;
  products_count: number;
  created_at: string;
}

export interface StoragesResponse {
  data: StorageListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ---- Attributes ----

export interface AttributeOptionItem {
  id: string;
  consecutive: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AttributeListItem {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  is_active: boolean;
  options_count: number;
  options: AttributeOptionItem[];
  created_at: string;
}

export interface AttributesResponse {
  data: AttributeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
