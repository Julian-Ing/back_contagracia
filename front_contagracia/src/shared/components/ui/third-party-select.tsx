'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2, Plus } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { companyClient } from '@/shared/services/api/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ThirdPartyForm } from '@/modules/third-parties';

export interface ThirdPartyOption {
  id: string;
  name: string;
  identification_number: string;
  roles: string[];
}

export interface ThirdPartySelectProps {
  value?: string;
  valueLabel?: string;
  onChange?: (id: string, thirdParty?: ThirdPartyOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  emptyMessage?: string;
  pageSize?: number;
  excludeRoles?: string[];
  /** Filtrar solo terceros que tengan al menos uno de estos roles */
  includeRoles?: string[];
  /** Renderizar dropdown como portal (para contenedores con overflow) */
  usePortal?: boolean;
}

export const ThirdPartySelect = React.forwardRef<HTMLDivElement, ThirdPartySelectProps>(
  (
    {
      value,
      valueLabel,
      onChange,
      placeholder = 'Seleccionar tercero...',
      searchPlaceholder = 'Buscar por nombre o identificación...',
      disabled = false,
      className,
      name,
      emptyMessage = 'No se encontraron terceros',
      pageSize = 50,
      excludeRoles,
      includeRoles,
      usePortal = false,
    },
    ref
  ) => {
    const { can } = usePermissions();
    const canCreate = can('third_parties.create');

    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<ThirdPartyOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [selectedOption, setSelectedOption] = React.useState<ThirdPartyOption | null>(null);
    const [showCreateModal, setShowCreateModal] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const currentSearchRef = React.useRef('');
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

    // Sincronizar opción seleccionada cuando cambia value/valueLabel externamente
    React.useEffect(() => {
      if (value && valueLabel) {
        if (selectedOption?.id !== value) {
          const parts = valueLabel.split(' - ');
          setSelectedOption({
            id: value,
            name: parts.length > 1 ? parts.slice(1).join(' - ') : valueLabel,
            identification_number: parts[0] || '',
            roles: [],
          });
        }
      } else if (!value) {
        setSelectedOption(null);
      }
    }, [value, valueLabel]);

    // Cargar terceros del backend
    const fetchThirdParties = React.useCallback(
      async (search: string, pageNum: number, append = false) => {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        try {
          currentSearchRef.current = search;

          const params: Record<string, string> = {
            page: pageNum.toString(),
            limit: pageSize.toString(),
            is_active: 'true',
          };

          if (search) params.search = search;
          if (includeRoles?.length) params.include_roles = includeRoles.join(',');
          if (excludeRoles?.length) params.exclude_roles = excludeRoles.join(',');

          const response = await companyClient.get('/third-parties', { params });
          const result = response.data;

          if (currentSearchRef.current === search) {
            const thirdParties: ThirdPartyOption[] = result.data.map((tp: any) => ({
              id: tp.id,
              name: tp.name || `${tp.first_name || ''} ${tp.first_surname || ''}`.trim(),
              identification_number: tp.identification_number,
              roles: tp.roles || [],
            }));

            if (append) {
              setOptions((prev) => [...prev, ...thirdParties]);
            } else {
              setOptions(thirdParties);
            }
            setHasMore(result.hasMore || (result.page < result.totalPages));
            setTotal(result.total);
            setPage(pageNum);
          }
        } catch (error) {
          console.error('[ThirdPartySelect] Error loading:', error);
          if (!append) setOptions([]);
          setHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [pageSize]
    );

    // Debounce búsqueda
    React.useEffect(() => {
      if (!isOpen) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        fetchThirdParties(searchQuery, 1, false);
      }, 300);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [searchQuery, isOpen, fetchThirdParties]);

    // Cargar al abrir
    React.useEffect(() => {
      if (isOpen && options.length === 0 && !loading) {
        fetchThirdParties('', 1, false);
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
          width: Math.max(rect.width, 320),
        });
      };
      update();
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
    }, [isOpen, usePortal]);

    // Bloquear focusin en el dropdown portal para que Radix Dialog no robe el foco
    React.useEffect(() => {
      if (!isOpen || !usePortal || !dropdownRef.current) return;
      const el = dropdownRef.current;
      const stop = (e: FocusEvent) => e.stopPropagation();
      el.addEventListener('focusin', stop);
      return () => el.removeEventListener('focusin', stop);
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
        fetchThirdParties(searchQuery, page + 1, true);
      }
    }, [loading, loadingMore, hasMore, searchQuery, page, fetchThirdParties]);

    const handleSelect = (thirdParty: ThirdPartyOption) => {
      setSelectedOption(thirdParty);
      onChange?.(thirdParty.id, thirdParty);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedOption(null);
      onChange?.('');
    };

    const handleCreateClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(false);
      setShowCreateModal(true);
    };

    const handleCreateSuccess = () => {
      setShowCreateModal(false);
      // Recargar lista
      fetchThirdParties(searchQuery, 1, false);
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

    const displayLabel = selectedOption
      ? `${selectedOption.identification_number} - ${selectedOption.name}`
      : null;

    return (
      <>
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
              {selectedOption && !disabled && (
                <span
                  role="button"
                  onClick={handleClear}
                  title="Limpiar selección"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                </span>
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
                onWheel={(e) => e.stopPropagation()}
                style={usePortal && dropdownPos ? {
                  position: 'fixed' as const,
                  ...(dropdownPos.top !== undefined ? { top: dropdownPos.top } : {}),
                  ...(dropdownPos.bottom !== undefined ? { bottom: dropdownPos.bottom } : {}),
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  zIndex: 9999,
                  pointerEvents: 'auto' as const,
                } : undefined}
              >
                {/* Header con búsqueda */}
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
                      onFocus={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        // Permitir tipeo normal — solo propagar flechas/Enter/Escape al handler padre
                        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                          e.stopPropagation();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {loading ? 'Cargando...' : `${options.length} de ${total} terceros`}
                    </p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={handleCreateClick}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Plus className="h-3 w-3" />
                        Nuevo tercero
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de opciones */}
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
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelect(opt)}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                            'hover:bg-gray-100 dark:hover:bg-slate-700',
                            i === highlightedIndex && 'bg-gray-100 dark:bg-slate-700',
                            opt.id === value && 'bg-blue-50 dark:bg-blue-900/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                'font-mono text-xs',
                                opt.id === value ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-500'
                              )}>
                                {opt.identification_number}
                              </span>
                              <span className={cn(
                                'ml-2',
                                opt.id === value && 'text-blue-700 dark:text-blue-400 font-medium'
                              )}>
                                {opt.name}
                              </span>
                            </div>
                            {opt.id === value && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
                          </div>
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

        {/* Modal de crear tercero */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Tercero</DialogTitle>
            </DialogHeader>
            <ThirdPartyForm
              mode="create"
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

ThirdPartySelect.displayName = 'ThirdPartySelect';
