import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { commonAreasService, reservationsService } from '../services/ph.service';
import type { PhCommonArea, PhReservation } from '../types';

export function useCommonAreas() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [areas, setAreas] = useState<PhCommonArea[]>([]);
  const [reservations, setReservations] = useState<PhReservation[]>([]);
  const [allReservations, setAllReservations] = useState<PhReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await commonAreasService.getAll(companyId, params);
      setAreas(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar areas comunes';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createArea = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await commonAreasService.create(companyId, data);
      toast.success('Area comun creada exitosamente');
      await fetchAreas();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear area comun');
      throw err;
    }
  }, [companyId, fetchAreas]);

  const updateArea = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await commonAreasService.update(companyId, id, data);
      toast.success('Area comun actualizada exitosamente');
      await fetchAreas();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar area comun');
      throw err;
    }
  }, [companyId, fetchAreas]);

  const removeArea = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await commonAreasService.remove(companyId, id);
      toast.success('Area comun eliminada exitosamente');
      await fetchAreas();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar area comun');
      throw err;
    }
  }, [companyId, fetchAreas]);

  const fetchReservations = useCallback(async (areaId: string, params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await reservationsService.getAll(companyId, areaId, params);
      setReservations(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar reservaciones';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchAllReservations = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      const res = await reservationsService.getAllForCompany(companyId, params);
      setAllReservations(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar reservaciones');
    }
  }, [companyId]);

  const checkAvailability = useCallback(async (areaId: string, params: { date: string; start_time: string; end_time: string }) => {
    if (!companyId) return;
    try {
      const res = await reservationsService.checkAvailability(companyId, areaId, params);
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al verificar disponibilidad');
      throw err;
    }
  }, [companyId]);

  const createReservation = useCallback(async (areaId: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await reservationsService.create(companyId, areaId, data);
      toast.success('Reservacion creada exitosamente');
      await fetchReservations(areaId);
      await fetchAllReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear reservacion');
      throw err;
    }
  }, [companyId, fetchReservations, fetchAllReservations]);

  const confirmReservation = useCallback(async (areaId: string, reservationId: string) => {
    if (!companyId) return;
    try {
      await reservationsService.confirm(companyId, areaId, reservationId);
      toast.success('Reservacion confirmada exitosamente');
      await fetchAllReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al confirmar reservacion');
      throw err;
    }
  }, [companyId, fetchAllReservations]);

  const cancelReservation = useCallback(async (areaId: string, reservationId: string, reason?: string) => {
    if (!companyId) return;
    try {
      await reservationsService.cancel(companyId, areaId, reservationId, reason ? { cancellation_reason: reason } : undefined);
      toast.success('Reservacion cancelada exitosamente');
      await fetchAllReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cancelar reservacion');
      throw err;
    }
  }, [companyId, fetchAllReservations]);

  const completeReservation = useCallback(async (areaId: string, reservationId: string) => {
    if (!companyId) return;
    try {
      await reservationsService.complete(companyId, areaId, reservationId);
      toast.success('Reservacion completada exitosamente');
      await fetchAllReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al completar reservacion');
      throw err;
    }
  }, [companyId, fetchAllReservations]);

  const reactivateReservation = useCallback(async (areaId: string, reservationId: string) => {
    if (!companyId) return;
    try {
      await reservationsService.reactivate(companyId, areaId, reservationId);
      toast.success('Reservacion reactivada exitosamente');
      await fetchAllReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al reactivar reservacion');
      throw err;
    }
  }, [companyId, fetchAllReservations]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  useEffect(() => {
    fetchAllReservations();
  }, [fetchAllReservations]);

  return {
    areas,
    reservations,
    allReservations,
    loading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    removeArea,
    fetchReservations,
    fetchAllReservations,
    checkAvailability,
    createReservation,
    confirmReservation,
    cancelReservation,
    completeReservation,
    reactivateReservation,
    refresh: fetchAreas,
  };
}
