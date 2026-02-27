'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
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
import {
  Megaphone,
  Mail,
  Share2,
  MessageCircle,
  Globe,
  User,
  Plus,
  MoreHorizontal,
  Pencil,
  Users,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Clock,
  BarChart3,
  Target,
  Award,
  Download,
  Calendar,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { CrmCampaign, CampaignChannel, CampaignStatus } from '@/modules/crm/types';
import { useCampaigns } from '@/modules/crm/hooks/useCampaigns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNEL_CONFIG: Record<CampaignChannel, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  social: { label: 'Social', icon: Share2, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  ads: { label: 'Ads', icon: Megaphone, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  web: { label: 'Web', icon: Globe, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  manual: { label: 'Manual', icon: User, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300' },
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  finished: { label: 'Finalizada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400' },
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miercoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

const TIMEZONE_OPTIONS = [
  { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Mexico (GMT-6)' },
  { value: 'America/Lima', label: 'Peru (GMT-5)' },
  { value: 'America/Santiago', label: 'Chile (GMT-4)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (GMT-3)' },
  { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (GMT-8)' },
  { value: 'Europe/Madrid', label: 'España (GMT+1)' },
  { value: 'UTC', label: 'UTC' },
];

function formatCOP(value: number | null | undefined): string {
  if (value == null) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  // Format with thousand separators (dots for es-CO)
  return '$' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DaySchedule {
  enabled: boolean;
  start: string | null;
  end: string | null;
}

interface BusinessHours {
  timezone: string;
  schedule: Record<string, DaySchedule>;
}

interface CampaignFormData {
  name: string;
  description: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget: string;
  start_date: string;
  end_date: string;
}

// Extended campaign with extra fields
interface CampaignExt extends CrmCampaign {
  business_hours?: BusinessHours | null;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  timezone: 'America/Bogota',
  schedule: {
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: null, end: null },
    sunday: { enabled: false, start: null, end: null },
  },
};

// Mock report data per campaign
const MOCK_REPORT = {
  leadsMetrics: { total: 124, new: 32, contacted: 45, qualified: 28, converted: 15, lost: 4 },
  financial: { presupuesto: 5_000_000, ingresos: 18_500_000, utilidad: 13_500_000, roi: 270, costPerLead: 40_322, costPerConversion: 333_333 },
  opportunitiesMetrics: { total: 45, open: 18, won: 15, lost: 12, totalAmount: 32_000_000, wonAmount: 18_500_000 },
  conversion: { leadToOpportunity: 36.3, opportunityToWin: 33.3, leadToRevenue: 12.1 },
  funnelData: [
    { stage: 'Leads Captados', count: 124, percentage: 100 },
    { stage: 'Contactados', count: 89, percentage: 71.8 },
    { stage: 'Calificados', count: 45, percentage: 36.3 },
    { stage: 'Oportunidad Creada', count: 28, percentage: 22.6 },
    { stage: 'Ganada / Facturada', count: 15, percentage: 12.1 },
  ],
};

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM: CampaignFormData = {
  name: '',
  description: '',
  channel: 'email',
  status: 'active',
  budget: '',
  start_date: '',
  end_date: '',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CrmCampaignsPage() {
  const { campaigns: apiCampaigns, loading, create, update, remove } = useCampaigns();
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all');
  const [filterChannel, setFilterChannel] = useState<CampaignChannel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [form, setForm] = useState<CampaignFormData>(EMPTY_FORM);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [modalTab, setModalTab] = useState('general');

  // Reports tab
  const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<CrmCampaign | null>(null);
  const [reportViewMode, setReportViewMode] = useState('overview');

  // Filtered list
  const filtered = useMemo(() => {
    return (apiCampaigns || []).filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterChannel !== 'all' && c.channel !== filterChannel) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [apiCampaigns, filterStatus, filterChannel, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const totalCampaigns = (apiCampaigns || []).length;
  const activeCampaigns = (apiCampaigns || []).filter((c) => c.status === 'active').length;
  const totalBudget = (apiCampaigns || []).reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const totalLeads = (apiCampaigns || []).reduce((sum, c) => sum + (c.leads_count ?? 0), 0);

  // Handlers
  function openCreate() {
    setEditingId(null);
    setReadOnly(false);
    setForm(EMPTY_FORM);
    setBusinessHours(DEFAULT_BUSINESS_HOURS);
    setModalTab('general');
    setDialogOpen(true);
  }

  // Helper to format ISO date to YYYY-MM-DD for input[type=date]
  function toDateInputValue(dateStr: string | null): string {
    if (!dateStr) return '';
    // Handle ISO dates like "2026-01-15T00:00:00.000Z"
    return dateStr.split('T')[0];
  }

  function openEdit(campaign: CrmCampaign) {
    setEditingId(campaign.id);
    setReadOnly(false);
    setForm({
      name: campaign.name,
      description: campaign.description ?? '',
      channel: campaign.channel,
      status: campaign.status,
      budget: campaign.budget?.toString() ?? '',
      start_date: toDateInputValue(campaign.start_date),
      end_date: toDateInputValue(campaign.end_date),
    });
    setBusinessHours((campaign as any).business_hours ?? DEFAULT_BUSINESS_HOURS);
    setModalTab('general');
    setDialogOpen(true);
  }

  function openDetails(campaign: CrmCampaign) {
    setEditingId(campaign.id);
    setReadOnly(true);
    setForm({
      name: campaign.name,
      description: campaign.description ?? '',
      channel: campaign.channel,
      status: campaign.status,
      budget: campaign.budget?.toString() ?? '',
      start_date: toDateInputValue(campaign.start_date),
      end_date: toDateInputValue(campaign.end_date),
    });
    setBusinessHours((campaign as any).business_hours ?? DEFAULT_BUSINESS_HOURS);
    setModalTab('general');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        channel: form.channel,
        status: form.status,
        budget: form.budget ? Number(form.budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload as any);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  }

  function updateDaySchedule(day: string, patch: Partial<DaySchedule>) {
    setBusinessHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], ...patch },
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Loading state
  if (loading) {
    return (
      <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Cargando campañas...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Campañas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus campañas de marketing y seguimiento
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Campañas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCampaigns}</p>
              </div>
              <Megaphone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{activeCampaigns}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Leads Generados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalLeads}</p>
              </div>
              <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Presupuesto Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCOP(totalBudget)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Campañas + Reportes */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reportes Avanzados
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB: CAMPAÑAS ==================== */}
        <TabsContent value="campaigns" className="mt-6 space-y-4">
          {/* Search + Filters */}
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">Lista de Campañas</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Buscar campañas..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-9 w-64 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
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
              </div>

              {/* Collapsible filters */}
              {showFilters && (
                <div className="mt-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Estado</Label>
                      <Select
                        options={[
                          { value: 'all', label: 'Todos' },
                          { value: 'active', label: 'Activa' },
                          { value: 'paused', label: 'Pausada' },
                          { value: 'finished', label: 'Finalizada' },
                        ]}
                        value={filterStatus}
                        onChange={(v) => { setFilterStatus(v as CampaignStatus | 'all'); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Canal</Label>
                      <Select
                        options={[
                          { value: 'all', label: 'Todos' },
                          { value: 'email', label: 'Email' },
                          { value: 'social', label: 'Social' },
                          { value: 'ads', label: 'Ads' },
                          { value: 'whatsapp', label: 'WhatsApp' },
                          { value: 'web', label: 'Web' },
                          { value: 'manual', label: 'Manual' },
                        ]}
                        value={filterChannel}
                        onChange={(v) => { setFilterChannel(v as CampaignChannel | 'all'); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        onClick={() => { setFilterStatus('all'); setFilterChannel('all'); setSearchTerm(''); }}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        Limpiar filtros
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                  <Megaphone className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">No hay campañas</p>
                  <p className="text-sm mt-1">Crea tu primera campaña para comenzar.</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nueva Campaña
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-600 dark:text-gray-400">Nombre</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400">Canal</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400">Fechas</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400 text-right">Presupuesto</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400 text-right">Leads</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400">Estado</TableHead>
                        <TableHead className="text-gray-600 dark:text-gray-400 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((campaign) => {
                        const ch = CHANNEL_CONFIG[campaign.channel];
                        const st = STATUS_CONFIG[campaign.status];
                        const ChannelIcon = ch.icon;

                        return (
                          <TableRow key={campaign.id} className="border-gray-100 dark:border-slate-700/50">
                            <TableCell className="font-medium text-gray-900 dark:text-white">
                              {campaign.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('gap-1', ch.color)}>
                                <ChannelIcon className="h-3 w-3" />
                                {ch.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">
                              {formatCOP(campaign.budget)}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">
                              {campaign.leads_count ?? 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={st.color}>
                                {st.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                  <DropdownMenuItem onClick={() => openDetails(campaign)} className="gap-2 text-gray-700 dark:text-gray-300">
                                    <Eye className="h-4 w-4" />
                                    Ver Detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(campaign)} className="gap-2 text-gray-700 dark:text-gray-300">
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(campaign)} className="gap-2 text-gray-700 dark:text-gray-300">
                                    <Clock className="h-4 w-4" />
                                    Configurar Horarios
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(campaign.id)}
                                    className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                      {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB: REPORTES AVANZADOS ==================== */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Reportes Avanzados por Campaña</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Selecciona una campaña para ver analisis detallado de ROI, conversion y embudo de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCampaignForReport ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Elige una campaña de la lista para generar su reporte avanzado:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(apiCampaigns || []).map((campaign) => {
                      const ch = CHANNEL_CONFIG[campaign.channel];
                      const st = STATUS_CONFIG[campaign.status];
                      return (
                        <Card
                          key={campaign.id}
                          className="cursor-pointer border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          onClick={() => setSelectedCampaignForReport(campaign)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-gray-900 dark:text-white">{campaign.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={st.color}>{st.label}</Badge>
                              <Badge variant="secondary" className={ch.color}>{ch.label}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Presupuesto:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCOP(campaign.budget)}</span>
                              </div>
                              {campaign.start_date && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                                  <span className="text-xs text-gray-700 dark:text-gray-300">
                                    {formatDate(campaign.start_date)}
                                    {campaign.end_date && ` - ${formatDate(campaign.end_date)}`}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Leads:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{campaign.leads_count ?? 0}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Report header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="h-5 w-5" />
                        {selectedCampaignForReport.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Analisis de rendimiento, conversion y ROI
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        options={[
                          { value: 'overview', label: 'Resumen General' },
                          { value: 'conversion', label: 'Tasas de Conversion' },
                          { value: 'funnel', label: 'Embudo de Ventas' },
                        ]}
                        value={reportViewMode}
                        onChange={setReportViewMode}
                        className="w-[200px]"
                      />
                      <Button variant="outline" size="icon" title="Exportar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedCampaignForReport(null)}>
                        Cambiar Campaña
                      </Button>
                    </div>
                  </div>

                  {/* Overview */}
                  {reportViewMode === 'overview' && (
                    <>
                      {/* Main metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_REPORT.leadsMetrics.total}</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{MOCK_REPORT.leadsMetrics.converted} convertidos</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Presupuesto</CardTitle>
                            <DollarSign className="h-4 w-4 text-gray-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(MOCK_REPORT.financial.presupuesto)}</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCOP(MOCK_REPORT.financial.costPerLead)} por lead</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(MOCK_REPORT.financial.ingresos)}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600">{MOCK_REPORT.financial.roi}% ROI</span>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasa Conversion</CardTitle>
                            <Target className="h-4 w-4 text-purple-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_REPORT.conversion.leadToRevenue}%</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leads a ingresos</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* ROI + Cost cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className={cn('bg-white dark:bg-slate-800/50', MOCK_REPORT.financial.roi >= 0 ? 'border-green-300 dark:border-green-800' : 'border-red-300 dark:border-red-800')}>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Award className="h-4 w-4" />
                              ROI de la Campaña
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={cn('text-3xl font-bold', MOCK_REPORT.financial.roi >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {MOCK_REPORT.financial.roi}%
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Utilidad: {formatCOP(MOCK_REPORT.financial.utilidad)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Costo por Lead</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCOP(MOCK_REPORT.financial.costPerLead)}</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Presupuesto / Total Leads</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Costo por Conversion</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCOP(MOCK_REPORT.financial.costPerConversion)}</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Presupuesto / Leads Convertidos</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Opportunities + Lead stages */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Oportunidades</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {[
                                { label: 'Total', value: MOCK_REPORT.opportunitiesMetrics.total },
                                { label: 'Abiertas', value: MOCK_REPORT.opportunitiesMetrics.open, badge: 'outline' as const },
                                { label: 'Ganadas', value: MOCK_REPORT.opportunitiesMetrics.won, badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                                { label: 'Perdidas', value: MOCK_REPORT.opportunitiesMetrics.lost, badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                              ].map((item) => (
                                <div key={item.label} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}:</span>
                                  <Badge variant={item.badge || 'secondary'} className={item.badgeClass}>{item.value}</Badge>
                                </div>
                              ))}
                              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Valor Total:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{formatCOP(MOCK_REPORT.opportunitiesMetrics.totalAmount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Etapas de Leads</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {[
                                { label: 'Nuevos', value: MOCK_REPORT.leadsMetrics.new, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                                { label: 'Contactados', value: MOCK_REPORT.leadsMetrics.contacted, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                                { label: 'Calificados', value: MOCK_REPORT.leadsMetrics.qualified, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
                                { label: 'Convertidos', value: MOCK_REPORT.leadsMetrics.converted, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                                { label: 'Perdidos', value: MOCK_REPORT.leadsMetrics.lost, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                              ].map((item) => (
                                <div key={item.label} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}:</span>
                                  <Badge variant="secondary" className={item.color}>{item.value}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Conversion rates */}
                  {reportViewMode === 'conversion' && (
                    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">Tasas de Conversion</CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">Porcentaje de avance en cada etapa del proceso</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {[
                            { label: 'Lead → Oportunidad', value: MOCK_REPORT.conversion.leadToOpportunity },
                            { label: 'Oportunidad → Ganada', value: MOCK_REPORT.conversion.opportunityToWin },
                            { label: 'Lead → Ingreso', value: MOCK_REPORT.conversion.leadToRevenue },
                          ].map((item) => (
                            <div key={item.label} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                                <div
                                  className="bg-green-500 h-4 rounded-full transition-all flex items-center justify-end px-2"
                                  style={{ width: `${Math.min(item.value, 100)}%` }}
                                >
                                  {item.value > 15 && (
                                    <span className="text-white text-xs font-semibold">{item.value}%</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Funnel */}
                  {reportViewMode === 'funnel' && (
                    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">Embudo de Conversion</CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">Evolucion desde lead hasta factura</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {MOCK_REPORT.funnelData.map((stage, index) => {
                            const prevStage = index > 0 ? MOCK_REPORT.funnelData[index - 1] : null;
                            const dropoff = prevStage ? ((prevStage.count - stage.count) / prevStage.count * 100) : 0;
                            const isLast = index === MOCK_REPORT.funnelData.length - 1;

                            return (
                              <div key={stage.stage}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{stage.stage}</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{stage.count} registros</span>
                                    <Badge variant="outline" className="text-gray-700 dark:text-gray-300">{stage.percentage.toFixed(1)}%</Badge>
                                    {!isLast && dropoff > 0 && (
                                      <span className="text-xs text-red-600 dark:text-red-400">↓ {dropoff.toFixed(1)}%</span>
                                    )}
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-8">
                                  <div
                                    className="bg-blue-600 dark:bg-blue-500 h-8 rounded-full flex items-center justify-end px-3 transition-all"
                                    style={{ width: `${stage.percentage}%` }}
                                  >
                                    {stage.percentage > 15 && (
                                      <span className="text-white text-xs font-semibold">{stage.count}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== CREATE / EDIT / DETAILS DIALOG ==================== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {readOnly ? 'Detalles de Campaña' : editingId ? 'Editar Campaña' : 'Nueva Campaña'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {readOnly
                ? 'Informacion detallada de la campaña.'
                : editingId
                  ? 'Modifica los datos de la campaña.'
                  : 'Completa los datos para crear una nueva campaña de marketing.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Informacion General</TabsTrigger>
              <TabsTrigger value="schedule">Horarios de Atencion</TabsTrigger>
            </TabsList>

            {/* Tab: General */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Nombre de la Campaña *</Label>
                <Input
                  placeholder="Ej: Campaña Black Friday 2026"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={readOnly}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Descripcion</Label>
                <Textarea
                  placeholder="Describe los objetivos de la campaña..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  disabled={readOnly}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* Channel + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Canal</Label>
                  <Select
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'social', label: 'Social' },
                      { value: 'ads', label: 'Ads' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'web', label: 'Web' },
                      { value: 'manual', label: 'Manual' },
                    ]}
                    value={form.channel}
                    onChange={(v) => setForm((f) => ({ ...f, channel: v as CampaignChannel }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Estado</Label>
                  <Select
                    options={[
                      { value: 'active', label: 'Activa' },
                      { value: 'paused', label: 'Pausada' },
                      { value: 'finished', label: 'Finalizada' },
                    ]}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Fecha de Inicio</Label>
                  <DatePicker
                    value={form.start_date}
                    onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
                    disabled={readOnly}
                    className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Fecha de Fin</Label>
                  <DatePicker
                    value={form.end_date}
                    onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
                    disabled={readOnly}
                    className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Presupuesto (COP)</Label>
                <NumericInput
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  disabled={readOnly}
                  allowNegative={false}
                  maxDecimals={0}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
            </TabsContent>

            {/* Tab: Schedule / Business Hours */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Zona Horaria</Label>
                <Select
                  options={TIMEZONE_OPTIONS}
                  value={businessHours.timezone}
                  onChange={(v) => setBusinessHours((prev) => ({ ...prev, timezone: v }))}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-gray-700 dark:text-gray-300 text-base font-semibold">Dias de atencion</Label>
                {DAYS_OF_WEEK.map((day) => {
                  const sched = businessHours.schedule[day.key] || { enabled: false, start: null, end: null };
                  return (
                    <div key={day.key} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                      <div className="flex items-center gap-2 w-32">
                        <Switch
                          checked={sched.enabled}
                          onCheckedChange={(v) => updateDaySchedule(day.key, {
                            enabled: v,
                            start: v ? (sched.start || '08:00') : null,
                            end: v ? (sched.end || '18:00') : null,
                          })}
                          disabled={readOnly}
                        />
                        <span className={cn('text-sm font-medium', sched.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500')}>
                          {day.label}
                        </span>
                      </div>
                      {sched.enabled ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={sched.start || '08:00'}
                            onChange={(e) => updateDaySchedule(day.key, { start: e.target.value })}
                            disabled={readOnly}
                            className="w-32 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                          />
                          <span className="text-gray-400">-</span>
                          <Input
                            type="time"
                            value={sched.end || '18:00'}
                            onChange={(e) => updateDaySchedule(day.key, { end: e.target.value })}
                            disabled={readOnly}
                            className="w-32 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-4">
            {readOnly ? (
              <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!form.name.trim()}>
                  {editingId ? 'Guardar Cambios' : 'Crear Campaña'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
