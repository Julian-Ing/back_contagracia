import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { teamService } from '../services/crm.service';
import toast from 'react-hot-toast';
import type { TeamMember } from '../types';

interface PerformanceParams {
  date_from?: string;
  date_to?: string;
  metric?: string;
}

interface RankingParams {
  period?: string;
  metric?: string;
  limit?: number;
}

export const useTeam = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.company?.id);

  const fetchMembers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getMembers(companyId);
      setMembers(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar miembros';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const getPerformance = useCallback(async (userId: string, params?: PerformanceParams) => {
    if (!companyId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getPerformance(companyId, userId, params as Record<string, unknown> | undefined);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar rendimiento';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchRanking = useCallback(async (params?: RankingParams) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getRanking(companyId, params as Record<string, unknown> | undefined);
      setRanking(data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar ranking';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    ranking,
    loading,
    error,
    fetchMembers,
    getPerformance,
    fetchRanking,
  };
};
