'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useStages } from '@/modules/crm/hooks/useStages';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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
import { Switch } from '@/shared/components/ui/switch';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import toast from 'react-hot-toast';
import type { CrmOpportunityStage } from '@/modules/crm/types';

interface StageForm {
  value: string;
  name: string;
  color: string;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  is_quoting_stage: boolean;
  is_initial_stage: boolean;
  is_active: boolean;
}

const EMPTY_FORM: StageForm = {
  value: '',
  name: '',
  color: '#3B82F6',
  probability: 0,
  is_won: false,
  is_lost: false,
  is_quoting_stage: false,
  is_initial_stage: false,
  is_active: true,
};

const PRESET_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
];

export default function StagesSettingsPage() {
  const { stages, loading, create, update, remove, reorder } = useStages();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<CrmOpportunityStage | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StageForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Sorted stages
  const sorted = useMemo(() =>
    [...(stages || [])].sort((a, b) => a.position - b.position),
    [stages]
  );

  // Check for existing special stages
  const existingWonStage = useMemo(() =>
    stages?.find(s => s.is_won && s.id !== editingId),
    [stages, editingId]
  );
  const existingLostStage = useMemo(() =>
    stages?.find(s => s.is_lost && s.id !== editingId),
    [stages, editingId]
  );
  const existingQuotingStage = useMemo(() =>
    stages?.find(s => s.is_quoting_stage && s.id !== editingId),
    [stages, editingId]
  );
  const existingInitialStage = useMemo(() =>
    stages?.find(s => s.is_initial_stage && s.id !== editingId),
    [stages, editingId]
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(stage: CrmOpportunityStage) {
    setEditingId(stage.id);
    setForm({
      value: stage.value || '',
      name: stage.name,
      color: stage.color,
      probability: stage.probability,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
      is_quoting_stage: stage.is_quoting_stage,
      is_initial_stage: stage.is_initial_stage,
      is_active: stage.is_active,
    });
    setDialogOpen(true);
  }

  function openDeleteConfirm(stage: CrmOpportunityStage) {
    setStageToDelete(stage);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    // Validations
    if (!form.value.trim()) {
      toast.error('El valor (slug) es requerido');
      return;
    }
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    // Check for duplicate value
    const duplicateValue = stages?.find(s =>
      s.value && s.value.toLowerCase() === form.value.toLowerCase() && s.id !== editingId
    );
    if (duplicateValue) {
      toast.error(`Ya existe una etapa con el valor "${form.value}"`);
      return;
    }

    // Warn about replacing special stages
    if (form.is_won && existingWonStage) {
      toast.error(`Ya existe una etapa "Ganado": ${existingWonStage.name}. Solo puede haber una.`);
      return;
    }
    if (form.is_lost && existingLostStage) {
      toast.error(`Ya existe una etapa "Perdido": ${existingLostStage.name}. Solo puede haber una.`);
      return;
    }
    if (form.is_quoting_stage && existingQuotingStage) {
      toast.error(`Ya existe una etapa de "Cotización": ${existingQuotingStage.name}. Solo puede haber una.`);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await update(editingId, form);
      } else {
        await create(form);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving stage:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!stageToDelete) return;

    setDeleting(true);
    try {
      await remove(stageToDelete.id);
      setDeleteDialogOpen(false);
      setStageToDelete(null);
    } catch (error) {
      console.error('Error deleting stage:', error);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(id: string, checked: boolean) {
    try {
      await update(id, { is_active: checked });
    } catch (error) {
      console.error('Error toggling active state:', error);
    }
  }

  async function moveUp(stage: CrmOpportunityStage) {
    const currentIndex = sorted.findIndex(s => s.id === stage.id);
    if (currentIndex <= 0) return;

    setReordering(true);
    try {
      const newOrder = sorted.map((s, index) => ({
        id: s.id,
        position: index === currentIndex
          ? currentIndex - 1
          : index === currentIndex - 1
            ? currentIndex
            : index
      }));

      // Sort by new position
      newOrder.sort((a, b) => a.position - b.position);

      // Reassign sequential orders
      const finalOrder = newOrder.map((s, idx) => ({
        id: s.id,
        position: idx + 1
      }));

      await reorder(finalOrder);
    } catch (error) {
      console.error('Error moving stage up:', error);
    } finally {
      setReordering(false);
    }
  }

  async function moveDown(stage: CrmOpportunityStage) {
    const currentIndex = sorted.findIndex(s => s.id === stage.id);
    if (currentIndex >= sorted.length - 1) return;

    setReordering(true);
    try {
      const newOrder = sorted.map((s, index) => ({
        id: s.id,
        position: index === currentIndex
          ? currentIndex + 1
          : index === currentIndex + 1
            ? currentIndex
            : index
      }));

      // Sort by new position
      newOrder.sort((a, b) => a.position - b.position);

      // Reassign sequential orders
      const finalOrder = newOrder.map((s, idx) => ({
        id: s.id,
        position: idx + 1
      }));

      await reorder(finalOrder);
    } catch (error) {
      console.error('Error moving stage down:', error);
    } finally {
      setReordering(false);
    }
  }

  function getStageTypeBadge(stage: CrmOpportunityStage) {
    if (stage.is_won) return <Badge className="bg-emerald-600 text-white">Ganado</Badge>;
    if (stage.is_lost) return <Badge className="bg-red-600 text-white">Perdido</Badge>;
    if (stage.is_quoting_stage) return <Badge variant="outline" className="border-amber-500 text-amber-500">Cotización</Badge>;
    if (stage.is_initial_stage) return <Badge variant="secondary">Inicial</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  }

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/crm/opportunities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Etapas de Oportunidad
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configura las etapas del pipeline de ventas
            </p>
          </div>
        </div>
        <Button onClick={openCreate} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Etapa
        </Button>
      </div>

      {/* Stages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pipeline de Ventas
            {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay etapas configuradas.</p>
              <p className="text-sm mt-1">Crea tu primera etapa para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-24">Orden</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-20">Color</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-24">Prob. %</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-28">Tipo</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-20">Activo</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((stage, index) => (
                    <tr
                      key={stage.id}
                      className={cn(
                        "border-b border-border hover:bg-muted/30 transition-colors",
                        !stage.is_active && "opacity-50"
                      )}
                    >
                      {/* Order & Move buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveUp(stage)}
                              disabled={index === 0 || reordering}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveDown(stage)}
                              disabled={index === sorted.length - 1 || reordering}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{stage.name}</span>
                      </td>

                      {/* Value (slug) */}
                      <td className="py-3 px-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{stage.value}</code>
                      </td>

                      {/* Color */}
                      <td className="py-3 px-4 text-center">
                        <div
                          className="h-6 w-6 rounded-full mx-auto border border-border"
                          style={{ backgroundColor: stage.color }}
                          title={stage.color}
                        />
                      </td>

                      {/* Probability */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm">{stage.probability}%</span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 text-center">
                        {getStageTypeBadge(stage)}
                      </td>

                      {/* Active Toggle */}
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={stage.is_active}
                          onCheckedChange={(checked) => handleToggleActive(stage.id, checked)}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(stage)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirm(stage)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info tip */}
      <Card className="border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p><strong>Tipos de etapa:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-200">
              <li><strong>Inicial:</strong> Primera etapa al crear una oportunidad</li>
              <li><strong>Normal:</strong> Etapas intermedias del proceso de ventas</li>
              <li><strong>Cotización:</strong> Etapa donde se generan cotizaciones</li>
              <li><strong>Ganado:</strong> Oportunidad ganada (solo puede haber una)</li>
              <li><strong>Perdido:</strong> Oportunidad perdida (solo puede haber una)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Etapa' : 'Nueva Etapa'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos de la etapa del pipeline.'
                : 'Crea una nueva etapa para el pipeline de ventas.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stage-name">Nombre *</Label>
                <Input
                  id="stage-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ej: Prospección"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stage-value">Valor (slug) *</Label>
                <Input
                  id="stage-value"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="ej: prospeccion"
                />
              </div>
            </div>

            {/* Color */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        form.color === color ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground/50"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
              </div>
            </div>

            {/* Probability */}
            <div className="grid gap-2">
              <Label htmlFor="stage-probability">Probabilidad de cierre (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="stage-probability"
                  type="number"
                  min={0}
                  max={100}
                  className="w-24"
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${form.probability}%`,
                      backgroundColor: form.color
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stage Type Checkboxes */}
            <div className="grid gap-2">
              <Label>Tipo de etapa</Label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stage-initial"
                    checked={form.is_initial_stage}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_initial_stage: checked === true })
                    }
                  />
                  <Label htmlFor="stage-initial" className="text-sm cursor-pointer">
                    Etapa Inicial
                  </Label>
                  {existingInitialStage && !form.is_initial_stage && (
                    <span className="text-xs text-muted-foreground">
                      ({existingInitialStage.name})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stage-quoting"
                    checked={form.is_quoting_stage}
                    disabled={!!existingQuotingStage}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_quoting_stage: checked === true })
                    }
                  />
                  <Label htmlFor="stage-quoting" className={cn("text-sm cursor-pointer", existingQuotingStage && "text-muted-foreground")}>
                    Etapa de Cotización
                  </Label>
                  {existingQuotingStage && (
                    <span className="text-xs text-muted-foreground">
                      ({existingQuotingStage.name})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stage-won"
                    checked={form.is_won}
                    disabled={!!existingWonStage}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        is_won: checked === true,
                        is_lost: checked === true ? false : form.is_lost,
                        probability: checked === true ? 100 : form.probability
                      })
                    }
                  />
                  <Label htmlFor="stage-won" className={cn("text-sm cursor-pointer", existingWonStage && "text-muted-foreground")}>
                    Etapa Ganado
                  </Label>
                  {existingWonStage && (
                    <span className="text-xs text-muted-foreground">
                      ({existingWonStage.name})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stage-lost"
                    checked={form.is_lost}
                    disabled={!!existingLostStage}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        is_lost: checked === true,
                        is_won: checked === true ? false : form.is_won,
                        probability: checked === true ? 0 : form.probability
                      })
                    }
                  />
                  <Label htmlFor="stage-lost" className={cn("text-sm cursor-pointer", existingLostStage && "text-muted-foreground")}>
                    Etapa Perdido
                  </Label>
                  {existingLostStage && (
                    <span className="text-xs text-muted-foreground">
                      ({existingLostStage.name})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="stage-active" className="cursor-pointer">Etapa Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las etapas inactivas no aparecen en el pipeline
                </p>
              </div>
              <Switch
                id="stage-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Guardar Cambios' : 'Crear Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la etapa <strong>"{stageToDelete?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive">
                <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                Las oportunidades en esta etapa podrían quedar sin etapa asignada.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
