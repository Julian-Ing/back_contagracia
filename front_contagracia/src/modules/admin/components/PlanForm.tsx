'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { FuzzySearchInput } from '@/shared/components/ui/fuzzy-search-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { adminService } from '@/modules/admin/services/admin.service';
import type { Plan, Module, CreatePlanDto, UpdatePlanDto } from '@/modules/admin/types';

const REQUIRED_MODULE_KEYS = ['company_profile', 'configurations'];

// Pure recursive helpers (outside component to avoid closure issues)
function collectDependencies(moduleId: string, byId: Record<string, Module>, visited: Set<string>): string[] {
  if (visited.has(moduleId)) return [];
  visited.add(moduleId);
  const mod = byId[moduleId];
  if (!mod?.dependencies?.length) return [];
  const result: string[] = [];
  for (const dep of mod.dependencies) {
    const depId = dep.depends_on?.id || dep.depends_on_id;
    if (depId) {
      result.push(depId);
      result.push(...collectDependencies(depId, byId, visited));
    }
  }
  return result;
}

function collectDependents(moduleId: string, byId: Record<string, Module>, visited: Set<string>): string[] {
  if (visited.has(moduleId)) return [];
  visited.add(moduleId);
  const mod = byId[moduleId];
  if (!mod?.dependents?.length) return [];
  const result: string[] = [];
  for (const dep of mod.dependents) {
    const depId = dep.module?.id || dep.module_id;
    if (depId) {
      result.push(depId);
      result.push(...collectDependents(depId, byId, visited));
    }
  }
  return result;
}

interface PlanFormData {
  name: string;
  description: string;
  price: string;
  max_users: string;
  max_invoices: string;
  max_products: string;
  max_employees: string;
  is_trial: boolean;
  trial_days: string;
  is_active: boolean;
  selected_module_ids: string[];
}

interface PlanFormProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePlanDto | UpdatePlanDto, moduleIds: string[]) => void;
  loading?: boolean;
  modules: Module[];
}

export function PlanForm({ plan, isOpen, onClose, onSave, loading = false, modules }: PlanFormProps) {
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: '0',
    max_users: '1',
    max_invoices: '',
    max_products: '',
    max_employees: '',
    is_trial: false,
    trial_days: '14',
    is_active: true,
    selected_module_ids: [],
  });

  const [moduleSearch, setModuleSearch] = useState('');
  const [filteredModules, setFilteredModules] = useState<Module[]>(modules);
  const [moduleLoading, setModuleLoading] = useState(false);

  const moduleById = useMemo(() => {
    const map: Record<string, Module> = {};
    modules.forEach((m) => { map[m.id] = m; });
    return map;
  }, [modules]);

  const moduleByKey = useMemo(() => {
    const map: Record<string, Module> = {};
    filteredModules.forEach((m) => { map[m.module_key] = m; });
    return map;
  }, [filteredModules]);

  const requiredModuleIds = useMemo(() =>
    REQUIRED_MODULE_KEYS.map((key) => {
      // Buscar en todos los módulos originales, no solo filtrados
      const allModulesMap: Record<string, Module> = {};
      modules.forEach((m) => { allModulesMap[m.module_key] = m; });
      return allModulesMap[key]?.id;
    }).filter(Boolean) as string[],
    [modules]
  );

  // Fetch modules from backend when search changes
  const fetchModules = useCallback(async (search: string) => {
    setModuleLoading(true);
    try {
      const result = await adminService.getAllModules(search || undefined);
      setFilteredModules(result);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setFilteredModules(modules); // Fallback to original modules
    } finally {
      setModuleLoading(false);
    }
  }, [modules]);

  // Effect to fetch modules when search changes
  useEffect(() => {
    if (moduleSearch) {
      fetchModules(moduleSearch);
    } else {
      setFilteredModules(modules);
    }
  }, [moduleSearch, modules, fetchModules]);

  // Dynamic grouping from backend module.group
  const groupedModules = useMemo(() => {
    const groups: Record<string, Module[]> = {};
    const selectableModules = filteredModules.filter(m => !REQUIRED_MODULE_KEYS.includes(m.module_key));
    for (const mod of selectableModules) {
      const group = mod.group || 'Otros';
      if (!groups[group]) groups[group] = [];
      groups[group].push(mod);
    }
    for (const g of Object.values(groups)) g.sort((a, b) => a.sort_order - b.sort_order);
    // Sort groups by minimum sort_order of their modules
    const sortedEntries = Object.entries(groups).sort(
      ([, a], [, b]) => (a[0]?.sort_order ?? 0) - (b[0]?.sort_order ?? 0)
    );
    const sorted: Record<string, Module[]> = {};
    for (const [g, mods] of sortedEntries) {
      sorted[g] = mods;
    }
    return sorted;
  }, [filteredModules]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setModuleSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (plan) {
      const planModuleIds = plan.plan_modules.map((pm) => pm.module_id);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: String(plan.price),
        max_users: String(plan.max_users),
        max_invoices: plan.max_invoices == null ? '' : String(plan.max_invoices),
        max_products: plan.max_products == null ? '' : String(plan.max_products),
        max_employees: plan.max_employees == null ? '' : String(plan.max_employees),
        is_trial: plan.is_trial,
        trial_days: String(plan.trial_days),
        is_active: plan.is_active,
        selected_module_ids: [...new Set([...planModuleIds, ...requiredModuleIds])],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '0',
        max_users: '1',
        max_invoices: '',
        max_products: '',
        max_employees: '',
        is_trial: false,
        trial_days: '14',
        is_active: true,
        selected_module_ids: modules.map((m) => m.id),
      });
    }
  }, [plan, modules, requiredModuleIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSwitchChange = (id: keyof PlanFormData, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selected_module_ids.includes(moduleId);
      if (!isSelected) {
        // Activar: incluir dependencias recursivamente
        const deps = collectDependencies(moduleId, moduleById, new Set());
        return {
          ...prev,
          selected_module_ids: [...new Set([...prev.selected_module_ids, moduleId, ...deps])],
        };
      } else {
        // Desactivar: remover dependientes recursivamente
        const dependents = collectDependents(moduleId, moduleById, new Set());
        const toRemove = new Set([moduleId, ...dependents]);
        return {
          ...prev,
          selected_module_ids: prev.selected_module_ids.filter(
            (id) => !toRemove.has(id) || requiredModuleIds.includes(id)
          ),
        };
      }
    });
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      selected_module_ids: modules.map((m) => m.id),
    }));
  };

  const handleClearModules = () => {
    setFormData((prev) => ({
      ...prev,
      selected_module_ids: [...requiredModuleIds],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allModuleIds = [...new Set([...formData.selected_module_ids, ...requiredModuleIds])];
    const dto: CreatePlanDto | UpdatePlanDto = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price) || 0,
      max_users: parseInt(formData.max_users, 10) || 1,
      max_invoices: formData.max_invoices === '' ? null : parseInt(formData.max_invoices, 10),
      max_products: formData.max_products === '' ? null : parseInt(formData.max_products, 10),
      is_active: formData.is_active,
    };
    onSave(dto, allModuleIds);
  };

  const selectedCount = formData.selected_module_ids.length;
  const totalModules = modules.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {plan ? 'Editar Plan' : 'Crear Nuevo Plan'}
          </DialogTitle>
          <p className="text-sm text-gray-400">
            {plan ? 'Modifique los datos del plan de suscripción' : 'Configure un nuevo plan de suscripción'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-200">
              Nombre del Plan *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-slate-800 border-slate-600 text-gray-100"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="bg-slate-800 border-slate-600 text-gray-100"
              rows={2}
            />
          </div>

          {/* Price and Max Users */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-200">
                Precio Mensual (COP) *
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_users" className="text-gray-200">
                Máx. Usuarios *
              </Label>
              <Input
                id="max_users"
                type="number"
                min="1"
                value={formData.max_users}
                onChange={handleChange}
                required
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_invoices" className="text-gray-200">
                Máx. Facturas
              </Label>
              <Input
                id="max_invoices"
                type="number"
                placeholder="Ilimitado"
                value={formData.max_invoices}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_products" className="text-gray-200">
                Máx. Productos
              </Label>
              <Input
                id="max_products"
                type="number"
                placeholder="Ilimitado"
                value={formData.max_products}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_employees" className="text-gray-200">
                Máx. Empleados
              </Label>
              <Input
                id="max_employees"
                type="number"
                placeholder="Ilimitado"
                value={formData.max_employees}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active" className="text-gray-200 cursor-pointer">
                Plan Activo
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(c) => handleSwitchChange('is_active', c)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_trial" className="text-gray-200 cursor-pointer">
                Plan de Prueba (Trial)
              </Label>
              <Switch
                id="is_trial"
                checked={formData.is_trial}
                onCheckedChange={(c) => handleSwitchChange('is_trial', c)}
              />
            </div>
            {formData.is_trial && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="trial_days" className="text-gray-200">
                  Días de Trial
                </Label>
                <Input
                  id="trial_days"
                  type="number"
                  min="1"
                  value={formData.trial_days}
                  onChange={handleChange}
                  className="bg-slate-900 border-slate-600 text-gray-100"
                />
              </div>
            )}
          </div>

          {/* Modules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-200">Módulos del plan</Label>
                <p className="text-xs text-gray-500">
                  {selectedCount} de {totalModules} seleccionados
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll}>
                  Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleClearModules}>
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <FuzzySearchInput
              value={moduleSearch}
              onChange={setModuleSearch}
              placeholder="Buscar módulos..."
              className="mb-2"
              debounceMs={300}
            />

            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-4">
              {moduleLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
              {!moduleLoading && Object.keys(groupedModules).length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No se encontraron módulos
                </div>
              )}
              {!moduleLoading && Object.entries(groupedModules).map(([group, mods]) => (
                <div key={group}>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    {group}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {mods.map((mod) => {
                      const checked = formData.selected_module_ids.includes(mod.id);
                      return (
                        <button
                          type="button"
                          key={mod.id}
                          className={`flex items-center justify-between p-2 rounded border cursor-pointer text-left ${
                            checked
                              ? 'border-indigo-500/50 bg-indigo-500/10'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                          onClick={() => handleModuleToggle(mod.id)}
                        >
                          <span className="text-sm text-gray-200 truncate pr-2">
                            {mod.module_name}
                          </span>
                          <div
                            className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              checked ? 'bg-indigo-600' : 'bg-slate-600'
                            }`}
                          >
                            <div
                              className={`block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                                checked ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Los módulos &quot;Perfil de Empresa&quot; y &quot;Configuraciones&quot; siempre
              están incluidos. Las dependencias se activan/desactivan automáticamente.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PlanForm;
