'use client';

import { useState, useEffect, useCallback } from 'react';
import { bankMovementsService } from '../services/bankMovements.service';
import type { BankMovement, BankMovementFilters } from '../types';

interface UseBankMovementsParams {
  bankAccountId: string;
  initialPage?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseBankMovementsReturn {
  movements: BankMovement[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useBankMovements({
  bankAccountId,
  initialPage = 1,
  limit = 20,
  enabled = true,
}: UseBankMovementsParams): UseBankMovementsReturn {
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    if (!enabled || !bankAccountId) return;

    setLoading(true);
    setError(null);
    try {
      const filters: BankMovementFilters = {
        bank_account_id: bankAccountId,
        page,
        limit,
      };
      if (searchTerm) {
        filters.search = searchTerm;
      }

      const response = await bankMovementsService.getAll(filters);
      setMovements(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar movimientos');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [bankAccountId, page, limit, searchTerm, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset when bank account changes
  useEffect(() => {
    setPage(1);
    setSearchTerm('');
  }, [bankAccountId]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    movements,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage: changePage,
    refetch: fetchData,
  };
}
