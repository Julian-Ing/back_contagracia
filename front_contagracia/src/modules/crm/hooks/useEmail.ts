import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { emailService } from '../services/crm.service';
import toast from 'react-hot-toast';
import type { EmailTemplate, EmailSend, EmailTemplateType } from '../types';

interface FetchSendsParams {
  status?: string;
  campaign_id?: string;
  date_from?: string;
  date_to?: string;
}

export const useEmail = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [types, setTypes] = useState<EmailTemplateType[]>([]);
  const [sends, setSends] = useState<EmailSend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.company?.id);

  // --- Types ---

  const fetchTypes = useCallback(async () => {
    try {
      const data = await emailService.getTypes();
      setTypes(data || []);
    } catch {
      // silently fail — types are optional
    }
  }, []);

  const createType = useCallback(async (data: Partial<EmailTemplateType>) => {
    setError(null);
    try {
      await emailService.createType(data);
      toast.success('Tipo de plantilla creado');
      await fetchTypes();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear tipo';
      setError(message);
      toast.error(message);
      throw err;
    }
  }, [fetchTypes]);

  const updateType = useCallback(async (id: string, data: Partial<EmailTemplateType>) => {
    setError(null);
    try {
      await emailService.updateType(id, data);
      toast.success('Tipo de plantilla actualizado');
      await fetchTypes();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar tipo';
      setError(message);
      toast.error(message);
      throw err;
    }
  }, [fetchTypes]);

  const removeType = useCallback(async (id: string) => {
    setError(null);
    try {
      await emailService.removeType(id);
      toast.success('Tipo de plantilla eliminado');
      await fetchTypes();
      await fetch(); // Refresh templates since type_id may have been cleared
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar tipo';
      setError(message);
      toast.error(message);
      throw err;
    }
  }, [fetchTypes]);

  // --- Templates ---

  const fetch = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await emailService.getTemplates(companyId);
      setTemplates(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar plantillas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createTemplate = useCallback(async (data: Partial<EmailTemplate>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await emailService.createTemplate(companyId, data);
      toast.success('Plantilla creada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear plantilla';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const updateTemplate = useCallback(async (id: string, data: Partial<EmailTemplate>) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await emailService.updateTemplate(companyId, id, data);
      toast.success('Plantilla actualizada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al actualizar plantilla';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  const removeTemplate = useCallback(async (id: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await emailService.removeTemplate(companyId, id);
      toast.success('Plantilla eliminada exitosamente');
      await fetch();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar plantilla';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetch]);

  // --- Sends ---

  const fetchSends = useCallback(async (params?: FetchSendsParams) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await emailService.getSends(companyId, params as Record<string, unknown> | undefined);
      setSends(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar envíos';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const send = useCallback(async (data: any) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      await emailService.send(companyId, data);
      toast.success('Email enviado exitosamente');
      await fetchSends();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al enviar email';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId, fetchSends]);

  useEffect(() => {
    fetch();
    fetchTypes();
  }, [fetch, fetchTypes]);

  return {
    templates,
    types,
    sends,
    loading,
    error,
    fetch,
    fetchTypes,
    createTemplate,
    updateTemplate,
    removeTemplate,
    createType,
    updateType,
    removeType,
    fetchSends,
    send,
  };
};
