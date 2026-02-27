'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';
import { taxesService } from '@/modules/taxes/services/taxes.service';

interface TaxOption {
  id: string;
  name: string;
  rate: number;
  per_unit_amount: number | null;
  tax_type_id: number;
}

export interface TaxSelectChangeData {
  name: string;
  rate: number;
  perUnitAmount: number | null;
  taxTypeId: number;
}

export interface TaxSelectProps {
  value?: string;
  valueLabel?: string;
  onChange?: (id: string, label: string, data: TaxSelectChangeData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  /** Incluir solo estos tax_type_id */
  includeTypeIds?: number[];
  /** Excluir estos tax_type_id */
  excludeTypeIds?: number[];
  /** true=impuestos, false=retenciones, undefined=todos */
  isTax?: boolean;
  /** Excluir impuestos a mayor costo (is_cost_tax=true) */
  excludeCostTax?: boolean;
  usePortal?: boolean;
}

export const TaxSelect = React.forwardRef<HTMLDivElement, TaxSelectProps>(
  (
    {
      value,
      valueLabel,
      onChange,
      placeholder = 'Seleccionar impuesto',
      disabled = false,
      className,
      clearable = true,
      includeTypeIds,
      excludeTypeIds,
      isTax,
      excludeCostTax,
      usePortal = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<TaxOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedLabel, setSelectedLabel] = React.useState(valueLabel || '');

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
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
        const data = await taxesService.getForSelect({
          search: search || undefined,
          is_tax: isTax,
          includeTypeIds,
          excludeTypeIds,
          excludeCostTax,
        });
        setOptions(data);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, [isTax, includeTypeIds, excludeTypeIds, excludeCostTax]);

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
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Portal event isolation: scroll, focus, pointer (needed inside Dialogs)
    React.useEffect(() => {
      const el = dropdownRef.current;
      if (!isOpen || !usePortal || !el) return;

      const stopScroll = (e: Event) => e.stopPropagation();
      el.addEventListener('wheel', stopScroll, { passive: true });
      el.addEventListener('touchmove', stopScroll, { passive: true });

      const handleFocusIn = (e: FocusEvent) => {
        if (el.contains(e.target as Node)) e.stopImmediatePropagation();
      };
      const handleFocusOut = (e: FocusEvent) => {
        if (el.contains(e.relatedTarget as Node)) e.stopImmediatePropagation();
      };
      document.addEventListener('focusin', handleFocusIn, true);
      document.addEventListener('focusout', handleFocusOut, true);

      const rafId = requestAnimationFrame(() => inputRef.current?.focus());

      return () => {
        el.removeEventListener('wheel', stopScroll);
        el.removeEventListener('touchmove', stopScroll);
        document.removeEventListener('focusin', handleFocusIn, true);
        document.removeEventListener('focusout', handleFocusOut, true);
        cancelAnimationFrame(rafId);
      };
    }, [isOpen, usePortal, dropdownPos]);

    // Focus input on open (non-portal mode)
    React.useEffect(() => {
      if (isOpen && !usePortal && inputRef.current) inputRef.current.focus();
    }, [isOpen, usePortal]);

    // Portal positioning
    React.useEffect(() => {
      if (!isOpen || !usePortal || !triggerRef.current) { setDropdownPos(null); return; }
      const update = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        const gap = 4;
        const spaceBelow = window.innerHeight - rect.bottom - gap;
        const openBelow = spaceBelow >= 260 || spaceBelow >= rect.top;
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

    const handleSelect = (opt: TaxOption) => {
      const label = opt.per_unit_amount != null
        ? `${opt.name} ($${opt.per_unit_amount}/ud)`
        : `${opt.name} (${opt.rate}%)`;
      setSelectedLabel(label);
      onChange?.(opt.id, label, { name: opt.name, rate: opt.rate, perUnitAmount: opt.per_unit_amount, taxTypeId: opt.tax_type_id });
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedLabel('');
      onChange?.('', '', { name: '', rate: 0, perUnitAmount: null, taxTypeId: 0 });
    };

    const displayLabel = selectedLabel || (value ? valueLabel : null);

    const dropdown = (
      <div
        ref={dropdownRef}
        onPointerDown={usePortal ? (e) => e.nativeEvent.stopPropagation() : undefined}
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
          pointerEvents: 'auto' as const,
        } : undefined}
      >
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar impuesto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="py-6 text-center text-gray-500">
              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            </div>
          ) : options.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">No se encontraron impuestos</div>
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
                    {opt.per_unit_amount != null ? `${opt.name} ($${opt.per_unit_amount}/ud)` : `${opt.name} (${opt.rate}%)`}
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

TaxSelect.displayName = 'TaxSelect';
