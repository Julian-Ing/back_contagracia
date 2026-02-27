'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { fuzzySearch } from '@/shared/lib/fuzzy-search';
import { ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  disabledLabel?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  /** Renderizar dropdown en document.body via portal (útil dentro de dialogs con overflow) */
  portal?: boolean;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Selecciona una opción',
      searchable = false,
      disabled = false,
      className,
      name,
      portal = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const internalRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [fixedStyle, setFixedStyle] = React.useState<React.CSSProperties>({});

    // Cerrar dropdown al hacer click fuera
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          internalRef.current &&
          !internalRef.current.contains(target) &&
          (!dropdownRef.current || !dropdownRef.current.contains(target))
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Portal mode: interceptar pointerdown Y focusin en capture phase (window) ANTES que Radix Dialog.
    // Radix usa capture en document para detectar clicks/focus fuera del dialog y cerrarlo.
    // Al usar window (padre de document), nuestro handler corre primero.
    React.useEffect(() => {
      if (!portal || !isOpen) return;

      const stopRadix = (e: PointerEvent) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          e.stopImmediatePropagation();
        }
      };

      const stopFocusEscape = (e: FocusEvent) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('pointerdown', stopRadix, { capture: true });
      window.addEventListener('focusin', stopFocusEscape, { capture: true });
      return () => {
        window.removeEventListener('pointerdown', stopRadix, { capture: true });
        window.removeEventListener('focusin', stopFocusEscape, { capture: true });
      };
    }, [portal, isOpen]);

    // Calcular posición fixed cuando se abre (para portal mode)
    React.useEffect(() => {
      if (portal && isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setFixedStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      }
    }, [portal, isOpen]);

    // Filtrar opciones con fuzzy search
    const filteredOptions = React.useMemo(() => {
      if (!searchable || !searchQuery) return options;

      return fuzzySearch(options, searchQuery, (opt) => opt.label, {
        threshold: 0.3,
      }).map((r) => r.item);
    }, [options, searchQuery, searchable]);

    // Obtener opción seleccionada
    const selectedOption = options.find((opt) => opt.value === value);
    const selectedLabel = selectedOption?.label;

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    };

    const dropdownContent = (
      <div
        ref={dropdownRef}
        // stopPropagation evita que Radix Dialog detecte clicks como "outside" y cierre/bloquee
        onPointerDown={(e) => portal && e.stopPropagation()}
        onMouseDown={(e) => portal && e.stopPropagation()}
        className={cn(
          'rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg',
          portal ? '' : 'absolute z-50 mt-1 w-full'
        )}
        style={portal ? fixedStyle : undefined}
      >
        {/* Search input */}
        {searchable && (
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Options list */}
        <div className="max-h-60 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              No se encontraron resultados
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2',
                  option.disabled
                    ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-gray-100',
                  !option.disabled &&
                    option.value === value &&
                    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                )}
                title={
                  option.disabled && option.disabledLabel
                    ? option.disabledLabel
                    : undefined
                }
              >
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {option.disabled && option.disabledLabel && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                    {option.disabledLabel}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );

    return (
      <div ref={internalRef} className={cn('relative', className)}>
        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value || ''} />}

        {/* Select trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selectedLabel && 'text-gray-400 dark:text-gray-500'
          )}
        >
          <span className="truncate flex items-center gap-2">
            {selectedOption?.icon}
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </button>

        {/* Dropdown: portal mode usa createPortal para escapar overflow+transform del Dialog */}
        {isOpen &&
          (portal
            ? createPortal(dropdownContent, document.body)
            : dropdownContent)}
      </div>
    );
  }
);

Select.displayName = 'Select';
