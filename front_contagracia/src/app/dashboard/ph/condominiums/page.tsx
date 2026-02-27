'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Building,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Hash,
  Upload,
  ImageIcon,
  X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
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
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { cn } from '@/shared/lib/utils';
import { adminClient } from '@/shared/services/api/apiClient';
import { getMediaUrl } from '@/config/api.config';

import { useCondominiums } from '@/modules/ph';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { mediaService } from '@/modules/ph/services/ph.service';
import type { PhCondominium, PhTower } from '@/modules/ph/types';
import ImportCondominiumsModal from '@/modules/ph/components/ImportCondominiumsModal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const EMPTY_CONDO_FORM = {
  name: '',
  nit: '',
  address: '',
  phone: '',
  email: '',
  department_id: '',
  municipality_id: '',
  price_per_m2: '',
  logo_url: '',
};

const EMPTY_TOWER_FORM = {
  name: '',
  code: '',
  total_floors: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhCondominiumsPage() {
  // ---- Permissions ----
  const { can } = usePermissions();
  const canManage = can('ph.condominiums.create');

  // ---- Data hook ----
  const {
    condominiums,
    towers,
    loading,
    fetchCondominiums,
    fetchTowers,
    createCondominium,
    updateCondominium,
    removeCondominium,
    createTower,
    updateTower,
    removeTower,
  } = useCondominiums();

  // ---- Search & pagination state ----
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ---- Import dialog ----
  const [importOpen, setImportOpen] = useState(false);

  // ---- Dialog state ----
  const [createOpen, setCreateOpen] = useState(false);
  const [editCondo, setEditCondo] = useState<PhCondominium | null>(null);
  const [detailCondo, setDetailCondo] = useState<PhCondominium | null>(null);
  const [deleteCondo, setDeleteCondo] = useState<PhCondominium | null>(null);
  const [towersCondo, setTowersCondo] = useState<PhCondominium | null>(null);

  // ---- Tower sub-dialogs ----
  const [towerCreateOpen, setTowerCreateOpen] = useState(false);
  const [editTower, setEditTower] = useState<PhTower | null>(null);
  const [deleteTower, setDeleteTower] = useState<PhTower | null>(null);

  // ---- Form state ----
  const [condoForm, setCondoForm] = useState(EMPTY_CONDO_FORM);
  const [towerForm, setTowerForm] = useState(EMPTY_TOWER_FORM);

  // ---- Logo upload ----
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ---- Catalogs (departments / municipalities) ----
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    adminClient
      .get('/admin/catalogs/departments')
      .then((res) => {
        const raw = res.data;
        const items = raw?.data || raw;
        setDepartments(
          (Array.isArray(items) ? items : []).map((d: any) => ({ id: String(d.id), name: d.name })),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!condoForm.department_id) {
      setMunicipalities([]);
      return;
    }
    adminClient
      .get(`/admin/catalogs/municipalities/by-department/${condoForm.department_id}`)
      .then((res) => {
        const raw = res.data;
        const items = raw?.data || raw;
        setMunicipalities(
          (Array.isArray(items) ? items : []).map((m: any) => ({ id: String(m.id), name: m.name })),
        );
      })
      .catch(() => {});
  }, [condoForm.department_id]);

  // ---- Saving flags ----
  const [saving, setSaving] = useState(false);
  const [savingTower, setSavingTower] = useState(false);

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    if (!search) return condominiums;
    const q = search.toLowerCase();
    return condominiums.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nit?.toLowerCase().includes(q),
    );
  }, [condominiums, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- Handlers: Condominium CRUD ----

  function openCreate() {
    setCondoForm(EMPTY_CONDO_FORM);
    setLogoFile(null);
    setLogoPreview('');
    setCreateOpen(true);
  }

  function openEdit(c: PhCondominium) {
    setCondoForm({
      name: c.name,
      nit: c.nit ?? '',
      address: c.address ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      department_id: c.department_id ?? '',
      municipality_id: c.municipality_id ?? '',
      price_per_m2: c.price_per_m2 != null ? String(c.price_per_m2) : '',
      logo_url: c.logo_url ?? '',
    });
    setLogoFile(null);
    setLogoPreview(c.logo_url ? getMediaUrl(c.logo_url) : '');
    setEditCondo(c);
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview('');
    setCondoForm((prev) => ({ ...prev, logo_url: '' }));
  }

  async function handleSaveCondo() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: condoForm.name };
      if (condoForm.nit) payload.nit = condoForm.nit;
      if (condoForm.address) payload.address = condoForm.address;
      if (condoForm.phone) payload.phone = condoForm.phone;
      if (condoForm.email) payload.email = condoForm.email;
      if (condoForm.department_id) payload.department_id = condoForm.department_id;
      if (condoForm.municipality_id) payload.municipality_id = condoForm.municipality_id;
      if (condoForm.price_per_m2) payload.price_per_m2 = Number(condoForm.price_per_m2);

      // Upload logo if a new file was selected
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        fd.append('category', 'ph_condominium_logo');
        const media = await mediaService.upload(fd) as { url: string };
        payload.logo_url = media.url;
      } else if (condoForm.logo_url) {
        payload.logo_url = condoForm.logo_url;
      }

      if (editCondo) {
        await updateCondominium(editCondo.id, payload);
      } else {
        await createCondominium(payload);
      }
      setCreateOpen(false);
      setEditCondo(null);
    } catch {
      // toast already handled by hook
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteCondo) return;
    setSaving(true);
    try {
      await removeCondominium(deleteCondo.id);
      setDeleteCondo(null);
    } catch {
      // toast already handled by hook
    } finally {
      setSaving(false);
    }
  }

  // ---- Handlers: Towers ----

  async function openTowersDialog(c: PhCondominium) {
    setTowersCondo(c);
    await fetchTowers(c.id);
  }

  function openCreateTower() {
    setTowerForm(EMPTY_TOWER_FORM);
    setTowerCreateOpen(true);
  }

  function openEditTower(t: PhTower) {
    setTowerForm({
      name: t.name,
      code: t.code ?? '',
      total_floors: t.total_floors != null ? String(t.total_floors) : '',
    });
    setEditTower(t);
  }

  async function handleSaveTower() {
    if (!towersCondo) return;
    setSavingTower(true);
    try {
      const payload: Record<string, unknown> = { name: towerForm.name };
      if (towerForm.code) payload.code = towerForm.code;
      if (towerForm.total_floors) payload.total_floors = Number(towerForm.total_floors);

      if (editTower) {
        await updateTower(towersCondo.id, editTower.id, payload);
      } else {
        await createTower(towersCondo.id, payload);
      }
      setTowerCreateOpen(false);
      setEditTower(null);
    } catch {
      // toast already handled by hook
    } finally {
      setSavingTower(false);
    }
  }

  async function handleDeleteTower() {
    if (!towersCondo || !deleteTower) return;
    setSavingTower(true);
    try {
      await removeTower(towersCondo.id, deleteTower.id);
      setDeleteTower(null);
    } catch {
      // toast already handled by hook
    } finally {
      setSavingTower(false);
    }
  }

  // ---- Derived ----
  const isCondoFormOpen = createOpen || editCondo !== null;
  const isTowerFormOpen = towerCreateOpen || editTower !== null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {canManage ? 'Copropiedades' : 'Mi Copropiedad'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canManage ? 'Gestiona los conjuntos y copropiedades' : 'Información de tu copropiedad'}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Buscar por nombre o NIT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 w-64 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* Import Excel */}
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2 border-gray-200 dark:border-slate-700">
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>

            {/* New condominium */}
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Copropiedad
            </Button>
          </div>
        )}
      </div>

      {/* ---- Table Card ---- */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-slate-400">
              <Loader2 className="h-12 w-12 mb-4 opacity-40 animate-spin" />
              <p className="text-lg font-medium">Cargando copropiedades...</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-slate-400">
              <Building2 className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No hay copropiedades</p>
              <p className="text-sm mt-1">Crea tu primera copropiedad para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700">
                    <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">NIT</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Direcci&oacute;n</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Torres</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Unidades Totales</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                    {canManage && <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((condo) => (
                    <TableRow
                      key={condo.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => setDetailCondo(condo)}
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {condo.logo_url ? (
                            <img
                              src={getMediaUrl(condo.logo_url)}
                              alt=""
                              className="h-8 w-8 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                            </div>
                          )}
                          {condo.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {condo.nit ?? '\u2014'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {condo.address ?? '\u2014'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {condo._count?.towers ?? condo.towers?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">
                        {condo._count?.units ?? condo.total_units ?? '\u2014'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={condo.is_active ? 'default' : 'secondary'}
                          className={cn(
                            condo.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {condo.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailCondo(condo)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(condo)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTowersDialog(condo)}>
                                <Building className="mr-2 h-4 w-4" />
                                Torres
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => setDeleteCondo(condo)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
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
            P&aacute;gina {page} de {totalPages} &middot; {filtered.length} copropiedad
            {filtered.length !== 1 ? 's' : ''}
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

      {/* ==================================================================== */}
      {/* Create / Edit Condominium Dialog                                      */}
      {/* ==================================================================== */}
      <Dialog
        open={isCondoFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditCondo(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editCondo ? 'Editar Copropiedad' : 'Nueva Copropiedad'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {editCondo
                ? 'Modifica los datos de la copropiedad.'
                : 'Registra un nuevo conjunto o edificio'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto pr-1">
            {/* logo upload */}
            <div className="grid gap-2">
              <Label className="text-gray-700 dark:text-slate-300">Logo</Label>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-3 flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo preview" className="max-h-20 max-w-[200px] object-contain rounded" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearLogo(); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400 dark:text-slate-500">
                    <ImageIcon className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="text-xs">Click para subir logo</p>
                      <p className="text-[10px]">JPG, PNG o WebP &middot; Max 2 MB</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>

            {/* name */}
            <div className="grid gap-2">
              <Label htmlFor="condo-name" className="text-gray-700 dark:text-slate-300">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="condo-name"
                value={condoForm.name}
                onChange={(e) => setCondoForm({ ...condoForm, name: e.target.value })}
                placeholder="Conjunto Residencial..."
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* nit */}
            <div className="grid gap-2">
              <Label htmlFor="condo-nit" className="text-gray-700 dark:text-slate-300">
                NIT
              </Label>
              <Input
                id="condo-nit"
                value={condoForm.nit}
                onChange={(e) => setCondoForm({ ...condoForm, nit: e.target.value })}
                placeholder="900123456-7"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* phone */}
            <div className="grid gap-2">
              <Label htmlFor="condo-phone" className="text-gray-700 dark:text-slate-300">
                Telefono
              </Label>
              <Input
                id="condo-phone"
                value={condoForm.phone}
                onChange={(e) => setCondoForm({ ...condoForm, phone: e.target.value })}
                placeholder="3001234567"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* address */}
            <div className="grid gap-2">
              <Label htmlFor="condo-address" className="text-gray-700 dark:text-slate-300">
                Direccion
              </Label>
              <Input
                id="condo-address"
                value={condoForm.address}
                onChange={(e) => setCondoForm({ ...condoForm, address: e.target.value })}
                placeholder="Calle 123 # 45-67"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* department & municipality row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-gray-700 dark:text-slate-300">
                  Departamento
                </Label>
                <SearchableSelect
                  options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                  value={condoForm.department_id}
                  onChange={(v) => setCondoForm((prev) => ({ ...prev, department_id: v, municipality_id: '' }))}
                  placeholder="Seleccionar departamento"
                  searchPlaceholder="Buscar departamento..."
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-700 dark:text-slate-300">
                  Municipio
                </Label>
                <SearchableSelect
                  options={municipalities.map((m) => ({ value: String(m.id), label: m.name }))}
                  value={condoForm.municipality_id}
                  onChange={(v) => setCondoForm((prev) => ({ ...prev, municipality_id: v }))}
                  placeholder={condoForm.department_id ? 'Seleccionar municipio' : 'Seleccione departamento'}
                  searchPlaceholder="Buscar municipio..."
                  disabled={!condoForm.department_id}
                />
              </div>
            </div>

            {/* email */}
            <div className="grid gap-2">
              <Label htmlFor="condo-email" className="text-gray-700 dark:text-slate-300">
                Email
              </Label>
              <Input
                id="condo-email"
                type="email"
                value={condoForm.email}
                onChange={(e) => setCondoForm({ ...condoForm, email: e.target.value })}
                placeholder="admin@conjunto.com"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* price_per_m2 */}
            <div className="grid gap-2">
              <Label htmlFor="condo-price-m2" className="text-gray-700 dark:text-slate-300">
                Valor por m² (para cobro por área)
              </Label>
              <Input
                id="condo-price-m2"
                type="number"
                min={0}
                step={1000}
                value={condoForm.price_per_m2}
                onChange={(e) => setCondoForm({ ...condoForm, price_per_m2: e.target.value })}
                placeholder="5000"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Usado para calcular cuotas basadas en el área de cada unidad (valor × m²)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditCondo(null);
              }}
              disabled={saving}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCondo} disabled={saving || !condoForm.name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editCondo ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                editCondo ? 'Guardar' : 'Crear'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* Detail Dialog                                                         */}
      {/* ==================================================================== */}
      <Dialog open={detailCondo !== null} onOpenChange={(open) => !open && setDetailCondo(null)}>
        {detailCondo && (
          <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                {detailCondo.name}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-slate-400">
                Detalle del copropiedad
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Logo */}
              {detailCondo.logo_url && (
                <div className="flex justify-center">
                  <img
                    src={getMediaUrl(detailCondo.logo_url)}
                    alt={`Logo ${detailCondo.name}`}
                    className="max-h-24 max-w-48 object-contain rounded"
                  />
                </div>
              )}

              {/* Status badge */}
              <div>
                <Badge
                  className={cn(
                    detailCondo.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  )}
                >
                  {detailCondo.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Info rows */}
              <div className="grid gap-3 text-sm">
                <DetailRow icon={Hash} label="NIT" value={detailCondo.nit ?? null} />
                <DetailRow icon={MapPin} label="Direcci&oacute;n" value={detailCondo.address ?? null} />
                <DetailRow icon={Phone} label="Tel&eacute;fono" value={detailCondo.phone ?? null} />
                <DetailRow icon={Mail} label="Email" value={detailCondo.email ?? null} />
                <DetailRow
                  icon={Building2}
                  label="Unidades Totales"
                  value={detailCondo.total_units != null ? String(detailCondo.total_units) : null}
                />
                <DetailRow
                  icon={Building}
                  label="Torres"
                  value={String(detailCondo._count?.towers ?? detailCondo.towers?.length ?? 0)}
                />
                <DetailRow
                  icon={Hash}
                  label="Precio por m&sup2;"
                  value={
                    detailCondo.price_per_m2 != null
                      ? detailCondo.price_per_m2.toLocaleString('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        })
                      : null
                  }
                />
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-400 dark:text-slate-500 space-y-1 pt-2 border-t border-gray-200 dark:border-slate-700">
                <p>Creado: {new Date(detailCondo.created_at).toLocaleDateString('es-CO')}</p>
                <p>Actualizado: {new Date(detailCondo.updated_at).toLocaleDateString('es-CO')}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDetailCondo(null)}
                className="border-gray-200 dark:border-slate-700"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ==================================================================== */}
      {/* Delete Confirmation Dialog                                            */}
      {/* ==================================================================== */}
      <Dialog open={deleteCondo !== null} onOpenChange={(open) => !open && setDeleteCondo(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Eliminar copropiedad</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              &iquest;Est&aacute;s seguro de que deseas eliminar{' '}
              <strong>{deleteCondo?.name}</strong>? Esta acci&oacute;n no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteCondo(null)}
              disabled={saving}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* Towers Management Dialog                                              */}
      {/* ==================================================================== */}
      <Dialog
        open={towersCondo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTowersCondo(null);
            setTowerCreateOpen(false);
            setEditTower(null);
            setDeleteTower(null);
          }
        }}
      >
        {towersCondo && (
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Building className="h-5 w-5" />
                Torres &mdash; {towersCondo.name}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-slate-400">
                Administra las torres de esta copropiedad.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Add tower button */}
              <div className="flex justify-end">
                <Button size="sm" onClick={openCreateTower} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Torre
                </Button>
              </div>

              {/* Towers table */}
              {towers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-400">
                  <Building className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No hay torres registradas</p>
                  <p className="text-xs mt-1">Agrega la primera torre para esta copropiedad.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">C&oacute;digo</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Pisos</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300 text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {towers.map((tower) => (
                        <TableRow
                          key={tower.id}
                          className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {tower.name}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-slate-300">
                            {tower.code ?? '\u2014'}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-slate-300">
                            {tower.total_floors ?? '\u2014'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={tower.is_active ? 'default' : 'secondary'}
                              className={cn(
                                tower.is_active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              )}
                            >
                              {tower.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditTower(tower)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                onClick={() => setDeleteTower(tower)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTowersCondo(null)}
                className="border-gray-200 dark:border-slate-700"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ==================================================================== */}
      {/* Create / Edit Tower Dialog                                            */}
      {/* ==================================================================== */}
      <Dialog
        open={isTowerFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTowerCreateOpen(false);
            setEditTower(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editTower ? 'Editar Torre' : 'Nueva Torre'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {editTower
                ? 'Modifica los datos de la torre.'
                : 'Completa los datos para crear una nueva torre.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* name */}
            <div className="grid gap-2">
              <Label htmlFor="tower-name" className="text-gray-700 dark:text-slate-300">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tower-name"
                value={towerForm.name}
                onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })}
                placeholder="Torre A"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* code */}
            <div className="grid gap-2">
              <Label htmlFor="tower-code" className="text-gray-700 dark:text-slate-300">
                C&oacute;digo
              </Label>
              <Input
                id="tower-code"
                value={towerForm.code}
                onChange={(e) => setTowerForm({ ...towerForm, code: e.target.value })}
                placeholder="TA"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>

            {/* total_floors */}
            <div className="grid gap-2">
              <Label htmlFor="tower-floors" className="text-gray-700 dark:text-slate-300">
                Total de Pisos
              </Label>
              <Input
                id="tower-floors"
                type="number"
                min={1}
                value={towerForm.total_floors}
                onChange={(e) => setTowerForm({ ...towerForm, total_floors: e.target.value })}
                placeholder="10"
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTowerCreateOpen(false);
                setEditTower(null);
              }}
              disabled={savingTower}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTower} disabled={savingTower || !towerForm.name.trim()}>
              {savingTower ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* Delete Tower Confirmation Dialog                                      */}
      {/* ==================================================================== */}
      <Dialog open={deleteTower !== null} onOpenChange={(open) => !open && setDeleteTower(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Eliminar torre</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              &iquest;Est&aacute;s seguro de que deseas eliminar la torre{' '}
              <strong>{deleteTower?.name}</strong>? Esta acci&oacute;n no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTower(null)}
              disabled={savingTower}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTower} disabled={savingTower}>
              {savingTower ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* Import from Excel Modal                                              */}
      {/* ==================================================================== */}
      <ImportCondominiumsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={fetchCondominiums}
      />
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
        <p className="text-gray-900 dark:text-white">{value ?? '\u2014'}</p>
      </div>
    </div>
  );
}
