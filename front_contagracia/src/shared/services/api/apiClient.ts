import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { API_CONFIG } from '@/config/api.config';

/**
 * API Client centralizado con interceptors para:
 * - Agregar token automáticamente
 * - Refresh proactivo: renueva el token ANTES de que expire (por actividad)
 * - Manejar refresh token con mutex (evita race conditions)
 * - Mensaje limpio de "sesión expirada" (sin cascada de errores)
 */

// Auth store references (registradas dinámicamente para evitar circular deps)
let getToken: (() => string | null) | null = null;
let getRefreshToken: (() => string | null) | null = null;
let setTokens: ((accessToken: string, refreshToken: string) => void) | null = null;
let logout: (() => void) | null = null;

export const registerAuthStore = (store: {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}) => {
  getToken = store.getToken;
  getRefreshToken = store.getRefreshToken;
  setTokens = store.setTokens;
  logout = store.logout;
};

// --- Mutex de refresh token (compartido entre TODAS las instancias) ---
let refreshPromise: Promise<string> | null = null;

// --- Flag para evitar cascada de toasts/redirects al expirar sesión ---
let sessionExpiredHandled = false;

const PUBLIC_ENDPOINTS = [
  '/auth/login', '/auth/register', '/auth/verify-email',
  '/auth/send-verification-code', '/auth/verify-code', '/auth/refresh',
  '/passwords/forgot', '/passwords/verify-code', '/passwords/reset',
];

// --- Utilidades de JWT ---

/** Decodifica el payload del JWT sin verificar firma (solo para leer exp) */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

/** Retorna true si el token expira en menos de `thresholdSeconds` */
function isTokenExpiringSoon(token: string, thresholdSeconds = 300): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return (payload.exp - now) < thresholdSeconds;
}

/** Ejecuta el refresh y retorna el nuevo access token (mutex: una sola llamada concurrente) */
export function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const currentRefreshToken = getRefreshToken?.();
  if (!currentRefreshToken || !setTokens) {
    return Promise.reject(new Error('No refresh token'));
  }

  refreshPromise = axios
    .post(`${API_CONFIG.AUTH}/auth/refresh`, {
      refresh_token: currentRefreshToken,
    })
    .then((res) => {
      const { access_token, refresh_token: newRefreshToken } = res.data;
      setTokens!(access_token, newRefreshToken);
      // Reset flag — sesión válida de nuevo
      sessionExpiredHandled = false;
      return access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** Maneja sesión expirada: un solo toast + logout + redirect */
function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;

  logout?.();
  toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
    duration: 5000,
    id: 'session-expired', // Evita toasts duplicados
  });

  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
}

// --- Factory de clientes axios ---

const createApiClient = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request Interceptor: token + refresh proactivo
  instance.interceptors.request.use(
    async (config) => {
      // Si la sesión ya expiró, no hacer más requests
      if (sessionExpiredHandled) {
        return Promise.reject(new axios.Cancel('Sesión expirada'));
      }

      let token = getToken?.();
      const isPublic = PUBLIC_ENDPOINTS.some(ep => config.url?.includes(ep));

      // Refresh proactivo: si el token expira en <5 min, renovarlo ANTES del request
      if (token && !isPublic && isTokenExpiringSoon(token)) {
        try {
          token = await doRefresh();
        } catch (refreshError: any) {
          // Si el refresh devolvió 401, el refresh token también expiró → sesión muerta
          if (refreshError?.response?.status === 401) {
            handleSessionExpired();
            return Promise.reject(new axios.Cancel('Sesión expirada'));
          }
          // Error de red u otro → continuar con token actual, el response interceptor manejará
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: manejo de 401
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      // Si ya se manejó la expiración, no propagar más errores
      if (sessionExpiredHandled) {
        return Promise.reject(new axios.Cancel('Sesión expirada'));
      }

      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      const isPublic = PUBLIC_ENDPOINTS.some(ep => originalRequest.url?.includes(ep));

      if (error.response?.status === 401 && !originalRequest._retry && !isPublic) {
        originalRequest._retry = true;

        try {
          const newAccessToken = await doRefresh();

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return instance(originalRequest);
        } catch {
          handleSessionExpired();
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Crear clientes para cada microservicio
export const authClient = createApiClient(API_CONFIG.AUTH);
export const adminClient = createApiClient(API_CONFIG.ADMIN);
export const companyClient = createApiClient(API_CONFIG.COMPANY);
export const usersClient = createApiClient(API_CONFIG.USERS);
export const invoicingClient = createApiClient(API_CONFIG.INVOICING);
export const inventoryClient = createApiClient(API_CONFIG.INVENTORY);
export const quoteClient = createApiClient(API_CONFIG.QUOTE);
export const purchasesClient = createApiClient(API_CONFIG.PURCHASES);
export const accountingClient = createApiClient(API_CONFIG.ACCOUNTING);
export const taxClient = createApiClient(API_CONFIG.TAX);
export const crmClient = createApiClient(API_CONFIG.CRM);
export const hrClient = createApiClient(API_CONFIG.HR);
export const reportsClient = createApiClient(API_CONFIG.REPORTS);
export const integrationsClient = createApiClient(API_CONFIG.INTEGRATIONS);
export const electronicDocsClient = createApiClient(API_CONFIG.ELECTRONIC_DOCS);
export const notificationsClient = createApiClient(API_CONFIG.NOTIFICATIONS);
export const phClient = createApiClient(API_CONFIG.PH);
export const mediaClient = createApiClient(API_CONFIG.MEDIA);

// Cliente por defecto (auth service)
export const apiClient = authClient;
