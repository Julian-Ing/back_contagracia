'use client';

import { useState } from 'react';
import {
  Settings,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Inbox,
  Construction,
  Check,
  X,
} from 'lucide-react';
import { useUnitTypes, useFeeConcepts } from '@/modules/ph';
import type { PhUnitType, PhFeeConcept, RentalFeeType, CalculationType } from '@/modules/ph';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

// ─── Helpers ───

function formatCOP(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function getRentalFeeTypeLabel(type?: RentalFeeType | null): string {
  switch (type) {
    case 'fixed':
      return 'Fijo';
    case 'per_hour':
      return 'Por hora';
    case 'per_day':
      return 'Por dia';
    default:
      return '-';
  }
}

function getCalculationTypeLabel(type: CalculationType): string {
  switch (type) {
    case 'fixed':
      return 'Fijo';
    case 'per_m2':
      return 'Por m2';
    case 'coefficient':
      return 'Coeficiente';
    default:
      return type;
  }
}

function getCalculationTypeBadge(type: CalculationType) {
  switch (type) {
    case 'fixed':
      return (
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-transparent">
          Fijo
        </Badge>
      );
    case 'per_m2':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent">
          Por m2
        </Badge>
      );
    case 'coefficient':
      return (
        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-transparent">
          Coeficiente
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

// ─── Unit Types Tab ───

function UnitTypesTab() {
  const { unitTypes, loading, createUnitType, updateUnitType, removeUnitType } = useUnitTypes();
  const { feeConcepts } = useFeeConcepts();

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    is_rentable: false,
    is_parking: false,
    rental_fee: '',
    rental_fee_type: '' as string,
    free_minutes: '',
    fee_concept_id: '',
  });

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhUnitType | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: '',
      code: '',
      is_rentable: false,
      is_parking: false,
      rental_fee: '',
      rental_fee_type: '',
      free_minutes: '',
      fee_concept_id: '',
    });
    setDialogOpen(true);
  }

  function openEdit(ut: PhUnitType) {
    setEditingId(ut.id);
    setForm({
      name: ut.name,
      code: ut.code ?? '',
      is_rentable: ut.is_rentable,
      is_parking: ut.is_parking,
      rental_fee: ut.rental_fee != null ? String(ut.rental_fee) : '',
      rental_fee_type: ut.rental_fee_type ?? '',
      free_minutes: ut.free_minutes != null ? String(ut.free_minutes) : '',
      fee_concept_id: ut.fee_concept_id ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        is_rentable: form.is_rentable,
        is_parking: form.is_parking,
        rental_fee: form.rental_fee ? Number(form.rental_fee) : undefined,
        rental_fee_type: form.rental_fee_type || undefined,
        free_minutes: form.free_minutes ? Number(form.free_minutes) : undefined,
        fee_concept_id: form.fee_concept_id || undefined,
      };
      if (editingId) {
        await updateUnitType(editingId, data);
      } else {
        await createUnitType(data);
      }
      setDialogOpen(false);
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  }

  function openDelete(ut: PhUnitType) {
    setDeleteTarget(ut);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeUnitType(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // toast handled by hook
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Tipos de Unidad</CardTitle>
            <CardDescription>
              Configura los tipos de unidades y sus tarifas de alquiler.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {unitTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Inbox className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">Sin tipos de unidad</p>
              <p className="text-sm mt-1">Crea el primer tipo de unidad para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-600 dark:text-gray-400">Nombre</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Codigo</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Parqueadero</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Alquilable</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400 text-right">Tarifa Alquiler</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Tipo Tarifa</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400 text-right">Minutos Gratis</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitTypes.map((ut) => (
                    <TableRow
                      key={ut.id}
                      className="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                        {ut.name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {ut.code ?? '-'}
                      </TableCell>
                      <TableCell>
                        {ut.is_parking ? (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-transparent">
                            <Check className="h-3 w-3 mr-1" />
                            Si
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-transparent">
                            <X className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ut.is_rentable ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                            <Check className="h-3 w-3 mr-1" />
                            Si
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-transparent">
                            <X className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300 text-right">
                        {formatCOP(ut.rental_fee)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {getRentalFeeTypeLabel(ut.rental_fee_type)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300 text-right">
                        {ut.free_minutes != null ? `${ut.free_minutes} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {ut.is_active ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-transparent">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(ut)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDelete(ut)}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingId ? 'Editar Tipo de Unidad' : 'Nuevo Tipo de Unidad'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del tipo de unidad.'
                : 'Crea un nuevo tipo de unidad para clasificar las unidades.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Parqueadero, Deposito..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Codigo</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Ej: PRQ, DEP..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div>
                <Label className="text-sm font-medium">Parqueadero</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Marca este tipo como parqueadero para asignar a vehiculos.
                </p>
              </div>
              <Switch
                checked={form.is_parking}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_parking: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div>
                <Label className="text-sm font-medium">Alquilable</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Permite que unidades de este tipo se alquilen.
                </p>
              </div>
              <Switch
                checked={form.is_rentable}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_rentable: v }))}
              />
            </div>
            {form.is_rentable && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tarifa de Alquiler</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.rental_fee}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, rental_fee: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de Tarifa</Label>
                    <Select
                      options={[
                        { value: 'fixed', label: 'Fijo' },
                        { value: 'per_hour', label: 'Por hora' },
                        { value: 'per_day', label: 'Por dia' },
                      ]}
                      value={form.rental_fee_type}
                      onChange={(v) => setForm((prev) => ({ ...prev, rental_fee_type: v }))}
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Minutos Gratis</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.free_minutes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, free_minutes: e.target.value }))
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Minutos de cortesia antes de empezar a cobrar.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Concepto de Cuota</Label>
                  <Select
                    options={feeConcepts
                      .filter((fc) => fc.is_active)
                      .map((fc) => ({ value: fc.id, label: `${fc.name}${fc.code ? ` (${fc.code})` : ''}` }))}
                    value={form.fee_concept_id}
                    onChange={(v) => setForm((prev) => ({ ...prev, fee_concept_id: v }))}
                    placeholder="Seleccionar concepto..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Concepto de cobro asociado al alquiler de este tipo.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Guardar Cambios' : 'Crear Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tipo de Unidad</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el tipo de unidad <strong>{deleteTarget?.name}</strong>. Esta accion no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Fee Concepts Tab ───

function FeeConceptsTab() {
  const { feeConcepts, loading, createFeeConcept, updateFeeConcept, removeFeeConcept } =
    useFeeConcepts();

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    default_amount: '',
    calculation_type: '' as string,
    is_recurring: false,
  });

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhFeeConcept | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: '',
      code: '',
      description: '',
      default_amount: '',
      calculation_type: 'fixed',
      is_recurring: false,
    });
    setDialogOpen(true);
  }

  function openEdit(fc: PhFeeConcept) {
    setEditingId(fc.id);
    setForm({
      name: fc.name,
      code: fc.code ?? '',
      description: fc.description ?? '',
      default_amount: fc.default_amount != null ? String(fc.default_amount) : '',
      calculation_type: fc.calculation_type,
      is_recurring: fc.is_recurring,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        default_amount: form.default_amount ? Number(form.default_amount) : undefined,
        calculation_type: form.calculation_type || 'fixed',
        is_recurring: form.is_recurring,
      };
      if (editingId) {
        await updateFeeConcept(editingId, data);
      } else {
        await createFeeConcept(data);
      }
      setDialogOpen(false);
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  }

  function openDelete(fc: PhFeeConcept) {
    setDeleteTarget(fc);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeFeeConcept(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // toast handled by hook
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Conceptos de Cobro</CardTitle>
            <CardDescription>
              Define los conceptos que se usan para generar cuotas a las unidades.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Concepto
          </Button>
        </CardHeader>
        <CardContent>
          {feeConcepts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Inbox className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">Sin conceptos de cobro</p>
              <p className="text-sm mt-1">Crea el primer concepto para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-600 dark:text-gray-400">Nombre</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Codigo</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400 text-right">Monto Default</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Tipo Calculo</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Recurrente</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-600 dark:text-gray-400 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeConcepts.map((fc) => (
                    <TableRow
                      key={fc.id}
                      className="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                        {fc.name}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {fc.code ?? '-'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300 text-right font-medium">
                        {formatCOP(fc.default_amount)}
                      </TableCell>
                      <TableCell>
                        {getCalculationTypeBadge(fc.calculation_type)}
                      </TableCell>
                      <TableCell>
                        {fc.is_recurring ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                            <Check className="h-3 w-3 mr-1" />
                            Si
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-transparent">
                            <X className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {fc.is_active ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-transparent">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(fc)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDelete(fc)}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingId ? 'Editar Concepto de Cobro' : 'Nuevo Concepto de Cobro'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del concepto de cobro.'
                : 'Define un nuevo concepto para la facturacion de cuotas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Administracion, Fondo de Reserva..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Codigo</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Ej: ADM, FDR..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripcion opcional..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monto Default</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.default_amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, default_amount: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Calculo</Label>
                <Select
                  options={[
                    { value: 'fixed', label: 'Fijo' },
                    { value: 'per_m2', label: 'Por m2' },
                    { value: 'coefficient', label: 'Coeficiente' },
                  ]}
                  value={form.calculation_type}
                  onChange={(v) => setForm((prev) => ({ ...prev, calculation_type: v }))}
                  placeholder="Seleccionar tipo"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div>
                <Label className="text-sm font-medium">Recurrente</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Se genera automaticamente en cada periodo de facturacion.
                </p>
              </div>
              <Switch
                checked={form.is_recurring}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_recurring: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Guardar Cambios' : 'Crear Concepto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Concepto de Cobro</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el concepto <strong>{deleteTarget?.name}</strong>. Esta accion no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Accounting Tab (Placeholder) ───

function AccountingTab() {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4 mb-4">
            <Construction className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Configuracion contable en desarrollo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Proximamente: vinculacion con plan de cuentas, centros de costo y configuracion de
            asientos automaticos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page Component ───

export default function PhSettingsPage() {
  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          Configuracion PH
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Administra tipos de unidad, conceptos de cobro y configuracion contable.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="unit-types">
        <TabsList>
          <TabsTrigger value="unit-types">Tipos de Unidad</TabsTrigger>
          <TabsTrigger value="fee-concepts">Conceptos de Cobro</TabsTrigger>
          <TabsTrigger value="accounting">Contabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="unit-types">
          <UnitTypesTab />
        </TabsContent>

        <TabsContent value="fee-concepts">
          <FeeConceptsTab />
        </TabsContent>

        <TabsContent value="accounting">
          <AccountingTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
