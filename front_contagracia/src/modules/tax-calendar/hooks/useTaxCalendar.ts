'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import toast from 'react-hot-toast';
import { calendarService, obligationTypesService } from '../services/taxCalendar.service';
import type {
  CompanyCalendarResponse,
  TaxObligationType,
  TaxCalendarDate,
} from '../types';

interface UseTaxCalendarOptions {
  initialYear?: number;
  initialMonth?: number;
  autoFetch?: boolean;
}

export function useTaxCalendar(options: UseTaxCalendarOptions = {}) {
  const {
    initialYear = new Date().getFullYear(),
    initialMonth,
    autoFetch = true,
  } = options;

  const companyId = useAuthStore((s) => s.company?.id);

  // Estado principal
  const [calendar, setCalendar] = useState<CompanyCalendarResponse | null>(null);
  const [obligations, setObligations] = useState<TaxCalendarDate[]>([]);
  const [obligationTypes, setObligationTypes] = useState<TaxObligationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState<number | undefined>(initialMonth);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  /**
   * Carga los tipos de obligación (catálogo)
   */
  const fetchObligationTypes = useCallback(async () => {
    try {
      const types = await obligationTypesService.getAll();
      setObligationTypes(types);
    } catch (err: any) {
      console.error('Error loading obligation types:', err);
    }
  }, []);

  /**
   * Carga el calendario de la empresa
   */
  const fetchCalendar = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await calendarService.getCompanyCalendar(companyId, year, month);
      setCalendar(data);

      // Aplicar filtro por tipo si está seleccionado
      let filtered = data.obligations || [];
      if (selectedType) {
        filtered = filtered.filter(
          (o) => o.tax_obligation_type_id === selectedType
        );
      }
      setObligations(filtered);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Error al cargar el calendario tributario';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, year, month, selectedType]);

  /**
   * Carga vista mensual específica
   */
  const fetchMonthlyCalendar = useCallback(
    async (targetYear: number, targetMonth: number) => {
      if (!companyId) return null;

      try {
        setLoading(true);
        setError(null);

        const data = await calendarService.getMonthlyCalendar(
          companyId,
          targetYear,
          targetMonth
        );
        setCalendar(data);
        setObligations(data.obligations || []);
        setYear(targetYear);
        setMonth(targetMonth);

        return data;
      } catch (err: any) {
        const message =
          err?.response?.data?.message || 'Error al cargar el mes';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  /**
   * Navega al mes anterior
   */
  const goToPreviousMonth = useCallback(() => {
    const currentMonth = month ?? new Date().getMonth() + 1;
    const currentYear = year;

    if (currentMonth === 1) {
      setMonth(12);
      setYear(currentYear - 1);
    } else {
      setMonth(currentMonth - 1);
    }
  }, [month, year]);

  /**
   * Navega al mes siguiente
   */
  const goToNextMonth = useCallback(() => {
    const currentMonth = month ?? new Date().getMonth() + 1;
    const currentYear = year;

    if (currentMonth === 12) {
      setMonth(1);
      setYear(currentYear + 1);
    } else {
      setMonth(currentMonth + 1);
    }
  }, [month, year]);

  /**
   * Ir al mes actual
   */
  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  /**
   * Limpia filtros
   */
  const clearFilters = useCallback(() => {
    setSelectedType(null);
    setMonth(undefined);
  }, []);

  // Cargar tipos de obligación al montar
  useEffect(() => {
    fetchObligationTypes();
  }, [fetchObligationTypes]);

  // Cargar calendario cuando cambian los filtros
  useEffect(() => {
    if (autoFetch) {
      fetchCalendar();
    }
  }, [autoFetch, fetchCalendar]);

  return {
    // Estado
    calendar,
    obligations,
    obligationTypes,
    loading,
    error,

    // Filtros
    year,
    month,
    selectedType,
    setYear,
    setMonth,
    setSelectedType,
    clearFilters,

    // Navegación
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,

    // Acciones
    refetch: fetchCalendar,
    fetchMonthlyCalendar,
  };
}

export default useTaxCalendar;
