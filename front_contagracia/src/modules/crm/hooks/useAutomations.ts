'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { automationsService } from '../services/crm.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpportunityAutomation {
  id: string;
  trigger_stage_from: string | null;
  trigger_stage_to: string;
  action_type: 'email' | 'whatsapp';
  email_template_id: string | null;
  whatsapp_template_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email_template?: { id: string; name: string };
  whatsapp_template?: { id: string; name: string };
}

export interface ActivityAutomation {
  id: string;
  trigger_stage_from: string | null;
  trigger_stage_to: string;
  activity_type: string;
  activity_subject: string;
  activity_description: string | null;
  days_offset: number;
  assigned_to_rule: 'same_as_owner' | 'specific_user';
  assigned_to_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormAutomation {
  id: string;
  form_id: string;
  create_lead: boolean;
  lead_stage: string | null;
  lead_source: string | null;
  create_opportunity: boolean;
  opportunity_stage_id: string | null;
  opportunity_value: number | null;
  opportunity_probability: number | null;
  assignment_type: 'round_robin' | 'specific_user';
  assigned_user_id: string | null;
  round_robin_users: string[] | null;
  round_robin_index: number;
  send_notification: boolean;
  auto_response_enabled: boolean;
  auto_response_template_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form?: { id: string; name: string };
}

export interface AutomationLog {
  id: string;
  automation_type: 'opportunity' | 'activity' | 'form' | 'event' | 'reminder';
  automation_id: string;
  trigger_data: Record<string, unknown>;
  action_data: Record<string, unknown>;
  status: 'success' | 'failed' | 'skipped';
  error_message: string | null;
  executed_at: string;
}

// ─── Create DTOs ─────────────────────────────────────────────────────────────

export interface CreateOpportunityAutomationDto {
  trigger_stage_from?: string | null;
  trigger_stage_to: string;
  action_type: 'email' | 'whatsapp';
  email_template_id?: string;
  whatsapp_template_id?: string;
}

export interface CreateActivityAutomationDto {
  trigger_stage_from?: string | null;
  trigger_stage_to: string;
  activity_type: string;
  activity_subject: string;
  activity_description?: string;
  days_offset?: number;
  assigned_to_rule?: 'same_as_owner' | 'specific_user';
  assigned_to_user_id?: string;
}

export interface CreateFormAutomationDto {
  form_id: string;
  create_lead?: boolean;
  lead_stage?: string;
  lead_source?: string;
  create_opportunity?: boolean;
  opportunity_stage_id?: string;
  opportunity_value?: number;
  opportunity_probability?: number;
  assignment_type?: 'round_robin' | 'specific_user';
  assigned_user_id?: string;
  round_robin_users?: string[];
  send_notification?: boolean;
  auto_response_enabled?: boolean;
  auto_response_template_id?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAutomations() {
  const companyId = useAuthStore((s) => s.company?.id);

  // State
  const [opportunityAutomations, setOpportunityAutomations] = useState<OpportunityAutomation[]>([]);
  const [activityAutomations, setActivityAutomations] = useState<ActivityAutomation[]>([]);
  const [formAutomations, setFormAutomations] = useState<FormAutomation[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch All ─────────────────────────────────────────────────────────────

  const fetchOpportunityAutomations = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await automationsService.getOpportunityAutomations(companyId);
      setOpportunityAutomations(res);
    } catch (err: any) {
      console.error('Error fetching opportunity automations:', err);
    }
  }, [companyId]);

  const fetchActivityAutomations = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await automationsService.getActivityAutomations(companyId);
      setActivityAutomations(res);
    } catch (err: any) {
      console.error('Error fetching activity automations:', err);
    }
  }, [companyId]);

  const fetchFormAutomations = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await automationsService.getFormAutomations(companyId);
      setFormAutomations(res);
    } catch (err: any) {
      console.error('Error fetching form automations:', err);
    }
  }, [companyId]);

  const fetchLogs = useCallback(async (params?: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      const res = await automationsService.getLogs(companyId, params);
      setLogs(res);
    } catch (err: any) {
      console.error('Error fetching automation logs:', err);
    }
  }, [companyId]);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchOpportunityAutomations(),
        fetchActivityAutomations(),
        fetchFormAutomations(),
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar automatizaciones');
      toast.error('Error al cargar automatizaciones');
    } finally {
      setLoading(false);
    }
  }, [companyId, fetchOpportunityAutomations, fetchActivityAutomations, fetchFormAutomations]);

  // ─── Opportunity CRUD ──────────────────────────────────────────────────────

  const createOpportunityAutomation = useCallback(async (data: CreateOpportunityAutomationDto) => {
    if (!companyId) return;
    try {
      // Limpiar campos vacíos para evitar errores de validación UUID
      const cleanData = {
        ...data,
        trigger_stage_from: data.trigger_stage_from || undefined,
        email_template_id: data.email_template_id || undefined,
        whatsapp_template_id: data.whatsapp_template_id || undefined,
      };
      await automationsService.createOpportunityAutomation(companyId, cleanData);
      toast.success('Automatizacion creada exitosamente');
      await fetchOpportunityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear automatizacion');
      throw err;
    }
  }, [companyId, fetchOpportunityAutomations]);

  const updateOpportunityAutomation = useCallback(async (id: string, data: Partial<CreateOpportunityAutomationDto>) => {
    if (!companyId) return;
    try {
      // Limpiar campos vacíos
      const cleanData = {
        ...data,
        trigger_stage_from: data.trigger_stage_from || undefined,
        email_template_id: data.email_template_id || undefined,
        whatsapp_template_id: data.whatsapp_template_id || undefined,
      };
      await automationsService.updateOpportunityAutomation(companyId, id, cleanData);
      toast.success('Automatizacion actualizada exitosamente');
      await fetchOpportunityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar automatizacion');
      throw err;
    }
  }, [companyId, fetchOpportunityAutomations]);

  const toggleOpportunityAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.toggleOpportunityAutomation(companyId, id);
      toast.success('Estado actualizado');
      await fetchOpportunityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
      throw err;
    }
  }, [companyId, fetchOpportunityAutomations]);

  const deleteOpportunityAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.deleteOpportunityAutomation(companyId, id);
      toast.success('Automatizacion eliminada');
      await fetchOpportunityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar automatizacion');
      throw err;
    }
  }, [companyId, fetchOpportunityAutomations]);

  // ─── Activity CRUD ─────────────────────────────────────────────────────────

  const createActivityAutomation = useCallback(async (data: CreateActivityAutomationDto) => {
    if (!companyId) return;
    try {
      await automationsService.createActivityAutomation(companyId, data as unknown as Record<string, unknown>);
      toast.success('Automatizacion creada exitosamente');
      await fetchActivityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear automatizacion');
      throw err;
    }
  }, [companyId, fetchActivityAutomations]);

  const updateActivityAutomation = useCallback(async (id: string, data: Partial<CreateActivityAutomationDto>) => {
    if (!companyId) return;
    try {
      await automationsService.updateActivityAutomation(companyId, id, data);
      toast.success('Automatizacion actualizada exitosamente');
      await fetchActivityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar automatizacion');
      throw err;
    }
  }, [companyId, fetchActivityAutomations]);

  const toggleActivityAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.toggleActivityAutomation(companyId, id);
      toast.success('Estado actualizado');
      await fetchActivityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
      throw err;
    }
  }, [companyId, fetchActivityAutomations]);

  const deleteActivityAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.deleteActivityAutomation(companyId, id);
      toast.success('Automatizacion eliminada');
      await fetchActivityAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar automatizacion');
      throw err;
    }
  }, [companyId, fetchActivityAutomations]);

  // ─── Form CRUD ─────────────────────────────────────────────────────────────

  const createFormAutomation = useCallback(async (data: CreateFormAutomationDto) => {
    if (!companyId) return;
    try {
      await automationsService.createFormAutomation(companyId, data as unknown as Record<string, unknown>);
      toast.success('Automatizacion creada exitosamente');
      await fetchFormAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear automatizacion');
      throw err;
    }
  }, [companyId, fetchFormAutomations]);

  const updateFormAutomation = useCallback(async (id: string, data: Partial<CreateFormAutomationDto>) => {
    if (!companyId) return;
    try {
      await automationsService.updateFormAutomation(companyId, id, data);
      toast.success('Automatizacion actualizada exitosamente');
      await fetchFormAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar automatizacion');
      throw err;
    }
  }, [companyId, fetchFormAutomations]);

  const toggleFormAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.toggleFormAutomation(companyId, id);
      toast.success('Estado actualizado');
      await fetchFormAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
      throw err;
    }
  }, [companyId, fetchFormAutomations]);

  const deleteFormAutomation = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      await automationsService.deleteFormAutomation(companyId, id);
      toast.success('Automatizacion eliminada');
      await fetchFormAutomations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar automatizacion');
      throw err;
    }
  }, [companyId, fetchFormAutomations]);

  // ─── Test Email ────────────────────────────────────────────────────────────

  const testEmail = useCallback(async (data: { to: string; subject?: string; message?: string }) => {
    if (!companyId) return;
    try {
      const res = await automationsService.testEmail(companyId, data);
      if (res.success) {
        toast.success(`Email enviado a ${data.to}`);
      } else {
        toast.error(res.error || 'Error al enviar email');
      }
      return res;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al enviar email de prueba');
      throw err;
    }
  }, [companyId]);

  // ─── Effect ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Data
    opportunityAutomations,
    activityAutomations,
    formAutomations,
    logs,
    loading,
    error,

    // Refetch
    refetch: fetchAll,
    refetchLogs: fetchLogs,

    // Opportunity CRUD
    createOpportunityAutomation,
    updateOpportunityAutomation,
    toggleOpportunityAutomation,
    deleteOpportunityAutomation,

    // Activity CRUD
    createActivityAutomation,
    updateActivityAutomation,
    toggleActivityAutomation,
    deleteActivityAutomation,

    // Form CRUD
    createFormAutomation,
    updateFormAutomation,
    toggleFormAutomation,
    deleteFormAutomation,

    // Utils
    testEmail,
  };
}
