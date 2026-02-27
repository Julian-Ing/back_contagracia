'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, X, Check, Loader2, Plus } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { accountingClient } from '@/shared/services/api/apiClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { PaymentMethodForm } from '@/modules/ar-ap/components/PaymentMethodForm';
import type { CompanyPaymentMethod } from '@/modules/ar-ap/types';

export interface PaymentMethodOption {
  value: string;
  label: string;
}

export interface PaymentMethodSelectProps {
  value?: string;
  valueLabel?: string;
  onChange?: (value: string, option?: PaymentMethodOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  clearable?: boolean;
  emptyMessage?: string;
  dropdownPosition?: 'bottom' | 'top';
  pageSize?: number;
  /** Renderizar dropdown como portal (para contenedores con overflow) */
  usePortal?: boolean;
  /** Contenedor para el portal (ej: ref del DialogContent). Si no se pasa, usa document.body */
  portalContainer?: React.RefObject<HTMLElement | null>;
}

export const PaymentMethodSelect = React.forwardRef<HTMLDivElement, PaymentMethodSelectProps>(
  (
    {
      value,
      valueLabel,
      onChange,
      placeholder = 'Seleccionar método de pago...',
      searchPlaceholder = 'Buscar...',
      disabled = false,
      className,
      name,
      clearable = true,
      emptyMessage = 'No se encontraron métodos de pago',
      dropdownPosition = 'bottom',
      pageSize = 50,
      usePortal = false,
      portalContainer,
    },
    ref
  ) => {
    const { can } = usePermissions();
    const canCreate = can('payment_methods.create');

    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState<PaymentMethodOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [selectedOption, setSelectedOption] = React.useState<PaymentMethodOption | null>(
      value && valueLabel ? { value, label: valueLabel } : null
    );

    const [showCreateModal, setShowCreateModal] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const currentSearchRef = React.useRef('');
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

    const fetchPaymentMethods = React.useCallback(
      async (search: string, pageNum: number, append = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
          currentSearchRef.current = search;
          const params: Record<string, string> = { page: String(pageNum), limit: String(pageSize) };
          if (search) params.search = search;

          const res = await accountingClient.get('/company-payment-methods', { params });

          if (currentSearchRef.current === search) {
            const mapped: PaymentMethodOption[] = (res.data.data || []).map((m: any) => ({
              value: m.id,
              label: m.name,
            }));

            if (append) setOptions((prev) => [...prev, ...mapped]);
            else setOptions(mapped);
            setHasMore(res.data.hasMore ?? false);
            setTotal(res.data.total ?? 0);
            setPage(pageNum);
          }
        } catch {
          if (!append) setOptions([]);
          setHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      },
      [pageSize]
    );

    React.useEffect(() => {
      if (!isOpen) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPaymentMethods(searchQuery, 1, false), 300);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, isOpen, fetchPaymentMethods]);

    React.useEffect(() => {
      if (isOpen && options.length === 0 && !loading) fetchPaymentMethods('', 1, false);
    }, [isOpen]);

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

    React.useEffect(() => { setHighlightedIndex(0); }, [options]);

    const handleScroll = React.useCallback(() => {
      if (!listRef.current || loading || loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) fetchPaymentMethods(searchQuery, page + 1, true);
    }, [loading, loadingMore, hasMore, searchQuery, page, fetchPaymentMethods]);

    const handleSelect = (opt: PaymentMethodOption) => {
      setSelectedOption(opt);
      onChange?.(opt.value, opt);
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
        if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setIsOpen(true); }
        return;
      }
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setHighlightedIndex((i) => Math.min(i + 1, options.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); setHighlightedIndex((i) => Math.max(i - 1, 0)); break;
        case 'Enter': e.preventDefault(); if (options[highlightedIndex]) handleSelect(options[highlightedIndex]); break;
        case 'Escape': e.preventDefault(); setIsOpen(false); setSearchQuery(''); break;
      }
    };

    React.useEffect(() => {
      if (isOpen && listRef.current?.children[highlightedIndex]) {
        (listRef.current.children[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, isOpen]);

    const handleCreateClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(false);
      setShowCreateModal(true);
    };

    const handleCreateSuccess = (created: CompanyPaymentMethod) => {
      const opt: PaymentMethodOption = { value: created.id, label: created.name };
      setSelectedOption(opt);
      onChange?.(opt.value, opt);
      setShowCreateModal(false);
      fetchPaymentMethods('', 1, false);
    };

    const displayLabel = selectedOption?.label || (value ? valueLabel : null);

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
              {clearable && selectedOption && !disabled && (
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={handleClear} />
              )}
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </button>

          {isOpen && (() => {
            const dd = (
              <div
                ref={dropdownRef}
                className={cn(
                  'rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg',
                  !usePortal && 'absolute z-50 w-full',
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
                      {loading ? 'Cargando...' : `${options.length} de ${total} métodos`}
                    </p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={handleCreateClick}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Plus className="h-3 w-3" />
                        Nuevo método
                      </button>
                    )}
                  </div>
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
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Método de Pago</DialogTitle>
            </DialogHeader>
            <PaymentMethodForm
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

PaymentMethodSelect.displayName = 'PaymentMethodSelect';
