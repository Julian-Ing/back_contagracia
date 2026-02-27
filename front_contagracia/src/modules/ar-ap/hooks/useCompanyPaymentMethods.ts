'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { companyPaymentMethodsService } from '../services/companyPaymentMethods.service';
import { useDebounce } from '@/shared/hooks';
import { loadFilters, saveFilters } from '@/shared/hooks/usePersistedFilters';
import type { CompanyPaymentMethod } from '../types';

export function useCompanyPaymentMethods(limit = 20) {
  const saved = useRef(loadFilters<{ search?: string }>('payment-methods')).current;

  const [data, setData] = useState<CompanyPaymentMethod[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(saved.search ?? '');

  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await companyPaymentMethodsService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar métodos de pago');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist filters
  useEffect(() => {
    saveFilters('payment-methods', { search: debouncedSearch });
  }, [debouncedSearch]);

  const updateSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  const goToPage = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  }, [totalPages]);

  return {
    data,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setSearch: updateSearch,
    setPage: goToPage,
    refetch: fetchData,
  };
}
