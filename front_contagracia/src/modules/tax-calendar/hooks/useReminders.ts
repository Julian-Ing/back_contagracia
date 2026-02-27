'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { reminderService } from '../services/taxCalendar.service';
import type {
  ReminderExecutionResult,
  ReminderTestResult,
  SchedulerStatus,
} from '../types';

export function useReminders() {
  const companyId = useAuthStore((s) => s.company?.id);

  // Estado
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [lastExecution, setLastExecution] = useState<ReminderExecutionResult | null>(null);
  const [testResult, setTestResult] = useState<ReminderTestResult | null>(null);

  /**
   * Obtiene el estado del scheduler
   */
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = await reminderService.getSchedulerStatus();
      setSchedulerStatus(status);

      return status;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al obtener estado del scheduler';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Ejecuta los recordatorios manualmente
   */
  const executeReminders = useCallback(
    async (daysAhead?: number, includeOverdue?: boolean) => {
      try {
        setExecuting(true);
        setError(null);

        const result = await reminderService.executeReminders(daysAhead, includeOverdue);
        setLastExecution(result);

        toast.success(
          `Recordatorios ejecutados: ${result.notificationsSent} notificaciones enviadas`
        );

        return result;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Error al ejecutar recordatorios';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setExecuting(false);
      }
    },
    []
  );

  /**
   * Prueba recordatorios para la empresa actual
   */
  const testReminders = useCallback(
    async (daysAhead?: number) => {
      if (!companyId) {
        toast.error('No hay empresa seleccionada');
        return null;
      }

      try {
        setExecuting(true);
        setError(null);

        const result = await reminderService.testForCompany(companyId, daysAhead);
        setTestResult(result);

        toast.success(
          `Test completado: ${result.notificationsSent} notificaciones para ${result.company.name}`
        );

        return result;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Error al probar recordatorios';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [companyId]
  );

  /**
   * Prueba recordatorios para una empresa específica
   */
  const testForCompany = useCallback(
    async (targetCompanyId: string, daysAhead?: number) => {
      try {
        setExecuting(true);
        setError(null);

        const result = await reminderService.testForCompany(targetCompanyId, daysAhead);
        setTestResult(result);

        toast.success(
          `Test completado: ${result.notificationsSent} notificaciones para ${result.company.name}`
        );

        return result;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Error al probar recordatorios';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setExecuting(false);
      }
    },
    []
  );

  /**
   * Limpia resultados
   */
  const clearResults = useCallback(() => {
    setLastExecution(null);
    setTestResult(null);
    setError(null);
  }, []);

  // Cargar estado del scheduler al montar
  useEffect(() => {
    fetchSchedulerStatus();
  }, [fetchSchedulerStatus]);

  return {
    // Estado
    loading,
    executing,
    error,

    // Datos
    schedulerStatus,
    lastExecution,
    testResult,

    // Acciones
    fetchSchedulerStatus,
    executeReminders,
    testReminders,
    testForCompany,
    clearResults,
  };
}

export default useReminders;
