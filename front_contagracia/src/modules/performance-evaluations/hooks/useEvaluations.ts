import { useState, useEffect, useCallback } from 'react';
import { evaluationsService } from '../services/evaluations.service';
import type { Evaluation, EvaluationFilters, EvaluationStatus } from '../types';

interface UseEvaluationsParams {
  initialPage?: number;
  limit?: number;
}

export function useEvaluations({ initialPage = 1, limit = 20 }: UseEvaluationsParams = {}) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: EvaluationFilters = { page, limit };
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (periodFilter) filters.evaluation_period = periodFilter;

      const response = await evaluationsService.getAll(filters);
      setEvaluations(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar evaluaciones';
      setError(message);
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, periodFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    evaluations,
    total,
    page,
    totalPages,
    loading,
    error,
    search: (term: string) => { setSearchTerm(term); setPage(1); },
    setPage,
    setStatusFilter: (s: EvaluationStatus | undefined) => { setStatusFilter(s); setPage(1); },
    setPeriodFilter: (p: string | undefined) => { setPeriodFilter(p); setPage(1); },
    refetch: fetchData,
  };
}
