'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { leavesService } from '../services/leaves.service';
import type { LeaveRequest, LeaveStats, LeaveStatus, LeaveType, CreateLeaveDto } from '../types';

interface UseLeavesParams {
  take?: number;
}

export function useLeaves({ take = 20 }: UseLeavesParams = {}) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<LeaveType | undefined>();
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leavesService.getAll({
        skip,
        take,
        status: statusFilter,
        leave_type: typeFilter,
        third_party_id: employeeFilter,
      });
      setLeaves(response.data);
      setTotal(response.total);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar solicitudes';
      setError(message);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [skip, take, statusFilter, typeFilter, employeeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await leavesService.getStats();
      setStats(data);
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, [fetchLeaves, fetchStats]);

  const create = useCallback(async (dto: CreateLeaveDto) => {
    try {
      await leavesService.create(dto);
      toast.success('Solicitud creada exitosamente');
      fetchLeaves();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear solicitud');
      throw err;
    }
  }, [fetchLeaves, fetchStats]);

  const approve = useCallback(async (id: string, notes?: string) => {
    try {
      await leavesService.approve(id, notes);
      toast.success('Solicitud aprobada');
      fetchLeaves();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al aprobar solicitud');
      throw err;
    }
  }, [fetchLeaves, fetchStats]);

  const reject = useCallback(async (id: string, reason: string) => {
    try {
      await leavesService.reject(id, reason);
      toast.success('Solicitud rechazada');
      fetchLeaves();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al rechazar solicitud');
      throw err;
    }
  }, [fetchLeaves, fetchStats]);

  const remove = useCallback(async (id: string) => {
    try {
      await leavesService.delete(id);
      toast.success('Solicitud eliminada');
      fetchLeaves();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar solicitud');
      throw err;
    }
  }, [fetchLeaves, fetchStats]);

  const paginate = useCallback((newSkip: number) => {
    setSkip(newSkip);
  }, []);

  const filterByStatus = useCallback((status: LeaveStatus | undefined) => {
    setStatusFilter(status);
    setSkip(0);
  }, []);

  const filterByType = useCallback((type: LeaveType | undefined) => {
    setTypeFilter(type);
    setSkip(0);
  }, []);

  const filterByEmployee = useCallback((employeeId: string | undefined) => {
    setEmployeeFilter(employeeId);
    setSkip(0);
  }, []);

  return {
    leaves,
    total,
    stats,
    loading,
    error,
    skip,
    take,
    statusFilter,
    typeFilter,
    create,
    approve,
    reject,
    remove,
    paginate,
    filterByStatus,
    filterByType,
    filterByEmployee,
    refetch: fetchLeaves,
  };
}
