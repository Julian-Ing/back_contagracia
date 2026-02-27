'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { arApService } from '../services/arAp.service';
import { loadFilters, saveFilters } from '@/shared/hooks';
import type { ArApType, ArApSummaryItem, BucketFilter, SummaryTab } from '../types';

interface UseArApSummaryParams {
  type: ArApType;
  limit?: number;
}

export function useArApSummary({ type, limit = 20 }: UseArApSummaryParams) {
  const storageKey = `ar-summary:${type}`;
  const saved = useRef(loadFilters<{
    searchTerm: string; bucket: BucketFilter; tab: SummaryTab;
    dateFrom: string; dateTo: string; dueDateFrom: string; dueDateTo: string;
  }>(storageKey)).current;

  const [items, setItems] = useState<ArApSummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros del formulario (el usuario los cambia libremente sin disparar fetch)
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [bucket, setBucket] = useState<BucketFilter>(saved.bucket ?? 'all');
  const [tab, setTab] = useState<SummaryTab>(saved.tab ?? 'all');
  const [dateFrom, setDateFrom] = useState(saved.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(saved.dateTo ?? '');
  const [dueDateFrom, setDueDateFrom] = useState(saved.dueDateFrom ?? '');
  const [dueDateTo, setDueDateTo] = useState(saved.dueDateTo ?? '');

  const abortRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async (overridePage?: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    const p = overridePage ?? page;

    try {
      const response = await arApService.getSummaryByThirdParty({
        type,
        search: searchTerm || undefined,
        bucket,
        tab,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        dueDateFrom: dueDateFrom || undefined,
        dueDateTo: dueDateTo || undefined,
        page: p,
        limit,
      });

      if (fetchId !== fetchIdRef.current) return;
      setItems(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.message || err.message || 'Error al cargar datos');
      setItems([]);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [type, searchTerm, bucket, tab, dateFrom, dateTo, dueDateFrom, dueDateTo, page, limit]);

  // Solo carga inicial automática
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData();
    }
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters(storageKey, { searchTerm, bucket, tab, dateFrom, dateTo, dueDateFrom, dueDateTo });
  }, [storageKey, searchTerm, bucket, tab, dateFrom, dateTo, dueDateFrom, dueDateTo]);

  // Buscar: resetea página a 1 y hace fetch
  const submitSearch = useCallback(() => {
    setPage(1);
    // Necesitamos llamar fetchData después de que page se actualice,
    // pero como es async state, pasamos page=1 directamente
    setTimeout(() => fetchData(1), 0);
  }, [fetchData]);

  // Cambiar página y hacer fetch
  const goToPage = useCallback((p: number) => {
    setPage(p);
    setTimeout(() => fetchData(p), 0);
  }, [fetchData]);

  return {
    items, total, page, totalPages, loading, error,
    searchTerm, bucket, tab, dateFrom, dateTo, dueDateFrom, dueDateTo,
    setSearchTerm, setBucket, setTab, setDateFrom, setDateTo, setDueDateFrom, setDueDateTo,
    submitSearch, goToPage, refetch: fetchData,
  };
}
