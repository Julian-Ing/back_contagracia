'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { contactsService } from '../services/crm.service';
import { CrmContact } from '../types';

interface FetchContactsParams {
  search?: string;
  tag?: number;
  is_client?: boolean;
}

export function useContacts() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: FetchContactsParams) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await contactsService.getAll(companyId, params as Record<string, unknown> | undefined);
      setContacts(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar contactos');
      toast.error('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const create = useCallback(async (data: Partial<Omit<CrmContact, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!companyId) return;
    try {
      await contactsService.create(companyId, data);
      toast.success('Contacto creado exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear contacto');
      throw err;
    }
  }, [companyId, fetch]);

  const update = useCallback(async (id: string, data: Partial<CrmContact>) => {
    if (!companyId) return;
    try {
      await contactsService.update(companyId, id, data);
      toast.success('Contacto actualizado exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar contacto');
      throw err;
    }
  }, [companyId, fetch]);

  const remove = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await contactsService.remove(companyId, id);
      toast.success('Contacto eliminado exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar contacto');
      throw err;
    }
  }, [companyId, fetch]);

  const addTag = useCallback(async (contactId: string, tagId: string) => {
    if (!companyId) return;
    try {
      await contactsService.addTag(companyId, contactId, tagId);
      toast.success('Etiqueta añadida exitosamente');
      await fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al añadir etiqueta');
      throw err;
    }
  }, [companyId, fetch]);

  const removeTag = useCallback(async (contactId: string, tagId: string) => {
    if (!companyId) return;
    try {
      await contactsService.removeTag(companyId, contactId, tagId);
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
    contacts,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
    addTag,
    removeTag,
  };
}
