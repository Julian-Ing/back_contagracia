'use client';

import { useState, useCallback, DragEvent } from 'react';
import Link from 'next/link';
import {
  Plus,
  Filter,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  CalendarDays,
  User,
  DollarSign,
  TrendingUp,
  FileText,
  X,
  Settings,
  Crosshair,
  Check,
  Kanban,
  CheckSquare,
  Square,
  ArrowRight,
  XCircle,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Badge } from '@/shared/components/ui/badge';
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
import type { CrmOpportunity, CrmOpportunityStage } from '@/modules/crm/types';
import { useOpportunities } from '@/modules/crm/hooks/useOpportunities';
import { useStages } from '@/modules/crm/hooks/useStages';
import { useTeam } from '@/modules/crm/hooks/useTeam';
import { useCampaigns } from '@/modules/crm/hooks/useCampaigns';
import { useContacts } from '@/modules/crm/hooks/useContacts';
import { useLeads } from '@/modules/crm/hooks/useLeads';
import QuoteFromOpportunityModal from '@/modules/crm/components/QuoteFromOpportunityModal';

// ─── Helpers ───────────────────────────────────────────────────
const formatCOP = (value: number | null) =>
  value != null ? value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : '—';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStageHeaderStyle = (stage: CrmOpportunityStage) => {
  if (!stage.color) return {};
  const hex = stage.color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    borderColor: hex,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
  };
};

// ─── Form interface ────────────────────────────────────────────
interface OppForm {
  name: string;
  description: string;
  third_party_id: string;
  lead_id: string;
  expected_value: string;
  close_date: string;
  probability: string;
  assigned_to: string;
  cost_center_id: string;
  stage_id: string;
  notes: string;
}

const emptyForm: OppForm = {
  name: '',
  description: '',
  third_party_id: '',
  lead_id: '',
  expected_value: '',
  close_date: '',
  probability: '',
  assigned_to: '',
  cost_center_id: '',
  stage_id: '',
  notes: '',
};

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function OpportunitiesPage() {
  // ── API Hooks ──────────────────────────────────────────────
  const { opportunities, loading: oppsLoading, create, update, remove, updateStage, fetch: refetchOpportunities } = useOpportunities();
  const { stages, loading: stagesLoading } = useStages();
  const { members: teamMembers, loading: teamLoading } = useTeam();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { contacts, loading: contactsLoading } = useContacts();
  const { leads, loading: leadsLoading } = useLeads();

  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<CrmOpportunity | null>(null);
  const [form, setForm] = useState<OppForm>(emptyForm);
  const [readOnly, setReadOnly] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStage, setFilterStage] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterAsesor, setFilterAsesor] = useState('all');

  // Bulk selection
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStageModal, setShowBulkStageModal] = useState(false);
  const [bulkTargetStage, setBulkTargetStage] = useState('');

  // Quote modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedOppForQuote, setSelectedOppForQuote] = useState<CrmOpportunity | null>(null);

  // ── Stats ──────────────────────────────────────────────────
  const totalOpps = opportunities?.length ?? 0;
  const totalPipeline = opportunities?.reduce((s, o) => s + (o.expected_value ?? 0), 0) ?? 0;
  const prospectingCount = opportunities?.filter((o) => {
    const stg = stages?.find((s) => s.id === o.stage_id);
    return stg?.is_initial_stage;
  }).length ?? 0;
  const wonCount = opportunities?.filter((o) => {
    const stg = stages?.find((s) => s.id === o.stage_id);
    return stg?.is_won;
  }).length ?? 0;

  // ── Filtered ────────────────────────────────────────────────
  const filtered = (opportunities ?? []).filter((o) => {
    if (filterStage !== 'all' && o.stage_id !== filterStage) return false;
    // Note: campaign_id may be on opportunity if API returns it
    if (filterCampaign !== 'all' && (o as any).campaign_id !== filterCampaign) return false;
    if (filterAsesor !== 'all' && o.assigned_to !== filterAsesor) return false;
    return true;
  });

  const oppsForStage = (stageId: string) => filtered.filter((o) => o.stage_id === stageId);
  const stageTotal = (stageId: string) =>
    oppsForStage(stageId).reduce((s, o) => s + (o.expected_value ?? 0), 0);

  // ── Drag & Drop ────────────────────────────────────────────
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(oppId);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>, stageId: string) => {
      e.preventDefault();
      const oppId = e.dataTransfer.getData('text/plain');
      if (!oppId) return;

      const opp = opportunities?.find((o) => o.id === oppId);
      if (!opp || opp.stage_id === stageId) { setDraggedId(null); return; }

      const oldStageData = stages?.find((s) => s.id === opp.stage_id);
      if (oldStageData?.is_won) { setDraggedId(null); return; }

      try {
        await updateStage(oppId, stageId);
        await refetchOpportunities();
      } catch (error) {
        console.error('Error updating stage:', error);
      }
      setDraggedId(null);
    },
    [opportunities, stages, updateStage, refetchOpportunities],
  );

  const handleDragEnd = useCallback(() => setDraggedId(null), []);

  // ── Form helpers ───────────────────────────────────────────
  const openCreate = () => {
    const initialStage = stages?.find((s) => s.is_initial_stage) || stages?.[0];
    setForm({ ...emptyForm, stage_id: initialStage?.id || '' });
    setEditOpp(null);
    setReadOnly(false);
    setCreateOpen(true);
  };

  const openEdit = (opp: CrmOpportunity) => {
    setForm({
      name: opp.name,
      description: '',
      third_party_id: opp.third_party_id ?? '',
      lead_id: opp.lead_id ?? '',
      expected_value: opp.expected_value?.toString() ?? '',
      close_date: opp.close_date ?? '',
      probability: opp.probability?.toString() ?? '',
      assigned_to: opp.assigned_to ?? '',
      cost_center_id: opp.cost_center_id ?? '',
      stage_id: opp.stage_id,
      notes: '',
    });
    setEditOpp(opp);
    setReadOnly(false);
    setCreateOpen(true);
  };

  const openDetails = (opp: CrmOpportunity) => {
    setForm({
      name: opp.name,
      description: '',
      third_party_id: opp.third_party_id ?? '',
      lead_id: opp.lead_id ?? '',
      expected_value: opp.expected_value?.toString() ?? '',
      close_date: opp.close_date ?? '',
      probability: opp.probability?.toString() ?? '',
      assigned_to: opp.assigned_to ?? '',
      cost_center_id: opp.cost_center_id ?? '',
      stage_id: opp.stage_id,
      notes: '',
    });
    setEditOpp(opp);
    setReadOnly(true);
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editOpp && !readOnly) {
        // Update existing opportunity
        await update(editOpp.id, {
          name: form.name,
          third_party_id: form.third_party_id,
          lead_id: form.lead_id || null,
          expected_value: form.expected_value ? Number(form.expected_value) : null,
          close_date: form.close_date || null,
          probability: form.probability ? Number(form.probability) : null,
          assigned_to: form.assigned_to || null,
          cost_center_id: form.cost_center_id || null,
          stage_id: form.stage_id,
        });
      } else if (!editOpp) {
        // Create new opportunity
        await create({
          name: form.name,
          third_party_id: form.third_party_id || '',
          lead_id: form.lead_id || null,
          expected_value: form.expected_value ? Number(form.expected_value) : null,
          close_date: form.close_date || null,
          probability: form.probability ? Number(form.probability) : null,
          assigned_to: form.assigned_to || null,
          cost_center_id: form.cost_center_id || null,
          stage_id: form.stage_id,
        });
      }
      await refetchOpportunities();
      setCreateOpen(false);
    } catch (error) {
      console.error('Error saving opportunity:', error);
    }
  };

  const handleMarkAsLost = async (opp: CrmOpportunity) => {
    const lostStage = stages?.find((s) => s.is_lost);
    if (!lostStage || opp.stage_id === lostStage.id) return;
    const oldStageData = stages?.find((s) => s.id === opp.stage_id);
    if (oldStageData?.is_won) return;

    try {
      await updateStage(opp.id, lostStage.id);
      await refetchOpportunities();
    } catch (error) {
      console.error('Error marking as lost:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      await refetchOpportunities();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
    }
  };

  // ── Bulk selection ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllInStage = (stageId: string) => {
    const stageOpps = oppsForStage(stageId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      stageOpps.forEach((o) => {
        const sd = stages?.find((s) => s.id === o.stage_id);
        if (!sd?.is_won) next.add(o.id);
      });
      return next;
    });
  };

  const handleBulkStageChange = async () => {
    if (selectedIds.size === 0 || !bulkTargetStage) return;
    try {
      // Update all selected opportunities
      const updatePromises = Array.from(selectedIds).map(async (oppId) => {
        const opp = opportunities?.find((o) => o.id === oppId);
        if (!opp) return;
        const sd = stages?.find((s) => s.id === opp.stage_id);
        if (sd?.is_won || opp.stage_id === bulkTargetStage) return;
        await updateStage(oppId, bulkTargetStage);
      });
      await Promise.all(updatePromises);
      await refetchOpportunities();
      setSelectedIds(new Set());
      setShowBulkStageModal(false);
      setBulkTargetStage('');
    } catch (error) {
      console.error('Error in bulk stage change:', error);
    }
  };

  const clearFilters = () => {
    setFilterStage('all');
    setFilterCampaign('all');
    setFilterAsesor('all');
  };

  const stageIds = (stages ?? []).map((s) => s.id);
  const isLoading = oppsLoading || stagesLoading || teamLoading || campaignsLoading || contactsLoading || leadsLoading;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando oportunidades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Crosshair className="h-7 w-7" />
            Oportunidades
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Embudo de ventas y gestión de oportunidades
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!bulkActionMode ? (
            <>
              <Button variant="outline" onClick={() => setBulkActionMode(true)}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Selección Masiva
              </Button>
              <Link href="/dashboard/crm/stages-settings">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar Etapas
                </Button>
              </Link>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Oportunidad
              </Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-xs">
                {selectedIds.size} seleccionada(s)
              </Badge>
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={() => setShowBulkStageModal(true)}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Cambiar Estado
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                Limpiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkActionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Oportunidades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalOpps}</p>
            </div>
            <Crosshair className="h-8 w-8 text-gray-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total Embudo</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCOP(totalPipeline)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">En Prospección</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{prospectingCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ganadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{wonCount}</p>
            </div>
            <Check className="h-8 w-8 text-green-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* ── Tip ────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Kanban className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> Arrastra y suelta las tarjetas entre columnas para cambiar el estado de las oportunidades.
          Las automatizaciones de emails, WhatsApp y actividades se ejecutarán automáticamente.
        </p>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros de oportunidades</h3>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Etapa</label>
              <Select
                options={[{ value: 'all', label: 'Todas' }, ...(stages ?? []).map((s) => ({ value: s.id, label: s.name }))]}
                value={filterStage}
                onChange={(v) => setFilterStage(v)}
                placeholder="Etapa"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Campaña</label>
              <Select
                options={[{ value: 'all', label: 'Todas' }, ...(campaigns ?? []).map((c) => ({ value: c.id, label: c.name }))]}
                value={filterCampaign}
                onChange={(v) => setFilterCampaign(v)}
                placeholder="Campaña"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Asesor</label>
              <Select
                options={[{ value: 'all', label: 'Todos' }, ...(teamMembers ?? []).map((u) => ({ value: u.id, label: u.name }))]}
                value={filterAsesor}
                onChange={(v) => setFilterAsesor(v)}
                placeholder="Asesor"
              />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Kanban Board ───────────────────────────────────── */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns:
              stageIds.length > 0
                ? `repeat(${stageIds.length}, minmax(280px, 1fr))`
                : 'repeat(4, minmax(280px, 1fr))',
            minWidth:
              stageIds.length > 4
                ? `${stageIds.length * 280 + (stageIds.length - 1) * 16}px`
                : 'auto',
          }}
        >
          {(stages ?? []).map((stage) => {
            const stageOpps = oppsForStage(stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <Card
                  className="border-2"
                  style={getStageHeaderStyle(stage)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {bulkActionMode && (
                          <button
                            onClick={() => selectAllInStage(stage.id)}
                            className="rounded p-1 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            title="Seleccionar todos en esta etapa"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </button>
                        )}
                        <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stageOpps.length}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                      {formatCOP(stageTotal(stage.id))}
                    </div>
                  </CardHeader>
                </Card>

                {/* Cards container */}
                <div className="mt-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto pr-1">
                  {stageOpps.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 dark:border-slate-700 dark:text-gray-500">
                      Sin oportunidades
                    </div>
                  ) : (
                    stageOpps.map((opp) => {
                      const stageData = stages?.find((s) => s.id === opp.stage_id);
                      return (
                        <div
                          key={opp.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, opp.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'relative cursor-grab rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50',
                            draggedId === opp.id && 'opacity-50 ring-2 ring-blue-400',
                            bulkActionMode && selectedIds.has(opp.id) && 'ring-2 ring-blue-500',
                          )}
                        >
                          {/* Bulk checkbox */}
                          {bulkActionMode && (
                            <div
                              className="absolute top-2 left-2 z-10 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleSelect(opp.id); }}
                            >
                              {selectedIds.has(opp.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
                              )}
                            </div>
                          )}

                          {/* Card top */}
                          <div className="flex items-start justify-between">
                            <div className={cn('flex-1 min-w-0', bulkActionMode && 'ml-6')}>
                              <h4 className="text-sm font-semibold leading-tight text-gray-900 dark:text-white truncate">
                                {opp.name}
                              </h4>
                              {opp.third_party?.company_name && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{opp.third_party.company_name}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-1">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetails(opp)}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(opp)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                {!stageData?.is_won && !stageData?.is_lost && (
                                  <DropdownMenuItem
                                    className="text-red-600 dark:text-red-400"
                                    onClick={() => handleMarkAsLost(opp)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" /> Marcar como Perdida
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => handleDelete(opp.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Value */}
                          <div className="mt-2 flex items-center gap-1 text-xs">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatCOP(opp.expected_value)}
                            </span>
                          </div>

                          {/* Calculated vs expected */}
                          {opp.calculated_value != null && opp.calculated_value !== (opp.expected_value ?? 0) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 pl-4">
                              Valor cotización:{' '}
                              <span className="font-semibold">{formatCOP(opp.calculated_value)}</span>{' '}
                              <span className={cn(
                                'font-medium',
                                (opp.calculated_value ?? 0) > (opp.expected_value ?? 0) ? 'text-green-600' : 'text-red-600',
                              )}>
                                ({(opp.calculated_value ?? 0) > (opp.expected_value ?? 0) ? '↑' : '↓'})
                              </span>
                            </div>
                          )}

                          {/* Assigned user */}
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <User className="h-3 w-3" />
                            <span className="truncate">{opp.assigned_user?.name || 'Sin asignar'}</span>
                          </div>

                          {/* Cost center - may need to be loaded from relations if available */}
                          {(opp as any).cost_center_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">
                                {(opp as any).cost_center_consecutive ? `[${(opp as any).cost_center_consecutive}] ` : ''}
                                {(opp as any).cost_center_name}
                              </span>
                            </div>
                          )}

                          {/* Close date */}
                          {opp.close_date && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <CalendarDays className="h-3 w-3" />
                              <span>{formatDate(opp.close_date)}</span>
                            </div>
                          )}

                          {/* Bottom row: badges + quote button */}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {opp.probability != null && (
                                <Badge variant="outline" className="text-[10px]">
                                  {opp.probability}% prob.
                                </Badge>
                              )}
                              {(opp.quotes_count ?? 0) > 0 && (
                                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                  <FileText className="mr-0.5 h-3 w-3" />
                                  {opp.quotes_count}
                                </Badge>
                              )}
                            </div>
                            {stageData?.is_quoting_stage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOppForQuote(opp);
                                  setQuoteModalOpen(true);
                                }}
                              >
                                <FileText className="h-3 w-3" />
                                Cotización
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create / Edit / Details Dialog ──────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {readOnly ? 'Detalles de Oportunidad' : editOpp ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
            </DialogTitle>
            <DialogDescription>
              {readOnly
                ? 'Información completa de la oportunidad.'
                : editOpp
                  ? 'Modifica los datos de la oportunidad.'
                  : 'Completa los campos para crear una nueva oportunidad.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre de la oportunidad"
                disabled={readOnly}
              />
            </div>

            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe la oportunidad..."
                rows={2}
                disabled={readOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contacto</Label>
                <Select
                  options={(contacts ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  value={form.third_party_id}
                  onChange={(v) => setForm({ ...form, third_party_id: v })}
                  placeholder="Seleccionar contacto"
                  disabled={readOnly}
                  searchable
                />
              </div>
              <div className="grid gap-2">
                <Label>Lead (opcional)</Label>
                <Select
                  options={[
                    { value: '', label: 'Sin lead asociado' },
                    ...(leads ?? []).map((l) => ({ value: l.id, label: l.third_party?.name || `Lead ${l.id.slice(0, 8)}` }))
                  ]}
                  value={form.lead_id}
                  onChange={(v) => setForm({ ...form, lead_id: v })}
                  placeholder="Seleccionar lead"
                  disabled={readOnly}
                  searchable
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valor esperado</Label>
                <Input
                  type="number"
                  value={form.expected_value}
                  onChange={(e) => setForm({ ...form, expected_value: e.target.value })}
                  placeholder="0"
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label>Probabilidad (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  placeholder="50"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha de cierre</Label>
                <DatePicker
                  value={form.close_date}
                  onChange={(v) => setForm({ ...form, close_date: v })}
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label>Etapa</Label>
                <Select
                  options={(stages ?? []).map((s) => ({ value: s.id, label: s.name }))}
                  value={form.stage_id}
                  onChange={(v) => setForm({ ...form, stage_id: v })}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Asignado a</Label>
                <Select
                  options={(teamMembers ?? []).map((u) => ({ value: u.id, label: u.name }))}
                  value={form.assigned_to}
                  onChange={(v) => setForm({ ...form, assigned_to: v })}
                  placeholder="Seleccionar asesor"
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label>Centro de costo</Label>
                <Select
                  options={[
                    { value: 'cc1', label: 'Centro Principal' },
                    { value: 'cc2', label: 'Sucursal Norte' },
                  ]}
                  value={form.cost_center_id}
                  onChange={(v) => setForm({ ...form, cost_center_id: v })}
                  placeholder="Seleccionar"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
                disabled={readOnly}
              />
            </div>
          </div>

          <DialogFooter>
            {readOnly ? (
              <Button onClick={() => setCreateOpen(false)}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editOpp ? 'Guardar cambios' : 'Crear'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Stage Change Dialog ──────────────────────── */}
      <Dialog open={showBulkStageModal} onOpenChange={setShowBulkStageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado Masivamente</DialogTitle>
            <DialogDescription>
              {selectedIds.size} oportunidad(es) seleccionada(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estado Destino</Label>
              <Select
                options={(stages ?? []).map((s) => ({ value: s.id, label: s.name }))}
                value={bulkTargetStage}
                onChange={(v) => setBulkTargetStage(v)}
                placeholder="Seleccionar estado"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>Las oportunidades ganadas no se moverán</li>
                <li>Las oportunidades ya en este estado se omitirán</li>
                <li>Se ejecutarán las automatizaciones configuradas</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkStageModal(false); setBulkTargetStage(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleBulkStageChange} disabled={!bulkTargetStage}>
              Aplicar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quote Modal ────────────────────────────────────── */}
      <QuoteFromOpportunityModal
        open={quoteModalOpen}
        onOpenChange={setQuoteModalOpen}
        opportunity={selectedOppForQuote}
        onSuccess={async () => {
          await refetchOpportunities();
          setQuoteModalOpen(false);
          setSelectedOppForQuote(null);
        }}
      />
    </div>
  );
}
