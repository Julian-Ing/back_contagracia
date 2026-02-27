'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface TimePickerProps {
  value?: string; // formato 'HH:MM' (24h)
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  /** Renderizar dropdown como portal (para contenedores con overflow) */
  usePortal?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export function TimePicker({
  value,
  onChange,
  placeholder = 'Seleccionar hora',
  disabled = false,
  clearable = true,
  className,
  usePortal = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [portalPos, setPortalPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const [hour, minute] = value ? value.split(':') : ['', ''];

  // Posicionar como portal
  useEffect(() => {
    if (!open || !usePortal || !containerRef.current) { setPortalPos(null); return; }
    const update = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openBelow = spaceBelow >= 280 || spaceBelow >= rect.top;
      setPortalPos({
        ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, usePortal]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target) &&
          (!dropdownRef.current || !dropdownRef.current.contains(target))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Scroll al valor seleccionado cuando abre
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (hourListRef.current && hour) {
        const el = hourListRef.current.querySelector(`[data-hour="${hour}"]`);
        el?.scrollIntoView({ block: 'center' });
      }
      if (minuteListRef.current && minute) {
        const el = minuteListRef.current.querySelector(`[data-minute="${minute}"]`);
        el?.scrollIntoView({ block: 'center' });
      }
    });
  }, [open, hour, minute]);

  const handleSelect = useCallback((h: string, m: string) => {
    onChange(`${h}:${m}`);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const displayValue = hour && minute ? `${hour}:${minute}` : '';

  const dropdown = (
    <div
      ref={dropdownRef}
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg animate-in fade-in-0 zoom-in-95',
        !usePortal && 'absolute z-50 mt-1 w-full'
      )}
      style={usePortal && portalPos ? {
        position: 'fixed' as const,
        ...(portalPos.top !== undefined ? { top: portalPos.top } : {}),
        ...(portalPos.bottom !== undefined ? { bottom: portalPos.bottom } : {}),
        left: portalPos.left,
        width: portalPos.width,
        zIndex: 9999,
        pointerEvents: 'auto' as const,
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {displayValue || '--:--'}
        </span>
      </div>

      {/* Columns: Hours | Minutes */}
      <div className="flex divide-x divide-gray-100 dark:divide-gray-700">
        {/* Hours */}
        <div
          ref={hourListRef}
          className="flex-1 py-1"
          style={{ height: 220, overflowY: 'auto', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              data-hour={h}
              onClick={() => handleSelect(h, minute || '00')}
              className={cn(
                'w-full px-3 py-1.5 text-sm text-center transition-colors',
                h === hour
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Minutes */}
        <div
          ref={minuteListRef}
          className="flex-1 py-1"
          style={{ height: 220, overflowY: 'auto', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              data-minute={m}
              onClick={() => handleSelect(hour || '00', m)}
              className={cn(
                'w-full px-3 py-1.5 text-sm text-center transition-colors',
                m === minute
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-left transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !displayValue && 'text-gray-400 dark:text-gray-500',
          displayValue && 'text-gray-900 dark:text-gray-100',
        )}
      >
        <Clock className="h-4 w-4 mr-2 shrink-0 text-gray-400" />
        <span className="flex-1 truncate">
          {displayValue || placeholder}
        </span>
        {clearable && displayValue && !disabled && (
          <X
            className="h-4 w-4 ml-1 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={handleClear}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (() => {
        if (usePortal && !portalPos) return null;
        return usePortal && portalPos ? createPortal(dropdown, document.body) : dropdown;
      })()}
    </div>
  );
}
