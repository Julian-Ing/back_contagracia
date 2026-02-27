'use client';

import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../services/attendance.service';
import type { AttendanceRecord, AttendanceFilters } from '../types';

interface UseAttendanceParams {
  initialPage?: number;
  limit?: number;
}

interface UseAttendanceReturn {
  records: AttendanceRecord[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setDateFrom: (date: string | undefined) => void;
  setDateTo: (date: string | undefined) => void;
  refetch: () => void;
}

export function useAttendance({
  initialPage = 1,
  limit = 20,
}: UseAttendanceParams = {}): UseAttendanceReturn {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AttendanceFilters = {
        page,
        limit,
      };
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const response = await attendanceService.getAll(filters);
      setRecords(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar asistencia';
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFrom, dateTo]);

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
    refetch: fetchData,
  };
}
