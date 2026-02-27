'use client';

const PREFIX = 'filters:';

export function loadFilters<T extends Record<string, unknown>>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return {};
  }
}

export function saveFilters(key: string, data: Record<string, unknown>): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // quota exceeded or unavailable — silently ignore
  }
}
