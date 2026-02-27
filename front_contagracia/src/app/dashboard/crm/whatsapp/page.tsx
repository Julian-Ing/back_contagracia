'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Send,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle,
  UserPlus,
  FileText,
  Clock,
  RefreshCw,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  XCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

import { useWhatsapp } from '@/modules/crm/hooks/useWhatsapp';
import type {
  CrmWhatsappConversation,
  CrmWhatsappMessage,
  CrmWhatsappTemplate,
  WhatsappMessageStatus,
} from '@/modules/crm/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function StatusIcon({ status }: { status: WhatsappMessageStatus }) {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-3 w-3 opacity-60" />;
    case 'SENT':
      return <Check className="h-3 w-3 opacity-70" />;
    case 'DELIVERED':
      return <CheckCheck className="h-3 w-3 opacity-70" />;
    case 'READ':
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    case 'FAILED':
      return <AlertCircle className="h-3 w-3 text-red-400" />;
    default:
      return <Clock className="h-3 w-3 opacity-60" />;
  }
}

function isWithin24Hours(lastInbound: string | null): boolean {
  if (!lastInbound) return false;
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(lastInbound).getTime() > twentyFourHoursAgo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CrmWhatsappPage() {
  const {
    conversations,
    loadingConversations,
    fetchConversations,
    messages,
    loadingMessages,
    fetchMessages,
    sendMessage,
    sendTemplate,
    sending,
    markRead,
    closeConversation,
    templates,
    loadingTemplates,
    syncTemplates,
    syncing,
    createTemplate,
    updateTemplate,
    startConversationPolling,
    startActiveConversationPolling,
    stopPolling,
  } = useWhatsapp();

  // Local state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchConv, setSearchConv] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CrmWhatsappTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', body_template: '' });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived
  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;
  const canSendFreeform = selectedConversation
    ? isWithin24Hours(selectedConversation.last_inbound_message_at)
    : false;

  const filteredConversations = useMemo(() => {
    if (!searchConv) return conversations;
    const q = searchConv.toLowerCase();
    return conversations.filter((c) => {
      const name = c.third_party?.name || c.phone_number || '';
      return name.toLowerCase().includes(q) || c.phone_number?.includes(q);
    });
  }, [conversations, searchConv]);

  // Start conversation polling
  useEffect(() => {
    startConversationPolling(30000);
    return () => stopPolling();
  }, [startConversationPolling, stopPolling]);

  // Load messages when selecting conversation
  const handleSelectConversation = useCallback((convId: string) => {
    setSelectedId(convId);
    fetchMessages(convId);
    markRead(convId);
    startActiveConversationPolling(convId, 5000);
  }, [fetchMessages, markRead, startActiveConversationPolling]);

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handlers
  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      await sendMessage({
        third_party_id: selectedConversation.third_party_id,
        conversation_id: selectedConversation.id,
        body: newMessage,
      });
      setNewMessage('');
    } catch {
      // toast already shown in hook
    }
  }

  async function handleSendTemplate(tpl: CrmWhatsappTemplate) {
    if (!selectedConversation) return;
    try {
      await sendTemplate({
        third_party_id: selectedConversation.third_party_id,
        template_id: tpl.id,
        conversation_id: selectedConversation.id,
      });
    } catch {
      // toast already shown
    }
  }

  function openCreateTemplate() {
    setTemplateForm({ name: '', body_template: '' });
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  }

  function openEditTemplate(tpl: CrmWhatsappTemplate) {
    setTemplateForm({ name: tpl.name, body_template: tpl.body_template || '' });
    setEditingTemplate(tpl);
    setTemplateDialogOpen(true);
  }

  async function handleSaveTemplate() {
    if (!templateForm.name.trim() || !templateForm.body_template.trim()) return;
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          name: templateForm.name,
          body_template: templateForm.body_template,
        });
      } else {
        await createTemplate({
          name: templateForm.name,
          template_sid: `local_${Date.now()}`,
          body_template: templateForm.body_template,
          language: 'es',
          status: 'PENDING',
        });
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
    } catch {
      // toast already shown
    }
  }

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp</h1>
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="conversaciones" className="w-full">
        <TabsList className="bg-gray-100 dark:bg-slate-800">
          <TabsTrigger value="conversaciones" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversaciones
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <FileText className="h-4 w-4" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Conversaciones Tab                                           */}
        {/* ============================================================ */}
        <TabsContent value="conversaciones" className="mt-4">
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="flex h-[600px]">
              {/* ---- LEFT PANEL: Conversation list ---- */}
              <div className="w-1/3 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                {/* Search */}
                <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                    <Input
                      placeholder="Buscar conversacion..."
                      value={searchConv}
                      onChange={(e) => setSearchConv(e.target.value)}
                      className="pl-9 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                  {loadingConversations && conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-400">
                      <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-40" />
                      <p className="text-sm">Cargando...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-400">
                      <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Sin conversaciones</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                      {filteredConversations.map((conv) => {
                        const lastMsg = conv.messages?.[0];
                        const isSelected = selectedId === conv.id;
                        const contactName = conv.third_party?.name || conv.phone_number;

                        return (
                          <button
                            key={conv.id}
                            type="button"
                            onClick={() => handleSelectConversation(conv.id)}
                            className={cn(
                              'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50',
                              isSelected && 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {contactName}
                                </p>
                                {lastMsg && (
                                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                    {lastMsg.direction === 'OUTBOUND' && (
                                      <span className="text-gray-400 dark:text-slate-500">Tu: </span>
                                    )}
                                    {lastMsg.message_content}
                                  </p>
                                )}
                                {conv.assigned_user && (
                                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                    Asignado: {conv.assigned_user.full_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {conv.last_message_at && (
                                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                    {formatTime(conv.last_message_at)}
                                  </span>
                                )}
                                {conv.unread_count > 0 && (
                                  <Badge className="bg-green-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                                    {conv.unread_count}
                                  </Badge>
                                )}
                                {conv.status === 'closed' && (
                                  <Badge variant="secondary" className="text-[10px]">Cerrada</Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* ---- RIGHT PANEL: Chat view ---- */}
              <div className="w-2/3 flex flex-col">
                {!selectedConversation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                    <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Selecciona una conversacion</p>
                    <p className="text-sm mt-1">Elige un chat del panel izquierdo para comenzar.</p>
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedConversation.third_party?.name || selectedConversation.phone_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {selectedConversation.phone_number}
                          {selectedConversation.assigned_user && (
                            <span> &middot; Asignado: {selectedConversation.assigned_user.full_name}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5 border-gray-200 dark:border-slate-700">
                          <UserPlus className="h-3.5 w-3.5" />
                          Asignar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => closeConversation(selectedConversation.id)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cerrar conversacion
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Messages area */}
                    <ScrollArea className="flex-1 px-4 py-4">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => {
                            const isOutbound = msg.direction === 'OUTBOUND';
                            return (
                              <div
                                key={msg.id}
                                className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                              >
                                <div
                                  className={cn(
                                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                                    isOutbound
                                      ? 'bg-blue-500 text-white ml-auto rounded-br-md'
                                      : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md',
                                  )}
                                >
                                  {msg.message_type === 'template' && msg.template_name && (
                                    <p className="text-[10px] opacity-60 mb-1">Template: {msg.template_name}</p>
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.message_content}</p>
                                  {msg.media_url && (
                                    <p className="text-xs mt-1 opacity-70">[Media adjunto]</p>
                                  )}
                                  <div
                                    className={cn(
                                      'flex items-center gap-1 mt-1',
                                      isOutbound ? 'justify-end' : 'justify-start',
                                    )}
                                  >
                                    <span className="text-[10px] opacity-70">
                                      {formatTime(msg.created_at)}
                                    </span>
                                    {isOutbound && <StatusIcon status={msg.status} />}
                                  </div>
                                  {msg.status === 'FAILED' && msg.failure_reason && (
                                    <p className="text-[10px] text-red-300 mt-1">{msg.failure_reason}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* 24h window warning */}
                    {!canSendFreeform && (
                      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Fuera de la ventana de 24h. Solo puedes enviar plantillas aprobadas.
                        </p>
                      </div>
                    )}

                    {/* Input bar */}
                    <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                      <div className="flex items-end gap-2">
                        {/* Template picker */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 shrink-0 border-gray-200 dark:border-slate-700"
                              title="Enviar plantilla"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            {templates.filter((t) => t.is_active).length === 0 ? (
                              <DropdownMenuItem disabled>Sin plantillas activas</DropdownMenuItem>
                            ) : (
                              templates
                                .filter((t) => t.is_active)
                                .map((tpl) => (
                                  <DropdownMenuItem
                                    key={tpl.id}
                                    onClick={() => handleSendTemplate(tpl)}
                                    disabled={sending}
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{tpl.name}</p>
                                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                        {tpl.body_template}
                                      </p>
                                    </div>
                                  </DropdownMenuItem>
                                ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Textarea
                          placeholder={canSendFreeform ? 'Escribe un mensaje...' : 'Usa una plantilla para iniciar...'}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          rows={1}
                          disabled={!canSendFreeform || sending}
                          className="resize-none min-h-[40px] max-h-[120px] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || !canSendFreeform || sending}
                          className="h-10 w-10 shrink-0 p-0"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* Plantillas Tab                                               */}
        {/* ============================================================ */}
        <TabsContent value="plantillas" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {templates.length} plantilla{templates.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => syncTemplates()}
                  disabled={syncing}
                  className="gap-2 border-gray-200 dark:border-slate-700"
                >
                  <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                  Sincronizar desde Twilio
                </Button>
                <Button onClick={openCreateTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Plantilla
                </Button>
              </div>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : templates.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-slate-400">
                  <FileText className="h-12 w-12 mb-4 opacity-40" />
                  <p className="text-lg font-medium">Sin plantillas</p>
                  <p className="text-sm mt-1">Sincroniza desde Twilio o crea tu primera plantilla.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => (
                  <Card
                    key={tpl.id}
                    className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                          {tpl.name}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          {tpl.twilio_status && (
                            <Badge
                              className={cn(
                                tpl.twilio_status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : tpl.twilio_status === 'rejected'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                              )}
                            >
                              {tpl.twilio_status}
                            </Badge>
                          )}
                          <Badge
                            className={cn(
                              tpl.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
                            )}
                          >
                            {tpl.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3 mb-2">
                        {tpl.body_template}
                      </p>
                      {tpl.template_type && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                          Tipo: {tpl.template_type} &middot; {tpl.language}
                        </p>
                      )}
                      {tpl.last_synced_at && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                          Sincronizado: {formatTime(tpl.last_synced_at)}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-gray-200 dark:border-slate-700"
                          onClick={() => openEditTemplate(tpl)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ---- Template Create/Edit Dialog ---- */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateDialogOpen(false);
            setEditingTemplate(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {editingTemplate
                ? 'Modifica los datos de la plantilla.'
                : 'Crea una nueva plantilla de mensaje para WhatsApp.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tpl-name" className="text-gray-700 dark:text-slate-300">
                Nombre
              </Label>
              <Input
                id="tpl-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Nombre de la plantilla"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tpl-body" className="text-gray-700 dark:text-slate-300">
                Cuerpo del mensaje
              </Label>
              <Textarea
                id="tpl-body"
                value={templateForm.body_template}
                onChange={(e) => setTemplateForm({ ...templateForm, body_template: e.target.value })}
                placeholder={'Escribe el contenido de la plantilla. Usa {{1}}, {{2}} para variables.'}
                rows={5}
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTemplateDialogOpen(false);
                setEditingTemplate(null);
              }}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateForm.name.trim() || !templateForm.body_template.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
