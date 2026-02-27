import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { billingPeriodsService, feesService } from '../services/ph.service';
import type { PhBillingPeriod, PhFee } from '../types';

export function useBilling() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [periods, setPeriods] = useState<PhBillingPeriod[]>([]);
  const [fees, setFees] = useState<PhFee[]>([]);
  const [totalFees, setTotalFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Periods ───

  const fetchPeriods = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await billingPeriodsService.getAll(companyId, params);
      setPeriods(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar periodos de facturacion';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createPeriod = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await billingPeriodsService.create(companyId, data);
      toast.success('Periodo de facturacion creado exitosamente');
      await fetchPeriods();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear periodo de facturacion');
      throw err;
    }
  }, [companyId, fetchPeriods]);

  const updatePeriod = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await billingPeriodsService.update(companyId, id, data);
      toast.success('Periodo de facturacion actualizado exitosamente');
      await fetchPeriods();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar periodo de facturacion');
      throw err;
    }
  }, [companyId, fetchPeriods]);

  const removePeriod = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await billingPeriodsService.remove(companyId, id);
      toast.success('Periodo de facturacion eliminado exitosamente');
      await fetchPeriods();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar periodo de facturacion');
      throw err;
    }
  }, [companyId, fetchPeriods]);

  const closePeriod = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await billingPeriodsService.close(companyId, id);
      toast.success('Periodo de facturacion cerrado exitosamente');
      await fetchPeriods();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cerrar periodo de facturacion');
      throw err;
    }
  }, [companyId, fetchPeriods]);

  const generateFees = useCallback(async (periodId: string, data: { fee_concept_ids: string[]; condominium_id?: string }) => {
    if (!companyId) return;
    try {
      await billingPeriodsService.generateFees(companyId, periodId, data);
      toast.success('Cuotas generadas exitosamente');
      await fetchPeriods();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al generar cuotas');
      throw err;
    }
  }, [companyId, fetchPeriods]);

  // ─── Fees ───

  const fetchFees = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await feesService.getAll(companyId, params);
      if (Array.isArray(res)) {
        setFees(res);
        setTotalFees(res.length);
      } else {
        setFees(res.data ?? []);
        setTotalFees(res.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar cuotas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const updateFee = useCallback(async (feeId: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await feesService.update(companyId, feeId, data);
      toast.success('Cuota actualizada exitosamente');
      await fetchFees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar cuota');
      throw err;
    }
  }, [companyId, fetchFees]);

  const removeFee = useCallback(async (feeId: string) => {
    if (!companyId) return;
    try {
      await feesService.remove(companyId, feeId);
      toast.success('Cuota eliminada exitosamente');
      await fetchFees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar cuota');
      throw err;
    }
  }, [companyId, fetchFees]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  return {
    periods,
    fees,
    totalFees,
    loading,
    error,
    fetchPeriods,
    createPeriod,
    updatePeriod,
    removePeriod,
    closePeriod,
    generateFees,
    fetchFees,
    updateFee,
    removeFee,
    refresh: fetchPeriods,
  };
}
