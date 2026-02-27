'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isValid,
  getYear,
  getMonth,
  setYear,
  setMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface DatePickerProps {
  value?: string; // formato 'yyyy-MM-dd'
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  /** Renderizar calendario como portal (para contenedores con overflow) */
  usePortal?: boolean;
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
type ViewMode = 'days' | 'months' | 'years';

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  clearable = true,
  minDate,
  maxDate,
  className,
  usePortal = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [yearRangeStart, setYearRangeStart] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      return isValid(parsed) ? parsed : new Date();
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalPos, setPortalPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
  const parsedMin = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : null;
  const parsedMax = maxDate ? parse(maxDate, 'yyyy-MM-dd', new Date()) : null;

  // Reset viewMode al cerrar
  useEffect(() => {
    if (!open) setViewMode('days');
  }, [open]);

  // Posicionar dropdown como portal
  useEffect(() => {
    if (!open || !usePortal || !containerRef.current) { setPortalPos(null); return; }
    const update = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openBelow = spaceBelow >= 320 || spaceBelow >= rect.top;
      setPortalPos({
        ...(openBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
        left: rect.left,
        width: 280,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, usePortal]);

  // Cerrar al hacer clic fuera
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

  // Sync viewDate cuando cambia value
  useEffect(() => {
    if (value) {
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) setViewDate(parsed);
    }
  }, [value]);

  const handleSelect = useCallback((date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const isDisabledDate = useCallback((date: Date) => {
    if (parsedMin && date < parsedMin) return true;
    if (parsedMax && date > parsedMax) return true;
    return false;
  }, [parsedMin, parsedMax]);

  // Generar días del calendario
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const displayValue = selectedDate && isValid(selectedDate)
    ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })
    : '';

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
        <CalendarDays className="h-4 w-4 mr-2 shrink-0 text-gray-400" />
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

      {/* Calendar dropdown */}
      {open && (() => {
        // Si usePortal pero aún no se calculó la posición, no renderizar nada
        if (usePortal && !portalPos) return null;

        const dd = (
        <div
          ref={dropdownRef}
          className={cn(
            "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg animate-in fade-in-0 zoom-in-95",
            !usePortal && "absolute z-50 mt-1 w-[280px]"
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

          {/* ===== YEARS VIEW ===== */}
          {viewMode === 'years' && (() => {
            const rangeEnd = yearRangeStart + 11;
            return (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart - 12)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {yearRangeStart} – {rangeEnd}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart + 12)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 p-3">
                  {Array.from({ length: 12 }, (_, i) => {
                    const y = yearRangeStart + i;
                    const isCurrent = y === getYear(viewDate);
                    const isThisYear = y === getYear(new Date());
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setViewDate(setYear(viewDate, y));
                          setViewMode('months');
                        }}
                        className={cn(
                          'py-2 rounded-md text-sm transition-colors',
                          isCurrent && 'bg-blue-600 text-white font-semibold',
                          !isCurrent && isThisYear && 'font-bold text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                          !isCurrent && !isThisYear && 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                        )}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* ===== MONTHS VIEW ===== */}
          {viewMode === 'months' && (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewDate(setYear(viewDate, getYear(viewDate) - 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYearRangeStart(Math.floor(getYear(viewDate) / 12) * 12);
                    setViewMode('years');
                  }}
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {getYear(viewDate)}
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(setYear(viewDate, getYear(viewDate) + 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 p-3">
                {MONTH_LABELS.map((label, i) => {
                  const isThisMonth = i === getMonth(new Date()) && getYear(viewDate) === getYear(new Date());
                  const isSelected = selectedDate && i === getMonth(selectedDate) && getYear(viewDate) === getYear(selectedDate);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setViewDate(setMonth(viewDate, i));
                        setViewMode('days');
                      }}
                      className={cn(
                        'py-2 rounded-md text-sm transition-colors',
                        isSelected && 'bg-blue-600 text-white font-semibold',
                        !isSelected && isThisMonth && 'font-bold text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                        !isSelected && !isThisMonth && 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ===== DAYS VIEW ===== */}
          {viewMode === 'days' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYearRangeStart(Math.floor(getYear(viewDate) / 12) * 12);
                    setViewMode('months');
                  }}
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {format(viewDate, 'MMMM yyyy', { locale: es })}
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 px-2 pt-2">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 px-2 pb-2">
                {generateCalendarDays().map((day, i) => {
                  const inCurrentMonth = isSameMonth(day, viewDate);
                  const selected = selectedDate && isSameDay(day, selectedDate);
                  const today = isToday(day);
                  const isDisabled = isDisabledDate(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleSelect(day)}
                      className={cn(
                        'h-8 w-8 mx-auto flex items-center justify-center rounded-full text-sm transition-colors',
                        !inCurrentMonth && 'text-gray-300 dark:text-gray-600',
                        inCurrentMonth && !selected && 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                        today && !selected && 'font-bold text-blue-600 dark:text-blue-400',
                        selected && 'bg-blue-600 text-white font-semibold hover:bg-blue-700',
                        isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Footer — Hoy */}
              <div className="px-2 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    if (!isDisabledDate(today)) {
                      setViewDate(today);
                      handleSelect(today);
                    }
                  }}
                  className="w-full text-xs text-center py-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors font-medium"
                >
                  Hoy
                </button>
              </div>
            </>
          )}
        </div>
        );
        return usePortal && portalPos ? createPortal(dd, document.body) : dd;
      })()}
    </div>
  );
}
