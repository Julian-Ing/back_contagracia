'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Search,
  Bike,
  CircleDot,
  HelpCircle,
  Upload,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
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
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';

import {
  useVehicles,
  useUnits,
  useUnitTypes,
  useCondominiums,
} from '@/modules/ph';
import type { PhVehicle, VehicleType } from '@/modules/ph';
import ImportVehiclesModal from '@/modules/ph/components/ImportVehiclesModal';
import { usePermissions } from '@/shared/hooks/usePermissions';

// ─── Helpers ───

const VEHICLE_TYPE_OPTIONS: { value: VehicleType | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'car', label: 'Carro' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'bicycle', label: 'Bicicleta' },
  { value: 'other', label: 'Otro' },
];

const VEHICLE_TYPE_CREATE_OPTIONS = VEHICLE_TYPE_OPTIONS.filter((o) => o.value !== '');

function getVehicleTypeIcon(type: VehicleType) {
  switch (type) {
    case 'car':
      return <Car className="h-4 w-4" />;
    case 'motorcycle':
      return <Bike className="h-4 w-4" />;
    case 'bicycle':
      return <CircleDot className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
}

function getVehicleTypeBadge(type: VehicleType) {
  const labels: Record<VehicleType, string> = {
    car: 'Carro',
    motorcycle: 'Moto',
    bicycle: 'Bicicleta',
    other: 'Otro',
  };
  const colors: Record<VehicleType, string> = {
    car: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    motorcycle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    bicycle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <Badge className={`${colors[type]} flex items-center gap-1.5`}>
      {getVehicleTypeIcon(type)}
      {labels[type]}
    </Badge>
  );
}

const PAGE_SIZE = 20;

const emptyForm = {
  unit_id: '',
  vehicle_type: '' as VehicleType | '',
  brand: '',
  model: '',
  year: '',
  color: '',
  plate: '',
  sticker_number: '',
  parking_space: '',
  notes: '',
};

export default function VehiclesPage() {
  const { vehicles, total, loading, fetchVehicles, createVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { units } = useUnits();
  const { unitTypes } = useUnitTypes();
  const { condominiums } = useCondominiums();
  const { can } = usePermissions();
  const canManage = can('ph.vehicles.create');

  // IDs de tipos de unidad marcados como parqueadero
  const parkingTypeIds = useMemo(
    () => new Set(unitTypes.filter((ut) => ut.is_parking).map((ut) => ut.id)),
    [unitTypes]
  );

  // Unidades que son parqueaderos (para el select del form)
  const parkingUnits = useMemo(
    () => units.filter((u) => u.unit_type_id && parkingTypeIds.has(u.unit_type_id) && u.is_active),
    [units, parkingTypeIds]
  );

  // Unidades que NO son parqueaderos (para el select de unidad del form)
  const nonParkingUnits = useMemo(
    () => units.filter((u) => !u.unit_type_id || !parkingTypeIds.has(u.unit_type_id)),
    [units, parkingTypeIds]
  );

  // ─── Filters ───
  const [filterCondominium, setFilterCondominium] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchPlate, setSearchPlate] = useState('');
  const [page, setPage] = useState(1);

  // ─── Dialogs ───
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<PhVehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Filtered units based on condominium ───
  const filteredUnits = useMemo(() => {
    if (!filterCondominium) return units;
    return units.filter((u) => u.condominium_id === filterCondominium);
  }, [units, filterCondominium]);

  // ─── Client-side filtering ───
  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    if (filterCondominium) {
      const unitIdsInCondominium = new Set(
        units.filter((u) => u.condominium_id === filterCondominium).map((u) => u.id)
      );
      result = result.filter((v) => unitIdsInCondominium.has(v.unit_id));
    }
    if (filterUnit) {
      result = result.filter((v) => v.unit_id === filterUnit);
    }
    if (filterType) {
      result = result.filter((v) => v.vehicle_type === filterType);
    }
    if (searchPlate.trim()) {
      const q = searchPlate.trim().toLowerCase();
      result = result.filter((v) => v.plate?.toLowerCase().includes(q));
    }
    return result;
  }, [vehicles, filterCondominium, filterUnit, filterType, searchPlate, units]);

  const paginatedVehicles = filteredVehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filteredVehicles.length / PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterCondominium, filterUnit, filterType, searchPlate]);

  // ─── Handlers ───

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await createVehicle({
        unit_id: form.unit_id,
        vehicle_type: form.vehicle_type,
        brand: form.brand || undefined,
        model: form.model || undefined,
        year: form.year ? Number(form.year) : undefined,
        color: form.color || undefined,
        plate: form.plate || undefined,
        sticker_number: form.sticker_number || undefined,
        parking_space: form.parking_space || undefined,
        notes: form.notes || undefined,
      });
      setIsCreateOpen(false);
      setForm(emptyForm);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (vehicle: PhVehicle) => {
    setSelectedVehicle(vehicle);
    setForm({
      unit_id: vehicle.unit_id,
      vehicle_type: vehicle.vehicle_type,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      color: vehicle.color || '',
      plate: vehicle.plate || '',
      sticker_number: vehicle.sticker_number || '',
      parking_space: vehicle.parking_space || '',
      notes: vehicle.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedVehicle) return;
    try {
      setSubmitting(true);
      await updateVehicle(selectedVehicle.id, {
        unit_id: form.unit_id,
        vehicle_type: form.vehicle_type,
        brand: form.brand || null,
        model: form.model || null,
        year: form.year ? Number(form.year) : null,
        color: form.color || null,
        plate: form.plate || null,
        sticker_number: form.sticker_number || null,
        parking_space: form.parking_space || null,
        notes: form.notes || null,
      });
      setIsEditOpen(false);
      setSelectedVehicle(null);
      setForm(emptyForm);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (vehicle: PhVehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    try {
      setSubmitting(true);
      await removeVehicle(selectedVehicle.id);
      setIsDeleteOpen(false);
      setSelectedVehicle(null);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Form fields ───
  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Unidad *</Label>
        <Select
          options={nonParkingUnits.map((u) => ({
            value: u.id,
            label: `${u.unit_number}${u.condominium?.name ? ` - ${u.condominium.name}` : ''}`,
          }))}
          value={form.unit_id}
          onChange={(v) => setForm({ ...form, unit_id: v })}
          placeholder="Seleccionar unidad"
          searchable
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo de vehiculo *</Label>
        <Select
          options={VEHICLE_TYPE_CREATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={form.vehicle_type}
          onChange={(v) => setForm({ ...form, vehicle_type: v as VehicleType })}
          placeholder="Seleccionar tipo"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marca</Label>
          <Input
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder="Ej: Chevrolet"
          />
        </div>
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="Ej: Spark GT"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ano</Label>
          <Input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="Ej: 2023"
          />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <Input
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            placeholder="Ej: Blanco"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Placa</Label>
        <Input
          value={form.plate}
          onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
          placeholder="Ej: ABC123"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Numero de sticker</Label>
          <Input
            value={form.sticker_number}
            onChange={(e) => setForm({ ...form, sticker_number: e.target.value })}
            placeholder="Ej: 001"
          />
        </div>
        <div className="space-y-2">
          <Label>Parqueadero</Label>
          {parkingUnits.length > 0 ? (
            <Select
              options={[
                { value: '', label: 'Sin asignar' },
                ...parkingUnits.map((u) => ({
                  value: u.unit_number,
                  label: `${u.unit_number}${u.condominium?.name ? ` - ${u.condominium.name}` : ''}`,
                })),
              ]}
              value={form.parking_space}
              onChange={(v) => setForm({ ...form, parking_space: v })}
              placeholder="Seleccionar parqueadero"
              searchable
            />
          ) : (
            <Input
              value={form.parking_space}
              onChange={(e) => setForm({ ...form, parking_space: e.target.value })}
              placeholder="Ej: P-101"
            />
          )}
          {parkingUnits.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {parkingTypeIds.size === 0
                ? 'No hay tipos de unidad marcados como parqueadero. Configuralos en Ajustes.'
                : 'No hay unidades de tipo parqueadero creadas. Crealas en la pagina de Unidades.'}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas adicionales (opcional)"
        />
      </div>
    </div>
  );

  // ─── Loading ───
  if (loading && vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando vehiculos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {canManage ? 'Vehiculos' : 'Mis Vehiculos'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canManage
                ? 'Gestiona los vehiculos registrados en las copropiedades'
                : 'Consulta los vehiculos registrados en tus unidades'}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2 border-gray-200 dark:border-slate-700">
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehiculo
            </Button>
          </div>
        )}
      </div>

      {/* Filters (solo admin) */}
      {canManage && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                options={[
                  { value: '', label: 'Todas las copropiedades' },
                  ...condominiums.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={filterCondominium}
                onChange={(v) => { setFilterCondominium(v); setFilterUnit(''); }}
                placeholder="Copropiedad"
                searchable
              />
              <Select
                options={[
                  { value: '', label: 'Todas las unidades' },
                  ...filteredUnits.map((u) => ({
                    value: u.id,
                    label: `${u.unit_number}${u.condominium?.name ? ` - ${u.condominium.name}` : ''}`,
                  })),
                ]}
                value={filterUnit}
                onChange={setFilterUnit}
                placeholder="Unidad"
                searchable
              />
              <Select
                options={VEHICLE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={filterType}
                onChange={setFilterType}
                placeholder="Tipo de vehiculo"
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  placeholder="Buscar por placa..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>{canManage ? 'Lista de Vehiculos' : 'Mis Vehiculos'}</span>
            <Badge variant="secondary">{filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehiculo' : 'vehiculos'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Placa</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Marca</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Modelo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Ano</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Color</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Unidad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Parqueadero</TableHead>
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 10 : 8} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      {vehicles.length === 0
                        ? (canManage ? 'No hay vehiculos registrados' : 'No tienes vehiculos registrados')
                        : 'No se encontraron vehiculos con los filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {vehicle.plate || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.brand || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.model || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.year || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.color || '-'}
                      </TableCell>
                      <TableCell>{getVehicleTypeBadge(vehicle.vehicle_type)}</TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.unit?.unit_number || units.find((u) => u.id === vehicle.unit_id)?.unit_number || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {vehicle.parking_space || '-'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {vehicle.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(vehicle)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDelete(vehicle)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {page} de {totalPages} ({filteredVehicles.length} vehiculos)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create Vehicle Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Vehiculo</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.unit_id || !form.vehicle_type}
            >
              {submitting ? 'Creando...' : 'Crear Vehiculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vehiculo</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting || !form.unit_id || !form.vehicle_type}
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vehicle Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Vehiculo</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            Estas seguro de que deseas eliminar el vehiculo{' '}
            <strong>{selectedVehicle?.plate || selectedVehicle?.brand}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Esta accion no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Vehicles from Excel */}
      <ImportVehiclesModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => fetchVehicles()}
        condominiums={condominiums}
        units={units}
        unitTypes={unitTypes}
      />
    </div>
  );
}