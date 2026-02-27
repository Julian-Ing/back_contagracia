import { useState, useEffect, useCallback } from 'react';
import { evaluationsService } from '../services/evaluations.service';
import type { DashboardResponse, DashboardFilters } from '../types';

export function useDashboard(initialFilters: DashboardFilters = { period: '3m' }, enabled = true) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.period) params.period = filters.period;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const response = await evaluationsService.getDashboard(params);
      setData(response);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar dashboard';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilters = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return { data, loading, error, filters, updateFilters, refetch: fetchData };
}
