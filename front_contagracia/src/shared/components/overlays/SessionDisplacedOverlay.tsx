'use client';

import React, { useState } from 'react';
import { useSessionDisplacement } from '@/shared/hooks/useSessionDisplacement';
import { Monitor, LogOut, RefreshCw } from 'lucide-react';

export function SessionDisplacedOverlay() {
  const { isDisplaced, reclaimSession, closeSession } = useSessionDisplacement();
  const [isReclaiming, setIsReclaiming] = useState(false);

  if (!isDisplaced) return null;

  const handleReclaim = async () => {
    setIsReclaiming(true);
    try {
      await reclaimSession();
    } catch (error) {
      console.error('Error reclaiming session:', error);
    } finally {
      setIsReclaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Monitor className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Tu sesión se abrió en otro lugar
        </h2>

        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Se inició sesión con tu cuenta en otro navegador o dispositivo.
          Puedes continuar aquí o cerrar esta sesión.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleReclaim}
            disabled={isReclaiming}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isReclaiming ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
            {isReclaiming ? 'Reclamando...' : 'Usar aquí'}
          </button>

          <button
            onClick={closeSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
