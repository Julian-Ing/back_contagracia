'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone,
  Send,
  Building2,
  Users,
  RefreshCw,
  Bell,
  AlertCircle,
  Filter,
  Loader2,
  History,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import toast from 'react-hot-toast';
import { adminService } from '@/modules/admin/services/admin.service';
import { notificationService } from '@/modules/admin/services/notification.service';
import type { Company, CategoryWithCount, BroadcastNotification } from '@/modules/admin/types';

// --- Types ---

interface NotificationType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// --- Constants ---

const NOTIFICATION_TYPES: NotificationType[] = [
  { value: 'admin_announcement', label: 'Anuncio Importante', icon: Megaphone, color: 'bg-blue-500' },
  { value: 'admin_update', label: 'Actualización del Sistema', icon: RefreshCw, color: 'bg-green-500' },
  { value: 'admin_improvement', label: 'Mejora Implementada', icon: Bell, color: 'bg-purple-500' },
  { value: 'admin_support', label: 'Mensaje de Soporte', icon: Users, color: 'bg-orange-500' },
  { value: 'admin_satisfaction', label: 'Encuesta de Satisfacción', icon: AlertCircle, color: 'bg-yellow-500' },
];

// --- Helpers ---

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Component ---

export default function BroadcastNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // History state
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'admin_announcement',
    action_url: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesRes, categoriesRes] = await Promise.all([
          adminService.getCompanies({ limit: 500 }),
          adminService.getCategories(),
        ]);
        setCompanies(companiesRes.data);
        setCategories(categoriesRes);
      } catch (err) {
        toast.error('Error al cargar datos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (categoryFilter === 'all') return companies;
    return companies.filter((c) =>
      c.categories?.some((cat) => cat.id === categoryFilter)
    );
  }, [companies, categoryFilter]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !sendToAll) {
      setSelectedCompanies(filteredCompanies.map((c) => c.company_id));
    }
  }, [categoryFilter, filteredCompanies, sendToAll]);

  const fetchBroadcasts = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await notificationService.getBroadcasts(page, 10);
      setBroadcasts(res.data);
      setHistoryTotal(res.total);
      setHistoryTotalPages(res.totalPages);
      setHistoryPage(res.page);
    } catch (err) {
      toast.error('Error al cargar historial');
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchBroadcasts(historyPage);
    }
  }, [activeTab, historyPage, fetchBroadcasts]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) return;
    if (!sendToAll && selectedCompanies.length === 0) return;

    setSending(true);
    try {
      const result = await notificationService.sendBroadcast({
        title: formData.title,
        message: formData.message,
        type: formData.type,
        action_url: formData.action_url || undefined,
        send_to_all: sendToAll,
        company_ids: sendToAll ? undefined : selectedCompanies,
      });
      toast.success(`Notificación enviada a ${result.sent_count} empresas`);
      setFormData({ title: '', message: '', type: 'admin_announcement', action_url: '' });
      setSelectedCompanies([]);
      setSendToAll(true);
      // Reset history so it reloads on next tab switch
      setBroadcasts([]);
      setHistoryPage(1);
    } catch (err) {
      toast.error('Error al enviar la notificación');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const selectedType = NOTIFICATION_TYPES.find((t) => t.value === formData.type);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Envía mensajes y consulta el historial de notificaciones
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'send'
              ? 'text-indigo-500 border-indigo-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Send className="h-4 w-4" />
          Enviar
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'text-indigo-500 border-indigo-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <History className="h-4 w-4" />
          Historial
          {historyTotal > 0 && (
            <span className="ml-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              {historyTotal}
            </span>
          )}
        </button>
      </div>

      {/* Send Tab */}
      {activeTab === 'send' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuevo Mensaje</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Completa los campos para enviar una notificación
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Tipo de Notificación</Label>
              <Select
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
                options={NOTIFICATION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Nueva funcionalidad disponible"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">{formData.title.length}/100 caracteres</p>
            </div>

            {/* Mensaje */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">Mensaje *</Label>
              <Textarea
                id="message"
                placeholder="Escribe el contenido del mensaje..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                maxLength={500}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">{formData.message.length}/500 caracteres</p>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="action_url" className="text-gray-700 dark:text-gray-300">URL de Acción (opcional)</Label>
              <Input
                id="action_url"
                placeholder="Ej: /dashboard/settings"
                value={formData.action_url}
                onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                URL interna a la que el usuario será dirigido al hacer clic
              </p>
            </div>

            {/* Preview */}
            {formData.title && (
              <div className="p-4 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${selectedType?.color || 'bg-blue-500'}`}>
                    {selectedType && <selectedType.icon className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formData.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formData.message || 'Mensaje...'}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={sending || !formData.title.trim() || !formData.message.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Notificación
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Recipients */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Destinatarios</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Selecciona las empresas que recibirán el mensaje
          </p>

          <div className="space-y-4">
            {/* Send to all */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => {
                  setSendToAll(checked === true);
                  if (checked) {
                    setSelectedCompanies([]);
                    setCategoryFilter('all');
                  }
                }}
              />
              <Label htmlFor="sendToAll" className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                Enviar a todas las empresas activas
              </Label>
            </div>

            {!sendToAll && (
              <>
                {/* Category filter */}
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Filter className="h-4 w-4" />
                      Filtrar por categoría
                    </Label>
                    <Select
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      placeholder="Todas las categorías"
                      options={[
                        { value: 'all', label: 'Todas las categorías' },
                        ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                      ]}
                    />
                    {categoryFilter !== 'all' && (
                      <p className="text-xs text-gray-500">
                        {filteredCompanies.length} empresas en esta categoría
                      </p>
                    )}
                  </div>
                )}

                {/* Select/deselect buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCompanies(filteredCompanies.map((c) => c.company_id))}
                    className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Seleccionar todas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCompanies([])}
                    className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Deseleccionar
                  </Button>
                </div>

                {/* Company list */}
                <div className="h-[300px] overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2 space-y-1">
                  {filteredCompanies.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      {categoryFilter !== 'all'
                        ? 'No hay empresas en esta categoría'
                        : 'No hay empresas activas'}
                    </p>
                  ) : (
                    filteredCompanies.map((company) => (
                      <div
                        key={company.company_id}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors ${
                          selectedCompanies.includes(company.company_id) ? 'bg-slate-700/50' : ''
                        }`}
                        onClick={() => toggleCompany(company.company_id)}
                      >
                        <Checkbox
                          checked={selectedCompanies.includes(company.company_id)}
                          onCheckedChange={() => toggleCompany(company.company_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {company.company_name}
                          </p>
                          {company.categories && company.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {company.categories.map((cat) => (
                                <Badge
                                  key={cat.id}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                  style={{ borderColor: cat.color, color: cat.color }}
                                >
                                  {cat.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            company.subscription_ends_at && new Date(company.subscription_ends_at) > new Date()
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs'
                              : 'bg-red-500/20 text-red-400 border-red-500/30 text-xs'
                          }
                        >
                          {company.subscription_ends_at && new Date(company.subscription_ends_at) > new Date() ? 'Activa' : 'Expirada'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCompanies.length} de {filteredCompanies.length} empresas seleccionadas
                  {categoryFilter !== 'all' && (
                    <span className="ml-1">(filtrado por categoría)</span>
                  )}
                </p>
              </>
            )}

            {sendToAll && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-sm text-indigo-300">
                  Se enviará a <strong>{companies.length}</strong> empresas activas y en período de
                  prueba
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <History className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No se han enviado notificaciones aún</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {broadcasts.map((broadcast) => {
                  const config = NOTIFICATION_TYPES.find((t) => t.value === broadcast.type);
                  const Icon = config?.icon || Bell;
                  return (
                    <div key={broadcast.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className={`p-2 rounded-full shrink-0 mt-0.5 ${config?.color || 'bg-gray-500'}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{broadcast.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{broadcast.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {config?.label || broadcast.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(broadcast.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            {broadcast.sent_to_all ? (
                              <>
                                <Globe className="h-3 w-3" />
                                Todas las empresas
                              </>
                            ) : (
                              <>
                                <Building2 className="h-3 w-3" />
                                {broadcast.sent_count} empresas
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-xs text-gray-500">
                    Página {historyPage} de {historyTotalPages} ({historyTotal} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                      className="border-gray-300 dark:border-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="border-gray-300 dark:border-slate-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
