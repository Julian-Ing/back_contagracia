'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { hrExpensesService } from '../services/hr-expenses.service';
import type {
  TravelExpense,
  TravelExpenseStats,
  TravelExpenseStatus,
  TravelExpenseCategory,
  CreateTravelExpenseDto,
} from '../types';

interface UseHrExpensesParams {
  take?: number;
}

export function useHrExpenses({ take = 20 }: UseHrExpensesParams = {}) {
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TravelExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TravelExpenseStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<TravelExpenseCategory | undefined>();
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hrExpensesService.getAll({
        skip,
        take,
        status: statusFilter,
        expense_category: categoryFilter,
        third_party_id: employeeFilter,
      });
      setExpenses(response.data);
      setTotal(response.total);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar viaticos';
      setError(message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [skip, take, statusFilter, categoryFilter, employeeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await hrExpensesService.getStats();
      setStats(data);
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [fetchExpenses, fetchStats]);

  const create = useCallback(async (dto: CreateTravelExpenseDto) => {
    try {
      await hrExpensesService.create(dto);
      toast.success('Viatico creado exitosamente');
      fetchExpenses();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear viatico');
      throw err;
    }
  }, [fetchExpenses, fetchStats]);

  const approve = useCallback(async (id: string, notes?: string) => {
    try {
      await hrExpensesService.approve(id, notes);
      toast.success('Viatico aprobado');
      fetchExpenses();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al aprobar viatico');
      throw err;
    }
  }, [fetchExpenses, fetchStats]);

  const reject = useCallback(async (id: string, reason: string) => {
    try {
      await hrExpensesService.reject(id, reason);
      toast.success('Viatico rechazado');
      fetchExpenses();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al rechazar viatico');
      throw err;
    }
  }, [fetchExpenses, fetchStats]);

  const remove = useCallback(async (id: string) => {
    try {
      await hrExpensesService.delete(id);
      toast.success('Viatico eliminado');
      fetchExpenses();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar viatico');
      throw err;
    }
  }, [fetchExpenses, fetchStats]);

  const paginate = useCallback((newSkip: number) => {
    setSkip(newSkip);
  }, []);

  const filterByStatus = useCallback((status: TravelExpenseStatus | undefined) => {
    setStatusFilter(status);
    setSkip(0);
  }, []);

  const filterByCategory = useCallback((category: TravelExpenseCategory | undefined) => {
    setCategoryFilter(category);
    setSkip(0);
  }, []);

  const filterByEmployee = useCallback((employeeId: string | undefined) => {
    setEmployeeFilter(employeeId);
    setSkip(0);
  }, []);

  return {
    expenses,
    total,
    stats,
    loading,
    error,
    skip,
    take,
    statusFilter,
    categoryFilter,
    create,
    approve,
    reject,
    remove,
    paginate,
    filterByStatus,
    filterByCategory,
    filterByEmployee,
    refetch: fetchExpenses,
  };
}
