'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  MessageCircle,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Building2,
  Calendar,
  Tag,
  User,
  Settings,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { Switch } from '@/shared/components/ui/switch';

import type { CrmContact, CrmContactTag } from '@/modules/crm/types';
import { useContacts } from '@/modules/crm/hooks/useContacts';
import { useTags } from '@/modules/crm/hooks/useTags';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENTS = [
  { value: 'all', label: 'Todos los segmentos' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'individual', label: 'Individual' },
];

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tagBgStyle(color: string | null) {
  if (!color) return undefined;
  return { backgroundColor: `${color}22`, color, borderColor: `${color}44` };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CrmContactsPage() {
  // Hooks
  const { contacts, loading, create, update, remove, addTag, removeTag, refetch } = useContacts();
  const { tags } = useTags();

  // State
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [detailContact, setDetailContact] = useState<CrmContact | null>(null);
  const [segmentationOpen, setSegmentationOpen] = useState(false);
  const [deleteContact, setDeleteContact] = useState<CrmContact | null>(null);

  // Segmentation config
  const [segConfig, setSegConfig] = useState({
    frequent_days: 30,
    inactive_days: 90,
    high_value_threshold: 5000000,
    new_client_days: 60,
    auto_recalculate: false,
    recalculate_frequency: 'manual',
  });
  const [segSaving, setSegSaving] = useState(false);
  const [segCalculating, setSegCalculating] = useState(false);
  const [segResults, setSegResults] = useState<{
    contacts_processed: number;
    frequent_assigned: number;
    inactive_assigned: number;
    high_value_assigned: number;
    new_client_assigned: number;
  } | null>(null);

  // Mock segmentation summary
  const segSummary = {
    total: contacts.length,
    frequent: 1,
    inactive: 1,
    high_value: 1,
    new_client: 1,
  };

  // Form state (shared for create / edit)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    company_name: '',
    birth_date: '',
  });

  // Filtered list
  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.company_name?.toLowerCase().includes(q),
      );
    }
    if (segmentFilter !== 'all') {
      list = list.filter((c) => c.segment === segmentFilter);
    }
    return list;
  }, [contacts, search, segmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Handlers
  function openCreate() {
    setForm({ name: '', email: '', phone: '', whatsapp_number: '', company_name: '', birth_date: '' });
    setCreateOpen(true);
  }

  function openEdit(c: CrmContact) {
    setForm({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      whatsapp_number: c.whatsapp_number ?? '',
      company_name: c.company_name ?? '',
      birth_date: c.birth_date ?? '',
    });
    setEditContact(c);
  }

  async function handleSave() {
    try {
      if (editContact) {
        await update(editContact.id, form);
      } else {
        await create(form);
      }
      setCreateOpen(false);
      setEditContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  }

  function handleSegSave() {
    setSegSaving(true);
    setTimeout(() => {
      setSegSaving(false);
    }, 800);
  }

  function handleSegCalculate() {
    setSegCalculating(true);
    setSegResults(null);
    setTimeout(() => {
      setSegResults({
        contacts_processed: contacts.length,
        frequent_assigned: 1,
        inactive_assigned: 1,
        high_value_assigned: 1,
        new_client_assigned: 1,
      });
      setSegCalculating(false);
    }, 1200);
  }

  const formatCOP = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const isFormDialogOpen = createOpen || editContact !== null;

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contactos</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Buscar contacto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-64 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
            />
          </div>

          {/* Segment filter */}
          <Select
            options={SEGMENTS}
            value={segmentFilter}
            onChange={(v) => {
              setSegmentFilter(v);
              setPage(1);
            }}
            placeholder="Segmento"
            className="w-52 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          />

          {/* Segmentation config */}
          <Button variant="outline" onClick={() => setSegmentationOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Configurar Segmentación
          </Button>

          {/* New contact */}
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* ---- Table Card ---- */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-slate-400">
              <Loader2 className="h-12 w-12 mb-4 opacity-40 animate-spin" />
              <p className="text-lg font-medium">Cargando contactos...</p>
            </div>
          ) : paged.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-slate-400">
              <Users className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No hay contactos</p>
              <p className="text-sm mt-1">Crea tu primer contacto para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700">
                    <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Email</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Teléfono</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">WhatsApp</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Empresa</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Tags</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Asignado a</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {contact.name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {contact.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {contact.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {contact.whatsapp_number ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {contact.company_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={contact.is_active ? 'default' : 'secondary'}
                          className={cn(
                            contact.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
                          )}
                        >
                          {contact.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={tagBgStyle(tag.color)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {(!contact.tags || contact.tags.length === 0) && (
                            <span className="text-gray-400 dark:text-slate-500">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {contact.assigned_user?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(contact)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailContact(contact)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `https://wa.me/${contact.whatsapp_number?.replace(/\D/g, '')}`,
                                  '_blank',
                                )
                              }
                              disabled={!contact.whatsapp_number}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Enviar WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => setDeleteContact(contact)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Pagination ---- */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Página {page} de {totalPages} &middot; {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1 border-gray-200 dark:border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 border-gray-200 dark:border-slate-700"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Create / Edit Dialog ---- */}
      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditContact(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editContact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {editContact
                ? 'Modifica los datos del contacto.'
                : 'Completa los datos para crear un nuevo contacto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-slate-300">
                Nombre completo
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre y apellido"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* email */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-gray-700 dark:text-slate-300">
                Teléfono
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+57 300 000 0000"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* whatsapp_number */}
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_number" className="text-gray-700 dark:text-slate-300">
                WhatsApp
              </Label>
              <Input
                id="whatsapp_number"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="+573001234567"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* company_name */}
            <div className="grid gap-2">
              <Label htmlFor="company_name" className="text-gray-700 dark:text-slate-300">
                Empresa
              </Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Nombre de la empresa"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* birth_date */}
            <div className="grid gap-2">
              <Label htmlFor="birth_date" className="text-gray-700 dark:text-slate-300">
                Fecha de nacimiento
              </Label>
              <DatePicker
                value={form.birth_date}
                onChange={(v) => setForm({ ...form, birth_date: v })}
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                clearable
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditContact(null);
              }}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Detail Dialog ---- */}
      <Dialog open={detailContact !== null} onOpenChange={(open) => !open && setDetailContact(null)}>
        {detailContact && (
          <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                {detailContact.name}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-slate-400">
                Detalle del contacto
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Status badge */}
              <div>
                <Badge
                  className={cn(
                    detailContact.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
                  )}
                >
                  {detailContact.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Info rows */}
              <div className="grid gap-3 text-sm">
                <DetailRow icon={Mail} label="Email" value={detailContact.email} />
                <DetailRow icon={Phone} label="Teléfono" value={detailContact.phone} />
                <DetailRow icon={MessageCircle} label="WhatsApp" value={detailContact.whatsapp_number} />
                <DetailRow icon={Building2} label="Empresa" value={detailContact.company_name} />
                <DetailRow icon={Calendar} label="Nacimiento" value={detailContact.birth_date} />
                <DetailRow
                  icon={User}
                  label="Asignado a"
                  value={detailContact.assigned_user?.name ?? null}
                />
              </div>

              {/* Tags */}
              {detailContact.tags && detailContact.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detailContact.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" className="text-xs" style={tagBgStyle(tag.color)}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent leads */}
              {(detailContact.leads_count ?? 0) > 0 && (
                <div className="rounded-md border border-gray-200 dark:border-slate-700 p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Leads recientes
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {detailContact.leads_count} lead{detailContact.leads_count !== 1 ? 's' : ''} asociado
                    {detailContact.leads_count !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 dark:text-slate-500 space-y-1 pt-2 border-t border-gray-200 dark:border-slate-700">
                <p>Creado: {new Date(detailContact.created_at).toLocaleDateString('es-CO')}</p>
                <p>Actualizado: {new Date(detailContact.updated_at).toLocaleDateString('es-CO')}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailContact(null)} className="border-gray-200 dark:border-slate-700">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ---- Segmentation Config Modal ---- */}
      <Dialog open={segmentationOpen} onOpenChange={setSegmentationOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-white">
              <Settings className="h-5 w-5" />
              Configuración de Segmentación de Clientes
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              Define los parámetros para clasificar automáticamente tus contactos en segmentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current summary */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                  <Users className="h-4 w-4" />
                  Estado Actual de Segmentación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{segSummary.frequent}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Frecuentes</p>
                  </div>
                  <div className="text-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{segSummary.inactive}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inactivos</p>
                  </div>
                  <div className="text-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{segSummary.high_value}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Alto Valor</p>
                  </div>
                  <div className="text-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{segSummary.new_client}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nuevos</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                  Total de clientes: {segSummary.total}
                </p>
              </CardContent>
            </Card>

            {/* Classification parameters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Parámetros de Clasificación
              </div>

              {/* Frequent */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Cliente Frecuente
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={segConfig.frequent_days}
                    onChange={(e) => setSegConfig({ ...segConfig, frequent_days: parseInt(e.target.value) || 1 })}
                    className="max-w-[200px] bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">días desde la última compra</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Clientes que compraron en los últimos {segConfig.frequent_days} días
                </p>
              </div>

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* Inactive */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  Cliente Inactivo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={segConfig.inactive_days}
                    onChange={(e) => setSegConfig({ ...segConfig, inactive_days: parseInt(e.target.value) || 1 })}
                    className="max-w-[200px] bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">días sin compras</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Clientes que no han comprado en más de {segConfig.inactive_days} días
                </p>
              </div>

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* High Value */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  Cliente de Alto Valor
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={100000}
                    value={segConfig.high_value_threshold}
                    onChange={(e) => setSegConfig({ ...segConfig, high_value_threshold: parseFloat(e.target.value) || 0 })}
                    className="max-w-[200px] bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">COP</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Clientes con total facturado mayor a {formatCOP(segConfig.high_value_threshold)}
                </p>
              </div>

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* New Client */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Nuevo Cliente
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={segConfig.new_client_days}
                    onChange={(e) => setSegConfig({ ...segConfig, new_client_days: parseInt(e.target.value) || 1 })}
                    className="max-w-[200px] bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">días desde su primera compra</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Clientes cuya primera compra fue hace menos de {segConfig.new_client_days} días
                </p>
              </div>
            </div>

            {/* Auto-recalculation config */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                  Recalculación Automática
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configura si deseas que los segmentos se recalculen automáticamente
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer text-gray-700 dark:text-gray-300">
                    Activar recalculación automática
                  </Label>
                  <Switch
                    checked={segConfig.auto_recalculate}
                    onCheckedChange={(checked) => setSegConfig({ ...segConfig, auto_recalculate: checked })}
                  />
                </div>

                {segConfig.auto_recalculate && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Frecuencia</Label>
                    <Select
                      options={[
                        { value: 'daily', label: 'Diaria' },
                        { value: 'weekly', label: 'Semanal' },
                        { value: 'manual', label: 'Manual' },
                      ]}
                      value={segConfig.recalculate_frequency}
                      onChange={(v) => setSegConfig({ ...segConfig, recalculate_frequency: v })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calculation results */}
            {segResults && (
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">Segmentación completada exitosamente</p>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-0.5">
                    <li>Contactos procesados: {segResults.contacts_processed}</li>
                    <li>Clientes Frecuentes: {segResults.frequent_assigned}</li>
                    <li>Clientes Inactivos: {segResults.inactive_assigned}</li>
                    <li>Alto Valor: {segResults.high_value_assigned}</li>
                    <li>Nuevos Clientes: {segResults.new_client_assigned}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Los segmentos se calculan basándose en las facturas de venta vinculadas a cada contacto.
                Solo se consideran contactos que tengan un tercero asociado (clientes formales).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSegmentationOpen(false)}
              disabled={segSaving || segCalculating}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleSegSave}
              disabled={segSaving || segCalculating}
            >
              {segSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
            <Button
              onClick={handleSegCalculate}
              disabled={segSaving || segCalculating}
            >
              {segCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Aplicar Segmentación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={deleteContact !== null} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Eliminar contacto</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              ¿Estás seguro de que deseas eliminar a <strong>{deleteContact?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteContact(null)}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteContact) {
                  try {
                    await remove(deleteContact.id);
                    setDeleteContact(null);
                  } catch (error) {
                    console.error('Error deleting contact:', error);
                  }
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Small helper component for the detail dialog
// ---------------------------------------------------------------------------

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-gray-400 dark:text-slate-500 shrink-0" />
      <div>
        <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
        <p className="text-gray-900 dark:text-white">{value ?? '—'}</p>
      </div>
    </div>
  );
}
