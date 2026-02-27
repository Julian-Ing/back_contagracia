export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user_type: 'system_admin' | 'company_user';
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  company?: {
    id: string;
    name: string;
    nit: string;
    logo_url?: string | null;
  };
  subscription?: {
    plan_id: string;
    plan_name: string;
  };
  role?: string;
  permissions?: {
    modules: string[];
    actions: string[];
  };
  must_change_password?: boolean;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}
