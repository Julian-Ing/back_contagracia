import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { condominiumsService, towersService } from '../services/ph.service';
import type { PhCondominium, PhTower } from '../types';

export function useCondominiums() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [condominiums, setCondominiums] = useState<PhCondominium[]>([]);
  const [towers, setTowers] = useState<PhTower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCondominiums = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await condominiumsService.getAll(companyId, params);
      setCondominiums(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar condominios';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchTowers = useCallback(async (condominiumId: string) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await towersService.getAll(companyId, condominiumId);
      setTowers(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar torres';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createCondominium = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await condominiumsService.create(companyId, data);
      toast.success('Condominio creado exitosamente');
      await fetchCondominiums();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear condominio');
      throw err;
    }
  }, [companyId, fetchCondominiums]);

  const updateCondominium = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await condominiumsService.update(companyId, id, data);
      toast.success('Condominio actualizado exitosamente');
      await fetchCondominiums();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar condominio');
      throw err;
    }
  }, [companyId, fetchCondominiums]);

  const removeCondominium = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await condominiumsService.remove(companyId, id);
      toast.success('Condominio eliminado exitosamente');
      await fetchCondominiums();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar condominio');
      throw err;
    }
  }, [companyId, fetchCondominiums]);

  const createTower = useCallback(async (condominiumId: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await towersService.create(companyId, condominiumId, data);
      toast.success('Torre creada exitosamente');
      await fetchTowers(condominiumId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear torre');
      throw err;
    }
  }, [companyId, fetchTowers]);

  const updateTower = useCallback(async (condominiumId: string, towerId: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await towersService.update(companyId, condominiumId, towerId, data);
      toast.success('Torre actualizada exitosamente');
      await fetchTowers(condominiumId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar torre');
      throw err;
    }
  }, [companyId, fetchTowers]);

  const removeTower = useCallback(async (condominiumId: string, towerId: string) => {
    if (!companyId) return;
    try {
      await towersService.remove(companyId, condominiumId, towerId);
      toast.success('Torre eliminada exitosamente');
      await fetchTowers(condominiumId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar torre');
      throw err;
    }
  }, [companyId, fetchTowers]);

  useEffect(() => {
    fetchCondominiums();
  }, [fetchCondominiums]);

  return {
    condominiums,
    towers,
    loading,
    error,
    fetchCondominiums,
    fetchTowers,
    createCondominium,
    updateCondominium,
    removeCondominium,
    createTower,
    updateTower,
    removeTower,
    refresh: fetchCondominiums,
  };
}
