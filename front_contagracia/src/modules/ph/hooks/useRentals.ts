import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { rentalsService } from '../services/ph.service';
import type { PhRental } from '../types';

export function useRentals() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [rentals, setRentals] = useState<PhRental[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await rentalsService.getAll(companyId, params);
      if (Array.isArray(res)) {
        setRentals(res);
        setTotal(res.length);
      } else {
        setRentals(res.data ?? []);
        setTotal(res.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar arriendos';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createRental = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await rentalsService.create(companyId, data);
      toast.success('Arriendo creado exitosamente');
      await fetchRentals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear arriendo');
      throw err;
    }
  }, [companyId, fetchRentals]);

  const updateRental = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await rentalsService.update(companyId, id, data);
      toast.success('Arriendo actualizado exitosamente');
      await fetchRentals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar arriendo');
      throw err;
    }
  }, [companyId, fetchRentals]);

  const checkoutRental = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await rentalsService.checkout(companyId, id);
      toast.success('Checkout de arriendo realizado exitosamente');
      await fetchRentals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al realizar checkout del arriendo');
      throw err;
    }
  }, [companyId, fetchRentals]);

  const cancelRental = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await rentalsService.cancel(companyId, id);
      toast.success('Arriendo cancelado exitosamente');
      await fetchRentals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cancelar arriendo');
      throw err;
    }
  }, [companyId, fetchRentals]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  return {
    rentals,
    total,
    loading,
    error,
    fetchRentals,
    createRental,
    updateRental,
    checkoutRental,
    cancelRental,
    refresh: fetchRentals,
  };
}
