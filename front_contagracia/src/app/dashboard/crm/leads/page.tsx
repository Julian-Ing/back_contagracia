'use client';

import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Clock,
  ArrowRightLeft,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Inbox,
  Eye,
  TrendingUp,
  UserPlus,
  MessageCircle,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  History,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Checkbox } from '@/shared/components/ui/checkbox';
import toast from 'react-hot-toast';
import type { CrmLead, LeadStage, LeadSource } from '@/modules/crm/types';
import { useLeads } from '@/modules/crm/hooks/useLeads';
import { useCampaigns } from '@/modules/crm/hooks/useCampaigns';
import { contactsService, leadsService } from '@/modules/crm/services/crm.service';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import ConvertLeadModal from '@/modules/crm/components/ConvertLeadModal';

// ---------------------------------------------------------------------------
// Stage / Source config
// ---------------------------------------------------------------------------

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
];

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'web', label: 'Web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referido' },
  { value: 'import', label: 'Importado' },
  { value: 'other', label: 'Otro' },
];

const stageBadgeClass: Record<LeadStage, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  qualified: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const stageLabel: Record<LeadStage, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  converted: 'Convertido',
  lost: 'Perdido',
};

const sourceLabel: Record<LeadSource, string> = {
  manual: 'Manual',
  web: 'Web',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  referral: 'Referido',
  import: 'Importado',
  form: 'Formulario',
  other: 'Otro',
};

const sourceBadgeClass: Record<LeadSource, string> = {
  manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  web: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  whatsapp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  referral: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  import: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  form: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};


// ---------------------------------------------------------------------------
// Form state type
// ---------------------------------------------------------------------------

interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  stage: LeadStage;
  campaignId: string;
  assignedTo: string;
  notes: string;
}

const EMPTY_LEAD_FORM: LeadFormData = {
  fullName: '',
  email: '',
  phone: '',
  company: '',
  source: 'manual',
  stage: 'new',
  campaignId: '',
  assignedTo: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeadsPage() {
  // API Hooks
  const companyId = useAuthStore((s) => s.company?.id);
  const { leads, loading, create, update, remove, convert, fetch: refetch } = useLeads();
  const { campaigns } = useCampaigns();

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [convertingLead, setConvertingLead] = useState<CrmLead | null>(null);

  // Lead form state
  const [form, setForm] = useState<LeadFormData>(EMPTY_LEAD_FORM);

  // Delete confirmation
  const [deletingLead, setDeletingLead] = useState<CrmLead | null>(null);

  // Import Excel state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importCampaignId, setImportCampaignId] = useState<string>('');
  const [importAssignTo, setImportAssignTo] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timeline state
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineLead, setTimelineLead] = useState<CrmLead | null>(null);

  // Grouped view state
  const [groupByContact, setGroupByContact] = useState(true);
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const byStage = (s: LeadStage) => leads.filter((l) => l.stage === s).length;
    return {
      total,
      new: byStage('new'),
      contacted: byStage('contacted'),
      qualified: byStage('qualified'),
      converted: byStage('converted'),
    };
  }, [leads]);

  // Filtered leads
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          (l.third_party?.name && l.third_party.name.toLowerCase().includes(q)) ||
          (l.third_party?.email && l.third_party.email.toLowerCase().includes(q)) ||
          (l.third_party?.phone && l.third_party.phone.includes(q)) ||
          (l.third_party?.company_name && l.third_party.company_name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (assignedFilter !== 'all' && l.assigned_user?.name !== assignedFilter) return false;
      if (campaignFilter !== 'all' && (l.campaign?.name ?? '') !== campaignFilter) return false;
      return true;
    });
  }, [leads, search, stageFilter, sourceFilter, assignedFilter, campaignFilter]);

  // Group leads by third_party (contact)
  const groupedLeads = useMemo(() => {
    const groups = new Map<string, { third_party: CrmLead['third_party']; leads: CrmLead[] }>();

    filtered.forEach((lead) => {
      const thirdPartyId = lead.third_party_id || lead.id; // fallback to lead.id if no third_party
      const existing = groups.get(thirdPartyId);

      if (existing) {
        existing.leads.push(lead);
      } else {
        groups.set(thirdPartyId, {
          third_party: lead.third_party,
          leads: [lead],
        });
      }
    });

    return Array.from(groups.entries()).map(([thirdPartyId, data]) => ({
      thirdPartyId,
      ...data,
    }));
  }, [filtered]);

  // Pagination for grouped view
  const totalGroupedPages = Math.max(1, Math.ceil(groupedLeads.length / perPage));
  const paginatedGroups = groupedLeads.slice((page - 1) * perPage, page * perPage);

  // Pagination for flat view
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Toggle contact expansion
  function toggleContactExpand(thirdPartyId: string) {
    setExpandedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(thirdPartyId)) {
        next.delete(thirdPartyId);
      } else {
        next.add(thirdPartyId);
      }
      return next;
    });
  }

  // Expand/collapse all
  function expandAll() {
    setExpandedContacts(new Set(groupedLeads.map((g) => g.thirdPartyId)));
  }

  function collapseAll() {
    setExpandedContacts(new Set());
  }

  // Selection helpers
  const allSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Dialog openers
  function openNewLead() {
    setEditingLead(null);
    setReadOnly(false);
    setForm(EMPTY_LEAD_FORM);
    setLeadDialogOpen(true);
  }

  function openEditLead(lead: CrmLead) {
    setEditingLead(lead);
    setReadOnly(false);
    setForm({
      fullName: lead.third_party?.name ?? '',
      email: lead.third_party?.email ?? '',
      phone: lead.third_party?.phone ?? '',
      company: lead.third_party?.company_name ?? '',
      source: lead.source,
      stage: lead.stage,
      campaignId: lead.campaign_id ?? '',
      assignedTo: lead.assigned_user?.name ?? '',
      notes: '',
    });
    setLeadDialogOpen(true);
  }

  function openViewLead(lead: CrmLead) {
    setEditingLead(lead);
    setReadOnly(true);
    setForm({
      fullName: lead.third_party?.name ?? '',
      email: lead.third_party?.email ?? '',
      phone: lead.third_party?.phone ?? '',
      company: lead.third_party?.company_name ?? '',
      source: lead.source,
      stage: lead.stage,
      campaignId: lead.campaign_id ?? '',
      assignedTo: lead.assigned_user?.name ?? '',
      notes: '',
    });
    setLeadDialogOpen(true);
  }

  function openConvert(lead: CrmLead) {
    setConvertingLead(lead);
    setConvertDialogOpen(true);
  }

  // Save handlers
  async function handleSaveLead() {
    if (!form.fullName.trim()) return;

    try {
      if (editingLead) {
        await update(editingLead.id, {
          source: form.source,
          stage: form.stage,
          campaign_id: form.campaignId || null,
        });
      } else {
        await create({
          third_party_id: '',
          source: form.source,
          stage: form.stage,
          campaign_id: form.campaignId || null,
        });
      }
      setLeadDialogOpen(false);
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingLead) return;
    try {
      await remove(deletingLead.id);
      setDeletingLead(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  }

  // Import Excel handlers
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      setImportError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    setImportFile(file);
    setImportError(null);
  }

  async function handleImportSubmit() {
    if (!importFile || !companyId || !importCampaignId) return;

    setImporting(true);
    setImportError(null);

    try {
      // Read the Excel file
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      if (rows.length === 0) {
        setImportError('El archivo no contiene datos');
        setImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: rows.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setImportProgress({ current: i + 1, total: rows.length });

        // Get values from row (handle different column name variations)
        const fullName = row.nombre_completo || row.nombre || row.full_name || row.name || '';
        const email = row.email || row.correo || row.Email || '';
        const phone = row.telefono || row.phone || row.celular || row.Phone || '';
        const company = row.empresa || row.company || row.company_name || '';
        const notes = row.notas || row.notes || row.observaciones || '';

        // Validate required fields
        if (!fullName.trim()) {
          errorCount++;
          continue;
        }
        if (!email.trim() && !phone.trim()) {
          errorCount++;
          continue;
        }

        try {
          const trimmedEmail = email.trim() || null;
          const trimmedPhone = phone.trim() || null;

          // 1. Search for existing contact by email or phone
          let contactId: string | null = null;

          if (trimmedEmail || trimmedPhone) {
            // Get all contacts and filter for exact match
            const existingContacts = await contactsService.getAll(companyId, {
              search: trimmedEmail || trimmedPhone
            });
            const contactsList = Array.isArray(existingContacts)
              ? existingContacts
              : existingContacts.data ?? [];

            // Find exact match by email or phone
            const existingContact = contactsList.find((c: any) =>
              (trimmedEmail && c.email?.toLowerCase() === trimmedEmail.toLowerCase()) ||
              (trimmedPhone && c.phone === trimmedPhone)
            );

            if (existingContact) {
              // Update existing contact with new data
              await contactsService.update(companyId, existingContact.id, {
                name: fullName.trim() || existingContact.name,
                email: trimmedEmail || existingContact.email,
                phone: trimmedPhone || existingContact.phone,
                company_name: company.trim() || existingContact.company_name,
                notes: notes.trim() || existingContact.notes,
              });
              contactId = existingContact.id;
            }
          }

          // 2. If no existing contact, create new one
          if (!contactId) {
            const contactData = {
              name: fullName.trim(),
              email: trimmedEmail,
              phone: trimmedPhone,
              company_name: company.trim() || null,
              notes: notes.trim() || null,
            };
            const newContact = await contactsService.create(companyId, contactData);
            contactId = newContact.id;
          }

          // 3. Create the lead linked to the third_party (contact)
          const leadData = {
            third_party_id: contactId,
            source: 'FORM',
            stage: 'NEW',
            campaign_id: importCampaignId,
            assigned_to: importAssignTo || undefined,
          };

          await leadsService.create(companyId, leadData);
          successCount++;
        } catch (err: any) {
          console.error('Error importing row:', row, err);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`${successCount} lead(s) importado(s) exitosamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} fila(s) no pudieron importarse`);
      }

      // Refresh leads list
      await refetch();

      // Close dialog
      setImportDialogOpen(false);
      resetImport();
    } catch (err: any) {
      console.error('Error reading Excel file:', err);
      setImportError(err.message || 'Error al leer el archivo Excel');
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  }

  function resetImport() {
    setImportFile(null);
    setImportError(null);
    setImportCampaignId('');
    setImportAssignTo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    if (!importCampaignId) {
      setImportError('Primero selecciona una campaña');
      return;
    }

    const selectedCampaign = campaigns.find((c) => c.id === importCampaignId);
    const campaignName = selectedCampaign?.name || 'Sin nombre';

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Create data with headers and example row
    const data = [
      ['nombre_completo', 'email', 'telefono', 'empresa', 'notas'],
      ['Juan Pérez', 'juan@ejemplo.com', '3001234567', 'Empresa S.A.', 'Lead de ejemplo'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // nombre_completo
      { wch: 30 }, // email
      { wch: 15 }, // telefono
      { wch: 25 }, // empresa
      { wch: 40 }, // notas
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Generate filename
    const fileName = `plantilla_leads_${campaignName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  }

  // Timeline handler
  function openTimeline(lead: CrmLead) {
    setTimelineLead(lead);
    setTimelineDialogOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona y da seguimiento a tus leads de marketing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openNewLead}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Nuevos</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.new}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Contactados</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.contacted}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Calificados</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.qualified}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Convertidos</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.converted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Buscar por nombre, email, telefono o empresa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Etapa</Label>
                <Select
                  options={[{ value: 'all', label: 'Todas las etapas' }, ...STAGE_OPTIONS]}
                  value={stageFilter}
                  onChange={(v) => { setStageFilter(v); setPage(1); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Fuente</Label>
                <Select
                  options={[{ value: 'all', label: 'Todas las fuentes' }, ...SOURCE_OPTIONS]}
                  value={sourceFilter}
                  onChange={(v) => { setSourceFilter(v); setPage(1); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Asignado a</Label>
                <Input
                  placeholder="Filtrar por asignado..."
                  value={assignedFilter === 'all' ? '' : assignedFilter}
                  onChange={(e) => { setAssignedFilter(e.target.value || 'all'); setPage(1); }}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Campaña</Label>
                <Input
                  placeholder="Filtrar por campaña..."
                  value={campaignFilter === 'all' ? '' : campaignFilter}
                  onChange={(e) => { setCampaignFilter(e.target.value || 'all'); setPage(1); }}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStageFilter('all'); setSourceFilter('all'); setAssignedFilter('all'); setCampaignFilter('all'); setSearch(''); }}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View toggle and group controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={groupByContact ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupByContact(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Por Contacto
          </Button>
          <Button
            variant={!groupByContact ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupByContact(false)}
          >
            Lista Plana
          </Button>
        </div>
        {groupByContact && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-gray-600 dark:text-gray-400">
              Expandir todos
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-gray-600 dark:text-gray-400">
              Colapsar todos
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button size="sm" variant="outline" className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300">
            <Users className="mr-2 h-3.5 w-3.5" />
            Asignar
          </Button>
          <Button size="sm" variant="outline" className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300">
            <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
            Cambiar Etapa
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400 dark:text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
              <p className="text-lg font-medium">Cargando leads...</p>
            </div>
          ) : (groupByContact ? paginatedGroups.length : paginated.length) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400 dark:text-gray-500">
              <Inbox className="h-12 w-12" />
              <p className="text-lg font-medium">No se encontraron leads</p>
              <p className="text-sm">Ajusta los filtros o crea un nuevo lead.</p>
              <Button onClick={openNewLead} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Lead
              </Button>
            </div>
          ) : groupByContact ? (
            /* Grouped by Contact View */
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {/* Header Row */}
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                <div className="w-6" /> {/* Expand arrow space */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contacto
                  </span>
                </div>
                <div className="hidden lg:grid lg:grid-cols-5 lg:gap-4 lg:flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span>Etapa</span>
                  <span>Fuente</span>
                  <span>Campaña</span>
                  <span>Asignado</span>
                  <span>Fecha</span>
                </div>
                <div className="w-8" /> {/* Actions space */}
              </div>
              {paginatedGroups.map((group) => {
                const isExpanded = expandedContacts.has(group.thirdPartyId);
                const hasMultipleLeads = group.leads.length > 1;

                return (
                  <div key={group.thirdPartyId}>
                    {/* Contact Header Row */}
                    <div
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30',
                        isExpanded && 'bg-gray-50/50 dark:bg-slate-700/20'
                      )}
                      onClick={() => toggleContactExpand(group.thirdPartyId)}
                    >
                      <div className="w-6 flex justify-center">
                        {hasMultipleLeads && (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-gray-400 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {group.third_party?.name ?? 'Sin nombre'}
                          </span>
                          {hasMultipleLeads && (
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {group.leads.length} leads
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {group.third_party?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {group.third_party.email}
                            </span>
                          )}
                          {group.third_party?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {group.third_party.phone}
                            </span>
                          )}
                          {group.third_party?.company_name && (
                            <span className="text-gray-400 dark:text-gray-500">
                              {group.third_party.company_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Show summary badges when collapsed */}
                      {!isExpanded && (
                        <div className="flex items-center gap-2">
                          {group.leads.slice(0, 3).map((lead) => (
                            <Badge key={lead.id} variant="secondary" className={cn('text-xs', stageBadgeClass[lead.stage])}>
                              {stageLabel[lead.stage]}
                            </Badge>
                          ))}
                          {group.leads.length > 3 && (
                            <span className="text-xs text-gray-400">+{group.leads.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Leads */}
                    {(isExpanded || !hasMultipleLeads) && (
                      <div className={cn(hasMultipleLeads && 'bg-gray-50/30 dark:bg-slate-800/30')}>
                        {group.leads.map((lead) => (
                          <div
                            key={lead.id}
                            className={cn(
                              'flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-slate-700/50 hover:bg-gray-100/50 dark:hover:bg-slate-700/30',
                              hasMultipleLeads && 'ml-10'
                            )}
                          >
                            <Checkbox
                              checked={selectedIds.has(lead.id)}
                              onCheckedChange={() => toggleOne(lead.id)}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                              <Badge variant="secondary" className={cn('text-xs w-fit', stageBadgeClass[lead.stage])}>
                                {stageLabel[lead.stage]}
                              </Badge>
                              <Badge variant="secondary" className={cn('text-xs w-fit', sourceBadgeClass[lead.source])}>
                                {sourceLabel[lead.source]}
                              </Badge>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {lead.campaign?.name ?? '—'}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {lead.assigned_user?.name ?? '—'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(lead.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 dark:text-gray-400">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <DropdownMenuItem onClick={() => openViewLead(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                                  <Eye className="h-4 w-4" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditLead(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openTimeline(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                                  <Clock className="h-4 w-4" />
                                  Ver Timeline
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openConvert(lead)}
                                  disabled={lead.stage === 'converted'}
                                  className="gap-2 text-gray-700 dark:text-gray-300"
                                >
                                  <TrendingUp className="h-4 w-4" />
                                  Convertir a Oportunidad
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingLead(lead)} className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat List View */
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="w-10 text-gray-500 dark:text-gray-400">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Contacto</TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Etapa</TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Fuente</TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Campaña</TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Asignado a</TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">Fecha</TableHead>
                  <TableHead className="w-10 text-gray-500 dark:text-gray-400" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((lead) => (
                  <TableRow key={lead.id} className="border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <TableCell>
                      <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{lead.third_party?.name ?? '—'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.third_party?.email ?? lead.third_party?.phone ?? '—'}
                        </span>
                        {lead.third_party?.company_name && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{lead.third_party.company_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', stageBadgeClass[lead.stage])}>
                        {stageLabel[lead.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', sourceBadgeClass[lead.source])}>
                        {sourceLabel[lead.source]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{lead.campaign?.name ?? '—'}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 text-sm">{lead.assigned_user?.name ?? '—'}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(lead.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 dark:text-gray-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <DropdownMenuItem onClick={() => openViewLead(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                            <Eye className="h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditLead(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openTimeline(lead)} className="gap-2 text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4" />
                            Ver Timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openConvert(lead)}
                            disabled={lead.stage === 'converted'}
                            className="gap-2 text-gray-700 dark:text-gray-300"
                          >
                            <TrendingUp className="h-4 w-4" />
                            Convertir a Oportunidad
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingLead(lead)} className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600">
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(groupByContact ? groupedLeads.length : filtered.length) > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {groupByContact ? (
              <>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, groupedLeads.length)} de {groupedLeads.length} contactos ({filtered.length} leads)</>
            ) : (
              <>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} de {filtered.length} leads</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {page} / {groupByContact ? totalGroupedPages : totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (groupByContact ? totalGroupedPages : totalPages)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dialog: Create / Edit / View Lead                                   */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {readOnly ? 'Detalles del Lead' : editingLead ? 'Editar Lead' : 'Nuevo Lead'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {readOnly
                ? 'Informacion del lead y contacto.'
                : editingLead
                  ? 'Modifica la informacion del lead.'
                  : 'Completa los datos para crear un nuevo lead.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Nombre Completo *</Label>
              <Input
                placeholder="Nombre del contacto"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                disabled={readOnly}
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={readOnly}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Telefono</Label>
                <Input
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={readOnly}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Empresa</Label>
              <Input
                placeholder="Nombre de la empresa"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                disabled={readOnly}
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>

            {/* Source + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Fuente</Label>
                <Select
                  options={SOURCE_OPTIONS}
                  value={form.source}
                  onChange={(v) => setForm((f) => ({ ...f, source: v as LeadSource }))}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Etapa</Label>
                <Select
                  options={STAGE_OPTIONS}
                  value={form.stage}
                  onChange={(v) => setForm((f) => ({ ...f, stage: v as LeadStage }))}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Campaign */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Campaña</Label>
              <Select
                options={[
                  { value: '', label: 'Sin campaña' },
                  ...campaigns.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={form.campaignId}
                onChange={(v) => setForm((f) => ({ ...f, campaignId: v }))}
                disabled={readOnly}
                placeholder="Selecciona una campaña"
              />
            </div>

            {/* Assigned to */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Asignado a</Label>
              <Input
                placeholder="Nombre del responsable"
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                disabled={readOnly}
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Notas</Label>
              <Textarea
                placeholder="Observaciones sobre el lead..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                disabled={readOnly}
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {readOnly ? (
              <Button onClick={() => setLeadDialogOpen(false)}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setLeadDialogOpen(false)} className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300">
                  Cancelar
                </Button>
                <Button onClick={handleSaveLead} disabled={!form.fullName.trim()}>
                  {editingLead ? 'Guardar cambios' : 'Crear Lead'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog: Convert to Opportunity                                      */}
      {/* ------------------------------------------------------------------ */}
      <ConvertLeadModal
        open={convertDialogOpen}
        onOpenChange={(open) => {
          setConvertDialogOpen(open);
          if (!open) setConvertingLead(null);
        }}
        lead={convertingLead}
        onSuccess={refetch}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Dialog: Delete Confirmation                                         */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!deletingLead} onOpenChange={(open) => !open && setDeletingLead(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Eliminar Lead</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              ¿Estás seguro de que deseas eliminar el lead de{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {deletingLead?.third_party?.name ?? 'este contacto'}
              </span>
              ? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingLead(null)}
              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog: Import from Excel                                           */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) resetImport(); }}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Importar Leads desde Excel
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Sube un archivo Excel o CSV con tus leads
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info box */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <FileSpreadsheet className="h-5 w-5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                El archivo Excel debe contener al menos: <span className="font-semibold">nombre_completo</span> y{' '}
                <span className="font-semibold">(email o telefono)</span>. Si el email/teléfono ya existe, se actualizará el contacto.
              </p>
            </div>

            {/* Campaign selector */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Asignar a campaña *</Label>
              <Select
                options={[
                  { value: '', label: 'Selecciona una campaña' },
                  ...campaigns.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={importCampaignId}
                onChange={(v) => { setImportCampaignId(v); setImportError(null); }}
                placeholder="Selecciona una campaña"
                disabled={importing}
              />
            </div>

            {/* Director filter - placeholder for when employees exist */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Filtrar por Director</Label>
              <Select
                options={[{ value: '', label: 'Todos los directores' }]}
                value=""
                onChange={() => {}}
                disabled
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">Filtra los asesores por director (opcional)</p>
            </div>

            {/* Assign to advisor */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Asignar a asesor *</Label>
              <Select
                options={[{ value: '', label: 'Sin asignar' }]}
                value={importAssignTo}
                onChange={setImportAssignTo}
                disabled
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">Disponible cuando hayan empleados configurados</p>
            </div>

            {/* Download template button */}
            <Button
              variant="outline"
              className="w-full border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
              onClick={downloadTemplate}
              disabled={!importCampaignId || importing}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Descargar Plantilla Excel
            </Button>

            {/* File input */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Seleccionar archivo Excel</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={!importCampaignId || importing}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                />
              </div>
            </div>

            {/* Error/validation message */}
            {!importCampaignId && !importing && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Primero selecciona una campaña
              </p>
            )}
            {importError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
              </div>
            )}

            {/* Import progress */}
            {importing && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Importando...</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setImportDialogOpen(false); resetImport(); }}
              className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300"
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={!importFile || !importCampaignId || importing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {importing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog: Timeline / History                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Timeline del Lead
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Historial de actividades y cambios de{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {timelineLead?.third_party?.name ?? 'este lead'}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Lead Info Summary */}
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {timelineLead?.third_party?.name ?? 'Sin nombre'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {timelineLead?.third_party?.email ?? timelineLead?.third_party?.phone ?? 'Sin contacto'}
                  </p>
                </div>
                <Badge variant="secondary" className={cn('ml-auto text-xs', stageBadgeClass[timelineLead?.stage ?? 'new'])}>
                  {stageLabel[timelineLead?.stage ?? 'new']}
                </Badge>
              </div>
            </div>

            {/* Timeline Items - Placeholder */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

              {/* Created event */}
              <div className="relative flex gap-4 pb-6">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center z-10">
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Lead creado</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {timelineLead?.created_at
                      ? new Date(timelineLead.created_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Fuente: {sourceLabel[timelineLead?.source ?? 'manual']}
                    {timelineLead?.campaign?.name && ` • Campaña: ${timelineLead.campaign.name}`}
                  </p>
                </div>
              </div>

              {/* Placeholder for activities */}
              <div className="relative flex gap-4 pb-6">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center z-10">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1 p-3 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/30">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Las actividades se mostrarán aquí cuando el módulo de Actividades esté integrado.
                  </p>
                </div>
              </div>

              {/* Stage change placeholder */}
              <div className="relative flex gap-4">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center z-10">
                  <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Etapa actual</p>
                  <Badge variant="secondary" className={cn('mt-1 text-xs', stageBadgeClass[timelineLead?.stage ?? 'new'])}>
                    {stageLabel[timelineLead?.stage ?? 'new']}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTimelineDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
