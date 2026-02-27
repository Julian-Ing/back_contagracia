import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { residentsService } from '../services/ph.service';
import type { PhResident } from '../types';

export function useResidents() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [residents, setResidents] = useState<PhResident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResidents = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await residentsService.getAll(companyId, params);
      if (Array.isArray(res)) {
        setResidents(res);
        setTotal(res.length);
      } else {
        setResidents(res.data ?? []);
        setTotal(res.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar residentes';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createResident = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await residentsService.create(companyId, data);
      toast.success('Residente creado exitosamente');
      await fetchResidents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear residente');
      throw err;
    }
  }, [companyId, fetchResidents]);

  const updateResident = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await residentsService.update(companyId, id, data);
      toast.success('Residente actualizado exitosamente');
      await fetchResidents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar residente');
      throw err;
    }
  }, [companyId, fetchResidents]);

  const removeResident = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await residentsService.remove(companyId, id);
      toast.success('Residente eliminado exitosamente');
      await fetchResidents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar residente');
      throw err;
    }
  }, [companyId, fetchResidents]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  return {
    residents,
    total,
    loading,
    error,
    fetchResidents,
    createResident,
    updateResident,
    removeResident,
    refresh: fetchResidents,
  };
}
