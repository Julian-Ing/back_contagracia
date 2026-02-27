import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { leadsService } from '../services/crm.service';
import toast from 'react-hot-toast';
import type { CrmLead, LeadSource, LeadStage } from '../types';

interface FetchParams {
  stage?: string;
  source?: string;
  assigned_to?: string;
  search?: string;
  campaign_id?: string;
}

// Transform API response to match frontend types (lowercase enums)
function transformLead(lead: any): CrmLead {
  return {
    ...lead,
    source: (lead.source?.toLowerCase() || 'manual') as LeadSource,
    stage: (lead.stage?.toLowerCase() || 'new') as LeadStage,
  };
}

// Transform frontend data to API format (uppercase enums)
function transformToApi(data: Partial<CrmLead>): any {
  const transformed: any = { ...data };
  if (data.source) transformed.source = data.source.toUpperCase();
  if (data.stage) transformed.stage = data.stage.toUpperCase();
  return transformed;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.company?.id);

  const fetch = useCallback(async (params?: FetchParams) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await leadsService.getAll(companyId, params as Record<string, unknown> | undefined);
      const rawLeads = Array.isArray(res) ? res : res.data ?? [];
      setLeads(rawLeads.map(transformLead));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar leads';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Partial<CrmLead>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.create(companyId, transformToApi(data));
      toast.success('Lead creado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear lead';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmLead>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.update(companyId, id, transformToApi(data));
      toast.success('Lead actualizado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar lead';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.remove(companyId, id);
      toast.success('Lead eliminado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar lead';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const updateStage = useCallback(async (id: string, stage: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.updateStage(companyId, id, stage.toUpperCase());
      toast.success('Etapa actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar etapa';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const convert = useCallback(async (id: string, data?: any) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.convert(companyId, id, data);
      toast.success('Lead convertido exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al convertir lead';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const bulkAssign = useCallback(async (leadIds: string[], assignedTo: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await leadsService.bulkAssign(companyId, { leadIds, assignedTo });
      toast.success('Leads asignados exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al asignar leads';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    leads,
    loading,
    error,
    fetch,
    create,
    update,
    remove,
    updateStage,
    convert,
    bulkAssign,
  };
};
