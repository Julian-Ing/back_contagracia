import { useState, useEffect, useCallback } from 'react';
import { observationsService } from '../services/observations.service';
import type { Observation, ObservationFilters, ObservationType, ObservationSeverity, ObservationStatus } from '../types';

interface UseObservationsParams {
  initialPage?: number;
  limit?: number;
}

export function useObservations({ initialPage = 1, limit = 20 }: UseObservationsParams = {}) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ObservationType | undefined>();
  const [severityFilter, setSeverityFilter] = useState<ObservationSeverity | undefined>();
  const [statusFilter, setStatusFilter] = useState<ObservationStatus | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ObservationFilters = { page, limit };
      if (searchTerm) filters.search = searchTerm;
      if (typeFilter) filters.observation_type = typeFilter;
      if (severityFilter) filters.severity = severityFilter;
      if (statusFilter) filters.status = statusFilter;

      const response = await observationsService.getAll(filters);
      setObservations(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar observaciones';
      setError(message);
      setObservations([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, typeFilter, severityFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    observations,
    total,
    page,
    totalPages,
    loading,
    error,
    search: (term: string) => { setSearchTerm(term); setPage(1); },
    setPage,
    setTypeFilter: (t: ObservationType | undefined) => { setTypeFilter(t); setPage(1); },
    setSeverityFilter: (s: ObservationSeverity | undefined) => { setSeverityFilter(s); setPage(1); },
    setStatusFilter: (s: ObservationStatus | undefined) => { setStatusFilter(s); setPage(1); },
    refetch: fetchData,
  };
}
