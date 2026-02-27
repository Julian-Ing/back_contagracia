/**
 * Types for Admin Module
 * Tipos para admin-service (plans, system-actions, catalogs)
 */

// ===== STATS & OVERVIEW =====
export interface AdminStats {
  total_users: number;
  active_users_last_30_days: number;
  new_users_last_30_days: number;
  total_companies: number;
  total_invoices: number;
  total_inventory_items: number;
}

export interface RecentUser {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  phone?: string | null;
}

export interface AdminOverview extends AdminStats {
  recent_users: RecentUser[];
}

// ===== MODULES =====
export interface ModuleDependencyInfo {
  id: string;
  module_id: string;
  depends_on_id: string;
  depends_on?: { id: string; module_key: string; module_name: string };
  module?: { id: string; module_key: string; module_name: string };
}

export interface Module {
  id: string;
  module_key: string;
  module_name: string;
  description?: string;
  icon?: string;
  group: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dependencies?: ModuleDependencyInfo[];
  dependents?: ModuleDependencyInfo[];
}

export interface PlanModule {
  id: string;
  plan_id: string;
  module_id: string;
  created_at: string;
  module: Module;
}

// ===== PLANS =====
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  max_users: number;
  max_invoices?: number | null;
  max_products?: number | null;
  max_employees?: number | null;
  is_trial: boolean;
  trial_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_modules: PlanModule[];
  _count?: { subscriptions: number };
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  max_users?: number;
  max_invoices?: number | null;
  max_products?: number | null;
  modules_enabled?: string[];
  is_active?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  max_users?: number;
  max_invoices?: number | null;
  max_products?: number | null;
  modules_enabled?: string[];
  is_active?: boolean;
}

export interface SetPlanModulesDto {
  module_ids: string[];
}

// ===== SYSTEM ACTIONS =====
export interface SystemAction {
  id: string;
  action_key: string;
  module_id: string;
  action_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  module?: Module;
}

export interface SystemModule {
  key: string;
  name: string;
  description?: string;
  actions_count: number;
}

export interface CreateSystemActionDto {
  action_key: string;
  module_id: string;
  action_name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateSystemActionDto {
  action_name?: string;
  description?: string;
  is_active?: boolean;
}

// ===== CATALOGS =====
export interface CatalogItem {
  id: string | number;
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  [key: string]: any;
}

export interface Country extends CatalogItem {
  iso_code: string;
  phone_code?: string;
}

export interface Department extends CatalogItem {
  country_id: string;
}

export interface Municipality extends CatalogItem {
  department_id: string;
  dane_code?: string;
}

export interface Bank extends CatalogItem {
  swift_code?: string;
  nit?: string;
}

// ===== NAVIGATION =====
export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

export interface AdminNavSection {
  id: string;
  label: string;
  items: AdminNavItem[];
}

// Company Management Types
export interface CompanyCategory {
  id: string;
  name: string;
  color: string;
}

export interface Company {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  email: string;
  company_nit?: string;
  company_phone?: string;
  user_created_at: string;
  plan_id?: string;
  plan_name?: string;
  subscription_ends_at?: string;
  invoice_count: number;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  categories?: CompanyCategory[];
  user_plus?: number;
}


// Category with company count
export interface CategoryWithCount extends CompanyCategory {
  description?: string;
  company_count: number;
}

export interface CategoryFormData {
  name: string;
  description: string;
  color: string;
}

// Company Query & Pagination Types
export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  expiration?: string;
  category_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ManageSubscriptionDto {
  plan_id: string;
  ends_at: string;
  user_plus?: number;
}

export interface ImpersonateResponse {
  access_token: string;
  refresh_token: string | null;
  user_type: 'company_user' | 'owner';
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  company: {
    id: string;
    company_name: string;
    nit: string;
    email: string;
    phone: string;
    address: string;
    database_name: string;
    logo_url: string | null;
    user_plus: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    plan_id: string;
    plan_name: string;
  } | null;
  permissions: {
    modules: string[];
    actions: string[];
  };
  role: string;
  must_change_password: boolean;
  impersonated: boolean;
}

// User Account Management Types
export interface UserAccount {
  id: string;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'admin' | 'user';
  created_at: string;
  company_id?: string;
  company_name?: string;
  company_role?: 'admin' | 'user';
}

// Payroll Concept Management Types
export interface PayrollConcept {
  id: string;
  concept_code: string;
  concept_name: string;
  concept_type: 'accrued' | 'deduction';
  is_percentage: boolean;
  default_value: number;
  default_percentage: number;
  is_array: boolean;
  is_legal: boolean;
  is_active: boolean;
  description?: string;
  dian_percentage_code?: number | null;
  valid_from?: string | null;
}

export interface PayrollConceptFormData {
  concept_code: string;
  concept_name: string;
  concept_type: 'accrued' | 'deduction';
  is_percentage: boolean;
  default_value: number;
  default_percentage: number;
  is_array: boolean;
  is_legal: boolean;
  is_active: boolean;
  description: string;
  dian_percentage_code: string;
  valid_from: string;
}

// Worker Subtype Management Types
export interface WorkerSubtype {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface WorkerSubtypeRule {
  id: string;
  sub_type_worker_id: string;
  sub_type_workers?: WorkerSubtype;
  health_employee_pays: boolean;
  health_employee_rate: number | null;
  health_employer_rate: number | null;
  pension_employee_pays: boolean;
  pension_employee_rate: number | null;
  pension_employer_rate: number | null;
  ccf_applies: boolean;
  icbf_applies: boolean;
  sena_applies: boolean;
  arl_applies: boolean;
  fsp_applies: boolean;
  fsp_special_rate: number | null;
  ibc_min_smmlv_percentage: number | null;
  legal_notes: string;
  is_active: boolean;
}

export interface WorkerSubtypeFormData {
  name: string;
  code: string;
  is_active: boolean;
}

export interface WorkerSubtypeRuleFormData {
  health_employee_pays: boolean;
  health_employee_rate: string;
  health_employer_rate: string;
  pension_employee_pays: boolean;
  pension_employee_rate: string;
  pension_employer_rate: string;
  ccf_applies: boolean;
  icbf_applies: boolean;
  sena_applies: boolean;
  arl_applies: boolean;
  fsp_applies: boolean;
  fsp_special_rate: string;
  ibc_min_smmlv_percentage: string;
  legal_notes: string;
  is_active: boolean;
}

// Exogenous Format Management Types
export interface ExogenousFormat {
  id: string;
  code: string;
  year: number;
  name: string;
}

export interface ExogenousConcept {
  id: string;
  exogenous_format_id: string;
  code: string;
  name: string;
  account_code?: string | null;
  account_name?: string | null;
}

export interface ExogenousFormatFormData {
  code: string;
  year: number;
  name: string;
}

export interface ExogenousConceptFormData {
  code: string;
  name: string;
  account_code: string;
  account_name: string;
}

// ===== NOTIFICATIONS =====

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
  sent_to_all: boolean;
  sent_count: number;
  sent_by?: string;
  created_at: string;
  _count?: { notifications: number };
}

export interface CompanyNotification {
  id: string;
  company_id: string;
  broadcast_id?: string;
  source: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface SendBroadcastPayload {
  title: string;
  message: string;
  type: string;
  action_url?: string;
  send_to_all?: boolean;
  company_ids?: string[];
}

export interface BroadcastResponse {
  success: boolean;
  sent_count: number;
  broadcast_id: string;
}
