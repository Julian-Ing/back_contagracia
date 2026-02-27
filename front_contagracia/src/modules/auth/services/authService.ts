import { authClient, companyClient, doRefresh } from '@/shared/services/api/apiClient';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import type { LoginResponse } from '@/shared/types/user.types';

/**
 * Servicio de autenticación
 * Consume auth-service (NestJS) en puerto 3001
 */

// ===== TIPOS DE DATOS =====

export interface LoginCredentials {
  nit?: string;
  email: string;
  password: string;
}

export interface RegisterCompanyData {
  // Empresa
  company_name: string;
  nit: string;
  dv?: string;
  company_email?: string;
  phone?: string;
  address?: string;
  // Paramétricos (IDs)
  type_organization_id?: string;
  type_document_identification_id?: string;
  type_regime_id?: string;
  type_liability_id?: string;
  country_id?: string;
  department_id?: string;
  municipality_id?: string;
  // Admin
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
  admin_phone?: string;
  // Plan
  plan_id?: string;
  // Token de verificación de email
  registration_token?: string;
}

export interface RegisterCompanyResponse {
  message: string;
  company: { id: string; company_name: string; nit: string; tenant_id: string };
  user: { id: string; email: string; full_name: string };
  subscription: { id: string; plan_name: string; status: string; ends_at: string | null };
}

export interface CheckNitResponse {
  exists: boolean;
  message?: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface ForgotPasswordData {
  email: string;
  nit?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  expires_in: number;
}

export interface VerifyResetCodeData {
  email: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  message: string;
  reset_token: string;
  expires_in: number;
}

export interface ResetPasswordData {
  token: string;
  new_password: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  full_name: string;
}

export interface RegisterUserResponse {
  message: string;
  user_id: string;
  verification_email_sent: boolean;
}

export interface SendVerificationCodeData {
  email: string;
  purpose?: 'registration' | 'company_email_change';
}

export interface SendVerificationCodeResponse {
  message: string;
  email: string;
  expires_in: number;
}

export interface VerifyCodeData {
  email: string;
  code: string;
}

export interface VerifyCodeResponse {
  message: string;
  email: string;
  registration_token: string;
  expires_in: number;
}

// ===== FUNCIONES DEL SERVICIO =====

export const register = async (data: RegisterUserData): Promise<RegisterUserResponse> => {
  try {
    const response = await authClient.post<RegisterUserResponse>('/auth/register', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al registrar el usuario');
  }
};

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const payload: Record<string, string> = {
      email: credentials.email,
      password: credentials.password,
    };
    if (credentials.nit) {
      payload.nit = credentials.nit;
    }
    const response = await authClient.post<LoginResponse>('/auth/login', payload);

    const { access_token, refresh_token, user_type, user, company, subscription, permissions, role } = response.data;

    useAuthStore.getState().setAuthData({
      user,
      token: access_token,
      refreshToken: refresh_token,
      userType: user_type,
      role,
      company: company ?? null,
      subscription: subscription ?? undefined,
      permissions: permissions ?? undefined,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

export const checkNitExists = async (nit: string): Promise<CheckNitResponse> => {
  try {
    const response = await companyClient.get<CheckNitResponse>(`/companies/check-nit/${nit}`);
    return response.data;
  } catch (error: any) {
    return { exists: false };
  }
};

export const registerCompany = async (
  data: RegisterCompanyData
): Promise<RegisterCompanyResponse> => {
  try {
    const response = await companyClient.post<RegisterCompanyResponse>('/companies/register', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al registrar la empresa');
  }
};

export const verifyEmail = async (data: VerifyEmailData): Promise<void> => {
  try {
    await authClient.post('/auth/verify-email', data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al verificar el email');
  }
};

export const sendVerificationCode = async (data: SendVerificationCodeData): Promise<SendVerificationCodeResponse> => {
  try {
    const response = await authClient.post<SendVerificationCodeResponse>('/auth/send-verification-code', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al enviar el código de verificación');
  }
};

export const verifyCode = async (data: VerifyCodeData): Promise<VerifyCodeResponse> => {
  try {
    const response = await authClient.post<VerifyCodeResponse>('/auth/verify-code', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al verificar el código');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await authClient.post('/auth/logout');
  } catch (error) {
    console.error('Error al hacer logout en el backend:', error);
  } finally {
    useAuthStore.getState().logout();
  }
};

export const logoutAll = async (): Promise<void> => {
  try {
    await authClient.post('/auth/logout-all');
    useAuthStore.getState().logout();
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cerrar todas las sesiones');
  }
};

export const forgotPassword = async (data: ForgotPasswordData): Promise<ForgotPasswordResponse> => {
  try {
    const response = await authClient.post<ForgotPasswordResponse>('/passwords/forgot', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al solicitar código de recuperación');
  }
};

export const verifyResetCode = async (data: VerifyResetCodeData): Promise<VerifyResetCodeResponse> => {
  try {
    const response = await authClient.post<VerifyResetCodeResponse>('/passwords/verify-code', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al verificar el código');
  }
};

export const resetPassword = async (data: ResetPasswordData): Promise<void> => {
  try {
    await authClient.post('/passwords/reset', data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al restablecer la contraseña');
  }
};

export const changePassword = async (data: ChangePasswordData): Promise<void> => {
  try {
    await authClient.post('/passwords/change', data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cambiar la contraseña');
  }
};

export const refreshToken = async (): Promise<void> => {
  try {
    // Usar doRefresh() con mutex para evitar race conditions
    // doRefresh() ya maneja getRefreshToken, setTokens internamente
    await doRefresh();
  } catch (error: any) {
    useAuthStore.getState().logout();
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }
};

export const getActiveSessions = async (): Promise<any[]> => {
  try {
    const response = await authClient.get('/auth/sessions');
    return response.data.sessions;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener sesiones');
  }
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  try {
    await authClient.delete(`/auth/sessions/${sessionId}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al revocar la sesión');
  }
};

export const switchCompany = async (companyId: string): Promise<LoginResponse> => {
  try {
    const response = await authClient.post<LoginResponse>('/auth/switch-company', {
      company_id: companyId,
    });

    const { access_token, refresh_token, user_type, user, company, subscription, permissions, role } = response.data;

    useAuthStore.getState().setAuthData({
      user,
      token: access_token,
      refreshToken: refresh_token,
      userType: user_type ?? 'company_user',
      role: role ?? 'user',
      company,
      subscription: subscription ?? undefined,
      permissions: permissions ?? undefined,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cambiar de compañía');
  }
};

/**
 * Reclamar sesión desplazada (marcar esta como activa y desplazar las demás)
 */
export const reclaimSession = async (): Promise<void> => {
  try {
    await authClient.post('/auth/reclaim-session');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al reclamar la sesión');
  }
};

/**
 * Refrescar permisos del usuario actual
 * Llama a GET /auth/me para obtener permisos actualizados
 */
export const refreshPermissions = async (): Promise<void> => {
  try {
    const response = await authClient.get<{
      user_type: string;
      user: { id: string; email: string; full_name: string };
      company?: { id: string; name: string; nit: string };
      permissions?: { modules: string[]; actions: string[] };
      role?: string;
    }>('/auth/me');

    const { permissions, role } = response.data;

    // Solo actualizar permisos si los recibimos
    if (permissions && role) {
      useAuthStore.getState().setPermissions({
        role,
        modules: permissions.modules,
        actions: permissions.actions,
      });
    }
    if (role) {
      useAuthStore.getState().setRole(role);
    }
  } catch (error: any) {
    console.error('Error al refrescar permisos:', error);
    // No lanzar error, solo loguear - los permisos antiguos siguen válidos
  }
};
