'use client';

import { useState, useEffect, useCallback } from 'react';
import { employeesService } from '../services/employees.service';
import type { Employee, EmployeeFilters, EmployeeStatus } from '../types';

interface UseEmployeesParams {
  initialPage?: number;
  limit?: number;
  status?: EmployeeStatus;
}

interface UseEmployeesReturn {
  employees: Employee[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (term: string) => void;
  setPage: (page: number) => void;
  setStatusFilter: (status: EmployeeStatus | undefined) => void;
  refetch: () => void;
}

export function useEmployees({
  initialPage = 1,
  limit = 20,
  status,
}: UseEmployeesParams = {}): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | undefined>(status);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: EmployeeFilters = {
        page,
        limit,
      };
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }

      const response = await employeesService.getAll(filters);
      setEmployees(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar empleados';
      setError(message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changeStatus = useCallback((newStatus: EmployeeStatus | undefined) => {
    setStatusFilter(newStatus);
    setPage(1);
  }, []);

  return {
    employees,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage: changePage,
    setStatusFilter: changeStatus,
    refetch: fetchData,
  };
}
