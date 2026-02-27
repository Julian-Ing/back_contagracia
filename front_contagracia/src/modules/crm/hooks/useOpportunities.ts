import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { opportunitiesService } from '../services/crm.service';
import toast from 'react-hot-toast';
import type { CrmOpportunity } from '../types';

interface FetchParams {
  stage?: string;
  assigned_to?: string;
  search?: string;
}

export const useOpportunities = () => {
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [kanban, setKanban] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.company?.id);

  const fetch = useCallback(async (params?: FetchParams) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await opportunitiesService.getAll(companyId, params as Record<string, unknown> | undefined);
      setOpportunities(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar oportunidades';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchKanban = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await opportunitiesService.getKanban(companyId);
      setKanban(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar kanban';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Partial<CrmOpportunity>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await opportunitiesService.create(companyId, data);
      toast.success('Oportunidad creada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear oportunidad';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmOpportunity>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await opportunitiesService.update(companyId, id, data);
      toast.success('Oportunidad actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar oportunidad';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await opportunitiesService.remove(companyId, id);
      toast.success('Oportunidad eliminada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar oportunidad';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const updateStage = useCallback(async (id: string, stageId: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await opportunitiesService.updateStage(companyId, id, stageId);
      toast.success('Etapa actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar etapa';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    opportunities,
    kanban,
    loading,
    error,
    fetch,
    fetchKanban,
    create,
    update,
    remove,
    updateStage,
  };
};
