'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { taxesService } from '../services/taxes.service';
import { loadFilters, saveFilters } from '@/shared/hooks/usePersistedFilters';
import type { Tax, TaxType, TaxFilters } from '../types';

interface UseTaxesParams {
  initialPage?: number;
  limit?: number;
  is_tax?: boolean;
}

interface UseTaxesReturn {
  taxes: Tax[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  filterByTaxType: (taxTypeId: number | undefined) => void;
  setPage: (page: number) => void;
  refetch: () => void;
  searchTerm: string;
  taxTypeFilter: number | undefined;
}

export function useTaxes({
  initialPage = 1,
  limit = 20,
  is_tax,
}: UseTaxesParams = {}): UseTaxesReturn {
  const storageKey = is_tax === false ? 'taxes:withholdings' : 'taxes:taxes';
  const saved = useRef(loadFilters<{ searchTerm?: string; taxTypeFilter?: string }>(storageKey)).current;

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? '');
  const [taxTypeFilter, setTaxTypeFilter] = useState<number | undefined>(
    saved.taxTypeFilter ? Number(saved.taxTypeFilter) : undefined,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: TaxFilters = {
        page,
        limit,
        is_tax,
      };
      if (searchTerm) filters.search = searchTerm;
      if (taxTypeFilter) filters.tax_type_id = taxTypeFilter;

      const response = await taxesService.getAll(filters);
      setTaxes(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar impuestos');
      setTaxes([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, is_tax, searchTerm, taxTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist filters
  useEffect(() => {
    saveFilters(storageKey, {
      searchTerm,
      taxTypeFilter: taxTypeFilter != null ? String(taxTypeFilter) : '',
    });
  }, [searchTerm, taxTypeFilter, storageKey]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const filterByTaxType = useCallback((taxTypeId: number | undefined) => {
    setTaxTypeFilter(taxTypeId);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    taxes,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByTaxType,
    setPage: changePage,
    refetch: fetchData,
    searchTerm,
    taxTypeFilter,
  };
}

export function useTaxTypes(is_tax?: boolean) {
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaxTypes = async () => {
      setLoading(true);
      try {
        const data = await taxesService.getTaxTypes(is_tax);
        setTaxTypes(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar tipos de impuestos');
      } finally {
        setLoading(false);
      }
    };
    fetchTaxTypes();
  }, [is_tax]);

  return { taxTypes, loading, error };
}
