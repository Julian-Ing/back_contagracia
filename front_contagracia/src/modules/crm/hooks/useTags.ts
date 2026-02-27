'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { tagsService } from '../services/crm.service';
import { CrmContactTag } from '../types';

export function useTags() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [tags, setTags] = useState<CrmContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await tagsService.getAll(companyId);
      setTags(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar etiquetas');
      toast.error('Error al cargar etiquetas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Omit<CrmContactTag, 'id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return;
    try {
      await tagsService.create(companyId, data as Record<string, unknown>);
      toast.success('Etiqueta creada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear etiqueta');
      throw err;
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmContactTag>) => {
    if (!companyId) return;
    try {
      await tagsService.update(companyId, id, data as Record<string, unknown>);
      toast.success('Etiqueta actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar etiqueta');
      throw err;
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await tagsService.remove(companyId, id);
      toast.success('Etiqueta eliminada exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar etiqueta');
      throw err;
    }
  }, [companyId, fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    tags,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
  };
}
