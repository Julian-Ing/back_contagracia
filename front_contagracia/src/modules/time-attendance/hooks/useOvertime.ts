'use client';

import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../services/attendance.service';
import type { OvertimeRecord, OvertimeFilters, OvertimeStatus, OvertimeType } from '../types';

interface UseOvertimeParams {
  initialPage?: number;
  limit?: number;
}

interface UseOvertimeReturn {
  records: OvertimeRecord[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setDateFrom: (date: string | undefined) => void;
  setDateTo: (date: string | undefined) => void;
  setStatusFilter: (status: OvertimeStatus | undefined) => void;
  setTypeFilter: (type: OvertimeType | undefined) => void;
  refetch: () => void;
}

export function useOvertime({
  initialPage = 1,
  limit = 20,
}: UseOvertimeParams = {}): UseOvertimeReturn {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<OvertimeType | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: OvertimeFilters = {
        page,
        limit,
      };
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.overtime_type = typeFilter;

      const response = await attendanceService.getOvertime(filters);
      setRecords(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar horas extras';
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFrom, dateTo, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changeDateFrom = useCallback((date: string | undefined) => {
    setDateFrom(date);
    setPage(1);
  }, []);

  const changeDateTo = useCallback((date: string | undefined) => {
    setDateTo(date);
    setPage(1);
  }, []);

  const changeStatus = useCallback((newStatus: OvertimeStatus | undefined) => {
    setStatusFilter(newStatus);
    setPage(1);
  }, []);

  const changeType = useCallback((newType: OvertimeType | undefined) => {
    setTypeFilter(newType);
    setPage(1);
  }, []);

  return {
    records,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage: changePage,
    setDateFrom: changeDateFrom,
    setDateTo: changeDateTo,
    setStatusFilter: changeStatus,
    setTypeFilter: changeType,
    refetch: fetchData,
  };
}
