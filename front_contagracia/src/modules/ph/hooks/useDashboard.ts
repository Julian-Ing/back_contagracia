import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/modules/auth';
import { dashboardService } from '../services/ph.service';
import type { PhDashboardStats } from '../types';

export function useDashboard() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [stats, setStats] = useState<PhDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (condominiumId?: string) => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = condominiumId ? { condominium_id: condominiumId } : undefined;
      const res = await dashboardService.getStats(companyId, params);
      setStats(res);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar estadisticas del dashboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refresh: fetchStats,
  };
}
