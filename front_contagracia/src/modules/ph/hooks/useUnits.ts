import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { unitsService } from '../services/ph.service';
import type { PhUnit } from '../types';

export function useUnits() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [units, setUnits] = useState<PhUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await unitsService.getAll(companyId, params);
      if (Array.isArray(res)) {
        setUnits(res);
        setTotal(res.length);
      } else {
        setUnits(res.data ?? []);
        setTotal(res.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar unidades';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createUnit = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await unitsService.create(companyId, data);
      toast.success('Unidad creada exitosamente');
      await fetchUnits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear unidad');
      throw err;
    }
  }, [companyId, fetchUnits]);

  const updateUnit = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await unitsService.update(companyId, id, data);
      toast.success('Unidad actualizada exitosamente');
      await fetchUnits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar unidad');
      throw err;
    }
  }, [companyId, fetchUnits]);

  const removeUnit = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await unitsService.remove(companyId, id);
      toast.success('Unidad eliminada exitosamente');
      await fetchUnits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar unidad');
      throw err;
    }
  }, [companyId, fetchUnits]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return {
    units,
    total,
    loading,
    error,
    fetchUnits,
    createUnit,
    updateUnit,
    removeUnit,
    refresh: fetchUnits,
  };
}
