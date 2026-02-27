'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { authClient } from '@/shared/services/api/apiClient';
import toast from 'react-hot-toast';

// Tipos de eventos que el servidor puede emitir
type RealtimeEvent =
  | 'permissions:refresh'
  | 'session:force_logout'
  | 'session:displaced'
  | 'roles:changed'
  | 'users:changed'
  | 'companies:changed'
  | 'master_users:changed'
  | 'notifications:received'
  | 'notifications:read'
  | 'notifications:all_read'
  | 'company:settings_updated'
  | 'company:modules_updated';

interface RealtimeContextValue {
  isConnected: boolean;
  subscribe: (event: RealtimeEvent, callback: (data: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3001';
const TAB_ID_KEY = 'contagracia-tab-id';

/** ID único por pestaña (sessionStorage NO se comparte entre pestañas) */
function getTabId(): string {
  if (typeof window === 'undefined') return '';
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = crypto.randomUUID();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<Map<RealtimeEvent, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const setRole = useAuthStore((s) => s.setRole);

  // Función para refrescar permisos desde el backend
  const refreshPermissions = useCallback(async () => {
    try {
      const res = await authClient.get('/auth/me');
      const { permissions, role } = res.data;
      if (permissions) {
        setPermissions(permissions);
      }
      if (role) {
        setRole(role);
      }
    } catch (error) {
      console.error('[Realtime] Error refreshing permissions:', error);
    }
  }, [setPermissions, setRole]);

  // Manejar forzar logout
  const handleForceLogout = useCallback(
    (reason: string) => {
      toast.error(reason || 'Tu sesión ha sido cerrada');
      logout();
      window.location.href = '/';
    },
    [logout]
  );

  // Notificar a los suscriptores
  const notifySubscribers = useCallback((event: RealtimeEvent, data: any) => {
    const callbacks = subscribersRef.current.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }, []);

  // Limpiar timeout de reconexión
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Conectar al WebSocket
  useEffect(() => {
    // Limpiar timeout pendiente
    clearReconnectTimeout();

    if (!isAuthenticated || !token) {
      // Desconectar si no está autenticado
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Desconectar socket anterior si existe (token cambió)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('[Realtime] Conectando con token:', token.substring(0, 20) + '...');

    // Conectar al namespace /realtime
    const socket = io(`${AUTH_SERVICE_URL}/realtime`, {
      auth: { token, tabId: getTabId() },
      transports: ['websocket', 'polling'],
      reconnection: false, // Manejamos reconexión manualmente
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Realtime] Conectado');
      setIsConnected(true);
      isReconnectingRef.current = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('[Realtime] Desconectado:', reason);
      setIsConnected(false);

      // Si el servidor nos desconectó (ej: token inválido), intentar reconectar
      // después de un delay para dar tiempo al refresh del token
      if (reason === 'io server disconnect' && !isReconnectingRef.current) {
        isReconnectingRef.current = true;
        console.log('[Realtime] Servidor desconectó, intentando refrescar token y reconectar en 2s...');

        reconnectTimeoutRef.current = setTimeout(async () => {
          // Obtener el token actual del store (puede haber sido refrescado)
          const currentToken = useAuthStore.getState().token;
          const currentAuth = useAuthStore.getState().isAuthenticated;

          if (currentAuth && currentToken && currentToken !== token) {
            console.log('[Realtime] Token cambió, reconectando...');
            // El token cambió, el useEffect se re-ejecutará por el cambio de token
            isReconnectingRef.current = false;
          } else if (currentAuth && currentToken) {
            // Intentar forzar un refresh del token
            try {
              const refreshToken = useAuthStore.getState().refreshToken;
              if (refreshToken) {
                const res = await authClient.post('/auth/refresh', { refresh_token: refreshToken });
                const { access_token, refresh_token } = res.data;
                useAuthStore.getState().setTokens(access_token, refresh_token);
                console.log('[Realtime] Token refrescado, reconectando...');
              }
            } catch (error) {
              console.error('[Realtime] Error refrescando token:', error);
              // Si falla el refresh, cerrar sesión
              logout();
              window.location.href = '/';
            }
          }
          isReconnectingRef.current = false;
        }, 2000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Realtime] Error de conexión:', error.message);
    });

    // Eventos de permisos
    socket.on('permissions:refresh', (data) => {
      console.log('[Realtime] permissions:refresh', data);
      refreshPermissions();
      notifySubscribers('permissions:refresh', data);
    });

    // Eventos de sesión forzada
    socket.on('session:force_logout', (data) => {
      console.log('[Realtime] session:force_logout', data);
      handleForceLogout(data.reason);
    });

    // Sesión desplazada (tipo WhatsApp Web)
    socket.on('session:displaced', (data) => {
      console.log('[Realtime] session:displaced', data);
      notifySubscribers('session:displaced', data);
    });

    // Eventos de cambios en listas (para vistas en tiempo real)
    socket.on('roles:changed', (data) => {
      console.log('[Realtime] roles:changed', data);
      notifySubscribers('roles:changed', data);
    });

    socket.on('users:changed', (data) => {
      console.log('[Realtime] users:changed', data);
      notifySubscribers('users:changed', data);
    });

    socket.on('companies:changed', (data) => {
      console.log('[Realtime] companies:changed', data);
      notifySubscribers('companies:changed', data);
    });

    socket.on('master_users:changed', (data) => {
      console.log('[Realtime] master_users:changed', data);
      notifySubscribers('master_users:changed', data);
    });

    // Eventos de notificaciones
    socket.on('notifications:received', (data) => {
      notifySubscribers('notifications:received', data);
    });

    socket.on('notifications:read', (data) => {
      notifySubscribers('notifications:read', data);
    });

    socket.on('notifications:all_read', (data) => {
      notifySubscribers('notifications:all_read', data);
    });

    socket.on('company:settings_updated', (data) => {
      console.log('[Realtime] company:settings_updated', data);
      notifySubscribers('company:settings_updated', data);
    });

    socket.on('company:modules_updated', (data) => {
      console.log('[Realtime] company:modules_updated', data);
      notifySubscribers('company:modules_updated', data);
    });

    return () => {
      clearReconnectTimeout();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token, refreshPermissions, handleForceLogout, notifySubscribers, clearReconnectTimeout, logout]);

  // Función para suscribirse a eventos
  const subscribe = useCallback((event: RealtimeEvent, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)!.add(callback);

    // Retornar función para desuscribirse
    return () => {
      const callbacks = subscribersRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de realtime
 */
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime debe usarse dentro de RealtimeProvider');
  }
  return context;
}

/**
 * Hook para suscribirse a eventos de cambios en listas
 * Útil para refrescar datos automáticamente cuando hay cambios
 */
export function useRealtimeList(
  event: 'roles:changed' | 'users:changed' | 'companies:changed' | 'master_users:changed',
  onUpdate: (data: { action: string; roleId?: string; userId?: string; companyId?: string }) => void
) {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe(event, onUpdate);
    return unsubscribe;
  }, [event, onUpdate, subscribe]);
}
