'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { whatsappService } from '../services/crm.service';
import type { CrmWhatsappConversation, CrmWhatsappMessage, CrmWhatsappTemplate } from '../types';

export function useWhatsapp() {
  const companyId = useAuthStore((s) => s.company?.id);

  // Conversations
  const [conversations, setConversations] = useState<CrmWhatsappConversation[]>([]);
  const [conversationsTotal, setConversationsTotal] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Messages
  const [messages, setMessages] = useState<CrmWhatsappMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<CrmWhatsappTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Sending state
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Conversations ───

  const fetchConversations = useCallback(async (status?: string) => {
    if (!companyId) return;
    try {
      setLoadingConversations(true);
      const res = await whatsappService.getConversations(companyId, { take: 50, status });
      setConversations(res.data || []);
      setConversationsTotal(res.total || 0);
    } catch {
      toast.error('Error al cargar conversaciones');
    } finally {
      setLoadingConversations(false);
    }
  }, [companyId]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!companyId) return;
    try {
      setLoadingMessages(true);
      const res = await whatsappService.getMessages(companyId, conversationId, { take: 100 });
      // Messages come in desc order from API, reverse for display
      setMessages((res.data || []).reverse());
    } catch {
      toast.error('Error al cargar mensajes');
    } finally {
      setLoadingMessages(false);
    }
  }, [companyId]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!companyId) return;
    try {
      await whatsappService.markRead(companyId, conversationId);
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c),
      );
    } catch {
      // silent
    }
  }, [companyId]);

  const assignConversation = useCallback(async (conversationId: string, assignedTo: string | null) => {
    if (!companyId) return;
    try {
      await whatsappService.assignConversation(companyId, conversationId, assignedTo);
      toast.success('Conversacion asignada');
      await fetchConversations();
    } catch {
      toast.error('Error al asignar conversacion');
    }
  }, [companyId, fetchConversations]);

  const closeConversation = useCallback(async (conversationId: string) => {
    if (!companyId) return;
    try {
      await whatsappService.closeConversation(companyId, conversationId);
      toast.success('Conversacion cerrada');
      await fetchConversations();
    } catch {
      toast.error('Error al cerrar conversacion');
    }
  }, [companyId, fetchConversations]);

  // ─── Messages ───

  const sendMessage = useCallback(async (data: { third_party_id: string; conversation_id?: string; body?: string; media_url?: string }) => {
    if (!companyId) return;
    try {
      setSending(true);
      const result = await whatsappService.sendMessage(companyId, data);
      toast.success('Mensaje enviado');
      // Refresh messages for this conversation
      if (data.conversation_id) {
        await fetchMessages(data.conversation_id);
      }
      await fetchConversations();
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (typeof msg === 'object' && msg?.canSendTemplate) {
        toast.error('Fuera de la ventana de 24h. Usa un template.');
      } else {
        toast.error(msg || 'Error al enviar mensaje');
      }
      throw err;
    } finally {
      setSending(false);
    }
  }, [companyId, fetchConversations, fetchMessages]);

  const sendTemplate = useCallback(async (data: { third_party_id: string; template_id: string; variables?: Record<string, string>; conversation_id?: string }) => {
    if (!companyId) return;
    try {
      setSending(true);
      const result = await whatsappService.sendTemplate(companyId, data);
      toast.success('Template enviado');
      if (data.conversation_id) {
        await fetchMessages(data.conversation_id);
      }
      await fetchConversations();
      return result;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al enviar template');
      throw err;
    } finally {
      setSending(false);
    }
  }, [companyId, fetchConversations, fetchMessages]);

  // ─── Templates ───

  const fetchTemplates = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoadingTemplates(true);
      const res = await whatsappService.getTemplates(companyId);
      setTemplates(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Error al cargar plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  }, [companyId]);

  const syncTemplates = useCallback(async () => {
    if (!companyId) return;
    try {
      setSyncing(true);
      const result = await whatsappService.syncTemplates(companyId);
      toast.success(`Sincronizado: ${result.created} nuevas, ${result.updated} actualizadas`);
      await fetchTemplates();
      return result;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al sincronizar plantillas');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [companyId, fetchTemplates]);

  const createTemplate = useCallback(async (data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await whatsappService.createTemplate(companyId, data);
      toast.success('Plantilla creada');
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear plantilla');
      throw err;
    }
  }, [companyId, fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!companyId) return;
    try {
      await whatsappService.updateTemplate(companyId, id, data);
      toast.success('Plantilla actualizada');
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar plantilla');
      throw err;
    }
  }, [companyId, fetchTemplates]);

  // ─── Polling ───

  const startConversationPolling = useCallback((intervalMs = 30000) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchConversations();
    }, intervalMs);
  }, [fetchConversations]);

  const startActiveConversationPolling = useCallback((conversationId: string, intervalMs = 5000) => {
    if (activePollRef.current) clearInterval(activePollRef.current);
    activePollRef.current = setInterval(() => {
      fetchMessages(conversationId);
    }, intervalMs);
  }, [fetchMessages]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (activePollRef.current) { clearInterval(activePollRef.current); activePollRef.current = null; }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    return () => stopPolling();
  }, [fetchConversations, fetchTemplates, stopPolling]);

  return {
    // Conversations
    conversations,
    conversationsTotal,
    loadingConversations,
    fetchConversations,
    assignConversation,
    closeConversation,
    markRead,
    // Messages
    messages,
    loadingMessages,
    fetchMessages,
    sendMessage,
    sendTemplate,
    sending,
    // Templates
    templates,
    loadingTemplates,
    fetchTemplates,
    syncTemplates,
    syncing,
    createTemplate,
    updateTemplate,
    // Polling
    startConversationPolling,
    startActiveConversationPolling,
    stopPolling,
  };
}
