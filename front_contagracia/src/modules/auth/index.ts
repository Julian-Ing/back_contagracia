/**
 * Módulo de autenticación
 * Exporta todo lo necesario para usar auth en la aplicación
 */

// Store
export { useAuthStore, useAuthHydrated } from '@/modules/auth/stores/authStore';

// Hooks
export { useAuth } from '@/modules/auth/hooks/useAuth';

// Components (carga dinámica)
export { AuthModal } from '@/modules/auth/components';

// Services (por si se necesitan directamente)
export * as authService from '@/modules/auth/services/authService';

// Types (re-exportar para conveniencia)
export type {
  LoginCredentials,
  RegisterCompanyData,
  RegisterCompanyResponse,
  VerifyEmailData,
  ForgotPasswordData,
  ResetPasswordData,
  ChangePasswordData,
  SendVerificationCodeData,
  SendVerificationCodeResponse,
  VerifyCodeData,
  VerifyCodeResponse,
  CheckNitResponse,
} from '@/modules/auth/services/authService';
