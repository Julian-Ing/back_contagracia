'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { accountingPeriodsService } from '../services/accountingPeriods.service';
import { loadFilters, saveFilters } from '@/shared/hooks/usePersistedFilters';
import type {
  AccountingPeriod,
  AccountingPeriodsFilters,
  PeriodStatus,
  CreatePeriodData,
  UpdatePeriodData,
  ClosingConfirmData,
} from '../types/accountingPeriods';

interface UseAccountingPeriodsParams {
  initialPage?: number;
  limit?: number;
}

interface UseAccountingPeriodsReturn {
  periods: AccountingPeriod[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  filterByYear: (year: number | undefined) => void;
  filterByStatus: (status: PeriodStatus | undefined) => void;
  filterByAnnual: (isAnnual: boolean | undefined) => void;
  setPage: (page: number) => void;
  refetch: () => void;
  createPeriod: (data: CreatePeriodData) => Promise<AccountingPeriod>;
  updatePeriod: (id: string, data: UpdatePeriodData) => Promise<AccountingPeriod>;
  closePeriod: (id: string, data: ClosingConfirmData) => Promise<AccountingPeriod>;
  reopenPeriod: (id: string, reason?: string) => Promise<AccountingPeriod>;
  searchTerm: string;
  statusFilter: PeriodStatus | undefined;
  annualFilter: boolean | undefined;
}

export function useAccountingPeriods({
  initialPage = 1,
  limit = 20,
}: UseAccountingPeriodsParams = {}): UseAccountingPeriodsReturn {
  const STORAGE_KEY = 'accounting-periods';
  const saved = useRef(loadFilters<{ searchTerm?: string; statusFilter?: string; annualFilter?: string }>(STORAGE_KEY)).current;

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<PeriodStatus | undefined>(
    (saved.statusFilter as PeriodStatus) || undefined,
  );
  const [annualFilter, setAnnualFilter] = useState<boolean | undefined>(
    saved.annualFilter === 'true' ? true : saved.annualFilter === 'false' ? false : undefined,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AccountingPeriodsFilters = {
        page,
        limit,
      };
      if (searchTerm) filters.search = searchTerm;
      if (yearFilter) filters.year = yearFilter;
      if (statusFilter) filters.status = statusFilter;
      if (annualFilter !== undefined) filters.is_annual = annualFilter;

      const response = await accountingPeriodsService.getAll(filters);
      setPeriods(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar períodos contables');
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, yearFilter, statusFilter, annualFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist filters
  useEffect(() => {
    saveFilters(STORAGE_KEY, {
      searchTerm,
      statusFilter: statusFilter ?? '',
      annualFilter: annualFilter === undefined ? '' : String(annualFilter),
    });
  }, [searchTerm, statusFilter, annualFilter]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const filterByYear = useCallback((year: number | undefined) => {
    setYearFilter(year);
    setPage(1);
  }, []);

  const filterByStatus = useCallback((status: PeriodStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const filterByAnnual = useCallback((isAnnual: boolean | undefined) => {
    setAnnualFilter(isAnnual);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const createPeriod = useCallback(async (data: CreatePeriodData) => {
    const period = await accountingPeriodsService.create(data);
    fetchData();
    return period;
  }, [fetchData]);

  const updatePeriod = useCallback(async (id: string, data: UpdatePeriodData) => {
    const period = await accountingPeriodsService.update(id, data);
    fetchData();
    return period;
  }, [fetchData]);

  const closePeriod = useCallback(async (id: string, data: ClosingConfirmData) => {
    const period = await accountingPeriodsService.close(id, data);
    fetchData();
    return period;
  }, [fetchData]);

  const reopenPeriod = useCallback(async (id: string, reason?: string) => {
    const period = await accountingPeriodsService.reopen(id, reason);
    fetchData();
    return period;
  }, [fetchData]);

  return {
    periods,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByYear,
    filterByStatus,
    filterByAnnual,
    setPage: changePage,
    refetch: fetchData,
    createPeriod,
    updatePeriod,
    closePeriod,
    reopenPeriod,
    searchTerm,
    statusFilter,
    annualFilter,
  };
}
