'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  MailCheck,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useRealtime } from '@/shared/providers/RealtimeProvider';
import { pqrsService, condominiumsService, unitsService, residentsService } from '@/modules/ph';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

// ─── Types ───────────────────────────────────────────────

interface Condominium {
  id: string;
  name: string;
}

interface PqrsMessage {
  id: string;
  pqrs_id: string;
  content: string;
  sender_type: 'admin' | 'resident';
  sender_id?: string;
  sender_name?: string;
  email_sent: boolean;
  email_sent_at?: string;
  email_to?: string;
  created_at: string;
}

interface Pqrs {
  id: string;
  condominium_id: string;
  unit_id?: string;
  tercero_id?: string;
  ticket_number: number;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  resolved_at?: string;
  closed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  messages?: PqrsMessage[];
  _count?: { messages: number };
}

interface PqrsStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

// ─── Constants ───────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'petition', label: 'Petición' },
  { value: 'complaint', label: 'Queja' },
  { value: 'claim', label: 'Reclamo' },
  { value: 'suggestion', label: 'Sugerencia' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Proceso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const TYPE_LABELS: Record<string, string> = {
  petition: 'Petición',
  complaint: 'Queja',
  claim: 'Reclamo',
  suggestion: 'Sugerencia',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const TYPE_COLORS: Record<string, string> = {
  petition: 'bg-blue-500/20 text-blue-400',
  complaint: 'bg-red-500/20 text-red-400',
  claim: 'bg-orange-500/20 text-orange-400',
  suggestion: 'bg-green-500/20 text-green-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-slate-500/20 text-slate-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle2 className="w-4 h-4" />,
  closed: <XCircle className="w-4 h-4" />,
};

const EMPTY_FORM = {
  condominium_id: '',
  unit_id: '',
  title: '',
  description: '',
  type: 'petition',
  priority: 'medium',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
};

// ─── Component ───────────────────────────────────────────

export default function PqrsPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const currentUser = useAuthStore((s) => s.user);
  const { can, isPrivileged } = usePermissions();
  const { subscribe } = useRealtime();

  // Permisos PQRS
  const canCreate = can('ph.pqrs.create');
  const canDelete = can('ph.pqrs.delete');
  const canChangeStatus = can('ph.pqrs.change_status');
  const canRespond = can('ph.pqrs.respond');

  // Data
  const [pqrsList, setPqrsList] = useState<Pqrs[]>([]);
  const [stats, setStats] = useState<PqrsStats>({ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [units, setUnits] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Unidades del residente logueado (auto-fill)
  const [myUnits, setMyUnits] = useState<any[]>([]);

  // UI
  const [selectedPqrs, setSelectedPqrs] = useState<Pqrs | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterCondo, setFilterCondo] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Messages
  const [messageText, setMessageText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    variant?: 'destructive' | 'default';
    onConfirm: () => void;
  } | null>(null);

  // ─── Fetch ───────────────────────────────────────────

  const fetchCondominiums = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await condominiumsService.getAll(companyId, { take: 200 });
      setCondominiums(Array.isArray(res) ? res : res.data ?? []);
    } catch { /* silent */ }
  }, [companyId]);

  const fetchPqrs = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (filterCondo !== 'all') params.condominium_id = filterCondo;
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const [listRes, statsRes] = await Promise.all([
        pqrsService.getAll(companyId, params),
        pqrsService.getStats(companyId, filterCondo !== 'all' ? { condominium_id: filterCondo } : {}),
      ]);

      setPqrsList(listRes.data ?? []);
      setStats(statsRes);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando PQRS');
    } finally {
      setLoading(false);
    }
  }, [companyId, filterCondo, filterType, filterStatus, searchTerm]);

  const fetchPqrsDetail = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      const detail = await pqrsService.getOne(companyId, id);
      setSelectedPqrs(detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando detalle');
    }
  }, [companyId]);

  const fetchUnitsForCondo = useCallback(async (condoId: string) => {
    if (!companyId || !condoId) { setUnits([]); return; }
    try {
      const res = await unitsService.getAll(companyId, { condominium_id: condoId, take: 500 });
      const data = Array.isArray(res) ? res : res.data ?? [];
      setUnits(data.map((u: any) => ({ id: u.id, number: u.number || u.unit_number || u.id })));
    } catch { setUnits([]); }
  }, [companyId]);

  // Cargar unidades del residente logueado
  const fetchMyUnits = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await residentsService.getMyUnits(companyId);
      setMyUnits(Array.isArray(data) ? data : []);
    } catch { setMyUnits([]); }
  }, [companyId]);

  useEffect(() => { fetchCondominiums(); }, [fetchCondominiums]);
  useEffect(() => { fetchPqrs(); }, [fetchPqrs]);
  useEffect(() => { fetchMyUnits(); }, [fetchMyUnits]);

  // Ref para acceder al PQRS seleccionado sin re-suscribirse
  const selectedPqrsRef = useRef<Pqrs | null>(null);
  useEffect(() => { selectedPqrsRef.current = selectedPqrs; }, [selectedPqrs]);

  // Realtime: refrescar conversación cuando llega un evento PQRS
  useEffect(() => {
    const PQRS_EVENTS = ['ph_pqrs_message', 'ph_pqrs_status_changed', 'ph_pqrs_deleted'];

    const unsub = subscribe('notifications:received', (data: any) => {
      const notif = data?.notification;
      if (!notif || !PQRS_EVENTS.includes(notif.type)) return;

      // Si es eliminación, cerrar detalle si estamos viéndolo y refrescar lista
      if (notif.type === 'ph_pqrs_deleted') {
        setSelectedPqrs(null);
        fetchPqrs();
        return;
      }

      // Extraer pqrsId del action_url (?id=xxx)
      const match = notif.action_url?.match(/[?&]id=([^&]+)/);
      const pqrsId = match?.[1];
      const current = selectedPqrsRef.current;

      if (current && pqrsId === current.id) {
        // Estamos viendo este PQRS → refrescar conversación
        fetchPqrsDetail(current.id);
      } else {
        // Estamos en la lista → refrescar lista
        fetchPqrs();
      }
    });

    return unsub;
  }, [subscribe, fetchPqrsDetail, fetchPqrs]);

  // Auto-fill form cuando el residente abre el dialog de crear
  const handleOpenCreate = useCallback(() => {
    // Auto-fill datos de contacto del usuario logueado + tercero
    const tercero = myUnits[0]?.tercero;
    const contactDefaults = {
      contact_name: currentUser?.full_name || '',
      contact_email: currentUser?.email || '',
      contact_phone: tercero?.phone || '',
    };

    if (myUnits.length > 0) {
      // Obtener copropiedades únicas del residente
      const condoId = myUnits[0].unit?.condominium?.id || '';
      const unitId = myUnits.length === 1 ? myUnits[0].unit?.id || '' : '';
      setForm({ ...EMPTY_FORM, ...contactDefaults, condominium_id: condoId, unit_id: unitId });

      // Cargar las unidades de esa copropiedad (filtrado a las del residente)
      if (condoId) {
        const residentUnits = myUnits
          .filter((r: any) => r.unit?.condominium?.id === condoId)
          .map((r: any) => ({ id: r.unit.id, number: r.unit.number || r.unit.unit_number || r.unit.id }));
        setUnits(residentUnits);
      }
    } else {
      setForm({ ...EMPTY_FORM, ...contactDefaults });
      setUnits([]);
    }
    setIsCreateOpen(true);
  }, [myUnits]);

  // ─── Handlers ────────────────────────────────────────

  const handleCreate = async () => {
    if (!companyId || !form.condominium_id || !form.title || !form.description) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        condominium_id: form.condominium_id,
        title: form.title,
        description: form.description,
        type: form.type,
        priority: form.priority,
      };
      if (form.unit_id) data.unit_id = form.unit_id;
      if (form.contact_name) data.contact_name = form.contact_name;
      if (form.contact_email) data.contact_email = form.contact_email;
      if (form.contact_phone) data.contact_phone = form.contact_phone;

      await pqrsService.create(companyId, data);
      toast.success('PQRS creado exitosamente');
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchPqrs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando PQRS');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = (id: string, status: string) => {
    const labels: Record<string, string> = {
      in_progress: 'En Proceso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    };
    setConfirmAction({
      title: `Cambiar estado a ${labels[status] || status}`,
      message: `¿Estás seguro de cambiar el estado de esta solicitud a "${labels[status] || status}"?`,
      onConfirm: async () => {
        if (!companyId) return;
        try {
          await pqrsService.changeStatus(companyId, id, status);
          toast.success(`Estado cambiado a ${STATUS_LABELS[status]}`);
          fetchPqrsDetail(id);
          fetchPqrs();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error cambiando estado');
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Eliminar PQRS',
      message: '¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.',
      variant: 'destructive',
      onConfirm: async () => {
        if (!companyId) return;
        try {
          await pqrsService.remove(companyId, id);
          toast.success('PQRS eliminado');
          setSelectedPqrs(null);
          fetchPqrs();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando');
        }
      },
    });
  };

  const handleSendMessage = async () => {
    if (!companyId || !selectedPqrs || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const senderType = myUnits.length > 0 ? 'resident' : 'admin';
      await pqrsService.addMessage(companyId, selectedPqrs.id, {
        content: messageText.trim(),
        sender_type: senderType,
        send_email: sendEmail,
      });
      toast.success(sendEmail ? 'Mensaje enviado con email' : 'Mensaje agregado');
      setMessageText('');
      fetchPqrsDetail(selectedPqrs.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error enviando mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── Detail View ─────────────────────────────────────

  if (selectedPqrs) {
    const p = selectedPqrs;
    const messages = p.messages ?? [];
    const isResident = myUnits.length > 0;

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedPqrs(null); fetchPqrs(); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                #{p.ticket_number} — {p.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {p.condominium?.name} &middot; {new Date(p.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={TYPE_COLORS[p.type]}>{TYPE_LABELS[p.type]}</Badge>
            <Badge className={PRIORITY_COLORS[p.priority]}>{PRIORITY_LABELS[p.priority]}</Badge>
            <Badge className={STATUS_COLORS[p.status]}>
              {STATUS_ICONS[p.status]} <span className="ml-1">{STATUS_LABELS[p.status]}</span>
            </Badge>
          </div>
        </div>

        {/* Info + Status Buttons */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Contacto</span>
                <p className="font-medium">{p.contact_name || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{p.contact_email || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono</span>
                <p className="font-medium">{p.contact_phone || '—'}</p>
              </div>
              {(canChangeStatus || canDelete) && (
                <div className="flex items-end gap-2">
                  {canChangeStatus && p.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => handleChangeStatus(p.id, 'in_progress')}>
                      <Clock className="w-3 h-3 mr-1" /> En Proceso
                    </Button>
                  )}
                  {canChangeStatus && (p.status === 'open' || p.status === 'in_progress') && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleChangeStatus(p.id, 'resolved')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                    </Button>
                  )}
                  {canChangeStatus && p.status === 'resolved' && (
                    <Button size="sm" variant="outline" onClick={() => handleChangeStatus(p.id, 'closed')}>
                      <XCircle className="w-3 h-3 mr-1" /> Cerrar
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversation Thread */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Conversación ({messages.length})
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 mb-4">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Sin mensajes aún</p>
              )}
              {messages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-3 ${
                        isAdmin
                          ? 'bg-blue-600/20 border border-blue-500/30'
                          : 'bg-slate-700/50 border border-slate-600/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {msg.sender_name || (isAdmin ? 'Admin' : 'Residente')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.email_sent && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <MailCheck className="w-3 h-3" /> Email enviado
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {(() => {
              const mySenderType = isResident ? 'resident' : 'admin';
              const lastMsg = messages[messages.length - 1];
              const waitingForReply = lastMsg && lastMsg.sender_type === mySenderType;

              if (p.status === 'closed' || !canRespond) return null;

              if (waitingForReply) {
                return (
                  <div className="border-t border-border pt-4">
                    <p className="text-center text-sm text-muted-foreground py-4">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Esperando respuesta {isResident ? 'del administrador' : 'del contacto'}...
                    </p>
                  </div>
                );
              }

              return (
                <div className="border-t border-border pt-4 space-y-3">
                  <textarea
                    className="w-full min-h-[100px] rounded-lg bg-background border border-input px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Escribe tu respuesta..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="rounded"
                      />
                      <Mail className="w-4 h-4" />
                      {isResident ? 'Enviar email al administrador' : 'Enviar email al contacto'}
                    </label>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendingMessage}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendingMessage ? 'Enviando...' : 'Enviar Respuesta'}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Confirm Action Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{confirmAction?.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{confirmAction?.message}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'}
                onClick={() => {
                  confirmAction?.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de PQRS</h1>
        {canCreate && (
          <Button variant="outline" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" /> Registrar PQRS
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: <MessageSquare className="w-5 h-5 text-slate-400" /> },
          { label: 'Abiertas', value: stats.open, icon: <AlertCircle className="w-5 h-5 text-blue-400" /> },
          { label: 'En Proceso', value: stats.in_progress, icon: <Clock className="w-5 h-5 text-yellow-400" /> },
          { label: 'Resueltas', value: stats.resolved, icon: <CheckCircle2 className="w-5 h-5 text-green-400" /> },
          { label: 'Cerradas', value: stats.closed, icon: <XCircle className="w-5 h-5 text-slate-500" /> },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              {kpi.icon}
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filterCondo}
          onChange={setFilterCondo}
          placeholder="Copropiedad"
          className="w-[200px]"
          options={[
            { value: 'all', label: 'Todas' },
            ...condominiums.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          value={filterType}
          onChange={setFilterType}
          placeholder="Tipo"
          className="w-[160px]"
          options={[{ value: 'all', label: 'Todos' }, ...TYPE_OPTIONS]}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Estado"
          className="w-[160px]"
          options={[{ value: 'all', label: 'Todos' }, ...STATUS_OPTIONS]}
        />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o #..."
            className="pl-9 w-[220px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : pqrsList.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay PQRS registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Copropiedad</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensajes</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pqrsList.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => fetchPqrsDetail(p.id)}
                  >
                    <TableCell className="font-mono font-bold">{p.ticket_number}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[p.type]}>{TYPE_LABELS[p.type] || p.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[p.priority]}>{PRIORITY_LABELS[p.priority] || p.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.condominium?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{p.contact_name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[p.status]}>
                        {STATUS_ICONS[p.status]} <span className="ml-1">{STATUS_LABELS[p.status] || p.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{p._count?.messages ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('es-CO')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar PQRS recibida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Copropiedad *</Label>
              <Select
                value={form.condominium_id}
                onChange={(val) => {
                  setForm({ ...form, condominium_id: val, unit_id: '' });
                  if (myUnits.length > 0) {
                    // Filtrar a las unidades del residente en esa copropiedad
                    const residentUnits = myUnits
                      .filter((r: any) => r.unit?.condominium?.id === val)
                      .map((r: any) => ({ id: r.unit.id, number: r.unit.number || r.unit.unit_number || r.unit.id }));
                    setUnits(residentUnits);
                  } else {
                    fetchUnitsForCondo(val);
                  }
                }}
                placeholder="Seleccionar copropiedad"
                searchable
                options={
                  myUnits.length > 0
                    ? // Residente: solo sus copropiedades
                      [...new Map(myUnits.map((r: any) => [r.unit?.condominium?.id, { value: r.unit?.condominium?.id, label: r.unit?.condominium?.name }])).values()]
                    : // Admin: todas las copropiedades
                      condominiums.map((c) => ({ value: c.id, label: c.name }))
                }
              />
            </div>

            {form.condominium_id && units.length > 0 && (
              <div>
                <Label>Unidad (opcional)</Label>
                <Select
                  value={form.unit_id}
                  onChange={(val) => setForm({ ...form, unit_id: val })}
                  placeholder="Seleccionar unidad"
                  searchable
                  options={[
                    { value: '', label: 'Sin unidad' },
                    ...units.map((u) => ({ value: u.id, label: u.number })),
                  ]}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val })}
                  options={TYPE_OPTIONS}
                />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={form.priority}
                  onChange={(val) => setForm({ ...form, priority: val })}
                  options={PRIORITY_OPTIONS}
                />
              </div>
            </div>

            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Asunto del PQRS"
              />
            </div>

            <div>
              <Label>Descripción *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-lg bg-background border border-input px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción detallada de la solicitud..."
              />
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium mb-2">Datos de contacto</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="correo@email.com"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="Teléfono"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando...' : 'Crear PQRS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmAction?.message}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => {
                confirmAction?.onConfirm();
                setConfirmAction(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
