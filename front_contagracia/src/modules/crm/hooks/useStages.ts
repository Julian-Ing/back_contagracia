'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { stagesService } from '../services/crm.service';
import { CrmOpportunityStage } from '../types';

export function useStages() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [stages, setStages] = useState<CrmOpportunityStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await stagesService.getAll(companyId);
      setStages(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar etapas');
      toast.error('Error al cargar etapas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Omit<CrmOpportunityStage, 'id' | 'position' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return;
    try {
      await stagesService.create(companyId, data);
      toast.success('Etapa creada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear etapa');
      throw err;
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmOpportunityStage>) => {
    if (!companyId) return;
    try {
      await stagesService.update(companyId, id, data);
      toast.success('Etapa actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar etapa');
      throw err;
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await stagesService.remove(companyId, id);
      toast.success('Etapa eliminada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar etapa');
      throw err;
    }
  }, [companyId, fetch]);

  const reorder = useCallback(async (orderedStages: { id: string; position: number }[]) => {
    if (!companyId) return;
    try {
      await stagesService.reorder(companyId, { stages: orderedStages });
      toast.success('Orden actualizado exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al reordenar etapas');
      throw err;
    }
  }, [companyId, fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    stages,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
    reorder,
  };
}
