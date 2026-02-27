import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import type { User, Company, Subscription, Permission } from '@/shared/types/user.types';
import { registerAuthStore, authClient, doRefresh } from '@/shared/services/api/apiClient';

type SubscriptionInfo = Subscription | { plan_id: string; plan_name: string; status: string } | null;

/** Decodifica session_id del JWT sin verificar firma */
function decodeSessionIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.session_id || null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  userType: 'system_admin' | 'owner' | 'company_user' | null;
  role: string | null;
  company: Company | null;
  subscription: SubscriptionInfo;
  permissions: Permission | null;
  isAuthenticated: boolean;
  sessionId: string | null;
  isDisplaced: boolean;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCompany: (company: Company) => void;
  setSubscription: (subscription: SubscriptionInfo) => void;
  setPermissions: (permissions: Permission) => void;
  setRole: (role: string) => void;
  setDisplaced: (displaced: boolean) => void;
  setAuthData: (data: {
    user: User;
    token: string;
    refreshToken: string;
    userType: 'system_admin' | 'owner' | 'company_user';
    role: string;
    company?: Company | null;
    subscription?: SubscriptionInfo;
    permissions?: Permission;
  }) => void;
  logout: () => void;
  isOwner: () => boolean;
  getToken: () => string | null;
  getRefreshToken: () => string | null;
}

/**
 * Hook that returns true once the auth store has finished
 * rehydrating from localStorage. Prevents premature redirects
 * on page refresh in Next.js.
 */
/**
 * Validates the session against the backend on page reload.
 * On normal SPA navigation the session is trusted (already validated).
 * On hard reload / new tab, we attempt a refresh-token call;
 * if it fails the user is logged out automatically.
 */
export const useAuthHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const onHydrated = async () => {
      const state = useAuthStore.getState();

      // Migrar sessionId si falta (sesiones creadas antes del feature)
      if (state.token && !state.sessionId) {
        const sid = decodeSessionIdFromJwt(state.token);
        if (sid) useAuthStore.setState({ sessionId: sid });
      }

      // Only validate on actual page load (not SPA navigation).
      // sessionStorage flag is set after first successful hydration.
      const alreadyValidated = sessionStorage.getItem('auth-validated');

      if (state.isAuthenticated && state.refreshToken && !alreadyValidated) {
        try {
          // Usar doRefresh() con mutex para evitar race conditions
          // con el interceptor de axios (que también llama doRefresh)
          await doRefresh();
          sessionStorage.setItem('auth-validated', '1');

          // Refrescar permisos después de validar sesión
          await refreshPermissionsFromBackend();
        } catch {
          state.logout();
          // Redirigir al login
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return;
        }
      } else if (state.isAuthenticated && !alreadyValidated) {
        sessionStorage.setItem('auth-validated', '1');
        // Refrescar permisos en primera carga
        await refreshPermissionsFromBackend();
      }
      setHydrated(true);
    };

    const persistApi = useAuthStore.persist;
    if (persistApi.hasHydrated()) {
      onHydrated();
      return;
    }
    const unsub = persistApi.onFinishHydration(() => onHydrated());
    return unsub;
  }, []);

  return hydrated;
};

/**
 * Función interna para refrescar permisos desde el backend
 */
async function refreshPermissionsFromBackend() {
  try {
    const res = await authClient.get('/auth/me');
    const { permissions, role } = res.data;
    const state = useAuthStore.getState();
    if (permissions) {
      state.setPermissions(permissions);
    }
    if (role) {
      state.setRole(role);
    }
  } catch (error) {
    console.error('Error refreshing permissions:', error);
  }
}

// --- Dual-session storage: admin + tenant coexisten en localStorage ---
// Cada pestaña sabe su tipo via sessionStorage (no se comparte entre pestañas).
// Los datos de sesión se persisten en localStorage con keys separadas.
const ADMIN_KEY = 'contagracia-auth-admin';
const TENANT_KEY = 'contagracia-auth-tenant';
const TYPE_KEY = 'contagracia-auth-type';
const OLD_KEY = 'contagracia-auth';

const multiSessionStorage = {
  getItem: (_name: string): string | null => {
    if (typeof window === 'undefined') return null;

    // Migrar desde key vieja (sesión única) → nueva estructura
    const oldData = localStorage.getItem(OLD_KEY);
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData);
        const userType = parsed?.state?.userType;
        if (userType === 'system_admin') {
          localStorage.setItem(ADMIN_KEY, oldData);
        } else if (userType) {
          localStorage.setItem(TENANT_KEY, oldData);
        }
      } catch { /* ignore */ }
      localStorage.removeItem(OLD_KEY);
    }

    // Si esta pestaña ya tiene tipo asignado → leer esa key
    const tabType = sessionStorage.getItem(TYPE_KEY);
    if (tabType === 'admin') return localStorage.getItem(ADMIN_KEY);
    if (tabType === 'tenant') return localStorage.getItem(TENANT_KEY);

    // Pestaña nueva: auto-detectar si solo hay una sesión activa
    const adminData = localStorage.getItem(ADMIN_KEY);
    const tenantData = localStorage.getItem(TENANT_KEY);

    if (adminData && !tenantData) {
      sessionStorage.setItem(TYPE_KEY, 'admin');
      return adminData;
    }
    if (tenantData && !adminData) {
      sessionStorage.setItem(TYPE_KEY, 'tenant');
      return tenantData;
    }

    // Ambas existen o ninguna → mostrar login
    return null;
  },

  setItem: (_name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      const state = parsed?.state;

      // Logout: limpiar solo la sesión de esta pestaña
      if (!state?.isAuthenticated) {
        const tabType = sessionStorage.getItem(TYPE_KEY);
        if (tabType === 'admin') localStorage.removeItem(ADMIN_KEY);
        else if (tabType === 'tenant') localStorage.removeItem(TENANT_KEY);
        sessionStorage.removeItem(TYPE_KEY);
        return;
      }

      // Login/update: guardar en la key correcta según userType
      if (state.userType === 'system_admin') {
        sessionStorage.setItem(TYPE_KEY, 'admin');
        localStorage.setItem(ADMIN_KEY, value);
      } else {
        sessionStorage.setItem(TYPE_KEY, 'tenant');
        localStorage.setItem(TENANT_KEY, value);
      }
    } catch { /* ignore */ }
  },

  removeItem: (_name: string): void => {
    if (typeof window === 'undefined') return;
    const tabType = sessionStorage.getItem(TYPE_KEY);
    if (tabType === 'admin') localStorage.removeItem(ADMIN_KEY);
    else if (tabType === 'tenant') localStorage.removeItem(TENANT_KEY);
    sessionStorage.removeItem(TYPE_KEY);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      userType: null,
      role: null,
      company: null,
      subscription: null,
      permissions: null,
      isAuthenticated: false,
      sessionId: null,
      isDisplaced: false,

      setUser: (user) => set({ user }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),

      setCompany: (company) => set({ company }),
      setSubscription: (subscription) => set({ subscription }),
      setPermissions: (permissions) => set({ permissions }),
      setRole: (role) => set({ role }),
      setDisplaced: (isDisplaced) => set({ isDisplaced }),

      setAuthData: (data) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth-validated', '1');
        }
        set({
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
          userType: data.userType,
          role: data.role,
          company: data.company || null,
          subscription: data.subscription || null,
          permissions: data.permissions || null,
          isAuthenticated: true,
          sessionId: decodeSessionIdFromJwt(data.token),
          isDisplaced: false,
        });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-validated');
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          userType: null,
          role: null,
          company: null,
          subscription: null,
          permissions: null,
          isAuthenticated: false,
          sessionId: null,
          isDisplaced: false,
        });
      },

      isOwner: () => get().userType === 'owner',
      getToken: () => get().token,
      getRefreshToken: () => get().refreshToken,
    }),
    {
      name: 'contagracia-auth',
      storage: createJSONStorage(() => multiSessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        userType: state.userType,
        role: state.role,
        company: state.company,
        subscription: state.subscription,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        sessionId: state.sessionId,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  registerAuthStore({
    getToken: () => useAuthStore.getState().token,
    getRefreshToken: () => useAuthStore.getState().refreshToken,
    setTokens: (accessToken, refreshToken) =>
      useAuthStore.getState().setTokens(accessToken, refreshToken),
    logout: () => useAuthStore.getState().logout(),
  });
}
