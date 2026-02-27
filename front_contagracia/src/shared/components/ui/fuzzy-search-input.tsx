'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface FuzzySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Debounce en ms (default: 300) */
  debounceMs?: number;
}

const FuzzySearchInput = React.forwardRef<HTMLInputElement, FuzzySearchInputProps>(
  ({ value, onChange, placeholder = 'Buscar...', className, disabled, debounceMs = 300 }, ref) => {
    const [internal, setInternal] = React.useState(value);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync from parent when value changes externally
    React.useEffect(() => {
      setInternal(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInternal(v);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), debounceMs);
    };

    const handleClear = () => {
      setInternal('');
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange('');
    };

    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <div className={cn('relative', className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={internal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 pl-9 pr-9 py-2 text-sm text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        {internal && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
FuzzySearchInput.displayName = 'FuzzySearchInput';

export { FuzzySearchInput };
