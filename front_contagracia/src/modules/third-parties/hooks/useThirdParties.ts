'use client';

import { useState, useEffect, useCallback } from 'react';
import { thirdPartiesService } from '../services/thirdParties.service';
import type { ThirdParty, ThirdPartyFilters } from '../types';

interface UseThirdPartiesParams {
  initialPage?: number;
  limit?: number;
  role?: string;
}

interface UseThirdPartiesReturn {
  thirdParties: ThirdParty[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  setPage: (page: number) => void;
  setRole: (role: string) => void;
  refetch: () => void;
}

export function useThirdParties({ initialPage = 1, limit = 20, role: initialRole }: UseThirdPartiesParams = {}): UseThirdPartiesReturn {
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(initialRole || '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ThirdPartyFilters = {
        page,
        limit,
        is_active: true,
      };
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (roleFilter) {
        filters.role = roleFilter as any;
      }

      const response = await thirdPartiesService.getAll(filters);
      setThirdParties(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar terceros');
      setThirdParties([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const changeRole = useCallback((role: string) => {
    setRoleFilter(role);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    thirdParties,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage: changePage,
    setRole: changeRole,
    refetch: fetchData,
  };
}
