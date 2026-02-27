'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Search, Loader2, Plus } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { productsService, type ForSelectProduct } from '@/modules/inventory/services/products.service';
import { ProductForm } from '@/modules/inventory/components/ProductForm';

export interface ProductSelectProps {
  /** Called when user selects a product (parent receives full data incl. combinations) */
  onSelect: (product: ForSelectProduct) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Render dropdown as portal (for containers with overflow) */
  usePortal?: boolean;
  pageSize?: number;
}

export function ProductSelect({
  onSelect,
  placeholder = 'Agregar producto...',
  searchPlaceholder = 'Buscar por nombre, código, barcode...',
  disabled = false,
  className,
  usePortal = false,
  pageSize = 20,
}: ProductSelectProps) {
  const { can } = usePermissions();
  const canCreate = can('products.create');

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [options, setOptions] = React.useState<ForSelectProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = React.useRef('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = React.useState<{
    top?: number; bottom?: number; left: number; width: number;
  } | null>(null);

  // ── Fetch products from backend ──
  const fetchProducts = React.useCallback(
    async (search: string, pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        currentSearchRef.current = search;

        const result = await productsService.getForSelect({
          search: search || undefined,
          page: pageNum,
          limit: pageSize,
        });

        if (currentSearchRef.current === search) {
          if (append) {
            setOptions(prev => [...prev, ...result.data]);
          } else {
            setOptions(result.data);
          }
          setHasMore(result.hasMore);
          setTotal(result.total);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('[ProductSelect] Error loading:', error);
        if (!append) setOptions([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize]
  );

  // ── Debounce search ──
  React.useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchProducts(searchQuery, 1, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, isOpen, fetchProducts]);

  // ── Load on open ──
  React.useEffect(() => {
    if (isOpen && options.length === 0 && !loading) {
      fetchProducts('', 1, false);
    }
  }, [isOpen]);

  // ── Click outside ──
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Focus input on open ──
  React.useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // ── Portal positioning ──
  React.useEffect(() => {
    if (!isOpen || !usePortal || !triggerRef.current) {
      setDropdownPos(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openBelow = spaceBelow >= 280 || spaceBelow >= rect.top;
      setDropdownPos({
        ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
        left: rect.left,
        width: Math.max(rect.width, 380),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, usePortal]);

  // ── Focus isolation for portal (prevent Radix Dialog stealing focus) ──
  React.useEffect(() => {
    if (!isOpen || !usePortal || !dropdownRef.current) return;
    const el = dropdownRef.current;
    const stop = (e: FocusEvent) => e.stopPropagation();
    el.addEventListener('focusin', stop);
    return () => el.removeEventListener('focusin', stop);
  }, [isOpen, usePortal]);

  // ── Reset highlight on results change ──
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [options]);

  // ── Infinite scroll ──
  const handleScroll = React.useCallback(() => {
    if (!listRef.current || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchProducts(searchQuery, page + 1, true);
    }
  }, [loading, loadingMore, hasMore, searchQuery, page, fetchProducts]);

  // ── Handlers ──
  const handleSelect = (product: ForSelectProduct) => {
    onSelect(product);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    // Reload product list to include newly created product
    fetchProducts(searchQuery, 1, false);
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
        setHighlightedIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
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

  // ── Scroll highlighted into view ──
  React.useEffect(() => {
    if (isOpen && listRef.current?.children[highlightedIndex]) {
      (listRef.current.children[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <>
      <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'text-gray-400 dark:text-gray-500'
          )}
        >
          <span className="truncate flex-1 text-left">{placeholder}</span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {(() => {
          if (!isOpen) return null;
          const dd = (
            <div
              ref={dropdownRef}
              className={cn(
                'rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg',
                !usePortal && 'absolute z-50 mt-1 w-full'
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
              {/* Search header */}
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
                      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                        e.stopPropagation();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {loading ? 'Cargando...' : `${options.length} de ${total} productos`}
                  </p>
                  {canCreate && (
                    <button
                      type="button"
                      onClick={handleCreateClick}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Plus className="h-3 w-3" />
                      Nuevo producto
                    </button>
                  )}
                </div>
              </div>

              {/* Options list */}
              <div ref={listRef} className="max-h-60 overflow-y-auto p-1" onScroll={handleScroll}>
                {loading ? (
                  <div className="py-6 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                  </div>
                ) : options.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No se encontraron productos' : 'Escriba para buscar productos'}
                  </div>
                ) : (
                  <>
                    {options.map((product, i) => {
                      const hasCombinations = product.combinations && product.combinations.length > 0;
                      return (
                        <button
                          key={product.value}
                          type="button"
                          onClick={() => handleSelect(product)}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                            'hover:bg-gray-100 dark:hover:bg-slate-700',
                            i === highlightedIndex && 'bg-gray-100 dark:bg-slate-700'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{product.label}</span>
                                {hasCombinations && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded">
                                    {product.combinations.length} var
                                  </span>
                                )}
                                {product.is_service && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 rounded">
                                    Servicio
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                {[product.description, product.barcode].filter(Boolean).join(' | ')}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              <FormattedNumber value={parseFloat(product.price || '0')} type="currency" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
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

      {/* Create product modal */}
      <ProductForm
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        editing={null}
        onSaved={handleCreateSuccess}
      />
    </>
  );
}
