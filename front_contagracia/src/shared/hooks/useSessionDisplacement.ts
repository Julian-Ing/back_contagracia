'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { useRealtime } from '@/shared/providers/RealtimeProvider';
import { reclaimSession as reclaimSessionApi } from '@/modules/auth/services/authService';

export function useSessionDisplacement() {
  const { subscribe } = useRealtime();

  const sessionId = useAuthStore((s) => s.sessionId);
  const isDisplaced = useAuthStore((s) => s.isDisplaced);
  const setDisplaced = useAuthStore((s) => s.setDisplaced);
  const logout = useAuthStore((s) => s.logout);

  // --- WebSocket: escuchar evento session:displaced ---
  // Emitido por el gateway cuando otra pestaña/navegador se conecta,
  // o por el backend cuando hay un nuevo login o reclaim.
  useEffect(() => {
    const unsub = subscribe('session:displaced', (data: {
      activeSessionId: string;
      reason: string;
      deviceInfo?: string;
    }) => {
      if (!sessionId) return;
      // Si el activeSessionId es el mío, yo soy el activo → no desplazado
      if (data.activeSessionId === sessionId) return;
      setDisplaced(true);
    });

    return unsub;
  }, [subscribe, sessionId, setDisplaced]);

  // --- Reclamar sesión ("Usar aquí") ---
  const reclaimSession = useCallback(async () => {
    await reclaimSessionApi();
    setDisplaced(false);
  }, [setDisplaced]);

  // --- Cerrar sesión desplazada ---
  const closeSession = useCallback(() => {
    setDisplaced(false);
    logout();
    window.location.href = '/';
  }, [logout, setDisplaced]);

  return {
    isDisplaced,
    reclaimSession,
    closeSession,
  };
}
