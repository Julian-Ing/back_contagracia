import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { vehiclesService } from '../services/ph.service';
import type { PhVehicle } from '../types';

export function useVehicles() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [vehicles, setVehicles] = useState<PhVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await vehiclesService.getAll(companyId, params);
      if (Array.isArray(res)) {
        setVehicles(res);
        setTotal(res.length);
      } else {
        setVehicles(res.data ?? []);
        setTotal(res.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar vehiculos';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createVehicle = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await vehiclesService.create(companyId, data);
      toast.success('Vehiculo creado exitosamente');
      await fetchVehicles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear vehiculo');
      throw err;
    }
  }, [companyId, fetchVehicles]);

  const updateVehicle = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await vehiclesService.update(companyId, id, data);
      toast.success('Vehiculo actualizado exitosamente');
      await fetchVehicles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar vehiculo');
      throw err;
    }
  }, [companyId, fetchVehicles]);

  const removeVehicle = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await vehiclesService.remove(companyId, id);
      toast.success('Vehiculo eliminado exitosamente');
      await fetchVehicles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar vehiculo');
      throw err;
    }
  }, [companyId, fetchVehicles]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    total,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    removeVehicle,
    refresh: fetchVehicles,
  };
}
