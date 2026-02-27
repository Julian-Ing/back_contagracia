'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  Loader2,
  MoreHorizontal,
  Search,
  X,
  Tags,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  LogIn,
  Edit,
  UserX,
  UserCheck,
  Trash2,
} from 'lucide-react';
import type { Company, CompanyCategory, Plan, CategoryWithCount, ManageSubscriptionDto } from '@/modules/admin';
import { adminService } from '@/modules/admin/services/admin.service';
import { differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 15;

function getExpirationStatus(expirationDate: string | undefined) {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const daysUntilExpiration = differenceInDays(expDate, today);

  if (daysUntilExpiration < 0) {
    return {
      status: 'expired',
      daysUntilExpiration,
      label: 'Venció:',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      Icon: AlertTriangle,
    };
  } else if (daysUntilExpiration <= 8) {
    return {
      status: 'expiring-soon',
      daysUntilExpiration,
      label: 'Vencerá:',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      Icon: Clock,
    };
  }

  return {
    status: 'active',
    daysUntilExpiration,
    label: 'Vencerá:',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    Icon: null,
  };
}


function getStatusBadgeClass(status: string): string {
  return status === 'active'
    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30';
}

// ===== Subscription Modal =====
interface SubscriptionModalProps {
  company: Company;
  plans: Plan[];
  onSave: (data: ManageSubscriptionDto) => void;
  onClose: () => void;
  loading: boolean;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ company, plans, onSave, onClose, loading }) => {
  const [planId, setPlanId] = useState(company.plan_id || '');
  const [endsAt, setEndsAt] = useState(
    company.subscription_ends_at ? company.subscription_ends_at.split('T')[0] : ''
  );
  const [userPlus, setUserPlus] = useState(company.user_plus ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      plan_id: planId,
      ends_at: endsAt,
      user_plus: userPlus,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            Gestionar Suscripción
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {company.company_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-gray-800 dark:text-gray-200">Plan</Label>
            <Select
              value={planId}
              onChange={setPlanId}
              placeholder="Seleccionar plan"
              options={plans.map((p) => ({ value: p.id, label: `${p.name} - $${p.price}` }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-800 dark:text-gray-200">Fecha de vencimiento</Label>
            <DatePicker
              value={endsAt}
              onChange={(v) => setEndsAt(v)}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-800 dark:text-gray-200">Usuarios extra</Label>
            <Input
              type="number"
              min={0}
              value={userPlus}
              onChange={(e) => setUserPlus(parseInt(e.target.value) || 0)}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !planId || !endsAt}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ===== Category Editor Dialog =====
interface CategoryEditorProps {
  company: Company;
  allCategories: CategoryWithCount[];
  onSave: (categoryIds: string[]) => void;
  onClose: () => void;
  loading: boolean;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({ company, allCategories, onSave, onClose, loading }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    (company.categories || []).map((c) => c.id)
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            Categorías
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {company.company_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
          {allCategories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay categorías creadas.</p>
          ) : (
            allCategories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded">
                <Checkbox
                  checked={selectedIds.includes(cat.id)}
                  onCheckedChange={() => toggle(cat.id)}
                />
                <Badge style={{ backgroundColor: cat.color, color: '#fff' }} className="text-xs">
                  {cat.name}
                </Badge>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(selectedIds)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== Main Page =====
export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryWithCount[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [companyToManageSub, setCompanyToManageSub] = useState<Company | null>(null);
  const [companyToEditCategories, setCompanyToEditCategories] = useState<Company | null>(null);
  const [companyToImpersonate, setCompanyToImpersonate] = useState<Company | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      if (searchTerm) params.search = searchTerm;
      if (expirationFilter !== 'all') params.expiration = expirationFilter;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;

      const result = await adminService.getCompanies(params);
      setCompanies(result.data);
      setTotalCompanies(result.meta.total);
      setTotalFiltered(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast.error('Error al cargar las compañías');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, expirationFilter, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await adminService.getCategories();
      setAllCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await adminService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchPlans();
  }, [fetchCategories, fetchPlans]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, expirationFilter, categoryFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setExpirationFilter('all');
    setCategoryFilter('all');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const hasActiveFilters = searchTerm || expirationFilter !== 'all' || categoryFilter !== 'all';

  // ===== Action Handlers =====

  const handleStatusChange = async (company: Company) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.updateCompanyStatus(company.id, newStatus);
      toast.success(`Compañía ${newStatus === 'active' ? 'activada' : 'inactivada'}`);
      await fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado');
    }
  };

  const handleSaveSubscription = async (data: ManageSubscriptionDto) => {
    if (!companyToManageSub) return;
    setActionLoading(true);
    try {
      await adminService.manageSubscription(companyToManageSub.id, data);
      toast.success('Suscripción actualizada exitosamente');
      setCompanyToManageSub(null);
      await fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al gestionar la suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCategories = async (categoryIds: string[]) => {
    if (!companyToEditCategories) return;
    setActionLoading(true);
    try {
      await adminService.assignCategories(companyToEditCategories.id, categoryIds);
      toast.success('Categorías actualizadas');
      setCompanyToEditCategories(null);
      await fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al asignar categorías');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    setActionLoading(true);
    try {
      await adminService.deleteCompany(companyToDelete.id);
      toast.success('Compañía eliminada exitosamente');
      setCompanyToDelete(null);
      await fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar la compañía');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!companyToImpersonate) return;
    setActionLoading(true);
    try {
      const result = await adminService.impersonateCompany(companyToImpersonate.id);
      // Store data in localStorage for the impersonate page to pick up
      localStorage.setItem('pending_impersonation', JSON.stringify(result));
      window.open('/auth/impersonate', '_blank');
      toast.success(`Accediendo como ${companyToImpersonate.company_name}`);
      setCompanyToImpersonate(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al acceder como compañía');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Compañías</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Visualiza y administra todas las compañías y sus suscripciones.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchCompanies}
          disabled={loading}
          className="border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white h-10 w-10"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </Button>
      </header>

      <Card className="bg-transparent border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Lista de Compañías</CardTitle>
          <CardDescription className="text-gray-400 dark:text-slate-500">
            Total de compañías: {totalCompanies} | Mostrando: {companies.length}
          </CardDescription>

          {/* Filtros */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div className="space-y-2">
                <Label htmlFor="search-input" className="text-sm text-gray-500 dark:text-slate-400">
                  Buscar compañía
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    id="search-input"
                    placeholder="Buscar por empresa, NIT o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-slate-500 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtro por vencimiento */}
              <div className="space-y-2">
                <Label htmlFor="expiration-filter" className="text-sm text-gray-500 dark:text-slate-400">
                  Filtrar por vencimiento
                </Label>
                <Select
                  value={expirationFilter}
                  onChange={setExpirationFilter}
                  placeholder="Todos los vencimientos"
                  options={[
                    { value: 'all', label: 'Todos los vencimientos' },
                    { value: 'expired', label: 'Vencidas' },
                    { value: '30', label: 'Vencen en 30 días' },
                    { value: '60', label: 'Vencen en 60 días' },
                    { value: '90', label: 'Vencen en 90 días' },
                    { value: 'more90', label: 'Más de 90 días' },
                  ]}
                />
              </div>

              {/* Filtro por categoría */}
              <div className="space-y-2">
                <Label htmlFor="category-filter" className="text-sm text-gray-500 dark:text-slate-400">
                  Filtrar por categoría
                </Label>
                <Select
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder="Todas las categorías"
                  options={[
                    { value: 'all', label: 'Todas las categorías' },
                    ...allCategories.map((cat) => ({ value: cat.id, label: cat.name })),
                  ]}
                />
              </div>
            </div>

            {/* Botón limpiar filtros */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-slate-400">Empresa</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400">Plan</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400">Categorías</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-center">Estado</TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const expStatus = getExpirationStatus(company.subscription_ends_at);

                    return (
                      <TableRow
                        key={company.id}
                        className="border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800/30"
                      >
                        {/* Empresa */}
                        <TableCell>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {company.company_name || (
                              <Badge className="bg-red-500/20 text-red-400">Sin registrar</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{company.email}</div>
                          {company.company_nit && (
                            <div className="text-xs text-gray-400 dark:text-slate-500">NIT: {company.company_nit}</div>
                          )}
                          {company.company_phone && (
                            <div className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {company.company_phone}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                            Registrado: {formatDate(company.user_created_at)}
                          </div>
                        </TableCell>

                        {/* Plan */}
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">{company.plan_name || 'N/A'}</span>
                            {expStatus && (
                              <span className={`text-xs ${expStatus.color}`}>
                                {expStatus.label} {formatDate(company.subscription_ends_at!)}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Categorías */}
                        <TableCell>
                          <div
                            className="cursor-pointer"
                            onClick={() => setCompanyToEditCategories(company)}
                          >
                            {(company.categories || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {company.categories!.map((cat) => (
                                  <Badge
                                    key={cat.id}
                                    style={{ backgroundColor: cat.color, color: '#fff' }}
                                    className="text-xs"
                                  >
                                    {cat.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500 text-xs flex items-center gap-1 hover:text-indigo-400">
                                <Tags className="h-3 w-3" />
                                Sin categorías
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="text-center">
                          <Badge className={getStatusBadgeClass(company.status)}>
                            {company.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                              >
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                            >
                              <DropdownMenuItem
                                onClick={() => setCompanyToImpersonate(company)}
                                className="text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:focus:text-white cursor-pointer"
                              >
                                <LogIn className="mr-2 h-4 w-4" />
                                Acceder como Compañía
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                              <DropdownMenuItem
                                onClick={() => setCompanyToManageSub(company)}
                                className="text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:focus:text-white cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Gestionar Suscripción
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setCompanyToEditCategories(company)}
                                className="text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:focus:text-white cursor-pointer"
                              >
                                <Tags className="mr-2 h-4 w-4" />
                                Asignar Categorías
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(company)}
                                className="text-gray-700 dark:text-slate-300 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:focus:text-white cursor-pointer"
                              >
                                {company.status === 'active' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Inactivar Compañía
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activar Compañía
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                              <DropdownMenuItem
                                onClick={() => setCompanyToDelete(company)}
                                className="text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Borrar Compañía
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Empty state */}
              {companies.length === 0 && !loading && (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-slate-400">No se encontraron compañías.</p>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    Página {currentPage} de {totalPages} ({totalFiltered} resultados)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Subscription Modal */}
      {companyToManageSub && (
        <SubscriptionModal
          company={companyToManageSub}
          plans={plans}
          onSave={handleSaveSubscription}
          onClose={() => setCompanyToManageSub(null)}
          loading={actionLoading}
        />
      )}

      {/* Category Editor Dialog */}
      {companyToEditCategories && (
        <CategoryEditor
          company={companyToEditCategories}
          allCategories={allCategories}
          onSave={handleSaveCategories}
          onClose={() => setCompanyToEditCategories(null)}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!companyToDelete} onOpenChange={() => setCompanyToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Eliminar compañía?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se eliminará <strong className="text-gray-800 dark:text-gray-200">{companyToDelete?.company_name}</strong> y todos sus datos asociados (suscripciones, categorías, etc.).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate Confirmation */}
      <AlertDialog open={!!companyToImpersonate} onOpenChange={() => setCompanyToImpersonate(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Acceder como esta compañía?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Se generará un token temporal para acceder como <strong className="text-gray-800 dark:text-gray-200">{companyToImpersonate?.company_name}</strong>.
              Se abrirá en una nueva pestaña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleImpersonate}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <LogIn className="mr-2 h-4 w-4" />
              Acceder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
