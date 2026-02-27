export interface CostCenter {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent: { id: string; name: string; consecutive: string } | null;
  children_count: number;
  movements_count: number;
  projections_count: number;
  journal_items_count: number;
  created_at: string;
  updated_at: string;
}

export interface CostCenterTreeNode {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
  movements_count: number;
  projections_count: number;
  journal_items_count: number;
  created_at: string;
  updated_at: string;
  children: CostCenterTreeNode[];
}

export interface CostCentersResponse {
  data: CostCenter[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CostCentersTreeResponse {
  data: CostCenterTreeNode[];
}

export interface CostCenterDetail {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent: { id: string; name: string; consecutive: string } | null;
  children: { id: string; name: string; consecutive: string; is_active: boolean }[];
  _count: {
    movements: number;
    projections: number;
    journal_entry_items: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateCostCenterData {
  name: string;
  description?: string;
  parent_id?: string;
}

export interface UpdateCostCenterData {
  name?: string;
  description?: string;
  parent_id?: string | null;
}

export interface DeleteCostCenterResponse {
  message: string;
  type: 'hard_delete' | 'soft_delete';
  reason?: string;
}

export interface MovementType {
  key: string;
  name: string;
  nature: 'DEBIT' | 'CREDIT';
}

export interface CostCenterMovement {
  id: string;
  cost_center_id: string;
  movement_date: string;
  type_key: string;
  reference_type_key: string;
  sign: 'POSITIVE' | 'NEGATIVE';
  amount: number | string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  type: { key: string; name: string };
  reference_type: { key: string; name: string };
}

export interface CostCenterMovementsResponse {
  data: CostCenterMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  costCenter: { id: string; name: string; consecutive: string };
}

export interface CostCenterMovementsFilters {
  search?: string;
  type_key?: string;
  reference_type_key?: string;
  from_date?: string;
  to_date?: string;
  sign?: string;
  page?: number;
  limit?: number;
}
