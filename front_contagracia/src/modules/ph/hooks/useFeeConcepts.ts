import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { feeConceptsService } from '../services/ph.service';
import type { PhFeeConcept } from '../types';

export function useFeeConcepts() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [feeConcepts, setFeeConcepts] = useState<PhFeeConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeConcepts = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await feeConceptsService.getAll(companyId, params);
      setFeeConcepts(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar conceptos de cuota';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createFeeConcept = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await feeConceptsService.create(companyId, data);
      toast.success('Concepto de cuota creado exitosamente');
      await fetchFeeConcepts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear concepto de cuota');
      throw err;
    }
  }, [companyId, fetchFeeConcepts]);

  const updateFeeConcept = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await feeConceptsService.update(companyId, id, data);
      toast.success('Concepto de cuota actualizado exitosamente');
      await fetchFeeConcepts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar concepto de cuota');
      throw err;
    }
  }, [companyId, fetchFeeConcepts]);

  const removeFeeConcept = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await feeConceptsService.remove(companyId, id);
      toast.success('Concepto de cuota eliminado exitosamente');
      await fetchFeeConcepts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar concepto de cuota');
      throw err;
    }
  }, [companyId, fetchFeeConcepts]);

  useEffect(() => {
    fetchFeeConcepts();
  }, [fetchFeeConcepts]);

  return {
    feeConcepts,
    loading,
    error,
    fetchFeeConcepts,
    createFeeConcept,
    updateFeeConcept,
    removeFeeConcept,
    refresh: fetchFeeConcepts,
  };
}
