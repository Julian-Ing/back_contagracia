export interface JwtPayload {
  sub: string; // user_id (master) o tenant_user_id
  email: string;
  user_type: 'owner' | 'company_user' | 'system_admin';

  // Campos para company_user:
  company_id?: string;
  database_url?: string;
  role?: string;
  permissions?: {
    modules: string[];
    actions: string[];
  };

  session_id: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string; // user_id
  session_id: string;
  iat: number;
  exp: number; // 7 días
}
