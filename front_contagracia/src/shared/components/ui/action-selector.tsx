'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Search, ChevronLeft, ChevronRight, Check, Loader2, X, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { Checkbox } from './checkbox';
import { SearchableSelect } from './searchable-select';
import { useAvailableActions } from '@/modules/company/hooks/useUsers';
import type { PlanAction } from '@/modules/company/types';

export interface ActionSelectorProps {
  selectedActions: Set<string>;
  onChange: (actions: Set<string>) => void;
  className?: string;
  /** Items por página. Default: 50 */
  pageSize?: number;
}

export function ActionSelector({
  selectedActions,
  onChange,
  className,
  pageSize = 50,
}: ActionSelectorProps) {
  const {
    actions,
    modules,
    loading,
    pagination,
    page,
    search,
    setSearch,
    selectedModule,
    setSelectedModule,
    setFilterActionKeys,
    goToPage,
    nextPage,
    prevPage,
  } = useAvailableActions({ limit: pageSize, autoLoad: true });

  // Estado para mostrar solo seleccionados
  const [showOnlySelected, setShowOnlySelected] = React.useState(false);
  // Estado para mostrar panel de seleccionados
  const [showSelectedPanel, setShowSelectedPanel] = React.useState(false);

  // Cuando cambia showOnlySelected, actualizar el filtro del backend
  React.useEffect(() => {
    if (showOnlySelected && selectedActions.size > 0) {
      setFilterActionKeys(Array.from(selectedActions));
    } else {
      setFilterActionKeys(undefined);
    }
  }, [showOnlySelected, selectedActions, setFilterActionKeys]);

  const allVisibleSelected = actions.length > 0 && actions.every((a) => selectedActions.has(a.action_key));

  // Toggle acción seleccionada
  const toggleAction = (actionKey: string) => {
    const next = new Set(selectedActions);
    if (next.has(actionKey)) {
      next.delete(actionKey);
    } else {
      next.add(actionKey);
    }
    onChange(next);
  };

  // Remover acción desde el panel
  const removeAction = (actionKey: string) => {
    const next = new Set(selectedActions);
    next.delete(actionKey);
    onChange(next);
  };

  // Seleccionar/deseleccionar todas las acciones visibles
  const toggleAllVisible = () => {
    const visibleKeys = actions.map((a) => a.action_key);
    const allSelected = visibleKeys.every((key) => selectedActions.has(key));

    const next = new Set(selectedActions);
    if (allSelected) {
      visibleKeys.forEach((key) => next.delete(key));
    } else {
      visibleKeys.forEach((key) => next.add(key));
    }
    onChange(next);
  };

  // Seleccionar/deseleccionar todo un módulo
  const toggleModule = (moduleKey: string) => {
    const moduleActions = actions.filter(a => a.module_key === moduleKey);
    const allModuleSelected = moduleActions.every(a => selectedActions.has(a.action_key));

    const next = new Set(selectedActions);
    if (allModuleSelected) {
      moduleActions.forEach(a => next.delete(a.action_key));
    } else {
      moduleActions.forEach(a => next.add(a.action_key));
    }
    onChange(next);
  };

  // Agrupar acciones por módulo para mostrar
  const groupedActions = React.useMemo(() => {
    const groups = new Map<string, { module_name: string; actions: PlanAction[]; selectedCount: number; totalCount: number }>();
    for (const action of actions) {
      if (!groups.has(action.module_key)) {
        const moduleActionsFromPage = actions.filter(a => a.module_key === action.module_key);
        const selectedCount = moduleActionsFromPage.filter(a => selectedActions.has(a.action_key)).length;
        const totalCount = moduleActionsFromPage.length;

        groups.set(action.module_key, {
          module_name: action.module_name,
          actions: [],
          selectedCount,
          totalCount,
        });
      }
      groups.get(action.module_key)!.actions.push(action);
    }
    return Array.from(groups.entries());
  }, [actions, selectedActions]);

  // Agrupar seleccionados para el panel (usando los datos del servidor)
  const selectedByModule = React.useMemo(() => {
    const groups = new Map<string, { module_name: string; actions: { key: string; name: string }[] }>();

    for (const action of actions) {
      if (selectedActions.has(action.action_key)) {
        if (!groups.has(action.module_key)) {
          groups.set(action.module_key, { module_name: action.module_name, actions: [] });
        }
        groups.get(action.module_key)!.actions.push({
          key: action.action_key,
          name: action.action_name
        });
      }
    }

    return Array.from(groups.entries());
  }, [actions, selectedActions]);

  return (
    <div className={cn('border rounded-lg bg-white dark:bg-slate-800', className)}>
      {/* Panel de acciones seleccionadas (colapsable) */}
      {selectedActions.size > 0 && (
        <div className="border-b">
          <button
            type="button"
            onClick={() => setShowSelectedPanel(!showSelectedPanel)}
            className="w-full px-3 py-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedActions.size} permisos asignados
              </span>
            </div>
            {showSelectedPanel ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </button>

          {showSelectedPanel && (
            <div className="max-h-48 overflow-y-auto p-2 bg-blue-50/50 dark:bg-blue-900/20">
              {selectedByModule.length > 0 ? (
                selectedByModule.map(([moduleKey, group]) => (
                  <div key={moduleKey} className="mb-2">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      {group.module_name}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.actions.map(action => (
                        <span
                          key={action.key}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs rounded-full"
                        >
                          {action.name}
                          <button
                            type="button"
                            onClick={() => removeAction(action.key)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  Activa "Solo asignados" para ver los permisos seleccionados
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header con búsqueda y filtros */}
      <div className="p-3 border-b space-y-2">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar permisos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Filtro por módulo y toggle de solo seleccionados */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              options={[
                { value: '', label: 'Todos los módulos' },
                ...modules.map((mod) => ({
                  value: mod.module_key,
                  label: mod.module_name,
                })),
              ]}
              value={selectedModule}
              onChange={setSelectedModule}
              placeholder="Todos los módulos"
              searchPlaceholder="Buscar módulo..."
              clearable={false}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowOnlySelected(!showOnlySelected)}
            disabled={selectedActions.size === 0 && !showOnlySelected}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              showOnlySelected
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600",
              selectedActions.size === 0 && !showOnlySelected && "opacity-50 cursor-not-allowed"
            )}
          >
            {showOnlySelected ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showOnlySelected ? 'Ver todos' : 'Solo asignados'}
          </button>
        </div>

        {/* Info de selección */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {showOnlySelected ? `${pagination.total} asignados` : `${pagination.total} permisos disponibles`}
          </span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {selectedActions.size} seleccionados en total
          </span>
        </div>
      </div>

      {/* Seleccionar todas visibles - FUERA del scroll */}
      {actions.length > 0 && (
        <div className="px-3 py-2 border-b bg-gray-100 dark:bg-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={toggleAllVisible}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {allVisibleSelected ? 'Deseleccionar página' : 'Seleccionar página'}
            </span>
            <span className="text-xs text-gray-500">
              ({actions.length} items)
            </span>
          </label>
        </div>
      )}

      {/* Lista de acciones */}
      <div className="max-h-64 overflow-y-auto">
        {loading && actions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Cargando...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {showOnlySelected ? 'No hay permisos asignados' : 'No se encontraron acciones'}
          </div>
        ) : (
          <>
            {/* Acciones agrupadas por módulo */}
            {groupedActions.map(([moduleKey, group]) => {
              const allModuleSelected = group.selectedCount === group.totalCount && group.totalCount > 0;
              return (
                <div key={moduleKey}>
                  {/* Header del módulo con botón de seleccionar todo */}
                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        {group.module_name}
                      </span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        group.selectedCount > 0
                          ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                          : "bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-400"
                      )}>
                        {group.selectedCount}/{group.totalCount}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleModule(moduleKey)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors",
                        allModuleSelected
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500 border border-gray-300 dark:border-slate-500"
                      )}
                    >
                      {allModuleSelected ? (
                        <>
                          <Minus className="h-3 w-3" />
                          Quitar
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Agregar
                        </>
                      )}
                    </button>
                  </div>

                  {/* Acciones del módulo */}
                  {group.actions.map((action) => {
                    const isSelected = selectedActions.has(action.action_key);
                    return (
                      <label
                        key={action.action_key}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2 cursor-pointer',
                          'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                          isSelected && 'bg-blue-50 dark:bg-blue-900/40'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAction(action.action_key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {action.action_name}
                            </span>
                            {isSelected && (
                              <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {action.action_key}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 dark:bg-slate-800">
          <span className="text-xs text-gray-500">
            Página {page} de {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevPage}
              disabled={page <= 1 || loading}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => goToPage(pageNum)}
                    disabled={loading}
                    className={cn(
                      'w-7 h-7 text-xs rounded',
                      pageNum === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={nextPage}
              disabled={page >= pagination.totalPages || loading}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
