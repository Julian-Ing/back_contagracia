import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value - Valor a debouncear
 * @param delay - Delay en milisegundos (default: 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
