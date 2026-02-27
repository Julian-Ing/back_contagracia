'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Check, AlertTriangle } from 'lucide-react';

export interface RefTypeOption {
  value: string;
  label: string;
  /** Solo disponible en líneas DEBIT, CREDIT, o ambas */
  allowedType?: 'DEBIT' | 'CREDIT' | null;
  /** Color del badge */
  color?: string;
}

interface RefTypeSelectProps {
  options: RefTypeOption[];
  value: string;
  onChange: (value: string) => void;
  /** Tipo actual de la línea (DEBIT o CREDIT) */
  lineType: 'DEBIT' | 'CREDIT';
  /** Código de cuenta contable actual de la línea */
  accountCode?: string;
  /** Si la línea tiene tercero seleccionado */
  hasThirdParty?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Cuentas de banco/caja solo permiten ref_type NORMAL */
const isBankCashAccount = (code: string) => code.startsWith('1105') || code.startsWith('1110');

type BlockReason = 'no_third_party' | 'bank_cash' | 'wrong_type' | null;

export function RefTypeSelect({
  options,
  value,
  onChange,
  lineType,
  accountCode = '',
  hasThirdParty = true,
  disabled = false,
  className,
}: RefTypeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownPos, setDropdownPos] = React.useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const getBlockReason = React.useCallback(
    (opt: RefTypeOption): BlockReason => {
      if (opt.value === 'NORMAL') return null;
      // Prioridad 1: Sin tercero
      if (!hasThirdParty) return 'no_third_party';
      // Prioridad 2: Cuenta banco/caja
      if (accountCode && isBankCashAccount(accountCode)) return 'bank_cash';
      // Prioridad 3: Tipo de línea incorrecto
      if (opt.allowedType && opt.allowedType !== lineType) return 'wrong_type';
      return null;
    },
    [lineType, accountCode, hasThirdParty],
  );

  const isOptionAllowed = React.useCallback(
    (opt: RefTypeOption) => getBlockReason(opt) === null,
    [getBlockReason],
  );

  const selectedOption = options.find((o) => o.value === value)
    || (value.startsWith('PREP_CREATED_') ? options.find((o) => o.value === 'PREP_CREATED') : undefined);

  // Posición del dropdown
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
      width: Math.max(rect.width, 320),
      maxHeight: Math.max(Math.min(openBelow ? spaceBelow : spaceAbove, 350), 120),
    });
  }, []);

  // Cerrar al click fuera
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Recalcular posición
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

  // Portal isolation
  React.useEffect(() => {
    const el = dropdownRef.current;
    if (!isOpen || !el) return;
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
    return () => {
      el.removeEventListener('wheel', stopScroll);
      el.removeEventListener('touchmove', stopScroll);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [isOpen, dropdownPos]);

  const handleSelect = (optValue: string) => {
    const opt = options.find((o) => o.value === optValue);
    if (!opt) return;
    // PREP_CREATED es un grupo virtual — seleccionar PREP_CREATED_CLIENT como default
    onChange(optValue === 'PREP_CREATED' ? 'PREP_CREATED_CLIENT' : optValue);
    setIsOpen(false);
  };

  const getColorClasses = (opt: RefTypeOption, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-50 dark:bg-blue-900/30';
    return 'hover:bg-gray-100 dark:hover:bg-slate-700';
  };

  const getBadge = (opt: RefTypeOption) => {
    const reason = getBlockReason(opt);

    if (reason) {
      const badgeConfig: Record<NonNullable<BlockReason>, { label: string; bg: string; text: string }> = {
        no_third_party: {
          label: 'Sin tercero',
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-600 dark:text-orange-400',
        },
        bank_cash: {
          label: 'Cuenta Banco/Caja',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-600 dark:text-amber-400',
        },
        wrong_type: {
          label: `Requiere ${opt.allowedType === 'DEBIT' ? 'Débito' : 'Crédito'}`,
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-500 dark:text-gray-400',
        },
      };
      const cfg = badgeConfig[reason];
      return (
        <span className={cn('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', cfg.bg, cfg.text)}>
          <AlertTriangle className="h-2.5 w-2.5" />
          {cfg.label}
        </span>
      );
    }

    if (!opt.allowedType) return null;

    // Permitido: mostrar badge de tipo
    return (
      <span className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap',
        opt.allowedType === 'DEBIT'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      )}>
        {opt.allowedType === 'DEBIT' ? 'Débito' : 'Crédito'}
      </span>
    );
  };

  const getTriggerBadge = () => {
    if (!selectedOption?.color) return null;
    return (
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: selectedOption.color }}
      />
    );
  };

  const dropdownContent = isOpen && dropdownPos && typeof document !== 'undefined'
    ? createPortal(
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
          }}
          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg animate-in fade-in-0 zoom-in-95 overflow-hidden"
        >
          <div className="overflow-y-auto p-1">
            {options.map((opt) => {
              const isSelected = opt.value === value || (opt.value === 'PREP_CREATED' && value.startsWith('PREP_CREATED_'));
              const hasWarning = getBlockReason(opt) !== null;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm rounded transition-colors',
                    getColorClasses(opt, isSelected),
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className={cn(
                        'truncate',
                        hasWarning && 'text-amber-600 dark:text-amber-400',
                        isSelected && 'text-blue-700 dark:text-blue-400 font-medium',
                      )}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    {getBadge(opt)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className="truncate flex-1 text-left flex items-center gap-2">
          {getTriggerBadge()}
          {selectedOption?.label || 'Tipo...'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0',
            isOpen && 'transform rotate-180',
          )}
        />
      </button>
      {dropdownContent}
    </div>
  );
}
