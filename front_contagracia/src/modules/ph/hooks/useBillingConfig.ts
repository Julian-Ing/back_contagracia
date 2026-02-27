import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { billingConfigsService } from '../services/ph.service';
import type { PhBillingConfig } from '../types';

export function useBillingConfig(condominiumId?: string) {
  const companyId = useAuthStore((s) => s.company?.id);
  const [billingConfigs, setBillingConfigs] = useState<PhBillingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingConfigs = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const mergedParams = { ...params };
      if (condominiumId) mergedParams.condominium_id = condominiumId;
      const res = await billingConfigsService.getAll(companyId, mergedParams);
      setBillingConfigs(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar configuraciones';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, condominiumId]);

  const createBillingConfig = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await billingConfigsService.create(companyId, data);
      toast.success('Configuracion creada exitosamente');
      await fetchBillingConfigs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear configuracion');
      throw err;
    }
  }, [companyId, fetchBillingConfigs]);

  const updateBillingConfig = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await billingConfigsService.update(companyId, id, data);
      toast.success('Configuracion actualizada exitosamente');
      await fetchBillingConfigs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar configuracion');
      throw err;
    }
  }, [companyId, fetchBillingConfigs]);

  const removeBillingConfig = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await billingConfigsService.remove(companyId, id);
      toast.success('Configuracion eliminada exitosamente');
      await fetchBillingConfigs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar configuracion');
      throw err;
    }
  }, [companyId, fetchBillingConfigs]);

  const toggleBillingConfig = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await billingConfigsService.toggle(companyId, id);
      toast.success('Estado actualizado');
      await fetchBillingConfigs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
      throw err;
    }
  }, [companyId, fetchBillingConfigs]);

  useEffect(() => {
    fetchBillingConfigs();
  }, [fetchBillingConfigs]);

  return {
    billingConfigs,
    loading,
    error,
    fetchBillingConfigs,
    createBillingConfig,
    updateBillingConfig,
    removeBillingConfig,
    toggleBillingConfig,
    refresh: fetchBillingConfigs,
  };
}
