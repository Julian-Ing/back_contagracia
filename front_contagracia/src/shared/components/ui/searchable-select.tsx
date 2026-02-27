'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { fuzzySearch, type FuzzyResult } from '@/shared/lib/fuzzy-search';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  /** Umbral de similitud para fuzzy search (0-1). Default: 0.3 */
  fuzzyThreshold?: number;
  /** Mostrar indicador de tipo de coincidencia. Default: false */
  showMatchType?: boolean;
  /** Permitir limpiar la selección. Default: true */
  clearable?: boolean;
  /** Mensaje cuando no hay resultados */
  emptyMessage?: string;
  /** Máximo de opciones a mostrar. Default: 50 */
  maxResults?: number;
  /** Callback for server-side search. When provided, client-side fuzzy filtering is skipped. */
  onSearchChange?: (query: string) => void;
  /** Show loading spinner in dropdown (for async search). Default: false */
  loading?: boolean;
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Selecciona una opción',
      searchPlaceholder = 'Buscar...',
      disabled = false,
      className,
      name,
      fuzzyThreshold = 0.3,
      showMatchType = false,
      clearable = true,
      emptyMessage = 'No se encontraron resultados',
      maxResults = 50,
      onSearchChange,
      loading = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [dropdownPos, setDropdownPos] = React.useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight: number;
    } | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Calcular posición del dropdown (portal) con detección de dirección
    const updatePosition = React.useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const gap = 4;
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const openBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;

      setDropdownPos({
        ...(openBelow
          ? { top: rect.bottom + gap }
          : { bottom: window.innerHeight - rect.top + gap }),
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(Math.min(openBelow ? spaceBelow : spaceAbove, 350), 120),
      });
    }, []);

    // Cerrar dropdown al hacer click fuera (incluye portal)
    React.useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          containerRef.current && !containerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)
        ) {
          setIsOpen(false);
          setSearchQuery('');
          onSearchChange?.('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Recalcular posición en scroll/resize
    React.useEffect(() => {
      if (!isOpen) return;
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [isOpen, updatePosition]);

    // Portal event isolation: wheel (RemoveScroll), focus (FocusScope), y auto-focus
    React.useEffect(() => {
      const el = dropdownRef.current;
      if (!isOpen || !el) return;

      // 1. Scroll: react-remove-scroll bloquea wheel/touchmove fuera del dialog
      const stopScroll = (e: Event) => e.stopPropagation();
      el.addEventListener('wheel', stopScroll, { passive: true });
      el.addEventListener('touchmove', stopScroll, { passive: true });

      // 2. Focus: FocusScope escucha focusin + focusout en document (bubble phase).
      //    Usamos capture phase en document para interceptar ANTES que FocusScope.
      //    Solo detenemos cuando el foco va hacia/desde nuestro portal dropdown.
      const handleFocusIn = (e: FocusEvent) => {
        if (el.contains(e.target as Node)) {
          e.stopImmediatePropagation();
        }
      };
      const handleFocusOut = (e: FocusEvent) => {
        if (el.contains(e.relatedTarget as Node)) {
          e.stopImmediatePropagation();
        }
      };
      document.addEventListener('focusin', handleFocusIn, true);
      document.addEventListener('focusout', handleFocusOut, true);

      // 3. Auto-focus en input de búsqueda (después de que los listeners estén activos)
      const rafId = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      return () => {
        el.removeEventListener('wheel', stopScroll);
        el.removeEventListener('touchmove', stopScroll);
        document.removeEventListener('focusin', handleFocusIn, true);
        document.removeEventListener('focusout', handleFocusOut, true);
        cancelAnimationFrame(rafId);
      };
    }, [isOpen, dropdownPos]);

    // Reset highlighted index cuando cambian resultados
    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [searchQuery]);

    // Filtrar opciones: server-side (skip fuzzy) o client-side (fuzzy search)
    const filteredResults = React.useMemo((): FuzzyResult<SearchableSelectOption>[] => {
      // When onSearchChange is set, options are already server-filtered — pass through
      if (onSearchChange) {
        return options.slice(0, maxResults).map(item => ({
          item,
          score: 1,
          matchType: 'exact' as const,
        }));
      }

      if (!searchQuery.trim()) {
        return options.slice(0, maxResults).map(item => ({
          item,
          score: 1,
          matchType: 'exact' as const
        }));
      }

      return fuzzySearch(
        options,
        searchQuery,
        (opt) => opt.label,
        { threshold: fuzzyThreshold, limit: maxResults }
      );
    }, [options, searchQuery, fuzzyThreshold, maxResults, onSearchChange]);

    // Obtener opción seleccionada
    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      onSearchChange?.('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[highlightedIndex]) {
            handleSelect(filteredResults[highlightedIndex].item.value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          onSearchChange?.('');
          break;
      }
    };

    // Scroll al elemento highlighted
    React.useEffect(() => {
      if (isOpen && listRef.current) {
        const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [highlightedIndex, isOpen]);

    const getMatchTypeLabel = (matchType: string) => {
      switch (matchType) {
        case 'exact': return 'Exacto';
        case 'contains': return 'Contiene';
        case 'words': return 'Palabras';
        case 'fuzzy': return 'Similar';
        default: return '';
      }
    };

    // Dropdown content (renderizado via portal)
    const dropdownContent = isOpen && dropdownPos && typeof document !== 'undefined' ? createPortal(
      <div
        ref={dropdownRef}
        onPointerDown={(e) => e.nativeEvent.stopPropagation()}
        style={{
          position: 'fixed',
          ...(dropdownPos.top !== undefined ? { top: dropdownPos.top } : {}),
          ...(dropdownPos.bottom !== undefined ? { bottom: dropdownPos.bottom } : {}),
          left: dropdownPos.left,
          width: dropdownPos.width,
          maxHeight: dropdownPos.maxHeight,
          zIndex: 9999,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column' as const,
          overflow: 'hidden',
        }}
        className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg animate-in fade-in-0 zoom-in-95"
      >
        {/* Search input */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            />
          </div>
          {searchQuery && !onSearchChange && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
              {searchQuery.length >= 2 && ' (búsqueda inteligente activa)'}
            </p>
          )}
        </div>

        {/* Options list */}
        <div ref={listRef} className="overflow-y-auto p-1 flex-1 min-h-0">
          {loading ? (
            <div className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-60" />
              Buscando...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {emptyMessage}
            </div>
          ) : (
            filteredResults.map((result, index) => (
              <button
                key={result.item.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(result.item.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded transition-colors text-gray-900 dark:text-gray-100',
                  'hover:bg-gray-100 dark:hover:bg-slate-700',
                  index === highlightedIndex && 'bg-gray-100 dark:bg-slate-700',
                  result.item.value === value && 'bg-blue-50 dark:bg-blue-900/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'truncate',
                        result.item.value === value && 'text-blue-700 dark:text-blue-400 font-medium'
                      )}>
                        {result.item.label}
                      </span>
                      {result.item.value === value && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    {result.item.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.item.description}
                      </p>
                    )}
                  </div>
                  {showMatchType && searchQuery && result.matchType !== 'exact' && (
                    <span className={cn(
                      'ml-2 text-xs px-1.5 py-0.5 rounded flex-shrink-0',
                      result.matchType === 'contains' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      result.matchType === 'words' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                      result.matchType === 'fuzzy' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    )}>
                      {getMatchTypeLabel(result.matchType)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>,
      document.body
    ) : null;

    return (
      <div
        ref={containerRef}
        className={cn('relative', className)}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value || ''} />}

        {/* Select trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (disabled) return;
            const willOpen = !isOpen;
            setIsOpen(willOpen);
            if (willOpen) onSearchChange?.('');
          }}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selectedOption && 'text-gray-400 dark:text-gray-500'
          )}
        >
          <span className="truncate flex-1 text-left">
            {selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {clearable && selectedOption && !disabled && (
              <X
                className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform',
                isOpen && 'transform rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown via portal */}
        {dropdownContent}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
