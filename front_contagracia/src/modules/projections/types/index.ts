export interface ProjectionSummary {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  scope: 'GLOBAL' | 'COST_CENTER';
  include_sub_centers: boolean;
  cost_center: { id: string; name: string; consecutive: string } | null;
  parent: { id: string; name: string; consecutive: string } | null;
  start_date: string;
  end_date: string;
  items_count: number;
  children_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectionItem {
  id: string;
  projection_id: string;
  type_key: string;
  amount: number;
  type: { key: string; name: string };
}

export interface ProjectionDetail {
  id: string;
  consecutive: string;
  name: string;
  description: string | null;
  scope: 'GLOBAL' | 'COST_CENTER';
  include_sub_centers: boolean;
  cost_center: { id: string; name: string; consecutive: string } | null;
  parent: { id: string; name: string; consecutive: string } | null;
  children: { id: string; name: string; consecutive: string; start_date: string; end_date: string }[];
  items: ProjectionItem[];
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectionsResponse {
  data: ProjectionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateProjectionData {
  name: string;
  description?: string;
  scope: 'GLOBAL' | 'COST_CENTER';
  cost_center_id?: string;
  include_sub_centers?: boolean;
  parent_id?: string;
  start_date: string;
  end_date: string;
  items?: { type_key: string; amount: number }[];
}

export interface UpdateProjectionData {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  include_sub_centers?: boolean;
  items?: { type_key: string; amount: number }[];
}
