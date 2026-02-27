'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2, Plus } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { categoriesService } from '@/modules/inventory/services/categories.service';
import toast from 'react-hot-toast';

interface CategoryOption {
  id: string;
  name: string;
}

export interface CategorySelectProps {
  value?: string;
  valueLabel?: string;
  onChange?: (value: string, label: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  usePortal?: boolean;
}

export const CategorySelect = React.forwardRef<HTMLDivElement, CategorySelectProps>(
  (
    {
      value,
      valueLabel,
      onChange,
      placeholder = 'Seleccionar categoría',
      disabled = false,
      className,
      clearable = true,
      usePortal = false,
    },
    ref
  ) => {
    const { can } = usePermissions();
    const canCreate = can('inventory.categories.create');

    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<CategoryOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedLabel, setSelectedLabel] = React.useState(valueLabel || '');

    // Inline create state
    const [showCreateInput, setShowCreateInput] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [creating, setCreating] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const createInputRef = React.useRef<HTMLInputElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const [dropdownPos, setDropdownPos] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

    // Sync label from parent
    React.useEffect(() => {
      if (valueLabel !== undefined) setSelectedLabel(valueLabel);
    }, [valueLabel]);

    const fetchOptions = React.useCallback(async (search: string) => {
      setLoading(true);
      try {
        const data = await categoriesService.getForSelect(search || undefined);
        setOptions(data);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, []);

    // Debounce search
    React.useEffect(() => {
      if (!isOpen) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchOptions(searchQuery), 250);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, isOpen, fetchOptions]);

    // Load on open
    React.useEffect(() => {
      if (isOpen && options.length === 0 && !loading) fetchOptions('');
    }, [isOpen]);

    // Close on click outside
    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (containerRef.current && !containerRef.current.contains(target) &&
            (!dropdownRef.current || !dropdownRef.current.contains(target))) {
          setIsOpen(false);
          setSearchQuery('');
          setShowCreateInput(false);
          setNewCategoryName('');
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus input on open
    React.useEffect(() => {
      if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    // Focus create input when shown
    React.useEffect(() => {
      if (showCreateInput && createInputRef.current) createInputRef.current.focus();
    }, [showCreateInput]);

    // Portal positioning
    React.useEffect(() => {
      if (!isOpen || !usePortal || !triggerRef.current) { setDropdownPos(null); return; }
      const update = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        const gap = 4;
        const spaceBelow = window.innerHeight - rect.bottom - gap;
        const openBelow = spaceBelow >= 300 || spaceBelow >= rect.top;
        setDropdownPos({
          ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
          left: rect.left,
          width: Math.max(rect.width, 260),
        });
      };
      update();
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
    }, [isOpen, usePortal]);

    const handleSelect = (opt: CategoryOption) => {
      setSelectedLabel(opt.name);
      onChange?.(opt.id, opt.name);
      setIsOpen(false);
      setSearchQuery('');
      setShowCreateInput(false);
      setNewCategoryName('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedLabel('');
      onChange?.('', '');
    };

    const handleCreate = async () => {
      const trimmed = newCategoryName.trim();
      if (!trimmed) return;

      setCreating(true);
      try {
        const created = await categoriesService.create({ name: trimmed });
        toast.success('Categoría creada');
        // Auto-select the new category
        handleSelect({ id: created.id, name: created.name });
        // Refresh list
        fetchOptions('');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error creando categoría');
      } finally {
        setCreating(false);
      }
    };

    const handleCreateKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreate();
      } else if (e.key === 'Escape') {
        setShowCreateInput(false);
        setNewCategoryName('');
      }
    };

    const displayLabel = selectedLabel || (value ? valueLabel : null);

    const dropdown = (
      <div
        ref={dropdownRef}
        className={cn(
          "rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg",
          !usePortal && "absolute z-50 mt-1 w-full"
        )}
        style={usePortal && dropdownPos ? {
          position: 'fixed',
          ...(dropdownPos.top !== undefined ? { top: dropdownPos.top } : {}),
          ...(dropdownPos.bottom !== undefined ? { bottom: dropdownPos.bottom } : {}),
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 9999,
        } : undefined}
      >
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {canCreate && (
            <div className="mt-2">
              {showCreateInput ? (
                <div className="flex gap-1">
                  <input
                    ref={createInputRef}
                    type="text"
                    placeholder="Nombre de categoría..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    className="flex-1 h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    disabled={creating}
                  />
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !newCategoryName.trim()}
                    className="h-8 px-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateInput(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Plus className="h-3 w-3" />
                  Nueva categoría
                </button>
              )}
            </div>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="py-6 text-center text-gray-500">
              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            </div>
          ) : options.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">No se encontraron categorías</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-slate-700',
                  opt.id === value && 'bg-blue-50 dark:bg-blue-900/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('truncate', opt.id === value && 'text-blue-700 dark:text-blue-400 font-medium')}>
                    {opt.name}
                  </span>
                  {opt.id === value && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            displayLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          <span className="truncate flex-1 text-left">{displayLabel || placeholder}</span>
          <div className="flex items-center gap-1">
            {clearable && selectedLabel && !disabled && (
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={handleClear} />
            )}
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
          </div>
        </button>
        {isOpen && (usePortal && dropdownPos ? createPortal(dropdown, document.body) : dropdown)}
      </div>
    );
  }
);

CategorySelect.displayName = 'CategorySelect';
