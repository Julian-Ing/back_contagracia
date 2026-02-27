'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { arApService } from '../services/arAp.service';
import { loadFilters, saveFilters } from '@/shared/hooks';
import type { ArApType, PaymentReceiptItem } from '../types';

interface UsePaymentReceiptsParams {
  type: ArApType;
  limit?: number;
  enabled?: boolean;
}

export function usePaymentReceipts({ type, limit = 20, enabled = true }: UsePaymentReceiptsParams) {
  const storageKey = `ar-receipts:${type}`;
  const saved = useRef(loadFilters<{ searchTerm: string; dateFrom: string; dateTo: string }>(storageKey)).current;

  const [receipts, setReceipts] = useState<PaymentReceiptItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [dateFrom, setDateFrom] = useState(saved.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(saved.dateTo ?? '');

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
      const response = await arApService.getPaymentReceipts({
        type,
        exclude_types: 'MANUAL',
        search: searchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: p,
        limit,
      });

      if (fetchId !== fetchIdRef.current) return;
      setReceipts(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setLoaded(true);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.message || err.message || 'Error al cargar recibos');
      setReceipts([]);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [type, searchTerm, dateFrom, dateTo, page, limit]);

  // Carga inicial cuando se habilita
  useEffect(() => {
    if (enabled && !initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData();
    }
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters(storageKey, { searchTerm, dateFrom, dateTo });
  }, [storageKey, searchTerm, dateFrom, dateTo]);

  const submitSearch = useCallback(() => {
    setPage(1);
    setTimeout(() => fetchData(1), 0);
  }, [fetchData]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    setTimeout(() => fetchData(p), 0);
  }, [fetchData]);

  return {
    receipts, total, page, totalPages, loading, loaded, error,
    searchTerm, dateFrom, dateTo,
    setSearchTerm, setDateFrom, setDateTo,
    submitSearch, goToPage, refetch: fetchData,
  };
}
