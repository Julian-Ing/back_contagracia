/**
 * Types for Company Module
 */

export interface Company {
  id: string;
  company_name: string;
  nit: string;
  dv: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  sector: string;
  employees_count: string;
  entity_type: string;
  doc_type: string;
  regime: string;
  liability: string;
  department: string;
  municipality: string;
  database_name: string;
  logo_url?: string | null;
  is_active: boolean;
  display_decimals?: number;
  created_at: string;
  updated_at: string;
  // Representante Legal
  legal_rep_name?: string | null;
  legal_rep_identification?: string | null;
  legal_rep_phone?: string | null;
  legal_rep_email?: string | null;
  legal_rep_signature_url?: string | null;
  // Contador
  contador_name?: string | null;
  contador_identification?: string | null;
  contador_phone?: string | null;
  contador_email?: string | null;
  contador_signature_url?: string | null;
  // Revisor Fiscal
  revisor_fiscal_name?: string | null;
  revisor_fiscal_identification?: string | null;
  revisor_fiscal_phone?: string | null;
  revisor_fiscal_email?: string | null;
  revisor_fiscal_signature_url?: string | null;
}

export interface RegisterCompanyDto {
  // Datos de la empresa
  company_name: string;
  nit: string;
  dv: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
  sector: string;
  employees_count: string;
  entity_type: string;
  doc_type: string;
  regime: string;
  liability: string;
  department: string;
  municipality: string;

  // Datos del administrador inicial
  admin_email: string;
  admin_password: string;
  admin_full_name: string;

  // Plan inicial (opcional)
  plan_id?: string;
}

export interface RegisterCompanyResponse {
  message: string;
  company_id: string;
  user_id: string;
  verification_email_sent: boolean;
}

export interface UpdateCompanyDto {
  nit: string;
  dv: string;
  type_document_identification_id: string;
  type_organization_id: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  department_id: string;
  municipality_id: string;
  type_regime_id: string;
  type_liability_id: string;
  legal_rep_name: string;
  legal_rep_identification: string;
  legal_rep_phone: string;
  legal_rep_email: string;
  display_decimals: number;
  logo_url?: string;
}

export interface UpdateCompanyInfoDto {
  nit: string;
  dv: string;
  type_document_identification_id: string;
  type_organization_id: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  department_id: string;
  municipality_id: string;
  type_regime_id: string;
  type_liability_id: string;
}

export interface UpdateLegalRepDto {
  legal_rep_name: string;
  legal_rep_identification: string;
  legal_rep_phone: string;
  legal_rep_email: string;
}

export interface UpdateContadorDto {
  contador_name?: string;
  contador_identification?: string;
  contador_phone?: string;
  contador_email?: string;
}

export interface UpdateRevisorFiscalDto {
  revisor_fiscal_name?: string;
  revisor_fiscal_identification?: string;
  revisor_fiscal_phone?: string;
  revisor_fiscal_email?: string;
}

export interface UpdateSettingsDto {
  display_decimals: number;
}

// ============================================
// TENANT USERS
// ============================================

export interface TenantUserRole {
  id: string;
  role_key: string;
  role_name: string;
}

export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  must_change_password?: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  created_at: string;
  updated_at?: string;
  role: TenantUserRole | null;
}

export interface TenantUsersResponse {
  data: TenantUser[];
  total: number;
  skip: number;
  take: number;
  maxUsers?: number;
}

export interface CreateTenantUserDto {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role_id?: string;
}

export interface UpdateTenantUserDto {
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role_id?: string;
}

export interface Role {
  id: string;
  role_key: string;
  role_name: string;
  description?: string;
  is_system: boolean;
  permissions?: Array<{ action_key: string; granted: boolean }>;
}

export interface RolesResponse {
  data: Role[];
}

export interface CreateRoleDto {
  role_key: string;
  role_name: string;
  description?: string;
  permissions?: Array<{ action_key: string; granted?: boolean }>;
}

// ============================================
// AVAILABLE ACTIONS (from plan)
// ============================================

export interface PlanAction {
  action_key: string;
  action_name: string;
  description: string | null;
  module_key: string;
  module_name: string;
}

export interface PlanModuleOption {
  module_key: string;
  module_name: string;
}

export interface AvailableActionsParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  actionKeys?: string[]; // Filtrar solo estas acciones (para "Solo asignados")
}

export interface AvailableActionsResponse {
  data: PlanAction[];
  modules: PlanModuleOption[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
