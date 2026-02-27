'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { campaignsService } from '../services/crm.service';
import { CrmCampaign } from '../types';

interface FetchCampaignsParams {
  status?: string;
  channel?: string;
}

export function useCampaigns() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: FetchCampaignsParams) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await campaignsService.getAll(companyId, params as Record<string, unknown> | undefined);
      const rawData = Array.isArray(res) ? res : res.data ?? [];
      // Normalize backend response (UPPERCASE) to frontend (lowercase)
      const normalized = rawData.map((c: any) => ({
        ...c,
        channel: c.channel?.toLowerCase(),
        status: c.status?.toLowerCase(),
      }));
      setCampaigns(normalized);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar campañas');
      toast.error('Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Omit<CrmCampaign, 'id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return;
    try {
      // Backend expects channel/status in UPPERCASE
      const payload = {
        ...data,
        channel: data.channel?.toUpperCase(),
        status: data.status?.toUpperCase(),
      };
      await campaignsService.create(companyId, payload);
      toast.success('Campaña creada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear campaña');
      throw err;
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmCampaign>) => {
    if (!companyId) return;
    try {
      // Backend expects channel/status in UPPERCASE
      const payload = {
        ...data,
        ...(data.channel && { channel: data.channel.toUpperCase() }),
        ...(data.status && { status: data.status.toUpperCase() }),
      };
      await campaignsService.update(companyId, id, payload);
      toast.success('Campaña actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar campaña');
      throw err;
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await campaignsService.remove(companyId, id);
      toast.success('Campaña eliminada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar campaña');
      throw err;
    }
  }, [companyId, fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    campaigns,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
  };
}
