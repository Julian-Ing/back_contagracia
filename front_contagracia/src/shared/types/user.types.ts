/**
 * User and Authentication types
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user_type: 'system_admin' | 'owner' | 'company_user';
  user: User;
  company?: Company;
  subscription?: Subscription;
  permissions?: Permission;
  role: string;
}

export interface RegisterCompanyDto {
  // Company data
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

  // Admin user data
  admin_email: string;
  admin_password: string;
  admin_full_name: string;

  // Optional plan
  plan_id?: string;
}

export interface LoginDto {
  nit: string;
  email: string;
  password: string;
}

export interface Company {
  id: string;
  company_name: string;
  nit: string;
  dv?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  database_name: string;
  logo_url?: string | null;
  user_plus: number; // Usuarios adicionales comprados
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan_name: string;
  max_users: number; // Límite de usuarios del plan
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  starts_at: string;
  ends_at?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  role: string;
  modules: string[];
  actions: string[];
}
