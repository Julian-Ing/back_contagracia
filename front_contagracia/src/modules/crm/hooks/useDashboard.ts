'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { dashboardService } from '../services/crm.service';
import { CrmDashboardStats, PipelineStageStats } from '../types';

export function useDashboard() {
  const companyId = useAuthStore((s) => s.company?.id);
  const [stats, setStats] = useState<CrmDashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStageStats[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getAll(companyId);
      setStats(res.stats);
      setPipeline(res.pipeline);
      setLeadsBySource(res.leadsBySource);
      setRecentActivities(res.recentActivities);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar dashboard');
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    stats,
    pipeline,
    leadsBySource,
    recentActivities,
    loading,
    error,
    refetch: fetch,
  };
}
