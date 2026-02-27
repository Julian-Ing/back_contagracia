'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Users as UsersIcon,
  FileText as FileTextIcon,
  LayoutGrid,
  Package,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
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
import toast from 'react-hot-toast';
import { PlanForm } from '@/modules/admin/components';
import { adminService } from '@/modules/admin/services/admin.service';
import type { Plan, Module, CreatePlanDto, UpdatePlanDto } from '@/modules/admin/types';

// Module color classes by key prefix
const getModuleColor = (key: string): string => {
  if (['sales', 'purchases', 'inventory', 'expenses', 'third_parties', 'ar_ap', 'quotes', 'purchase_orders', 'inventory_management'].includes(key)) {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
  }
  if (['point_of_sale', 'cash_registers'].includes(key)) {
    return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
  }
  if (['core_hr', 'hr_payroll', 'hr_expenses', 'hr_performance', 'time_attendance', 'leaves_vacations'].includes(key)) {
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
  }
  if (['dashboard', 'company_profile', 'configurations', 'user_management'].includes(key)) {
    return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700';
  }
  if (['accounting', 'banking', 'tax', 'fixed_assets', 'cost_centers', 'closing', 'exogenous', 'reports'].includes(key)) {
    return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700';
  }
  return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600';
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, modulesData] = await Promise.all([
        adminService.getPlans(true),
        adminService.getAllModules(),
      ]);
      setPlans(plansData);
      setModules(modulesData);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return plans.filter((p) => {
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? p.is_active : !p.is_active);
      const matchModule =
        !moduleFilter ||
        p.plan_modules.some((pm) => pm.module.module_key === moduleFilter);
      return matchSearch && matchStatus && matchModule;
    });
  }, [plans, searchTerm, statusFilter, moduleFilter]);

  const handleDelete = (plan: Plan) => {
    setPlanToDelete(plan);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    try {
      await adminService.deletePlan(planToDelete.id);
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      toast.success('Plan eliminado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el plan');
    }
    setPlanToDelete(null);
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const handleSavePlan = async (planData: CreatePlanDto | UpdatePlanDto, moduleIds: string[]) => {
    setSaving(true);
    try {
      let savedPlan: Plan;
      if (editingPlan) {
        savedPlan = await adminService.updatePlan(editingPlan.id, planData);
        // Update modules
        await adminService.setPlanModules(editingPlan.id, { module_ids: moduleIds });
      } else {
        savedPlan = await adminService.createPlan(planData as CreatePlanDto);
        // Set modules
        await adminService.setPlanModules(savedPlan.id, { module_ids: moduleIds });
      }
      // Refresh to get updated plan_modules
      await fetchData();
      setIsFormOpen(false);
      setEditingPlan(null);
      toast.success(editingPlan ? 'Plan actualizado correctamente' : 'Plan creado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setModuleFilter('');
    setStatusFilter('all');
  };

  const moduleOptions = useMemo(() => [
    { value: '', label: 'Todos' },
    ...modules
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ value: m.module_key, label: m.module_name })),
  ], [modules]);

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  const getModulesList = (plan: Plan) =>
    plan.plan_modules
      .map((pm) => pm.module)
      .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Planes</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Crea y administra los planes de suscripción para tus clientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Nuevo Plan
          </Button>
        </div>
      </header>

      {/* Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Planes de Suscripción</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total: {plans.length} · Coincidencias: {filteredPlans.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Tarjetas
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabla
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-500 dark:text-gray-400">Buscar</Label>
              <Input
                placeholder="Nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500 dark:text-gray-400">Módulo</Label>
              <Select
                value={moduleFilter}
                onChange={setModuleFilter}
                placeholder="Todos"
                options={moduleOptions}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500 dark:text-gray-400">Estado</Label>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Todos"
                options={statusOptions}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                  <TableHead className="text-gray-700 dark:text-gray-300">Nombre</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Precio</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Máx. Usuarios</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Máx. Facturas</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Suscripciones</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Estado</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Módulos</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => {
                  const planModules = getModulesList(plan);
                  const visibleModules = planModules.slice(0, 4);
                  const restCount = planModules.length - visibleModules.length;
                  return (
                    <TableRow key={plan.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                      <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                        <div className="flex items-center gap-2">
                          {plan.name}
                          {plan.is_trial && (
                            <Badge className="bg-indigo-600 text-white border-indigo-500">
                              Trial
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(Number(plan.price))}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {plan.max_users === -1 ? 'Ilimitados' : plan.max_users}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {plan.max_invoices == null ? 'Ilimitadas' : plan.max_invoices}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {plan._count?.subscriptions ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            plan.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30'
                          }
                        >
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {visibleModules.map((mod) => (
                            <span
                              key={mod.id}
                              className={`px-2 py-0.5 rounded-full text-[11px] border ${getModuleColor(mod.module_key)}`}
                            >
                              {mod.module_name}
                            </span>
                          ))}
                          {restCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] border bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600">
                              +{restCount}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                          >
                            <DropdownMenuItem
                              className="text-gray-800 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:text-gray-100 cursor-pointer"
                              onClick={() => handleEdit(plan)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-red-300 cursor-pointer"
                              onClick={() => handleDelete(plan)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Borrar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => {
                const planModules = getModulesList(plan);
                const visibleModules = planModules.slice(0, 8);
                const restCount = planModules.length - visibleModules.length;
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {plan.name}
                          {plan.is_trial && (
                            <Badge className="bg-indigo-600 text-white border-indigo-500">
                              Trial
                            </Badge>
                          )}
                        </div>
                        {plan.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(plan.price))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">/ mes</div>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/50">
                        <UsersIcon className="h-4 w-4 text-gray-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">Usuarios</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.max_users === -1 ? '∞' : plan.max_users}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/50">
                        <FileTextIcon className="h-4 w-4 text-gray-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">Facturas</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.max_invoices == null ? '∞' : plan.max_invoices}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/50">
                        <Package className="h-4 w-4 text-gray-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">Productos</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.max_products == null ? '∞' : plan.max_products}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subscriptions count */}
                    {plan._count && (
                      <div className="mt-2 text-xs text-gray-500">
                        {plan._count.subscriptions} suscripción{plan._count.subscriptions !== 1 ? 'es' : ''}
                      </div>
                    )}

                    {/* Modules */}
                    {planModules.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {visibleModules.map((mod) => (
                          <span
                            key={mod.id}
                            className={`px-2 py-0.5 rounded-full text-[11px] border ${getModuleColor(mod.module_key)}`}
                          >
                            {mod.module_name}
                          </span>
                        ))}
                        {restCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] border bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600">
                            +{restCount}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between">
                      <Badge
                        className={
                          plan.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {plan.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-900 hover:bg-red-800 text-red-300"
                          onClick={() => handleDelete(plan)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Plan Form Modal */}
      <PlanForm
        plan={editingPlan}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
        loading={saving}
        modules={modules}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Estás realmente seguro?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Esta acción es irreversible. Se borrará permanentemente el plan
              &quot;{planToDelete?.name}&quot;.
              {planToDelete?._count?.subscriptions ? (
                <span className="block mt-2 text-red-400">
                  Este plan tiene {planToDelete._count.subscriptions} suscripción(es) activa(s).
                  No se podrá eliminar hasta reasignarlas.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Sí, borrar plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
