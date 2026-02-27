'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  DoorOpen,
  Package,
  ClipboardList,
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  PackageCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { porteriaService, condominiumsService, unitsService, towersService, residentsService } from '@/modules/ph';

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface Condominium { id: string; name: string; }
interface Tower { id: string; name: string; }
interface Unit { id: string; unit_number: string; condominium_id: string; tower_id?: string | null; }

interface AccessLog {
  id: string;
  condominium_id: string;
  visit_type: string;
  visitor_name: string;
  visitor_doc: string | null;
  visitor_company: string | null;
  destination_unit_id: string | null;
  purpose: string | null;
  entry_at: string;
  exit_at: string | null;
  notes: string | null;
  destination_unit?: { id: string; unit_number: string } | null;
}

interface PhPackage {
  id: string;
  condominium_id: string;
  unit_id: string;
  description: string;
  carrier: string | null;
  tracking_number: string | null;
  status: string;
  received_at: string;
  delivered_at: string | null;
  notes: string | null;
  unit?: { id: string; unit_number: string };
}

interface MinutaEntry {
  id: string;
  condominium_id: string;
  entry_type: string;
  title: string;
  body: string;
  shift: string | null;
  created_at: string;
}

interface PackageStats { pending: number; notified: number; delivered_today: number; }

// ─── Constants ───────────────────────────────────────────────────────────────

const VISIT_TYPES = [
  { value: 'visitor', label: 'Visitante' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'resident', label: 'Residente' },
  { value: 'delivery', label: 'Mensajería' },
];

const VISIT_TYPE_COLORS: Record<string, string> = {
  visitor: 'bg-blue-500/20 text-blue-400',
  provider: 'bg-orange-500/20 text-orange-400',
  resident: 'bg-green-500/20 text-green-400',
  delivery: 'bg-purple-500/20 text-purple-400',
};

const PACKAGE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  notified: 'bg-blue-500/20 text-blue-400',
  delivered: 'bg-green-500/20 text-green-400',
};
const PACKAGE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  notified: 'Notificado',
  delivered: 'Entregado',
};

const ENTRY_TYPES = [
  { value: 'novedad', label: 'Novedad' },
  { value: 'observacion', label: 'Observación' },
  { value: 'incidente', label: 'Incidente' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
];

const ENTRY_TYPE_COLORS: Record<string, string> = {
  novedad: 'bg-blue-500/20 text-blue-400',
  observacion: 'bg-muted text-muted-foreground',
  incidente: 'bg-red-500/20 text-red-400',
  mantenimiento: 'bg-orange-500/20 text-orange-400',
};

const SHIFTS = [
  { value: '', label: 'Sin turno' },
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
];

const EMPTY_ACCESS_FORM = {
  condominium_id: '', visit_type: 'visitor', visitor_name: '',
  visitor_doc: '', visitor_company: '', destination_unit_id: '',
  purpose: '', notes: '',
};

const EMPTY_PACKAGE_FORM = {
  condominium_id: '', unit_id: '', description: '',
  carrier: '', tracking_number: '', notes: '',
};

const EMPTY_MINUTA_FORM = {
  condominium_id: '', entry_type: 'novedad', title: '',
  body: '', shift: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

type TabKey = 'access' | 'packages' | 'minuta';

export default function PorteriaPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { can, isPrivileged } = usePermissions();

  const canManageAccess = can('ph.porteria.manage_access');
  const canManagePackages = can('ph.porteria.manage_packages');
  const canManageMinuta = can('ph.porteria.manage_minuta');

  const [activeTab, setActiveTab] = useState<TabKey>('access');
  const [allCondominiums, setAllCondominiums] = useState<Condominium[]>([]);
  const [myUnits, setMyUnits] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [filterCondo, setFilterCondo] = useState('');
  const [accessTowerFilter, setAccessTowerFilter] = useState('');
  const [pkgTowerFilter, setPkgTowerFilter] = useState('');

  // ─── Access Logs state ──────────────────────────────
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessForm, setAccessForm] = useState(EMPTY_ACCESS_FORM);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [deleteAccessTarget, setDeleteAccessTarget] = useState<AccessLog | null>(null);
  const [filterDateAccess, setFilterDateAccess] = useState('');
  const [filterTypeAccess, setFilterTypeAccess] = useState('');

  // ─── Packages state ─────────────────────────────────
  const [packages, setPackages] = useState<PhPackage[]>([]);
  const [pkgStats, setPkgStats] = useState<PackageStats>({ pending: 0, notified: 0, delivered_today: 0 });
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [pkgForm, setPkgForm] = useState(EMPTY_PACKAGE_FORM);
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);
  const [deletePkgTarget, setDeletePkgTarget] = useState<PhPackage | null>(null);
  const [filterStatusPkg, setFilterStatusPkg] = useState('');

  // ─── Minuta state ────────────────────────────────────
  const [minutaEntries, setMinutaEntries] = useState<MinutaEntry[]>([]);
  const [loadingMinuta, setLoadingMinuta] = useState(false);
  const [minutaForm, setMinutaForm] = useState(EMPTY_MINUTA_FORM);
  const [minutaDialogOpen, setMinutaDialogOpen] = useState(false);
  const [editingMinutaId, setEditingMinutaId] = useState<string | null>(null);
  const [savingMinuta, setSavingMinuta] = useState(false);
  const [deleteMinutaTarget, setDeleteMinutaTarget] = useState<MinutaEntry | null>(null);
  const [filterDateMinuta, setFilterDateMinuta] = useState('');
  const [filterTypeMinuta, setFilterTypeMinuta] = useState('');

  // ─── Load condominiums & units ───────────────────────

  // Todos los condominios de la empresa
  useEffect(() => {
    if (!companyId) return;
    condominiumsService.getAll(companyId)
      .then((r) => setAllCondominiums(r.data || r || []))
      .catch(() => {});
  }, [companyId]);

  // Unidades del usuario no-privilegiado (portero) para filtrar sus condominios
  useEffect(() => {
    if (!companyId || isPrivileged) return;
    residentsService.getMyUnits(companyId)
      .then((data) => setMyUnits(data || []))
      .catch(() => setMyUnits([]));
  }, [companyId, isPrivileged]);

  // Condominios visibles: admin ve todos, portero solo los suyos
  const condominiums = useMemo(() => {
    if (isPrivileged) return allCondominiums;
    const myCondoIds = new Set(myUnits.map((r: any) => r.unit?.condominium_id).filter(Boolean));
    return allCondominiums.filter((c) => myCondoIds.has(c.id));
  }, [isPrivileged, allCondominiums, myUnits]);

  // Auto-seleccionar si solo hay un condominio disponible
  useEffect(() => {
    if (condominiums.length === 1 && !filterCondo) {
      setFilterCondo(condominiums[0].id);
    }
  }, [condominiums]);

  useEffect(() => {
    if (!companyId || !filterCondo) { setUnits([]); return; }
    unitsService.getAll(companyId, { condominium_id: filterCondo, take: 200 })
      .then((r) => setUnits(r.data || r || []))
      .catch(() => {});
  }, [companyId, filterCondo]);

  // Cargar torres del condominio seleccionado en el header
  useEffect(() => {
    if (!companyId || !filterCondo) { setTowers([]); setAccessTowerFilter(''); setPkgTowerFilter(''); return; }
    towersService.getAll(companyId, filterCondo)
      .then((r) => setTowers(Array.isArray(r) ? r : r?.data || []))
      .catch(() => setTowers([]));
  }, [companyId, filterCondo]);

  // Helper para cargar unidades y torres al seleccionar copropiedad dentro de un dialog (cuando no hay filterCondo)
  const loadCondoUnitsAndTowers = (condoId: string) => {
    if (!companyId || !condoId || filterCondo) return;
    unitsService.getAll(companyId, { condominium_id: condoId, take: 200 })
      .then((r) => setUnits(r.data || r || []))
      .catch(() => {});
    towersService.getAll(companyId, condoId)
      .then((r) => setTowers(Array.isArray(r) ? r : r?.data || []))
      .catch(() => setTowers([]));
  };

  // ─── Load Access Logs ────────────────────────────────

  const loadAccessLogs = useCallback(async () => {
    if (!companyId) return;
    setLoadingAccess(true);
    try {
      const params: Record<string, unknown> = { take: 100 };
      if (filterCondo) params.condominium_id = filterCondo;
      if (filterTypeAccess) params.visit_type = filterTypeAccess;
      if (filterDateAccess) { params.date_from = filterDateAccess; params.date_to = filterDateAccess; }
      const res = await porteriaService.getAccessLogs(companyId, params);
      setAccessLogs(res.data || []);
    } catch { toast.error('Error cargando accesos'); }
    finally { setLoadingAccess(false); }
  }, [companyId, filterCondo, filterTypeAccess, filterDateAccess]);

  useEffect(() => { if (activeTab === 'access') loadAccessLogs(); }, [activeTab, loadAccessLogs]);

  // ─── Load Packages ───────────────────────────────────

  const loadPackages = useCallback(async () => {
    if (!companyId) return;
    setLoadingPkgs(true);
    try {
      const params: Record<string, unknown> = { take: 100 };
      if (filterCondo) params.condominium_id = filterCondo;
      if (filterStatusPkg) params.status = filterStatusPkg;
      const [listRes, statsRes] = await Promise.all([
        porteriaService.getPackages(companyId, params),
        porteriaService.getPackageStats(companyId, filterCondo ? { condominium_id: filterCondo } : {}),
      ]);
      setPackages(listRes.data || []);
      setPkgStats(statsRes || { pending: 0, notified: 0, delivered_today: 0 });
    } catch { toast.error('Error cargando paquetes'); }
    finally { setLoadingPkgs(false); }
  }, [companyId, filterCondo, filterStatusPkg]);

  useEffect(() => { if (activeTab === 'packages') loadPackages(); }, [activeTab, loadPackages]);

  // ─── Load Minuta ─────────────────────────────────────

  const loadMinuta = useCallback(async () => {
    if (!companyId) return;
    setLoadingMinuta(true);
    try {
      const params: Record<string, unknown> = { take: 100 };
      if (filterCondo) params.condominium_id = filterCondo;
      if (filterTypeMinuta) params.entry_type = filterTypeMinuta;
      if (filterDateMinuta) { params.date_from = filterDateMinuta; params.date_to = filterDateMinuta; }
      const res = await porteriaService.getMinuta(companyId, params);
      setMinutaEntries(res.data || []);
    } catch { toast.error('Error cargando minuta'); }
    finally { setLoadingMinuta(false); }
  }, [companyId, filterCondo, filterTypeMinuta, filterDateMinuta]);

  useEffect(() => { if (activeTab === 'minuta') loadMinuta(); }, [activeTab, loadMinuta]);

  // ─── Access handlers ─────────────────────────────────

  const handleCreateAccess = async () => {
    if (!companyId) return;
    if (!accessForm.condominium_id || !accessForm.visitor_name.trim()) {
      toast.error('Ingresa copropiedad y nombre del visitante');
      return;
    }
    setSavingAccess(true);
    try {
      const payload: Record<string, unknown> = { ...accessForm };
      if (!payload.destination_unit_id) delete payload.destination_unit_id;
      if (!payload.visitor_doc) delete payload.visitor_doc;
      if (!payload.visitor_company) delete payload.visitor_company;
      if (!payload.purpose) delete payload.purpose;
      if (!payload.notes) delete payload.notes;
      await porteriaService.createAccessLog(companyId, payload);
      toast.success('Ingreso registrado');
      setAccessDialogOpen(false);
      setAccessForm(EMPTY_ACCESS_FORM);
      loadAccessLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error registrando ingreso');
    } finally { setSavingAccess(false); }
  };

  const handleRegisterExit = async (log: AccessLog) => {
    if (!companyId) return;
    try {
      await porteriaService.registerExit(companyId, log.id);
      toast.success('Salida registrada');
      loadAccessLogs();
    } catch { toast.error('Error registrando salida'); }
  };

  const handleDeleteAccess = async () => {
    if (!companyId || !deleteAccessTarget) return;
    try {
      await porteriaService.deleteAccessLog(companyId, deleteAccessTarget.id);
      toast.success('Registro eliminado');
      setDeleteAccessTarget(null);
      loadAccessLogs();
    } catch { toast.error('Error eliminando registro'); }
  };

  // ─── Package handlers ────────────────────────────────

  const handleCreatePackage = async () => {
    if (!companyId) return;
    if (!pkgForm.condominium_id || !pkgForm.unit_id || !pkgForm.description.trim()) {
      toast.error('Completa copropiedad, unidad y descripción');
      return;
    }
    setSavingPkg(true);
    try {
      const payload: Record<string, unknown> = { ...pkgForm };
      if (!payload.carrier) delete payload.carrier;
      if (!payload.tracking_number) delete payload.tracking_number;
      if (!payload.notes) delete payload.notes;
      await porteriaService.createPackage(companyId, payload);
      toast.success('Paquete registrado');
      setPkgDialogOpen(false);
      setPkgForm(EMPTY_PACKAGE_FORM);
      loadPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error registrando paquete');
    } finally { setSavingPkg(false); }
  };

  const handleDeliverPackage = async (pkg: PhPackage) => {
    if (!companyId) return;
    try {
      await porteriaService.deliverPackage(companyId, pkg.id);
      toast.success('Paquete marcado como entregado');
      loadPackages();
    } catch { toast.error('Error actualizando paquete'); }
  };

  const handleDeletePackage = async () => {
    if (!companyId || !deletePkgTarget) return;
    try {
      await porteriaService.deletePackage(companyId, deletePkgTarget.id);
      toast.success('Paquete eliminado');
      setDeletePkgTarget(null);
      loadPackages();
    } catch { toast.error('Error eliminando paquete'); }
  };

  // ─── Minuta handlers ─────────────────────────────────

  const openCreateMinuta = () => {
    setEditingMinutaId(null);
    setMinutaForm(filterCondo ? { ...EMPTY_MINUTA_FORM, condominium_id: filterCondo } : EMPTY_MINUTA_FORM);
    setMinutaDialogOpen(true);
  };

  const openEditMinuta = (entry: MinutaEntry) => {
    setEditingMinutaId(entry.id);
    setMinutaForm({
      condominium_id: entry.condominium_id,
      entry_type: entry.entry_type,
      title: entry.title,
      body: entry.body,
      shift: entry.shift || '',
    });
    setMinutaDialogOpen(true);
  };

  const handleSaveMinuta = async () => {
    if (!companyId) return;
    if (!minutaForm.condominium_id || !minutaForm.title.trim() || !minutaForm.body.trim()) {
      toast.error('Completa copropiedad, título y descripción');
      return;
    }
    setSavingMinuta(true);
    try {
      const payload: Record<string, unknown> = { ...minutaForm };
      if (!payload.shift) delete payload.shift;
      if (editingMinutaId) {
        await porteriaService.updateMinutaEntry(companyId, editingMinutaId, payload);
        toast.success('Entrada actualizada');
      } else {
        await porteriaService.createMinutaEntry(companyId, payload);
        toast.success('Novedad registrada');
      }
      setMinutaDialogOpen(false);
      loadMinuta();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando entrada');
    } finally { setSavingMinuta(false); }
  };

  const handleDeleteMinuta = async () => {
    if (!companyId || !deleteMinutaTarget) return;
    try {
      await porteriaService.deleteMinutaEntry(companyId, deleteMinutaTarget.id);
      toast.success('Entrada eliminada');
      setDeleteMinutaTarget(null);
      loadMinuta();
    } catch { toast.error('Error eliminando entrada'); }
  };

  // ─── Helpers ─────────────────────────────────────────

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));

  const formatTime = (d: string) =>
    new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));

  const accessFormUnits = useMemo(() => {
    let list = accessForm.condominium_id
      ? units.filter((u) => u.condominium_id === accessForm.condominium_id)
      : units;
    if (accessTowerFilter) list = list.filter((u) => u.tower_id === accessTowerFilter);
    return list;
  }, [units, accessForm.condominium_id, accessTowerFilter]);

  const pkgFormUnits = useMemo(() => {
    let list = pkgForm.condominium_id
      ? units.filter((u) => u.condominium_id === pkgForm.condominium_id)
      : units;
    if (pkgTowerFilter) list = list.filter((u) => u.tower_id === pkgTowerFilter);
    return list;
  }, [units, pkgForm.condominium_id, pkgTowerFilter]);

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <DoorOpen className="w-6 h-6" /> Portería
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de acceso, paquetería y minuta de novedades
          </p>
        </div>
        {/* Filtro de copropiedad */}
        {condominiums.length > 1 && (
          <Select
            value={filterCondo}
            onChange={setFilterCondo}
            options={[
              { value: '', label: 'Todas las copropiedades' },
              ...condominiums.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="w-56"
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'access', label: 'Control de Acceso', icon: DoorOpen },
          { key: 'packages', label: 'Paquetería', icon: Package },
          { key: 'minuta', label: 'Minuta', icon: ClipboardList },
        ] as { key: TabKey; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Control de Acceso ───────────────────── */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filterTypeAccess}
              onChange={setFilterTypeAccess}
              options={[{ value: '', label: 'Todos los tipos' }, ...VISIT_TYPES]}
              className="w-44"
            />
            <Input
              type="date"
              value={filterDateAccess}
              onChange={(e) => setFilterDateAccess(e.target.value)}
              className="w-44"
            />
            {canManageAccess && (
              <Button
                onClick={() => {
                  setAccessForm(filterCondo ? { ...EMPTY_ACCESS_FORM, condominium_id: filterCondo } : EMPTY_ACCESS_FORM);
                  setAccessDialogOpen(true);
                }}
                className="ml-auto"
              >
                <LogIn className="w-4 h-4 mr-1" /> Registrar ingreso
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingAccess ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : accessLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <DoorOpen className="w-12 h-12 mb-3 opacity-30" />
                  <p>No hay registros de acceso</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Unidad destino</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={VISIT_TYPE_COLORS[log.visit_type] || ''}>
                            {VISIT_TYPES.find((t) => t.value === log.visit_type)?.label || log.visit_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{log.visitor_name}</p>
                          {log.visitor_doc && <p className="text-xs text-muted-foreground">{log.visitor_doc}</p>}
                          {log.visitor_company && <p className="text-xs text-muted-foreground">{log.visitor_company}</p>}
                          {log.purpose && <p className="text-xs text-muted-foreground">{log.purpose}</p>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.destination_unit?.unit_number || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center gap-1 text-green-400">
                            <LogIn className="w-3 h-3" />
                            {formatTime(log.entry_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.exit_at ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <LogOut className="w-3 h-3" />
                              {formatTime(log.exit_at)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Clock className="w-3 h-3" />
                              Activo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canManageAccess && !log.exit_at && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegisterExit(log)}
                              >
                                <LogOut className="w-3 h-3 mr-1" /> Salida
                              </Button>
                            )}
                            {canManageAccess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteAccessTarget(log)}
                              >
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
        </div>
      )}

      {/* ─── Tab: Paquetería ─────────────────────────── */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Package className="w-8 h-8 text-yellow-400 opacity-60" />
                <div>
                  <p className="text-2xl font-bold">{pkgStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-400 opacity-60" />
                <div>
                  <p className="text-2xl font-bold">{pkgStats.notified}</p>
                  <p className="text-xs text-muted-foreground">Notificados</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <PackageCheck className="w-8 h-8 text-green-400 opacity-60" />
                <div>
                  <p className="text-2xl font-bold">{pkgStats.delivered_today}</p>
                  <p className="text-xs text-muted-foreground">Entregados hoy</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filterStatusPkg}
              onChange={setFilterStatusPkg}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'notified', label: 'Notificado' },
                { value: 'delivered', label: 'Entregado' },
              ]}
              className="w-44"
            />
            {canManagePackages && (
              <Button
                onClick={() => {
                  setPkgForm(filterCondo ? { ...EMPTY_PACKAGE_FORM, condominium_id: filterCondo } : EMPTY_PACKAGE_FORM);
                  setPkgDialogOpen(true);
                }}
                className="ml-auto"
              >
                <Plus className="w-4 h-4 mr-1" /> Registrar paquete
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingPkgs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : packages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Package className="w-12 h-12 mb-3 opacity-30" />
                  <p>No hay paquetes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium text-sm">
                          {pkg.unit?.unit_number || '-'}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{pkg.description}</p>
                          {pkg.tracking_number && (
                            <p className="text-xs text-muted-foreground">Guía: {pkg.tracking_number}</p>
                          )}
                          {pkg.notes && (
                            <p className="text-xs text-muted-foreground">{pkg.notes}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{pkg.carrier || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(pkg.received_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={PACKAGE_STATUS_COLORS[pkg.status] || ''}>
                            {PACKAGE_STATUS_LABELS[pkg.status] || pkg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canManagePackages && pkg.status !== 'delivered' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeliverPackage(pkg)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Entregado
                              </Button>
                            )}
                            {canManagePackages && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletePkgTarget(pkg)}
                              >
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
        </div>
      )}

      {/* ─── Tab: Minuta ─────────────────────────────── */}
      {activeTab === 'minuta' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filterTypeMinuta}
              onChange={setFilterTypeMinuta}
              options={[{ value: '', label: 'Todos los tipos' }, ...ENTRY_TYPES]}
              className="w-44"
            />
            <Input
              type="date"
              value={filterDateMinuta}
              onChange={(e) => setFilterDateMinuta(e.target.value)}
              className="w-44"
            />
            {canManageMinuta && (
              <Button onClick={openCreateMinuta} className="ml-auto">
                <Plus className="w-4 h-4 mr-1" /> Nueva novedad
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {loadingMinuta ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : minutaEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
                <p>No hay entradas en la minuta</p>
              </div>
            ) : (
              minutaEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={ENTRY_TYPE_COLORS[entry.entry_type] || ''}>
                            {ENTRY_TYPES.find((t) => t.value === entry.entry_type)?.label || entry.entry_type}
                          </Badge>
                          {entry.shift && (
                            <Badge variant="outline" className="text-xs">
                              Turno: {entry.shift}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                        <p className="font-medium text-sm">{entry.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{entry.body}</p>
                      </div>
                      {canManageMinuta && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEditMinuta(entry)}>
                            <Search className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteMinutaTarget(entry)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Dialog: Registrar Ingreso ─────────────────── */}
      <Dialog open={accessDialogOpen} onOpenChange={(open) => { setAccessDialogOpen(open); if (!open) setAccessTowerFilter(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar ingreso</DialogTitle>
            <DialogDescription>Completa los datos del visitante</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {!filterCondo && (
                <div>
                  <Label>Copropiedad *</Label>
                  <Select
                    value={accessForm.condominium_id}
                    onChange={(v) => {
                      setAccessForm((f) => ({ ...f, condominium_id: v, destination_unit_id: '' }));
                      setAccessTowerFilter('');
                      loadCondoUnitsAndTowers(v);
                    }}
                    options={[{ value: '', label: 'Seleccionar...' }, ...condominiums.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                </div>
              )}
              <div className={filterCondo ? 'col-span-2' : ''}>
                <Label>Tipo *</Label>
                <Select
                  value={accessForm.visit_type}
                  onChange={(v) => setAccessForm((f) => ({ ...f, visit_type: v }))}
                  options={VISIT_TYPES}
                />
              </div>
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input
                value={accessForm.visitor_name}
                onChange={(e) => setAccessForm((f) => ({ ...f, visitor_name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Documento</Label>
                <Input
                  value={accessForm.visitor_doc}
                  onChange={(e) => setAccessForm((f) => ({ ...f, visitor_doc: e.target.value }))}
                  placeholder="C.C. / pasaporte"
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input
                  value={accessForm.visitor_company}
                  onChange={(e) => setAccessForm((f) => ({ ...f, visitor_company: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {towers.length > 0 && (
                <div>
                  <Label>Torre</Label>
                  <Select
                    value={accessTowerFilter}
                    onChange={(v) => { setAccessTowerFilter(v); setAccessForm((f) => ({ ...f, destination_unit_id: '' })); }}
                    options={[{ value: '', label: 'Todas las torres' }, ...towers.map((t) => ({ value: t.id, label: t.name }))]}
                  />
                </div>
              )}
              <div className={towers.length > 0 ? '' : 'col-span-2'}>
                <Label>Unidad destino</Label>
                <Select
                  value={accessForm.destination_unit_id}
                  onChange={(v) => setAccessForm((f) => ({ ...f, destination_unit_id: v }))}
                  options={[
                    { value: '', label: 'Sin unidad' },
                    ...accessFormUnits.map((u) => ({ value: u.id, label: u.unit_number })),
                  ]}
                />
              </div>
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={accessForm.purpose}
                onChange={(e) => setAccessForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder="Visita, entrega, etc."
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={accessForm.notes}
                onChange={(e) => setAccessForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessDialogOpen(false)} disabled={savingAccess}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAccess} disabled={savingAccess}>
              {savingAccess ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogIn className="w-4 h-4 mr-1" />}
              Registrar ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Registrar Paquete ─────────────────── */}
      <Dialog open={pkgDialogOpen} onOpenChange={(open) => { setPkgDialogOpen(open); if (!open) setPkgTowerFilter(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar paquete</DialogTitle>
            <DialogDescription>Se notificará automáticamente al residente de la unidad</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {!filterCondo && (
                <div>
                  <Label>Copropiedad *</Label>
                  <Select
                    value={pkgForm.condominium_id}
                    onChange={(v) => {
                      setPkgForm((f) => ({ ...f, condominium_id: v, unit_id: '' }));
                      setPkgTowerFilter('');
                      loadCondoUnitsAndTowers(v);
                    }}
                    options={[{ value: '', label: 'Seleccionar...' }, ...condominiums.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                </div>
              )}
              {towers.length > 0 && (
                <div>
                  <Label>Torre</Label>
                  <Select
                    value={pkgTowerFilter}
                    onChange={(v) => { setPkgTowerFilter(v); setPkgForm((f) => ({ ...f, unit_id: '' })); }}
                    options={[{ value: '', label: 'Todas las torres' }, ...towers.map((t) => ({ value: t.id, label: t.name }))]}
                  />
                </div>
              )}
              <div className={!filterCondo && towers.length === 0 ? '' : 'col-span-2'}>
                <Label>Unidad *</Label>
                <Select
                  value={pkgForm.unit_id}
                  onChange={(v) => setPkgForm((f) => ({ ...f, unit_id: v }))}
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    ...pkgFormUnits.map((u) => ({ value: u.id, label: u.unit_number })),
                  ]}
                />
              </div>
            </div>
            <div>
              <Label>Descripción *</Label>
              <Input
                value={pkgForm.description}
                onChange={(e) => setPkgForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Caja mediana, sobre manila..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Transportadora</Label>
                <Input
                  value={pkgForm.carrier}
                  onChange={(e) => setPkgForm((f) => ({ ...f, carrier: e.target.value }))}
                  placeholder="Servientrega, DHL..."
                />
              </div>
              <div>
                <Label>Número de guía</Label>
                <Input
                  value={pkgForm.tracking_number}
                  onChange={(e) => setPkgForm((f) => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={pkgForm.notes}
                onChange={(e) => setPkgForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgDialogOpen(false)} disabled={savingPkg}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePackage} disabled={savingPkg}>
              {savingPkg ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
              Registrar paquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Minuta ────────────────────────────── */}
      <Dialog open={minutaDialogOpen} onOpenChange={setMinutaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMinutaId ? 'Editar novedad' : 'Nueva novedad en minuta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {!filterCondo && (
                <div>
                  <Label>Copropiedad *</Label>
                  <Select
                    value={minutaForm.condominium_id}
                    onChange={(v) => setMinutaForm((f) => ({ ...f, condominium_id: v }))}
                    options={[{ value: '', label: 'Seleccionar...' }, ...condominiums.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                </div>
              )}
              <div className={filterCondo ? 'col-span-2' : ''}>
                <Label>Tipo *</Label>
                <Select
                  value={minutaForm.entry_type}
                  onChange={(v) => setMinutaForm((f) => ({ ...f, entry_type: v }))}
                  options={ENTRY_TYPES}
                />
              </div>
            </div>
            <div>
              <Label>Turno</Label>
              <Select
                value={minutaForm.shift}
                onChange={(v) => setMinutaForm((f) => ({ ...f, shift: v }))}
                options={SHIFTS}
              />
            </div>
            <div>
              <Label>Título *</Label>
              <Input
                value={minutaForm.title}
                onChange={(e) => setMinutaForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Resumen breve"
              />
            </div>
            <div>
              <Label>Descripción *</Label>
              <Textarea
                value={minutaForm.body}
                onChange={(e) => setMinutaForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Descripción detallada de la novedad..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMinutaDialogOpen(false)} disabled={savingMinuta}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMinuta} disabled={savingMinuta}>
              {savingMinuta ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-1" />}
              {editingMinutaId ? 'Guardar cambios' : 'Registrar novedad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialogs ────────────────────────────── */}
      <AlertDialog open={!!deleteAccessTarget} onOpenChange={() => setDeleteAccessTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro de acceso</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el ingreso de &quot;{deleteAccessTarget?.visitor_name}&quot; de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccess} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePkgTarget} onOpenChange={() => setDeletePkgTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar paquete</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el paquete &quot;{deletePkgTarget?.description}&quot; de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePackage} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMinutaTarget} onOpenChange={() => setDeleteMinutaTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrada de minuta</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteMinutaTarget?.title}&quot; de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMinuta} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
