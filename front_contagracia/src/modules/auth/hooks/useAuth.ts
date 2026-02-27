import { useState } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import * as authService from '@/modules/auth/services/authService';
import type {
  LoginCredentials,
  RegisterCompanyData,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/modules/auth/services/authService';

/**
 * Hook personalizado para manejar autenticación
 * Proporciona acceso al estado y funciones de auth
 */
export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del store
  const {
    user,
    token,
    company,
    subscription,
    isAuthenticated,
    logout: logoutStore,
  } = useAuthStore();

  /**
   * Login con NIT + email + password
   */
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registro de empresa
   */
  const registerCompany = async (data: RegisterCompanyData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.registerCompany(data);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verificar email
   */
  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.verifyEmail({ token });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
    } catch (err: any) {
      setError(err.message);
      // No lanzar error en logout
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cerrar todas las sesiones
   */
  const logoutAll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logoutAll();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Solicitar reset de contraseña
   */
  const forgotPassword = async (data: ForgotPasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resetear contraseña
   */
  const resetPassword = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cambiar contraseña
   */
  const changePassword = async (data: ChangePasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.changePassword(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cambiar de compañía
   */
  const switchCompany = async (companyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.switchCompany(companyId);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtener sesiones activas
   */
  const getActiveSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessions = await authService.getActiveSessions();
      return sessions;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Revocar sesión específica
   */
  const revokeSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.revokeSession(sessionId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Estado
    user,
    token,
    company,
    subscription,
    isAuthenticated,
    isLoading,
    error,

    // Funciones
    login,
    logout,
    logoutAll,
    registerCompany,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    switchCompany,
    getActiveSessions,
    revokeSession,

    // Utilidades
    clearError: () => setError(null),
  };
};
