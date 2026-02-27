'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { prepaymentsService } from '../services/prepayments.service';
import { useDebounce, loadFilters, saveFilters } from '@/shared/hooks';
import type { PrepaymentItem, PrepaymentType, PrepaymentStatus } from '../types';

export function usePrepayments(limit = 20) {
  const storageKey = 'prepayments';
  const saved = useRef(loadFilters<{
    search: string; prepaymentType: PrepaymentType | ''; status: PrepaymentStatus | '';
    fromDate: string; toDate: string;
  }>(storageKey)).current;

  const [data, setData] = useState<PrepaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(saved.search ?? '');
  const [prepaymentType, setPrepaymentType] = useState<PrepaymentType | ''>(saved.prepaymentType ?? '');
  const [status, setStatus] = useState<PrepaymentStatus | ''>(saved.status ?? '');
  const [fromDate, setFromDate] = useState(saved.fromDate ?? '');
  const [toDate, setToDate] = useState(saved.toDate ?? '');

  const debouncedSearch = useDebounce(search, 300);

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters(storageKey, { search, prepaymentType, status, fromDate, toDate });
  }, [search, prepaymentType, status, fromDate, toDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await prepaymentsService.getAll({
        search: debouncedSearch || undefined,
        prepayment_type: prepaymentType || undefined,
        status: status || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar anticipos');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, prepaymentType, status, fromDate, toDate, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  const updateType = useCallback((type: PrepaymentType | '') => {
    setPrepaymentType(type);
    setPage(1);
  }, []);

  const updateStatus = useCallback((s: PrepaymentStatus | '') => {
    setStatus(s);
    setPage(1);
  }, []);

  const updateFromDate = useCallback((d: string) => {
    setFromDate(d);
    setPage(1);
  }, []);

  const updateToDate = useCallback((d: string) => {
    setToDate(d);
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
    prepaymentType,
    status,
    fromDate,
    toDate,
    setSearch: updateSearch,
    setPrepaymentType: updateType,
    setStatus: updateStatus,
    setFromDate: updateFromDate,
    setToDate: updateToDate,
    setPage: goToPage,
    refetch: fetchData,
  };
}
