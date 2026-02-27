'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';

export interface AsyncSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface LoadOptionsResult {
  data: AsyncSelectOption[];
  hasMore: boolean;
  total: number;
}

export interface AsyncSearchableSelectProps {
  /** Función que carga opciones del backend (search, page) => Promise */
  loadOptions: (search: string, page: number) => Promise<LoadOptionsResult>;
  value?: string;
  /** Label del valor seleccionado (evita recarga inicial) */
  valueLabel?: string;
  onChange?: (value: string, option?: AsyncSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  clearable?: boolean;
  emptyMessage?: string;
  /** Debounce en ms. Default: 300 */
  debounceMs?: number;
  /** Renderizar dropdown como portal (para contenedores con overflow) */
  usePortal?: boolean;
}

export const AsyncSearchableSelect = React.forwardRef<HTMLDivElement, AsyncSearchableSelectProps>(
  (
    {
      loadOptions,
      value,
      valueLabel,
      onChange,
      placeholder = 'Selecciona...',
      searchPlaceholder = 'Buscar...',
      disabled = false,
      className,
      name,
      clearable = true,
      emptyMessage = 'No se encontraron resultados',
      debounceMs = 300,
      usePortal = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<AsyncSelectOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [selectedOption, setSelectedOption] = React.useState<AsyncSelectOption | null>(
      value && valueLabel ? { value, label: valueLabel } : null
    );

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const currentSearchRef = React.useRef('');
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

    // Cargar opciones del backend
    const fetchOptions = React.useCallback(
      async (search: string, pageNum: number, append = false) => {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        try {
          currentSearchRef.current = search;
          const result = await loadOptions(search, pageNum);

          // Solo actualizar si la búsqueda sigue siendo la misma
          if (currentSearchRef.current === search) {
            if (append) {
              setOptions((prev) => [...prev, ...result.data]);
            } else {
              setOptions(result.data);
            }
            setHasMore(result.hasMore);
            setTotal(result.total);
            setPage(pageNum);
          }
        } catch (error) {
          console.error('[AsyncSelect] Error loading options:', error);
          if (!append) setOptions([]);
          setHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [loadOptions]
    );

    // Debounce búsqueda
    React.useEffect(() => {
      if (!isOpen) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        fetchOptions(searchQuery, 1, false);
      }, debounceMs);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [searchQuery, isOpen, fetchOptions, debounceMs]);

    // Cargar al abrir
    React.useEffect(() => {
      if (isOpen && options.length === 0 && !loading) {
        fetchOptions('', 1, false);
      }
    }, [isOpen]);

    // Cerrar al click fuera
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (containerRef.current && !containerRef.current.contains(target) &&
            (!dropdownRef.current || !dropdownRef.current.contains(target))) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input al abrir
    React.useEffect(() => {
      if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    // Posicionar dropdown como portal
    React.useEffect(() => {
      if (!isOpen || !usePortal || !triggerRef.current) { setDropdownPos(null); return; }
      const update = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        const gap = 4;
        const spaceBelow = window.innerHeight - rect.bottom - gap;
        const openBelow = spaceBelow >= 280 || spaceBelow >= rect.top;
        setDropdownPos({
          ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
          left: rect.left,
          width: Math.max(rect.width, 280),
        });
      };
      update();
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
    }, [isOpen, usePortal]);

    // Reset highlight al cambiar resultados
    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [options]);

    // Infinite scroll
    const handleScroll = React.useCallback(() => {
      if (!listRef.current || loading || loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        fetchOptions(searchQuery, page + 1, true);
      }
    }, [loading, loadingMore, hasMore, searchQuery, page, fetchOptions]);

    const handleSelect = (option: AsyncSelectOption) => {
      setSelectedOption(option);
      onChange?.(option.value, option);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedOption(null);
      onChange?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (options[highlightedIndex]) handleSelect(options[highlightedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };

    // Scroll al highlighted
    React.useEffect(() => {
      if (isOpen && listRef.current?.children[highlightedIndex]) {
        (listRef.current.children[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, isOpen]);

    const displayLabel = selectedOption?.label || (value ? valueLabel : null);

    return (
      <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
        {name && <input type="hidden" name={name} value={value || ''} />}

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
            {clearable && selectedOption && !disabled && (
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={handleClear} />
            )}
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
          </div>
        </button>

        {(() => {
          if (!isOpen) return null;
          const dd = (
            <div
              ref={dropdownRef}
              className={cn(
                "rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg",
                !usePortal && "absolute z-50 mt-1 w-full"
              )}
              style={usePortal && dropdownPos ? {
                position: 'fixed' as const,
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
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {total > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{options.length} de {total}</p>
                )}
              </div>

              <div ref={listRef} className="max-h-60 overflow-y-auto p-1" onScroll={handleScroll}>
                {loading ? (
                  <div className="py-6 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                  </div>
                ) : options.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-sm">{emptyMessage}</div>
                ) : (
                  <>
                    {options.map((opt, i) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                          'hover:bg-gray-100 dark:hover:bg-slate-700',
                          i === highlightedIndex && 'bg-gray-100 dark:bg-slate-700',
                          opt.value === value && 'bg-blue-50 dark:bg-blue-900/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('truncate', opt.value === value && 'text-blue-700 dark:text-blue-400 font-medium')}>
                            {opt.label}
                          </span>
                          {opt.value === value && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                        </div>
                        {opt.description && <p className="text-xs text-gray-500 truncate">{opt.description}</p>}
                      </button>
                    ))}
                    {loadingMore && (
                      <div className="py-2 text-center">
                        <Loader2 className="h-4 w-4 mx-auto animate-spin text-gray-400" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
          return usePortal && dropdownPos ? createPortal(dd, document.body) : dd;
        })()}
      </div>
    );
  }
);

AsyncSearchableSelect.displayName = 'AsyncSearchableSelect';
