'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { journalEntriesService } from '../services/journalEntries.service';
import { loadFilters, saveFilters } from '@/shared/hooks';
import type { JournalEntry, JournalEntriesFilters } from '../types/journalEntries';

interface UseJournalEntriesParams {
  initialPage?: number;
  limit?: number;
}

interface UseJournalEntriesReturn {
  entries: JournalEntry[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  typeFilter: string;
  fromDate: string;
  toDate: string;
  search: (term: string) => void;
  filterByType: (typeKey: string | undefined) => void;
  filterByDates: (fromDate: string | undefined, toDate: string | undefined) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useJournalEntries({
  initialPage = 1,
  limit = 20,
}: UseJournalEntriesParams = {}): UseJournalEntriesReturn {
  const storageKey = 'journal-entries';
  const saved = useRef(loadFilters<{
    searchTerm: string; typeFilter: string; fromDate: string; toDate: string;
  }>(storageKey)).current;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(saved.typeFilter || undefined);
  const [fromDate, setFromDate] = useState<string | undefined>(saved.fromDate || undefined);
  const [toDate, setToDate] = useState<string | undefined>(saved.toDate || undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: JournalEntriesFilters = {
        page,
        limit,
      };
      if (searchTerm) filters.search = searchTerm;
      if (typeFilter) filters.type_key = typeFilter;
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;

      const response = await journalEntriesService.getAll(filters);
      setEntries(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar asientos contables');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, typeFilter, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters(storageKey, {
      searchTerm,
      typeFilter: typeFilter ?? '',
      fromDate: fromDate ?? '',
      toDate: toDate ?? '',
    });
  }, [searchTerm, typeFilter, fromDate, toDate]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const filterByType = useCallback((typeKey: string | undefined) => {
    setTypeFilter(typeKey);
    setPage(1);
  }, []);

  const filterByDates = useCallback((from: string | undefined, to: string | undefined) => {
    setFromDate(from);
    setToDate(to);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    entries,
    total,
    page,
    totalPages,
    loading,
    error,
    searchTerm,
    typeFilter: typeFilter ?? '',
    fromDate: fromDate ?? '',
    toDate: toDate ?? '',
    search,
    filterByType,
    filterByDates,
    setPage: changePage,
    refetch: fetchData,
  };
}
