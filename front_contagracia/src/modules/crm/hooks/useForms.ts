import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { formsService } from '../services/crm.service';
import toast from 'react-hot-toast';
import type { CrmLeadForm, CrmFormSubmission } from '../types';

export const useForms = () => {
  const [forms, setForms] = useState<CrmLeadForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.company?.id);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await formsService.getAll(companyId);
      setForms(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar formularios';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Partial<CrmLeadForm>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await formsService.create(companyId, data);
      toast.success('Formulario creado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear formulario';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmLeadForm>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await formsService.update(companyId, id, data);
      toast.success('Formulario actualizado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar formulario';
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
      await formsService.remove(companyId, id);
      toast.success('Formulario eliminado exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar formulario';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const getOne = useCallback(async (id: string): Promise<CrmLeadForm | null> => {
    if (!companyId) return null;
    try {
      const data = await formsService.getOne(companyId, id);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar formulario';
      toast.error(message);
      return null;
    }
  }, [companyId]);

  const getSubmissions = useCallback(async (formId: string): Promise<CrmFormSubmission[]> => {
    if (!companyId) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await formsService.getSubmissions(companyId, formId);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar envíos';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    forms,
    loading,
    error,
    fetch,
    create,
    update,
    remove,
    getOne,
    getSubmissions,
  };
};
