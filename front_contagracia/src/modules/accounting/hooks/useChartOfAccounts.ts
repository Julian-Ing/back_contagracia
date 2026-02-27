import { useState, useEffect, useCallback, useRef } from 'react';
import { chartOfAccountsService, type ChartOfAccountsParams } from '../services/chartOfAccounts.service';
import type { ChartOfAccountNode } from '../types';
import { useDebounce, loadFilters, saveFilters } from '@/shared/hooks';

export function useChartOfAccounts() {
  const storageKey = 'chart-of-accounts';
  const saved = useRef(loadFilters<{ search: string; typeFilter: string }>(storageKey)).current;

  const [accounts, setAccounts] = useState<ChartOfAccountNode[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState(saved.search ?? '');
  const [typeFilter, setTypeFilter] = useState(saved.typeFilter ?? '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce del search
  const debouncedSearch = useDebounce(search, 300);

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters(storageKey, { search, typeFilter });
  }, [search, typeFilter]);

  const fetchAccounts = useCallback(async (params: ChartOfAccountsParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chartOfAccountsService.getAll(params);
      setAccounts(response.data);
      setTotal(response.total);
      setFiltered(response.filtered);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar plan de cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar cuando cambian los filtros
  useEffect(() => {
    fetchAccounts({
      search: debouncedSearch || undefined,
      type: typeFilter || undefined,
      page,
    });
  }, [debouncedSearch, typeFilter, page, fetchAccounts]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setPage(1);
  };

  const deleteAccount = async (code: string) => {
    const result = await chartOfAccountsService.delete(code);
    await fetchAccounts({ search: debouncedSearch, type: typeFilter, page });
    return result;
  };

  return {
    accounts,
    total,
    filtered,
    loading,
    error,
    // Filtros
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    // Paginación
    page,
    totalPages,
    goToPage,
    // Acciones
    refetch: () => fetchAccounts({ search: debouncedSearch, type: typeFilter, page }),
    resetFilters,
    deleteAccount,
  };
}
