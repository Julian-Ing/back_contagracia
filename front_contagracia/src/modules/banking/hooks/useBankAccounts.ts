'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { bankAccountsService } from '../services/bankAccounts.service';
import { loadFilters, saveFilters } from '@/shared/hooks/usePersistedFilters';
import type { BankAccount, BankAccountType, BankAccountFilters } from '../types';

interface UseBankAccountsParams {
  initialPage?: number;
  limit?: number;
  includeInactive?: boolean;
}

interface UseBankAccountsReturn {
  bankAccounts: BankAccount[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  filterByType: (type: BankAccountType | undefined) => void;
  setPage: (page: number) => void;
  refetch: () => void;
  searchTerm: string;
  typeFilter: BankAccountType | undefined;
}

export function useBankAccounts({
  initialPage = 1,
  limit = 20,
  includeInactive = false,
}: UseBankAccountsParams = {}): UseBankAccountsReturn {
  const STORAGE_KEY = 'bank-accounts';
  const saved = useRef(loadFilters<{ searchTerm?: string; typeFilter?: string }>(STORAGE_KEY)).current;

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [typeFilter, setTypeFilter] = useState<BankAccountType | undefined>(
    (saved.typeFilter as BankAccountType) || undefined,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: BankAccountFilters = {
        page,
        limit,
        includeInactive,
      };
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (typeFilter) {
        filters.type = typeFilter;
      }

      const response = await bankAccountsService.getAll(filters);
      setBankAccounts(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar cuentas bancarias');
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, typeFilter, includeInactive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist filters
  useEffect(() => {
    saveFilters(STORAGE_KEY, {
      searchTerm,
      typeFilter: typeFilter ?? '',
    });
  }, [searchTerm, typeFilter]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const filterByType = useCallback((type: BankAccountType | undefined) => {
    setTypeFilter(type);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    bankAccounts,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByType,
    setPage: changePage,
    refetch: fetchData,
    searchTerm,
    typeFilter,
  };
}
