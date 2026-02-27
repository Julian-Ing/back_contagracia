'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { API_CONFIG } from '@/config/api.config';
import { AccountForm } from '@/modules/accounting/components/AccountForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export interface AccountOption {
  code: string;
  name: string;
  type?: string;
}

export interface AccountSelectProps {
  value?: string;
  /** Label del valor seleccionado (código - nombre) */
  valueLabel?: string;
  onChange?: (code: string, account?: AccountOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  /** Prefijos a incluir (separados por coma, ej: "13,22") */
  includePrefixes?: string;
  /** Prefijos a excluir (separados por coma, ej: "1305,2205") */
  excludePrefixes?: string;
  /** Mostrar botón para crear nueva cuenta */
  showCreateButton?: boolean;
  /** Callback cuando se quiere crear una cuenta */
  onCreateClick?: () => void;
  /** Callback cuando se creó una cuenta (para auto-seleccionar) */
  onAccountCreated?: (account: AccountOption) => void;
  emptyMessage?: string;
  /** Permitir limpiar la selección (default: true) */
  clearable?: boolean;
  /** Límite por página */
  pageSize?: number;
  /** Posición del dropdown: 'bottom' (default) o 'top' */
  dropdownPosition?: 'bottom' | 'top';
  /** Renderizar dropdown como portal (para contenedores con overflow) */
  usePortal?: boolean;
  /** Contenedor para el portal (ej: ref del DialogContent). Si no se pasa, usa document.body */
  portalContainer?: React.RefObject<HTMLElement | null>;
}

export const AccountSelect = React.forwardRef<HTMLDivElement, AccountSelectProps>(
  (
    {
      value,
      valueLabel,
      onChange,
      placeholder = 'Seleccionar cuenta...',
      searchPlaceholder = 'Buscar por código o nombre...',
      disabled = false,
      className,
      name,
      includePrefixes,
      excludePrefixes,
      showCreateButton = true,
      onCreateClick,
      onAccountCreated,
      emptyMessage = 'No se encontraron cuentas',
      clearable = true,
      pageSize = 50,
      dropdownPosition = 'bottom',
      usePortal = false,
      portalContainer,
    },
    ref
  ) => {
    const { token } = useAuth();
    const { can } = usePermissions();
    const canCreateAccount = can('chart_of_accounts.create');
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<AccountOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [selectedOption, setSelectedOption] = React.useState<AccountOption | null>(null);
    const [createModalOpen, setCreateModalOpen] = React.useState(false);

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
        // Solo actualizar si el value cambió
        if (selectedOption?.code !== value) {
          const parts = valueLabel.split(' - ');
          setSelectedOption({
            code: value,
            name: parts.length > 1 ? parts.slice(1).join(' - ') : valueLabel,
          });
        }
      } else if (!value) {
        setSelectedOption(null);
      }
    }, [value, valueLabel]);

    // Cargar cuentas del backend
    const fetchAccounts = React.useCallback(
      async (search: string, pageNum: number, append = false) => {
        if (!token) return;

        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        try {
          currentSearchRef.current = search;

          const params = new URLSearchParams({
            flat: 'true',
            page: pageNum.toString(),
            limit: pageSize.toString(),
          });

          if (search) params.append('search', search);
          if (includePrefixes) params.append('include_prefixes', includePrefixes);
          if (excludePrefixes) params.append('exclude_prefixes', excludePrefixes);

          const response = await fetch(`${API_CONFIG.ACCOUNTING}/chart-of-accounts?${params}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) throw new Error('Error al cargar cuentas');

          const result = await response.json();

          // Solo actualizar si la búsqueda sigue siendo la misma
          if (currentSearchRef.current === search) {
            const accounts: AccountOption[] = result.data.map((a: any) => ({
              code: a.code,
              name: a.name,
              type: a.type,
            }));

            if (append) {
              setOptions((prev) => [...prev, ...accounts]);
            } else {
              setOptions(accounts);
            }
            setHasMore(result.hasMore);
            setTotal(result.total);
            setPage(pageNum);
          }
        } catch (error) {
          console.error('[AccountSelect] Error loading accounts:', error);
          if (!append) setOptions([]);
          setHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [token, includePrefixes, excludePrefixes, pageSize]
    );

    // Debounce búsqueda
    React.useEffect(() => {
      if (!isOpen) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        fetchAccounts(searchQuery, 1, false);
      }, 300);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [searchQuery, isOpen, fetchAccounts]);

    // Cargar al abrir
    React.useEffect(() => {
      if (isOpen && options.length === 0 && !loading) {
        fetchAccounts('', 1, false);
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
      const container = portalContainer?.current;
      const update = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        const gap = 4;
        if (container) {
          const cRect = container.getBoundingClientRect();
          const topInContainer = rect.bottom - cRect.top + container.scrollTop + gap;
          const bottomInContainer = cRect.height + container.scrollTop - (rect.top - cRect.top + container.scrollTop) + gap;
          const spaceBelow = cRect.bottom - rect.bottom - gap;
          const openBelow = spaceBelow >= 280 || spaceBelow >= (rect.top - cRect.top);
          setDropdownPos({
            ...(openBelow ? { top: topInContainer } : { bottom: bottomInContainer }),
            left: rect.left - cRect.left + container.scrollLeft,
            width: Math.max(rect.width, 280),
          });
        } else {
          const spaceBelow = window.innerHeight - rect.bottom - gap;
          const openBelow = spaceBelow >= 280 || spaceBelow >= rect.top;
          setDropdownPos({
            ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
            left: rect.left,
            width: Math.max(rect.width, 320),
          });
        }
      };
      update();
      if (!container) window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      return () => {
        if (!container) window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
      };
    }, [isOpen, usePortal, portalContainer]);

    // Portal event isolation: bloquear scroll y focus propagation (como SearchableSelect)
    React.useEffect(() => {
      const el = dropdownRef.current;
      if (!isOpen || !el || !usePortal) return;
      const stopScroll = (e: Event) => e.stopPropagation();
      el.addEventListener('wheel', stopScroll, { passive: true });
      el.addEventListener('touchmove', stopScroll, { passive: true });
      const handleFocusIn = (e: FocusEvent) => { if (el.contains(e.target as Node)) e.stopImmediatePropagation(); };
      const handleFocusOut = (e: FocusEvent) => { if (el.contains(e.relatedTarget as Node)) e.stopImmediatePropagation(); };
      document.addEventListener('focusin', handleFocusIn, true);
      document.addEventListener('focusout', handleFocusOut, true);
      return () => {
        el.removeEventListener('wheel', stopScroll);
        el.removeEventListener('touchmove', stopScroll);
        document.removeEventListener('focusin', handleFocusIn, true);
        document.removeEventListener('focusout', handleFocusOut, true);
      };
    }, [isOpen, usePortal, dropdownPos]);

    // Reset highlight al cambiar resultados
    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [options]);

    // Infinite scroll
    const handleScroll = React.useCallback(() => {
      if (!listRef.current || loading || loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        fetchAccounts(searchQuery, page + 1, true);
      }
    }, [loading, loadingMore, hasMore, searchQuery, page, fetchAccounts]);

    const handleSelect = (account: AccountOption) => {
      setSelectedOption(account);
      onChange?.(account.code, account);
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
      if (onCreateClick) {
        onCreateClick();
      } else {
        setCreateModalOpen(true);
      }
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

    const displayLabel = selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : null;

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
          <span className="truncate flex-1 text-left font-mono">{displayLabel || placeholder}</span>
          <div className="flex items-center gap-1">
            {selectedOption && !disabled && clearable && (
              <X
                className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={handleClear}
              />
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
                !usePortal && "absolute z-50 w-full",
                !usePortal && (dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1')
              )}
              style={usePortal && dropdownPos ? {
                position: (portalContainer?.current ? 'absolute' : 'fixed') as any,
                ...(dropdownPos.top !== undefined ? { top: dropdownPos.top } : {}),
                ...(dropdownPos.bottom !== undefined ? { bottom: dropdownPos.bottom } : {}),
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999,
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
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {loading ? 'Cargando...' : `${options.length} de ${total} cuentas`}
                  </p>
                  {showCreateButton && canCreateAccount && (
                    <button
                      type="button"
                      onClick={handleCreateClick}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Plus className="h-3 w-3" />
                      Nueva cuenta
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
                        key={opt.code}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                          'hover:bg-gray-100 dark:hover:bg-slate-700',
                          i === highlightedIndex && 'bg-gray-100 dark:bg-slate-700',
                          opt.code === value && 'bg-blue-50 dark:bg-blue-900/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              'font-mono text-xs',
                              opt.code === value ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-500'
                            )}>
                              {opt.code}
                            </span>
                            <span className={cn(
                              'ml-2',
                              opt.code === value && 'text-blue-700 dark:text-blue-400 font-medium'
                            )}>
                              {opt.name}
                            </span>
                          </div>
                          {opt.code === value && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
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
          return usePortal && dropdownPos ? createPortal(dd, portalContainer?.current || document.body) : dd;
        })()}

        {/* Modal crear cuenta */}
        {createModalOpen && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear cuenta</DialogTitle>
              </DialogHeader>
              <AccountForm
                mode="create"
                onSuccess={(account) => {
                  setCreateModalOpen(false);
                  if (account) {
                    const opt: AccountOption = { code: account.code, name: account.name };
                    handleSelect(opt);
                    onAccountCreated?.(opt);
                  }
                  // Refrescar lista de opciones
                  fetchAccounts(searchQuery || '', 1, false);
                }}
                onCancel={() => setCreateModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
);

AccountSelect.displayName = 'AccountSelect';
