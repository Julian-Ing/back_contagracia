'use client';

import { useState, useEffect, useCallback } from 'react';
import { payrollSettlementsService } from '../services/payroll-settlements.service';
import type { PayrollSettlement, SettlementFilters, SettlementStatus, SettlementType } from '../types';

interface UsePayrollSettlementsParams {
  initialPage?: number;
  limit?: number;
  status?: SettlementStatus;
  settlementType?: SettlementType;
  year?: number;
  month?: number;
}

interface UsePayrollSettlementsReturn {
  settlements: PayrollSettlement[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setStatusFilter: (status: SettlementStatus | undefined) => void;
  setTypeFilter: (type: SettlementType | undefined) => void;
  setYearFilter: (year: number | undefined) => void;
  setMonthFilter: (month: number | undefined) => void;
  refetch: () => void;
}

export function usePayrollSettlements({
  initialPage = 1,
  limit = 20,
  status,
  settlementType,
  year,
  month,
}: UsePayrollSettlementsParams = {}): UsePayrollSettlementsReturn {
  const [settlements, setSettlements] = useState<PayrollSettlement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | undefined>(status);
  const [typeFilter, setTypeFilter] = useState<SettlementType | undefined>(settlementType);
  const [yearFilter, setYearFilter] = useState<number | undefined>(year);
  const [monthFilter, setMonthFilter] = useState<number | undefined>(month);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: SettlementFilters = { page, limit };
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.settlement_type = typeFilter;
      if (yearFilter) filters.year = yearFilter;
      if (monthFilter) filters.month = monthFilter;

      const response = await payrollSettlementsService.getAll(filters);
      setSettlements(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar liquidaciones';
      setError(message);
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, yearFilter, monthFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    settlements,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage: useCallback((p: number) => setPage(p), []),
    setStatusFilter: useCallback((s: SettlementStatus | undefined) => { setStatusFilter(s); setPage(1); }, []),
    setTypeFilter: useCallback((t: SettlementType | undefined) => { setTypeFilter(t); setPage(1); }, []),
    setYearFilter: useCallback((y: number | undefined) => { setYearFilter(y); setPage(1); }, []),
    setMonthFilter: useCallback((m: number | undefined) => { setMonthFilter(m); setPage(1); }, []),
    refetch: fetchData,
  };
}
