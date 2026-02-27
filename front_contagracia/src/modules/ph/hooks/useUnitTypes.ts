import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { unitTypesService } from '../services/ph.service';
import type { PhUnitType } from '../types';

export function useUnitTypes() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [unitTypes, setUnitTypes] = useState<PhUnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnitTypes = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await unitTypesService.getAll(companyId, params);
      setUnitTypes(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar tipos de unidad';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createUnitType = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await unitTypesService.create(companyId, data);
      toast.success('Tipo de unidad creado exitosamente');
      await fetchUnitTypes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear tipo de unidad');
      throw err;
    }
  }, [companyId, fetchUnitTypes]);

  const updateUnitType = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await unitTypesService.update(companyId, id, data);
      toast.success('Tipo de unidad actualizado exitosamente');
      await fetchUnitTypes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar tipo de unidad');
      throw err;
    }
  }, [companyId, fetchUnitTypes]);

  const removeUnitType = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await unitTypesService.remove(companyId, id);
      toast.success('Tipo de unidad eliminado exitosamente');
      await fetchUnitTypes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar tipo de unidad');
      throw err;
    }
  }, [companyId, fetchUnitTypes]);

  useEffect(() => {
    fetchUnitTypes();
  }, [fetchUnitTypes]);

  return {
    unitTypes,
    loading,
    error,
    fetchUnitTypes,
    createUnitType,
    updateUnitType,
    removeUnitType,
    refresh: fetchUnitTypes,
  };
}
