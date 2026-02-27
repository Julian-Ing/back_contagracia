'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { calendarService } from '../services/taxCalendar.service';
import type {
  UpcomingObligationsResponse,
  CompanyObligation,
  ObligationUrgency,
} from '../types';

interface UseUpcomingObligationsOptions {
  daysAhead?: number;
  autoFetch?: boolean;
}

export function useUpcomingObligations(options: UseUpcomingObligationsOptions = {}) {
  const { daysAhead: initialDaysAhead = 30, autoFetch = true } = options;

  const companyId = useAuthStore((s) => s.company?.id);

  // Estado principal
  const [data, setData] = useState<UpcomingObligationsResponse | null>(null);
  const [obligations, setObligations] = useState<CompanyObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [daysAhead, setDaysAhead] = useState(initialDaysAhead);
  const [urgencyFilter, setUrgencyFilter] = useState<ObligationUrgency | null>(null);

  /**
   * Carga las obligaciones próximas
   */
  const fetchUpcoming = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await calendarService.getUpcomingObligations(companyId, daysAhead);
      setData(response);

      // Aplicar filtro de urgencia si está seleccionado
      let filtered = response.obligations || [];
      if (urgencyFilter) {
        filtered = filtered.filter((o) => o.urgency === urgencyFilter);
      }
      setObligations(filtered);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Error al cargar obligaciones próximas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, daysAhead, urgencyFilter]);

  /**
   * Filtra por urgencia
   */
  const filterByUrgency = useCallback(
    (urgency: ObligationUrgency | null) => {
      setUrgencyFilter(urgency);

      if (!data) return;

      if (urgency) {
        setObligations(data.obligations.filter((o) => o.urgency === urgency));
      } else {
        setObligations(data.obligations);
      }
    },
    [data]
  );

  /**
   * Obtiene obligaciones urgentes (<=3 días)
   */
  const getUrgentObligations = useCallback(() => {
    return obligations.filter((o) => o.urgency === 'urgent');
  }, [obligations]);

  /**
   * Obtiene obligaciones que vencen pronto (4-7 días)
   */
  const getSoonObligations = useCallback(() => {
    return obligations.filter((o) => o.urgency === 'soon');
  }, [obligations]);

  /**
   * Obtiene obligaciones normales (>7 días)
   */
  const getNormalObligations = useCallback(() => {
    return obligations.filter((o) => o.urgency === 'normal');
  }, [obligations]);

  /**
   * Agrupa obligaciones por fecha de vencimiento
   */
  const getGroupedByDate = useCallback(() => {
    const grouped: Record<string, CompanyObligation[]> = {};

    obligations.forEach((o) => {
      const dateKey = o.due_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(o);
    });

    return grouped;
  }, [obligations]);

  /**
   * Agrupa obligaciones por tipo
   */
  const getGroupedByType = useCallback(() => {
    const grouped: Record<string, CompanyObligation[]> = {};

    obligations.forEach((o) => {
      const typeKey = o.tax_obligation_type?.name || 'Sin tipo';
      if (!grouped[typeKey]) {
        grouped[typeKey] = [];
      }
      grouped[typeKey].push(o);
    });

    return grouped;
  }, [obligations]);

  // Auto-fetch al montar y cuando cambian los parámetros
  useEffect(() => {
    if (autoFetch) {
      fetchUpcoming();
    }
  }, [autoFetch, fetchUpcoming]);

  // Calcular summary a partir de las obligations
  const calculateSummary = useCallback(() => {
    const obls = data?.obligations ?? [];
    return {
      total: obls.length,
      urgent: obls.filter((o) => o.urgency === 'urgent').length,
      soon: obls.filter((o) => o.urgency === 'soon').length,
      normal: obls.filter((o) => o.urgency === 'normal').length,
    };
  }, [data]);

  return {
    // Estado
    data,
    obligations,
    loading,
    error,
    summary: calculateSummary(),
    company: data?.company ?? null,

    // Filtros
    daysAhead,
    urgencyFilter,
    setDaysAhead,
    filterByUrgency,

    // Helpers
    getUrgentObligations,
    getSoonObligations,
    getNormalObligations,
    getGroupedByDate,
    getGroupedByType,

    // Acciones
    refetch: fetchUpcoming,
  };
}

export default useUpcomingObligations;
