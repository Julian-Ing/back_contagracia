'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Send,
  Megaphone,
  FileText,
  Mail,
  MailX,
  AlertTriangle,
  CheckCircle2,
  Search,
  Loader2,
  Eye,
  LayoutTemplate,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { comunicadosService, condominiumsService } from '@/modules/ph';
import { emailService } from '@/modules/crm/services/crm.service';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/components/ui/alert-dialog';
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

interface Recipient {
  id: string;
  comunicado_id: string;
  tercero_id: string;
  email: string | null;
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
}

interface Comunicado {
  id: string;
  condominium_id: string;
  title: string;
  body: string;
  target_roles: string[];
  status: string;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_no_email: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  recipients?: Recipient[];
  _count?: { recipients: number };
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
}

// ─── Constants ───────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Copropietarios',
  tenant: 'Arrendatarios',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  sent: 'bg-green-500/20 text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
};

const EMPTY_FORM = {
  condominium_id: '',
  title: '',
  body: '',
  target_roles: ['owner', 'tenant'] as string[],
};

interface PhTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Component ───────────────────────────────────────────

export default function ComunicadosPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { can } = usePermissions();

  const canCreate = can('ph.comunicados.create');
  const canDelete = can('ph.comunicados.delete');

  // Data
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, sent: 0 });
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [selected, setSelected] = useState<Comunicado | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comunicado | null>(null);

  // Preview recipients
  const [previewRecipients, setPreviewRecipients] = useState<{ tercero_id: string; name: string; email: string | null; role: string }[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // PH templates
  const [phTemplates, setPhTemplates] = useState<PhTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Filters
  const [filterCondo, setFilterCondo] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Load data ──────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filterCondo !== 'all') params.condominium_id = filterCondo;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const [listRes, statsRes] = await Promise.all([
        comunicadosService.getAll(companyId, params),
        comunicadosService.getStats(companyId, filterCondo !== 'all' ? { condominium_id: filterCondo } : undefined),
      ]);

      setComunicados(listRes.data || []);
      setStats(statsRes || { total: 0, draft: 0, sent: 0 });
    } catch {
      toast.error('Error cargando comunicados');
    } finally {
      setLoading(false);
    }
  }, [companyId, filterCondo, filterStatus, searchTerm]);

  const loadCondominiums = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await condominiumsService.getAll(companyId);
      setCondominiums(res.data || res || []);
    } catch {
      /* ignore */
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadCondominiums();
  }, [loadCondominiums]);

  useEffect(() => {
    emailService.getByModule('ph')
      .then((data: PhTemplate[]) => setPhTemplates(data || []))
      .catch(() => { /* ignore */ });
  }, []);

  // ─── Preview recipients on form change ────────────────

  useEffect(() => {
    if (!companyId || !isFormOpen || !form.condominium_id || form.target_roles.length === 0) {
      setPreviewRecipients([]);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    comunicadosService
      .previewRecipients(companyId, form.condominium_id, form.target_roles)
      .then((data) => { if (!cancelled) setPreviewRecipients(data || []); })
      .catch(() => { if (!cancelled) setPreviewRecipients([]); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [companyId, isFormOpen, form.condominium_id, form.target_roles]);

  // ─── CRUD helpers ───────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreviewRecipients([]);
    setSelectedTemplateId('');
    setIsFormOpen(true);
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = phTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      title: tpl.subject || f.title,
      body: stripHtml(tpl.body_html) || f.body,
    }));
  };

  const openEdit = (c: Comunicado) => {
    setEditingId(c.id);
    setForm({
      condominium_id: c.condominium_id,
      title: c.title,
      body: c.body,
      target_roles: Array.isArray(c.target_roles) ? c.target_roles : [],
    });
    setIsFormOpen(true);
  };

  const handleSave = async (andSend = false) => {
    if (!companyId) return;
    if (!form.condominium_id || !form.title.trim() || !form.body.trim()) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    if (form.target_roles.length === 0) {
      toast.error('Selecciona al menos un rol destinatario');
      return;
    }

    setSaving(true);
    try {
      let record: Comunicado;
      if (editingId) {
        record = await comunicadosService.update(companyId, editingId, form);
      } else {
        record = await comunicadosService.create(companyId, form);
      }

      if (andSend) {
        setSending(true);
        const sent = await comunicadosService.send(companyId, record.id);
        toast.success(`Comunicado enviado a ${sent.total_recipients} destinatarios`);
        setSelected(sent);
      } else {
        toast.success(editingId ? 'Comunicado actualizado' : 'Borrador guardado');
      }

      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando comunicado');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  const handleSend = async (c: Comunicado) => {
    if (!companyId) return;
    setSending(true);
    try {
      const sent = await comunicadosService.send(companyId, c.id);
      toast.success(`Comunicado enviado a ${sent.total_recipients} destinatarios`);
      setSelected(sent);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error enviando comunicado');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !deleteTarget) return;
    try {
      await comunicadosService.remove(companyId, deleteTarget.id);
      toast.success('Comunicado eliminado');
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      loadData();
    } catch {
      toast.error('Error eliminando comunicado');
    }
  };

  const openDetail = async (c: Comunicado) => {
    if (!companyId) return;
    try {
      const detail = await comunicadosService.getOne(companyId, c.id);
      setSelected(detail);
    } catch {
      toast.error('Error cargando detalle');
    }
  };

  // ─── Role checkbox helper ──────────────────────────────

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter((r) => r !== role)
        : [...f.target_roles, role],
    }));
  };

  // ─── Render helpers ────────────────────────────────────

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));
  };

  const roleBadges = (roles: string[]) =>
    (roles || []).map((r) => (
      <Badge key={r} variant="outline" className="text-xs mr-1">
        {ROLE_LABELS[r] || r}
      </Badge>
    ));

  // ─── Detail view ───────────────────────────────────────

  if (selected) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{selected.title}</h1>
            <p className="text-sm text-muted-foreground">
              {selected.condominium?.name} — {formatDate(selected.sent_at || selected.created_at)}
            </p>
          </div>
          <Badge className={STATUS_COLORS[selected.status]}>
            {STATUS_LABELS[selected.status]}
          </Badge>
          {selected.status === 'draft' && canCreate && (
            <>
              <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                Editar
              </Button>
              <Button size="sm" onClick={() => handleSend(selected)} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Enviar
              </Button>
            </>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(selected)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Roles */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Destinatarios:</span>
          {roleBadges(selected.target_roles)}
        </div>

        {/* Body */}
        <Card>
          <CardContent className="pt-6">
            <div className="whitespace-pre-wrap text-sm">{selected.body}</div>
          </CardContent>
        </Card>

        {/* Stats (only if sent) */}
        {selected.status === 'sent' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{selected.total_recipients}</p>
                <p className="text-xs text-muted-foreground">Destinatarios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-400">{selected.total_sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-400">{selected.total_failed}</p>
                <p className="text-xs text-muted-foreground">Fallidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{selected.total_no_email}</p>
                <p className="text-xs text-muted-foreground">Sin email</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recipients table (only if sent) */}
        {selected.status === 'sent' && selected.recipients && selected.recipients.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-medium mb-3">Detalle de destinatarios</h3>
              <div className="overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.email || '(sin email)'}</TableCell>
                        <TableCell>
                          {!r.email ? (
                            <Badge variant="outline" className="text-yellow-400">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Sin email
                            </Badge>
                          ) : r.email_sent ? (
                            <Badge variant="outline" className="text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-400">
                              <MailX className="w-3 h-3 mr-1" /> Fallido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.email_error || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit dialog (needed here because detail view returns early) */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar comunicado</DialogTitle>
              <DialogDescription>Modifica el comunicado antes de enviarlo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Copropiedad *</Label>
                <Select
                  value={form.condominium_id}
                  onChange={(v) => setForm((f) => ({ ...f, condominium_id: v }))}
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    ...condominiums.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label>Destinatarios *</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.target_roles.includes('owner')} onChange={() => toggleRole('owner')} className="rounded border-border" />
                    <span className="text-sm">Copropietarios</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.target_roles.includes('tenant')} onChange={() => toggleRole('tenant')} className="rounded border-border" />
                    <span className="text-sm">Arrendatarios</span>
                  </label>
                </div>
              </div>
              {form.condominium_id && form.target_roles.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2">
                    Destinatarios encontrados
                    {loadingPreview && <Loader2 className="w-3 h-3 animate-spin" />}
                    {!loadingPreview && <Badge variant="outline" className="text-xs">{previewRecipients.length}</Badge>}
                  </Label>
                  {previewRecipients.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-auto rounded border border-border bg-muted/30 p-2 space-y-1">
                      {previewRecipients.map((r) => (
                        <div key={r.tercero_id} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{r.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">
                            {r.email || <span className="text-yellow-400">sin email</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!loadingPreview && previewRecipients.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No se encontraron destinatarios para los roles seleccionados.</p>
                  )}
                </div>
              )}
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Asunto del comunicado" />
              </div>
              <div>
                <Label>Contenido *</Label>
                <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Escriba el contenido del comunicado..." rows={6} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving && !sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                Guardar borrador
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Enviar ahora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar comunicado</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará &quot;{deleteTarget?.title}&quot; de forma permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── List view ─────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Envío de comunicados masivos a copropietarios y arrendatarios
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo comunicado
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary opacity-60" />
            <div>
              <p className="text-2xl font-bold">{stats.sent}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-yellow-400 opacity-60" />
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Borradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Mail className="w-8 h-8 text-muted-foreground opacity-60" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filterCondo}
          onChange={setFilterCondo}
          options={[
            { value: 'all', label: 'Todas las copropiedades' },
            ...condominiums.map((c) => ({ value: c.id, label: c.name })),
          ]}
          className="w-56"
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'draft', label: 'Borrador' },
            { value: 'sent', label: 'Enviado' },
          ]}
          className="w-44"
        />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comunicados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Megaphone className="w-12 h-12 mb-3 opacity-30" />
              <p>No hay comunicados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Copropiedad</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comunicados.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.condominium?.name || '-'}
                    </TableCell>
                    <TableCell>{roleBadges(c.target_roles)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.sent_at || c.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[c.status]}>
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openDetail(c)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {c.status === 'draft' && canCreate && (
                          <Button variant="ghost" size="icon" onClick={() => handleSend(c)} disabled={sending}>
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar comunicado' : 'Nuevo comunicado'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica el comunicado antes de enviarlo.' : 'Crea un comunicado para enviarlo a los residentes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copropiedad */}
            <div>
              <Label>Copropiedad *</Label>
              <Select
                value={form.condominium_id}
                onChange={(v) => setForm((f) => ({ ...f, condominium_id: v }))}
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...condominiums.map((c) => ({ value: c.id, label: c.name })),
                ]}
                disabled={!!editingId}
              />
            </div>

            {/* Roles */}
            <div>
              <Label>Destinatarios *</Label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.target_roles.includes('owner')}
                    onChange={() => toggleRole('owner')}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Copropietarios</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.target_roles.includes('tenant')}
                    onChange={() => toggleRole('tenant')}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Arrendatarios</span>
                </label>
              </div>
            </div>

            {/* Preview destinatarios */}
            {form.condominium_id && form.target_roles.length > 0 && (
              <div>
                <Label className="flex items-center gap-2">
                  Destinatarios encontrados
                  {loadingPreview && <Loader2 className="w-3 h-3 animate-spin" />}
                  {!loadingPreview && (
                    <Badge variant="outline" className="text-xs">
                      {previewRecipients.length}
                    </Badge>
                  )}
                </Label>
                {previewRecipients.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-auto rounded border border-border bg-muted/30 p-2 space-y-1">
                    {previewRecipients.map((r) => (
                      <div key={r.tercero_id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{r.name}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">
                          {r.email || <span className="text-yellow-400">sin email</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!loadingPreview && previewRecipients.length === 0 && form.condominium_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No se encontraron destinatarios para los roles seleccionados.
                  </p>
                )}
              </div>
            )}

            {/* Plantilla opcional (solo en creación) */}
            {!editingId && phTemplates.length > 0 && (
              <div>
                <Label className="flex items-center gap-1.5">
                  <LayoutTemplate className="w-3.5 h-3.5 text-muted-foreground" />
                  Cargar desde plantilla{' '}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Select
                  value={selectedTemplateId}
                  onChange={applyTemplate}
                  options={[
                    { value: '', label: 'Sin plantilla...' },
                    ...phTemplates.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
            )}

            {/* Título */}
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Asunto del comunicado"
              />
            </div>

            {/* Body */}
            <div>
              <Label>Contenido *</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Escriba el contenido del comunicado..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
              {saving && !sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
              Guardar borrador
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Enviar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comunicado</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.title}&quot; de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
